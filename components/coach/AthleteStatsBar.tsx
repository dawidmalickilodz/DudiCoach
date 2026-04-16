import { pl } from "@/lib/i18n/pl";

/**
 * Displays the athlete count summary above the dashboard grid.
 * e.g. "3 zawodników"
 */
interface AthleteStatsBarProps {
  count: number;
}

export default function AthleteStatsBar({ count }: AthleteStatsBarProps) {
  const label = pl.coach.dashboard.athleteCount.replace(
    "{count}",
    String(count),
  );

  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-foreground text-sm font-medium">{label}</span>
    </div>
  );
}
