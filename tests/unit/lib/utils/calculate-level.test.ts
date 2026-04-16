/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest";
import { calculateLevel } from "@/lib/utils/calculate-level";
import { pl } from "@/lib/i18n/pl";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns an ISO date string that is `months` months before today.
 * Uses the same arithmetic as calculateLevel (year/month diff, no day precision).
 */
function monthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns an ISO date string that is `months` months in the future.
 */
function monthsFromNow(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// calculateLevel — null / undefined inputs
// ---------------------------------------------------------------------------

describe("calculateLevel — null/undefined inputs", () => {
  it("returns null for null startDate", () => {
    expect(calculateLevel(null)).toBeNull();
  });

  it("returns null for undefined startDate", () => {
    expect(calculateLevel(undefined)).toBeNull();
  });

  it("returns null for empty string startDate", () => {
    // empty string is falsy — treated same as null
    expect(calculateLevel("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// calculateLevel — future date edge case
// ---------------------------------------------------------------------------

describe("calculateLevel — future date", () => {
  it("returns beginner with 0 monthsTraining when startDate is in the future", () => {
    const futureDate = monthsFromNow(3);
    const result = calculateLevel(futureDate);
    expect(result).not.toBeNull();
    expect(result!.level).toBe("beginner");
    expect(result!.monthsTraining).toBe(0);
  });

  it("returns progressToNext = 0 for a future date", () => {
    const futureDate = monthsFromNow(6);
    const result = calculateLevel(futureDate);
    expect(result!.progressToNext).toBe(0);
  });

  it("returns beginner label for future date", () => {
    const result = calculateLevel(monthsFromNow(1));
    expect(result!.label).toBe(pl.coach.athlete.level.beginner);
  });
});

// ---------------------------------------------------------------------------
// calculateLevel — beginner tier (0–6 months, exclusive)
// ---------------------------------------------------------------------------

describe("calculateLevel — beginner tier (0–5 months)", () => {
  it("returns beginner at exactly 0 months (today)", () => {
    // Use a date that is strictly today (no months difference)
    const today = new Date().toISOString().slice(0, 10);
    const result = calculateLevel(today);
    expect(result!.level).toBe("beginner");
    expect(result!.monthsTraining).toBe(0);
    expect(result!.color).toBe("text-success");
    expect(result!.label).toBe(pl.coach.athlete.level.beginner);
  });

  it("returns beginner at 3 months", () => {
    const result = calculateLevel(monthsAgo(3));
    expect(result!.level).toBe("beginner");
    expect(result!.monthsTraining).toBe(3);
    expect(result!.color).toBe("text-success");
  });

  it("returns beginner at 5 months", () => {
    const result = calculateLevel(monthsAgo(5));
    expect(result!.level).toBe("beginner");
    expect(result!.monthsTraining).toBe(5);
  });

  it("progress is 0.5 at 3 months (halfway through 0–6 tier)", () => {
    const result = calculateLevel(monthsAgo(3));
    expect(result!.progressToNext).toBeCloseTo(0.5, 5);
  });

  it("progressToNext is clamped between 0 and 1", () => {
    const result = calculateLevel(monthsAgo(3));
    expect(result!.progressToNext).toBeGreaterThanOrEqual(0);
    expect(result!.progressToNext).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// calculateLevel — tier boundary: 6 months → intermediate
// ---------------------------------------------------------------------------

describe("calculateLevel — boundary at 6 months (beginner → intermediate)", () => {
  it("returns intermediate at exactly 6 months", () => {
    const result = calculateLevel(monthsAgo(6));
    expect(result!.level).toBe("intermediate");
    expect(result!.monthsTraining).toBe(6);
    expect(result!.color).toBe("text-primary");
    expect(result!.label).toBe(pl.coach.athlete.level.intermediate);
  });

  it("progressToNext is 0 at 6 months (start of tier)", () => {
    const result = calculateLevel(monthsAgo(6));
    expect(result!.progressToNext).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateLevel — intermediate tier (6–18 months)
// ---------------------------------------------------------------------------

describe("calculateLevel — intermediate tier (6–17 months)", () => {
  it("returns intermediate at 12 months", () => {
    const result = calculateLevel(monthsAgo(12));
    expect(result!.level).toBe("intermediate");
    expect(result!.monthsTraining).toBe(12);
    expect(result!.color).toBe("text-primary");
  });

  it("returns intermediate at 17 months", () => {
    const result = calculateLevel(monthsAgo(17));
    expect(result!.level).toBe("intermediate");
    expect(result!.monthsTraining).toBe(17);
  });

  it("progress is 0.5 at 12 months (halfway through 6–18 tier)", () => {
    // (12 - 6) / (18 - 6) = 6 / 12 = 0.5
    const result = calculateLevel(monthsAgo(12));
    expect(result!.progressToNext).toBeCloseTo(0.5, 5);
  });
});

// ---------------------------------------------------------------------------
// calculateLevel — tier boundary: 18 months → advanced
// ---------------------------------------------------------------------------

describe("calculateLevel — boundary at 18 months (intermediate → advanced)", () => {
  it("returns advanced at exactly 18 months", () => {
    const result = calculateLevel(monthsAgo(18));
    expect(result!.level).toBe("advanced");
    expect(result!.monthsTraining).toBe(18);
    expect(result!.color).toBe("text-warning");
    expect(result!.label).toBe(pl.coach.athlete.level.advanced);
  });

  it("progressToNext is 0 at 18 months (start of advanced tier)", () => {
    const result = calculateLevel(monthsAgo(18));
    expect(result!.progressToNext).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateLevel — advanced tier (18–48 months)
// ---------------------------------------------------------------------------

describe("calculateLevel — advanced tier (18–47 months)", () => {
  it("returns advanced at 36 months", () => {
    const result = calculateLevel(monthsAgo(36));
    expect(result!.level).toBe("advanced");
    expect(result!.monthsTraining).toBe(36);
    expect(result!.color).toBe("text-warning");
  });

  it("returns advanced at 47 months", () => {
    const result = calculateLevel(monthsAgo(47));
    expect(result!.level).toBe("advanced");
  });

  it("progress is 0.5 at 33 months (halfway through 18–48 tier)", () => {
    // (33 - 18) / (48 - 18) = 15 / 30 = 0.5
    const result = calculateLevel(monthsAgo(33));
    expect(result!.progressToNext).toBeCloseTo(0.5, 5);
  });
});

// ---------------------------------------------------------------------------
// calculateLevel — tier boundary: 48 months → elite
// ---------------------------------------------------------------------------

describe("calculateLevel — boundary at 48 months (advanced → elite)", () => {
  it("returns elite at exactly 48 months", () => {
    const result = calculateLevel(monthsAgo(48));
    expect(result!.level).toBe("elite");
    expect(result!.monthsTraining).toBe(48);
    expect(result!.color).toBe("text-yellow");
    expect(result!.label).toBe(pl.coach.athlete.level.elite);
  });

  it("progressToNext is 1.0 at 48 months (elite tier caps at 1.0)", () => {
    const result = calculateLevel(monthsAgo(48));
    expect(result!.progressToNext).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// calculateLevel — elite tier (48+ months)
// ---------------------------------------------------------------------------

describe("calculateLevel — elite tier (48+ months)", () => {
  it("returns elite at 60 months", () => {
    const result = calculateLevel(monthsAgo(60));
    expect(result!.level).toBe("elite");
    expect(result!.monthsTraining).toBe(60);
    expect(result!.color).toBe("text-yellow");
  });

  it("progressToNext is always 1.0 for elite (no next tier)", () => {
    const result = calculateLevel(monthsAgo(72));
    expect(result!.progressToNext).toBe(1.0);
  });

  it("returns elite at 120 months (10 years)", () => {
    const result = calculateLevel(monthsAgo(120));
    expect(result!.level).toBe("elite");
    expect(result!.monthsTraining).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// calculateLevel — LevelInfo shape
// ---------------------------------------------------------------------------

describe("calculateLevel — returned LevelInfo shape", () => {
  it("returns all required fields for a valid date", () => {
    const result = calculateLevel(monthsAgo(12));
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("level");
    expect(result).toHaveProperty("label");
    expect(result).toHaveProperty("monthsTraining");
    expect(result).toHaveProperty("progressToNext");
    expect(result).toHaveProperty("color");
  });

  it("label matches the pl.ts dictionary string for each level", () => {
    expect(calculateLevel(monthsAgo(0))!.label).toBe(pl.coach.athlete.level.beginner);
    expect(calculateLevel(monthsAgo(10))!.label).toBe(pl.coach.athlete.level.intermediate);
    expect(calculateLevel(monthsAgo(30))!.label).toBe(pl.coach.athlete.level.advanced);
    expect(calculateLevel(monthsAgo(60))!.label).toBe(pl.coach.athlete.level.elite);
  });
});
