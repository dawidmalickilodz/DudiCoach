"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { createAthlete, updateAthlete } from "@/lib/api/athletes";
import { pl } from "@/lib/i18n/pl";
import type { Athlete, AthletePhase } from "@/lib/types/athlete";
import type {
  CreateAthleteInput,
  UpdateAthleteInput,
} from "@/lib/validation/athlete";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import AutoSaveIndicator from "@/components/coach/AutoSaveIndicator";
import LevelProgress from "@/components/coach/LevelProgress";

type Mode = "create" | "edit";

interface AthleteEditorFormProps {
  mode: Mode;
  athlete?: Athlete;
}

interface AthleteFormValues {
  name: string;
  sport: string;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  training_start_date: string | null;
  training_days_per_week: number | null;
  session_minutes: number | null;
  current_phase: AthletePhase | null;
  goal: string;
  notes: string;
}

function toFormValues(athlete?: Athlete): AthleteFormValues {
  return {
    name: athlete?.name ?? "",
    sport: athlete?.sport ?? "",
    age: athlete?.age ?? null,
    weight_kg: athlete?.weight_kg ?? null,
    height_cm: athlete?.height_cm ?? null,
    training_start_date: athlete?.training_start_date ?? null,
    training_days_per_week: athlete?.training_days_per_week ?? null,
    session_minutes: athlete?.session_minutes ?? null,
    current_phase: (athlete?.current_phase as AthletePhase | null) ?? null,
    goal: athlete?.goal ?? "",
    notes: athlete?.notes ?? "",
  };
}

function toNullableNumber(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  return value;
}

function toPayload(values: AthleteFormValues): CreateAthleteInput & UpdateAthleteInput {
  return {
    name: values.name.trim(),
    sport: values.sport.trim() || null,
    age: toNullableNumber(values.age),
    weight_kg: toNullableNumber(values.weight_kg),
    height_cm: toNullableNumber(values.height_cm),
    training_start_date: values.training_start_date || null,
    training_days_per_week: toNullableNumber(values.training_days_per_week),
    session_minutes: toNullableNumber(values.session_minutes),
    current_phase: values.current_phase || null,
    goal: values.goal.trim() || null,
    notes: values.notes.trim() || null,
  };
}

export default function AthleteEditorForm({ mode, athlete }: AthleteEditorFormProps) {
  const router = useRouter();
  const [createError, setCreateError] = useState<string | null>(null);

  const form = useForm<AthleteFormValues>({
    defaultValues: toFormValues(athlete),
  });

  const watched = useWatch({ control: form.control });
  const payload = useMemo(
    () => toPayload({ ...toFormValues(athlete), ...watched }),
    [athlete, watched],
  );

  const onAutoSave = useCallback(
    async (values: UpdateAthleteInput) => {
      if (!athlete) {
        return;
      }
      await updateAthlete(athlete.id, values);
    },
    [athlete],
  );

  const { status } = useAutoSave<UpdateAthleteInput>({
    values: payload,
    enabled: mode === "edit",
    onSave: onAutoSave,
  });

  const onCreate = form.handleSubmit(async (values) => {
    try {
      setCreateError(null);
      const created = await createAthlete(toPayload(values));
      router.push(`/athletes/${created.id}`);
      router.refresh();
    } catch {
      setCreateError(pl.common.error);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
          {`← ${pl.common.back}`}
        </Link>
        <AutoSaveIndicator status={mode === "edit" ? status : "idle"} />
      </div>

      <div className="inline-flex rounded-pill border border-[var(--color-border)] p-1">
        <span className="rounded-pill bg-[var(--color-primary)] px-4 py-1 text-sm font-medium text-[var(--color-primary-foreground)]">
          {pl.coach.athlete.tabs.profile}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <form onSubmit={onCreate} className="space-y-4">
          <div className="bg-card border-border rounded-card border p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pl.coach.athlete.profile.name}
                </span>
                <input
                  {...form.register("name", { required: true })}
                  className="w-full px-3 py-2"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pl.coach.athlete.profile.sport}
                </span>
                <input {...form.register("sport")} className="w-full px-3 py-2" />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pl.coach.athlete.profile.age}
                </span>
                <input
                  type="number"
                  {...form.register("age", { valueAsNumber: true })}
                  className="w-full px-3 py-2"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pl.coach.athlete.profile.weight}
                </span>
                <input
                  type="number"
                  step="0.1"
                  {...form.register("weight_kg", { valueAsNumber: true })}
                  className="w-full px-3 py-2"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pl.coach.athlete.profile.height}
                </span>
                <input
                  type="number"
                  {...form.register("height_cm", { valueAsNumber: true })}
                  className="w-full px-3 py-2"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pl.coach.athlete.profile.trainingStartDate}
                </span>
                <input
                  type="date"
                  {...form.register("training_start_date")}
                  className="w-full px-3 py-2"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pl.coach.athlete.profile.trainingDays}
                </span>
                <input
                  type="number"
                  {...form.register("training_days_per_week", { valueAsNumber: true })}
                  className="w-full px-3 py-2"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pl.coach.athlete.profile.sessionMinutes}
                </span>
                <input
                  type="number"
                  {...form.register("session_minutes", { valueAsNumber: true })}
                  className="w-full px-3 py-2"
                />
              </label>

              <label className="space-y-1">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pl.coach.athlete.profile.currentPhase}
                </span>
                <select
                  {...form.register("current_phase")}
                  className="w-full px-3 py-2"
                  defaultValue={payload.current_phase ?? ""}
                >
                  <option value="">-</option>
                  <option value="preparatory">{pl.coach.athlete.phase.preparatory}</option>
                  <option value="base">{pl.coach.athlete.phase.base}</option>
                  <option value="building">{pl.coach.athlete.phase.building}</option>
                  <option value="peak">{pl.coach.athlete.phase.peak}</option>
                  <option value="transition">{pl.coach.athlete.phase.transition}</option>
                </select>
              </label>

              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pl.coach.athlete.profile.goal}
                </span>
                <textarea {...form.register("goal")} rows={3} className="w-full px-3 py-2" />
              </label>

              <label className="space-y-1 sm:col-span-2">
                <span className="text-sm text-[var(--color-muted-foreground)]">
                  {pl.coach.athlete.profile.notes}
                </span>
                <textarea {...form.register("notes")} rows={4} className="w-full px-3 py-2" />
              </label>
            </div>
          </div>

          {mode === "create" && (
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-[6px] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)]"
              >
                {pl.common.add}
              </button>
              {createError && (
                <p className="text-sm text-[var(--color-destructive)]">{createError}</p>
              )}
            </div>
          )}
        </form>

        <div className="space-y-4">
          <LevelProgress trainingStartDate={payload.training_start_date ?? null} />
        </div>
      </div>
    </div>
  );
}
