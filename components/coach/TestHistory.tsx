"use client";

import { useMemo, useState } from "react";

import { getFitnessTestByKey } from "@/lib/constants/fitness-tests";
import { pl } from "@/lib/i18n/pl";
import type { FitnessTestResult } from "@/lib/api/fitness-tests";
import TrendIndicator from "./TrendIndicator";

interface TestHistoryProps {
  results: FitnessTestResult[];
  isDeleting: boolean;
  deletingId: string | null;
  onDelete: (testId: string) => void;
}

export default function TestHistory({
  results,
  isDeleting,
  deletingId,
  onDelete,
}: TestHistoryProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const sortedResults = useMemo(
    () =>
      [...results].sort((a, b) => {
        const byDate = b.test_date.localeCompare(a.test_date);
        if (byDate !== 0) return byDate;
        return b.created_at.localeCompare(a.created_at);
      }),
    [results],
  );

  return (
    <div className="space-y-3">
      {sortedResults.map((result, index) => {
        const test = getFitnessTestByKey(result.test_key);
        const previousResult = sortedResults
          .slice(index + 1)
          .find((older) => older.test_key === result.test_key);
        const isConfirming = confirmingId === result.id;
        const isRowDeleting = deletingId === result.id;

        return (
          <article
            key={result.id}
            className="rounded-card border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {test?.name ?? result.test_key}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(result.test_date)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-foreground">
                  {result.value} {test?.unit ?? ""}
                </p>
                {previousResult && test && (
                  <div className="mt-1">
                    <TrendIndicator
                      currentValue={result.value}
                      previousValue={previousResult.value}
                      direction={test.direction}
                    />
                  </div>
                )}
              </div>
            </div>

            {result.notes && (
              <p className="mt-3 text-xs text-muted-foreground">{result.notes}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              {!isConfirming ? (
                <button
                  type="button"
                  onClick={() => setConfirmingId(result.id)}
                  disabled={isDeleting}
                  className="rounded-input border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pl.common.delete}
                </button>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">
                    {pl.coach.athlete.tests.deleteConfirm}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(result.id)}
                    disabled={isDeleting}
                    className="rounded-input bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRowDeleting
                      ? pl.coach.athlete.tests.deleting
                      : pl.common.confirm}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    disabled={isDeleting}
                    className="rounded-input border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pl.common.cancel}
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pl-PL");
}
