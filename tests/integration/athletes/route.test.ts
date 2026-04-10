/// <reference types="vitest/globals" />

import { beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock Supabase server client — must be hoisted before any module imports
// ---------------------------------------------------------------------------

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

// Import route handlers AFTER mocks are wired.
import { GET as listAthletes, POST } from "@/app/api/athletes/route";
import {
  GET as getAthlete,
  PATCH,
  DELETE,
} from "@/app/api/athletes/[id]/route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COACH_USER = { id: "coach-uuid-001", email: "coach@test.com" };

const mockAthlete = {
  id: "athlete-uuid-001",
  coach_id: COACH_USER.id,
  name: "Jan Kowalski",
  age: 25,
  weight_kg: 75.0,
  height_cm: 180.0,
  sport: "Pływanie",
  training_start_date: "2024-01-01",
  training_days_per_week: 5,
  session_minutes: 90,
  current_phase: "base",
  goal: "Wydolność",
  notes: null,
  share_code: "ABC123",
  created_at: "2026-04-10T10:00:00Z",
  updated_at: "2026-04-10T12:00:00Z",
};

const mockAthlete2 = { ...mockAthlete, id: "athlete-uuid-002", name: "Anna Nowak" };
const mockAthlete3 = { ...mockAthlete, id: "athlete-uuid-003", name: "Piotr Wiśniewski" };

// ---------------------------------------------------------------------------
// Helper: build a Supabase chainable query builder mock
//
// Chain patterns in production code:
//   POST:   from().insert().select().single()           → single() is terminal
//   GET list: from().select().order()                   → order() is terminal
//   GET single: from().select().eq().single()           → single() is terminal
//   PATCH:  from().update().eq().select().single()      → single() is terminal
//   DELETE: from().delete({count}).eq()                 → eq() is terminal
//
// Strategy: ALL intermediate methods return `this` (chainable).
// Terminal methods (single, order, eq) return a Promise.
// Because eq() is terminal for DELETE but intermediate for GET/PATCH, we use
// a flag to toggle its behaviour per builder instance.
// ---------------------------------------------------------------------------

function makeBuilder(
  resolvedValue: { data: unknown; error: unknown; count?: number },
  options: { eqIsTerminal?: boolean } = {},
) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(),
    single: vi.fn(),
  };

  // single() — always terminal (resolves the promise)
  builder["single"].mockResolvedValue(resolvedValue);

  // order() — terminal for GET list
  builder["order"].mockResolvedValue(resolvedValue);

  if (options.eqIsTerminal) {
    // DELETE: from().delete({count}).eq() resolves directly
    builder["eq"].mockResolvedValue(resolvedValue);
  }

  return builder;
}

// ---------------------------------------------------------------------------
// Helper: create a Request
// ---------------------------------------------------------------------------

function makeRequest(
  url: string,
  method: string,
  body?: unknown,
): Request {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new Request(url, init);
}

// ---------------------------------------------------------------------------
// Route params helper (Next.js 16 async params)
// ---------------------------------------------------------------------------

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// Unauthenticated helper
// ---------------------------------------------------------------------------

function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

function setupAuthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: COACH_USER }, error: null });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// POST /api/athletes
// ============================================================

describe("POST /api/athletes", () => {
  it("authenticated + valid body → 201 + athlete in response", async () => {
    setupAuthenticated();
    const builder = makeBuilder({ data: mockAthlete, error: null });
    mockFrom.mockReturnValue(builder);

    const req = makeRequest("http://localhost/api/athletes", "POST", {
      name: "Jan Kowalski",
    });
    const response = await POST(req as Parameters<typeof POST>[0]);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data).toEqual(mockAthlete);
    expect(mockFrom).toHaveBeenCalledWith("athletes");
  });

  it("authenticated + missing name → 400 validation error", async () => {
    setupAuthenticated();

    const req = makeRequest("http://localhost/api/athletes", "POST", {
      age: 25,
    });
    const response = await POST(req as Parameters<typeof POST>[0]);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Validation failed");
    expect(Array.isArray(json.details)).toBe(true);
    expect(json.details.length).toBeGreaterThan(0);
  });

  it("authenticated + invalid body (age: -5) → 400 + validation details", async () => {
    setupAuthenticated();

    const req = makeRequest("http://localhost/api/athletes", "POST", {
      name: "Jan",
      age: -5,
    });
    const response = await POST(req as Parameters<typeof POST>[0]);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Validation failed");
    const ageIssue = json.details.find(
      (d: { path: string[] }) => d.path[0] === "age",
    );
    expect(ageIssue).toBeDefined();
  });

  it("unauthenticated → 401", async () => {
    setupUnauthenticated();

    const req = makeRequest("http://localhost/api/athletes", "POST", {
      name: "Jan Kowalski",
    });
    const response = await POST(req as Parameters<typeof POST>[0]);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    // Supabase from() should never be called
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("Supabase error → 500", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      data: null,
      error: { message: "DB error", code: "PGRST001", hint: "" },
    });
    mockFrom.mockReturnValue(builder);

    const req = makeRequest("http://localhost/api/athletes", "POST", {
      name: "Jan Kowalski",
    });
    const response = await POST(req as Parameters<typeof POST>[0]);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });
});

// ============================================================
// GET /api/athletes (list)
// ============================================================

