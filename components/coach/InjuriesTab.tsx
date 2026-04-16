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
  const injuriesQuery = useInjuries(athlete.id);
  const injuries = injuriesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          {pl.coach.athlete.injuries.sectionTitle}
        </h2>

        <button
          type="button"
          onClick={() => setIsCreateOpen((prev) => !prev)}
          className="rounded-input bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
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
        />
      )}

      {injuriesQuery.isLoading && (
        <p className="text-sm text-muted-foreground">{pl.common.loading}</p>
      )}

      {injuriesQuery.error && (
        <p role="alert" className="text-sm text-destructive">
          {pl.coach.athlete.injuries.errorGeneric}
        </p>
      )}

      {!injuriesQuery.isLoading && injuries.length === 0 && (
        <p className="rounded-card border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {pl.coach.athlete.injuries.empty}
        </p>
      )}

      {injuries.length > 0 && (
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
