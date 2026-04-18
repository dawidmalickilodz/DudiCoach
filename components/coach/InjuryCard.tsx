"use client";

import { useState } from "react";

import { pl } from "@/lib/i18n/pl";
import { useDeleteInjury } from "@/lib/hooks/use-injuries";
import type { Injury } from "@/lib/api/injuries";
import InjuryEditForm from "./InjuryEditForm";
import InjurySeverityBadge from "./InjurySeverityBadge";
import InjuryStatusBadge from "./InjuryStatusBadge";

interface InjuryCardProps {
  athleteId: string;
  injury: Injury;
}

const BODY_LOCATION_LABELS = pl.coach.athlete.injuries.bodyLocation as Record<string, string>;

export default function InjuryCard({ athleteId, injury }: InjuryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const deleteMutation = useDeleteInjury(athleteId);

  function handleDelete() {
    if (!window.confirm(pl.coach.athlete.injuries.deleteConfirm)) return;
    deleteMutation.mutate({ injuryId: injury.id });
  }

  const bodyLocationLabel = BODY_LOCATION_LABELS[injury.body_location];
  const status = injury.status as "active" | "healing" | "healed";
  const severity = injury.severity as 1 | 2 | 3 | 4 | 5;

  return (
    <article className="rounded-card border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          disabled={deleteMutation.isPending}
          className="text-left flex-1"
          aria-expanded={expanded}
        >
          <p className="text-sm font-semibold text-foreground">{injury.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {bodyLocationLabel ?? injury.body_location}
            {" • "}
            {injury.injury_date}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            <InjurySeverityBadge severity={severity} />
            <InjuryStatusBadge status={status} />
          </div>
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="rounded-input border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
          aria-label={pl.common.delete}
        >
          {deleteMutation.isPending ? pl.coach.athlete.injuries.deleting : pl.common.delete}
        </button>
      </div>

      {deleteMutation.error && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : pl.coach.athlete.injuries.errorGeneric}
        </p>
      )}

      {expanded && (
        <div className="mt-4 border-t border-border pt-4">
          <InjuryEditForm
            athleteId={athleteId}
            injury={injury}
            disabled={deleteMutation.isPending}
          />
        </div>
      )}
    </article>
  );
}
