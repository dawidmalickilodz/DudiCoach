import { z } from "zod";

// ---------------------------------------------------------------------------
// Training Plan JSON schema — validates Claude AI response
// ---------------------------------------------------------------------------

export const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.string(),
  reps: z.string(),
  intensity: z.string(),
  rest: z.string(),
  tempo: z.string(),
  notes: z.string(),
});

export const daySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  dayName: z.string(),
  warmup: z.string(),
  exercises: z.array(exerciseSchema).min(1),
  cooldown: z.string(),
  duration: z.string(),
});

export const weekSchema = z.object({
  weekNumber: z.number().int().min(1).max(4),
  focus: z.string(),
  days: z.array(daySchema).min(1),
});

export const trainingPlanJsonSchema = z.object({
  planName: z.string().min(1),
  phase: z.string(),
  summary: z.string(),
  weeklyOverview: z.string(),
  weeks: z.array(weekSchema).length(4),
  progressionNotes: z.string(),
  nutritionTips: z.string(),
  recoveryProtocol: z.string(),
});

export type TrainingPlanJson = z.infer<typeof trainingPlanJsonSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type Day = z.infer<typeof daySchema>;
export type Week = z.infer<typeof weekSchema>;
