/// <reference types="vitest/globals" />

import {
  bucketFromDate,
  dateFromBucket,
  type TrainingExperienceBucket,
} from "@/lib/constants/training-experience";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an ISO date string for N months ago relative to a reference date. */
function monthsAgo(n: number, ref: Date = new Date()): string {
  const d = new Date(ref);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

// Fixed "today" so dateFromBucket tests are deterministic.
const FIXED_TODAY = new Date("2026-04-21T00:00:00.000Z");

// ---------------------------------------------------------------------------
// bucketFromDate
// ---------------------------------------------------------------------------

describe("bucketFromDate", () => {
  it("returns null for null input", () => {
    expect(bucketFromDate(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(bucketFromDate(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(bucketFromDate("")).toBeNull();
  });

  it("returns lessThan1Year for 0 months (just started)", () => {
    expect(bucketFromDate(monthsAgo(0))).toBe("lessThan1Year");
  });

  it("returns lessThan1Year for 3 months of training", () => {
    expect(bucketFromDate(monthsAgo(3))).toBe("lessThan1Year");
  });

  it("returns lessThan1Year at upper boundary — 11 months", () => {
    expect(bucketFromDate(monthsAgo(11))).toBe("lessThan1Year");
  });

  it("returns oneToTwoYears at lower boundary — 12 months", () => {
    expect(bucketFromDate(monthsAgo(12))).toBe("oneToTwoYears");
  });

  it("returns oneToTwoYears for 18 months of training", () => {
    expect(bucketFromDate(monthsAgo(18))).toBe("oneToTwoYears");
  });

  it("returns oneToTwoYears at upper boundary — 23 months", () => {
    expect(bucketFromDate(monthsAgo(23))).toBe("oneToTwoYears");
  });

  it("returns moreThan2Years at lower boundary — 24 months", () => {
    expect(bucketFromDate(monthsAgo(24))).toBe("moreThan2Years");
  });

  it("returns moreThan2Years for 36 months of training", () => {
    expect(bucketFromDate(monthsAgo(36))).toBe("moreThan2Years");
  });

  it("returns moreThan2Years for 60 months (elite range)", () => {
    expect(bucketFromDate(monthsAgo(60))).toBe("moreThan2Years");
  });
});

// ---------------------------------------------------------------------------
// dateFromBucket
// ---------------------------------------------------------------------------

describe("dateFromBucket", () => {
  it("lessThan1Year produces a date exactly 3 months before FIXED_TODAY", () => {
    const result = dateFromBucket("lessThan1Year", FIXED_TODAY);
    const expected = new Date(FIXED_TODAY);
    expected.setMonth(expected.getMonth() - 3);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });

  it("oneToTwoYears produces a date exactly 18 months before FIXED_TODAY", () => {
    const result = dateFromBucket("oneToTwoYears", FIXED_TODAY);
    const expected = new Date(FIXED_TODAY);
    expected.setMonth(expected.getMonth() - 18);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });

  it("moreThan2Years produces a date exactly 36 months before FIXED_TODAY", () => {
    const result = dateFromBucket("moreThan2Years", FIXED_TODAY);
    const expected = new Date(FIXED_TODAY);
    expected.setMonth(expected.getMonth() - 36);
    expect(result).toBe(expected.toISOString().slice(0, 10));
  });

  it("returns a valid ISO date string (YYYY-MM-DD format)", () => {
    const result = dateFromBucket("lessThan1Year", FIXED_TODAY);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("lessThan1Year date reverse-maps to lessThan1Year bucket", () => {
    const syntheticDate = dateFromBucket("lessThan1Year");
    expect(bucketFromDate(syntheticDate)).toBe("lessThan1Year");
  });

  it("oneToTwoYears date reverse-maps to oneToTwoYears bucket", () => {
    const syntheticDate = dateFromBucket("oneToTwoYears");
    expect(bucketFromDate(syntheticDate)).toBe("oneToTwoYears");
  });

  it("moreThan2Years date reverse-maps to moreThan2Years bucket", () => {
    const syntheticDate = dateFromBucket("moreThan2Years");
    expect(bucketFromDate(syntheticDate)).toBe("moreThan2Years");
  });
});

// ---------------------------------------------------------------------------
// Round-trip consistency
// ---------------------------------------------------------------------------

describe("round-trip: dateFromBucket → bucketFromDate", () => {
  const buckets: TrainingExperienceBucket[] = [
    "lessThan1Year",
    "oneToTwoYears",
    "moreThan2Years",
  ];

  for (const bucket of buckets) {
    it(`${bucket} survives a round-trip`, () => {
      const date = dateFromBucket(bucket, FIXED_TODAY);
      expect(bucketFromDate(date)).toBe(bucket);
    });
  }
});
