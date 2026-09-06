"use client";

import { useEffect, useMemo, useState } from "react";

import { pl } from "@/lib/i18n/pl";
import {
  PlanFeedbackNotFoundError,
  PlanFeedbackRequestError,
  PlanFeedbackValidationError,
  fetchPublicDayFeedback,
  type PlanSessionOutcomeInput,
  type PublicPlanSessionFeedbackRow,
  upsertPublicDayFeedback,
} from "@/lib/api/plan-feedback";
import {
  feedbackTextSchema,
  sanitizeFeedbackText,
} from "@/lib/validation/plan-session-feedback";

interface PublicDayFeedbackSectionProps {
  shareCode: string;
  planId: string;
  weekNumber: number;
  dayNumber: number;
}

type SessionStatus = PlanSessionOutcomeInput["sessionStatus"];
type PainLocation = NonNullable<PlanSessionOutcomeInput["painLocation"]>;
type PainSide = NonNullable<PlanSessionOutcomeInput["painSide"]>;

type FeedbackMode = "legacy" | "structured";

interface OutcomeDraft {
  sessionDate: string;
  sessionStatus: "" | SessionStatus;
  sessionRpe: string;
  wellbeing: string;
  painScore: string;
  painLocation: "" | PainLocation;
  painSide: "" | PainSide;
}

const FEEDBACK_MAX_LENGTH = 2000;

const SESSION_STATUS_OPTIONS: { value: SessionStatus; label: string }[] = [
  { value: "completed", label: "Wykonany" },
  { value: "partial", label: "Częściowy" },
  { value: "skipped", label: "Pominięty" },
];

const PAIN_LOCATION_OPTIONS: { value: PainLocation; label: string }[] = [
  { value: "head", label: "Głowa" },
  { value: "neck", label: "Szyja" },
  { value: "shoulder", label: "Bark" },
  { value: "chest_ribs", label: "Klatka / żebra" },
  { value: "abdomen", label: "Brzuch" },
  { value: "upper_back", label: "Górne plecy" },
  { value: "lower_back", label: "Dolne plecy" },
  { value: "pelvis_sacrum", label: "Miednica / kość krzyżowa" },
  { value: "arm", label: "Ramię" },
  { value: "elbow", label: "Łokieć" },
  { value: "wrist_hand", label: "Nadgarstek / dłoń" },
  { value: "hip_groin", label: "Biodro / pachwina" },
  { value: "buttock", label: "Pośladek" },
  { value: "thigh", label: "Udo" },
  { value: "knee", label: "Kolano" },
  { value: "lower_leg", label: "Podudzie" },
  { value: "ankle_achilles", label: "Kostka / Achilles" },
  { value: "foot", label: "Stopa" },
  { value: "other", label: "Inne" },
];

const PAIN_SIDE_OPTIONS: { value: PainSide; label: string }[] = [
  { value: "left", label: "Lewa" },
  { value: "right", label: "Prawa" },
  { value: "bilateral", label: "Obustronnie" },
  { value: "central", label: "Centralnie" },
];

function createEmptyOutcomeDraft(): OutcomeDraft {
  return {
    sessionDate: "",
    sessionStatus: "",
    sessionRpe: "",
    wellbeing: "",
    painScore: "",
    painLocation: "",
    painSide: "",
  };
}

function hasStructuredOutcome(row: PublicPlanSessionFeedbackRow): boolean {
  return (
    row.session_date !== null &&
    row.session_status !== null &&
    row.wellbeing !== null &&
    row.pain_score !== null
  );
}

