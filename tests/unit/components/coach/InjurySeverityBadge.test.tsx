/// <reference types="vitest/globals" />

import { render, screen } from "@testing-library/react";

import { pl } from "@/lib/i18n/pl";
import InjurySeverityBadge from "@/components/coach/InjurySeverityBadge";

describe("InjurySeverityBadge", () => {
  it("renders label for severity 1", () => {
    render(<InjurySeverityBadge severity={1} />);
    expect(screen.getByText(pl.coach.athlete.injuries.severity[1])).toBeInTheDocument();
  });

  it("renders label for severity 5", () => {
    render(<InjurySeverityBadge severity={5} />);
    expect(screen.getByText(pl.coach.athlete.injuries.severity[5])).toBeInTheDocument();
  });

  it("uses green class for severity 1", () => {
    render(<InjurySeverityBadge severity={1} />);
    const badge = screen.getByText(pl.coach.athlete.injuries.severity[1]);
    expect(badge.className).toContain("text-success");
  });

  it("uses destructive class for severity 5", () => {
    render(<InjurySeverityBadge severity={5} />);
    const badge = screen.getByText(pl.coach.athlete.injuries.severity[5]);
    expect(badge.className).toContain("text-destructive");
  });
});
