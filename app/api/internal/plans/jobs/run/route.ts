import Anthropic from "@anthropic-ai/sdk";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  mapPlanJobErrorMessage,
  type PlanJobPromptInputs,
  planJobPromptInputsSchema,
} from "@/lib/api/plan-jobs";
import {
  generatePlanHeaderStructured,
  generatePlanWeekStructured,
  generatePlanWithMetadata,
  repairPlanJsonWithMetadata,
  type PlanGenerationMetadata,
} from "@/lib/ai/client";
import { parseJsonWithSchema } from "@/lib/ai/parse-plan-json";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  trainingPlanHeaderSchema,
  trainingPlanJsonSchema,
  weekSchema,
  type TrainingPlanHeader,
  type TrainingPlanJson,
  type Week,
} from "@/lib/validation/training-plan";

const WORKER_SECRET_HEADER = "x-plan-jobs-worker-secret";
const AUTHORIZATION_HEADER = "authorization";
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 529]);
const CLAIM_LOCK_SECONDS = 120;

export const maxDuration = 180;

type ClaimedJob = {
  id: string;
  athlete_id: string;
  coach_id: string;
  claim_token: string;
  prompt_inputs: unknown;
  model: string;
  max_tokens: number;
  attempt_count: number;
  max_attempts: number;
};

function secureEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function extractBearerSecret(request: NextRequest) {
  const authHeader = request.headers.get(AUTHORIZATION_HEADER);
  if (!authHeader) return null;
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  return authHeader.slice("bearer ".length).trim();
}

function extractManualWorkerSecret(request: NextRequest) {
  const direct = request.headers.get(WORKER_SECRET_HEADER);
  if (direct) return direct;

  return extractBearerSecret(request);
}

function sanitizeMessage(input: unknown) {
  const message = input instanceof Error ? input.message : String(input);
  return message.slice(0, 320);
}

function classifyErrorClass(input: unknown) {
  if (input instanceof Anthropic.APIConnectionTimeoutError) {
    return "anthropic_timeout";
  }
  if (input instanceof Anthropic.APIError) {
    return `anthropic_api_${input.status ?? "unknown"}`;
  }
  if (input instanceof Error) {
    return input.name || "error";
  }
  return typeof input;
}

function logGenerationMetadata(
  routeLabel: string,
  job: ClaimedJob,
  metadata: PlanGenerationMetadata | null,
  extra: Record<string, unknown> = {},
) {
  console.info(`[${routeLabel}] Plan generation metadata`, {
    jobId: job.id,
    responseMode: metadata?.mode ?? null,
    stopReason: metadata?.stopReason ?? null,
    inputTokens: metadata?.inputTokens ?? null,
    outputTokens: metadata?.outputTokens ?? null,
    responseTextLength: metadata?.textLength ?? null,
    toolInputLength: metadata?.toolInputLength ?? null,
    ...extra,
  });
}

function isRetryableGenerationError(error: unknown) {
  if (error instanceof Anthropic.APIError) {
    return RETRYABLE_STATUS_CODES.has(error.status ?? 0);
  }
  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    return lower.includes("fetch") || lower.includes("network");
  }
  return false;
}

function classifyErrorCode(error: unknown, stage: "prompt" | "generation" | "parse" | "persist") {
  if (stage === "prompt") return "invalid_prompt_inputs";
  if (stage === "parse") return "plan_parse_or_validation_failed";
  if (stage === "persist") return "plan_persist_failed";
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "provider_timeout";
  if (error instanceof Anthropic.APIError) return "provider_api_error";
  return "generation_unexpected_error";
}

function isJsonParseFailure(error: unknown) {
  return (
    error instanceof Error &&
    error.message.startsWith("Failed to parse JSON from ")
  );
}

async function failJob(
  job: ClaimedJob,
  errorCode: string,
  errorMessage: string,
  retryable: boolean,
) {
  const supabase = createAdminClient();
  await supabase.rpc("fail_plan_generation_job", {
    p_job_id: job.id,
    p_claim_token: job.claim_token,
    p_error_code: errorCode,
    p_error_message: errorMessage,
    p_retryable: retryable,
  });
}

