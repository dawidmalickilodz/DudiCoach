/// <reference types="vitest/globals" />

import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, vi } from "vitest";

import { trainingPlanJsonSchema } from "@/lib/validation/training-plan";

const {
  mockRpc,
  mockGeneratePlanHeaderStructured,
  mockGeneratePlanWeekStructured,
  mockGeneratePlanWithMetadata,
  mockRepairPlanJsonWithMetadata,
} = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockGeneratePlanHeaderStructured = vi.fn();
  const mockGeneratePlanWeekStructured = vi.fn();
  const mockGeneratePlanWithMetadata = vi.fn();
  const mockRepairPlanJsonWithMetadata = vi.fn();
  return {
    mockRpc,
    mockGeneratePlanHeaderStructured,
    mockGeneratePlanWeekStructured,
    mockGeneratePlanWithMetadata,
    mockRepairPlanJsonWithMetadata,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

vi.mock("@/lib/ai/client", () => ({
  generatePlanHeaderStructured: (...args: unknown[]) =>
    mockGeneratePlanHeaderStructured(...args),
  generatePlanWeekStructured: (...args: unknown[]) =>
    mockGeneratePlanWeekStructured(...args),
  generatePlanWithMetadata: (...args: unknown[]) =>
    mockGeneratePlanWithMetadata(...args),
  repairPlanJsonWithMetadata: (...args: unknown[]) =>
    mockRepairPlanJsonWithMetadata(...args),
}));

import { GET, POST } from "@/app/api/internal/plans/jobs/run/route";

const ORIGINAL_WORKER_SECRET = process.env.PLAN_JOBS_WORKER_SECRET;
const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;
const WORKER_SECRET = "test-worker-secret";
const CRON_SECRET = "test-cron-secret";
const PARSE_SAFE_ERROR_MESSAGE =
  "Nie udało się przetworzyć odpowiedzi AI. Spróbuj ponownie.";

const CLAIMED_JOB = {
  id: "job-uuid-001",
  athlete_id: "athlete-uuid-001",
  coach_id: "coach-uuid-001",
  claim_token: "9f7e4b80-4f79-470c-8371-89f0ed75e91f",
  prompt_inputs: {
    systemPrompt: "SYS",
    userPrompt: "USR",
  },
  model: "claude-sonnet-4-6",
  max_tokens: 3000,
  attempt_count: 1,
  max_attempts: 3,
};

const PLAN_HEADER = {
  planName: "Plan testowy",
  phase: "Bazowy",
  summary: "Krotkie podsumowanie planu.",
  weeklyOverview: "4 tygodnie po 1 dniu.",
  progressionNotes: "Stopniowa progresja.",
  nutritionTips: "Bilans kaloryczny.",
  recoveryProtocol: "Sen i nawodnienie.",
};

function buildWeek(weekNumber: 1 | 2 | 3 | 4) {
  return {
    weekNumber,
    focus: `Tydzien ${weekNumber}`,
    days: [
      {
        dayNumber: 1,
        dayName: "Dzien A",
        warmup: "Krotka rozgrzewka.",
        exercises: [
          {
            name: `Przysiad ${weekNumber}`,
            sets: "3",
            reps: "8",
            intensity: "70%",
            rest: "90s",
            tempo: "3-1-2-0",
            notes: "Kontrola ruchu.",
          },
        ],
        cooldown: "Krotki cooldown.",
        duration: "60 min",
      },
    ],
  };
}

function structuredMetadata() {
  return {
    mode: "structured_tool" as const,
    stopReason: "tool_use",
    inputTokens: 1400,
    outputTokens: 1300,
    textLength: null,
    toolInputLength: 1200,
  };
}

function textMetadata() {
  return {
    mode: "text" as const,
    stopReason: "max_tokens",
    inputTokens: 1200,
    outputTokens: 3000,
    textLength: 11,
    toolInputLength: null,
  };
}

function repairMetadata() {
  return {
    mode: "repair" as const,
    stopReason: "end_turn",
    inputTokens: 700,
    outputTokens: 1800,
    textLength: 16,
    toolInputLength: null,
  };
}

function makeRequest({
  method = "POST",
  workerSecret,
  bearer,
}: {
  method?: "GET" | "POST";
  workerSecret?: string;
  bearer?: string;
} = {}) {
  const headers = new Headers();
  if (workerSecret) {
    headers.set("x-plan-jobs-worker-secret", workerSecret);
  }
  if (bearer) {
    headers.set("authorization", `Bearer ${bearer}`);
  }
  return new Request("http://localhost/api/internal/plans/jobs/run", {
    method,
    headers,
  });
}

beforeEach(() => {
  mockRpc.mockReset();
  mockGeneratePlanHeaderStructured.mockReset();
  mockGeneratePlanWeekStructured.mockReset();
  mockGeneratePlanWithMetadata.mockReset();
  mockRepairPlanJsonWithMetadata.mockReset();
  process.env.PLAN_JOBS_WORKER_SECRET = WORKER_SECRET;
  process.env.CRON_SECRET = CRON_SECRET;
});

afterEach(() => {
  if (ORIGINAL_WORKER_SECRET == null) {
    delete process.env.PLAN_JOBS_WORKER_SECRET;
  } else {
    process.env.PLAN_JOBS_WORKER_SECRET = ORIGINAL_WORKER_SECRET;
  }

  if (ORIGINAL_CRON_SECRET == null) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
  }
});