function createOutcomeDraftFromRow(
  row: PublicPlanSessionFeedbackRow | null,
): OutcomeDraft {
  if (!row || !hasStructuredOutcome(row)) return createEmptyOutcomeDraft();

  return {
    sessionDate: row.session_date ?? "",
    sessionStatus: (row.session_status as SessionStatus | null) ?? "",
    sessionRpe: row.session_rpe === null ? "" : String(row.session_rpe),
    wellbeing: row.wellbeing === null ? "" : String(row.wellbeing),
    painScore: row.pain_score === null ? "" : String(row.pain_score),
    painLocation: (row.pain_location as PainLocation | null) ?? "",
    painSide: (row.pain_side as PainSide | null) ?? "",
  };
}

function parseInteger(value: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

function todayDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" });
}

/**
 * Public athlete feedback form for one concrete plan day/session.
 * New entries use v2 structured outcomes; legacy text-only rows stay editable.
 */
export default function PublicDayFeedbackSection({
  shareCode,
  planId,
  weekNumber,
  dayNumber,
}: PublicDayFeedbackSectionProps) {
  const [draft, setDraft] = useState("");
  const [outcomeDraft, setOutcomeDraft] = useState<OutcomeDraft>(() =>
    createEmptyOutcomeDraft(),
  );
  const [mode, setMode] = useState<FeedbackMode>("structured");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const label = useMemo(
    () =>
      pl.athletePanel.plan.feedback.textareaLabel
        .replace("{week}", String(weekNumber))
        .replace("{day}", String(dayNumber)),
    [weekNumber, dayNumber],
  );

  const fieldIdPrefix = useMemo(
    () => `feedback-${planId}-${weekNumber}-${dayNumber}`,
    [planId, weekNumber, dayNumber],
  );

  const today = useMemo(() => todayDateString(), []);
  const charCount = draft.length;
  const isOverLimit = charCount > FEEDBACK_MAX_LENGTH;
  const isRpeDisabled = outcomeDraft.sessionStatus === "skipped";
  const arePainDetailsDisabled = outcomeDraft.painScore === "0";

  useEffect(() => {
    let active = true;

    setIsLoadingInitial(true);
    setFieldError(null);
    setRequestError(null);
    setIsSaved(false);

    void (async () => {
      try {
        const row = await fetchPublicDayFeedback({
          shareCode,
          planId,
          weekNumber,
          dayNumber,
          contractVersion: 2,
        });

        if (!active) return;
        setDraft(row?.feedback_text ?? "");
        setOutcomeDraft(createOutcomeDraftFromRow(row));
        setMode(row && !hasStructuredOutcome(row) ? "legacy" : "structured");
      } catch (error) {
        if (!active) return;

        // Missing row is a valid state for first write.
        if (error instanceof PlanFeedbackNotFoundError) {
          setDraft("");
          setOutcomeDraft(createEmptyOutcomeDraft());
          setMode("structured");
        } else {
          setRequestError(pl.athletePanel.plan.feedback.loadError);
        }
      } finally {
        if (!active) return;
        setIsLoadingInitial(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [shareCode, planId, weekNumber, dayNumber]);

  function validateLegacyDraft(
    value: string,
  ): { ok: true; sanitized: string } | { ok: false; message: string } {
    const sanitized = sanitizeFeedbackText(value);

    if (sanitized.length === 0) {
      return {
        ok: false,
        message: pl.athletePanel.plan.feedback.emptyError,
      };
    }

    if (sanitized.length > FEEDBACK_MAX_LENGTH) {
      return {
        ok: false,
        message: pl.athletePanel.plan.feedback.maxLengthError,
      };
    }

    const parsed = feedbackTextSchema.safeParse(value);
    if (!parsed.success) {
      return {
        ok: false,
        message: pl.athletePanel.plan.feedback.saveError,
      };
    }

    return { ok: true, sanitized: parsed.data };
  }

  function validateStructuredDraft():
    | {
        ok: true;
        feedbackText: string | null;
        outcome: PlanSessionOutcomeInput;
      }
    | { ok: false; message: string } {
    const sanitized = sanitizeFeedbackText(draft);
    if (sanitized.length > FEEDBACK_MAX_LENGTH) {
      return {
        ok: false,
        message: pl.athletePanel.plan.feedback.maxLengthError,
      };
    }

    const sessionRpe = isRpeDisabled
      ? null
      : parseInteger(outcomeDraft.sessionRpe, 1, 10);
    const wellbeing = parseInteger(outcomeDraft.wellbeing, 1, 5);
    const painScore = parseInteger(outcomeDraft.painScore, 0, 10);

    if (
      !outcomeDraft.sessionDate ||
      outcomeDraft.sessionDate > today ||
      !outcomeDraft.sessionStatus ||
      (!isRpeDisabled && sessionRpe === null) ||
      wellbeing === null ||
      painScore === null
    ) {
      return {
        ok: false,
        message: pl.athletePanel.plan.feedback.validationError,
      };
    }

    if (
      painScore === 0 &&
      (outcomeDraft.painLocation || outcomeDraft.painSide)
    ) {
      return {
        ok: false,
        message: pl.athletePanel.plan.feedback.validationError,
      };
    }

    if (outcomeDraft.painSide && !outcomeDraft.painLocation) {
      return {
        ok: false,
        message: pl.athletePanel.plan.feedback.validationError,
      };
    }

    return {
      ok: true,
      feedbackText: sanitized.length > 0 ? sanitized : null,
      outcome: {
        sessionDate: outcomeDraft.sessionDate,
        sessionStatus: outcomeDraft.sessionStatus,
        sessionRpe,
        wellbeing,
        painScore,
        painLocation:
          painScore === 0 ? null : outcomeDraft.painLocation || null,
        painSide: painScore === 0 ? null : outcomeDraft.painSide || null,
      },
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFieldError(null);
    setRequestError(null);

    if (mode === "legacy") {
      const validation = validateLegacyDraft(draft);
      if (!validation.ok) {
        setIsSaved(false);
        setFieldError(validation.message);
        return;
      }

      setIsSaving(true);
      setIsSaved(false);

      try {
        const row = await upsertPublicDayFeedback({
          shareCode,
          planId,
          weekNumber,
          dayNumber,
          feedbackText: validation.sanitized,
        });

        setDraft(row.feedback_text ?? "");
        setIsSaved(true);
        setFieldError(null);
      } catch (error) {
        if (error instanceof PlanFeedbackValidationError) {
          setFieldError(pl.athletePanel.plan.feedback.saveError);
        } else if (
          error instanceof PlanFeedbackNotFoundError ||
          error instanceof PlanFeedbackRequestError
        ) {
          setRequestError(pl.athletePanel.plan.feedback.saveError);
        } else {
          setRequestError(pl.athletePanel.plan.feedback.saveError);
        }
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const validation = validateStructuredDraft();
    if (!validation.ok) {
      setIsSaved(false);
      setFieldError(validation.message);
      return;
    }

    setIsSaving(true);
    setIsSaved(false);

    try {
      const row = await upsertPublicDayFeedback({
        shareCode,
        planId,
        weekNumber,
        dayNumber,
        contractVersion: 2,
        feedbackText: validation.feedbackText,
        outcome: validation.outcome,
      });

      setDraft(row.feedback_text ?? "");
      if (hasStructuredOutcome(row)) {
        setOutcomeDraft(createOutcomeDraftFromRow(row));
        setMode("structured");
      }
      setIsSaved(true);
      setFieldError(null);
    } catch (error) {
      if (error instanceof PlanFeedbackValidationError) {
        setFieldError(pl.athletePanel.plan.feedback.saveError);
      } else if (
        error instanceof PlanFeedbackNotFoundError ||
        error instanceof PlanFeedbackRequestError
      ) {
        setRequestError(pl.athletePanel.plan.feedback.saveError);
      } else {
        setRequestError(pl.athletePanel.plan.feedback.saveError);
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value);
    setIsSaved(false);
    if (fieldError) setFieldError(null);
    if (requestError) setRequestError(null);
  }

  function handleOutcomeChange<K extends keyof OutcomeDraft>(
    key: K,
    value: OutcomeDraft[K],
  ) {
    setOutcomeDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "sessionStatus" && value === "skipped") next.sessionRpe = "";
      if (key === "painScore" && value === "0") {
        next.painLocation = "";
        next.painSide = "";
      }
      return next;
    });
    setIsSaved(false);
    if (fieldError) setFieldError(null);
    if (requestError) setRequestError(null);
  }

  function switchToStructuredMode() {
    setMode("structured");
    setFieldError(null);
    setRequestError(null);
    setIsSaved(false);
  }

  return (
    <section
      data-testid={`public-feedback-${weekNumber}-${dayNumber}`}
      className="mt-4 rounded-input border border-border bg-input/40 p-3"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {pl.athletePanel.plan.feedback.sectionTitle}
      </p>

      {isLoadingInitial ? (
        <p
          role="status"
          className="text-xs text-muted-foreground"
          aria-live="polite"
        >
          {pl.athletePanel.plan.feedback.loading}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          aria-busy={isSaving}
          className="space-y-3"
        >
          {mode === "legacy" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {pl.athletePanel.plan.feedback.legacyHelp}
              </p>
              <label
                htmlFor={`${fieldIdPrefix}-legacy-text`}
                className="block text-xs font-medium text-foreground"
              >
                {label}
              </label>
              <textarea
                id={`${fieldIdPrefix}-legacy-text`}
                value={draft}
                onChange={handleTextChange}
                rows={3}
                disabled={isSaving}
                className="w-full rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground resize-y"
                placeholder={pl.athletePanel.plan.feedback.placeholder}
              />
              <button
                type="button"
                onClick={switchToStructuredMode}
                disabled={isSaving}
                className="text-xs font-semibold text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pl.athletePanel.plan.feedback.addOutcome}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {pl.athletePanel.plan.feedback.structuredTitle}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pl.athletePanel.plan.feedback.healthNotice}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-foreground">
                  {pl.athletePanel.plan.feedback.dateLabel}
                  <input
                    type="date"
                    value={outcomeDraft.sessionDate}
                    onChange={(event) =>
                      handleOutcomeChange("sessionDate", event.target.value)
                    }
                    max={today}
                    disabled={isSaving}
                    aria-required="true"
                    className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                </label>

                <label className="block text-xs font-medium text-foreground">
                  {pl.athletePanel.plan.feedback.statusLabel}
                  <select
                    value={outcomeDraft.sessionStatus}
                    onChange={(event) =>
                      handleOutcomeChange(
                        "sessionStatus",
                        event.target.value as OutcomeDraft["sessionStatus"],
                      )
                    }
                    disabled={isSaving}
                    aria-required="true"
                    className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">
                      {pl.athletePanel.plan.feedback.statusPlaceholder}
                    </option>
                    {SESSION_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-medium text-foreground">
                  {pl.athletePanel.plan.feedback.rpeLabel}
                  <input
                    type="number"
                    min={1}
                    max={10}
                    aria-describedby={`${fieldIdPrefix}-rpe-help`}
                    aria-required={!isRpeDisabled}
                    value={outcomeDraft.sessionRpe}
                    onChange={(event) =>
                      handleOutcomeChange("sessionRpe", event.target.value)
                    }
                    disabled={isSaving || isRpeDisabled}
                    className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-50"
                  />
                  <span
                    id={`${fieldIdPrefix}-rpe-help`}
                    className="mt-1 block text-xs text-muted-foreground"
                  >
                    {pl.athletePanel.plan.feedback.rpeHelp}
                  </span>
                  {isRpeDisabled && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {pl.athletePanel.plan.feedback.rpeSkippedHint}
                    </span>
                  )}
                </label>

                <label className="block text-xs font-medium text-foreground">
                  {pl.athletePanel.plan.feedback.wellbeingLabel}
                  <input
                    type="number"
                    min={1}
                    max={5}
                    aria-describedby={`${fieldIdPrefix}-wellbeing-help`}
                    aria-required="true"
                    value={outcomeDraft.wellbeing}
                    onChange={(event) =>
                      handleOutcomeChange("wellbeing", event.target.value)
                    }
                    disabled={isSaving}
                    className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                  <span
                    id={`${fieldIdPrefix}-wellbeing-help`}
                    className="mt-1 block text-xs text-muted-foreground"
                  >
                    {pl.athletePanel.plan.feedback.wellbeingHelp}
                  </span>
                </label>

                <label className="block text-xs font-medium text-foreground">
                  {pl.athletePanel.plan.feedback.painScoreLabel}
                  <input
                    type="number"
                    min={0}
                    max={10}
                    aria-describedby={`${fieldIdPrefix}-pain-score-help`}
                    aria-required="true"
                    value={outcomeDraft.painScore}
                    onChange={(event) =>
                      handleOutcomeChange("painScore", event.target.value)
                    }
                    disabled={isSaving}
                    className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground"
                  />
                  <span
                    id={`${fieldIdPrefix}-pain-score-help`}
                    className="mt-1 block text-xs text-muted-foreground"
                  >
                    {pl.athletePanel.plan.feedback.painScoreHelp}
                  </span>
                </label>

                <label className="block text-xs font-medium text-foreground">
                  {pl.athletePanel.plan.feedback.painLocationLabel}
                  <select
                    value={outcomeDraft.painLocation}
                    onChange={(event) =>
                      handleOutcomeChange(
                        "painLocation",
                        event.target.value as OutcomeDraft["painLocation"],
                      )
                    }
                    disabled={isSaving || arePainDetailsDisabled}
                    className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-50"
                  >
                    <option value="">
                      {pl.athletePanel.plan.feedback.painLocationPlaceholder}
                    </option>
                    {PAIN_LOCATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs font-medium text-foreground">
                  {pl.athletePanel.plan.feedback.painSideLabel}
                  <select
                    value={outcomeDraft.painSide}
                    onChange={(event) =>
                      handleOutcomeChange(
                        "painSide",
                        event.target.value as OutcomeDraft["painSide"],
                      )
                    }
                    disabled={isSaving || arePainDetailsDisabled}
                    className="mt-1 w-full rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground disabled:opacity-50"
                  >
                    <option value="">
                      {pl.athletePanel.plan.feedback.painSidePlaceholder}
                    </option>
                    {PAIN_SIDE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label
                htmlFor={`${fieldIdPrefix}-comment`}
                className="block text-xs font-medium text-foreground"
              >
                {pl.athletePanel.plan.feedback.commentLabel}
              </label>
              <textarea
                id={`${fieldIdPrefix}-comment`}
                value={draft}
                onChange={handleTextChange}
                rows={3}
                disabled={isSaving}
                className="w-full rounded-input border border-border bg-card px-3 py-2 text-sm text-foreground resize-y"
                placeholder={pl.athletePanel.plan.feedback.commentPlaceholder}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <span
              className={
                isOverLimit
                  ? "text-xs text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {pl.athletePanel.plan.feedback.counter.replace(
                "{count}",
                String(charCount),
              )}
            </span>

            <button
              type="submit"
              disabled={isSaving || isLoadingInitial}
              className="rounded-input bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? pl.athletePanel.plan.feedback.saving
                : pl.athletePanel.plan.feedback.save}
            </button>
          </div>

          {isSaved && (
            <p
              role="status"
              aria-live="polite"
              className="text-xs text-success"
            >
              {pl.athletePanel.plan.feedback.saved}
            </p>
          )}

          {fieldError && (
            <p role="alert" className="text-xs text-destructive">
              {fieldError}
            </p>
          )}

          {requestError && (
            <p role="alert" className="text-xs text-destructive">
              {requestError}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
