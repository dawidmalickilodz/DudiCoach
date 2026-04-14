"use client";

import { pl } from "@/lib/i18n/pl";
import { calculateLevel } from "@/lib/utils/calculate-level";
import type { Athlete } from "@/lib/api/athletes";

interface AthleteContextInfoProps {
  athlete: Athlete;
  planCount: number;
}

type PhaseKey = keyof typeof pl.coach.athlete.phase;

/**
 * Displays athlete context for the plan generation section:
 * - Level badge
 * - Current phase
 * - Plan count
 * - "Pierwszy plan" or "Kontynuacja po X planach" hint
 *
 * Pure presentational — all data derived from props.
 */
export default function AthleteContextInfo({
  athlete,
  planCount,
}: AthleteContextInfoProps) {
  const levelInfo = calculateLevel(athlete.training_start_date);

  const phaseKey = athlete.current_phase as PhaseKey | null;
  const phaseLabel =
    phaseKey && phaseKey in pl.coach.athlete.phase
      ? pl.coach.athlete.phase[phaseKey]
      : athlete.current_phase ?? "—";

  const planCountLabel = pl.coach.athlete.plans.planCount.replace(
    "{count}",
    String(planCount),
  );

  const continuationLabel =
    planCount === 0
      ? pl.coach.athlete.plans.firstPlan
      : pl.coach.athlete.plans.continuationAfter.replace(
          "{count}",
          String(planCount),
        );

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
      {/* Level */}
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-xs">
          {pl.coach.athlete.plans.levelLabel}
        </span>
        {levelInfo ? (
          <span className="text-foreground font-medium">{levelInfo.label}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>

      {/* Phase */}
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-xs">
          {pl.coach.athlete.plans.phaseLabel}
        </span>
        <span className="text-foreground font-medium">{phaseLabel}</span>
      </div>

      {/* Plan count */}
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground text-xs">
          {planCountLabel}
        </span>
        <span className="text-foreground font-medium">{continuationLabel}</span>
      </div>
    </div>
  );
}
