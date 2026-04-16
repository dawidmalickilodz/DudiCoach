/// <reference types="vitest/globals" />

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import SaveStatusIndicator from "@/components/coach/SaveStatusIndicator";
import { pl } from "@/lib/i18n/pl";

// ---------------------------------------------------------------------------
// SaveStatusIndicator tests
// ---------------------------------------------------------------------------

describe("SaveStatusIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // ---- role="status" accessibility ----------------------------------------

  it("renders a role=status element", () => {
    render(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={null}
        saveError={null}
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // ---- isSaving state -------------------------------------------------------

  it("shows saving text while isSaving is true", () => {
    render(
      <SaveStatusIndicator
        isSaving={true}
        lastSavedAt={null}
        saveError={null}
      />,
    );
    expect(screen.getByText(pl.common.saving)).toBeInTheDocument();
  });

  it("does NOT show saving text when isSaving is false", () => {
    render(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={null}
        saveError={null}
      />,
    );
    expect(screen.queryByText(pl.common.saving)).not.toBeInTheDocument();
  });

  // ---- idle state (no error, not saving, no lastSavedAt) -------------------

  it("renders saved text element with opacity 0 when no save has happened yet", () => {
    render(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={null}
        saveError={null}
      />,
    );
    const status = screen.getByRole("status");
    // Contains the saved text but invisible
    expect(status).toHaveTextContent(pl.common.saved);
    expect(status).toHaveStyle({ opacity: "0" });
  });

  // ---- successful save: "Zapisano" appears ---------------------------------

  it("shows 'Zapisano' (opacity 1) after lastSavedAt is set", async () => {
    const { rerender } = render(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={null}
        saveError={null}
      />,
    );

    const savedAt = new Date();

    rerender(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={savedAt}
        saveError={null}
      />,
    );

    // The 0ms timer sets visible=true
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    const status = screen.getByRole("status");
    expect(status).toHaveStyle({ opacity: "1" });
    expect(status).toHaveTextContent(pl.common.saved);
  });

  it("hides 'Zapisano' (opacity back to 0) after 1500ms", async () => {
    const { rerender } = render(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={null}
        saveError={null}
      />,
    );

    const savedAt = new Date();

    rerender(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={savedAt}
        saveError={null}
      />,
    );

    // Advance past show timer (0ms) + hide timer (1500ms)
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    const status = screen.getByRole("status");
    expect(status).toHaveStyle({ opacity: "0" });
  });

  it("saved toast remains visible for the full 1500ms window", async () => {
    const { rerender } = render(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={null}
        saveError={null}
      />,
    );

    rerender(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={new Date()}
        saveError={null}
      />,
    );

    // Show timer fires
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    // At 1499ms — still visible
    act(() => { vi.advanceTimersByTime(1499); });
    expect(screen.getByRole("status")).toHaveStyle({ opacity: "1" });

    // At exactly 1500ms — hidden
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status")).toHaveStyle({ opacity: "0" });
  });

  // ---- error state ---------------------------------------------------------

  it("shows error message when saveError is set", () => {
    render(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={null}
        saveError="Network failure"
      />,
    );
    expect(screen.getByText("Network failure")).toBeInTheDocument();
  });

  it("error message has role=status and aria-live=polite", () => {
    render(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={null}
        saveError="Some error"
      />,
    );
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-live", "polite");
    expect(el).toHaveTextContent("Some error");
  });

  it("shows error even when isSaving is true (saveError takes priority)", () => {
    render(
      <SaveStatusIndicator
        isSaving={true}
        lastSavedAt={null}
        saveError="Failed"
      />,
    );
    // saveError branch renders before isSaving branch
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.queryByText(pl.common.saving)).not.toBeInTheDocument();
  });

  // ---- aria-live on all states ---------------------------------------------

  it("has aria-live=polite while saving", () => {
    render(
      <SaveStatusIndicator
        isSaving={true}
        lastSavedAt={null}
        saveError={null}
      />,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("has aria-live=polite in idle/saved state", () => {
    render(
      <SaveStatusIndicator
        isSaving={false}
        lastSavedAt={null}
        saveError={null}
      />,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