function parsePromptInputs(raw: unknown): PlanJobPromptInputs {
  const parsed = planJobPromptInputsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid prompt_inputs payload");
  }
  return parsed.data;
}

const WEEK_NUMBERS = [1, 2, 3, 4] as const;

function buildHeaderUserPrompt(baseUserPrompt: string) {
  return `${baseUserPrompt}

Nadpisanie zadania:
- Wygeneruj TYLKO naglowek planu jako JSON.
- Nie dodawaj pola "weeks".
- Zachowaj zwiezly styl.
- Zwracaj WYŁĄCZNIE JSON obiektu naglowka.`;
}

function summarizePreviousWeeks(weeks: Week[]) {
  if (weeks.length === 0) return "Brak wczesniejszych tygodni.";
  return weeks
    .map((week) => `T${week.weekNumber}: ${week.focus}`)
    .join(" | ");
}

function buildWeekUserPrompt(
  baseUserPrompt: string,
  {
    header,
    weekNumber,
    previousWeeks,
  }: {
    header: TrainingPlanHeader;
    weekNumber: number;
    previousWeeks: Week[];
  },
) {
  const deloadHint =
    weekNumber === 4
      ? "To jest tydzien deload: objetosc i obciazenie musza byc nizsze niz w tygodniach 1-3."
      : "To nie jest tydzien deload.";

  return `${baseUserPrompt}

Nadpisanie zadania:
- Wygeneruj TYLKO obiekt tygodnia dla weekNumber=${weekNumber}.
- Zachowaj liczbe dni treningowych zgodna z danymi zawodnika.
- Zachowaj 3-4 cwiczenia na sesje.
- focus/warmup/cooldown/notes = 1 krotkie zdanie.
- ${deloadHint}

Kontekst naglowka planu:
- planName: ${header.planName}
- phase: ${header.phase}
- weeklyOverview: ${header.weeklyOverview}

Fokus poprzednich tygodni:
${summarizePreviousWeeks(previousWeeks)}

Zwracaj WYŁĄCZNIE JSON pojedynczego tygodnia.`;
}

type StructuredGenerationResult = {
  output: unknown;
  metadata: PlanGenerationMetadata;
};

function markGenerationStage(error: unknown) {
  if (error instanceof Error) {
    Object.assign(error, { _planStage: "generation" });
    return error;
  }
  const wrapped = new Error(String(error));
  Object.assign(wrapped, { _planStage: "generation" });
  return wrapped;
}

async function generateSectionWithFallback<T>({
  routeLabel,
  claimedJob,
  sectionLabel,
  promptInputs,
  generateStructured,
  parseStructuredOutput,
  parseTextOutput,
}: {
  routeLabel: string;
  claimedJob: ClaimedJob;
  sectionLabel: string;
  promptInputs: PlanJobPromptInputs;
  generateStructured: (params: PlanJobPromptInputs) => Promise<StructuredGenerationResult>;
  parseStructuredOutput: (input: unknown) => T;
  parseTextOutput: (raw: string) => T;
}): Promise<T> {
  let structuredAttempted = false;
  let repairAttempted = false;
  let generationMetadata: PlanGenerationMetadata | null = null;

  try {
    structuredAttempted = true;
    const structured = await generateStructured(promptInputs);
    generationMetadata = structured.metadata;
    const parsed = parseStructuredOutput(structured.output);
    logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
      section: sectionLabel,
      structuredAttempted,
      repairAttempted,
      parseFailureClass: null,
      repairParseResult: "not_needed",
      structuredPathResult: "success",
    });
    return parsed;
  } catch (structuredError) {
    logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
      section: sectionLabel,
      structuredAttempted,
      repairAttempted,
      parseFailureClass: classifyErrorClass(structuredError),
      repairParseResult: "not_attempted",
      structuredPathResult: "failed",
    });
  }

  let rawText: string;
  try {
    const generated = await generatePlanWithMetadata(promptInputs);
    rawText = generated.text;
    generationMetadata = generated.metadata;
  } catch (error) {
    throw markGenerationStage(error);
  }
  logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
    section: sectionLabel,
    structuredAttempted,
    repairAttempted,
  });

  try {
    const parsed = parseTextOutput(rawText);
    logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
      section: sectionLabel,
      structuredAttempted,
      repairAttempted,
      parseFailureClass: null,
      repairParseResult: "not_needed",
    });
    return parsed;
  } catch (error) {
    const parseFailureClass = classifyErrorClass(error);
    if (!isJsonParseFailure(error)) {
      logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
        section: sectionLabel,
        structuredAttempted,
        repairAttempted,
        parseFailureClass,
        repairParseResult: "not_attempted",
      });
      throw error;
    }

    repairAttempted = true;
    console.warn(
      `[${routeLabel}] Initial ${sectionLabel} parse failed; attempting one JSON repair pass`,
      {
        jobId: claimedJob.id,
        parseFailureClass,
        message: sanitizeMessage(error),
      },
    );

    try {
      const repaired = await repairPlanJsonWithMetadata(rawText);
      generationMetadata = repaired.metadata;
      const parsed = parseTextOutput(repaired.text);
      logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
        section: sectionLabel,
        structuredAttempted,
        repairAttempted,
        parseFailureClass,
        repairParseResult: "success",
      });
      return parsed;
    } catch (repairError) {
      logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
        section: sectionLabel,
        structuredAttempted,
        repairAttempted,
        parseFailureClass,
        repairParseResult: "failed",
      });
      throw repairError;
    }
  }
}

