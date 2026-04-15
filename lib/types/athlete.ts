import type { Tables } from "@/lib/supabase/database.types";

export type Athlete = Tables<"athletes">;

export type AthletePhase =
  | "preparatory"
  | "base"
  | "building"
  | "peak"
  | "transition";

export type AthleteLevelKey =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "elite";

export interface AthleteLevelInfo {
  key: AthleteLevelKey;
  months: number;
  progressPct: number;
}

