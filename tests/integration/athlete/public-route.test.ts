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
});
