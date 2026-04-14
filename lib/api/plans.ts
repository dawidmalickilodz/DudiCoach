/**
 * Client-side fetch functions and TanStack Query key factory for training plans API.
 * These functions hit the Next.js API routes at /api/athletes/[id]/plans.
 */

import type { TrainingPlanJson } from "@/lib/validation/training-plan";

// ---------------------------------------------------------------------------
// TrainingPlan type — mirrors the training_plans table row with typed plan_json
// ---------------------------------------------------------------------------

export interface TrainingPlan {
  id: string;
  athlete_id: string;
  plan_name: string;
  phase: string | null;
  plan_json: TrainingPlanJson;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Typed errors — used by PlanTabContent to map to pl.ts error keys
// ---------------------------------------------------------------------------

export class IncompleteDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncompleteDataError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const planKeys = {
  all: ["plans"] as const,
  byAthlete: (athleteId: string) =>
    [...planKeys.all, "athlete", athleteId] as const,
  detail: (planId: string) => [...planKeys.all, "detail", planId] as const,
};

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

export async function fetchPlans(athleteId: string): Promise<TrainingPlan[]> {
  const res = await fetch(`/api/athletes/${athleteId}/plans`);
  if (!res.ok) throw new Error("Failed to fetch plans");
  const json = (await res.json()) as { data: TrainingPlan[] };
  return json.data;
}

// ---------------------------------------------------------------------------
// Mutation functions
// ---------------------------------------------------------------------------

export async function generatePlan(athleteId: string): Promise<TrainingPlan> {
  const res = await fetch(`/api/athletes/${athleteId}/plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (res.status === 422) {
    const json = (await res.json()) as { error?: string };
    throw new IncompleteDataError(json.error ?? "Incomplete data");
  }

  if (res.status === 429) {
    const json = (await res.json()) as { error?: string };
    throw new RateLimitError(json.error ?? "Rate limit exceeded");
  }

  if (res.status === 504) {
    const json = (await res.json()) as { error?: string };
    throw new TimeoutError(json.error ?? "Timeout");
  }

  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? "Failed to generate plan");
  }

  const json = (await res.json()) as { data: TrainingPlan };
  return json.data;
}
