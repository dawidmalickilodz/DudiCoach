"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pl } from "@/lib/i18n/pl";
import type { Athlete } from "@/lib/api/athletes";
import {
  DuplicateActiveJobError,
  fetchPlanGenerationJobStatus,
  fetchPlans,
  IncompleteDataError,
  planJobKeys,
  planKeys,
  RateLimitError,
  startPlanGenerationJob,
  type PlanGenerationJob,
  type PlanJobStatus,
  type TrainingPlan,
} from "@/lib/api/plans";
import PlanGenerateSection from "./PlanGenerateSection";
import PlanList from "./PlanList";
import PlanViewer from "./PlanViewer";

interface PlanTabContentProps {
  athlete: Athlete;
}

const POLL_TIMEOUT_MS = 180_000;
const POLL_FAST_MS = 2_000;
const POLL_MEDIUM_MS = 3_000;
const POLL_SLOW_MS = 5_000;

/**
 * Container for the "Plany" tab.
 * Owns:
 *  - fetching the athlete's plans (TanStack Query)
 *  - the currently-selected plan id (default: newest)
 *  - async plan-generation job start + polling + status mapping
 *
 * Layout:
 *  +--------------------------------------------------+
 *  |  PlanGenerateSection (context + generate button) |
 *  +--------------------------------------------------+
 *  |  PlanList (sidebar of historical plans)          |
 *  |  PlanViewer (selected plan rendered in detail)   |
 *  +--------------------------------------------------+
 *
 * See: docs/design/US-005-design.md §6
 */
