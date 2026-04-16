import { pl } from "@/lib/i18n/pl";
import { cn } from "@/lib/utils";

interface InjurySeverityBadgeProps {
  severity: 1 | 2 | 3 | 4 | 5;
}

const SEVERITY_CLASSES: Record<InjurySeverityBadgeProps["severity"], string> = {
  1: "bg-success/15 text-success",
  2: "bg-lime-500/15 text-lime-400",
  3: "bg-yellow/15 text-yellow",
  4: "bg-warning/15 text-warning",
  5: "bg-destructive/15 text-destructive",
};

export default function InjurySeverityBadge({ severity }: InjurySeverityBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-pill px-2.5 py-0.5 text-xs font-semibold",
        SEVERITY_CLASSES[severity],
      )}
    >
      {pl.coach.athlete.injuries.severity[severity]}
    </span>
  );
}
