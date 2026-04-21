import { z } from "zod";

import { getFitnessTestByKey } from "@/lib/constants/fitness-tests";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createFitnessTestResultSchema = z.object({
  test_key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine(
      (value) => Boolean(getFitnessTestByKey(value)),
      "Unknown fitness test key",
    ),
  value: z.number().finite().nonnegative().max(100000),
  test_date: z.string().regex(isoDateRegex).optional(),
  notes: z.string().max(1000).nullish(),
});

export type CreateFitnessTestResultInput = z.input<
  typeof createFitnessTestResultSchema
>;
