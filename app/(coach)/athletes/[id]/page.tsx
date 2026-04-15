import { notFound, redirect } from "next/navigation";

import AthleteEditorForm from "@/components/coach/AthleteEditorForm";
import { pl } from "@/lib/i18n/pl";
import { createClient } from "@/lib/supabase/server";

type AthleteEditorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AthleteEditorPage({
  params,
}: AthleteEditorPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (id === "new") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-[var(--color-foreground)]">
          {pl.coach.athlete.newTitle}
        </h1>
        <AthleteEditorForm mode="create" />
      </main>
    );
  }

  const { data: athlete, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !athlete) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-[var(--color-foreground)]">
        {pl.coach.athlete.editTitle}
      </h1>
      <AthleteEditorForm mode="edit" athlete={athlete} />
    </main>
  );
}

