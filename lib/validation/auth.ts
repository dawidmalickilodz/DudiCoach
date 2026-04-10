import { z } from "zod";

import { pl } from "@/lib/i18n/pl";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, pl.validation.required)
    .email(pl.validation.emailInvalid),
  password: z
    .string()
    .min(1, pl.validation.required)
    .min(8, pl.validation.passwordTooShort),
});

export type LoginInput = z.infer<typeof loginSchema>;
