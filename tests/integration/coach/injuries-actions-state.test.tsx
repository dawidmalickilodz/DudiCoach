/// <reference types="vitest/globals" />

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { pl } from "@/lib/i18n/pl";
import InjuryCard from "@/components/coach/InjuryCard";
import InjuryCreateForm from "@/components/coach/InjuryCreateForm";
import InjuryEditForm from "@/components/coach/InjuryEditForm";
import type { Injury } from "@/lib/api/injuries";

const mockUseCreateInjury = vi.fn();
const mockUseUpdateInjury = vi.fn();
const mockUseDeleteInjury = vi.fn();
const mockUseAutoSave = vi.fn();

vi.mock("@/lib/hooks/use-injuries", () => ({
  useCreateInjury: (...args: unknown[]) => mockUseCreateInjury(...(args as [])),
  useUpdateInjury: (...args: unknown[]) => mockUseUpdateInjury(...(args as [])),
  useDeleteInjury: (...args: unknown[]) => mockUseDeleteInjury(...(args as [])),
}));

vi.mock("@/lib/hooks/use-auto-save", () => ({
  useAutoSave: (...args: unknown[]) => mockUseAutoSave(...(args as [])),
}));

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

describe("Injuries action disabled states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateInjury.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    });
    mockUseUpdateInjury.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
    });
    mockUseDeleteInjury.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    });
    mockUseAutoSave.mockReturnValue({
      isSaving: false,
      lastSavedAt: null,
      saveError: null,
    });
  });

  it("disables create form controls while create mutation is pending", () => {
    mockUseCreateInjury.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
      error: null,
    });

    render(<InjuryCreateForm athleteId="athlete-uuid-001" onClose={vi.fn()} />);

    expect(
      screen.getByLabelText(pl.coach.athlete.injuries.field.name),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: pl.common.cancel })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: pl.coach.athlete.injuries.creating }),
    ).toBeDisabled();
  });

  it("disables edit form controls while auto-save is in progress", () => {
    mockUseAutoSave.mockReturnValue({
      isSaving: true,
      lastSavedAt: null,
      saveError: null,
    });

    render(
      <InjuryEditForm
        athleteId="athlete-uuid-001"
        injury={makeInjury()}
      />,
    );

    expect(
      screen.getByLabelText(pl.coach.athlete.injuries.field.name),
    ).toBeDisabled();
    expect(
      screen.getByLabelText(pl.coach.athlete.injuries.field.status),
    ).toBeDisabled();
    expect(mockUseAutoSave).toHaveBeenCalledWith(
      expect.objectContaining({
        publicErrorMessage: pl.coach.athlete.injuries.errorGeneric,
      }),
    );
  });

  it("disables delete and expand actions while delete mutation is pending", () => {
    mockUseDeleteInjury.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
    });

    render(
      <InjuryCard
        athleteId="athlete-uuid-001"
        injury={makeInjury()}
      />,
    );

    const deleteButton = screen.getByRole("button", { name: pl.common.delete });
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveTextContent(pl.coach.athlete.injuries.deleting);
    expect(
      screen.getByRole("button", { name: /Naciągnięcie dwugłowego/i }),
    ).toBeDisabled();
  });

  it("shows sanitized create error message without raw backend details", () => {
    mockUseCreateInjury.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: new Error("SQLSTATE 42501: permission denied for table injuries"),
    });

    render(<InjuryCreateForm athleteId="athlete-uuid-001" onClose={vi.fn()} />);

    expect(
      screen.getByText(pl.coach.athlete.injuries.errorGeneric),
    ).toBeInTheDocument();
    expect(screen.queryByText(/SQLSTATE 42501/i)).not.toBeInTheDocument();
  });

  it("shows sanitized delete error message without raw backend details", () => {
    mockUseDeleteInjury.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: new Error("DB timeout while deleting injury #123"),
    });

    render(
      <InjuryCard
        athleteId="athlete-uuid-001"
        injury={makeInjury()}
      />,
    );

    expect(
      screen.getByText(pl.coach.athlete.injuries.errorGeneric),
    ).toBeInTheDocument();
    expect(screen.queryByText(/DB timeout/i)).not.toBeInTheDocument();
  });
});
