/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { pl } from "@/lib/i18n/pl";
import AthleteProfileForm from "@/components/coach/AthleteProfileForm";
import type { Athlete } from "@/lib/api/athletes";

const mockUseUpdateAthlete = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("@/lib/hooks/use-athletes", () => ({
  useUpdateAthlete: (...args: unknown[]) => mockUseUpdateAthlete(...(args as [])),
}));

function makeAthlete(): Athlete {
  return {
    id: "athlete-uuid-001",
    coach_id: "coach-uuid-001",
    name: "Jan Kowalski",
    age: 21,
    weight_kg: 82,
    height_cm: 184,
    sport: "pilka_nozna",
    training_start_date: "2025-09-01",
    training_days_per_week: 4,
    session_minutes: 60,
    current_phase: "base",
    goal: "running",
    notes: "Brak",
    share_code: "ABC234",
    share_active: true,
    created_at: "2026-04-01T12:00:00Z",
    updated_at: "2026-04-01T12:00:00Z",
  };
}

async function flushAutosave(ms = 900) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

async function primeAutosaveAndClearCalls() {
  const nameInput = screen.getByLabelText(pl.coach.athlete.profile.name);
  fireEvent.change(nameInput, { target: { value: "Jan Kowalski Prime" } });
  await flushAutosave();
  mockMutateAsync.mockClear();
}

describe("AthleteProfileForm numeric autosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(undefined);
    mockUseUpdateAthlete.mockReturnValue({ mutateAsync: mockMutateAsync });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("changing age triggers autosave payload", async () => {
    render(<AthleteProfileForm athlete={makeAthlete()} />);
    await primeAutosaveAndClearCalls();

    fireEvent.change(screen.getByLabelText(pl.coach.athlete.profile.age), {
      target: { value: "22" },
    });
    await flushAutosave();

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ age: 22 }),
    );
  });

  it("changing weight_kg triggers autosave payload", async () => {
    render(<AthleteProfileForm athlete={makeAthlete()} />);
    await primeAutosaveAndClearCalls();

    fireEvent.change(screen.getByLabelText(pl.coach.athlete.profile.weight), {
      target: { value: "83" },
    });
    await flushAutosave();

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ weight_kg: 83 }),
    );
  });

  it("changing height_cm triggers autosave payload", async () => {
    render(<AthleteProfileForm athlete={makeAthlete()} />);
    await primeAutosaveAndClearCalls();

    fireEvent.change(screen.getByLabelText(pl.coach.athlete.profile.height), {
      target: { value: "185" },
    });
    await flushAutosave();

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ height_cm: 185 }),
    );
  });

  it("changing session_minutes triggers autosave payload", async () => {
    render(<AthleteProfileForm athlete={makeAthlete()} />);
    await primeAutosaveAndClearCalls();

    fireEvent.change(
      screen.getByLabelText(pl.coach.athlete.profile.sessionMinutes),
      { target: { value: "61" } },
    );
    await flushAutosave();

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockMutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ session_minutes: 61 }),
    );
  });

  it("invalid numeric value is blocked before PATCH and does not create persistent global save error", async () => {
    render(<AthleteProfileForm athlete={makeAthlete()} />);
    await primeAutosaveAndClearCalls();

    const weightInput = screen.getByLabelText(pl.coach.athlete.profile.weight);

    fireEvent.change(weightInput, { target: { value: "6" } });
    await flushAutosave();

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(pl.validation.weightRange)).toBeInTheDocument();
    expect(screen.queryByText(pl.coach.athlete.online.errorGeneric)).not.toBeInTheDocument();

    fireEvent.change(weightInput, { target: { value: "60" } });
    await flushAutosave();
    expect(screen.queryByText(pl.coach.athlete.online.errorGeneric)).not.toBeInTheDocument();
  });
});
