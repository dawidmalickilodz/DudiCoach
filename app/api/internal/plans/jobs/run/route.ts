import Anthropic from "@anthropic-ai/sdk";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  mapPlanJobErrorMessage,
  type PlanJobPromptInputs,
  planJobPromptInputsSchema,
} from "@/lib/api/plan-jobs";
import {
  generatePlanStructured,
  generatePlanWithMetadata,
  repairPlanJsonWithMetadata,
  type PlanGenerationMetadata,
} from "@/lib/ai/client";
import { parsePlanJson } from "@/lib/ai/parse-plan-json";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  trainingPlanJsonSchema,
  type TrainingPlanJson,
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
    error.message.startsWith("Failed to parse JSON from Claude response:")
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
  let structuredAttempted = false;
  let repairAttempted = false;
  let generationMetadata: PlanGenerationMetadata | null = null;

  try {
    structuredAttempted = true;
    const structured = await generatePlanStructured(promptInputs);
    generationMetadata = structured.metadata;
    parsedPlan = trainingPlanJsonSchema.parse(structured.plan);
    logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
      structuredAttempted,
      repairAttempted,
      parseFailureClass: null,
      repairParseResult: "not_needed",
      structuredPathResult: "success",
    });
  } catch (structuredError) {
    logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
      structuredAttempted,
      repairAttempted,
      parseFailureClass: classifyErrorClass(structuredError),
      repairParseResult: "not_attempted",
      structuredPathResult: "failed",
    });
  }

  if (!parsedPlan) {
    let rawPlan: string;
    try {
      const generated = await generatePlanWithMetadata(promptInputs);
      rawPlan = generated.text;
      generationMetadata = generated.metadata;
      logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
        structuredAttempted,
        repairAttempted,
      });
    } catch (error) {
      const retryable = isRetryableGenerationError(error);
      await failJob(
        claimedJob,
        classifyErrorCode(error, "generation"),
        sanitizeMessage(error),
        retryable,
      );
      return NextResponse.json(
        {
          processed: true,
          status: retryable ? "queued" : "failed",
          jobId: claimedJob.id,
        },
        { status: 200 },
      );
    }

    try {
      parsedPlan = parsePlanJson(rawPlan);
      logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
        structuredAttempted,
        repairAttempted,
        parseFailureClass: null,
        repairParseResult: "not_needed",
      });
    } catch (error) {
      const parseFailureClass = classifyErrorClass(error);
      if (!isJsonParseFailure(error)) {
        const parseErrorCode = classifyErrorCode(error, "parse");
        console.error(`[${routeLabel}] Plan schema validation failed`, {
          jobId: claimedJob.id,
          parseFailureClass,
          message: sanitizeMessage(error),
        });
        logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
          structuredAttempted,
          repairAttempted,
          parseFailureClass,
          repairParseResult: "not_attempted",
        });
        await failJob(
          claimedJob,
          parseErrorCode,
          mapPlanJobErrorMessage(parseErrorCode) ??
            "Nie udało się wygenerować planu. Spróbuj ponownie.",
          false,
        );
        return NextResponse.json(
          { processed: true, status: "failed", jobId: claimedJob.id },
          { status: 200 },
        );
      }

      repairAttempted = true;
      console.warn(
        `[${routeLabel}] Initial plan parse failed; attempting one JSON repair pass`,
        {
          jobId: claimedJob.id,
          parseFailureClass,
          message: sanitizeMessage(error),
        },
      );

      try {
        const repaired = await repairPlanJsonWithMetadata(rawPlan);
        generationMetadata = repaired.metadata;
        parsedPlan = parsePlanJson(repaired.text);
        logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
          structuredAttempted,
          repairAttempted,
          parseFailureClass,
          repairParseResult: "success",
        });
      } catch (repairError) {
        const parseErrorCode = classifyErrorCode(repairError, "parse");
        const repairParseFailureClass = classifyErrorClass(repairError);
        console.error(`[${routeLabel}] Plan repair failed`, {
          jobId: claimedJob.id,
          parseFailureClass,
          repairParseFailureClass,
          message: sanitizeMessage(repairError),
        });
        logGenerationMetadata(routeLabel, claimedJob, generationMetadata, {
          structuredAttempted,
          repairAttempted,
          parseFailureClass,
          repairParseResult: "failed",
        });
        await failJob(
          claimedJob,
          parseErrorCode,
          mapPlanJobErrorMessage(parseErrorCode) ??
            "Nie udało się wygenerować planu. Spróbuj ponownie.",
          false,
        );
        return NextResponse.json(
          { processed: true, status: "failed", jobId: claimedJob.id },
          { status: 200 },
        );
      }
    }
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
