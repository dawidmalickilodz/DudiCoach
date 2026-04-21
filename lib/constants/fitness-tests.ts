import type { Sport } from "@/lib/constants/sports";

export type FitnessTestUnit = "s" | "m" | "cm" | "kg" | "reps";
export type FitnessTestDirection = "lower_is_better" | "higher_is_better";

export interface FitnessTestDefinition {
  key: string;
  name: string;
  unit: FitnessTestUnit;
  direction: FitnessTestDirection;
  sports: readonly Sport[] | "all";
}

export const FITNESS_TESTS = [
  // General tests available for every sport.
  {
    key: "squat_1rm",
    name: "Przysiad 1RM",
    unit: "kg",
    direction: "higher_is_better",
    sports: "all",
  },
  {
    key: "bench_press_1rm",
    name: "Wyciskanie 1RM",
    unit: "kg",
    direction: "higher_is_better",
    sports: "all",
  },
  {
    key: "deadlift_1rm",
    name: "Martwy ciag 1RM",
    unit: "kg",
    direction: "higher_is_better",
    sports: "all",
  },
  {
    key: "plank_hold",
    name: "Deska",
    unit: "s",
    direction: "higher_is_better",
    sports: "all",
  },
  {
    key: "run_1000m",
    name: "Bieg 1000m",
    unit: "s",
    direction: "lower_is_better",
    sports: "all",
  },

  // Sport-specific tests.
  {
    key: "sprint_30m",
    name: "Bieg 30m",
    unit: "s",
    direction: "lower_is_better",
    sports: ["pilka_nozna", "lekkoatletyka"],
  },
  {
    key: "yoyo_ir1",
    name: "Yo-Yo IR1",
    unit: "m",
    direction: "higher_is_better",
    sports: ["pilka_nozna"],
  },
  {
    key: "t_test",
    name: "T-test",
    unit: "s",
    direction: "lower_is_better",
    sports: ["pilka_nozna", "koszykowka"],
  },
  {
    key: "broad_jump",
    name: "Skok w dal z miejsca",
    unit: "cm",
    direction: "higher_is_better",
    sports: ["pilka_nozna", "lekkoatletyka"],
  },
  {
    key: "vertical_jump",
    name: "Skok dosiezny",
    unit: "cm",
    direction: "higher_is_better",
    sports: ["koszykowka", "siatkowka"],
  },
  {
    key: "lane_agility",
    name: "Lane agility",
    unit: "s",
    direction: "lower_is_better",
    sports: ["koszykowka"],
  },
  {
    key: "approach_jump",
    name: "Wyskok do ataku",
    unit: "cm",
    direction: "higher_is_better",
    sports: ["siatkowka"],
  },
  {
    key: "swim_50m",
    name: "Plywanie 50m",
    unit: "s",
    direction: "lower_is_better",
    sports: ["plywanie"],
  },
  {
    key: "swim_400m",
    name: "Plywanie 400m",
    unit: "s",
    direction: "lower_is_better",
    sports: ["plywanie"],
  },
  {
    key: "sprint_100m",
    name: "Bieg 100m",
    unit: "s",
    direction: "lower_is_better",
    sports: ["lekkoatletyka"],
  },
  {
    key: "burpee_2min",
    name: "Burpees 2 min",
    unit: "reps",
    direction: "higher_is_better",
    sports: ["fitness", "crossfit", "mma"],
  },
  {
    key: "bag_round_endurance",
    name: "Runda worka (3 min)",
    unit: "reps",
    direction: "higher_is_better",
    sports: ["boks", "mma"],
  },
  {
    key: "spider_test",
    name: "Spider test",
    unit: "s",
    direction: "lower_is_better",
    sports: ["tenis"],
  },
] as const satisfies readonly FitnessTestDefinition[];

const FITNESS_TESTS_BY_KEY_INTERNAL = new Map<string, FitnessTestDefinition>(
  FITNESS_TESTS.map((test) => [test.key, test]),
);

export const FITNESS_TEST_KEYS = FITNESS_TESTS.map((test) => test.key);

export function getFitnessTestByKey(testKey: string): FitnessTestDefinition | undefined {
  return FITNESS_TESTS_BY_KEY_INTERNAL.get(testKey);
}

export function getFitnessTestsForSport(
  sport: Sport | null | undefined,
): FitnessTestDefinition[] {
  return FITNESS_TESTS.filter(
    (test) =>
      test.sports === "all" ||
      (sport !== null &&
        sport !== undefined &&
        (test.sports as readonly Sport[]).includes(sport)),
  );
}

export function isFitnessTestKeyAllowedForSport(
  testKey: string,
  sport: Sport | null | undefined,
): boolean {
  const test = getFitnessTestByKey(testKey);
  if (!test) return false;
  if (test.sports === "all") return true;
  return (
    sport !== null &&
    sport !== undefined &&
    (test.sports as readonly Sport[]).includes(sport)
  );
}
