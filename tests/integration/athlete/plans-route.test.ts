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

function routeContext(shareCode: string) {
  return { params: Promise.resolve({ shareCode }) };
}

function makePlan(id: string, planName: string) {
  return {
    id,
    plan_name: planName,
    phase: "Bazowy",
    plan_json: {
      planName,
      phase: "Bazowy",
      summary: "Test summary",
      weeklyOverview: "Test overview",
      weeks: [],
      progressionNotes: "",
      nutritionTips: "",
      recoveryProtocol: "",
    },
    created_at: "2026-04-24T12:00:00Z",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
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

  it("returns 200 with { data: null } when RPC returns empty array", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234/plans") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toBeNull();
    expect(mockRpc).toHaveBeenCalledWith("get_latest_plan_by_share_code", {
      p_code: "ABC234",
    });
  });

  it("returns 200 with plan data when RPC returns a row", async () => {
    const mockPlan = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      plan_name: "Program siłowy 4-tyg.",
      phase: "Bazowy",
      plan_json: {
        planName: "Program siłowy 4-tyg.",
        phase: "Bazowy",
        summary: "Ogólny plan siłowy",
        weeklyOverview: "4 treningi tygodniowo",
        weeks: [],
        progressionNotes: "Zwiększaj ciężar co tydzień",
        nutritionTips: "Jedz dużo białka",
        recoveryProtocol: "Śpij 8 godzin",
      },
      created_at: "2026-04-24T12:00:00.000Z",
    };

    mockRpc.mockResolvedValue({ data: [mockPlan], error: null });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234/plans") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).not.toBeNull();
    expect(json.data.id).toBe(mockPlan.id);
    expect(json.data.plan_name).toBe(mockPlan.plan_name);
    expect(json.data.phase).toBe(mockPlan.phase);
    expect(json.data.plan_json).toEqual(mockPlan.plan_json);
    expect(json.data.created_at).toBe(mockPlan.created_at);
    expect(json.data).not.toHaveProperty("athlete_id");
    expect(mockRpc).toHaveBeenCalledWith("get_latest_plan_by_share_code", {
      p_code: "ABC234",
    });
  });

  it("returns 500 when RPC returns an error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "rpc failure" },
    });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234/plans") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });

  it("normalizes lowercase share code to uppercase before RPC call", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const response = await GET(
      new Request("http://localhost/api/athlete/abc234/plans") as Parameters<typeof GET>[0],
      routeContext("abc234"),
    );

    expect(response.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("get_latest_plan_by_share_code", {
      p_code: "ABC234",
    });
  });

  it("returns different plans for different share codes (cross-athlete isolation)", async () => {
    const planA = makePlan("plan-id-aaa", "Program zawodnika A");
    const planB = makePlan("plan-id-bbb", "Program zawodnika B");

    // First request: share code for athlete A
    mockRpc.mockResolvedValueOnce({ data: [planA], error: null });
    const responseA = await GET(
      new Request("http://localhost/api/athlete/AAA234/plans") as Parameters<typeof GET>[0],
      routeContext("AAA234"),
    );
    const jsonA = await responseA.json();
    expect(jsonA.data.id).toBe("plan-id-aaa");
    expect(jsonA.data.plan_name).toBe("Program zawodnika A");

    // Second request: share code for athlete B
    mockRpc.mockResolvedValueOnce({ data: [planB], error: null });
    const responseB = await GET(
      new Request("http://localhost/api/athlete/BBB234/plans") as Parameters<typeof GET>[0],
      routeContext("BBB234"),
    );
    const jsonB = await responseB.json();
    expect(jsonB.data.id).toBe("plan-id-bbb");
    expect(jsonB.data.plan_name).toBe("Program zawodnika B");

    // Route called twice with correct codes (DB enforces isolation via SQL JOIN)
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenNthCalledWith(1, "get_latest_plan_by_share_code", { p_code: "AAA234" });
    expect(mockRpc).toHaveBeenNthCalledWith(2, "get_latest_plan_by_share_code", { p_code: "BBB234" });
  });
});
