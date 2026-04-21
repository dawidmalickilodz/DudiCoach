import type { Tables } from "@/lib/supabase/database.types";
import type { CreateFitnessTestResultInput } from "@/lib/validation/fitness-test";

export type FitnessTestResult = Tables<"fitness_test_results">;

export const fitnessTestKeys = {
  all: (athleteId: string) => ["athletes", athleteId, "fitness-tests"] as const,
  list: (athleteId: string) =>
    [...fitnessTestKeys.all(athleteId), "list"] as const,
};

export async function fetchFitnessTests(athleteId: string): Promise<FitnessTestResult[]> {
  const response = await fetch(`/api/athletes/${athleteId}/tests`);
  if (!response.ok) {
    throw new Error("Failed to fetch fitness tests");
  }

  const json = (await response.json()) as { data: FitnessTestResult[] };
  return json.data ?? [];
}

export async function createFitnessTest(
  athleteId: string,
  input: CreateFitnessTestResultInput,
): Promise<FitnessTestResult> {
  const response = await fetch(`/api/athletes/${athleteId}/tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const json = (await response.json()) as { error?: string };
    throw new Error(json.error ?? "Failed to create fitness test");
  }

  const json = (await response.json()) as { data: FitnessTestResult };
  return json.data;
}

export async function deleteFitnessTest(
  athleteId: string,
  testId: string,
): Promise<void> {
  const response = await fetch(`/api/athletes/${athleteId}/tests/${testId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const json = (await response.json()) as { error?: string };
    throw new Error(json.error ?? "Failed to delete fitness test");
  }
}
