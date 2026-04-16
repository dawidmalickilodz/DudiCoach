import type { Tables } from "@/lib/supabase/database.types";
import type {
  CreateInjuryInput,
  UpdateInjuryInput,
} from "@/lib/validation/injury";

export type Injury = Tables<"injuries">;

export const injuryKeys = {
  all: (athleteId: string) => ["athletes", athleteId, "injuries"] as const,
  list: (athleteId: string) => [...injuryKeys.all(athleteId), "list"] as const,
};

export async function fetchInjuries(athleteId: string): Promise<Injury[]> {
  const response = await fetch(`/api/athletes/${athleteId}/injuries`);
  if (!response.ok) {
    throw new Error("Failed to fetch injuries");
  }
  const json = (await response.json()) as { data: Injury[] };
  return json.data;
}

export async function createInjury(
  athleteId: string,
  input: CreateInjuryInput,
): Promise<Injury> {
  const response = await fetch(`/api/athletes/${athleteId}/injuries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const json = (await response.json()) as { error?: string };
    throw new Error(json.error ?? "Failed to create injury");
  }

  const json = (await response.json()) as { data: Injury };
  return json.data;
}

export async function updateInjury(
  athleteId: string,
  injuryId: string,
  input: UpdateInjuryInput,
): Promise<Injury> {
  const response = await fetch(`/api/athletes/${athleteId}/injuries/${injuryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const json = (await response.json()) as { error?: string };
    throw new Error(json.error ?? "Failed to update injury");
  }

  const json = (await response.json()) as { data: Injury };
  return json.data;
}

export async function deleteInjury(
  athleteId: string,
  injuryId: string,
): Promise<void> {
  const response = await fetch(`/api/athletes/${athleteId}/injuries/${injuryId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const json = (await response.json()) as { error?: string };
    throw new Error(json.error ?? "Failed to delete injury");
  }
}

export async function fetchPublicInjuries(shareCode: string): Promise<Injury[]> {
  const response = await fetch(`/api/athlete/${shareCode}/injuries`);

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch public injuries");
  }

  const json = (await response.json()) as { data: Injury[] };
  return json.data ?? [];
}
