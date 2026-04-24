import type { TrainingPlanJson } from "@/lib/validation/training-plan";

/**
 * Sanitized training plan returned to the public athlete panel.
 * Excludes athlete_id (internal FK). coach_id was never on the row to begin
 * with — ownership is derived via athletes.coach_id, which is never exposed.
 *
 * Matches the return shape of the get_latest_plan_by_share_code RPC.
 * See: docs/design/US-025-design.md §2
 */
export interface PublicTrainingPlan {
  id: string;
  plan_name: string;
  phase: string | null;
  plan_json: TrainingPlanJson;
  created_at: string;
}