async function runWorker(routeLabel: string) {
  const supabase = createAdminClient();
  const { data: claimData, error: claimError } = await supabase.rpc(
    "claim_pending_plan_generation_job",
    { p_lock_seconds: CLAIM_LOCK_SECONDS },
  );

  if (claimError) {
    console.error(`[${routeLabel}] Claim RPC failed`, {
      code: claimError.code,
      message: claimError.message,
    });
    return NextResponse.json(
      { error: "Worker claim failed" },
      { status: 500 },
    );
  }

  const claimedJob = ((claimData ?? [])[0] ?? null) as ClaimedJob | null;
  if (!claimedJob) {
    return NextResponse.json({ processed: false }, { status: 200 });
  }

  let promptInputs: PlanJobPromptInputs;
  try {
    promptInputs = parsePromptInputs(claimedJob.prompt_inputs);
  } catch (error) {
    await failJob(
      claimedJob,
      classifyErrorCode(error, "prompt"),
      sanitizeMessage(error),
      false,
    );
    return NextResponse.json(
      { processed: true, status: "failed", jobId: claimedJob.id },
      { status: 200 },
    );
  }

  let parsedPlan: TrainingPlanJson | null = null;

  try {
    const headerPromptInputs: PlanJobPromptInputs = {
      systemPrompt: promptInputs.systemPrompt,
      userPrompt: buildHeaderUserPrompt(promptInputs.userPrompt),
    };
    const header = await generateSectionWithFallback<TrainingPlanHeader>({
      routeLabel,
      claimedJob,
      sectionLabel: "header",
      promptInputs: headerPromptInputs,
      generateStructured: async (params) => {
        const result = await generatePlanHeaderStructured(params);
        return { output: result.header, metadata: result.metadata };
      },
      parseStructuredOutput: (input) => trainingPlanHeaderSchema.parse(input),
      parseTextOutput: (raw) =>
        parseJsonWithSchema(raw, trainingPlanHeaderSchema, "plan header response"),
    });

    const weeks: Week[] = [];
    for (const weekNumber of WEEK_NUMBERS) {
      const weekPromptInputs: PlanJobPromptInputs = {
        systemPrompt: promptInputs.systemPrompt,
        userPrompt: buildWeekUserPrompt(promptInputs.userPrompt, {
          header,
          weekNumber,
          previousWeeks: weeks,
        }),
      };

      const week = await generateSectionWithFallback<Week>({
        routeLabel,
        claimedJob,
        sectionLabel: `week_${weekNumber}`,
        promptInputs: weekPromptInputs,
        generateStructured: async (params) => {
          const result = await generatePlanWeekStructured(params);
          return { output: result.week, metadata: result.metadata };
        },
        parseStructuredOutput: (input) => weekSchema.parse(input),
        parseTextOutput: (raw) =>
          parseJsonWithSchema(raw, weekSchema, `week ${weekNumber} response`),
      });

      weeks.push(week);
    }

    parsedPlan = trainingPlanJsonSchema.parse({
      ...header,
      weeks,
    });
  } catch (error) {
    const stageHint =
      typeof error === "object" && error !== null
        ? (error as { _planStage?: string })._planStage
        : undefined;
    const isGenerationFailure =
      stageHint === "generation" ||
      error instanceof Anthropic.APIConnectionTimeoutError ||
      error instanceof Anthropic.APIError ||
      isRetryableGenerationError(error);

    const stage = isGenerationFailure ? "generation" : "parse";
    const errorCode = classifyErrorCode(error, stage);
    const retryable = isGenerationFailure && isRetryableGenerationError(error);
    const errorMessage =
      stage === "parse"
        ? mapPlanJobErrorMessage(errorCode) ??
          "Nie udało się wygenerować planu. Spróbuj ponownie."
        : sanitizeMessage(error);

    console.error(`[${routeLabel}] Per-week generation failed`, {
      jobId: claimedJob.id,
      stage,
      errorClass: classifyErrorClass(error),
      message: sanitizeMessage(error),
    });

    await failJob(claimedJob, errorCode, errorMessage, retryable);
    return NextResponse.json(
      {
        processed: true,
        status: retryable ? "queued" : "failed",
        jobId: claimedJob.id,
      },
      { status: 200 },
    );
  }

  if (!parsedPlan) {
    await failJob(
      claimedJob,
      "generation_unexpected_error",
      "Nie udało się wygenerować planu. Spróbuj ponownie.",
      false,
    );
    return NextResponse.json(
      { processed: true, status: "failed", jobId: claimedJob.id },
      { status: 200 },
    );
  }

  const { data: completedData, error: completeError } = await supabase.rpc(
    "complete_plan_generation_job",
    {
      p_job_id: claimedJob.id,
      p_claim_token: claimedJob.claim_token,
      p_plan_name: parsedPlan.planName,
      p_phase: parsedPlan.phase,
      p_plan_json: parsedPlan,
    },
  );

  if (completeError || !completedData || completedData.length === 0) {
    console.error(`[${routeLabel}] Complete RPC failed`, {
      code: completeError?.code,
      message: completeError?.message,
      jobId: claimedJob.id,
    });
    await failJob(
      claimedJob,
      classifyErrorCode(completeError, "persist"),
      sanitizeMessage(completeError ?? "complete rpc returned no row"),
      true,
    );
    return NextResponse.json(
      { processed: true, status: "queued", jobId: claimedJob.id },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      processed: true,
      status: "succeeded",
      jobId: claimedJob.id,
      planId: completedData[0].plan_id,
    },
    { status: 200 },
  );
}

