"use client";

import { pl } from "@/lib/i18n/pl";
import type { TrainingPlanJson } from "@/lib/validation/training-plan";

interface PlanFooterProps {
  plan: TrainingPlanJson;
}

/**
 * Plan viewer footer — shows progressionNotes, nutritionTips, recoveryProtocol.
 * Each section is rendered only when the field has content.
 */
export default function PlanFooter({ plan }: PlanFooterProps) {
  const { viewer } = pl.coach.athlete.plans;

  const sections: Array<{ label: string; value: string }> = [
    { label: viewer.progressionNotes, value: plan.progressionNotes },
    { label: viewer.nutritionTips, value: plan.nutritionTips },
    { label: viewer.recoveryProtocol, value: plan.recoveryProtocol },
  ].filter((s) => s.value.trim().length > 0);

  if (sections.length === 0) return null;

  return (
    <div className="bg-card border-border rounded-card border p-5 space-y-4">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
            {section.label}
          </p>
          <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">
            {section.value}
          </p>
        </div>
      ))}
    </div>
  );
}
