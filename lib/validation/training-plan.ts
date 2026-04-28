import { z } from "zod";

// ---------------------------------------------------------------------------
// Training Plan JSON schema — validates Claude AI response
// ---------------------------------------------------------------------------

export const exerciseSchema = z.object({
  name: z.string().min(1).max(120),
  sets: z.string().min(1).max(20),
  reps: z.string().min(1).max(20),
  intensity: z.string().min(1).max(40),
  rest: z.string().min(1).max(20),
  tempo: z.string().min(1).max(20),
  notes: z.string().min(1).max(160),
});

export const daySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  dayName: z.string().min(1).max(80),
  warmup: z.string().min(1).max(160),
  exercises: z.array(exerciseSchema).min(1).max(4),
  cooldown: z.string().min(1).max(160),
  duration: z.string().min(1).max(20),
});

export const weekSchema = z.object({
  weekNumber: z.number().int().min(1).max(4),
  focus: z.string().min(1).max(160),
  days: z.array(daySchema).min(1),
});

export const trainingPlanJsonSchema = z.object({
  planName: z.string().min(1).max(120),
  phase: z.string().min(1).max(60),
  summary: z.string().min(1).max(300),
  weeklyOverview: z.string().min(1).max(320),
  weeks: z.array(weekSchema).length(4),
  progressionNotes: z.string().min(1).max(320),
  nutritionTips: z.string().min(1).max(240),
  recoveryProtocol: z.string().min(1).max(240),
});

export type TrainingPlanJson = z.infer<typeof trainingPlanJsonSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type Day = z.infer<typeof daySchema>;
export type Week = z.infer<typeof weekSchema>;
