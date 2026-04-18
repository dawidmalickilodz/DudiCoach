/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { pl } from "@/lib/i18n/pl";
import InjuriesTab from "@/components/coach/InjuriesTab";
import type { Athlete } from "@/lib/api/athletes";
import type { Injury } from "@/lib/api/injuries";

const mockUseInjuries = vi.fn();
const mockRefetch = vi.fn();

vi.mock("@/lib/hooks/use-injuries", () => ({
  useInjuries: (...args: unknown[]) => mockUseInjuries(...(args as [])),
}));

vi.mock("@/components/coach/InjuryCard", () => ({
  default: ({ injury }: { injury: Injury }) => (
    <div data-testid="injury-card">{injury.name}</div>
  ),
}));

vi.mock("@/components/coach/InjuryCreateForm", () => ({
  default: ({
    onSubmittingChange,
  }: {
    onSubmittingChange?: (isSubmitting: boolean) => void;
  }) => (
    <div data-testid="injury-create-form">
      <button type="button" onClick={() => onSubmittingChange?.(true)}>
        mark-submitting
      </button>
    </div>
  ),
}));

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
    share_code: "ABC234",
    share_active: false,
    created_at: "2026-04-10T10:00:00Z",
    updated_at: "2026-04-10T12:00:00Z",
    ...overrides,
  };
}

function makeInjury(overrides: Partial<Injury> = {}): Injury {
  return {
    id: "injury-uuid-001",
    athlete_id: "athlete-uuid-001",
    name: "Naciągnięcie dwugłowego",
    body_location: "hamstring",
    severity: 3,
    injury_date: "2026-04-16",
    status: "active",
    notes: "Ograniczyć sprinty",
    created_at: "2026-04-16T12:00:00Z",
    updated_at: "2026-04-16T12:00:00Z",
    ...overrides,
  };
}

function setupInjuriesQuery(overrides: Partial<ReturnType<typeof mockUseInjuries>> = {}) {
  mockUseInjuries.mockReturnValue({
    data: [],
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: mockRefetch,
    ...overrides,
  });
}

describe("InjuriesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
  });

  it("shows improved loading state", () => {
    setupInjuriesQuery({ isLoading: true, data: [] });

    render(<InjuriesTab athlete={makeAthlete()} />);

    expect(screen.getByText(pl.coach.athlete.injuries.loading)).toBeInTheDocument();
  });

  it("shows error + retry and calls refetch", () => {
    setupInjuriesQuery({ error: new Error("boom") });

    render(<InjuriesTab athlete={makeAthlete()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      pl.coach.athlete.injuries.errorGeneric,
    );
    const retryButton = screen.getByRole("button", { name: pl.common.tryAgain });
    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("disables retry button while query is fetching", () => {
    setupInjuriesQuery({ error: new Error("boom"), isFetching: true });

    render(<InjuriesTab athlete={makeAthlete()} />);

    const retryButton = screen.getByRole("button", { name: pl.common.loading });
    expect(retryButton).toBeDisabled();
  });

  it("shows improved empty state clarity", () => {
    setupInjuriesQuery({ data: [], isLoading: false, error: null });

    render(<InjuriesTab athlete={makeAthlete()} />);

    expect(screen.getByText(pl.coach.athlete.injuries.empty)).toBeInTheDocument();
    expect(screen.getByText(pl.coach.athlete.injuries.emptyHint)).toBeInTheDocument();
  });

  it("shows success state with injury cards", () => {
    setupInjuriesQuery({
      data: [makeInjury({ id: "i1", name: "Uraz barku" }), makeInjury({ id: "i2", name: "Stłuczenie kolana" })],
    });

    render(<InjuriesTab athlete={makeAthlete()} />);

    expect(screen.getAllByTestId("injury-card")).toHaveLength(2);
    expect(screen.getByText("Uraz barku")).toBeInTheDocument();
    expect(screen.getByText("Stłuczenie kolana")).toBeInTheDocument();
  });

  it("disables create toggle while create form reports submitting", () => {
    setupInjuriesQuery({ data: [] });

    render(<InjuriesTab athlete={makeAthlete()} />);

    const toggleButton = screen.getByRole("button", {
      name: pl.coach.athlete.injuries.addButton,
    });
    fireEvent.click(toggleButton);
    fireEvent.click(screen.getByRole("button", { name: "mark-submitting" }));

    expect(
      screen.getByRole("button", { name: pl.coach.athlete.injuries.closeCreate }),
    ).toBeDisabled();
  });
});
