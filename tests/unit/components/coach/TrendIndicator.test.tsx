/// <reference types="vitest/globals" />

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import TrendIndicator from "@/components/coach/TrendIndicator";
import { pl } from "@/lib/i18n/pl";

describe("TrendIndicator", () => {
  it("marks positive delta as improvement for higher_is_better", () => {
    render(
      <TrendIndicator
        currentValue={120}
        previousValue={100}
        direction="higher_is_better"
      />,
    );

    const indicator = screen.getByLabelText(pl.coach.athlete.tests.trend.improved);
    expect(indicator).toHaveTextContent("+");
    expect(indicator).toHaveTextContent("20");
    expect(indicator).toHaveClass("text-emerald-500");
  });

  it("marks negative delta as improvement for lower_is_better", () => {
    render(
      <TrendIndicator
        currentValue={9.8}
        previousValue={10}
        direction="lower_is_better"
      />,
    );

    const indicator = screen.getByLabelText(pl.coach.athlete.tests.trend.improved);
    expect(indicator).toHaveTextContent("-");
    expect(indicator).toHaveTextContent("0.20");
    expect(indicator).toHaveClass("text-emerald-500");
  });

  it("marks positive delta as worsening for lower_is_better", () => {
    render(
      <TrendIndicator
        currentValue={10.2}
        previousValue={10}
        direction="lower_is_better"
      />,
    );

    const indicator = screen.getByLabelText(pl.coach.athlete.tests.trend.worsened);
    expect(indicator).toHaveTextContent("+");
    expect(indicator).toHaveTextContent("0.20");
    expect(indicator).toHaveClass("text-destructive");
  });

  it("renders neutral state for unchanged values", () => {
    render(
      <TrendIndicator
        currentValue={100}
        previousValue={100}
        direction="higher_is_better"
      />,
    );

    const indicator = screen.getByLabelText(pl.coach.athlete.tests.trend.unchanged);
    expect(indicator).toHaveTextContent("=");
    expect(indicator).toHaveTextContent("0");
    expect(indicator).toHaveClass("text-muted-foreground");
  });
});
