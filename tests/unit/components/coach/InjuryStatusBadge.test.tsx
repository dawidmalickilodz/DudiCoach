/// <reference types="vitest/globals" />

import { render, screen } from "@testing-library/react";

import { pl } from "@/lib/i18n/pl";
import InjuryStatusBadge from "@/components/coach/InjuryStatusBadge";

describe("InjuryStatusBadge", () => {
  it("renders label for active status", () => {
    render(<InjuryStatusBadge status="active" />);
    expect(screen.getByText(pl.coach.athlete.injuries.status.active)).toBeInTheDocument();
  });

  it("renders label for healing status", () => {
    render(<InjuryStatusBadge status="healing" />);
    expect(screen.getByText(pl.coach.athlete.injuries.status.healing)).toBeInTheDocument();
  });

  it("renders label for healed status", () => {
    render(<InjuryStatusBadge status="healed" />);
    expect(screen.getByText(pl.coach.athlete.injuries.status.healed)).toBeInTheDocument();
  });

  it("uses destructive class for active status", () => {
    render(<InjuryStatusBadge status="active" />);
    const badge = screen.getByText(pl.coach.athlete.injuries.status.active);
    expect(badge.className).toContain("text-destructive");
  });

  it("uses success class for healed status", () => {
    render(<InjuryStatusBadge status="healed" />);
    const badge = screen.getByText(pl.coach.athlete.injuries.status.healed);
    expect(badge.className).toContain("text-success");
  });
});
