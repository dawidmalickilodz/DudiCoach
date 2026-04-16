"use client";

import { pl } from "@/lib/i18n/pl";
import { calculateLevel } from "@/lib/utils/calculate-level";
import LevelBadge from "./LevelBadge";

interface LevelDisplayProps {
  trainingStartDate: string | null | undefined;
}

/**
 * Read-only level display in the athlete editor.
 * Shows the level badge + a progress bar toward the next level.
 * Updates in real-time as training_start_date changes in the form.
 */
export default function LevelDisplay({ trainingStartDate }: LevelDisplayProps) {
  const info = calculateLevel(trainingStartDate ?? null);

  return (
    <div>
      <p className="text-foreground mb-1.5 text-sm font-medium">
        {pl.coach.athlete.profile.level}
      </p>

      {info ? (
        <div className="space-y-2">
          <LevelBadge trainingStartDate={trainingStartDate ?? null} />

          {/* Progress bar */}
          <div className="bg-border h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round(info.progressToNext * 100)}%` }}
              aria-valuenow={Math.round(info.progressToNext * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
            />
          </div>

          <p className="text-muted-foreground text-xs">
            {info.monthsTraining}{" "}
            {info.monthsTraining === 1 ? "miesiąc" : "miesięcy"} treningu
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">—</p>
      )}
    </div>
  );
}
