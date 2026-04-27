"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { pl } from "@/lib/i18n/pl";
import { updateAthleteSchema, type UpdateAthleteInput } from "@/lib/validation/athlete";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import { useUpdateAthlete } from "@/lib/hooks/use-athletes";
import { SPORTS } from "@/lib/constants/sports";
import { TRAINING_GOALS, type TrainingGoal } from "@/lib/constants/training-goals";
import {
  TRAINING_EXPERIENCE_BUCKETS,
  type TrainingExperienceBucket,
  dateFromBucket,
  bucketFromDate,
} from "@/lib/constants/training-experience";
import type { Athlete } from "@/lib/api/athletes";
import LevelDisplay from "./LevelDisplay";
import SaveStatusIndicator from "./SaveStatusIndicator";

interface AthleteProfileFormProps {
  athlete: Athlete;
}

const CURRENT_PHASES = [
  "preparatory",
  "base",
  "building",
  "peak",
  "transition",
] as const;

type CurrentPhase = (typeof CURRENT_PHASES)[number];

/**
 * Athlete profile editor form with 800ms auto-save.
 * Uses react-hook-form + zod + useAutoSave hook.
 * No "Save" button — all changes are persisted automatically.
 */
export default function AthleteProfileForm({ athlete }: AthleteProfileFormProps) {
  const updateMutation = useUpdateAthlete(athlete.id);

  // Bucket is separate local state because training_start_date stores an ISO
  // date, not the bucket enum. The bucket drives setValue("training_start_date")
  // so LevelDisplay and auto-save stay in sync through the existing watch().
  const [experienceBucket, setExperienceBucket] =
    useState<TrainingExperienceBucket | null>(() =>
      bucketFromDate(athlete.training_start_date),
    );

  const form = useForm<UpdateAthleteInput>({
    resolver: zodResolver(updateAthleteSchema),
    defaultValues: buildDefaultValues(athlete),
    mode: "onChange",
  });

  const {
    register,
    watch,
    formState,
    setError,
    reset,
    setValue,
  } = form;

  // Re-populate the form and bucket when the athlete changes (e.g. navigating
  // to a different athlete). Both reset and bucket must update together so
  // the bucket select never shows stale data after navigation.
  useEffect(() => {
    reset(buildDefaultValues(athlete));
    setExperienceBucket(bucketFromDate(athlete.training_start_date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athlete.id]);

  // Auto-save: debounced 800ms mutation on every valid form change
  const { isSaving, lastSavedAt, saveError } = useAutoSave<UpdateAthleteInput>({
    watch,
    formState,
    setError,
    mutationFn: async (data) => {
      // Defensive pre-check: debounce timing can briefly outrun async resolver
      // updates during numeric typing. Never send an invalid PATCH payload.
      const parsed = updateAthleteSchema.safeParse(data);
      if (!parsed.success) {
        return;
      }

      await updateMutation.mutateAsync(parsed.data);
    },
    debounceMs: 800,
    publicErrorMessage: pl.coach.athlete.online.errorGeneric,
  });

  const watchedStartDate = watch("training_start_date");

  const { errors } = formState;

  return (
    <div>
      {/* Save status — shown inline at the top of the form section */}
      <div className="mb-4 flex h-5 items-center justify-end">
        <SaveStatusIndicator
          isSaving={isSaving}
          lastSavedAt={lastSavedAt}
          saveError={saveError}
        />
      </div>

      <div className="space-y-5">
        {/* Name */}
        <FormField
          id="name"
          label={pl.coach.athlete.profile.name}
          error={errors.name?.message}
        >
          <input
            id="name"
            type="text"
            autoComplete="off"
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm"
            {...register("name")}
          />
        </FormField>

        {/* Sport */}
        <FormField
          id="sport"
          label={pl.coach.athlete.profile.sport}
          error={errors.sport?.message}
        >
          <select
            id="sport"
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm"
            {...register("sport", {
              setValueAs: (value) => (value === "" ? undefined : value),
            })}
          >
            <option value="">—</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {pl.coach.athlete.sport[s]}
              </option>
            ))}
          </select>
        </FormField>

        {/* Age */}
        <FormField
          id="age"
          label={pl.coach.athlete.profile.age}
          error={errors.age?.message}
        >
          <input
            id="age"
            type="number"
            inputMode="numeric"
            min={10}
            max={100}
            className="border-border bg-input text-foreground rounded-input w-24 border px-3 py-2 text-sm"
            {...register("age", { setValueAs: toOptionalNumber })}
          />
        </FormField>

        {/* Weight */}
        <FormField
          id="weight_kg"
          label={pl.coach.athlete.profile.weight}
          error={errors.weight_kg?.message}
        >
          <input
            id="weight_kg"
            type="number"
            inputMode="decimal"
            min={30}
            max={250}
            step={0.1}
            className="border-border bg-input text-foreground rounded-input w-24 border px-3 py-2 text-sm"
            {...register("weight_kg", { setValueAs: toOptionalNumber })}
          />
        </FormField>

        {/* Height */}
        <FormField
          id="height_cm"
          label={pl.coach.athlete.profile.height}
          error={errors.height_cm?.message}
        >
          <input
            id="height_cm"
            type="number"
            inputMode="numeric"
            min={100}
            max={250}
            className="border-border bg-input text-foreground rounded-input w-24 border px-3 py-2 text-sm"
            {...register("height_cm", { setValueAs: toOptionalNumber })}
          />
        </FormField>

        {/* Training seniority — bucket select; drives training_start_date via setValue */}
        <FormField
          id="training_experience_bucket"
          label={pl.coach.athlete.profile.trainingSeniority}
          error={errors.training_start_date?.message}
        >
          <select
            id="training_experience_bucket"
            value={experienceBucket ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                setExperienceBucket(null);
                setValue("training_start_date", undefined, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              } else {
                const bucket = raw as TrainingExperienceBucket;
                setExperienceBucket(bucket);
                setValue("training_start_date", dateFromBucket(bucket), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {TRAINING_EXPERIENCE_BUCKETS.map((bucket) => (
              <option key={bucket} value={bucket}>
                {pl.coach.athlete.trainingSeniority[bucket]}
              </option>
            ))}
          </select>
        </FormField>

        {/* Level display (read-only, reacts to training_start_date) */}
        <LevelDisplay trainingStartDate={watchedStartDate ?? null} />

        {/* Training days per week */}
        <FormField
          id="training_days_per_week"
          label={pl.coach.athlete.profile.trainingDays}
          error={errors.training_days_per_week?.message}
        >
          <input
            id="training_days_per_week"
            type="number"
            inputMode="numeric"
            min={1}
            max={7}
            className="border-border bg-input text-foreground rounded-input w-24 border px-3 py-2 text-sm"
            {...register("training_days_per_week", { setValueAs: toOptionalNumber })}
          />
        </FormField>

        {/* Session minutes */}
        <FormField
          id="session_minutes"
          label={pl.coach.athlete.profile.sessionMinutes}
          error={errors.session_minutes?.message}
        >
          <input
            id="session_minutes"
            type="number"
            inputMode="numeric"
            min={20}
            max={180}
            className="border-border bg-input text-foreground rounded-input w-24 border px-3 py-2 text-sm"
            {...register("session_minutes", { setValueAs: toOptionalNumber })}
          />
        </FormField>

        {/* Current phase */}
        <FormField
          id="current_phase"
          label={pl.coach.athlete.profile.currentPhase}
          error={errors.current_phase?.message}
        >
          <select
            id="current_phase"
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm"
            {...register("current_phase", {
              setValueAs: (value) => (value === "" ? undefined : value),
            })}
          >
            <option value="">—</option>
            {CURRENT_PHASES.map((phase) => (
              <option key={phase} value={phase}>
                {pl.coach.athlete.phase[phase as CurrentPhase]}
              </option>
            ))}
          </select>
        </FormField>

        {/* Goal — controlled dropdown; unknown/legacy values default to "—" */}
        <FormField
          id="goal"
          label={pl.coach.athlete.profile.goal}
          error={errors.goal?.message}
        >
          <select
            id="goal"
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm"
            {...register("goal", {
              setValueAs: (value: unknown) =>
                value === "" ? undefined : value,
            })}
          >
            <option value="">—</option>
            {TRAINING_GOALS.map((key) => (
              <option key={key} value={key}>
                {pl.coach.athlete.goal[key]}
              </option>
            ))}
          </select>
        </FormField>

        {/* Notes */}
        <FormField
          id="notes"
          label={pl.coach.athlete.profile.notes}
          error={errors.notes?.message}
        >
          <textarea
            id="notes"
            rows={3}
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm resize-y"
            {...register("notes")}
          />
        </FormField>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: build form default values from athlete data
// ---------------------------------------------------------------------------

function buildDefaultValues(athlete: Athlete): UpdateAthleteInput {
  // Guard goal: only pass the stored value if it matches a known key.
  // Legacy free-form text maps to undefined so it is treated as "not set" in
  // the form — the DB value is preserved until the coach actively picks a new
  // option (because undefined is omitted from the PATCH JSON payload).
  const storedGoal = athlete.goal;
  const validGoal = TRAINING_GOALS.includes(storedGoal as TrainingGoal)
    ? (storedGoal as TrainingGoal)
    : undefined;
  const storedPhase = athlete.current_phase;
  const validCurrentPhase = CURRENT_PHASES.includes(storedPhase as CurrentPhase)
    ? (storedPhase as CurrentPhase)
    : undefined;

  return {
    name: athlete.name ?? "",
    sport: athlete.sport ?? undefined,
    age: athlete.age ?? undefined,
    weight_kg: athlete.weight_kg ?? undefined,
    height_cm: athlete.height_cm ?? undefined,
    training_start_date: athlete.training_start_date ?? undefined,
    training_days_per_week: athlete.training_days_per_week ?? undefined,
    session_minutes: athlete.session_minutes ?? undefined,
    current_phase: validCurrentPhase,
    goal: validGoal,
    notes: athlete.notes ?? undefined,
  };
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// ---------------------------------------------------------------------------
// Helper component: labeled form field wrapper
// ---------------------------------------------------------------------------

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-foreground mb-1.5 block text-sm font-medium"
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-destructive mt-1.5 text-xs"
        >
          {error}
        </p>
      )}
    </div>
  );
}
