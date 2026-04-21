/// <reference types="vitest/globals" />

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { pl } from "@/lib/i18n/pl";
import AthleteProfileForm from "@/components/coach/AthleteProfileForm";
import type { Athlete } from "@/lib/api/athletes";

const mockUseUpdateAthlete = vi.fn();
const mockUseAutoSave = vi.fn();

vi.mock("@/lib/hooks/use-athletes", () => ({
  useUpdateAthlete: (...args: unknown[]) => mockUseUpdateAthlete(...(args as [])),
}));

vi.mock("@/lib/hooks/use-auto-save", () => ({
  useAutoSave: (...args: unknown[]) => mockUseAutoSave(...(args as [])),
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

describe("AthleteProfileForm auto-save hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateAthlete.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    });
    mockUseAutoSave.mockReturnValue({
      isSaving: false,
      lastSavedAt: null,
      saveError: null,
    });
  });

  it("passes sanitized publicErrorMessage to useAutoSave", () => {
    render(<AthleteProfileForm athlete={makeAthlete()} />);

    expect(mockUseAutoSave).toHaveBeenCalled();
    const lastCall = mockUseAutoSave.mock.calls.at(-1)?.[0];
    expect(lastCall?.publicErrorMessage).toBe(pl.coach.athlete.online.errorGeneric);
  });
});