describe("GET /api/athletes", () => {
  it("authenticated + athletes in DB → 200 + array sorted by updated_at DESC", async () => {
    setupAuthenticated();
    const athletes = [mockAthlete, mockAthlete2, mockAthlete3];
    const builder = makeBuilder({ data: athletes, error: null });
    mockFrom.mockReturnValue(builder);

    makeRequest("http://localhost/api/athletes", "GET");
    const response = await listAthletes();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data).toHaveLength(3);
    // Verify the order() call was made with updated_at DESC
    expect(builder["order"]).toHaveBeenCalledWith("updated_at", { ascending: false });
  });

  it("authenticated + empty DB → 200 + empty array", async () => {
    setupAuthenticated();
    const builder = makeBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    const response = await listAthletes();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([]);
  });

  it("unauthenticated → 401", async () => {
    setupUnauthenticated();

    const response = await listAthletes();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ============================================================
// GET /api/athletes/[id]
// ============================================================

describe("GET /api/athletes/[id]", () => {
  it("authenticated + existing athlete → 200 + athlete", async () => {
    setupAuthenticated();
    const builder = makeBuilder({ data: mockAthlete, error: null });
    mockFrom.mockReturnValue(builder);

    const req = makeRequest(
      "http://localhost/api/athletes/athlete-uuid-001",
      "GET",
    );
    const response = await getAthlete(
      req as Parameters<typeof getAthlete>[0],
      routeContext("athlete-uuid-001"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(mockAthlete);
  });

  it("authenticated + non-existent ID → 404", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      data: null,
      error: { message: "No rows", code: "PGRST116", hint: "" },
    });
    mockFrom.mockReturnValue(builder);

    const req = makeRequest(
      "http://localhost/api/athletes/nonexistent-id",
      "GET",
    );
    const response = await getAthlete(
      req as Parameters<typeof getAthlete>[0],
      routeContext("nonexistent-id"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
  });

  it("unauthenticated → 401", async () => {
    setupUnauthenticated();

    const req = makeRequest(
      "http://localhost/api/athletes/athlete-uuid-001",
      "GET",
    );
    const response = await getAthlete(
      req as Parameters<typeof getAthlete>[0],
      routeContext("athlete-uuid-001"),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ============================================================
// PATCH /api/athletes/[id]
// ============================================================

describe("PATCH /api/athletes/[id]", () => {
  it("authenticated + valid partial body → 200 + updated athlete", async () => {
    setupAuthenticated();
    const updatedAthlete = { ...mockAthlete, weight_kg: 78.0 };
    const builder = makeBuilder({ data: updatedAthlete, error: null });
    mockFrom.mockReturnValue(builder);

    const req = makeRequest(
      "http://localhost/api/athletes/athlete-uuid-001",
      "PATCH",
      { weight_kg: 78 },
    );
    const response = await PATCH(
      req as Parameters<typeof PATCH>[0],
      routeContext("athlete-uuid-001"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.weight_kg).toBe(78.0);
  });

  it("authenticated + invalid body (age: -1) → 400 validation error", async () => {
    setupAuthenticated();

    const req = makeRequest(
      "http://localhost/api/athletes/athlete-uuid-001",
      "PATCH",
      { age: -1 },
    );
    const response = await PATCH(
      req as Parameters<typeof PATCH>[0],
      routeContext("athlete-uuid-001"),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Validation failed");
    expect(Array.isArray(json.details)).toBe(true);
  });

  it("authenticated + non-existent ID → 404", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      data: null,
      error: { message: "No rows", code: "PGRST116", hint: "" },
    });
    mockFrom.mockReturnValue(builder);

    const req = makeRequest(
      "http://localhost/api/athletes/nonexistent-id",
      "PATCH",
      { weight_kg: 78 },
    );
    const response = await PATCH(
      req as Parameters<typeof PATCH>[0],
      routeContext("nonexistent-id"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
  });

  it("unauthenticated → 401", async () => {
    setupUnauthenticated();

    const req = makeRequest(
      "http://localhost/api/athletes/athlete-uuid-001",
      "PATCH",
      { weight_kg: 78 },
    );
    const response = await PATCH(
      req as Parameters<typeof PATCH>[0],
      routeContext("athlete-uuid-001"),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

// ============================================================
// DELETE /api/athletes/[id]
// ============================================================

describe("DELETE /api/athletes/[id]", () => {
  it("authenticated + existing athlete → 204 no body", async () => {
    setupAuthenticated();
    // DELETE uses .delete({ count: 'exact' }).eq(id) — eq() is terminal
    const builder = makeBuilder({ data: null, error: null, count: 1 }, { eqIsTerminal: true });
    mockFrom.mockReturnValue(builder);

    const req = makeRequest(
      "http://localhost/api/athletes/athlete-uuid-001",
      "DELETE",
    );
    const response = await DELETE(
      req as Parameters<typeof DELETE>[0],
      routeContext("athlete-uuid-001"),
    );

    expect(response.status).toBe(204);
    // 204 has no body
    const text = await response.text();
    expect(text).toBe("");
  });

  it("authenticated + non-existent ID → 404 (count === 0)", async () => {
    setupAuthenticated();
    const builder = makeBuilder({ data: null, error: null, count: 0 }, { eqIsTerminal: true });
    mockFrom.mockReturnValue(builder);

    const req = makeRequest(
      "http://localhost/api/athletes/nonexistent-id",
      "DELETE",
    );
    const response = await DELETE(
      req as Parameters<typeof DELETE>[0],
      routeContext("nonexistent-id"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
  });

  it("unauthenticated → 401", async () => {
    setupUnauthenticated();

    const req = makeRequest(
      "http://localhost/api/athletes/athlete-uuid-001",
      "DELETE",
    );
    const response = await DELETE(
      req as Parameters<typeof DELETE>[0],
      routeContext("athlete-uuid-001"),
    );
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
