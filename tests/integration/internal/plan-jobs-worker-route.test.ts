/// <reference types="vitest/globals" />

import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, vi } from "vitest";

const { mockRpc, mockGeneratePlan, mockParsePlanJson } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  const mockGeneratePlan = vi.fn();
  const mockParsePlanJson = vi.fn();
  return { mockRpc, mockGeneratePlan, mockParsePlanJson };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

vi.mock("@/lib/ai/client", () => ({
  generatePlan: (...args: unknown[]) => mockGeneratePlan(...args),
}));

vi.mock("@/lib/ai/parse-plan-json", () => ({
  parsePlanJson: (...args: unknown[]) => mockParsePlanJson(...args),
}));

import { POST } from "@/app/api/internal/plans/jobs/run/route";

const ORIGINAL_WORKER_SECRET = process.env.PLAN_JOBS_WORKER_SECRET;
const WORKER_SECRET = "test-worker-secret";

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

function makeRequest(secret?: string) {
  const headers = new Headers();
  if (secret) {
    headers.set("x-plan-jobs-worker-secret", secret);
  }
  return new Request("http://localhost/api/internal/plans/jobs/run", {
    method: "POST",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.PLAN_JOBS_WORKER_SECRET = WORKER_SECRET;
});

afterEach(() => {
  if (ORIGINAL_WORKER_SECRET == null) {
    delete process.env.PLAN_JOBS_WORKER_SECRET;
  } else {
    process.env.PLAN_JOBS_WORKER_SECRET = ORIGINAL_WORKER_SECRET;
  }
});

describe("POST /api/internal/plans/jobs/run", () => {
  it("returns 500 when worker secret env is missing", async () => {
    delete process.env.PLAN_JOBS_WORKER_SECRET;

    const response = await POST(
      makeRequest(WORKER_SECRET) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Worker misconfigured");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 401 when secret header is missing/invalid", async () => {
    const response = await POST(
      makeRequest("wrong-secret") as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 500 when claim RPC fails", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { code: "XX000", message: "claim failed" },
    });

    const response = await POST(
      makeRequest(WORKER_SECRET) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Worker claim failed");
  });

  it("returns processed=false when no job is available", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const response = await POST(
      makeRequest(WORKER_SECRET) as Parameters<typeof POST>[0],
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
      makeRequest(WORKER_SECRET) as Parameters<typeof POST>[0],
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
    mockGeneratePlan.mockRejectedValueOnce(retryableError);

    const response = await POST(
      makeRequest(WORKER_SECRET) as Parameters<typeof POST>[0],
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
    mockGeneratePlan.mockResolvedValueOnce("{ invalid }");
    mockParsePlanJson.mockImplementationOnce(() => {
      throw new Error("Failed to parse JSON from Claude response");
    });

    const response = await POST(
      makeRequest(WORKER_SECRET) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("failed");
    expect(mockRpc).toHaveBeenNthCalledWith(2, "fail_plan_generation_job", {
      p_job_id: CLAIMED_JOB.id,
      p_claim_token: CLAIMED_JOB.claim_token,
      p_error_code: "plan_parse_or_validation_failed",
      p_error_message: "Failed to parse JSON from Claude response",
      p_retryable: false,
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
    mockGeneratePlan.mockResolvedValueOnce("{\"ok\":true}");
    mockParsePlanJson.mockReturnValueOnce({
      planName: "Plan testowy",
      phase: "Bazowy",
      summary: "Krotkie podsumowanie",
      weeklyOverview: "4 dni",
      weeks: [],
      progressionNotes: "Postep",
      nutritionTips: "Bialko",
      recoveryProtocol: "Sen",
    });

    const response = await POST(
      makeRequest(WORKER_SECRET) as Parameters<typeof POST>[0],
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
      p_plan_json: {
        planName: "Plan testowy",
        phase: "Bazowy",
        summary: "Krotkie podsumowanie",
        weeklyOverview: "4 dni",
        weeks: [],
        progressionNotes: "Postep",
        nutritionTips: "Bialko",
        recoveryProtocol: "Sen",
      },
    });
  });
});
