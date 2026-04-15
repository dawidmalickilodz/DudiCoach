"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<TValues> {
  values: TValues;
  enabled: boolean;
  debounceMs?: number;
  savedVisibleMs?: number;
  onSave: (values: TValues) => Promise<void>;
}

interface UseAutoSaveResult {
  status: AutoSaveStatus;
  errorMessage: string | null;
}

export function useAutoSave<TValues>({
  values,
  enabled,
  debounceMs = 800,
  savedVisibleMs = 1500,
  onSave,
}: UseAutoSaveOptions<TValues>): UseAutoSaveResult {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPayloadRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    const payload = JSON.stringify(values);
    if (lastSavedPayloadRef.current === null) {
      lastSavedPayloadRef.current = payload;
      return;
    }

    if (payload === lastSavedPayloadRef.current) {
      return;
    }

    clearTimers();

    saveTimerRef.current = setTimeout(async () => {
      try {
        setErrorMessage(null);
        setStatus("saving");
        await onSave(values);
        lastSavedPayloadRef.current = payload;
        setStatus("saved");

        savedTimerRef.current = setTimeout(() => {
          setStatus("idle");
        }, savedVisibleMs);
      } catch {
        setStatus("error");
        setErrorMessage("save_failed");
      }
    }, debounceMs);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [
    values,
    enabled,
    debounceMs,
    savedVisibleMs,
    onSave,
    clearTimers,
  ]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return { status, errorMessage };
}
