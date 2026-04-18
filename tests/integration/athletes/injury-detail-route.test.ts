/// <reference types="vitest/globals" />

import { beforeEach, vi } from "vitest";

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

import { DELETE, PATCH } from "@/app/api/athletes/[id]/injuries/[injuryId]/route";

const COACH_USER = { id: "coach-uuid-001", email: "coach@test.com" };
const ATHLETE_ID = "athlete-uuid-001";
const INJURY_ID = "injury-uuid-001";
const INJURY = {
  id: INJURY_ID,
  athlete_id: ATHLETE_ID,
  name: "Naciągnięcie dwugłowego",
  body_location: "hamstring",
  severity: 2,
  injury_date: "2026-04-16",
  status: "healing",
  notes: "Kontrola za 7 dni",
  created_at: "2026-04-16T12:00:00Z",
  updated_at: "2026-04-16T12:30:00Z",
};

function routeContext(id = ATHLETE_ID, injuryId = INJURY_ID) {
  return { params: Promise.resolve({ id, injuryId }) };
}

function makeRequest(method: string, body?: unknown): Request {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new Request(
    `http://localhost/api/athletes/${ATHLETE_ID}/injuries/${INJURY_ID}`,
    init,
  );
}

function makeBuilder(
  resolvedValue: { data: unknown; error: unknown; count?: number },
  options: { eqIsTerminal?: boolean } = {},
) {
  const builder = {
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };

  if (options.eqIsTerminal) {
    builder.eq
      .mockImplementationOnce(() => builder)
      .mockImplementationOnce(async () => resolvedValue);
  } else {
    builder.eq.mockReturnThis();
  }

  return builder;
}

function setupAuthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: COACH_USER }, error: null });
}

function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/athletes/[id]/injuries/[injuryId]", () => {
  it("returns 401 when unauthenticated", async () => {
    setupUnauthenticated();

    const response = await PATCH(
      makeRequest("PATCH", { severity: 2 }) as Parameters<typeof PATCH>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Brak autoryzacji.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid body", async () => {
    setupAuthenticated();

    const response = await PATCH(
      makeRequest("PATCH", { severity: 99 }) as Parameters<typeof PATCH>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Validation failed");
    expect(Array.isArray(json.issues)).toBe(true);
  });

  it("returns 404 when injury does not exist", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });
    mockFrom.mockReturnValue(builder);

    const response = await PATCH(
      makeRequest("PATCH", { severity: 2 }) as Parameters<typeof PATCH>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Nie znaleziono kontuzji.");
  });

  it("returns 500 without details on unexpected Supabase error", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      data: null,
      error: { code: "XX000", message: "write failed" },
    });
    mockFrom.mockReturnValue(builder);

    const response = await PATCH(
      makeRequest("PATCH", { severity: 2 }) as Parameters<typeof PATCH>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(typeof json.error).toBe("string");
    expect(json.error).toContain("kontuzji");
    expect(json.details).toBeUndefined();
  });

  it("returns 200 with updated injury", async () => {
    setupAuthenticated();
    const builder = makeBuilder({ data: INJURY, error: null });
    mockFrom.mockReturnValue(builder);

    const response = await PATCH(
      makeRequest("PATCH", { severity: 2 }) as Parameters<typeof PATCH>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(INJURY);
  });
});

describe("DELETE /api/athletes/[id]/injuries/[injuryId]", () => {
  it("returns 401 when unauthenticated", async () => {
    setupUnauthenticated();

    const response = await DELETE(
      makeRequest("DELETE") as Parameters<typeof DELETE>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Brak autoryzacji.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 404 when no rows were deleted", async () => {
    setupAuthenticated();
    const builder = makeBuilder({ data: null, error: null, count: 0 }, { eqIsTerminal: true });
    mockFrom.mockReturnValue(builder);

    const response = await DELETE(
      makeRequest("DELETE") as Parameters<typeof DELETE>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Nie znaleziono kontuzji.");
  });

  it("returns 500 without details on Supabase delete error", async () => {
    setupAuthenticated();
    const builder = makeBuilder(
      {
        data: null,
        error: { code: "XX000", message: "delete failed" },
        count: 0,
      },
      { eqIsTerminal: true },
    );
    mockFrom.mockReturnValue(builder);

    const response = await DELETE(
      makeRequest("DELETE") as Parameters<typeof DELETE>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(typeof json.error).toBe("string");
    expect(json.error).toContain("kontuzji");
    expect(json.details).toBeUndefined();
  });

  it("returns 204 when injury is deleted", async () => {
    setupAuthenticated();
    const builder = makeBuilder({ data: null, error: null, count: 1 }, { eqIsTerminal: true });
    mockFrom.mockReturnValue(builder);

    const response = await DELETE(
      makeRequest("DELETE") as Parameters<typeof DELETE>[0],
      routeContext(),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});
