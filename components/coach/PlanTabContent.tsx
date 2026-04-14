"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { pl } from "@/lib/i18n/pl";
import type { Athlete } from "@/lib/api/athletes";
import {
  fetchPlans,
  generatePlan,
  IncompleteDataError,
  planKeys,
  RateLimitError,
  TimeoutError,
  type TrainingPlan,
} from "@/lib/api/plans";
import PlanGenerateSection from "./PlanGenerateSection";
import PlanList from "./PlanList";
import PlanViewer from "./PlanViewer";

interface PlanTabContentProps {
  athlete: Athlete;
}

/**
 * Container for the "Plany" tab.
 * Owns:
 *  - fetching the athlete's plans (TanStack Query)
 *  - the currently-selected plan id (default: newest)
 *  - the AI generation mutation + error mapping to pl.ts strings
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

  const generateMutation = useMutation({
    mutationFn: () => generatePlan(athlete.id),
    onSuccess: (newPlan) => {
      void queryClient.invalidateQueries({
        queryKey: planKeys.byAthlete(athlete.id),
      });
      // Auto-select the freshly generated plan
      setUserSelectedId(newPlan.id);
    },
  });

  const errorMessage = mapErrorToMessage(generateMutation.error);

  // Derive the effective selection during render:
  //  - if the user-selected plan still exists, show it
  //  - otherwise fall back to the newest plan (first in DESC list)
  //  - if there are no plans, no selection
  const selectedPlan =
    plans.find((p) => p.id === userSelectedId) ?? plans[0] ?? null;
  const selectedId = selectedPlan?.id ?? null;

  return (
    <div className="space-y-6">
      <PlanGenerateSection
        athlete={athlete}
        planCount={plans.length}
        isGenerating={generateMutation.isPending}
        onGenerate={() => generateMutation.mutate()}
      />

      {errorMessage && (
        <p
          role="alert"
          className="text-destructive bg-destructive/10 border-destructive/30 rounded-card border px-4 py-3 text-sm"
        >
          {errorMessage}
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
// Maps typed errors from generatePlan() to user-facing Polish strings.
// All branches must come from pl.ts; never hardcode error text.
// ---------------------------------------------------------------------------

function mapErrorToMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof IncompleteDataError)
    return pl.coach.athlete.plans.errorIncompleteData;
  if (error instanceof RateLimitError)
    return pl.coach.athlete.plans.errorRateLimit;
  if (error instanceof TimeoutError)
    return pl.coach.athlete.plans.errorTimeout;
  return pl.coach.athlete.plans.errorGeneric;
}