describe("GET /api/internal/plans/jobs/run", () => {
  it("returns 500 when CRON_SECRET env is missing", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(makeRequest({ method: "GET" }) as Parameters<typeof GET>[0]);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Worker misconfigured");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 401 when cron bearer is missing", async () => {
    const response = await GET(makeRequest({ method: "GET" }) as Parameters<typeof GET>[0]);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("accepts CRON_SECRET bearer and processes claims", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const response = await GET(
      makeRequest({ method: "GET", bearer: CRON_SECRET }) as Parameters<typeof GET>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.processed).toBe(false);
    expect(mockRpc).toHaveBeenCalledWith("claim_pending_plan_generation_job", {
      p_lock_seconds: 120,
    });
  });
});

describe("POST /api/internal/plans/jobs/run", () => {
  it("returns 500 when worker secret env is missing", async () => {
    delete process.env.PLAN_JOBS_WORKER_SECRET;

    const response = await POST(
      makeRequest({ workerSecret: WORKER_SECRET }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Worker misconfigured");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns processed=false when no job is available", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const response = await POST(
      makeRequest({ workerSecret: WORKER_SECRET }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.processed).toBe(false);
  });

  it("all 4 weeks succeed -> job succeeded + plan inserted", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: [CLAIMED_JOB], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            job_id: CLAIMED_JOB.id,
            plan_id: "plan-uuid-001",
            status: "succeeded",
          },
        ],
        error: null,
      });

    mockGeneratePlanHeaderStructured.mockResolvedValueOnce({
      header: PLAN_HEADER,
      metadata: structuredMetadata(),
    });
    mockGeneratePlanWeekStructured
      .mockResolvedValueOnce({ week: buildWeek(1), metadata: structuredMetadata() })
      .mockResolvedValueOnce({ week: buildWeek(2), metadata: structuredMetadata() })
      .mockResolvedValueOnce({ week: buildWeek(3), metadata: structuredMetadata() })
      .mockResolvedValueOnce({ week: buildWeek(4), metadata: structuredMetadata() });

    const response = await POST(
      makeRequest({ workerSecret: WORKER_SECRET }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("succeeded");
    expect(json.planId).toBe("plan-uuid-001");

    const completeArgs = mockRpc.mock.calls[1]?.[1] as { p_plan_json: unknown };
    expect(() => trainingPlanJsonSchema.parse(completeArgs.p_plan_json)).not.toThrow();
  });

  it("one week parse fails then repair succeeds -> job succeeded", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: [CLAIMED_JOB], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            job_id: CLAIMED_JOB.id,
            plan_id: "plan-uuid-repaired-week",
            status: "succeeded",
          },
        ],
        error: null,
      });

    mockGeneratePlanHeaderStructured.mockResolvedValueOnce({
      header: PLAN_HEADER,
      metadata: structuredMetadata(),
    });
    mockGeneratePlanWeekStructured
      .mockResolvedValueOnce({ week: buildWeek(1), metadata: structuredMetadata() })
      .mockRejectedValueOnce(new Error("structured unavailable"))
      .mockResolvedValueOnce({ week: buildWeek(3), metadata: structuredMetadata() })
      .mockResolvedValueOnce({ week: buildWeek(4), metadata: structuredMetadata() });

    mockGeneratePlanWithMetadata.mockResolvedValueOnce({
      text: "{ malformed",
      metadata: textMetadata(),
    });
    mockRepairPlanJsonWithMetadata.mockResolvedValueOnce({
      text: JSON.stringify(buildWeek(2)),
      metadata: repairMetadata(),
    });

    const response = await POST(
      makeRequest({ workerSecret: WORKER_SECRET }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("succeeded");
    expect(json.planId).toBe("plan-uuid-repaired-week");
    expect(mockRepairPlanJsonWithMetadata).toHaveBeenCalledTimes(1);
  });

  it("one week fails after retry -> job failed sanitized", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: [CLAIMED_JOB], error: null })
      .mockResolvedValueOnce({
        data: [{ job_id: CLAIMED_JOB.id, status: "failed" }],
        error: null,
      });

    mockGeneratePlanHeaderStructured.mockResolvedValueOnce({
      header: PLAN_HEADER,
      metadata: structuredMetadata(),
    });
    mockGeneratePlanWeekStructured
      .mockResolvedValueOnce({ week: buildWeek(1), metadata: structuredMetadata() })
      .mockRejectedValueOnce(new Error("structured unavailable"));

    mockGeneratePlanWithMetadata.mockResolvedValueOnce({
      text: "{ invalid }",
      metadata: textMetadata(),
    });
    mockRepairPlanJsonWithMetadata.mockResolvedValueOnce({
      text: "{ still invalid }",
      metadata: repairMetadata(),
    });

    const response = await POST(
      makeRequest({ workerSecret: WORKER_SECRET }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("failed");
    expect(mockRpc).toHaveBeenNthCalledWith(2, "fail_plan_generation_job", {
      p_job_id: CLAIMED_JOB.id,
      p_claim_token: CLAIMED_JOB.claim_token,
      p_error_code: "plan_parse_or_validation_failed",
      p_error_message: PARSE_SAFE_ERROR_MESSAGE,
      p_retryable: false,
    });
  });

  it("schema validation failure does not bypass validation and does not repair", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: [CLAIMED_JOB], error: null })
      .mockResolvedValueOnce({
        data: [{ job_id: CLAIMED_JOB.id, status: "failed" }],
        error: null,
      });

    mockGeneratePlanHeaderStructured.mockResolvedValueOnce({
      header: PLAN_HEADER,
      metadata: structuredMetadata(),
    });
    mockGeneratePlanWeekStructured
      .mockResolvedValueOnce({ week: buildWeek(1), metadata: structuredMetadata() })
      .mockRejectedValueOnce(new Error("structured unavailable"));

    mockGeneratePlanWithMetadata.mockResolvedValueOnce({
      text: JSON.stringify({ weekNumber: 2 }),
      metadata: textMetadata(),
    });

    const response = await POST(
      makeRequest({ workerSecret: WORKER_SECRET }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("failed");
    expect(mockRepairPlanJsonWithMetadata).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenNthCalledWith(2, "fail_plan_generation_job", {
      p_job_id: CLAIMED_JOB.id,
      p_claim_token: CLAIMED_JOB.claim_token,
      p_error_code: "plan_parse_or_validation_failed",
      p_error_message: PARSE_SAFE_ERROR_MESSAGE,
      p_retryable: false,
    });
  });

  it("queues retry on retryable provider error", async () => {
    const retryableError = new Error("provider unavailable");
    Object.setPrototypeOf(retryableError, Anthropic.APIError.prototype);
    (retryableError as Error & { status: number }).status = 503;

    mockRpc
      .mockResolvedValueOnce({ data: [CLAIMED_JOB], error: null })
      .mockResolvedValueOnce({
        data: [{ job_id: CLAIMED_JOB.id, status: "queued" }],
        error: null,
      });

    mockGeneratePlanHeaderStructured.mockRejectedValueOnce(new Error("structured unavailable"));
    mockGeneratePlanWithMetadata.mockRejectedValueOnce(retryableError);

    const response = await POST(
      makeRequest({ workerSecret: WORKER_SECRET }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("queued");
    expect(mockRpc).toHaveBeenNthCalledWith(2, "fail_plan_generation_job", {
      p_job_id: CLAIMED_JOB.id,
      p_claim_token: CLAIMED_JOB.claim_token,
      p_error_code: "provider_api_error",
      p_error_message: "provider unavailable",
      p_retryable: true,
    });
  });
});
