/// <reference types="vitest/globals" />

import { beforeEach, vi } from "vitest";

import { PLAN_JOB_STATUS_SELECT } from "@/lib/api/plan-jobs";

const { mockGetUser, mockFrom } = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  return { mockGetUser, mockFrom };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

import { POST } from "@/app/api/coach/plans/jobs/route";
import { GET } from "@/app/api/coach/plans/jobs/[jobId]/route";

const COACH_USER = { id: "coach-uuid-001", email: "coach@test.com" };
const ATHLETE_ID = "550e8400-e29b-41d4-a716-446655440111";

const ATHLETE = {
  id: ATHLETE_ID,
  name: "US-026 Athlete",
  coach_id: COACH_USER.id,
  age: 22,
  weight_kg: 78,
  height_cm: 180,
  sport: "silownia",
  training_start_date: "2025-01-01",
  training_days_per_week: 4,
  session_minutes: 60,
  current_phase: "building",
  goal: "strength",
  notes: null,
  share_code: "ABC234",
  share_active: false,
  created_at: "2026-04-20T00:00:00.000Z",
  updated_at: "2026-04-20T00:00:00.000Z",
};

const JOB_ROW = {
  id: "job-uuid-001",
  athlete_id: ATHLETE_ID,
  status: "queued",
  attempt_count: 0,
  max_attempts: 3,
  plan_id: null,
  error_code: null,
  error_message: null,
  created_at: "2026-04-28T12:00:00.000Z",
  updated_at: "2026-04-28T12:00:00.000Z",
  completed_at: null,
  failed_at: null,
};

function makeAthletesBuilder(result?: {
  data: unknown;
  error: { code?: string; message?: string } | null;
}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(
      result ?? {
        data: ATHLETE,
        error: null,
      },
    ),
  };
}

function makeInjuriesBuilder(result?: {
  data: unknown;
  error: { code?: string; message?: string } | null;
}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(
      result ?? {
        data: [],
        error: null,
      },
    ),
  };
}

function makeJobsInsertBuilder(result?: {
  data: unknown;
  error: { code?: string; message?: string } | null;
}) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(
      result ?? {
        data: JOB_ROW,
        error: null,
      },
    ),
  };
}

function makeJobsStatusBuilder(result?: {
  data: unknown;
  error: { code?: string; message?: string } | null;
}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(
      result ?? {
        data: JOB_ROW,
        error: null,
      },
    ),
  };
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/coach/plans/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeStatusRequest(jobId: string) {
  return new Request(`http://localhost/api/coach/plans/jobs/${jobId}`, {
    method: "GET",
  });
}

function routeContext(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: COACH_USER }, error: null });
});

