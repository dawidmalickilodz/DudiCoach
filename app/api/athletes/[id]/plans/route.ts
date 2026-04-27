import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api/auth-guard";
import {
  ANTHROPIC_TIMEOUT_MS,
  generatePlan,
  MODEL,
  PLAN_MAX_TOKENS,
} from "@/lib/ai/client";
import { parsePlanJson } from "@/lib/ai/parse-plan-json";
import {
  buildSystemPrompt,
  buildUserPrompt,
  computeAthleteLevel,
  computeTrainingMonths,
  type AthleteWithContext,
} from "@/lib/ai/prompts/plan-generation";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { createClient } from "@/lib/supabase/server";

// Next.js 16: params is a Promise — must be awaited.
type RouteContext = { params: Promise<{ id: string }> };

// Keep enough runtime budget for long first-plan generations.
export const maxDuration = 180;

// ---------------------------------------------------------------------------
// Retry configuration
//
// Retry exactly once on transient errors (500/502/503/529 or fetch failures).
// Parse/validation errors are deterministic and NOT retried.
// See: docs/design/US-005-design.md §6
// ---------------------------------------------------------------------------

const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 529]);
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;

function isRetryableError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    return RETRYABLE_STATUS_CODES.has(error.status ?? 0);
  }
  // Network errors (fetch failures) — retryable
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("fetch") || msg.includes("network")) {
      return true;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/athletes/[id]/plans
 * Generate a new AI training plan for the given athlete via Claude API.
 *
 * Flow: auth → rate limit → fetch athlete → validate completeness → build prompts
 *   → call Claude (with 1 retry on transient errors) → parse JSON → insert row → 201
 *
 * See: docs/design/US-005-design.md
 */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const supabase = await createClient();
  const { user, response } = await requireAuth(
    supabase,
    "POST /api/athletes/[id]/plans",
  );
  if (response) return response;

  // --- Rate limit check (3 generations per minute per coach) ---
  const rl = checkRateLimit(user.id);
  if (!rl.allowed) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((rl.retryAfterMs ?? 0) / 1000),
    );
    return NextResponse.json(
      { error: "Zbyt wiele prób. Poczekaj chwilę." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      },
    );
  }

  // --- Fetch athlete (RLS guarantees coach ownership) ---
  const { data: athlete, error: athleteError } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", id)
    .single();

  if (athleteError || !athlete) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // --- Minimum-data completeness check (D5 in design) ---
  if (!athlete.sport || !athlete.training_days_per_week) {
    return NextResponse.json(
      {
        error:
          "Uzupełnij dane zawodnika (sport, dni treningowe) przed generowaniem.",
      },
      { status: 422 },
    );
  }

  // --- Build prompts ---
  const trainingMonths = computeTrainingMonths(athlete.training_start_date);
  const level = computeAthleteLevel(trainingMonths);
  const { data: injuries, error: injuriesError } = await supabase
    .from("injuries")
    .select("name, severity, notes, status")
    .eq("athlete_id", id)
    .in("status", ["active", "healing"]);

  if (injuriesError) {
    console.error("[POST /plans] Injuries query failed; continuing without injuries context", {
      code: injuriesError.code,
      message: injuriesError.message,
    });
  }

  const activeInjuries =
    injuriesError || !injuries
      ? []
      : injuries.map((injury) => ({
          name: injury.name,
          severity: String(injury.severity),
          notes: injury.notes,
        }));

  const athleteWithContext: AthleteWithContext = {
    ...athlete,
    trainingMonths,
    level,
    activeInjuries,
    diagnosticFindings: [],
    recentProgressions: [],
  };

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(athleteWithContext);

  // --- Call Claude with retry loop ---
  let rawText: string | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      rawText = await generatePlan({ systemPrompt, userPrompt });
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS && isRetryableError(err)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      // Exhausted or non-retryable — fall through to error handler below
      break;
    }
  }

  if (rawText === null) {
    // Map Anthropic / network errors to appropriate HTTP responses
    if (lastError instanceof Anthropic.APIConnectionTimeoutError) {
      console.error("[POST /plans] Anthropic request timeout", {
        model: MODEL,
        maxTokens: PLAN_MAX_TOKENS,
        timeoutMs: ANTHROPIC_TIMEOUT_MS,
      });
      return NextResponse.json(
        { error: "Przekroczono czas. Spróbuj ponownie." },
        { status: 504 },
      );
    }
    if (lastError instanceof Anthropic.APIError) {
      console.error("[POST /plans] Anthropic API error", {
        status: lastError.status,
        message: lastError.message,
      });
      return NextResponse.json({ error: "Nie udało się wygenerować planu." }, { status: 500 });
    }
    const message =
      lastError instanceof Error ? lastError.message : String(lastError);
    console.error("[POST /plans] Unexpected error during generation", {
      message,
    });
    return NextResponse.json({ error: "Nie udało się wygenerować planu." }, { status: 500 });
  }

  // --- Parse + validate JSON (deterministic — no retry) ---
  let planJson;
  try {
    planJson = parsePlanJson(rawText);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /plans] Plan JSON parse/validation failed", {
      message,
    });
    return NextResponse.json({ error: "Nie udało się wygenerować planu." }, { status: 500 });
  }

  // --- Persist plan ---
  const { data: inserted, error: insertError } = await supabase
    .from("training_plans")
    .insert({
      athlete_id: id,
      plan_name: planJson.planName,
      phase: planJson.phase,
      plan_json: planJson,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    console.error("[POST /plans] Failed to persist plan", {
      code: insertError?.code,
      message: insertError?.message,
    });
    return NextResponse.json(
      { error: "Nie udało się zapisać planu." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: inserted }, { status: 201 });
}

/**
 * GET /api/athletes/[id]/plans
 * List all plans for an athlete, most recent first.
 * RLS ensures the coach can only see plans for athletes they own.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;

  const supabase = await createClient();
  const { response } = await requireAuth(supabase, "GET /api/athletes/[id]/plans");
  if (response) return response;

  const { data, error } = await supabase
    .from("training_plans")
    .select("*")
    .eq("athlete_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /plans] Supabase error", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}
