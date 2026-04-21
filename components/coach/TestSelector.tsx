import { getFitnessTestsForSport } from "@/lib/constants/fitness-tests";
import type { Sport } from "@/lib/constants/sports";
import { pl } from "@/lib/i18n/pl";

interface TestSelectorProps {
  sport: string | null;
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}

function toSport(value: string | null): Sport | null {
  if (value === null) return null;
  return value as Sport;
}

export default function TestSelector({
  sport,
  value,
  onChange,
  disabled = false,
}: TestSelectorProps) {
  const tests = getFitnessTestsForSport(toSport(sport));
  const hasSportSpecific = sport !== null && tests.some((t) => t.sports !== "all");
  const showSportNote = sport === null || !hasSportSpecific;

  return (
    <div className="space-y-1.5">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {tests.map((test) => (
          <option key={test.key} value={test.key}>
            {test.name}
          </option>
        ))}
      </select>
      {showSportNote && (
        <p className="text-xs text-muted-foreground">
          {pl.coach.athlete.tests.sportNotSet}
        </p>
      )}
    </div>
  );
}
