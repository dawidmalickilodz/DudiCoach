"use client";

import { pl } from "@/lib/i18n/pl";
import type { PlanSessionFeedbackRow } from "@/lib/api/plan-feedback";

interface CoachDayFeedbackDisplayProps {
  feedback: PlanSessionFeedbackRow | null;
}

const SESSION_STATUS_LABELS: Record<string, string> = {
  completed: "Wykonany",
  partial: "Częściowy",
  skipped: "Pominięty",
};

const PAIN_LOCATION_LABELS: Record<string, string> = {
  head: "Głowa",
  neck: "Szyja",
  shoulder: "Bark",
  chest_ribs: "Klatka / żebra",
  abdomen: "Brzuch",
  upper_back: "Górne plecy",
  lower_back: "Dolne plecy",
  pelvis_sacrum: "Miednica / kość krzyżowa",
  arm: "Ramię",
  elbow: "Łokieć",
  wrist_hand: "Nadgarstek / dłoń",
  hip_groin: "Biodro / pachwina",
  buttock: "Pośladek",
  thigh: "Udo",
  knee: "Kolano",
  lower_leg: "Podudzie",
  ankle_achilles: "Kostka / Achilles",
  foot: "Stopa",
  other: "Inne",
};

const PAIN_SIDE_LABELS: Record<string, string> = {
  left: "Lewa",
  right: "Prawa",
  bilateral: "Obustronnie",
  central: "Centralnie",
};

function hasStructuredOutcome(feedback: PlanSessionFeedbackRow): boolean {
  return (
    feedback.session_date !== null &&
    feedback.session_status !== null &&
    feedback.wellbeing !== null &&
    feedback.pain_score !== null
  );
}

function formatOptionalLabel(
  labels: Record<string, string>,
  value: string | null,
): string {
  if (!value) return pl.coach.athlete.plans.feedback.notApplicable;
  return labels[value] ?? value;
}

function formatSessionDate(value: string | null): string {
  if (!value) return pl.coach.athlete.plans.feedback.notApplicable;
  return new Date(`${value}T00:00:00`).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Read-only athlete feedback display for one plan day/session on coach view.
 * Plain-text rendering only (React escaping + whitespace-pre-wrap).
 */
export default function CoachDayFeedbackDisplay({
  feedback,
}: CoachDayFeedbackDisplayProps) {
  if (!feedback) return null;

  const updatedAt = new Date(feedback.updated_at).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="mt-4 rounded-input border border-border bg-input/40 p-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {pl.coach.athlete.plans.feedback.label}
      </p>

      {hasStructuredOutcome(feedback) ? (
        <div className="space-y-3">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">
                {pl.coach.athlete.plans.feedback.date}
              </dt>
              <dd className="font-medium text-foreground">
                {formatSessionDate(feedback.session_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {pl.coach.athlete.plans.feedback.status}
              </dt>
              <dd className="font-medium text-foreground">
                {formatOptionalLabel(
                  SESSION_STATUS_LABELS,
                  feedback.session_status,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {pl.coach.athlete.plans.feedback.rpe}
              </dt>
              <dd className="font-medium text-foreground">
                {feedback.session_rpe ??
                  pl.coach.athlete.plans.feedback.notApplicable}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {pl.coach.athlete.plans.feedback.wellbeing}
              </dt>
              <dd className="font-medium text-foreground">
                {feedback.wellbeing}/5
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {pl.coach.athlete.plans.feedback.painScore}
              </dt>
              <dd className={`font-medium ${(feedback.pain_score ?? 0) >= 7 ? "text-destructive" : "text-foreground"}`}>
                {feedback.pain_score}/10
                {(feedback.pain_score ?? 0) >= 7 && (
                  <span className="ml-1.5 text-xs font-normal">
                    ({pl.coach.athlete.plans.feedback.highPain ?? "wysoki"})
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {pl.coach.athlete.plans.feedback.painLocation}
              </dt>
              <dd className="font-medium text-foreground">
                {formatOptionalLabel(
                  PAIN_LOCATION_LABELS,
                  feedback.pain_location,
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {pl.coach.athlete.plans.feedback.painSide}
              </dt>
              <dd className="font-medium text-foreground">
                {formatOptionalLabel(PAIN_SIDE_LABELS, feedback.pain_side)}
              </dd>
            </div>
          </dl>
          <div>
            <p className="text-xs text-muted-foreground">
              {pl.coach.athlete.plans.feedback.comment}
            </p>
            {feedback.feedback_text ? (
              <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                {feedback.feedback_text}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {pl.coach.athlete.plans.feedback.noComment}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm text-foreground">
          {feedback.feedback_text}
        </p>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {pl.coach.athlete.plans.feedback.updatedAt}: {updatedAt}
      </p>
    </section>
  );
}
