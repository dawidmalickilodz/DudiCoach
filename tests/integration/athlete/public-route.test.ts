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

import { GET } from "@/app/api/athlete/[shareCode]/route";

function routeContext(shareCode: string) {
  return { params: Promise.resolve({ shareCode }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/athlete/[shareCode] (public endpoint)", () => {
  it("invalid share code format -> 404 (never 401)", async () => {
    const response = await GET(
      new Request("http://localhost/api/athlete/abc") as Parameters<typeof GET>[0],
      routeContext("abc"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("valid format but no matching athlete -> 404 (never 401)", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
    expect(mockRpc).toHaveBeenCalledWith("get_athlete_by_share_code", {
      p_code: "ABC234",
    });
  });

  // Test 8 — Page-level guard: inactive share code is rejected by the profile RPC gate.
  // When the profile RPC returns empty data the route returns 404, preventing any plan
  // data from being served regardless of whether plans exist for that athlete.
  it("inactive share code (profile RPC returns empty) -> 404, plan data never served", async () => {
    // Simulate a share code that exists in the URL but whose share record is inactive
    // (or was reset). The profile RPC finds no matching active entry.
    mockRpc.mockResolvedValue({ data: [], error: null });

    const response = await GET(
      new Request("http://localhost/api/athlete/DEF234") as Parameters<typeof GET>[0],
      routeContext("DEF234"),
    );
    const json = await response.json();

    // Gate must return 404, never expose plan data
    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
    // Profile RPC called exactly once — plan RPC never reached
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_athlete_by_share_code", {
      p_code: "DEF234",
    });
  });
});
