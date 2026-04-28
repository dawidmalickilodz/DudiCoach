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

export type PlanJobStatusRow = {
  id: string;
  athlete_id: string;
  status: z.infer<typeof planJobStatusSchema>;
  attempt_count: number;
  max_attempts: number;
  plan_id: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  failed_at: string | null;
};

const PLAN_JOB_PUBLIC_ERROR_MESSAGES: Record<string, string> = {
  invalid_prompt_inputs: "Nie udało się przygotować danych do generowania planu.",
  provider_timeout: "Przekroczono czas odpowiedzi AI. Spróbuj ponownie.",
  provider_api_error: "Usługa AI jest chwilowo niedostępna. Spróbuj ponownie.",
  generation_unexpected_error: "Nie udało się wygenerować planu. Spróbuj ponownie.",
  plan_parse_or_validation_failed: "Nie udało się przetworzyć odpowiedzi AI. Spróbuj ponownie.",
  plan_persist_failed: "Nie udało się zapisać planu. Spróbuj ponownie.",
};

const FALLBACK_PUBLIC_ERROR_MESSAGE =
  "Nie udało się wygenerować planu. Spróbuj ponownie.";

export function mapPlanJobErrorMessage(errorCode: string | null): string | null {
  if (!errorCode) return null;
  return PLAN_JOB_PUBLIC_ERROR_MESSAGES[errorCode] ?? FALLBACK_PUBLIC_ERROR_MESSAGE;
}

export function toPublicPlanJobStatus(job: PlanJobStatusRow) {
  const errorCode = job.error_code ?? null;
  const exposeErrorMessage =
    job.status === "failed" || job.status === "cancelled";
  const errorMessage = exposeErrorMessage
    ? mapPlanJobErrorMessage(errorCode)
    : null;

  return {
    ...job,
    error_code: errorCode,
    error_message: errorMessage,
    errorCode,
    errorMessage,
  };
}
