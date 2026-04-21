"use client";

import {
  getFitnessTestsForSport,
  type FitnessTestDefinition,
} from "@/lib/constants/fitness-tests";
import { SPORTS, type Sport } from "@/lib/constants/sports";

interface TestSelectorProps {
  id: string;
  sport: string | null;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export default function TestSelector({
  id,
  sport,
  value,
  disabled = false,
  onChange,
}: TestSelectorProps) {
  const normalizedSport = normalizeSport(sport);
  const options = getFitnessTestsForSport(normalizedSport);

  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {options.map((test) => (
        <option key={test.key} value={test.key}>
          {buildOptionLabel(test)}
        </option>
      ))}
    </select>
  );
}

function normalizeSport(value: string | null): Sport | null {
  if (value === null) return null;
  return (SPORTS as readonly string[]).includes(value) ? (value as Sport) : null;
}

function buildOptionLabel(test: FitnessTestDefinition): string {
  return `${test.name} (${test.unit})`;
}