describe("POST /api/coach/plans/jobs", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(
      makePostRequest({ athleteId: ATHLETE_ID }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Brak autoryzacji.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 404 when athlete does not exist or is not owned", async () => {
    const athletesBuilder = makeAthletesBuilder({
      data: null,
      error: { code: "PGRST116", message: "No rows found" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "athletes") return athletesBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(
      makePostRequest({ athleteId: ATHLETE_ID }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
  });

  it("returns 422 when athlete is incomplete for generation", async () => {
    const athletesBuilder = makeAthletesBuilder({
      data: { ...ATHLETE, sport: null },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "athletes") return athletesBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(
      makePostRequest({ athleteId: ATHLETE_ID }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(typeof json.error).toBe("string");
  });

  it("returns 409 when an active job already exists", async () => {
    const athletesBuilder = makeAthletesBuilder();
    const injuriesBuilder = makeInjuriesBuilder();
    const jobsBuilder = makeJobsInsertBuilder({
      data: null,
      error: { code: "23505", message: "duplicate key value" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "athletes") return athletesBuilder;
      if (table === "injuries") return injuriesBuilder;
      if (table === "plan_generation_jobs") return jobsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(
      makePostRequest({ athleteId: ATHLETE_ID }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe("Generowanie planu jest już w toku.");
  });

  it("creates queued job with prompt inputs and returns sanitized status row", async () => {
    const athletesBuilder = makeAthletesBuilder();
    const injuriesBuilder = makeInjuriesBuilder({
      data: [
        {
          name: "Naderwanie dwugłowego",
          severity: 4,
          notes: "Unikaj sprintów",
          status: "active",
        },
      ],
      error: null,
    });
    const jobsBuilder = makeJobsInsertBuilder();

    mockFrom.mockImplementation((table: string) => {
      if (table === "athletes") return athletesBuilder;
      if (table === "injuries") return injuriesBuilder;
      if (table === "plan_generation_jobs") return jobsBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(
      makePostRequest({ athleteId: ATHLETE_ID }) as Parameters<typeof POST>[0],
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.id).toBe("job-uuid-001");
    expect(jobsBuilder.select).toHaveBeenCalledWith(PLAN_JOB_STATUS_SELECT);
    expect(jobsBuilder.insert).toHaveBeenCalledTimes(1);

    const insertedPayload = jobsBuilder.insert.mock.calls[0][0] as {
      prompt_inputs: { systemPrompt: string; userPrompt: string };
      coach_id: string;
      athlete_id: string;
    };
    expect(insertedPayload.athlete_id).toBe(ATHLETE_ID);
    expect(insertedPayload.coach_id).toBe(COACH_USER.id);
    expect(insertedPayload.prompt_inputs.systemPrompt.length).toBeGreaterThan(0);
    expect(insertedPayload.prompt_inputs.userPrompt).toContain("Naderwanie dwugłowego");
  });
});

describe("GET /api/coach/plans/jobs/[jobId]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await GET(
      makeStatusRequest("550e8400-e29b-41d4-a716-446655440000") as Parameters<
        typeof GET
      >[0],
      routeContext("550e8400-e29b-41d4-a716-446655440000"),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Brak autoryzacji.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 404 for malformed job id", async () => {
    const response = await GET(
      makeStatusRequest("abc") as Parameters<typeof GET>[0],
      routeContext("abc"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 404 when job is missing or not owned", async () => {
    const jobsStatusBuilder = makeJobsStatusBuilder({
      data: null,
      error: { code: "PGRST116", message: "No rows found" },
    });

    mockFrom.mockReturnValue(jobsStatusBuilder);

    const response = await GET(
      makeStatusRequest("550e8400-e29b-41d4-a716-446655440000") as Parameters<
        typeof GET
      >[0],
      routeContext("550e8400-e29b-41d4-a716-446655440000"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
  });

  it("returns sanitized status projection without private internal fields", async () => {
    const jobsStatusBuilder = makeJobsStatusBuilder();
    mockFrom.mockReturnValue(jobsStatusBuilder);

    const response = await GET(
      makeStatusRequest("550e8400-e29b-41d4-a716-446655440000") as Parameters<
        typeof GET
      >[0],
      routeContext("550e8400-e29b-41d4-a716-446655440000"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(jobsStatusBuilder.select).toHaveBeenCalledWith(PLAN_JOB_STATUS_SELECT);
    expect(json.data.id).toBe("job-uuid-001");
    expect(json.data).not.toHaveProperty("prompt_inputs");
    expect(json.data).not.toHaveProperty("claim_token");
  });

  it("sanitizes technical parse details in failed job status payload", async () => {
    const jobsStatusBuilder = makeJobsStatusBuilder({
      data: {
        ...JOB_ROW,
        status: "failed",
        error_code: "plan_parse_or_validation_failed",
        error_message:
          "Failed to parse JSON from Claude response: Unterminated string at position 15024",
      },
      error: null,
    });
    mockFrom.mockReturnValue(jobsStatusBuilder);

    const response = await GET(
      makeStatusRequest("550e8400-e29b-41d4-a716-446655440000") as Parameters<
        typeof GET
      >[0],
      routeContext("550e8400-e29b-41d4-a716-446655440000"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.error_code).toBe("plan_parse_or_validation_failed");
    expect(json.data.errorCode).toBe("plan_parse_or_validation_failed");
    expect(json.data.error_message).toBe(
      "Nie udało się przetworzyć odpowiedzi AI. Spróbuj ponownie.",
    );
    expect(json.data.errorMessage).toBe(
      "Nie udało się przetworzyć odpowiedzi AI. Spróbuj ponownie.",
    );
    expect(String(json.data.error_message)).not.toContain("position");
    expect(String(json.data.error_message)).not.toContain("Failed to parse JSON");
  });
});
