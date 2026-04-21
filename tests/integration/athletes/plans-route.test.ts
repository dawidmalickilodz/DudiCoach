/// <reference types="vitest/globals" />

import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, vi } from "vitest";

const {
  mockGetUser,
  mockFrom,
  mockCheckRateLimit,
  mockGeneratePlan,
  mockParsePlanJson,
} = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockCheckRateLimit = vi.fn();
  const mockGeneratePlan = vi.fn();
  const mockParsePlanJson = vi.fn();
  return {
    mockGetUser,
    mockFrom,
    mockCheckRateLimit,
    mockGeneratePlan,
    mockParsePlanJson,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/ai/rate-limiter", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock("@/lib/ai/client", () => ({
  generatePlan: (...args: unknown[]) => mockGeneratePlan(...args),
}));

vi.mock("@/lib/ai/parse-plan-json", () => ({
  parsePlanJson: (...args: unknown[]) => mockParsePlanJson(...args),
}));

import { POST } from "@/app/api/athletes/[id]/plans/route";

const COACH_USER = { id: "coach-uuid-001", email: "coach@test.com" };
const ATHLETE_ID = "athlete-uuid-001";
const ATHLETE = {
  id: ATHLETE_ID,
  name: "Jan Kowalski",
  sport: "Siłownia",
  training_days_per_week: 4,
  training_start_date: "2025-01-01",
};

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(): Request {
  return new Request(`http://localhost/api/athletes/${ATHLETE_ID}/plans`, {
    method: "POST",
  });
}

function makeAthleteSelectBuilder() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: ATHLETE, error: null }),
  };
}

function makeTrainingPlansInsertBuilder() {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: {
        id: "plan-1",
        athlete_id: ATHLETE_ID,
      },
      error: null,
    }),
  };
}

type InjuryRow = { name: string; severity: number; notes: string | null };

/**
 * Default injuries mock: returns the given rows (empty by default) with no error.
 * Chain: .select().eq().in() → resolves.
 */
function makeInjuriesSelectBuilder(rows: InjuryRow[] = []) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
}

/** Simulates a Supabase error on the injuries query. */
function makeInjuriesSelectBuilderWithError() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST000", message: "connection error" },
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockGetUser.mockResolvedValue({ data: { user: COACH_USER }, error: null });
  mockCheckRateLimit.mockReturnValue({ allowed: true });
  mockFrom.mockImplementation((table: string) => {
    if (table === "athletes") return makeAthleteSelectBuilder();
    if (table === "injuries") return makeInjuriesSelectBuilder(); // default: empty
    if (table === "training_plans") return makeTrainingPlansInsertBuilder();
    throw new Error(`Unexpected table: ${table}`);
  });
});

describe("POST /api/athletes/[id]/plans", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );
    const json = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(json.error).toBe("Brak autoryzacji.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 401 when auth.getUser fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "JWT expired", code: "401" },
    });

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );
    const json = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(json.error).toBe("Brak autoryzacji.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 500 without details for Anthropic API errors", async () => {
    const anthropicApiError = new Error("provider blew up");
    Object.setPrototypeOf(anthropicApiError, Anthropic.APIError.prototype);
    (anthropicApiError as Error & { status: number }).status = 500;
    mockGeneratePlan.mockRejectedValue(anthropicApiError);

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );
    const json = (await response.json()) as { error: string; details?: string };

    expect(response.status).toBe(500);
    expect(json.error).toBe("Nie udało się wygenerować planu.");
    expect("details" in json).toBe(false);
  });

  it("returns 500 without details for unexpected generation errors", async () => {
    mockGeneratePlan.mockRejectedValue(new Error("network down"));

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );
    const json = (await response.json()) as { error: string; details?: string };

    expect(response.status).toBe(500);
    expect(json.error).toBe("Nie udało się wygenerować planu.");
    expect("details" in json).toBe(false);
  });

  it("returns 500 without details for parse/validation failures", async () => {
    mockGeneratePlan.mockResolvedValue("{ not-json }");
    mockParsePlanJson.mockImplementation(() => {
      throw new Error("invalid JSON");
    });

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );
    const json = (await response.json()) as { error: string; details?: string };

    expect(response.status).toBe(500);
    expect(json.error).toBe("Nie udało się wygenerować planu.");
    expect("details" in json).toBe(false);
  });
});

describe("POST /api/athletes/[id]/plans — injuries context", () => {
  const PLAN_STUB = { planName: "Plan testowy", phase: "base" };

  it("includes active and healing injury names in the prompt passed to Claude", async () => {
    const injuries: InjuryRow[] = [
      { name: "Skrecenie kolana lewego", severity: 3, notes: "Bol przy przysiadzie" },
      { name: "Naderwanie rotatora", severity: 2, notes: null },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "athletes") return makeAthleteSelectBuilder();
      if (table === "injuries") return makeInjuriesSelectBuilder(injuries);
      if (table === "training_plans") return makeTrainingPlansInsertBuilder();
      throw new Error(`Unexpected table: ${table}`);
    });

    let capturedUserPrompt: string | undefined;
    mockGeneratePlan.mockImplementation(
      ({ userPrompt }: { systemPrompt: string; userPrompt: string }) => {
        capturedUserPrompt = userPrompt;
        return Promise.resolve("{}");
      },
    );
    mockParsePlanJson.mockReturnValue(PLAN_STUB);

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );

    expect(response.status).toBe(201);
    expect(capturedUserPrompt).toContain("Skrecenie kolana lewego");
    expect(capturedUserPrompt).toContain("Naderwanie rotatora");
    // Severity is mapped to string and included in the prompt line.
    expect(capturedUserPrompt).toContain("3");
  });

  it("shows 'Brak aktywnych kontuzji' in the prompt when injury list is empty", async () => {
    // beforeEach default already returns empty injuries — no override needed.
    let capturedUserPrompt: string | undefined;
    mockGeneratePlan.mockImplementation(
      ({ userPrompt }: { systemPrompt: string; userPrompt: string }) => {
        capturedUserPrompt = userPrompt;
        return Promise.resolve("{}");
      },
    );
    mockParsePlanJson.mockReturnValue(PLAN_STUB);

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );

    expect(response.status).toBe(201);
    expect(capturedUserPrompt).toContain("Brak aktywnych kontuzji");
  });

  it("returns 201 and proceeds with empty injury context when the injuries query fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "athletes") return makeAthleteSelectBuilder();
      if (table === "injuries") return makeInjuriesSelectBuilderWithError();
      if (table === "training_plans") return makeTrainingPlansInsertBuilder();
      throw new Error(`Unexpected table: ${table}`);
    });

    mockGeneratePlan.mockResolvedValue("{}");
    mockParsePlanJson.mockReturnValue(PLAN_STUB);

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );

    expect(response.status).toBe(201);
  });
});
