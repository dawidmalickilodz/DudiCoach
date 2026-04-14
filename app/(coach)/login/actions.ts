"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export type SignInResult =
  | { ok: true }
  | { ok: false; error: "invalid_credentials" | "network" | "generic" };

export async function signInAction(input: LoginInput): Promise<SignInResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    console.warn("[signInAction] Input failed server-side validation");
    return { ok: false, error: "generic" };
  }

  const { email, password } = parsed.data;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (
        error.message === "Invalid login credentials" ||
        error.status === 400
      ) {
        return { ok: false, error: "invalid_credentials" };
      }
      console.warn("[signInAction] Supabase auth error", {
        status: error.status,
        name: error.name,
      });
      return { ok: false, error: "generic" };
    }
  } catch (err) {
    const e = err as Error;
    if (
      e instanceof TypeError ||
      e.name === "TypeError" ||
      e.message.includes("fetch")
    ) {
      return { ok: false, error: "network" };
    }
    console.error("[signInAction] Unexpected error", { name: e.name });
    return { ok: false, error: "generic" };
  }

  // Only reached on success — redirect throws NEXT_REDIRECT, let it propagate.
  redirect("/dashboard");
}
