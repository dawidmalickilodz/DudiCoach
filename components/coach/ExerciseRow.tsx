"use client";

import { pl } from "@/lib/i18n/pl";
import type { Exercise } from "@/lib/validation/training-plan";

interface ExerciseRowProps {
  exercise: Exercise;
  index: number;
}

/**
 * A single exercise row in the day card exercise table.
 * Shows all 7 fields: name, sets, reps, intensity, rest, tempo, notes.
 * Renders as a labeled grid on mobile, with labels from pl.ts.
 */
export default function ExerciseRow({ exercise, index }: ExerciseRowProps) {
  const { viewer } = pl.coach.athlete.plans;

  return (
    <div className="border-border border-b py-3 last:border-b-0">
      {/* Exercise name */}
      <p className="text-foreground text-sm font-medium mb-2">
        {index + 1}. {exercise.name}
      </p>

      {/* Parameters grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        <ExerciseParam label={viewer.exercise.sets} value={exercise.sets} />
        <ExerciseParam label={viewer.exercise.reps} value={exercise.reps} />
        <ExerciseParam
          label={viewer.exercise.intensity}
          value={exercise.intensity}
        />
        <ExerciseParam label={viewer.exercise.rest} value={exercise.rest} />
        <ExerciseParam label={viewer.exercise.tempo} value={exercise.tempo} />
        {exercise.notes && (
          <div className="col-span-2 sm:col-span-3">
            <ExerciseParam
              label={viewer.exercise.notes}
              value={exercise.notes}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface ExerciseParamProps {
  label: string;
  value: string;
}

function ExerciseParam({ label, value }: ExerciseParamProps) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}: </span>
      <span className="text-foreground text-xs font-medium">{value}</span>
    </div>
  );
}
