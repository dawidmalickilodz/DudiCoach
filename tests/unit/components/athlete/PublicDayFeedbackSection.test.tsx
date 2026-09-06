/// <reference types="vitest/globals" />

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { pl } from "@/lib/i18n/pl";
import PublicDayFeedbackSection from "@/components/athlete/PublicDayFeedbackSection";
import {
  PlanFeedbackRequestError,
  type PlanSessionFeedbackRow,
} from "@/lib/api/plan-feedback";

const mockFetchPublicDayFeedback = vi.fn();
const mockUpsertPublicDayFeedback = vi.fn();

vi.mock("@/lib/api/plan-feedback", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/plan-feedback")
  >("@/lib/api/plan-feedback");
  return {
    ...actual,
    fetchPublicDayFeedback: (...args: unknown[]) =>
      mockFetchPublicDayFeedback(...(args as [])),
    upsertPublicDayFeedback: (...args: unknown[]) =>
      mockUpsertPublicDayFeedback(...(args as [])),
  };
});

function makeRow(
  overrides: Partial<PlanSessionFeedbackRow> = {},
): PlanSessionFeedbackRow {
  return {
    id: "feedback-1",
    plan_id: "plan-1",
    athlete_id: "athlete-1",
    week_number: 1,
    day_number: 1,
    feedback_text: "Solid session",
    session_date: "2026-05-27",
    session_status: "completed",
    session_rpe: 7,
    wellbeing: 4,
    pain_score: 2,
    pain_location: "knee",
    pain_side: "left",
    created_at: "2026-05-27T10:00:00Z",
    updated_at: "2026-05-27T10:00:00Z",
    ...overrides,
  };
}

function makeLegacyRow(
  overrides: Partial<PlanSessionFeedbackRow> = {},
): PlanSessionFeedbackRow {
  return makeRow({
    feedback_text: "Legacy feedback",
    session_date: null,
    session_status: null,
    session_rpe: null,
    wellbeing: null,
    pain_score: null,
    pain_location: null,
    pain_side: null,
    ...overrides,
  });
}

function setup() {
  return render(
    <PublicDayFeedbackSection
      shareCode="ABC234"
      planId="plan-1"
      weekNumber={1}
      dayNumber={1}
    />,
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolveFn) => {
    resolve = resolveFn;
  });
  return { promise, resolve };
}

async function fillStructuredOutcome(comment = "  New feedback  ") {
  fireEvent.change(await screen.findByLabelText(/Data treningu/i), {
    target: { value: "2026-05-27" },
  });
  fireEvent.change(screen.getByLabelText(/Status treningu/i), {
    target: { value: "completed" },
  });
  fireEvent.change(screen.getByLabelText(/RPE/i), {
    target: { value: "8" },
  });
  fireEvent.change(screen.getByLabelText(/Samopoczucie/i), {
    target: { value: "4" },
  });
  fireEvent.change(screen.getByLabelText(/Ból \(0-10\)/i), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText(/Miejsce bólu/i), {
    target: { value: "knee" },
  });
  fireEvent.change(screen.getByLabelText(/Strona bólu/i), {
    target: { value: "left" },
  });
  fireEvent.change(screen.getByLabelText(/Komentarz/i), {
    target: { value: comment },
  });
}

