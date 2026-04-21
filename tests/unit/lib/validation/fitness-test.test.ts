/// <reference types="vitest/globals" />

import { createFitnessTestResultSchema } from "@/lib/validation/fitness-test";

describe("createFitnessTestResultSchema", () => {
  it("accepts valid input", () => {
    const result = createFitnessTestResultSchema.safeParse({
      test_key: "sprint_30m",
      value: 4.35,
      test_date: "2026-04-20",
      notes: "Po rozgrzewce",
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown test_key", () => {
    const result = createFitnessTestResultSchema.safeParse({
      test_key: "unknown_test",
      value: 10,
      test_date: "2026-04-20",
    });

    expect(result.success).toBe(false);
  });

  it("rejects negative value", () => {
    const result = createFitnessTestResultSchema.safeParse({
      test_key: "sprint_30m",
      value: -1,
      test_date: "2026-04-20",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = createFitnessTestResultSchema.safeParse({
      test_key: "sprint_30m",
      value: 4.35,
      test_date: "20-04-2026",
    });

    expect(result.success).toBe(false);
  });
});
