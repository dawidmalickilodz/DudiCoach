import { pl } from "@/lib/i18n/pl";
import type { Injury } from "@/lib/api/injuries";
import InjurySeverityBadge from "@/components/coach/InjurySeverityBadge";

interface InjuriesPublicSectionProps {
  injuries: Injury[];
}

const BODY_LOCATION_LABELS = pl.coach.athlete.injuries.bodyLocation as Record<string, string>;

export default function InjuriesPublicSection({
  injuries,
}: InjuriesPublicSectionProps) {
  return (
    <section className="rounded-card border border-border bg-card p-5 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        {pl.coach.athlete.tabs.injuries}
      </h2>

      {injuries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {pl.coach.athlete.injuries.publicEmpty}
        </p>
      ) : (
        <div className="space-y-3">
          {injuries.map((injury) => {
            const label = BODY_LOCATION_LABELS[injury.body_location];
            return (
              <article
                key={injury.id}
                className="rounded-input border border-border px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {injury.name}
                  </p>
                  <InjurySeverityBadge severity={injury.severity as 1 | 2 | 3 | 4 | 5} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {label ?? injury.body_location}
                  {" • "}
                  {injury.injury_date}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
