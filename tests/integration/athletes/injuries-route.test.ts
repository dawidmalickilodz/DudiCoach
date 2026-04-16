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

import { GET, POST } from "@/app/api/athletes/[id]/injuries/route";

const COACH_USER = { id: "coach-uuid-001", email: "coach@test.com" };
const ATHLETE_ID = "athlete-uuid-001";
const INJURY = {
  id: "injury-uuid-001",
  athlete_id: ATHLETE_ID,
  name: "Naciągnięcie dwugłowego",
  body_location: "hamstring",
  severity: 3,
  injury_date: "2026-04-16",
  status: "active",
  notes: "Ograniczyć sprinty",
  created_at: "2026-04-16T12:00:00Z",
  updated_at: "2026-04-16T12:00:00Z",
};

function routeContext(id = ATHLETE_ID) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(method: string, body?: unknown): Request {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new Request(`http://localhost/api/athletes/${ATHLETE_ID}/injuries`, init);
}

function makeBuilder(
  resolvedValue: { data: unknown; error: unknown },
) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(resolvedValue),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
}

function setupAuthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: COACH_USER }, error: null });
}

function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

function setupAuthError() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "JWT expired", code: "401" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/athletes/[id]/injuries", () => {
  it("returns 401 when unauthenticated", async () => {
    setupUnauthenticated();

    const response = await GET(
      makeRequest("GET") as Parameters<typeof GET>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Brak autoryzacji.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 401 when auth.getUser fails", async () => {
    setupAuthError();

    const response = await GET(
      makeRequest("GET") as Parameters<typeof GET>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Brak autoryzacji.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 200 + injuries list when authenticated", async () => {
    setupAuthenticated();
    const builder = makeBuilder({ data: [INJURY], error: null });
    mockFrom.mockReturnValue(builder);

    const response = await GET(
      makeRequest("GET") as Parameters<typeof GET>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([INJURY]);
    expect(builder.order).toHaveBeenCalledWith("injury_date", { ascending: false });
  });

  it("returns 500 on Supabase error", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      data: null,
      error: { code: "XX000", message: "query failed" },
    });
    mockFrom.mockReturnValue(builder);

    const response = await GET(
      makeRequest("GET") as Parameters<typeof GET>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Nie udało się pobrać kontuzji.");
  });
});

describe("POST /api/athletes/[id]/injuries", () => {
  it("returns 401 when unauthenticated", async () => {
    setupUnauthenticated();

    const response = await POST(
      makeRequest("POST", { name: "Ur", body_location: "knee", severity: 2, injury_date: "2026-04-16" }) as Parameters<typeof POST>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Brak autoryzacji.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid body", async () => {
    setupAuthenticated();

    const response = await POST(
      makeRequest("POST", { name: "", body_location: "knee", severity: 9, injury_date: "invalid" }) as Parameters<typeof POST>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Validation failed");
    expect(Array.isArray(json.issues)).toBe(true);
  });

  it("returns 201 when injury is created", async () => {
    setupAuthenticated();
    const builder = makeBuilder({ data: INJURY, error: null });
    mockFrom.mockReturnValue(builder);

    const response = await POST(
      makeRequest("POST", {
        name: INJURY.name,
        body_location: INJURY.body_location,
        severity: INJURY.severity,
        injury_date: INJURY.injury_date,
        status: INJURY.status,
        notes: INJURY.notes,
      }) as Parameters<typeof POST>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data).toEqual(INJURY);
  });

  it("returns 500 on Supabase insert error", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      data: null,
      error: { code: "23503", message: "fk violation" },
    });
    mockFrom.mockReturnValue(builder);

    const response = await POST(
      makeRequest("POST", {
        name: "Stłuczenie",
        body_location: "knee",
        severity: 2,
        injury_date: "2026-04-16",
      }) as Parameters<typeof POST>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Nie udało się dodać kontuzji.");
  });
});
