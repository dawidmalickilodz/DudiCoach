"use client";

import { useState } from "react";

import { getFitnessTestByKey } from "@/lib/constants/fitness-tests";
import { pl } from "@/lib/i18n/pl";
import { useDeleteFitnessTest } from "@/lib/hooks/use-fitness-tests";
import type { FitnessTestResult } from "@/lib/api/fitness-tests";
import TrendIndicator from "./TrendIndicator";

interface TestHistoryProps {
  athleteId: string;
  results: FitnessTestResult[];
}

export default function TestHistory({ athleteId, results }: TestHistoryProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteMutation = useDeleteFitnessTest(athleteId);

  if (results.length === 0) {
    return (
      <div className="rounded-card border border-border bg-card px-4 py-3 space-y-2">
        <p className="text-sm text-muted-foreground">
          {pl.coach.athlete.tests.empty}
        </p>
        <p className="text-xs text-muted-foreground">
          {pl.coach.athlete.tests.emptyHint}
        </p>
      </div>
    );
  }

  async function handleConfirmDelete(testId: string) {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync({ testId });
      setPendingDeleteId(null);
    } catch {
      setDeleteError(pl.common.error);
    }
  }

  function handleCancelDelete() {
    setPendingDeleteId(null);
    setDeleteError(null);
  }

  return (
    <div className="space-y-3">
      {results.map((result, index) => {
        const definition = getFitnessTestByKey(result.test_key);
        const testName = definition?.name ?? result.test_key;
        const unit = definition?.unit ?? "";
        const direction = definition?.direction ?? "higher_is_better";

        // Find the previous result with same test_key: the next item in the
        // sorted-by-date-DESC array that shares the same test_key.
        const previousResult = results
          .slice(index + 1)
          .find((r) => r.test_key === result.test_key);

        const isConfirming = pendingDeleteId === result.id;
        const isDeleting = isConfirming && deleteMutation.isPending;

        return (
          <div
            key={result.id}
            className="rounded-card border border-border bg-card px-4 py-3 space-y-2"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{testName}</p>
                <p className="text-xs text-muted-foreground">{result.test_date}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-base font-semibold text-foreground">
                  {result.value} {unit}
                </span>
                {previousResult !== undefined && definition !== undefined && (
                  <TrendIndicator
                    direction={direction}
                    current={result.value}
                    previous={previousResult.value}
                    unit={unit}
                  />
                )}
              </div>
            </div>

            {result.notes && (
              <p className="text-xs text-muted-foreground">{result.notes}</p>
            )}

            {!isConfirming && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPendingDeleteId(result.id);
                    setDeleteError(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  {pl.common.delete}
                </button>
              </div>
            )}

            {isConfirming && (
              <div className="space-y-2">
                {deleteError && (
                  <p role="alert" className="text-xs text-destructive">
                    {deleteError}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <p className="text-xs text-muted-foreground mr-auto">
                    {pl.coach.athlete.tests.deleteConfirm}
                  </p>
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    disabled={isDeleting}
                    className="rounded-input border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pl.coach.athlete.tests.cancelDelete}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmDelete(result.id)}
                    disabled={isDeleting}
                    className="rounded-input bg-destructive px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeleting
                      ? pl.coach.athlete.tests.deleting
                      : pl.coach.athlete.tests.confirmDelete}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
