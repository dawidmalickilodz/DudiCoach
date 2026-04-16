"use client";

import { pl } from "@/lib/i18n/pl";
import { cn } from "@/lib/utils";
import type { TrainingPlan } from "@/lib/api/plans";
import { formatPlanDate } from "@/lib/utils/format-plan-date";

interface PlanListItemProps {
  plan: TrainingPlan;
  selected: boolean;
  onClick: () => void;
}

type PhaseKey = keyof typeof pl.coach.athlete.phase;

/**
 * Single plan card in the plan list.
 * Shows plan name, localized phase, and formatted creation date.
 * Highlights when selected with a primary border/ring.
 */
export default function PlanListItem({
  plan,
  selected,
  onClick,
}: PlanListItemProps) {
  const phaseKey = plan.phase as PhaseKey | null;
  const phaseLabel =
    phaseKey && phaseKey in pl.coach.athlete.phase
      ? pl.coach.athlete.phase[phaseKey]
      : plan.phase ?? "—";

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-pressed={selected}
      className={cn(
        "bg-card border rounded-card p-4 cursor-pointer transition-colors",
        "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2",
        selected
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-primary/50",
      )}
    >
      <p className="text-foreground font-medium text-sm leading-snug truncate">
        {plan.plan_name}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        <span className="text-muted-foreground text-xs">{phaseLabel}</span>
        <span className="text-muted-foreground text-xs">
          {formatPlanDate(plan.created_at)}
        </span>
      </div>
    </div>
  );
}
