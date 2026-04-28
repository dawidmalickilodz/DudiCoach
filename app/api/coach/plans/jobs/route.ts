import { NextRequest, NextResponse } from "next/server";

import {
  createPlanJobRequestSchema,
  isDuplicateActiveJobError,
  type PlanJobStatusRow,
  PLAN_JOB_STATUS_SELECT,
  toPublicPlanJobStatus,
} from "@/lib/api/plan-jobs";
import {
  buildSystemPrompt,
  buildUserPrompt,
  computeAthleteLevel,
  computeTrainingMonths,
  type AthleteWithContext,
} from "@/lib/ai/prompts/plan-generation";
import { requireAuth } from "@/lib/api/auth-guard";
import { createClient } from "@/lib/supabase/server";

const NOT_FOUND_ERROR_CODE = "PGRST116";
type SupabaseErrorLike = { code?: string; message?: string } | null;
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 3000;

function resolvePlanMaxTokens() {
  const raw = process.env.ANTHROPIC_PLAN_MAX_TOKENS;
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 500 || parsed > 8000) {
    return DEFAULT_MAX_TOKENS;
  }
  return parsed;
}

/**
 * POST /api/coach/plans/jobs
 * Queue async plan generation for one athlete owned by the authenticated coach.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { user, response } = await requireAuth(
    supabase,
    "POST /api/coach/plans/jobs",
  );
  if (response) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedBody = createPlanJobRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsedBody.error.issues },
      { status: 400 },
    );
  }

  const athleteId = parsedBody.data.athleteId;

  const { data: athlete, error: athleteError } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", athleteId)
    .single();
  const athleteLookupError = athleteError as SupabaseErrorLike;

  if (athleteLookupError || !athlete) {
    if (athleteLookupError?.code === NOT_FOUND_ERROR_CODE || !athlete) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[POST /api/coach/plans/jobs] Athlete lookup failed", {
      code: athleteLookupError?.code,
      message: athleteLookupError?.message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  if (!athlete.sport || !athlete.training_days_per_week) {
    return NextResponse.json(
      {
        error:
          "Uzupełnij dane zawodnika (sport, dni treningowe) przed generowaniem.",
      },
      { status: 422 },
    );
  }

  const { data: injuries, error: injuriesError } = await supabase
    .from("injuries")
    .select("name, severity, notes, status")
    .eq("athlete_id", athleteId)
    .in("status", ["active", "healing"]);

  if (injuriesError) {
    console.error(
      "[POST /api/coach/plans/jobs] Injuries query failed; continuing without injuries context",
      {
        code: injuriesError.code,
        message: injuriesError.message,
      },
    );
  }

  const activeInjuries =
    injuriesError || !injuries
      ? []
      : injuries.map((injury) => ({
          name: injury.name,
          severity: String(injury.severity),
          notes: injury.notes,
        }));

  const trainingMonths = computeTrainingMonths(athlete.training_start_date);
  const level = computeAthleteLevel(trainingMonths);

  const athleteWithContext: AthleteWithContext = {
    ...athlete,
    trainingMonths,
    level,
    activeInjuries,
    diagnosticFindings: [],
    recentProgressions: [],
  };

  const promptInputs = {
    systemPrompt: buildSystemPrompt(),
    userPrompt: buildUserPrompt(athleteWithContext),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("plan_generation_jobs")
    .insert({
      athlete_id: athleteId,
      coach_id: user.id,
      prompt_inputs: promptInputs,
      model: DEFAULT_MODEL,
      max_tokens: resolvePlanMaxTokens(),
      max_attempts: 3,
      status: "queued",
    })
    .select(PLAN_JOB_STATUS_SELECT)
    .single();

  if (insertError || !inserted) {
    if (isDuplicateActiveJobError(insertError)) {
      return NextResponse.json(
        { error: "Generowanie planu jest już w toku." },
        { status: 409 },
      );
    }

    console.error("[POST /api/coach/plans/jobs] Insert failed", {
      code: insertError?.code,
      message: insertError?.message,
    });
    return NextResponse.json(
      { error: "Nie udało się utworzyć zadania." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { data: toPublicPlanJobStatus(inserted as PlanJobStatusRow) },
    { status: 201 },
  );
}
