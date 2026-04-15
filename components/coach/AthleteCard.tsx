import Link from "next/link";

import { pl } from "@/lib/i18n/pl";
import type { Athlete } from "@/lib/types/athlete";
import { calculateLevel } from "@/lib/utils/calculate-level";

interface AthleteCardProps {
  athlete: Athlete;
}

export default function AthleteCard({ athlete }: AthleteCardProps) {
  const level = calculateLevel(athlete.training_start_date);

  return (
    <Link
      href={`/athletes/${athlete.id}`}
      className="bg-card border-border rounded-card hover:border-[var(--color-primary)]/60 block border p-4 transition-colors"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          {athlete.name}
        </h3>
        <span className="rounded-pill bg-[var(--color-input)] px-3 py-1 text-xs text-[var(--color-muted-foreground)]">
          {pl.coach.athlete.level[level.key]}
        </span>
      </div>

      <div className="space-y-1 text-sm text-[var(--color-muted-foreground)]">
        <p>
          {pl.coach.athlete.profile.sport}: {athlete.sport ?? "-"}
        </p>
        <p>
          {pl.coach.athlete.profile.age}: {athlete.age ?? "-"}
        </p>
      </div>
    </Link>
  );
}

