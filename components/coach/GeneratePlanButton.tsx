"use client";

import { pl } from "@/lib/i18n/pl";
import { cn } from "@/lib/utils";

interface GeneratePlanButtonProps {
  isGenerating: boolean;
  disabled?: boolean;
  onGenerate: () => void;
}

/**
 * Primary button for AI plan generation.
 * Shows spinner + hint text while generating.
 * Disabled while generating or when explicitly disabled.
 */
export default function GeneratePlanButton({
  isGenerating,
  disabled = false,
  onGenerate,
}: GeneratePlanButtonProps) {
  const isDisabled = isGenerating || disabled;

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
        {isGenerating && (
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
          />
        )}
        {isGenerating
          ? pl.coach.athlete.plans.generating
          : pl.coach.athlete.plans.generateButton}
      </button>

      {isGenerating && (
        <p className="text-muted-foreground text-xs">
          {pl.coach.athlete.plans.generatingHint}
        </p>
      )}
    </div>
  );
}