export default function PlanTabContent({ athlete }: PlanTabContentProps) {
  const queryClient = useQueryClient();

  const plansQuery = useQuery<TrainingPlan[]>({
    queryKey: planKeys.byAthlete(athlete.id),
    queryFn: () => fetchPlans(athlete.id),
  });

  const plans = plansQuery.data ?? [];
  // User-driven selection (null = "use the default newest plan").
  // We derive the effective selection during render so React doesn't need
  // an effect to keep it in sync with the plan list (avoids cascading renders).
  const [userSelectedId, setUserSelectedId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobStartedAtMs, setActiveJobStartedAtMs] = useState<number | null>(
    null,
  );
  const [isPollTimedOut, setIsPollTimedOut] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState<PlanJobStatus | null>(
    null,
  );
  const [terminalErrorCode, setTerminalErrorCode] = useState<string | null>(null);

  const startJobMutation = useMutation({
    mutationFn: () => startPlanGenerationJob(athlete.id),
    onMutate: () => {
      setTerminalStatus(null);
      setTerminalErrorCode(null);
      setIsPollTimedOut(false);
    },
    onSuccess: (job) => {
      setActiveJobId(job.id);
      setActiveJobStartedAtMs(Date.now());
    },
  });

  const jobStatusQuery = useQuery<PlanGenerationJob>({
    queryKey: activeJobId
      ? planJobKeys.detail(activeJobId)
      : [...planJobKeys.all, "inactive"],
    queryFn: () => fetchPlanGenerationJobStatus(activeJobId!),
    enabled: Boolean(activeJobId) && !isPollTimedOut,
    retry: false,
    refetchInterval: (query) => {
      if (!activeJobId || isPollTimedOut) return false;
      const status = query.state.data?.status;
      if (status === "succeeded" || status === "failed" || status === "cancelled") {
        return false;
      }

      const startedAt = activeJobStartedAtMs ?? Date.now();
      const elapsed = Date.now() - startedAt;
      if (elapsed >= POLL_TIMEOUT_MS) return false;
      if (elapsed >= 90_000) return POLL_SLOW_MS;
      if (elapsed >= 30_000) return POLL_MEDIUM_MS;
      return POLL_FAST_MS;
    },
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!activeJobId || !activeJobStartedAtMs) return;

    const elapsed = Date.now() - activeJobStartedAtMs;
    const remaining = POLL_TIMEOUT_MS - elapsed;
    if (remaining <= 0) {
      const timeoutId = window.setTimeout(() => {
        setIsPollTimedOut(true);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      setIsPollTimedOut(true);
    }, remaining);

    return () => window.clearTimeout(timeoutId);
  }, [activeJobId, activeJobStartedAtMs]);

  const activeJob = jobStatusQuery.data ?? null;
  const activeJobStatus = activeJob?.status ?? null;

  useEffect(() => {
    if (!activeJobId || !activeJobStatus) return;

    if (activeJobStatus === "succeeded") {
      void queryClient.invalidateQueries({
        queryKey: planKeys.byAthlete(athlete.id),
      });
      queueMicrotask(() => {
        // Prefer the newly-created plan id when available, fallback to newest.
        setUserSelectedId(activeJob?.plan_id ?? null);
        setActiveJobId(null);
        setActiveJobStartedAtMs(null);
        setIsPollTimedOut(false);
        setTerminalStatus(null);
        setTerminalErrorCode(null);
      });
      return;
    }

    if (activeJobStatus === "failed" || activeJobStatus === "cancelled") {
      queueMicrotask(() => {
        setTerminalStatus(activeJobStatus);
        setTerminalErrorCode(activeJob?.errorCode ?? activeJob?.error_code ?? null);
        setActiveJobId(null);
        setActiveJobStartedAtMs(null);
        setIsPollTimedOut(false);
      });
    }
  }, [activeJob, activeJobId, activeJobStatus, athlete.id, queryClient]);

  // Derive the effective selection during render:
  //  - if the user-selected plan still exists, show it
  //  - otherwise fall back to the newest plan (first in DESC list)
  //  - if there are no plans, no selection
  const selectedPlan =
    plans.find((p) => p.id === userSelectedId) ?? plans[0] ?? null;
  const selectedId = selectedPlan?.id ?? null;
  const generateState = startJobMutation.isPending
    ? "posting"
    : activeJobId
      ? activeJobStatus === "processing"
        ? "processing"
        : "queued"
      : "idle";
  const isDuplicateConflict = startJobMutation.error instanceof DuplicateActiveJobError;
  const startErrorMessage = mapJobStartErrorToMessage(startJobMutation.error);
  const pollingErrorMessage = mapPollingErrorToMessage(jobStatusQuery.error);
  const failedMessage = mapTerminalFailureMessage(terminalStatus, terminalErrorCode);

  const feedbackKind = isPollTimedOut
    ? "poll_timeout"
    : failedMessage
      ? "failed"
      : activeJobId && pollingErrorMessage
        ? "polling_error"
        : startErrorMessage
          ? "start_error"
          : null;

  const handleStartGeneration = () => {
    startJobMutation.reset();
    setTerminalStatus(null);
    setTerminalErrorCode(null);
    setIsPollTimedOut(false);
    startJobMutation.mutate();
  };

  const handleRefresh = async () => {
    if (activeJobId) {
      setIsPollTimedOut(false);
      setActiveJobStartedAtMs(Date.now());
      await jobStatusQuery.refetch();
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: planKeys.byAthlete(athlete.id),
    });
    startJobMutation.reset();
  };

  return (
    <div className="space-y-6">
      <PlanGenerateSection
        athlete={athlete}
        planCount={plans.length}
        generateState={generateState}
        onGenerate={handleStartGeneration}
      />

      {feedbackKind === "poll_timeout" && (
        <p
          role="alert"
          className="text-destructive bg-destructive/10 border-destructive/30 rounded-card border px-4 py-3 text-sm"
        >
          {pl.coach.athlete.plans.pollTimeout}
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="ml-3 underline underline-offset-4"
          >
            {pl.coach.athlete.plans.refreshStatus}
          </button>
        </p>
      )}

      {feedbackKind === "failed" && failedMessage && (
        <p
          role="alert"
          className="text-destructive bg-destructive/10 border-destructive/30 rounded-card border px-4 py-3 text-sm"
        >
          {failedMessage}
          <button
            type="button"
            onClick={handleStartGeneration}
            className="ml-3 underline underline-offset-4"
          >
            {pl.common.tryAgain}
          </button>
        </p>
      )}

      {feedbackKind === "polling_error" && pollingErrorMessage && (
        <p
          role="alert"
          className="text-destructive bg-destructive/10 border-destructive/30 rounded-card border px-4 py-3 text-sm"
        >
          {pollingErrorMessage}
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="ml-3 underline underline-offset-4"
          >
            {pl.coach.athlete.plans.refreshStatus}
          </button>
        </p>
      )}

      {feedbackKind === "start_error" && startErrorMessage && (
        <p
          role="alert"
          className="text-destructive bg-destructive/10 border-destructive/30 rounded-card border px-4 py-3 text-sm"
        >
          {startErrorMessage}
          {isDuplicateConflict && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="ml-3 underline underline-offset-4"
            >
              {pl.coach.athlete.plans.refreshStatus}
            </button>
          )}
        </p>
      )}

      {plansQuery.isLoading ? (
        <p className="text-muted-foreground text-sm">{pl.common.loading}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside aria-label={pl.coach.athlete.tabs.plans}>
            <PlanList
              plans={plans}
              selectedId={selectedId}
              onSelect={setUserSelectedId}
            />
          </aside>

          <section>
            {selectedPlan ? (
              <PlanViewer key={selectedPlan.id} plan={selectedPlan} />
            ) : (
              <p className="text-muted-foreground text-sm">
                {pl.coach.athlete.plans.noPlan}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Maps typed start-job errors to user-facing Polish strings.
// All branches must come from pl.ts; never hardcode error text.
// ---------------------------------------------------------------------------

function mapJobStartErrorToMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof DuplicateActiveJobError)
    return pl.coach.athlete.plans.errorAlreadyInProgress;
  if (error instanceof IncompleteDataError)
    return pl.coach.athlete.plans.errorIncompleteData;
  if (error instanceof RateLimitError)
    return pl.coach.athlete.plans.errorRateLimit;
  return pl.coach.athlete.plans.errorGeneric;
}

function mapPollingErrorToMessage(error: unknown): string | null {
  if (!error) return null;
  return pl.coach.athlete.plans.errorGeneric;
}

function mapTerminalFailureMessage(
  status: PlanJobStatus | null,
  errorCode: string | null,
): string | null {
  if (!status) return null;
  if (status === "cancelled") return pl.coach.athlete.plans.errorCancelled;
  if (errorCode === "provider_timeout") return pl.coach.athlete.plans.errorTimeout;
  return pl.coach.athlete.plans.errorJobFailed;
}
