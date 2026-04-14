"use client";

import { pl } from "@/lib/i18n/pl";
import type { Week } from "@/lib/validation/training-plan";
import DayCard from "./DayCard";

interface WeekViewProps {
  week: Week;
}

/**
 * Renders all days of the selected week.
 * Shows the week's "focus" header, then a stack of expandable DayCards.
 */
export default function WeekView({ week }: WeekViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
          {pl.coach.athlete.plans.viewer.focus}
        </p>
        <p className="text-foreground text-sm leading-relaxed">{week.focus}</p>
      </div>

      <div className="space-y-3">
        {week.days.map((day) => (
          <DayCard key={day.dayNumber} day={day} />
        ))}
      </div>
    </div>
  );
}
