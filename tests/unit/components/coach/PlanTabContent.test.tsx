/// <reference types="vitest/globals" />

import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

import { pl } from "@/lib/i18n/pl";
import type { Athlete } from "@/lib/api/athletes";
import PlanTabContent from "@/components/coach/PlanTabContent";
import {
  DuplicateActiveJobError,
  type PlanGenerationJob,
  type TrainingPlan,
} from "@/lib/api/plans";

const mockFetchPlans = vi.fn();
const mockStartPlanGenerationJob = vi.fn();
const mockFetchPlanGenerationJobStatus = vi.fn();

vi.mock("@/lib/api/plans", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/plans")>(
    "@/lib/api/plans",
  );
  return {
    ...actual,
    fetchPlans: (...args: unknown[]) => mockFetchPlans(...(args as [])),
    startPlanGenerationJob: (...args: unknown[]) =>
      mockStartPlanGenerationJob(...(args as [])),
    fetchPlanGenerationJobStatus: (...args: unknown[]) =>
      mockFetchPlanGenerationJobStatus(...(args as [])),
  };
});

vi.mock("@/components/coach/PlanList", () => ({
  default: ({ plans }: { plans: TrainingPlan[] }) => (
    <div data-testid="plan-list">{plans.length}</div>
  ),
}));

