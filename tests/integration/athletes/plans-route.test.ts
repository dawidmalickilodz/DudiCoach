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
  ANTHROPIC_TIMEOUT_MS: 120_000,
  MODEL: "claude-sonnet-4-6",
  PLAN_MAX_TOKENS: 3000,
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

const PARSED_PLAN = {
  planName: "Plan testowy",
  phase: "bazowy",
};

type InjuriesQueryError = { code?: string; message?: string } | null;
type InjurySeedRow = {
  name: string;
  severity: number;
  notes: string | null;
  status: string;
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

function makeInjuriesSelectBuilder(options?: {
  rows?: InjurySeedRow[];
  error?: InjuriesQueryError;
}) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockImplementation(
      (_column: string, statuses: string[]) => {
        if (options?.error) {
          return Promise.resolve({ data: null, error: options.error });
        }
        const rows = options?.rows ?? [];
        const filtered = rows
          .filter((row) => statuses.includes(row.status))
          .map((row) => ({
            name: row.name,
            severity: row.severity,
            notes: row.notes,
            status: row.status,
          }));
        return Promise.resolve({ data: filtered, error: null });
      },
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockGetUser.mockResolvedValue({ data: { user: COACH_USER }, error: null });
  mockCheckRateLimit.mockReturnValue({ allowed: true });
  mockGeneratePlan.mockResolvedValue("{\"ok\":true}");
  mockParsePlanJson.mockReturnValue(PARSED_PLAN);
  mockFrom.mockImplementation((table: string) => {
    if (table === "athletes") return makeAthleteSelectBuilder();
    if (table === "injuries") return makeInjuriesSelectBuilder();
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

  it("returns 504 for Anthropic timeout errors", async () => {
    const timeoutError = new Error("request timeout");
    Object.setPrototypeOf(
      timeoutError,
      Anthropic.APIConnectionTimeoutError.prototype,
    );
    mockGeneratePlan.mockRejectedValue(timeoutError);

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );
    const json = (await response.json()) as { error: string; details?: string };

    expect(response.status).toBe(504);
    expect(json.error).toBe("Przekroczono czas. Spr\u00f3buj ponownie.");
    expect("details" in json).toBe(false);
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
  it("includes active/healing injuries in generated prompt context", async () => {
    const injuriesBuilder = makeInjuriesSelectBuilder({
      rows: [
        {
          name: "Naderwanie dwuglowego uda",
          severity: 4,
          notes: "Unikaj sprintow",
          status: "active",
        },
        {
          name: "Stluczenie barku",
          severity: 2,
          notes: null,
          status: "healing",
        },
      ],
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "athletes") return makeAthleteSelectBuilder();
      if (table === "injuries") return injuriesBuilder;
      if (table === "training_plans") return makeTrainingPlansInsertBuilder();
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );

    expect(response.status).toBe(201);
    expect(injuriesBuilder.in).toHaveBeenCalledWith("status", [
      "active",
      "healing",
    ]);

    const generationArgs = mockGeneratePlan.mock.calls[0][0] as {
      userPrompt: string;
    };
    expect(generationArgs.userPrompt).toContain("Naderwanie dwuglowego uda");
    expect(generationArgs.userPrompt).toContain("Stluczenie barku");
  });

  it("excludes healed-only injuries from activeInjuries prompt context", async () => {
    const healedInjuryName = "Stara kontuzja kolana";
    const injuriesBuilder = makeInjuriesSelectBuilder({
      rows: [
        {
          name: healedInjuryName,
          severity: 3,
          notes: "W pelni zaleczona",
          status: "healed",
        },
      ],
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "athletes") return makeAthleteSelectBuilder();
      if (table === "injuries") return injuriesBuilder;
      if (table === "training_plans") return makeTrainingPlansInsertBuilder();
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );

    expect(response.status).toBe(201);
    expect(injuriesBuilder.in).toHaveBeenCalledWith("status", [
      "active",
      "healing",
    ]);

    const generationArgs = mockGeneratePlan.mock.calls[0][0] as {
      userPrompt: string;
    };
    expect(generationArgs.userPrompt).toContain("Brak aktywnych kontuzji");
    expect(generationArgs.userPrompt).not.toContain(healedInjuryName);
  });

  it("degrades gracefully when injuries query fails and still generates plan", async () => {
    const injuriesBuilder = makeInjuriesSelectBuilder({
      error: { code: "XX000", message: "injuries read failed" },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockFrom.mockImplementation((table: string) => {
      if (table === "athletes") return makeAthleteSelectBuilder();
      if (table === "injuries") return injuriesBuilder;
      if (table === "training_plans") return makeTrainingPlansInsertBuilder();
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(
      makeRequest() as Parameters<typeof POST>[0],
      routeContext(ATHLETE_ID),
    );

    expect(response.status).toBe(201);
    expect(injuriesBuilder.in).toHaveBeenCalledWith("status", [
      "active",
      "healing",
    ]);
    expect(mockGeneratePlan).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "[POST /plans] Injuries query failed; continuing without injuries context",
      {
        code: "XX000",
        message: "injuries read failed",
      },
    );

    const generationArgs = mockGeneratePlan.mock.calls[0][0] as {
      userPrompt: string;
    };
    expect(generationArgs.userPrompt).toContain("Brak aktywnych kontuzji");

    errorSpy.mockRestore();
  });
});





