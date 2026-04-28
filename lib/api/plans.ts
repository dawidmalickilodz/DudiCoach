/**
 * Client-side fetch functions and TanStack Query key factory for training plans API.
 * These functions hit the Next.js API routes at /api/athletes/[id]/plans.
 */

import type { TrainingPlanJson } from "@/lib/validation/training-plan";
import type { Enums } from "@/lib/supabase/database.types";

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

export type PlanJobStatus = Enums<"plan_generation_job_status">;

export interface PlanGenerationJob {
  id: string;
  athlete_id: string;
  status: PlanJobStatus;
  attempt_count: number;
  max_attempts: number;
  plan_id: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  failed_at: string | null;
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

export class DuplicateActiveJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateActiveJobError";
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

export const planJobKeys = {
  all: ["plan-jobs"] as const,
  detail: (jobId: string) => [...planJobKeys.all, "detail", jobId] as const,
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

export async function startPlanGenerationJob(
  athleteId: string,
): Promise<PlanGenerationJob> {
  const res = await fetch("/api/coach/plans/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ athleteId }),
  });

  if (res.status === 409) {
    const json = (await res.json()) as { error?: string };
    throw new DuplicateActiveJobError(
      json.error ?? "Plan generation is already in progress",
    );
  }

  if (res.status === 422) {
    const json = (await res.json()) as { error?: string };
    throw new IncompleteDataError(json.error ?? "Incomplete data");
  }

  if (res.status === 429) {
    const json = (await res.json()) as { error?: string };
    throw new RateLimitError(json.error ?? "Rate limit exceeded");
  }

  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? "Failed to start plan generation job");
  }

  const json = (await res.json()) as { data: PlanGenerationJob };
  return json.data;
}

export async function fetchPlanGenerationJobStatus(
  jobId: string,
): Promise<PlanGenerationJob> {
  const res = await fetch(`/api/coach/plans/jobs/${jobId}`);

  if (!res.ok) {
    const json = (await res.json()) as { error?: string };
    throw new Error(json.error ?? "Failed to fetch plan generation job status");
  }

  const json = (await res.json()) as { data: PlanGenerationJob };
  return json.data;
}
