"use client";

import { useEffect, useRef, useState } from "react";

import { pl } from "@/lib/i18n/pl";

interface SaveStatusIndicatorProps {
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;
}

/**
 * Shows auto-save feedback in the editor header:
 *  - Spinner + "Zapisuję..." while saving
 *  - "✓ Zapisano" for 1.5s after a successful save (then fades out)
 *  - Error message in red if save failed
 */
export default function SaveStatusIndicator({
  isSaving,
  lastSavedAt,
  saveError,
}: SaveStatusIndicatorProps) {
  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Show "Zapisano" for 1.5s each time lastSavedAt changes.
  // Both setVisible calls happen in timer callbacks to avoid synchronous setState in effects.
  const lastSavedTime = lastSavedAt?.getTime() ?? null;

  useEffect(() => {
    if (!lastSavedTime) return;

    if (showTimerRef.current !== undefined) clearTimeout(showTimerRef.current);
    if (hideTimerRef.current !== undefined) clearTimeout(hideTimerRef.current);

    // Use 0ms timeout so setState runs outside the effect synchronous execution
    showTimerRef.current = setTimeout(() => setVisible(true), 0);
    hideTimerRef.current = setTimeout(() => setVisible(false), 1500);

    return () => {
      if (showTimerRef.current !== undefined) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current !== undefined) clearTimeout(hideTimerRef.current);
    };
  }, [lastSavedTime]);

  if (saveError) {
    return (
      <span
        role="status"
        aria-live="polite"
        className="text-destructive text-xs font-medium"
      >
        {saveError}
      </span>
    );
  }

  if (isSaving) {
    return (
      <span
        role="status"
        aria-live="polite"
        className="text-muted-foreground flex items-center gap-1.5 text-xs"
      >
        {/* Simple pulsing dot */}
        <span className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
        {pl.common.saving}
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className="text-success text-xs font-medium transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {pl.common.saved}
    </span>
  );
}
