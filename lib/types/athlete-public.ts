/**
 * Sanitized athlete data returned to the public athlete panel.
 * Excludes coach_id and created_at (internal fields).
 *
 * Matches the return shape of the get_athlete_by_share_code RPC.
 * See: docs/design/US-004-design.md §11
 */
export interface AthletePublic {
  id: string;
  name: string;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  sport: string | null;
  training_start_date: string | null;
  training_days_per_week: number | null;
  session_minutes: number | null;
  current_phase: string | null;
  goal: string | null;
  notes: string | null;
  share_code: string;
  updated_at: string;
}
