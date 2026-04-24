/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { pl } from "@/lib/i18n/pl";
import PlanPublicSection from "@/components/athlete/PlanPublicSection";
import type { PublicTrainingPlan } from "@/lib/types/plan-public";
import type { Week } from "@/lib/validation/training-plan";

// ---------------------------------------------------------------------------
// Mock coach sub-components to isolate the unit under test.
// ---------------------------------------------------------------------------

vi.mock("@/components/coach/PlanHeader", () => ({
  default: ({ plan }: { plan: { plan_name: string } }) => (
    <div data-testid="plan-header">{plan.plan_name}</div>
  ),
}));

vi.mock("@/components/coach/WeekNavigation", () => ({
  default: ({
    activeWeek,
    onWeekChange,
  }: {
    activeWeek: number;
    onWeekChange: (n: number) => void;
  }) => (
    <div data-testid="week-navigation">
      <button type="button" onClick={() => onWeekChange(activeWeek)}>
        {`Tydzień ${activeWeek}`}
      </button>
    </div>
  ),
}));

vi.mock("@/components/coach/WeekView", () => ({
  default: ({ week }: { week: Week }) => (
    <div data-testid="week-view">{`Week ${week.weekNumber}`}</div>
  ),
}));

vi.mock("@/components/coach/PlanFooter", () => ({
  default: () => <div data-testid="plan-footer" />,
}));

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function makeWeek(weekNumber: number): Week {
  return {
    weekNumber,
    focus: `Tydzień ${weekNumber} fokus`,
    days: [
      {
        dayNumber: 1,
        dayName: "Poniedziałek",
        warmup: "Rozgrzewka",
        exercises: [
          {
            name: "Przysiad",
            sets: "4",
            reps: "8",
            intensity: "75%",
            rest: "120s",
            tempo: "30X0",
            notes: "",
          },
        ],
        cooldown: "Stretching",
        duration: "60 min",
      },
    ],
  };
}

function makePlan(overrides: Partial<PublicTrainingPlan> = {}): PublicTrainingPlan {
  return {
    id: "plan-uuid-001",
    plan_name: "Program siłowy 4-tyg.",
    phase: "base",
    plan_json: {
      planName: "Program siłowy 4-tyg.",
      phase: "base",
      summary: "Solidna baza siłowa",
      weeklyOverview: "4 sesje tygodniowo",
      weeks: [
        makeWeek(1),
        makeWeek(2),
        makeWeek(3),
        makeWeek(4),
      ],
      progressionNotes: "Zwiększ obciążenie o 2.5kg co tydzień",
      nutritionTips: "Jedz dużo białka",
      recoveryProtocol: "Śpij 8 godzin",
    },
    created_at: "2026-04-24T10:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PlanPublicSection", () => {
  it("renders empty state section title when plan is null", () => {
    render(<PlanPublicSection plan={null} />);

    expect(
      screen.getByText(pl.athletePanel.plan.sectionTitle),
    ).toBeInTheDocument();
  });

  it("renders empty state message when plan is null", () => {
    render(<PlanPublicSection plan={null} />);

    expect(screen.getByText(pl.athletePanel.plan.empty)).toBeInTheDocument();
  });

  it("does not render PlanHeader when plan is null", () => {
    render(<PlanPublicSection plan={null} />);

    expect(screen.queryByTestId("plan-header")).not.toBeInTheDocument();
  });

  it("does not render WeekNavigation when plan is null", () => {
    render(<PlanPublicSection plan={null} />);

    expect(screen.queryByTestId("week-navigation")).not.toBeInTheDocument();
  });

  it("renders PlanHeader with plan name when plan is provided", () => {
    render(<PlanPublicSection plan={makePlan()} />);

    expect(screen.getByTestId("plan-header")).toBeInTheDocument();
    expect(screen.getByText("Program siłowy 4-tyg.")).toBeInTheDocument();
  });

  it("renders WeekNavigation when plan is provided", () => {
    render(<PlanPublicSection plan={makePlan()} />);

    expect(screen.getByTestId("week-navigation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tydzień 1" })).toBeInTheDocument();
  });

  it("does not render empty state when plan is provided", () => {
    render(<PlanPublicSection plan={makePlan()} />);

    expect(
      screen.queryByText(pl.athletePanel.plan.empty),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(pl.athletePanel.plan.sectionTitle),
    ).not.toBeInTheDocument();
  });

  it("renders WeekView for the active week (week 1 by default)", () => {
    render(<PlanPublicSection plan={makePlan()} />);

    expect(screen.getByTestId("week-view")).toBeInTheDocument();
    expect(screen.getByText("Week 1")).toBeInTheDocument();
  });

  it("renders PlanFooter when plan is provided", () => {
    render(<PlanPublicSection plan={makePlan()} />);

    expect(screen.getByTestId("plan-footer")).toBeInTheDocument();
  });

  it("renders generatedOn label and formatted date when plan is provided", () => {
    render(<PlanPublicSection plan={makePlan()} />);

    // The fixture uses created_at: "2026-04-24T10:00:00Z"
    // pl-PL locale formats this as "24 kwietnia 2026"
    const generatedOnText = screen.getByText(
      (content) =>
        content.startsWith(pl.athletePanel.plan.generatedOn) &&
        content.includes("2026"),
    );
    expect(generatedOnText).toBeInTheDocument();
  });

  it("does not render generatedOn line when plan is null", () => {
    render(<PlanPublicSection plan={null} />);

    expect(
      screen.queryByText(
        (content) => content.startsWith(pl.athletePanel.plan.generatedOn),
      ),
    ).not.toBeInTheDocument();
  });
});
