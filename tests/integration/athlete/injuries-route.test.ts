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

import { GET } from "@/app/api/athlete/[shareCode]/injuries/route";

function routeContext(shareCode: string) {
  return { params: Promise.resolve({ shareCode }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/athlete/[shareCode]/injuries (public endpoint)", () => {
  it("returns 404 for invalid share code format", async () => {
    const response = await GET(
      new Request("http://localhost/api/athlete/abc/injuries") as Parameters<typeof GET>[0],
      routeContext("abc"),
    );
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Not found");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 200 with empty data for valid code without injuries", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234/injuries") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([]);
    expect(mockRpc).toHaveBeenCalledWith("get_active_injuries_by_share_code", {
      p_code: "ABC234",
    });
  });

  it("returns 500 when RPC fails", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "rpc failure" },
    });

    const response = await GET(
      new Request("http://localhost/api/athlete/ABC234/injuries") as Parameters<typeof GET>[0],
      routeContext("ABC234"),
    );
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });
});
