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

import { GET, POST } from "@/app/api/athletes/[id]/tests/route";

const COACH_USER = { id: "coach-uuid-001", email: "coach@test.com" };
const ATHLETE_ID = "athlete-uuid-001";

const TEST_RESULT = {
  id: "test-result-uuid-001",
  athlete_id: ATHLETE_ID,
  test_key: "sprint_30m",
  value: 4.35,
  test_date: "2026-04-20",
  notes: "Wynik po rozgrzewce",
  created_at: "2026-04-20T10:00:00Z",
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
  return new Request(`http://localhost/api/athletes/${ATHLETE_ID}/tests`, init);
}

function makeBuilder(options?: {
  singleSequence?: Array<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;
  singleDefault?: {
    data: unknown;
    error: { code?: string; message?: string } | null;
  };
  orderResult?: {
    data: unknown;
    error: { code?: string; message?: string } | null;
  };
}) {
  const single = vi.fn();
  for (const result of options?.singleSequence ?? []) {
    single.mockResolvedValueOnce(result);
  }
  single.mockResolvedValue(
    options?.singleDefault ?? {
      data: { id: ATHLETE_ID, sport: "pilka_nozna" },
      error: null,
    },
  );

  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(options?.orderResult ?? { data: [], error: null }),
    insert: vi.fn().mockReturnThis(),
    single,
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
    error: { code: "401", message: "JWT expired" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/athletes/[id]/tests", () => {
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

  it("returns 404 when athlete does not exist or is not owned", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      singleSequence: [
        {
          data: null,
          error: { code: "PGRST116", message: "No rows" },
        },
      ],
    });
    mockFrom.mockReturnValue(builder);

    const response = await GET(
      makeRequest("GET") as Parameters<typeof GET>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Nie znaleziono zawodnika.");
  });

  it("returns 500 without details when athlete pre-check fails unexpectedly", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      singleSequence: [
        {
          data: null,
          error: { code: "XX000", message: "query failed" },
        },
      ],
    });
    mockFrom.mockReturnValue(builder);

    const response = await GET(
      makeRequest("GET") as Parameters<typeof GET>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(typeof json.error).toBe("string");
    expect(json.error).toContain("testow");
    expect(json.details).toBeUndefined();
  });

  it("returns 200 + test results when athlete exists", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      singleSequence: [{ data: { id: ATHLETE_ID, sport: "pilka_nozna" }, error: null }],
      orderResult: { data: [TEST_RESULT], error: null },
    });
    mockFrom.mockReturnValue(builder);

    const response = await GET(
      makeRequest("GET") as Parameters<typeof GET>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([TEST_RESULT]);
    expect(builder.order).toHaveBeenCalledWith("test_date", { ascending: false });
  });

  it("returns 500 without details on tests query failure", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      singleSequence: [{ data: { id: ATHLETE_ID, sport: "pilka_nozna" }, error: null }],
      orderResult: {
        data: null,
        error: { code: "XX000", message: "query failed" },
      },
    });
    mockFrom.mockReturnValue(builder);

    const response = await GET(
      makeRequest("GET") as Parameters<typeof GET>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(typeof json.error).toBe("string");
    expect(json.error).toContain("testow");
    expect(json.details).toBeUndefined();
  });
});

describe("POST /api/athletes/[id]/tests", () => {
  it("returns 401 when unauthenticated", async () => {
    setupUnauthenticated();

    const response = await POST(
      makeRequest("POST", {
        test_key: "sprint_30m",
        value: 4.35,
      }) as Parameters<typeof POST>[0],
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
      makeRequest("POST", {
        test_key: "unknown_test",
        value: -10,
        test_date: "20-04-2026",
      }) as Parameters<typeof POST>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Validation failed");
    expect(Array.isArray(json.issues)).toBe(true);
  });

  it("returns 404 when athlete does not exist or is not owned", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      singleSequence: [
        {
          data: null,
          error: { code: "PGRST116", message: "No rows" },
        },
      ],
    });
    mockFrom.mockReturnValue(builder);

    const response = await POST(
      makeRequest("POST", {
        test_key: "sprint_30m",
        value: 4.35,
      }) as Parameters<typeof POST>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Nie znaleziono zawodnika.");
  });

  it("returns 400 when selected test does not match athlete sport", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      singleSequence: [{ data: { id: ATHLETE_ID, sport: "pilka_nozna" }, error: null }],
    });
    mockFrom.mockReturnValue(builder);

    const response = await POST(
      makeRequest("POST", {
        test_key: "swim_50m",
        value: 31.2,
      }) as Parameters<typeof POST>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Validation failed");
    expect(Array.isArray(json.issues)).toBe(true);
    expect(json.issues[0].path).toEqual(["test_key"]);
  });

  it("returns 201 when test result is created", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      singleSequence: [
        { data: { id: ATHLETE_ID, sport: "pilka_nozna" }, error: null },
        { data: TEST_RESULT, error: null },
      ],
    });
    mockFrom.mockReturnValue(builder);

    const response = await POST(
      makeRequest("POST", {
        test_key: TEST_RESULT.test_key,
        value: TEST_RESULT.value,
        test_date: TEST_RESULT.test_date,
        notes: TEST_RESULT.notes,
      }) as Parameters<typeof POST>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data).toEqual(TEST_RESULT);
  });

  it("returns 404 for FK violation (athlete disappeared between checks)", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      singleSequence: [
        { data: { id: ATHLETE_ID, sport: "pilka_nozna" }, error: null },
        { data: null, error: { code: "23503", message: "fk violation" } },
      ],
    });
    mockFrom.mockReturnValue(builder);

    const response = await POST(
      makeRequest("POST", {
        test_key: "sprint_30m",
        value: 4.2,
      }) as Parameters<typeof POST>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Nie znaleziono zawodnika.");
  });

  it("returns 500 without details on unexpected Supabase insert error", async () => {
    setupAuthenticated();
    const builder = makeBuilder({
      singleSequence: [
        { data: { id: ATHLETE_ID, sport: "pilka_nozna" }, error: null },
        { data: null, error: { code: "XX000", message: "write failed" } },
      ],
    });
    mockFrom.mockReturnValue(builder);

    const response = await POST(
      makeRequest("POST", {
        test_key: "sprint_30m",
        value: 4.2,
      }) as Parameters<typeof POST>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(typeof json.error).toBe("string");
    expect(json.error).toContain("wyniku testu");
    expect(json.details).toBeUndefined();
  });
});
