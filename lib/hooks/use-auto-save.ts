"use client";

/**
 * useAutoSave - reusable hook for debounced auto-save of react-hook-form forms.
 *
 * Design: ADR-0001 (docs/adr/0001-auto-save-with-react-hook-form-tanstack-query.md)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FieldValues,
  FormState,
  UseFormSetError,
  UseFormWatch,
} from "react-hook-form";

import { pl } from "@/lib/i18n/pl";
import { normalizeApiError } from "@/lib/utils/normalize-api-error";

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
  /** Flush any pending debounced save immediately. Returns after save completes. */
  flush: () => Promise<void>;
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
  const latestValuesRef = useRef<TFormValues | null>(null);

  // Stable ref for mutationFn to avoid re-subscribing on every render.
  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;

  // Keep latest form errors in a ref for the subscription callback.
  const errorsRef = useRef(formState.errors);
  errorsRef.current = formState.errors;

  // Flush: cancel pending debounce and fire immediately.
  const flushRef = useRef<() => Promise<void>>(() => Promise.resolve());
  flushRef.current = async () => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    const latestValues = latestValuesRef.current;
    if (!latestValues) return;
    if (Object.keys(errorsRef.current).length > 0) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await mutationFnRef.current(latestValues);
      setLastSavedAt(new Date());
    } catch (err) {
      const message = normalizeApiError(
        err,
        publicErrorMessage ?? pl.common.error,
      );
      setSaveError(message);
      setError("root", { message });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const scheduleSave = (delayMs: number, errorRetriesLeft: number) => {
      timeoutRef.current = setTimeout(() => {
        if (Object.keys(errorsRef.current).length > 0) {
          // Allow a few short retries so resolver errors can settle after rapid
          // typing (for example 6 -> 60), without infinite polling.
          if (errorRetriesLeft > 0) {
            scheduleSave(150, errorRetriesLeft - 1);
          }
          return;
        }

        const latestValues = latestValuesRef.current;
        if (!latestValues) return;

        setIsSaving(true);
        setSaveError(null);

        void (async () => {
          try {
            await mutationFnRef.current(latestValues);
            setLastSavedAt(new Date());
          } catch (err) {
            const message = normalizeApiError(
              err,
              publicErrorMessage ?? pl.common.error,
            );
            setSaveError(message);
            setError("root", { message });
          } finally {
            setIsSaving(false);
          }
        })();
      }, delayMs);
    };

    const subscription = watch((formValues) => {
      latestValuesRef.current = formValues as TFormValues;

      // Skip the first callback fire when the form hydrates via reset().
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }

      scheduleSave(debounceMs, 3);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watch, debounceMs, setError, publicErrorMessage]);

  const flush = useCallback(() => flushRef.current(), []);

  return { isSaving, lastSavedAt, saveError, flush };
}
