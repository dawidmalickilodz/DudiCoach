"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { BODY_LOCATIONS } from "@/lib/constants/body-locations";
import { pl } from "@/lib/i18n/pl";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import { useUpdateInjury } from "@/lib/hooks/use-injuries";
import type { Injury } from "@/lib/api/injuries";
import {
  updateInjurySchema,
  type UpdateInjuryInput,
} from "@/lib/validation/injury";
import SaveStatusIndicator from "./SaveStatusIndicator";

interface InjuryEditFormProps {
  athleteId: string;
  injury: Injury;
  disabled?: boolean;
}

const STATUS_OPTIONS = ["active", "healing", "healed"] as const;
const SEVERITY_OPTIONS = [1, 2, 3, 4, 5] as const;
const BODY_LOCATION_LABELS = pl.coach.athlete.injuries.bodyLocation as Record<string, string>;

export default function InjuryEditForm({
  athleteId,
  injury,
  disabled = false,
}: InjuryEditFormProps) {
  const mutation = useUpdateInjury(athleteId);

  const form = useForm<UpdateInjuryInput>({
    resolver: zodResolver(updateInjurySchema),
    mode: "onChange",
    defaultValues: buildDefaults(injury),
  });

  const { register, watch, formState, setError, reset } = form;

  useEffect(() => {
    reset(buildDefaults(injury));
  }, [injury, reset]);

  const { isSaving, lastSavedAt, saveError } = useAutoSave<UpdateInjuryInput>({
    watch,
    formState,
    setError,
    debounceMs: 800,
    mutationFn: (input) =>
      mutation.mutateAsync({
        injuryId: injury.id,
        input,
      }),
  });
  const isFormDisabled = disabled || isSaving || mutation.isPending;

  return (
    <div className="space-y-4" aria-busy={isFormDisabled}>
      <div className="flex h-5 items-center justify-end">
        <SaveStatusIndicator
          isSaving={isSaving}
          lastSavedAt={lastSavedAt}
          saveError={saveError}
        />
      </div>

      <fieldset disabled={isFormDisabled} className="space-y-4">
        <FormField
          id={`injury-edit-name-${injury.id}`}
          label={pl.coach.athlete.injuries.field.name}
          error={formState.errors.name?.message}
        >
          <input
            id={`injury-edit-name-${injury.id}`}
            type="text"
            autoComplete="off"
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            {...register("name")}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={`injury-edit-body-location-${injury.id}`}
            label={pl.coach.athlete.injuries.field.bodyLocation}
            error={formState.errors.body_location?.message}
          >
            <select
              id={`injury-edit-body-location-${injury.id}`}
              className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              {...register("body_location")}
            >
              {BODY_LOCATIONS.map((location) => (
                <option key={location.key} value={location.key}>
                  {BODY_LOCATION_LABELS[location.key] ?? location.label_pl}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id={`injury-edit-severity-${injury.id}`}
            label={pl.coach.athlete.injuries.field.severity}
            error={formState.errors.severity?.message}
          >
            <select
              id={`injury-edit-severity-${injury.id}`}
              className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              {...register("severity", {
                setValueAs: (value) => Number(value),
              })}
            >
              {SEVERITY_OPTIONS.map((severity) => (
                <option key={severity} value={severity}>
                  {pl.coach.athlete.injuries.severity[severity]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={`injury-edit-date-${injury.id}`}
            label={pl.coach.athlete.injuries.field.injuryDate}
            error={formState.errors.injury_date?.message}
          >
            <input
              id={`injury-edit-date-${injury.id}`}
              type="date"
              className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              {...register("injury_date")}
            />
          </FormField>

          <FormField
            id={`injury-edit-status-${injury.id}`}
            label={pl.coach.athlete.injuries.field.status}
            error={formState.errors.status?.message}
          >
            <select
              id={`injury-edit-status-${injury.id}`}
              className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              {...register("status")}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {pl.coach.athlete.injuries.status[status]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField
          id={`injury-edit-notes-${injury.id}`}
          label={pl.coach.athlete.injuries.field.notes}
          error={formState.errors.notes?.message}
        >
          <textarea
            id={`injury-edit-notes-${injury.id}`}
            rows={3}
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm resize-y disabled:cursor-not-allowed disabled:opacity-60"
            {...register("notes", {
              setValueAs: (value) => (value === "" ? undefined : value),
            })}
          />
        </FormField>
      </fieldset>
    </div>
  );
}

function buildDefaults(injury: Injury): UpdateInjuryInput {
  return {
    name: injury.name,
    body_location: injury.body_location,
    severity: injury.severity,
    injury_date: injury.injury_date,
    status: injury.status as "active" | "healing" | "healed",
    notes: injury.notes ?? undefined,
  };
}

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
