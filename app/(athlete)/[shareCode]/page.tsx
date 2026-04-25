import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { AthletePublic } from "@/lib/types/athlete-public";
import type { Injury } from "@/lib/api/injuries";
import type { PublicTrainingPlan } from "@/lib/types/plan-public";
import AthletePanel from "@/components/athlete/AthletePanel";

// Next.js 16: dynamic params come as a Promise.
type PageProps = { params: Promise<{ shareCode: string }> };

const SHARE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * Public athlete panel page. Validates the share code, fetches initial
 * profile via SECURITY DEFINER RPC, then hands off to a client component
 * that subscribes to the realtime broadcast channel.
 *
 * Returns 404 (Next.js notFound) when the code is malformed, unused, or
 * the athlete's `share_active` flag is false.
 */
export default async function AthletePanelPage({ params }: PageProps) {
  const { shareCode } = await params;
  const normalized = shareCode.toUpperCase();

  if (!SHARE_CODE_REGEX.test(normalized)) {
    notFound();
  }

  const supabase = await createClient();

  const [
    { data, error },
    { data: injuriesData, error: injuriesError },
    { data: planData, error: planError },
  ] = await Promise.all([
    supabase.rpc("get_athlete_by_share_code", {
      p_code: normalized,
    }),
    supabase.rpc("get_active_injuries_by_share_code", {
      p_code: normalized,
    }),
    supabase.rpc("get_latest_plan_by_share_code", {
      p_code: normalized,
    }),
  ]);

  if (error) {
    console.error("[AthletePanelPage] RPC error", {
      code: error.code,
      message: error.message,
    });
    notFound();
  }

  const row = data?.[0];
  if (!row) {
    notFound();
  }

  if (injuriesError) {
    console.error("[AthletePanelPage] injuries RPC error", {
      code: injuriesError.code,
      message: injuriesError.message,
    });
  }

  if (planError) {
    console.error("[AthletePanelPage] plan RPC error", {
      code: planError.code,
      message: planError.message,
    });
  }

  const initialInjuries: Injury[] = injuriesData ?? [];
  // Supabase codegen types plan_json as Json (not TrainingPlanJson); shape was
  // validated by trainingPlanJsonSchema at write time (US-005). Cast is safe.
  const initialPlan: PublicTrainingPlan | null =
    (planData as unknown as PublicTrainingPlan[] | null)?.[0] ?? null;

  const initialData: AthletePublic = {
    id: row.id,
    name: row.name,
    age: row.age,
    weight_kg: row.weight_kg,
    height_cm: row.height_cm,
    sport: row.sport,
    training_start_date: row.training_start_date,
    training_days_per_week: row.training_days_per_week,
    session_minutes: row.session_minutes,
    current_phase: row.current_phase,
    goal: row.goal,
    notes: row.notes,
    share_code: row.share_code,
    updated_at: row.updated_at,
  };

  return (
    <AthletePanel
      shareCode={normalized}
      initialData={initialData}
      initialInjuries={initialInjuries}
      initialPlan={initialPlan}
    />
  );
}
