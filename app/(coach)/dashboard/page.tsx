import { redirect } from "next/navigation";

import AddAthleteFab from "@/components/coach/AddAthleteFab";
import AthleteCard from "@/components/coach/AthleteCard";
import CoachNavbar from "@/components/coach/CoachNavbar";
import { pl } from "@/lib/i18n/pl";
import { createClient } from "@/lib/supabase/server";

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

  const { data: athletes, error: athletesError } = await supabase
    .from("athletes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (athletesError) {
    console.error("[DashboardPage] Failed to load athletes", {
      code: athletesError.code,
      hint: athletesError.hint,
    });
  }

  const athleteList = athletes ?? [];
  const displayName = profile?.display_name ?? user.email ?? "";

  return (
    <div className="bg-background min-h-dvh">
      <CoachNavbar displayName={displayName} />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-foreground mb-1 text-2xl font-semibold">
          {pl.coach.dashboard.title}
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          {pl.coach.dashboard.welcome}
        </p>

        <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">
          {pl.coach.dashboard.athleteCount(athleteList.length)}
        </p>

        {athleteList.length === 0 ? (
          <div className="bg-card border-border rounded-card border px-6 py-12 text-center">
            <p className="text-foreground mb-2 text-base font-medium">
              {pl.coach.dashboard.noAthletes}
            </p>
            <p className="text-muted-foreground text-sm">
              {pl.coach.dashboard.noAthletesCta}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {athleteList.map((athlete) => (
              <AthleteCard key={athlete.id} athlete={athlete} />
            ))}
          </div>
        )}
      </main>

      <AddAthleteFab />
    </div>
  );
}
