import { redirect } from "next/navigation";

import CoachNavbar from "@/components/coach/CoachNavbar";
import DashboardContent from "@/components/coach/DashboardContent";
import { pl } from "@/lib/i18n/pl";
import { createClient } from "@/lib/supabase/server";
import type { Athlete } from "@/lib/api/athletes";

/**
 * /coach/dashboard — Athlete list dashboard.
 * RSC: fetches athletes server-side for instant render, passes to DashboardContent.
 * Auth-protected via middleware + server-side redirect fallback.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name ?? user.email ?? "";

  // Fetch athletes server-side for instant render (no loading flash)
  const { data: athletes } = await supabase
    .from("athletes")
    .select("*")
    .order("updated_at", { ascending: false });

  const initialAthletes: Athlete[] = athletes ?? [];

  return (
    <div className="bg-background min-h-dvh">
      <CoachNavbar displayName={displayName} />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-foreground mb-2 text-2xl font-semibold">
          {pl.coach.dashboard.title}
        </h1>
        <p className="text-muted-foreground mb-8 text-sm">
          {pl.coach.dashboard.welcome}
        </p>

        <DashboardContent initialAthletes={initialAthletes} />
      </main>
    </div>
  );
}
