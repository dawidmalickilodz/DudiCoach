/// <reference types="vitest/globals" />

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { pl } from "@/lib/i18n/pl";
import TestsTab from "@/components/coach/TestsTab";
import type { Athlete } from "@/lib/api/athletes";
import type { FitnessTestResult } from "@/lib/api/fitness-tests";

const mockUseFitnessTests = vi.fn();
const mockUseCreateFitnessTest = vi.fn();
const mockUseDeleteFitnessTest = vi.fn();
const mockRefetch = vi.fn();
const mockCreateMutateAsync = vi.fn();
const mockDeleteMutate = vi.fn();
const mockHistoryProps = vi.fn();

vi.mock("@/lib/hooks/use-fitness-tests", () => ({
  useFitnessTests: (...args: unknown[]) => mockUseFitnessTests(...(args as [])),
  useCreateFitnessTest: (...args: unknown[]) =>
    mockUseCreateFitnessTest(...(args as [])),
  useDeleteFitnessTest: (...args: unknown[]) =>
    mockUseDeleteFitnessTest(...(args as [])),
}));

vi.mock("@/components/coach/TestHistory", () => ({
  default: (props: unknown) => {
    mockHistoryProps(props);
    const typed = props as { results: FitnessTestResult[] };
    return <div data-testid="test-history">{typed.results.length}</div>;
  },
}));

function makeAthlete(overrides: Partial<Athlete> = {}): Athlete {
  return {
    id: "athlete-uuid-001",
    coach_id: "coach-uuid-001",
    name: "Jan Kowalski",
    age: 25,
    weight_kg: 75,
    height_cm: 182,
    sport: "pilka_nozna",
    training_start_date: null,
    training_days_per_week: 4,
    session_minutes: 60,
    current_phase: "base",
    goal: null,
    notes: null,
    share_code: "ABC234",
    share_active: true,
    created_at: "2026-04-19T10:00:00Z",
    updated_at: "2026-04-19T10:00:00Z",
    ...overrides,
  };
}

function makeResult(overrides: Partial<FitnessTestResult> = {}): FitnessTestResult {
  return {
    id: "result-uuid-001",
    athlete_id: "athlete-uuid-001",
    test_key: "sprint_30m",
    value: 4.5,
    test_date: "2026-04-20",
    notes: null,
    created_at: "2026-04-20T10:00:00Z",
    ...overrides,
  };
}

function setupHooks({
  query = {},
  create = {},
  remove = {},
}: {
  query?: Record<string, unknown>;
  create?: Record<string, unknown>;
  remove?: Record<string, unknown>;
} = {}) {
  mockUseFitnessTests.mockReturnValue({
    data: [],
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: mockRefetch,
    ...query,
  });

  mockUseCreateFitnessTest.mockReturnValue({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
    error: null,
    ...create,
  });

  mockUseDeleteFitnessTest.mockReturnValue({
    mutate: mockDeleteMutate,
    isPending: false,
    error: null,
    variables: undefined,
    ...remove,
  });
}

describe("TestsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
    mockCreateMutateAsync.mockResolvedValue(undefined);
  });

  it("shows loading state", () => {
    setupHooks({ query: { isLoading: true, data: [] } });

    render(<TestsTab athlete={makeAthlete()} />);

    expect(screen.getByText(pl.coach.athlete.tests.loading)).toBeInTheDocument();
  });

  it("shows error state with retry", () => {
    setupHooks({ query: { error: new Error("boom"), data: [] } });

    render(<TestsTab athlete={makeAthlete()} />);

    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      pl.coach.athlete.tests.errorGeneric,
    );
    const retryButton = screen.getByRole("button", { name: pl.common.tryAgain });
    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it("shows empty state", () => {
    setupHooks({ query: { data: [] } });

    render(<TestsTab athlete={makeAthlete()} />);

    expect(screen.getByText(pl.coach.athlete.tests.empty)).toBeInTheDocument();
    expect(screen.getByText(pl.coach.athlete.tests.emptyHint)).toBeInTheDocument();
  });

  it("shows fallback hint when athlete sport is null", () => {
    setupHooks({ query: { data: [] } });

    render(<TestsTab athlete={makeAthlete({ sport: null })} />);

    expect(
      screen.getByText(pl.coach.athlete.tests.sportMissingHint),
    ).toBeInTheDocument();
  });

  it("renders history when results exist", () => {
    setupHooks({
      query: {
        data: [makeResult({ id: "r1" }), makeResult({ id: "r2" })],
      },
    });

    render(<TestsTab athlete={makeAthlete()} />);

    expect(screen.getByTestId("test-history")).toHaveTextContent("2");
    expect(mockHistoryProps).toHaveBeenCalled();
  });

  it("submits create payload and resets value/notes fields", async () => {
    setupHooks({ query: { data: [] } });

    render(<TestsTab athlete={makeAthlete()} />);

    fireEvent.change(screen.getByLabelText(pl.coach.athlete.tests.field.testKey), {
      target: { value: "sprint_30m" },
    });
    fireEvent.change(screen.getByLabelText(pl.coach.athlete.tests.field.value), {
      target: { value: "4.42" },
    });
    fireEvent.change(screen.getByLabelText(pl.coach.athlete.tests.field.testDate), {
      target: { value: "2026-04-21" },
    });
    fireEvent.change(screen.getByLabelText(pl.coach.athlete.tests.field.notes), {
      target: { value: "  Pierwszy pomiar  " },
    });
    const submitButton = screen.getByRole("button", {
      name: pl.coach.athlete.tests.addButton,
    });
    const form = submitButton.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          test_key: "sprint_30m",
          value: 4.42,
          notes: "Pierwszy pomiar",
        }),
      );
    });

    expect(screen.getByLabelText(pl.coach.athlete.tests.field.notes)).toHaveValue("");
  });
});