describe("PublicDayFeedbackSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPublicDayFeedback.mockResolvedValue(null);
    mockUpsertPublicDayFeedback.mockResolvedValue(makeRow());
  });

  it("requests the v2 public feedback contract and shows the health notice", async () => {
    setup();

    expect(
      await screen.findByText(/Podsumowanie treningu/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(pl.athletePanel.plan.feedback.healthNotice),
    ).toBeInTheDocument();
    expect(mockFetchPublicDayFeedback).toHaveBeenCalledWith({
      shareCode: "ABC234",
      planId: "plan-1",
      weekNumber: 1,
      dayNumber: 1,
      contractVersion: 2,
    });
  });

  it("loads existing structured feedback into the outcome form", async () => {
    mockFetchPublicDayFeedback.mockResolvedValueOnce(
      makeRow({ feedback_text: "Already saved" }),
    );

    setup();

    await waitFor(() => {
      expect(screen.getByLabelText(/Data treningu/i)).toHaveValue("2026-05-27");
      expect(screen.getByLabelText(/Status treningu/i)).toHaveValue(
        "completed",
      );
      expect(screen.getByLabelText(/RPE/i)).toHaveValue(7);
      expect(screen.getByLabelText(/Komentarz/i)).toHaveValue("Already saved");
    });
  });

  it("submits complete outcome through contract v2 and shows saved state", async () => {
    setup();

    await fillStructuredOutcome();
    fireEvent.click(
      screen.getByRole("button", { name: pl.athletePanel.plan.feedback.save }),
    );

    await waitFor(() => {
      expect(mockUpsertPublicDayFeedback).toHaveBeenCalledWith({
        shareCode: "ABC234",
        planId: "plan-1",
        weekNumber: 1,
        dayNumber: 1,
        contractVersion: 2,
        feedbackText: "New feedback",
        outcome: {
          sessionDate: "2026-05-27",
          sessionStatus: "completed",
          sessionRpe: 8,
          wellbeing: 4,
          painScore: 1,
          painLocation: "knee",
          painSide: "left",
        },
      });
      expect(screen.getByRole("status")).toHaveTextContent(
        pl.athletePanel.plan.feedback.saved,
      );
    });
  });

  it("allows optional comments for structured outcome", async () => {
    setup();

    await fillStructuredOutcome("   ");
    fireEvent.click(
      screen.getByRole("button", { name: pl.athletePanel.plan.feedback.save }),
    );

    await waitFor(() => {
      expect(mockUpsertPublicDayFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ feedbackText: null }),
      );
    });
  });

  it("keeps legacy text-only feedback editable through the v1 contract", async () => {
    mockFetchPublicDayFeedback.mockResolvedValueOnce(makeLegacyRow());
    mockUpsertPublicDayFeedback.mockResolvedValueOnce(
      makeLegacyRow({ feedback_text: "Updated legacy" }),
    );

    setup();

    const textarea = await screen.findByLabelText(/Twoja informacja zwrotna/i);
    fireEvent.change(textarea, { target: { value: "  Updated legacy  " } });
    fireEvent.click(
      screen.getByRole("button", { name: pl.athletePanel.plan.feedback.save }),
    );

    await waitFor(() => {
      expect(mockUpsertPublicDayFeedback).toHaveBeenCalledWith({
        shareCode: "ABC234",
        planId: "plan-1",
        weekNumber: 1,
        dayNumber: 1,
        feedbackText: "Updated legacy",
      });
    });
  });

  it("converts a legacy row after the athlete fills outcome", async () => {
    mockFetchPublicDayFeedback.mockResolvedValueOnce(makeLegacyRow());

    setup();

    await screen.findByText(pl.athletePanel.plan.feedback.legacyHelp);
    fireEvent.click(
      screen.getByRole("button", {
        name: pl.athletePanel.plan.feedback.addOutcome,
      }),
    );
    await fillStructuredOutcome("Legacy feedback plus outcome");
    fireEvent.click(
      screen.getByRole("button", { name: pl.athletePanel.plan.feedback.save }),
    );

    await waitFor(() => {
      expect(mockUpsertPublicDayFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ contractVersion: 2 }),
      );
    });
  });

  it("rejects incomplete outcome locally", async () => {
    setup();

    await screen.findByText(/Podsumowanie treningu/i);
    fireEvent.click(
      screen.getByRole("button", { name: pl.athletePanel.plan.feedback.save }),
    );

    expect(mockUpsertPublicDayFeedback).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      pl.athletePanel.plan.feedback.validationError,
    );
  });

  it("rejects legacy whitespace-only feedback locally", async () => {
    mockFetchPublicDayFeedback.mockResolvedValueOnce(makeLegacyRow());
    setup();

    const textarea = await screen.findByLabelText(/Twoja informacja zwrotna/i);
    fireEvent.change(textarea, { target: { value: "   \n\t" } });
    fireEvent.click(
      screen.getByRole("button", { name: pl.athletePanel.plan.feedback.save }),
    );

    expect(mockUpsertPublicDayFeedback).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      pl.athletePanel.plan.feedback.emptyError,
    );
  });

  it("rejects comments longer than 2000 characters locally", async () => {
    setup();

    await fillStructuredOutcome("a".repeat(2001));
    fireEvent.click(
      screen.getByRole("button", { name: pl.athletePanel.plan.feedback.save }),
    );

    expect(mockUpsertPublicDayFeedback).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      pl.athletePanel.plan.feedback.maxLengthError,
    );
  });

  it("shows generic save error on failed request", async () => {
    mockUpsertPublicDayFeedback.mockRejectedValueOnce(
      new PlanFeedbackRequestError(),
    );

    setup();

    await fillStructuredOutcome("Feedback");
    fireEvent.click(
      screen.getByRole("button", { name: pl.athletePanel.plan.feedback.save }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        pl.athletePanel.plan.feedback.saveError,
      );
    });
  });

  it("does not log feedback text to console", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    setup();

    await fillStructuredOutcome("Sensitive feedback");
    fireEvent.click(
      screen.getByRole("button", { name: pl.athletePanel.plan.feedback.save }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        pl.athletePanel.plan.feedback.saved,
      );
    });

    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("disables save button while saving", async () => {
    const deferred = createDeferred<PlanSessionFeedbackRow>();
    mockUpsertPublicDayFeedback.mockReturnValueOnce(deferred.promise);

    setup();

    await fillStructuredOutcome("Saving now");
    const button = screen.getByRole("button", {
      name: pl.athletePanel.plan.feedback.save,
    });
    const form = button.closest("form");

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(form).toHaveAttribute("aria-busy", "true");
    });

    deferred.resolve(makeRow({ feedback_text: "Saving now" }));

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
