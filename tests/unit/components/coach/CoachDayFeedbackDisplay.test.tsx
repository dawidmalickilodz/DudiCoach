/// <reference types="vitest/globals" />

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CoachDayFeedbackDisplay from "@/components/coach/CoachDayFeedbackDisplay";
import type { PlanSessionFeedbackRow } from "@/lib/api/plan-feedback";

function makeRow(
  overrides: Partial<PlanSessionFeedbackRow> = {},
): PlanSessionFeedbackRow {
  return {
    id: "feedback-1",
    plan_id: "plan-1",
    athlete_id: "athlete-1",
    week_number: 2,
    day_number: 3,
    feedback_text: "Line 1\nLine 2",
    session_date: null,
    session_status: null,
    session_rpe: null,
    wellbeing: null,
    pain_score: null,
    pain_location: null,
    pain_side: null,
    created_at: "2026-05-27T10:00:00Z",
    updated_at: "2026-05-27T11:00:00Z",
    ...overrides,
  };
}

describe("CoachDayFeedbackDisplay", () => {
  it("renders feedback text when row is present", () => {
    render(<CoachDayFeedbackDisplay feedback={makeRow()} />);

    expect(
      screen.getByText(
        (content) => content.includes("Line 1") && content.includes("Line 2"),
      ),
    ).toBeInTheDocument();
  });

  it("renders script tags as escaped text, not HTML", () => {
    const payload = "<script>alert('xss')</script>";
    const { container } = render(
      <CoachDayFeedbackDisplay
        feedback={makeRow({ feedback_text: payload })}
      />,
    );

    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });

  it("preserves line breaks with safe styling", () => {
    render(
      <CoachDayFeedbackDisplay feedback={makeRow({ feedback_text: "a\nb" })} />,
    );

    const textNode = screen.getByText("a b");
    expect(textNode).toHaveClass("whitespace-pre-wrap");
  });

  it("renders updated timestamp", () => {
    render(<CoachDayFeedbackDisplay feedback={makeRow()} />);

    expect(screen.getByText(/Zaktualizowano/i)).toBeInTheDocument();
  });

  it("renders structured outcome values when present", () => {
    render(
      <CoachDayFeedbackDisplay
        feedback={makeRow({
          feedback_text: "Structured comment",
          session_date: "2026-05-27",
          session_status: "completed",
          session_rpe: 8,
          wellbeing: 4,
          pain_score: 2,
          pain_location: "knee",
          pain_side: "left",
        })}
      />,
    );

    expect(screen.getByText("27.05.2026")).toBeInTheDocument();
    expect(screen.getByText("Wykonany")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("4/5")).toBeInTheDocument();
    expect(screen.getByText("2/10")).toBeInTheDocument();
    expect(screen.getByText("Kolano")).toBeInTheDocument();
    expect(screen.getByText("Lewa")).toBeInTheDocument();
    expect(screen.getByText("Structured comment")).toBeInTheDocument();
  });

  it("renders no-comment copy for structured outcome without feedback text", () => {
    render(
      <CoachDayFeedbackDisplay
        feedback={makeRow({
          feedback_text: null,
          session_date: "2026-05-27",
          session_status: "skipped",
          session_rpe: null,
          wellbeing: 3,
          pain_score: 0,
        })}
      />,
    );

    expect(screen.getByText("Pominięty")).toBeInTheDocument();
    expect(screen.getAllByText("Nie dotyczy").length).toBeGreaterThan(0);
    expect(screen.getByText("Brak komentarza.")).toBeInTheDocument();
  });

  it("renders nothing when no feedback row exists", () => {
    const { container } = render(<CoachDayFeedbackDisplay feedback={null} />);
    expect(container.firstChild).toBeNull();
  });
});
