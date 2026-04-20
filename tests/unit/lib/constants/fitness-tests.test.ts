/// <reference types="vitest/globals" />

import {
  getFitnessTestByKey,
  getFitnessTestsForSport,
  isFitnessTestKeyAllowedForSport,
} from "@/lib/constants/fitness-tests";

describe("fitness tests catalog", () => {
  it("includes universal tests regardless of sport", () => {
    const tests = getFitnessTestsForSport("pilka_nozna");
    const keys = tests.map((test) => test.key);

    expect(keys).toContain("squat_1rm");
    expect(keys).toContain("plank_hold");
  });

  it("filters sport-specific tests correctly", () => {
    const soccerTests = getFitnessTestsForSport("pilka_nozna").map((t) => t.key);
    const swimTests = getFitnessTestsForSport("plywanie").map((t) => t.key);

    expect(soccerTests).toContain("sprint_30m");
    expect(soccerTests).not.toContain("swim_50m");

    expect(swimTests).toContain("swim_50m");
    expect(swimTests).not.toContain("yoyo_ir1");
  });

  it("returns only universal tests when sport is unknown/null", () => {
    const tests = getFitnessTestsForSport(null);
    const keys = tests.map((test) => test.key);

    expect(keys).toContain("squat_1rm");
    expect(keys).not.toContain("sprint_30m");
  });

  it("validates whether test key is allowed for athlete sport", () => {
    expect(isFitnessTestKeyAllowedForSport("sprint_30m", "pilka_nozna")).toBe(true);
    expect(isFitnessTestKeyAllowedForSport("swim_50m", "pilka_nozna")).toBe(false);
    expect(isFitnessTestKeyAllowedForSport("squat_1rm", "pilka_nozna")).toBe(true);
    expect(isFitnessTestKeyAllowedForSport("does_not_exist", "pilka_nozna")).toBe(false);
  });

  it("returns test metadata by key", () => {
    const test = getFitnessTestByKey("sprint_30m");
    expect(test).toBeDefined();
    expect(test?.direction).toBe("lower_is_better");
    expect(test?.unit).toBe("s");
  });
});
