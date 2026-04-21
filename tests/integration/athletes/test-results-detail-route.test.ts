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

import { DELETE } from "@/app/api/athletes/[id]/tests/[testId]/route";

const COACH_USER = { id: "coach-uuid-001", email: "coach@test.com" };
const ATHLETE_ID = "athlete-uuid-001";
const TEST_RESULT_ID = "test-result-uuid-001";

function routeContext(id = ATHLETE_ID, testId = TEST_RESULT_ID) {
  return { params: Promise.resolve({ id, testId }) };
}

function makeRequest(method: string): Request {
  return new Request(
    `http://localhost/api/athletes/${ATHLETE_ID}/tests/${TEST_RESULT_ID}`,
    { method },
  );
}

function makeBuilder(
  resolvedValue: { data: unknown; error: unknown; count?: number },
  options: { eqIsTerminal?: boolean } = {},
) {
  const builder = {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn(),
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

describe("DELETE /api/athletes/[id]/tests/[testId]", () => {
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
    const builder = makeBuilder(
      { data: null, error: null, count: 0 },
      { eqIsTerminal: true },
    );
    mockFrom.mockReturnValue(builder);

    const response = await DELETE(
      makeRequest("DELETE") as Parameters<typeof DELETE>[0],
      routeContext(),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Nie znaleziono wyniku testu.");
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
    expect(json.error).toContain("wyniku testu");
    expect(json.details).toBeUndefined();
  });

  it("returns 204 when test result is deleted", async () => {
    setupAuthenticated();
    const builder = makeBuilder(
      { data: null, error: null, count: 1 },
      { eqIsTerminal: true },
    );
    mockFrom.mockReturnValue(builder);

    const response = await DELETE(
      makeRequest("DELETE") as Parameters<typeof DELETE>[0],
      routeContext(),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});
