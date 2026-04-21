"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { getFitnessTestsForSport } from "@/lib/constants/fitness-tests";
import { SPORTS, type Sport } from "@/lib/constants/sports";
import { pl } from "@/lib/i18n/pl";
import { useCreateFitnessTest, useDeleteFitnessTest, useFitnessTests } from "@/lib/hooks/use-fitness-tests";
import type { Athlete } from "@/lib/api/athletes";
import type { CreateFitnessTestResultInput } from "@/lib/validation/fitness-test";
import TestHistory from "./TestHistory";
import TestSelector from "./TestSelector";

interface TestsTabProps {
  athlete: Athlete;
}

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createTestFormSchema = z.object({
  test_key: z.string().trim().min(1, pl.coach.athlete.tests.validation.required),
  value: z
    .number()
    .refine(
      (value) => Number.isFinite(value) && value >= 0 && value <= 100000,
      pl.coach.athlete.tests.validation.valueInvalid,
    ),
  test_date: z
    .string()
    .regex(isoDateRegex, pl.coach.athlete.tests.validation.dateInvalid),
  notes: z
    .string()
    .max(1000, pl.coach.athlete.tests.validation.notesTooLong)
    .optional(),
});

type CreateTestFormValues = z.infer<typeof createTestFormSchema>;

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function TestsTab({ athlete }: TestsTabProps) {
  const testsQuery = useFitnessTests(athlete.id);
  const createMutation = useCreateFitnessTest(athlete.id);
  const deleteMutation = useDeleteFitnessTest(athlete.id);

  const normalizedSport = normalizeSport(athlete.sport);
  const availableTests = useMemo(
    () => getFitnessTestsForSport(normalizedSport),
    [normalizedSport],
  );
  const firstAvailableTestKey = availableTests[0]?.key ?? "";

  const form = useForm<CreateTestFormValues>({
    resolver: zodResolver(createTestFormSchema),
    mode: "onChange",
    defaultValues: {
      test_key: firstAvailableTestKey,
      value: undefined as unknown as number,
      test_date: todayDateString(),
      notes: "",
    },
  });

  const { register, formState, setValue, reset, resetField, handleSubmit, control } = form;
  const results = testsQuery.data ?? [];
  const selectedTestKey = useWatch({ control, name: "test_key" });

  useEffect(() => {
    if (firstAvailableTestKey.length === 0) return;

    const current = form.getValues("test_key");
    const stillAvailable = availableTests.some((item) => item.key === current);
    if (!stillAvailable) {
      setValue("test_key", firstAvailableTestKey, { shouldValidate: true });
    }
  }, [availableTests, firstAvailableTestKey, form, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const payload: CreateFitnessTestResultInput = {
      test_key: values.test_key,
      value: values.value,
      test_date: values.test_date,
      notes: values.notes?.trim() ? values.notes.trim() : undefined,
    };
    await createMutation.mutateAsync(payload);
    reset({
      test_key: values.test_key,
      value: undefined as unknown as number,
      test_date: todayDateString(),
      notes: "",
    });
    resetField("value");
  });

  const isMutating = createMutation.isPending || deleteMutation.isPending;
  const hasError = Boolean(testsQuery.error);
  const hasResults = results.length > 0;
  const showInitialLoading = testsQuery.isLoading && !hasResults;
  const showEmpty = !showInitialLoading && !hasError && !hasResults;

  async function handleRetry() {
    await testsQuery.refetch();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">
        {pl.coach.athlete.tests.sectionTitle}
      </h2>

      <form
        onSubmit={onSubmit}
        className="rounded-card border border-border bg-card p-4 space-y-4"
        aria-busy={isMutating}
      >
        <fieldset disabled={isMutating} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="fitness-test-key"
              label={pl.coach.athlete.tests.field.testKey}
              error={formState.errors.test_key?.message}
            >
              <TestSelector
                id="fitness-test-key"
                sport={athlete.sport}
                value={selectedTestKey ?? firstAvailableTestKey}
                disabled={isMutating}
                onChange={(value) =>
                  setValue("test_key", value, { shouldValidate: true })
                }
              />
            </FormField>

            <FormField
              id="fitness-test-value"
              label={pl.coach.athlete.tests.field.value}
              error={formState.errors.value?.message}
            >
              <input
                id="fitness-test-value"
                type="number"
                step="0.01"
                className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                placeholder={pl.coach.athlete.tests.field.valuePlaceholder}
                {...register("value", {
                  setValueAs: (value) =>
                    value === "" ? Number.NaN : Number(value),
                })}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="fitness-test-date"
              label={pl.coach.athlete.tests.field.testDate}
              error={formState.errors.test_date?.message}
            >
              <input
                id="fitness-test-date"
                type="date"
                className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                {...register("test_date")}
              />
            </FormField>

            <FormField
              id="fitness-test-notes"
              label={pl.coach.athlete.tests.field.notes}
              error={formState.errors.notes?.message}
            >
              <input
                id="fitness-test-notes"
                type="text"
                className="border-border bg-input text-foreground rounded-input w-full border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                placeholder={pl.coach.athlete.tests.field.notesPlaceholder}
                {...register("notes")}
              />
            </FormField>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={isMutating}
              className="rounded-input bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending
                ? pl.coach.athlete.tests.creating
                : pl.coach.athlete.tests.addButton}
            </button>
          </div>
        </fieldset>
      </form>

      {normalizedSport === null && (
        <p className="text-xs text-muted-foreground">
          {pl.coach.athlete.tests.sportMissingHint}
        </p>
      )}

      {createMutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {pl.coach.athlete.tests.errorGeneric}
        </p>
      )}

      {showInitialLoading && (
        <div className="rounded-card border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {pl.coach.athlete.tests.loading}
          </p>
        </div>
      )}

      {hasError && !hasResults && (
        <div className="rounded-card border border-destructive/30 bg-card px-4 py-3 space-y-3">
          <p role="alert" className="text-sm text-destructive">
            {pl.coach.athlete.tests.errorGeneric}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={testsQuery.isFetching}
            className="rounded-input border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-input disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testsQuery.isFetching ? pl.common.loading : pl.common.tryAgain}
          </button>
        </div>
      )}

      {showEmpty && (
        <div className="rounded-card border border-border bg-card px-4 py-3 space-y-2">
          <p className="text-sm text-muted-foreground">{pl.coach.athlete.tests.empty}</p>
          <p className="text-xs text-muted-foreground">
            {pl.coach.athlete.tests.emptyHint}
          </p>
        </div>
      )}

      {hasResults && (
        <TestHistory
          results={results}
          isDeleting={deleteMutation.isPending}
          deletingId={deleteMutation.variables?.testId ?? null}
          onDelete={(testId) => deleteMutation.mutate({ testId })}
        />
      )}

      {deleteMutation.error && (
        <p role="alert" className="text-sm text-destructive">
          {pl.coach.athlete.tests.errorGeneric}
        </p>
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function normalizeSport(value: string | null): Sport | null {
  if (value === null) return null;
  return (SPORTS as readonly string[]).includes(value) ? (value as Sport) : null;
}
