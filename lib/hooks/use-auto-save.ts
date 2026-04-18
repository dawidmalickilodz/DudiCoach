"use client";

/**
 * useAutoSave — reusable hook for 800ms-debounced auto-save of react-hook-form forms.
 *
 * Design: ADR-0001 (docs/adr/0001-auto-save-with-react-hook-form-tanstack-query.md)
 *
 * - Uses watch(callback) subscription (not watch() re-render) for efficiency.
 * - Skips the first render when the form loads with server data via reset().
 * - Skips saves when the form has validation errors.
 * - Sends the full form payload on each save (not a diff).
 * - Returns { isSaving, lastSavedAt, saveError } for UI feedback.
 * - The consuming component owns the toast — it watches lastSavedAt.
 */

import { useEffect, useRef, useState } from "react";
import type {
  FieldValues,
  FormState,
  UseFormSetError,
  UseFormWatch,
} from "react-hook-form";

export interface UseAutoSaveOptions<TFormValues extends FieldValues> {
  watch: UseFormWatch<TFormValues>;
  formState: FormState<TFormValues>;
  setError: UseFormSetError<TFormValues>;
  mutationFn: (data: TFormValues) => Promise<unknown>;
  debounceMs?: number;
  publicErrorMessage?: string;
}

export interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;
}

export function useAutoSave<TFormValues extends FieldValues>({
  watch,
  formState,
  setError,
  mutationFn,
  debounceMs = 800,
  publicErrorMessage,
}: UseAutoSaveOptions<TFormValues>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const isFirstRender = useRef(true);

  // Stable ref for mutationFn to avoid re-subscribing on every render
  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;

  // We capture formState.errors in a ref so the subscription closure can read
  // the latest value without being re-subscribed on every error change.
  const errorsRef = useRef(formState.errors);
  errorsRef.current = formState.errors;

  useEffect(() => {
    const subscription = watch((formValues) => {
      // Skip the very first fire — form just loaded server data via reset()
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      // Skip if the form currently has validation errors
      if (Object.keys(errorsRef.current).length > 0) return;

      // Clear any in-flight debounce timer
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }

      // Schedule the save
      timeoutRef.current = setTimeout(() => {
        setIsSaving(true);
        setSaveError(null);

        void (async () => {
          try {
            await mutationFnRef.current(formValues as TFormValues);
            setLastSavedAt(new Date());
          } catch (err) {
            const message =
              publicErrorMessage ??
              (err instanceof Error ? err.message : "Save failed");
            setSaveError(message);
            setError("root", { message });
          } finally {
            setIsSaving(false);
          }
        })();
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watch, debounceMs, setError, publicErrorMessage]);

  return { isSaving, lastSavedAt, saveError };
}
