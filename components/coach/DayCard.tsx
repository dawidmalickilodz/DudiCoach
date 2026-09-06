"use client";

import { useState } from "react";

import { pl } from "@/lib/i18n/pl";
import { cn } from "@/lib/utils";
import type { Day } from "@/lib/validation/training-plan";
import ExerciseRow from "./ExerciseRow";

interface DayCardProps {
  day: Day;
  footer?: React.ReactNode;
}

/**
 * Expandable day card in the week view.
 * Header (always visible): day name + duration.
 * Body (expandable, default expanded): warmup, exercises, cooldown.
 */
export default function DayCard({ day, footer }: DayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { viewer } = pl.coach.athlete.plans;

  function toggleExpanded() {
    setExpanded((prev) => !prev);
  }

  return (
    <div className="bg-card border-border rounded-card border overflow-hidden">
      {/* Header — always visible, clickable to expand/collapse */}
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center justify-between px-4 py-3 cursor-pointer text-left",
          "hover:bg-border/20 transition-colors",
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-foreground text-sm font-semibold truncate">
            {day.dayName}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-muted-foreground text-xs">
            {viewer.duration}: {day.duration}
          </span>
          {/* Chevron */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className={cn(
              "text-muted-foreground transition-transform duration-200",
              expanded ? "rotate-180" : "rotate-0",
            )}
          >
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* Body — collapsible */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          {/* Warmup */}
          <div className="pt-3">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
              {viewer.warmup}
            </p>
            <p className="text-foreground text-sm leading-relaxed">
              {day.warmup}
            </p>
          </div>

          {/* Exercises */}
          <div>
            <div>
              {day.exercises.map((exercise, i) => (
                <ExerciseRow key={i} exercise={exercise} index={i} />
              ))}
            </div>
          </div>

          {/* Cooldown */}
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-1">
              {viewer.cooldown}
            </p>
            <p className="text-foreground text-sm leading-relaxed">
              {day.cooldown}
            </p>
          </div>

          {footer ? (
            <div className="border-t border-border pt-2">{footer}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
