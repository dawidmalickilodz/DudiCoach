import { pl } from "@/lib/i18n/pl";
import { calculateLevel } from "@/lib/utils/calculate-level";

interface LevelProgressProps {
  trainingStartDate: string | null;
}

export default function LevelProgress({
  trainingStartDate,
}: LevelProgressProps) {
  const level = calculateLevel(trainingStartDate);
  const label = pl.coach.athlete.level[level.key];
  const months = Math.floor(level.months);

  return (
    <div className="bg-card border-border rounded-card border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-[var(--color-muted-foreground)]">
          {pl.coach.athlete.profile.level}
        </span>
        <span className="text-sm font-semibold text-[var(--color-foreground)]">
          {label}
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-[var(--color-input)]">
        <div
          className="h-2 rounded-full bg-[var(--color-primary)] transition-all"
          style={{ width: `${level.progressPct}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-[var(--color-muted)]">
        {pl.coach.athlete.levelMonths(months)}
      </p>
    </div>
  );
}