/**
 * GET /api/internal/plans/jobs/run
 * Vercel Cron trigger. Requires Authorization: Bearer ${CRON_SECRET}.
 */
export async function GET(request: NextRequest) {
  const expectedCronSecret = process.env.CRON_SECRET;
  if (!expectedCronSecret) {
    console.error("[GET /api/internal/plans/jobs/run] Missing CRON_SECRET");
    return NextResponse.json(
      { error: "Worker misconfigured" },
      { status: 500 },
    );
  }

  const incomingBearer = extractBearerSecret(request);
  if (!incomingBearer || !secureEquals(incomingBearer, expectedCronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runWorker("GET /api/internal/plans/jobs/run");
}

/**
 * POST /api/internal/plans/jobs/run
 * Manual/internal trigger. Requires PLAN_JOBS_WORKER_SECRET.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.PLAN_JOBS_WORKER_SECRET;
  if (!expectedSecret) {
    console.error("[POST /api/internal/plans/jobs/run] Missing PLAN_JOBS_WORKER_SECRET");
    return NextResponse.json(
      { error: "Worker misconfigured" },
      { status: 500 },
    );
  }

  const incomingSecret = extractManualWorkerSecret(request);
  if (!incomingSecret || !secureEquals(incomingSecret, expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runWorker("POST /api/internal/plans/jobs/run");
}
