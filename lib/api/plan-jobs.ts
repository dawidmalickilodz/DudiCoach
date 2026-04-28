import { z } from "zod";

export const planJobStatusValues = [
  "queued",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
] as const;

export const planJobStatusSchema = z.enum(planJobStatusValues);

// RFC 4122 UUID v1-v5
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createPlanJobRequestSchema = z.object({
  athleteId: z.string().regex(UUID_REGEX, "Invalid athlete id"),
});

export const planJobPromptInputsSchema = z.object({
  systemPrompt: z.string().min(1),
  userPrompt: z.string().min(1),
});

export type PlanJobPromptInputs = z.infer<typeof planJobPromptInputsSchema>;

export const PLAN_JOB_STATUS_SELECT =
  "id, athlete_id, status, attempt_count, max_attempts, plan_id, error_code, error_message, created_at, updated_at, completed_at, failed_at";

export function isDuplicateActiveJobError(error: { code?: string } | null) {
  return error?.code === "23505";
}
