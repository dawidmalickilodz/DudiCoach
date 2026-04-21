"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { getFitnessTestsForSport } from "@/lib/constants/fitness-tests";
import type { Sport } from "@/lib/constants/sports";
import { pl } from "@/lib/i18n/pl";
import {
  createFitnessTestResultSchema,
  type CreateFitnessTestResultInput,
} from "@/lib/validation/fitness-test";
import { useFitnessTests, useCreateFitnessTest } from "@/lib/hooks/use-fitness-tests";
import TestSelector from "./TestSelector";
import TestHistory from "./TestHistory";

interface TestsTabProps {
  athlete: {
    id: string;
    sport: string | null;
  };
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultTestKey(sport: string | null): string {
  const tests = getFitnessTestsForSport(sport as Sport | null);
  return tests[0]?.key ?? "";
}

export default function TestsTab({ athlete }: TestsTabProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  // Mirror the form's test_key in local state so TestSelector is controlled
  // without calling watch(), which triggers the react-hooks/incompatible-library rule.
  const [selectedTestKey, setSelectedTestKey] = useState<string>(
    () => defaultTestKey(athlete.sport),
  );

  const testsQuery = useFitnessTests(athlete.id);
  const createMutation = useCreateFitnessTest(athlete.id);

  const results = testsQuery.data ?? [];
  const isLoading = testsQuery.isLoading && results.length === 0;
  const hasError = Boolean(testsQuery.error) && results.length === 0;

  const { register, handleSubmit, formState, setValue, reset } =
    useForm<CreateFitnessTestResultInput>({
      resolver: zodResolver(createFitnessTestResultSchema),
      mode: "onChange",
      defaultValues: {
        test_key: selectedTestKey,
        value: 0,
        test_date: todayDateString(),
        notes: undefined,
      },
    });

  const isSubmitting = createMutation.isPending;

  function handleTestKeyChange(key: string) {
    setSelectedTestKey(key);
    setValue("test_key", key, { shouldValidate: true });
  }

  const onSubmit = handleSubmit(async (values) => {
    await createMutation.mutateAsync(values);
    // Keep the selected test but reset numeric/date fields
    reset({
      test_key: values.test_key,
      value: 0,
      test_date: todayDateString(),
      notes: undefined,
    });
    setIsFormOpen(false);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          {pl.coach.athlete.tests.sectionTitle}
        </h2>
        <button
          type="button"
          onClick={() => setIsFormOpen((prev) => !prev)}
          disabled={isSubmitting}
          className="rounded-input bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFormOpen
            ? pl.coach.athlete.tests.closeForm
            : pl.coach.athlete.tests.addResult}
        </button>
      </div>

      {isFormOpen && (
        <form
          onSubmit={onSubmit}
          className="rounded-card border border-border bg-card p-4 space-y-4"
          aria-busy={isSubmitting}
        >
          <fieldset disabled={isSubmitting} className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              {pl.coach.athlete.tests.formTitle}
            </h3>

            <FormField
              id="test-selector"
              label={pl.coach.athlete.tests.field.testName}
              error={formState.errors.test_key?.message}
            >
              <TestSelector
                sport={athlete.sport}
                value={selectedTestKey}
                onChange={handleTestKeyChange}
                disabled={isSubmitting}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="test-value"
                label={pl.coach.athlete.tests.field.value}
                error={formState.errors.value?.message}
              >
                <input
                  id="test-value"
                  type="number"
                  step="any"
                  min="0"
                  className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  {...register("value", {
                    setValueAs: (v: unknown) => {
                      const n = Number(v);
                      return isNaN(n) ? 0 : n;
                    },
                  })}
                />
              </FormField>

              <FormField
                id="test-date"
                label={pl.coach.athlete.tests.field.date}
                error={formState.errors.test_date?.message}
              >
                <input
                  id="test-date"
                  type="date"
                  className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  {...register("test_date")}
                />
              </FormField>
            </div>

            <FormField
              id="test-notes"
              label={pl.coach.athlete.tests.field.notes}
              error={formState.errors.notes?.message}
            >
              <textarea
                id="test-notes"
                rows={2}
                className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm resize-y disabled:cursor-not-allowed disabled:opacity-60"
                {...register("notes", {
                  setValueAs: (v: unknown) =>
                    v === "" || v === null || v === undefined
                      ? undefined
                      : String(v),
                })}
              />
            </FormField>

            {createMutation.error && (
              <p role="alert" className="text-sm text-destructive">
                {pl.common.error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="rounded-input border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pl.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-input bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? pl.coach.athlete.tests.saving
                  : pl.coach.athlete.tests.saveResult}
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {isLoading && (
        <div className="rounded-card border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {pl.coach.athlete.tests.loading}
          </p>
        </div>
      )}

      {hasError && (
        <div className="rounded-card border border-destructive/30 bg-card px-4 py-3">
          <p role="alert" className="text-sm text-destructive">
            {pl.coach.athlete.tests.errorGeneric}
          </p>
        </div>
      )}

      {!isLoading && !hasError && (
        <TestHistory athleteId={athlete.id} results={results} />
      )}
    </div>
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
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
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
