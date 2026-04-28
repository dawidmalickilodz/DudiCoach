/// <reference types="vitest/globals" />

import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, vi } from "vitest";

const {
  mockRpc,
  mockGeneratePlanStructured,
  mockGeneratePlanWithMetadata,
  mockRepairPlanJsonWithMetadata,
  mockParsePlanJson,
} = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockGeneratePlanStructured = vi.fn();
  const mockGeneratePlanWithMetadata = vi.fn();
  const mockRepairPlanJsonWithMetadata = vi.fn();
  const mockParsePlanJson = vi.fn();
  return {
    mockRpc,
    mockGeneratePlanStructured,
    mockGeneratePlanWithMetadata,
    mockRepairPlanJsonWithMetadata,
    mockParsePlanJson,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

vi.mock("@/lib/ai/client", () => ({
  generatePlanStructured: (...args: unknown[]) => mockGeneratePlanStructured(...args),
  generatePlanWithMetadata: (...args: unknown[]) => mockGeneratePlanWithMetadata(...args),
  repairPlanJsonWithMetadata: (...args: unknown[]) => mockRepairPlanJsonWithMetadata(...args),
}));

vi.mock("@/lib/ai/parse-plan-json", () => ({
  parsePlanJson: (...args: unknown[]) => mockParsePlanJson(...args),
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

const VALID_STRUCTURED_PLAN = {
  planName: "Plan testowy",
  phase: "Bazowy",
  summary: "Krotkie podsumowanie planu.",
  weeklyOverview: "4 tygodnie po 1 dniu.",
  weeks: [1, 2, 3, 4].map((weekNumber) => ({
    weekNumber,
    focus: `Tydzien ${weekNumber}`,
    days: [
      {
        dayNumber: 1,
        dayName: "Dzien A",
        warmup: "Krotka rozgrzewka.",
        exercises: [
          {
            name: "Przysiad",
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
  })),
  progressionNotes: "Stopniowa progresja.",
  nutritionTips: "Bilans kaloryczny.",
  recoveryProtocol: "Sen i nawodnienie.",
};

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
  mockGeneratePlanStructured.mockReset();
  mockGeneratePlanWithMetadata.mockReset();
  mockRepairPlanJsonWithMetadata.mockReset();
  mockParsePlanJson.mockReset();
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

  it("returns 401 when cron bearer is invalid", async () => {
    const response = await GET(
      makeRequest({ method: "GET", bearer: "wrong-cron-secret" }) as Parameters<
        typeof GET
      >[0],
    );
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

  it("returns 401 when secret header is missing/invalid", async () => {
    const response = await POST(
      makeRequest({ workerSecret: "wrong-secret" }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("accepts bearer token secret for manual/internal POST auth", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    const request = makeRequest({ bearer: WORKER_SECRET });

    const response = await POST(request as Parameters<typeof POST>[0]);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.processed).toBe(false);
  });

  it("returns 500 when claim RPC fails", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: "XX000", message: "claim failed" },
    });

    const response = await POST(
      makeRequest({ workerSecret: WORKER_SECRET }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Worker claim failed");
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

  it("fails claimed job when prompt_inputs are invalid", async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: [{ ...CLAIMED_JOB, prompt_inputs: { broken: true } }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ job_id: CLAIMED_JOB.id, status: "failed" }],
        error: null,
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
      p_error_code: "invalid_prompt_inputs",
      p_error_message: "Invalid prompt_inputs payload",
      p_retryable: false,
    });
  });

  it("queues retry on retryable Anthropic generation error", async () => {
    const retryableError = new Error("provider unavailable");
    Object.setPrototypeOf(retryableError, Anthropic.APIError.prototype);
    (retryableError as Error & { status: number }).status = 503;

    mockRpc
      .mockResolvedValueOnce({ data: [CLAIMED_JOB], error: null })
      .mockResolvedValueOnce({
        data: [{ job_id: CLAIMED_JOB.id, status: "queued" }],
        error: null,
      });
    mockGeneratePlanStructured.mockRejectedValueOnce(new Error("structured unavailable"));
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

  it("marks job failed when parse/validation fails", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: [CLAIMED_JOB], error: null })
      .mockResolvedValueOnce({
        data: [{ job_id: CLAIMED_JOB.id, status: "failed" }],
        error: null,
      });
    mockGeneratePlanStructured.mockRejectedValueOnce(new Error("structured unavailable"));
    mockGeneratePlanWithMetadata.mockResolvedValueOnce({
      text: "{ invalid }",
      metadata: {
        mode: "text",
        stopReason: "max_tokens",
        inputTokens: 1200,
        outputTokens: 3000,
        textLength: 10,
        toolInputLength: null,
      },
    });
    mockParsePlanJson.mockImplementationOnce(() => {
      throw new Error("Failed to parse JSON from Claude response: Unexpected token");
    });
    mockRepairPlanJsonWithMetadata.mockResolvedValueOnce({
      text: "{ still invalid }",
      metadata: {
        mode: "repair",
        stopReason: "end_turn",
        inputTokens: 700,
        outputTokens: 1800,
        textLength: 16,
        toolInputLength: null,
      },
    });
    mockParsePlanJson.mockImplementationOnce(() => {
      throw new Error("Repair pass still invalid JSON");
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

  it("does not attempt repair on schema validation error", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: [CLAIMED_JOB], error: null })
      .mockResolvedValueOnce({
        data: [{ job_id: CLAIMED_JOB.id, status: "failed" }],
        error: null,
      });
    mockGeneratePlanStructured.mockRejectedValueOnce(new Error("structured unavailable"));
    mockGeneratePlanWithMetadata.mockResolvedValueOnce({
      text: "{\"ok\":true}",
      metadata: {
        mode: "text",
        stopReason: "end_turn",
        inputTokens: 1200,
        outputTokens: 600,
        textLength: 11,
        toolInputLength: null,
      },
    });
    mockParsePlanJson.mockImplementationOnce(() => {
      throw new Error("Invalid input: expected weeks length 4");
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

  it("attempts one repair pass and succeeds when repaired JSON is valid", async () => {
    const repairedPlan = {
      planName: "Plan po naprawie",
      phase: "Bazowy",
      summary: "Krotkie podsumowanie",
      weeklyOverview: "4 dni",
      weeks: [],
      progressionNotes: "Postep",
      nutritionTips: "Bialko",
      recoveryProtocol: "Sen",
    };

    mockRpc
      .mockResolvedValueOnce({ data: [CLAIMED_JOB], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            job_id: CLAIMED_JOB.id,
            plan_id: "plan-uuid-repaired",
            status: "succeeded",
          },
        ],
        error: null,
      });
    mockGeneratePlanStructured.mockRejectedValueOnce(new Error("structured unavailable"));
    mockGeneratePlanWithMetadata.mockResolvedValueOnce({
      text: "{ malformed",
      metadata: {
        mode: "text",
        stopReason: "max_tokens",
        inputTokens: 1200,
        outputTokens: 3000,
        textLength: 11,
        toolInputLength: null,
      },
    });
    mockParsePlanJson.mockImplementationOnce(() => {
      throw new Error("Failed to parse JSON from Claude response: Unterminated string");
    });
    mockRepairPlanJsonWithMetadata.mockResolvedValueOnce({
      text: "{\"fixed\":true}",
      metadata: {
        mode: "repair",
        stopReason: "end_turn",
        inputTokens: 600,
        outputTokens: 1100,
        textLength: 14,
        toolInputLength: null,
      },
    });
    mockParsePlanJson.mockReturnValueOnce(repairedPlan);

    const response = await POST(
      makeRequest({ workerSecret: WORKER_SECRET }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("succeeded");
    expect(json.planId).toBe("plan-uuid-repaired");
    expect(mockRepairPlanJsonWithMetadata).toHaveBeenCalledTimes(1);
    expect(mockParsePlanJson).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenNthCalledWith(2, "complete_plan_generation_job", {
      p_job_id: CLAIMED_JOB.id,
      p_claim_token: CLAIMED_JOB.claim_token,
      p_plan_name: "Plan po naprawie",
      p_phase: "Bazowy",
      p_plan_json: repairedPlan,
    });
  });

  it("completes job and returns plan id on success", async () => {
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
    mockGeneratePlanStructured.mockResolvedValueOnce({
      plan: VALID_STRUCTURED_PLAN,
      metadata: {
        mode: "structured_tool",
        stopReason: "tool_use",
        inputTokens: 1400,
        outputTokens: 1300,
        textLength: null,
        toolInputLength: 1200,
      },
    });

    const response = await POST(
      makeRequest({ workerSecret: WORKER_SECRET }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("succeeded");
    expect(json.planId).toBe("plan-uuid-001");
    expect(mockRpc).toHaveBeenNthCalledWith(2, "complete_plan_generation_job", {
      p_job_id: CLAIMED_JOB.id,
      p_claim_token: CLAIMED_JOB.claim_token,
      p_plan_name: "Plan testowy",
      p_phase: "Bazowy",
      p_plan_json: VALID_STRUCTURED_PLAN,
    });
  });
});
