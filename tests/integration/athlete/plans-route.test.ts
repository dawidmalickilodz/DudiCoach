/// <reference types="vitest/globals" />

import { beforeEach, vi } from "vitest";

const { mockRpc } = vi.hoisted(() => {
  const mockRpc = vi.fn();
  return { mockRpc };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    rpc: mockRpc,
  })),
}));

import { GET } from "@/app/api/athlete/[shareCode]/plans/route";

type RpcError = { code?: string; message?: string } | null;

function routeContext(shareCode: string) {
  return { params: Promise.resolve({ shareCode }) };
}

function makePlanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    plan_name: "Program silowy 4-tyg.",
    phase: "Bazowy",
    plan_json: {
      planName: "Program silowy 4-tyg.",
      phase: "Bazowy",
      summary: "Ogolny plan silowy",
      weeklyOverview: "4 treningi tygodniowo",
      weeks: [],
      progressionNotes: "Zwieszaj ciezar co tydzien",
      nutritionTips: "Jedz duzo bialka",
      recoveryProtocol: "Spij 8 godzin",
    },
    created_at: "2026-04-24T12:00:00.000Z",
    ...overrides,
  };
}

function setupRpc(options?: {
  profileData?: unknown[] | null;
  profileError?: RpcError;
  plansData?: unknown[] | null;
  plansError?: RpcError;
}) {
  const profileData = options?.profileData ?? [{ id: "athlete-uuid-001" }];
  const profileError = options?.profileError ?? null;
  const plansData = options?.plansData ?? [];
  const plansError = options?.plansError ?? null;

  mockRpc.mockImplementation((fn: string) => {
    if (fn === "get_athlete_by_share_code") {
      return Promise.resolve({ data: profileData, error: profileError });
    }
    if (fn === "get_latest_plan_by_share_code") {
      return Promise.resolve({ data: plansData, error: plansError });
    }
    throw new Error(`Unexpected rpc: ${fn}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupRpc();
});

describe("GET /api/athlete/[shareCode]/plans (public endpoint)", () => {
  it("returns 404 for invalid share code format (too short)", async () => {
    const response = await GET(
      new Request("http://localhost/api/athlete/abc/plans") as Parameters<typeof GET>[0],
      routeContext("abc"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 404 for share code with forbidden characters (contains 0, 1, I)", async () => {
    const response = await GET(
      new Request("http://localhost/api/athlete/ABC01I/plans") as Parameters<typeof GET>[0],
      routeContext("ABC01I"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 404 for nonexistent share code", async () => {
    setupRpc({ profileData: [] });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234/plans") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_athlete_by_share_code", {
      p_code: "ABC234",
    });
  });

  it("returns 404 for inactive share code", async () => {
    // Inactivity is represented by profile RPC returning no rows.
    setupRpc({ profileData: [] });

    const response = await GET(
      new Request("http://localhost/api/athlete/DEF234/plans") as Parameters<typeof GET>[0],
      routeContext("DEF234"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_athlete_by_share_code", {
      p_code: "DEF234",
    });
  });

  it("returns 200 with { data: null } when code is valid+active but athlete has no plan", async () => {
    setupRpc({
      profileData: [{ id: "athlete-uuid-001" }],
      plansData: [],
    });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234/plans") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toBeNull();
    expect(mockRpc).toHaveBeenNthCalledWith(1, "get_athlete_by_share_code", {
      p_code: "ABC234",
    });
    expect(mockRpc).toHaveBeenNthCalledWith(2, "get_latest_plan_by_share_code", {
      p_code: "ABC234",
    });
  });

  it("returns 200 with public-safe plan shape and excludes athlete_id/coach_id", async () => {
    setupRpc({
      plansData: [
        makePlanRow({
          athlete_id: "athlete-uuid-001",
          coach_id: "coach-uuid-001",
          internal_flag: true,
        }),
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234/plans") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(json.data.plan_name).toBe("Program silowy 4-tyg.");
    expect(json.data.phase).toBe("Bazowy");
    expect(json.data.plan_json).toBeDefined();
    expect(json.data.created_at).toBe("2026-04-24T12:00:00.000Z");
    expect(json.data).not.toHaveProperty("athlete_id");
    expect(json.data).not.toHaveProperty("coach_id");
    expect(json.data).not.toHaveProperty("internal_flag");
  });

  it("returns the latest plan row (first RPC row, ordered DESC in DB)", async () => {
    const newest = makePlanRow({
      id: "newest-plan-id",
      plan_name: "Najnowszy plan",
      created_at: "2026-04-25T10:00:00.000Z",
    });
    const older = makePlanRow({
      id: "older-plan-id",
      plan_name: "Starszy plan",
      created_at: "2026-04-20T10:00:00.000Z",
    });

    setupRpc({ plansData: [newest, older] });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234/plans") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.id).toBe("newest-plan-id");
    expect(json.data.plan_name).toBe("Najnowszy plan");
  });

  it("returns 500 when profile RPC returns an error", async () => {
    setupRpc({
      profileError: { code: "XX000", message: "profile rpc failure" },
    });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234/plans") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });

  it("returns 500 when latest-plan RPC returns an error", async () => {
    setupRpc({
      plansError: { code: "XX000", message: "plans rpc failure" },
    });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234/plans") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });

  it("normalizes lowercase share code to uppercase before RPC calls", async () => {
    setupRpc({ plansData: [] });

    const response = await GET(
      new Request("http://localhost/api/athlete/abc234/plans") as Parameters<typeof GET>[0],
      routeContext("abc234"),
    );

    expect(response.status).toBe(200);
    expect(mockRpc).toHaveBeenNthCalledWith(1, "get_athlete_by_share_code", {
      p_code: "ABC234",
    });
    expect(mockRpc).toHaveBeenNthCalledWith(2, "get_latest_plan_by_share_code", {
      p_code: "ABC234",
    });
  });

  it("returns different plans for different share codes (cross-athlete isolation)", async () => {
    mockRpc.mockImplementation((fn: string, args: { p_code: string }) => {
      if (fn === "get_athlete_by_share_code") {
        if (args.p_code === "AAA234") {
          return Promise.resolve({ data: [{ id: "athlete-a" }], error: null });
        }
        if (args.p_code === "BBB234") {
          return Promise.resolve({ data: [{ id: "athlete-b" }], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      }

      if (fn === "get_latest_plan_by_share_code") {
        if (args.p_code === "AAA234") {
          return Promise.resolve({
            data: [makePlanRow({ id: "plan-id-aaa", plan_name: "Program zawodnika A" })],
            error: null,
          });
        }
        if (args.p_code === "BBB234") {
          return Promise.resolve({
            data: [makePlanRow({ id: "plan-id-bbb", plan_name: "Program zawodnika B" })],
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      }

      throw new Error(`Unexpected rpc: ${fn}`);
    });

    const responseA = await GET(
      new Request("http://localhost/api/athlete/AAA234/plans") as Parameters<typeof GET>[0],
      routeContext("AAA234"),
    );
    const jsonA = await responseA.json();
    expect(jsonA.data.id).toBe("plan-id-aaa");
    expect(jsonA.data.plan_name).toBe("Program zawodnika A");

    const responseB = await GET(
      new Request("http://localhost/api/athlete/BBB234/plans") as Parameters<typeof GET>[0],
      routeContext("BBB234"),
    );
    const jsonB = await responseB.json();
    expect(jsonB.data.id).toBe("plan-id-bbb");
    expect(jsonB.data.plan_name).toBe("Program zawodnika B");

    expect(mockRpc).toHaveBeenCalledWith("get_athlete_by_share_code", {
      p_code: "AAA234",
    });
    expect(mockRpc).toHaveBeenCalledWith("get_athlete_by_share_code", {
      p_code: "BBB234",
    });
    expect(mockRpc).toHaveBeenCalledWith("get_latest_plan_by_share_code", {
      p_code: "AAA234",
    });
    expect(mockRpc).toHaveBeenCalledWith("get_latest_plan_by_share_code", {
      p_code: "BBB234",
    });
  });
});
