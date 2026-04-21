"use client";

import { pl } from "@/lib/i18n/pl";
import type { AthletePublic } from "@/lib/types/athlete-public";
import LevelDisplay from "@/components/coach/LevelDisplay";

interface AthleteProfileViewProps {
  athlete: AthletePublic;
}

type SportKey = keyof typeof pl.coach.athlete.sport;
type PhaseKey = keyof typeof pl.coach.athlete.phase;
type GoalKey = keyof typeof pl.coach.athlete.goal;

/**
 * Read-only profile view shown on the athlete panel.
 * Mobile-first — single column on narrow viewports, two-column on tablet+.
 *
 * Reuses LevelDisplay from the coach side; it is a pure presentational
 * component that derives everything from training_start_date.
 */
export default function AthleteProfileView({
  athlete,
}: AthleteProfileViewProps) {
  const sportKey = athlete.sport as SportKey | null;
  const sportLabel =
    sportKey && sportKey in pl.coach.athlete.sport
      ? pl.coach.athlete.sport[sportKey]
      : athlete.sport;

  const phaseKey = athlete.current_phase as PhaseKey | null;
  const phaseLabel =
    phaseKey && phaseKey in pl.coach.athlete.phase
      ? pl.coach.athlete.phase[phaseKey]
      : athlete.current_phase;

  const goalKey = athlete.goal as GoalKey | null;
  const goalLabel =
    goalKey && goalKey in pl.coach.athlete.goal
      ? pl.coach.athlete.goal[goalKey]
      : athlete.goal;

  const profile = pl.coach.athlete.profile;

  return (
    <div className="bg-card border-border rounded-card border p-5 space-y-5">
      <h2 className="text-foreground text-lg font-semibold">{athlete.name}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={profile.age} value={formatNumber(athlete.age)} />
        <Field
          label={profile.weight}
          value={formatNumber(athlete.weight_kg)}
        />
        <Field
          label={profile.height}
          value={formatNumber(athlete.height_cm)}
        />
        <Field label={profile.sport} value={sportLabel} />
        <Field label={profile.currentPhase} value={phaseLabel} />
        <Field
          label={profile.trainingDays}
          value={formatNumber(athlete.training_days_per_week)}
        />
        <Field
          label={profile.sessionMinutes}
          value={formatNumber(athlete.session_minutes)}
        />
      </div>

      <LevelDisplay trainingStartDate={athlete.training_start_date} />

      {athlete.goal && (
        <Field label={profile.goal} value={goalLabel} multiline />
      )}

      {athlete.notes && (
        <Field label={profile.notes} value={athlete.notes} multiline />
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string | number | null;
  multiline?: boolean;
}

function Field({ label, value, multiline = false }: FieldProps) {
  if (value === null || value === "") return null;
  return (
    <div>
      <p className="text-muted-foreground mb-0.5 text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <p
        className={
          multiline
            ? "text-foreground text-sm leading-relaxed whitespace-pre-line"
            : "text-foreground text-sm font-medium"
        }
      >
        {value}
      </p>
    </div>
  );
}

function formatNumber(value: number | null): string | null {
  if (value === null) return null;
  return String(value);
}
