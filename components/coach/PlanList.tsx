"use client";

import { pl } from "@/lib/i18n/pl";
import type { TrainingPlan } from "@/lib/api/plans";
import PlanListItem from "./PlanListItem";

interface PlanListProps {
  plans: TrainingPlan[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * List of plan cards.
 * Shows empty state when there are no plans.
 */
export default function PlanList({
  plans,
  selectedId,
  onSelect,
}: PlanListProps) {
  if (plans.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        {pl.coach.athlete.plans.noPlan}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {plans.map((plan) => (
        <PlanListItem
          key={plan.id}
          plan={plan}
          selected={plan.id === selectedId}
          onClick={() => onSelect(plan.id)}
        />
      ))}
    </div>
  );
}
