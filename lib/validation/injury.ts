import { z } from "zod";

import { BODY_LOCATION_KEYS } from "@/lib/constants/body-locations";

const injuryStatusValues = ["active", "healing", "healed"] as const;
const bodyLocationSchema = z.enum(
  BODY_LOCATION_KEYS as [string, ...string[]],
);

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createInjurySchema = z.object({
  name: z.string().trim().min(1).max(200),
  body_location: bodyLocationSchema,
  severity: z.number().int().min(1).max(5),
  injury_date: z.string().regex(isoDateRegex),
  status: z.enum(injuryStatusValues).default("active"),
  notes: z.string().max(1000).nullish(),
});

export const updateInjurySchema = createInjurySchema.partial();

export type CreateInjuryInput = z.input<typeof createInjurySchema>;
export type UpdateInjuryInput = z.input<typeof updateInjurySchema>;
