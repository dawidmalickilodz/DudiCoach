import { z } from "zod";

import { pl } from "@/lib/i18n/pl";
import { TRAINING_GOALS } from "@/lib/constants/training-goals";

const CURRENT_PHASES = [
  "preparatory",
  "base",
  "building",
  "peak",
  "transition",
] as const;

export const createAthleteSchema = z.object({
  name: z.string().min(1, pl.validation.required),
  age: z
    .number()
    .int()
    .min(10, pl.validation.ageRange)
    .max(100, pl.validation.ageRange)
    .nullable()
    .optional(),
  weight_kg: z
    .number()
    .min(30, pl.validation.weightRange)
    .max(250, pl.validation.weightRange)
    .nullable()
    .optional(),
  height_cm: z
    .number()
    .min(100, pl.validation.heightRange)
    .max(250, pl.validation.heightRange)
    .nullable()
    .optional(),
  sport: z.string().nullable().optional(),
  training_start_date: z.union([
    z.string(), // ISO date string "YYYY-MM-DD"
    z.null(),
    z.literal(""),
  ]).optional(),
  training_days_per_week: z
    .number()
    .int()
    .min(1, pl.validation.trainingDaysRange)
    .max(7, pl.validation.trainingDaysRange)
    .nullable()
    .optional(),
  session_minutes: z
    .number()
    .int()
    .min(20, pl.validation.sessionMinutesRange)
    .max(180, pl.validation.sessionMinutesRange)
    .nullable()
    .optional(),
  current_phase: z.union([z.enum(CURRENT_PHASES), z.null(), z.literal("")]).optional(),
  goal: z.union([z.enum(TRAINING_GOALS), z.null(), z.literal("")]).optional(),
  notes: z.string().nullable().optional(),
});

// All fields optional for PATCH partial updates (name is also optional — auto-save
// does not re-send every field on each keystroke).
export const updateAthleteSchema = createAthleteSchema.partial();

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>;
export type UpdateAthleteInput = z.infer<typeof updateAthleteSchema>;
