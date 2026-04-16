"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { BODY_LOCATIONS } from "@/lib/constants/body-locations";
import { pl } from "@/lib/i18n/pl";
import { useCreateInjury } from "@/lib/hooks/use-injuries";
import {
  createInjurySchema,
  type CreateInjuryInput,
} from "@/lib/validation/injury";

interface InjuryCreateFormProps {
  athleteId: string;
  onClose: () => void;
}

const STATUS_OPTIONS = ["active", "healing", "healed"] as const;
const SEVERITY_OPTIONS = [1, 2, 3, 4, 5] as const;
const BODY_LOCATION_LABELS = pl.coach.athlete.injuries.bodyLocation as Record<string, string>;

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function InjuryCreateForm({
  athleteId,
  onClose,
}: InjuryCreateFormProps) {
  const mutation = useCreateInjury(athleteId);

  const form = useForm<CreateInjuryInput>({
    resolver: zodResolver(createInjurySchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      body_location: "other",
      severity: 1,
      injury_date: todayDateString(),
      status: "active",
      notes: undefined,
    },
  });

  const { register, handleSubmit, formState } = form;

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
    onClose();
  });

  const mutationError = mutation.error instanceof Error
    ? mutation.error.message
    : null;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-card border border-border bg-card p-4 space-y-4"
    >
      <h3 className="text-sm font-semibold text-foreground">
        {pl.coach.athlete.injuries.createTitle}
      </h3>

      <FormField
        id="injury-create-name"
        label={pl.coach.athlete.injuries.field.name}
        error={formState.errors.name?.message}
      >
        <input
          id="injury-create-name"
          type="text"
          autoComplete="off"
          className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm"
          {...register("name")}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="injury-create-body-location"
          label={pl.coach.athlete.injuries.field.bodyLocation}
          error={formState.errors.body_location?.message}
        >
          <select
            id="injury-create-body-location"
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm"
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
          id="injury-create-severity"
          label={pl.coach.athlete.injuries.field.severity}
          error={formState.errors.severity?.message}
        >
          <select
            id="injury-create-severity"
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm"
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
          id="injury-create-date"
          label={pl.coach.athlete.injuries.field.injuryDate}
          error={formState.errors.injury_date?.message}
        >
          <input
            id="injury-create-date"
            type="date"
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm"
            {...register("injury_date")}
          />
        </FormField>

        <FormField
          id="injury-create-status"
          label={pl.coach.athlete.injuries.field.status}
          error={formState.errors.status?.message}
        >
          <select
            id="injury-create-status"
            className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm"
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
        id="injury-create-notes"
        label={pl.coach.athlete.injuries.field.notes}
        error={formState.errors.notes?.message}
      >
        <textarea
          id="injury-create-notes"
          rows={3}
          className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm resize-y"
          {...register("notes", {
            setValueAs: (value) => (value === "" ? undefined : value),
          })}
        />
      </FormField>

      {mutationError && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {mutationError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-input border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {pl.common.cancel}
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-input bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending
            ? pl.coach.athlete.injuries.creating
            : pl.coach.athlete.injuries.createSubmit}
        </button>
      </div>
    </form>
  );
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
