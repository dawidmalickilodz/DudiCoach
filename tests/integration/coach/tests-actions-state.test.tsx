/// <reference types="vitest/globals" />

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { pl } from "@/lib/i18n/pl";
import TestHistory from "@/components/coach/TestHistory";
import type { FitnessTestResult } from "@/lib/api/fitness-tests";

function makeResult(overrides: Partial<FitnessTestResult> = {}): FitnessTestResult {
  return {
    id: "result-uuid-001",
    athlete_id: "athlete-uuid-001",
    test_key: "sprint_30m",
    value: 4.5,
    test_date: "2026-04-20",
    notes: "Test notatki",
    created_at: "2026-04-20T10:00:00Z",
    ...overrides,
  };
}

describe("TestHistory delete confirmation flow", () => {
  const onDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not delete immediately, requires explicit confirmation", () => {
    render(
      <TestHistory
        results={[makeResult()]}
        isDeleting={false}
        deletingId={null}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: pl.common.delete }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText(pl.coach.athlete.tests.deleteConfirm)).toBeInTheDocument();
  });

  it("calls delete only after confirm click", () => {
    const row = makeResult({ id: "result-uuid-123" });

    render(
      <TestHistory
        results={[row]}
        isDeleting={false}
        deletingId={null}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: pl.common.delete }));
    fireEvent.click(screen.getByRole("button", { name: pl.common.confirm }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("result-uuid-123");
  });

  it("allows cancellation of confirmation mode", () => {
    render(
      <TestHistory
        results={[makeResult()]}
        isDeleting={false}
        deletingId={null}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: pl.common.delete }));
    fireEvent.click(screen.getByRole("button", { name: pl.common.cancel }));

    expect(
      screen.queryByText(pl.coach.athlete.tests.deleteConfirm),
    ).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("disables confirm/cancel while deletion is pending", () => {
    const row = makeResult({ id: "result-uuid-987" });

    const { rerender } = render(
      <TestHistory
        results={[row]}
        isDeleting={false}
        deletingId={null}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: pl.common.delete }));

    rerender(
      <TestHistory
        results={[row]}
        isDeleting
        deletingId="result-uuid-987"
        onDelete={onDelete}
      />,
    );

    const confirmButton = screen.getByRole("button", {
      name: pl.coach.athlete.tests.deleting,
    });
    const cancelButton = screen.getByRole("button", { name: pl.common.cancel });

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});
