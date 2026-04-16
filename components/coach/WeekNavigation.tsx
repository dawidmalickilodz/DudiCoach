"use client";

import { pl } from "@/lib/i18n/pl";
import { cn } from "@/lib/utils";

interface WeekNavigationProps {
  activeWeek: number;
  onWeekChange: (week: number) => void;
}

const WEEKS = [1, 2, 3, 4] as const;

/**
 * Week selector pills for the plan viewer (weeks 1-4).
 * Active week is highlighted with primary color.
 */
export default function WeekNavigation({
  activeWeek,
  onWeekChange,
}: WeekNavigationProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {WEEKS.map((n) => {
        const isActive = activeWeek === n;
        const label = pl.coach.athlete.plans.viewer.week.replace(
          "{n}",
          String(n),
        );

        return (
          <button
            key={n}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onWeekChange(n)}
            className={cn(
              "rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
