import { afterEach, describe, expect, it, vi } from "vitest";

import { calculateLevel } from "@/lib/utils/calculate-level";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("calculateLevel", () => {
  it("returns beginner for null date", () => {
    const result = calculateLevel(null);
    expect(result.key).toBe("beginner");
    expect(result.progressPct).toBe(0);
  });

  it("returns beginner for short experience", () => {
    const now = new Date("2026-04-15T00:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const result = calculateLevel("2026-01-15");
    expect(result.key).toBe("beginner");
    expect(result.progressPct).toBeGreaterThan(0);
  });

  it("returns intermediate around 10 months", () => {
    const now = new Date("2026-04-15T00:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const result = calculateLevel("2025-06-15");
    expect(result.key).toBe("intermediate");
  });

  it("returns advanced around 24 months", () => {
    const now = new Date("2026-04-15T00:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const result = calculateLevel("2024-04-15");
    expect(result.key).toBe("advanced");
  });

  it("returns elite above 48 months", () => {
    const now = new Date("2026-04-15T00:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);

    const result = calculateLevel("2021-01-01");
    expect(result.key).toBe("elite");
    expect(result.progressPct).toBe(100);
  });
});
