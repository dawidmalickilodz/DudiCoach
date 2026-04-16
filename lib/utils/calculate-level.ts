/**
 * Calculates the training level of an athlete based on their training start date.
 *
 * Level thresholds (months of training):
 *   0  – 6   → beginner      (green)
 *   6  – 18  → intermediate  (cyan)
 *   18 – 48  → advanced      (orange)
 *   48+      → elite         (yellow/gold)
 */

import { pl } from "@/lib/i18n/pl";

export type Level = "beginner" | "intermediate" | "advanced" | "elite";

export interface LevelInfo {
  level: Level;
  /** Polish display label from pl.ts */
  label: string;
  /** Total number of whole months of training since startDate */
  monthsTraining: number;
  /** Progress within the current tier, 0.0 – 1.0 */
  progressToNext: number;
  /** Tailwind text-color class for the badge */
  color: string;
}

const TIERS: Array<{
  level: Level;
  start: number;
  end: number;
  color: string;
}> = [
  { level: "beginner", start: 0, end: 6, color: "text-success" },
  { level: "intermediate", start: 6, end: 18, color: "text-primary" },
  { level: "advanced", start: 18, end: 48, color: "text-warning" },
  { level: "elite", start: 48, end: Infinity, color: "text-yellow" },
];

/**
 * Returns level info for the given ISO date string, or null if no date provided.
 */
export function calculateLevel(startDate: string | null | undefined): LevelInfo | null {
  if (!startDate) return null;

  const start = new Date(startDate);
  const now = new Date();

  // If the date is in the future, treat as 0 months (just started)
  const monthsTraining = Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth()),
  );

  // Find which tier this athlete is in
  const tier =
    TIERS.find((t) => monthsTraining >= t.start && monthsTraining < t.end) ??
    TIERS[TIERS.length - 1]; // fallback to elite if somehow out of range

  let progressToNext: number;
  if (tier.end === Infinity) {
    // Elite tier — progress is capped at 1.0
    progressToNext = 1.0;
  } else {
    progressToNext =
      (monthsTraining - tier.start) / (tier.end - tier.start);
    // Clamp to [0, 1]
    progressToNext = Math.min(1.0, Math.max(0.0, progressToNext));
  }

  const labelMap: Record<Level, string> = {
    beginner: pl.coach.athlete.level.beginner,
    intermediate: pl.coach.athlete.level.intermediate,
    advanced: pl.coach.athlete.level.advanced,
    elite: pl.coach.athlete.level.elite,
  };

  return {
    level: tier.level,
    label: labelMap[tier.level],
    monthsTraining,
    progressToNext,
    color: tier.color,
  };
}
