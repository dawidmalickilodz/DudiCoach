/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LevelBadge from "@/components/coach/LevelBadge";
import { pl } from "@/lib/i18n/pl";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function monthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// LevelBadge tests
// ---------------------------------------------------------------------------

describe("LevelBadge", () => {
  // ---- null / no-date -------------------------------------------------------

  it("renders nothing when trainingStartDate is null", () => {
    const { container } = render(<LevelBadge trainingStartDate={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when trainingStartDate is empty string", () => {
    const { container } = render(<LevelBadge trainingStartDate={""} />);
    expect(container.firstChild).toBeNull();
  });

  // ---- beginner (0–5 months) -----------------------------------------------

  it("shows beginner label for 3 months of training", () => {
    render(<LevelBadge trainingStartDate={monthsAgo(3)} />);
    expect(screen.getByText(pl.coach.athlete.level.beginner)).toBeInTheDocument();
  });

  it("applies green color classes for beginner level", () => {
    render(<LevelBadge trainingStartDate={monthsAgo(3)} />);
    const badge = screen.getByText(pl.coach.athlete.level.beginner);
    // bg-success/15 text-success is the beginner color mapping
    expect(badge.className).toContain("text-success");
  });

  // ---- intermediate (6–17 months) ------------------------------------------

  it("shows intermediate label for 12 months of training", () => {
    render(<LevelBadge trainingStartDate={monthsAgo(12)} />);
    expect(screen.getByText(pl.coach.athlete.level.intermediate)).toBeInTheDocument();
  });

  it("applies cyan color classes for intermediate level", () => {
    render(<LevelBadge trainingStartDate={monthsAgo(12)} />);
    const badge = screen.getByText(pl.coach.athlete.level.intermediate);
    expect(badge.className).toContain("text-primary");
  });

  // ---- advanced (18–47 months) ---------------------------------------------

  it("shows advanced label for 36 months of training", () => {
    render(<LevelBadge trainingStartDate={monthsAgo(36)} />);
    expect(screen.getByText(pl.coach.athlete.level.advanced)).toBeInTheDocument();
  });

  it("applies orange color classes for advanced level", () => {
    render(<LevelBadge trainingStartDate={monthsAgo(36)} />);
    const badge = screen.getByText(pl.coach.athlete.level.advanced);
    expect(badge.className).toContain("text-warning");
  });

  // ---- elite (48+ months) --------------------------------------------------

  it("shows elite label for 60 months of training", () => {
    render(<LevelBadge trainingStartDate={monthsAgo(60)} />);
    expect(screen.getByText(pl.coach.athlete.level.elite)).toBeInTheDocument();
  });

  it("applies yellow/gold color classes for elite level", () => {
    render(<LevelBadge trainingStartDate={monthsAgo(60)} />);
    const badge = screen.getByText(pl.coach.athlete.level.elite);
    expect(badge.className).toContain("text-yellow");
  });

  // ---- pill shape ----------------------------------------------------------

  it("renders as an inline span element", () => {
    render(<LevelBadge trainingStartDate={monthsAgo(3)} />);
    const badge = screen.getByText(pl.coach.athlete.level.beginner);
    expect(badge.tagName.toLowerCase()).toBe("span");
  });

  it("applies rounded-pill class for pill shape", () => {
    render(<LevelBadge trainingStartDate={monthsAgo(3)} />);
    const badge = screen.getByText(pl.coach.athlete.level.beginner);
    expect(badge.className).toContain("rounded-pill");
  });

  // ---- className pass-through -----------------------------------------------

  it("merges extra className prop onto the badge element", () => {
    render(
      <LevelBadge trainingStartDate={monthsAgo(3)} className="custom-class" />,
    );
    const badge = screen.getByText(pl.coach.athlete.level.beginner);
    expect(badge.className).toContain("custom-class");
  });

  // ---- future date ---------------------------------------------------------

  it("shows beginner label for a future start date", () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 3);
    render(<LevelBadge trainingStartDate={future.toISOString().slice(0, 10)} />);
    expect(screen.getByText(pl.coach.athlete.level.beginner)).toBeInTheDocument();
  });
});
