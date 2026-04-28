"use client";

import { pl } from "@/lib/i18n/pl";
import { cn } from "@/lib/utils";

export type GeneratePlanButtonState =
  | "idle"
  | "posting"
  | "queued"
  | "processing";

interface GeneratePlanButtonProps {
  state: GeneratePlanButtonState;
  disabled?: boolean;
  onGenerate: () => void;
}

/**
 * Primary button for AI plan generation.
 * Shows spinner + hint text while generating.
 * Disabled while generating or when explicitly disabled.
 */
export default function GeneratePlanButton({
  state,
  disabled = false,
  onGenerate,
}: GeneratePlanButtonProps) {
  const isBusy = state !== "idle";
  const isDisabled = isBusy || disabled;
  const label =
    state === "idle"
      ? pl.coach.athlete.plans.generateButton
      : state === "processing"
        ? pl.coach.athlete.plans.processing
        : pl.coach.athlete.plans.queued;
  const hint =
    state === "processing"
      ? pl.coach.athlete.plans.processingHint
      : pl.coach.athlete.plans.queuedHint;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={isDisabled}
        onClick={onGenerate}
        className={cn(
          "flex items-center gap-2 rounded-pill px-5 py-2.5 text-sm font-semibold transition-colors",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2",
          isDisabled && "cursor-not-allowed opacity-60",
        )}
      >
        {isBusy && (
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
          />
        )}
        {label}
      </button>

      {isBusy && (
        <p className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}
