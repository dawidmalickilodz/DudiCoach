"use client";

import type { FitnessTestDirection } from "@/lib/constants/fitness-tests";
import { pl } from "@/lib/i18n/pl";

interface TrendIndicatorProps {
  currentValue: number;
  previousValue: number;
  direction: FitnessTestDirection;
}

export default function TrendIndicator({
  currentValue,
  previousValue,
  direction,
}: TrendIndicatorProps) {
  const delta = currentValue - previousValue;

  if (!Number.isFinite(delta)) return null;

  const { marker, toneClass, srLabel } = getTrendPresentation(delta, direction);
  const formattedDelta = formatDelta(Math.abs(delta));

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${toneClass}`}
      aria-label={srLabel}
      title={srLabel}
    >
      <span aria-hidden="true">{marker}</span>
      <span>{formattedDelta}</span>
    </span>
  );
}

function getTrendPresentation(
  delta: number,
  direction: FitnessTestDirection,
): {
  marker: "+" | "-" | "=";
  toneClass: string;
  srLabel: string;
} {
  if (delta === 0) {
    return {
      marker: "=",
      toneClass: "text-muted-foreground",
      srLabel: pl.coach.athlete.tests.trend.unchanged,
    };
  }

  const improved = direction === "higher_is_better" ? delta > 0 : delta < 0;

  return {
    marker: delta > 0 ? "+" : "-",
    toneClass: improved ? "text-emerald-500" : "text-destructive",
    srLabel: improved
      ? pl.coach.athlete.tests.trend.improved
      : pl.coach.athlete.tests.trend.worsened,
  };
}

function formatDelta(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}
