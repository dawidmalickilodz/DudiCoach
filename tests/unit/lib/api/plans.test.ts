/// <reference types="vitest/globals" />

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DuplicateActiveJobError,
  IncompleteDataError,
  RateLimitError,
  fetchPlanGenerationJobStatus,
  startPlanGenerationJob,
} from "@/lib/api/plans";

type JsonInit = Record<string, unknown>;

function mockJsonResponse(status: number, body: JsonInit) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe("lib/api/plans async job client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("starts plan generation job via coach endpoint", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(201, {
        data: {
          id: "job-1",
          athlete_id: "athlete-1",
          status: "queued",
          attempt_count: 0,
          max_attempts: 3,
          plan_id: null,
          error_code: null,
          error_message: null,
          created_at: "2026-04-28T12:00:00Z",
          updated_at: "2026-04-28T12:00:00Z",
          completed_at: null,
          failed_at: null,
        },
      }),
    );

    const result = await startPlanGenerationJob("athlete-1");

    expect(fetchMock).toHaveBeenCalledWith("/api/coach/plans/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId: "athlete-1" }),
    });
    expect(result.id).toBe("job-1");
    expect(result.status).toBe("queued");
  });

  it("maps 409 to DuplicateActiveJobError", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(409, { error: "Generowanie planu jest juz w toku." }),
    );

    await expect(startPlanGenerationJob("athlete-1")).rejects.toBeInstanceOf(
      DuplicateActiveJobError,
    );
  });

  it("maps 422 to IncompleteDataError", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(422, { error: "Incomplete data" }),
    );

    await expect(startPlanGenerationJob("athlete-1")).rejects.toBeInstanceOf(
      IncompleteDataError,
    );
  });

  it("maps 429 to RateLimitError", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(429, { error: "Rate limited" }),
    );

    await expect(startPlanGenerationJob("athlete-1")).rejects.toBeInstanceOf(
      RateLimitError,
    );
  });

  it("fetches async plan generation job status", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse(200, {
        data: {
          id: "job-1",
          athlete_id: "athlete-1",
          status: "processing",
          attempt_count: 1,
          max_attempts: 3,
          plan_id: null,
          error_code: null,
          error_message: null,
          created_at: "2026-04-28T12:00:00Z",
          updated_at: "2026-04-28T12:00:05Z",
          completed_at: null,
          failed_at: null,
        },
      }),
    );

    const result = await fetchPlanGenerationJobStatus("job-1");

    expect(fetchMock).toHaveBeenCalledWith("/api/coach/plans/jobs/job-1");
    expect(result.status).toBe("processing");
    expect(result.attempt_count).toBe(1);
  });
});

