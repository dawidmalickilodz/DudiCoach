"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createClient();
    // Keep sign-out scoped to the current session to avoid revoking parallel
    // sessions used by E2E projects (desktop + mobile).
    await supabase.auth.signOut({ scope: "local" });
  } catch (err) {
    const e = err as Error;
    console.warn("[signOutAction] Error during sign-out", { name: e.name });
    // Per design doc edge-case policy: always redirect to /login even on error.
  }

  redirect("/login");
}
