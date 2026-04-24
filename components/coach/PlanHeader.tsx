"use client";

import { pl } from "@/lib/i18n/pl";
import type { TrainingPlanJson } from "@/lib/validation/training-plan";

interface PlanHeaderProps {
  plan: {
    plan_name: string;
    phase: string | null;
    plan_json: Pick<TrainingPlanJson, "summary" | "weeklyOverview">;
  };
}

type PhaseKey = keyof typeof pl.coach.athlete.phase;

/**
 * Plan viewer header — shows plan name, phase label, and summary text.
 */
export default function PlanHeader({ plan }: PlanHeaderProps) {
  const phaseKey = plan.phase as PhaseKey | null;
  const phaseLabel =
    phaseKey && phaseKey in pl.coach.athlete.phase
      ? pl.coach.athlete.phase[phaseKey]
      : plan.phase ?? null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-foreground text-lg font-bold leading-tight">
          {plan.plan_name}
        </h2>
        {phaseLabel && (
          <span className="bg-primary/15 text-primary rounded-pill px-3 py-0.5 text-xs font-medium">
            {phaseLabel}
          </span>
        )}
      </div>

      {plan.plan_json.summary && (
        <div>
          <p className="text-muted-foreground mb-0.5 text-xs font-medium uppercase tracking-wide">
            {pl.coach.athlete.plans.viewer.summary}
          </p>
          <p className="text-foreground text-sm leading-relaxed">
            {plan.plan_json.summary}
          </p>
        </div>
      )}

      {plan.plan_json.weeklyOverview && (
        <div>
          <p className="text-muted-foreground mb-0.5 text-xs font-medium uppercase tracking-wide">
            {pl.coach.athlete.plans.viewer.weeklyOverview}
          </p>
          <p className="text-foreground text-sm leading-relaxed">
            {plan.plan_json.weeklyOverview}
          </p>
        </div>
      )}
    </div>
  );
}
