import { pl } from "@/lib/i18n/pl";

interface TrendIndicatorProps {
  direction: "higher_is_better" | "lower_is_better";
  current: number;
  previous: number;
  unit: string;
}

export default function TrendIndicator({
  direction,
  current,
  previous,
  unit,
}: TrendIndicatorProps) {
  const delta = current - previous;

  if (delta === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {"→ "}{pl.coach.athlete.tests.trend.flat}
      </span>
    );
  }

  const isImprovement =
    direction === "higher_is_better" ? delta > 0 : delta < 0;

  const colorClass = isImprovement ? "text-green-500" : "text-destructive";
  const arrow = delta > 0 ? "↑" : "↓";
  const absDelta = Math.abs(delta);

  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {arrow} {absDelta} {unit}
    </span>
  );
}
