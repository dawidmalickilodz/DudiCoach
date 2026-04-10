import { redirect } from "next/navigation";

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

  const displayName = profile?.display_name ?? user.email ?? "";

  return (
    <div className="bg-background min-h-dvh">
      <CoachNavbar displayName={displayName} />

      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-foreground mb-2 text-2xl font-semibold">
          {pl.coach.dashboard.title}
        </h1>
        <p className="text-muted-foreground mb-10 text-sm">
          {pl.coach.dashboard.welcome}
        </p>

        {/* Empty state card */}
        <div className="bg-card border-border rounded-card border px-6 py-12 text-center">
          <p className="text-foreground mb-2 text-base font-medium">
            {pl.coach.dashboard.noAthletes}
          </p>
          <p className="text-muted-foreground text-sm">
            {pl.coach.dashboard.noAthletesCta}
          </p>
        </div>
      </main>
    </div>
  );
}
