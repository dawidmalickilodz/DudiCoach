import { notFound, redirect } from "next/navigation";

import CoachNavbar from "@/components/coach/CoachNavbar";
import AthleteEditorShell from "@/components/coach/AthleteEditorShell";
import { createClient } from "@/lib/supabase/server";

interface AthletePageProps {
  params: Promise<{ id: string }>;
}

/**
 * /coach/athletes/[id] — Athlete editor page.
 * RSC: fetches athlete data server-side, passes to client AthleteEditorShell.
 * Auth-protected via middleware + server-side redirect fallback.
 */
export default async function AthletePage({ params }: AthletePageProps) {
  const { id } = await params;

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

  // Fetch the athlete — RLS ensures the coach can only see their own
  const { data: athlete, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !athlete) {
    notFound();
  }

  return (
    <div className="bg-background min-h-dvh">
      <CoachNavbar displayName={displayName} />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <AthleteEditorShell athlete={athlete} />
      </main>
    </div>
  );
}
