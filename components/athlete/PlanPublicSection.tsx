"use client";

import { useState } from "react";
import { pl } from "@/lib/i18n/pl";
import type { PublicTrainingPlan } from "@/lib/types/plan-public";
import PlanHeader from "@/components/coach/PlanHeader";
import WeekNavigation from "@/components/coach/WeekNavigation";
import WeekView from "@/components/coach/WeekView";
import PlanFooter from "@/components/coach/PlanFooter";

interface PlanPublicSectionProps {
  plan: PublicTrainingPlan | null;
}

/**
 * Read-only plan viewer for the public athlete panel.
 * Renders the most recent training plan passed from the server component.
 * Shows an empty state when no plan exists yet.
 * No realtime subscription — plan is static for this session (US-025 §5.1).
 */
export default function PlanPublicSection({ plan }: PlanPublicSectionProps) {
  const [activeWeek, setActiveWeek] = useState(1);

  if (!plan) {
    return (
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="text-foreground mb-2 text-lg font-semibold">
          {pl.athletePanel.plan.sectionTitle}
        </h2>
        <p className="text-muted-foreground text-sm">
          {pl.athletePanel.plan.empty}
        </p>
      </section>
    );
  }

  const week = plan.plan_json.weeks.find((w) => w.weekNumber === activeWeek);

  return (
    <section className="space-y-5">
      <div className="rounded-card border border-border bg-card p-5">
        <PlanHeader plan={plan} />
        <p className="text-muted-foreground mt-3 text-xs">
          {pl.athletePanel.plan.generatedOn}:{" "}
          {new Date(plan.created_at).toLocaleDateString("pl-PL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
      <WeekNavigation activeWeek={activeWeek} onWeekChange={setActiveWeek} />
      {week && <WeekView week={week} />}
      <PlanFooter plan={plan.plan_json} />
    </section>
  );
}
