"use client";

import { useState } from "react";

import { pl } from "@/lib/i18n/pl";
import { useInjuries } from "@/lib/hooks/use-injuries";
import type { Athlete } from "@/lib/api/athletes";
import InjuryCard from "./InjuryCard";
import InjuryCreateForm from "./InjuryCreateForm";

interface InjuriesTabProps {
  athlete: Athlete;
}

export default function InjuriesTab({ athlete }: InjuriesTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const injuriesQuery = useInjuries(athlete.id);
  const injuries = injuriesQuery.data ?? [];
  const hasError = Boolean(injuriesQuery.error);
  const hasInjuries = injuries.length > 0;
  const showInitialLoading = injuriesQuery.isLoading && !hasInjuries;
  const showEmptyState = !showInitialLoading && !hasError && injuries.length === 0;

  async function handleRetry() {
    await injuriesQuery.refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          {pl.coach.athlete.injuries.sectionTitle}
        </h2>

        <button
          type="button"
          onClick={() => setIsCreateOpen((prev) => !prev)}
          disabled={isCreateSubmitting}
          className="rounded-input bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreateOpen
            ? pl.coach.athlete.injuries.closeCreate
            : pl.coach.athlete.injuries.addButton}
        </button>
      </div>

      {isCreateOpen && (
        <InjuryCreateForm
          athleteId={athlete.id}
          onClose={() => setIsCreateOpen(false)}
          onSubmittingChange={setIsCreateSubmitting}
        />
      )}

      {showInitialLoading && (
        <div className="rounded-card border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {pl.coach.athlete.injuries.loading}
          </p>
        </div>
      )}

      {hasError && !hasInjuries && (
        <div className="rounded-card border border-destructive/30 bg-card px-4 py-3 space-y-3">
          <p role="alert" className="text-sm text-destructive">
            {pl.coach.athlete.injuries.errorGeneric}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            disabled={injuriesQuery.isFetching}
            className="rounded-input border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-input disabled:cursor-not-allowed disabled:opacity-60"
          >
            {injuriesQuery.isFetching ? pl.common.loading : pl.common.tryAgain}
          </button>
        </div>
      )}

      {showEmptyState && (
        <div className="rounded-card border border-border bg-card px-4 py-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            {pl.coach.athlete.injuries.empty}
          </p>
          <p className="text-xs text-muted-foreground">
            {pl.coach.athlete.injuries.emptyHint}
          </p>
        </div>
      )}

      {hasInjuries && (
        <div className="space-y-3">
          {injuries.map((injury) => (
            <InjuryCard
              key={injury.id}
              athleteId={athlete.id}
              injury={injury}
            />
          ))}
        </div>
      )}
    </div>
  );
}
