import { cn } from "@/lib/utils";
import { calculateLevel } from "@/lib/utils/calculate-level";

/**
 * Colored pill badge showing the athlete's level based on training_start_date.
 * Returns null if no start date is set.
 */
interface LevelBadgeProps {
  trainingStartDate: string | null;
  className?: string;
}

export default function LevelBadge({
  trainingStartDate,
  className,
}: LevelBadgeProps) {
  const info = calculateLevel(trainingStartDate);
  if (!info) return null;

  const bgColorMap: Record<string, string> = {
    "text-success": "bg-success/15 text-success",
    "text-primary": "bg-primary/15 text-primary",
    "text-warning": "bg-warning/15 text-warning",
    "text-yellow": "bg-yellow/15 text-yellow",
  };

  const colorClass = bgColorMap[info.color] ?? "bg-muted/15 text-muted-foreground";

  return (
    <span
      className={cn(
        "rounded-pill inline-block px-3 py-1 text-xs font-medium",
        colorClass,
        className,
      )}
    >
      {info.label}
    </span>
  );
}
