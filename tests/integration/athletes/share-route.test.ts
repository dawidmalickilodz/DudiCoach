/// <reference types="vitest/globals" />

import { beforeEach, vi } from "vitest";

const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => {
  const mockGetUser = vi.fn();
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();
  return { mockGetUser, mockFrom, mockRpc };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

import { POST } from "@/app/api/athletes/[id]/share/route";

const COACH_USER = { id: "coach-uuid-001", email: "coach@test.com" };

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/athletes/athlete-1/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeShareUpdateBuilder(resolved: { data: unknown; error: unknown }) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolved),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: COACH_USER }, error: null });
  mockRpc.mockResolvedValue({ data: null, error: null });
});

describe("POST /api/athletes/[id]/share (activate/deactivate)", () => {
  it("returns 404 for not-found Supabase error (PGRST116)", async () => {
    const builder = makeShareUpdateBuilder({
      data: null,
      error: { code: "PGRST116", message: "No rows", hint: "" },
    });
    mockFrom.mockReturnValue(builder);

    const response = await POST(
      makeRequest({ action: "activate" }) as Parameters<typeof POST>[0],
      routeContext("athlete-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
  });

  it("returns 500 for unexpected Supabase errors", async () => {
    const builder = makeShareUpdateBuilder({
      data: null,
      error: { code: "XX000", message: "write failed", hint: "" },
    });
    mockFrom.mockReturnValue(builder);

    const response = await POST(
      makeRequest({ action: "deactivate" }) as Parameters<typeof POST>[0],
      routeContext("athlete-1"),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });
});