vi.mock("@/components/coach/PlanViewer", () => ({
  default: ({ plan }: { plan: TrainingPlan }) => (
    <div data-testid="plan-viewer">{plan.plan_name}</div>
  ),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }

  return { Wrapper, queryClient };
}

function makeAthlete(overrides: Partial<Athlete> = {}): Athlete {
  return {
    id: "athlete-1",
    coach_id: "coach-1",
    name: "Jan Kowalski",
    age: 28,
    weight_kg: 78,
    height_cm: 182,
    sport: "pilka_nozna",
    training_start_date: "2024-01-01",
    training_days_per_week: 4,
    session_minutes: 60,
    current_phase: "base",
    goal: "strength",
    notes: null,
    share_code: "ABC234",
    share_active: true,
    created_at: "2026-04-20T10:00:00Z",
    updated_at: "2026-04-20T10:00:00Z",
    ...overrides,
  };
}

function makePlan(overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  const dayTemplate = {
    dayNumber: 1,
    dayName: "Dzien 1",
    warmup: "Krotka rozgrzewka.",
    exercises: [
      {
        name: "Przysiad",
        sets: "3",
        reps: "8",
        intensity: "RPE 7",
        rest: "90s",
        tempo: "3110",
        notes: "Kontrola ruchu.",
      },
    ],
    cooldown: "Krotki cooldown.",
    duration: "60 min",
  };

  return {
    id: "plan-1",
    athlete_id: "athlete-1",
    plan_name: "Plan testowy",
    phase: "base",
    plan_json: {
      planName: "Plan testowy",
      phase: "base",
      summary: "Krotkie podsumowanie.",
      weeklyOverview: "Krotki opis tygodni.",
      progressionNotes: "Krotkie wskazowki progresji.",
      nutritionTips: "Krotkie wskazowki zywieniowe.",
      recoveryProtocol: "Krotkie wskazowki regeneracji.",
      weeks: [
        { weekNumber: 1, focus: "Technika", days: [dayTemplate] },
        { weekNumber: 2, focus: "Objętość", days: [dayTemplate] },
        { weekNumber: 3, focus: "Intensywność", days: [dayTemplate] },
        { weekNumber: 4, focus: "Deload", days: [dayTemplate] },
      ],
    },
    created_at: "2026-04-28T12:00:00Z",
    ...overrides,
  };
}

function makeJob(overrides: Partial<PlanGenerationJob> = {}): PlanGenerationJob {
  return {
    id: "job-1",
    athlete_id: "athlete-1",
    status: "queued",
    attempt_count: 0,
    max_attempts: 3,
    plan_id: null,
    error_code: null,
    error_message: null,
    created_at: "2026-04-28T12:00:00Z",
    updated_at: "2026-04-28T12:00:00Z",
    completed_at: null,
    failed_at: null,
    ...overrides,
  };
}

describe("PlanTabContent async plan generation flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPlans.mockResolvedValue([]);
    mockStartPlanGenerationJob.mockResolvedValue(makeJob());
    mockFetchPlanGenerationJobStatus.mockResolvedValue(makeJob());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows idle state by default", async () => {
    const { Wrapper } = createWrapper();
    render(<PlanTabContent athlete={makeAthlete()} />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: pl.coach.athlete.plans.generateButton })).toBeInTheDocument();
    });
  });

  it("shows queued state after job creation", async () => {
    const { Wrapper } = createWrapper();
    render(<PlanTabContent athlete={makeAthlete()} />, { wrapper: Wrapper });

    fireEvent.click(
      await screen.findByRole("button", { name: pl.coach.athlete.plans.generateButton }),
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: pl.coach.athlete.plans.queued })).toBeDisabled();
    });
  });

  it("shows processing state when job status is processing", async () => {
    mockFetchPlanGenerationJobStatus.mockResolvedValue(
      makeJob({ status: "processing" }),
    );

    const { Wrapper } = createWrapper();
    render(<PlanTabContent athlete={makeAthlete()} />, { wrapper: Wrapper });

    fireEvent.click(
      await screen.findByRole("button", { name: pl.coach.athlete.plans.generateButton }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: pl.coach.athlete.plans.processing }),
      ).toBeDisabled();
    });
  });

  it("invalidates plans list and renders generated plan on succeeded job", async () => {
    const generatedPlan = makePlan({ id: "plan-2", plan_name: "Nowy plan AI" });

    mockFetchPlans
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([generatedPlan]);
    mockFetchPlanGenerationJobStatus.mockResolvedValue(
      makeJob({
        status: "succeeded",
        plan_id: generatedPlan.id,
        completed_at: "2026-04-28T12:05:00Z",
      }),
    );

    const { Wrapper } = createWrapper();
    render(<PlanTabContent athlete={makeAthlete()} />, { wrapper: Wrapper });

    fireEvent.click(
      await screen.findByRole("button", { name: pl.coach.athlete.plans.generateButton }),
    );

    await waitFor(() => {
      expect(mockFetchPlans).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("plan-viewer")).toHaveTextContent("Nowy plan AI");
    });
  });

  it("shows failed state with retry CTA", async () => {
    mockFetchPlanGenerationJobStatus.mockResolvedValue(
      makeJob({
        status: "failed",
        error_code: "provider_timeout",
        failed_at: "2026-04-28T12:05:00Z",
      }),
    );

    const { Wrapper } = createWrapper();
    render(<PlanTabContent athlete={makeAthlete()} />, { wrapper: Wrapper });

    fireEvent.click(
      await screen.findByRole("button", { name: pl.coach.athlete.plans.generateButton }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        pl.coach.athlete.plans.errorTimeout,
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: pl.common.tryAgain }));
    });

    await waitFor(() => {
      expect(mockStartPlanGenerationJob).toHaveBeenCalledTimes(2);
    });
  });

  it("shows poll-timeout state with refresh CTA", async () => {
    vi.useFakeTimers();
    mockFetchPlanGenerationJobStatus.mockResolvedValue(
      makeJob({ status: "processing" }),
    );

    const { Wrapper } = createWrapper();
    render(<PlanTabContent athlete={makeAthlete()} />, { wrapper: Wrapper });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: pl.coach.athlete.plans.generateButton,
        }),
      );
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(180_001);
      await Promise.resolve();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      pl.coach.athlete.plans.pollTimeout,
    );
    expect(
      screen.getByRole("button", { name: pl.coach.athlete.plans.refreshStatus }),
    ).toBeInTheDocument();
  });

  it("handles duplicate active job (409) gracefully", async () => {
    mockStartPlanGenerationJob.mockRejectedValue(
      new DuplicateActiveJobError("Generowanie planu jest juz w toku."),
    );

    const { Wrapper } = createWrapper();
    render(<PlanTabContent athlete={makeAthlete()} />, { wrapper: Wrapper });

    fireEvent.click(
      await screen.findByRole("button", { name: pl.coach.athlete.plans.generateButton }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        pl.coach.athlete.plans.errorAlreadyInProgress,
      );
      expect(
        screen.getByRole("button", { name: pl.coach.athlete.plans.refreshStatus }),
      ).toBeInTheDocument();
    });
  });
});
