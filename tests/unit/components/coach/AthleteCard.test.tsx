/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AthleteCard from "@/components/coach/AthleteCard";
import { pl } from "@/lib/i18n/pl";
import type { Athlete } from "@/lib/api/athletes";

// ---------------------------------------------------------------------------
// Mock next/navigation — useRouter
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAthlete(overrides: Partial<Athlete> = {}): Athlete {
  return {
    id: "athlete-uuid-001",
    coach_id: "coach-uuid-001",
    name: "Jan Kowalski",
    age: 25,
    weight_kg: 75.0,
    height_cm: 180.0,
    sport: "pilka_nozna",
    training_start_date: null,
    training_days_per_week: 5,
    session_minutes: 90,
    current_phase: "base",
    goal: "Zwiększenie wydolności",
    notes: null,
    share_code: "ABC123",
    share_active: false,
    created_at: "2026-04-10T10:00:00Z",
    updated_at: "2026-04-10T12:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AthleteCard tests
// ---------------------------------------------------------------------------

describe("AthleteCard", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  // ---- renders athlete name ------------------------------------------------

  it("renders the athlete's name", () => {
    render(<AthleteCard athlete={makeAthlete()} />);
    expect(screen.getByText("Jan Kowalski")).toBeInTheDocument();
  });

  it("renders the athlete's age with label", () => {
    render(<AthleteCard athlete={makeAthlete({ age: 25 })} />);
    expect(screen.getByText(`${pl.coach.athlete.profile.age}: 25`)).toBeInTheDocument();
  });

  it("does NOT render age label when age is null", () => {
    render(<AthleteCard athlete={makeAthlete({ age: null })} />);
    expect(
      screen.queryByText(new RegExp(pl.coach.athlete.profile.age)),
    ).not.toBeInTheDocument();
  });

  // ---- sport label ---------------------------------------------------------

  it("renders the sport label in Polish from pl.ts", () => {
    render(<AthleteCard athlete={makeAthlete({ sport: "pilka_nozna" })} />);
    // Polish label for pilka_nozna is "Piłka nożna"
    expect(
      screen.getByText(`${pl.coach.athlete.profile.sport}: ${pl.coach.athlete.sport.pilka_nozna}`),
    ).toBeInTheDocument();
  });

  it("falls back to raw sport value when sport key is not in pl.ts", () => {
    render(<AthleteCard athlete={makeAthlete({ sport: "unknown_sport" })} />);
    expect(
      screen.getByText(`${pl.coach.athlete.profile.sport}: unknown_sport`),
    ).toBeInTheDocument();
  });

  it("does NOT render sport label when sport is null", () => {
    render(<AthleteCard athlete={makeAthlete({ sport: null })} />);
    expect(
      screen.queryByText(new RegExp(pl.coach.athlete.profile.sport)),
    ).not.toBeInTheDocument();
  });

  // ---- level badge ---------------------------------------------------------

  it("renders a LevelBadge when training_start_date is set", () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 10);
    const startDate = d.toISOString().slice(0, 10);
    render(<AthleteCard athlete={makeAthlete({ training_start_date: startDate })} />);
    // 10 months → intermediate
    expect(screen.getByText(pl.coach.athlete.level.intermediate)).toBeInTheDocument();
  });

  it("does NOT render a LevelBadge when training_start_date is null", () => {
    render(<AthleteCard athlete={makeAthlete({ training_start_date: null })} />);
    // None of the level labels should appear
    expect(screen.queryByText(pl.coach.athlete.level.beginner)).not.toBeInTheDocument();
    expect(screen.queryByText(pl.coach.athlete.level.intermediate)).not.toBeInTheDocument();
    expect(screen.queryByText(pl.coach.athlete.level.advanced)).not.toBeInTheDocument();
    expect(screen.queryByText(pl.coach.athlete.level.elite)).not.toBeInTheDocument();
  });

  // ---- accessibility -------------------------------------------------------

  it("renders the card with role=button", () => {
    render(<AthleteCard athlete={makeAthlete()} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has aria-label set to the athlete's name", () => {
    render(<AthleteCard athlete={makeAthlete()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Jan Kowalski");
  });

  it("is keyboard-focusable (tabIndex=0)", () => {
    render(<AthleteCard athlete={makeAthlete()} />);
    expect(screen.getByRole("button")).toHaveAttribute("tabindex", "0");
  });

  // ---- click navigation ----------------------------------------------------

  it("navigates to /coach/athletes/<id> when clicked", () => {
    render(<AthleteCard athlete={makeAthlete({ id: "athlete-uuid-001" })} />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockPush).toHaveBeenCalledWith("/coach/athletes/athlete-uuid-001");
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("navigates on Enter keydown", () => {
    render(<AthleteCard athlete={makeAthlete({ id: "athlete-uuid-001" })} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/coach/athletes/athlete-uuid-001");
  });

  it("navigates on Space keydown", () => {
    render(<AthleteCard athlete={makeAthlete({ id: "athlete-uuid-001" })} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: " " });
    expect(mockPush).toHaveBeenCalledWith("/coach/athletes/athlete-uuid-001");
  });

  it("does NOT navigate on other keydown (e.g., Tab)", () => {
    render(<AthleteCard athlete={makeAthlete({ id: "athlete-uuid-001" })} />);
    fireEvent.keyDown(screen.getByRole("button"), { key: "Tab" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  // ---- cursor style --------------------------------------------------------

  it("has cursor-pointer styling class", () => {
    render(<AthleteCard athlete={makeAthlete()} />);
    expect(screen.getByRole("button").className).toContain("cursor-pointer");
  });
});
