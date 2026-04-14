/**
 * Client-side fetch functions and TanStack Query key factory for athlete API.
 * These functions hit the Next.js API routes at /api/athletes/*.
 */

import type { Tables } from "@/lib/supabase/database.types";
import type { UpdateAthleteInput } from "@/lib/validation/athlete";

export type Athlete = Tables<"athletes">;

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const athleteKeys = {
  all: ["athletes"] as const,
  list: () => [...athleteKeys.all, "list"] as const,
  detail: (id: string) => [...athleteKeys.all, "detail", id] as const,
};

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

export async function fetchAthletes(): Promise<Athlete[]> {
  const res = await fetch("/api/athletes");
  if (!res.ok) throw new Error("Failed to fetch athletes");
  const json = (await res.json()) as { data: Athlete[] };
  return json.data;
}

export async function fetchAthlete(id: string): Promise<Athlete> {
  const res = await fetch(`/api/athletes/${id}`);
  if (!res.ok) throw new Error("Failed to fetch athlete");
  const json = (await res.json()) as { data: Athlete };
  return json.data;
}

// ---------------------------------------------------------------------------
// Mutation functions
// ---------------------------------------------------------------------------

export async function createAthlete(input: { name: string }): Promise<Athlete> {
  const res = await fetch("/api/athletes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to create athlete");
  }
  const json = (await res.json()) as { data: Athlete };
  return json.data;
}

export async function updateAthlete(
  id: string,
  input: UpdateAthleteInput,
): Promise<Athlete> {
  const res = await fetch(`/api/athletes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Failed to update athlete");
  }
  const json = (await res.json()) as { data: Athlete };
  return json.data;
}
