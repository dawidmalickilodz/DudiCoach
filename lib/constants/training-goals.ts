/**
 * Controlled training goal values.
 *
 * Internal keys are stored in the `athletes.goal` DB column.
 * Display labels live in `lib/i18n/pl.ts` under `pl.coach.athlete.goal`.
 *
 * Pattern mirrors lib/constants/sports.ts.
 */

export const TRAINING_GOALS = [
  "general",
  "bodybuilding",
  "running",
  "strength",
  "hyrox",
  "ocr",
] as const;

export type TrainingGoal = (typeof TRAINING_GOALS)[number];
