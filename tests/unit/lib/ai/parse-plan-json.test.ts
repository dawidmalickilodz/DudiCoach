/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest";

import { parsePlanJson } from "@/lib/ai/parse-plan-json";
import type { TrainingPlanJson } from "@/lib/validation/training-plan";

// ---------------------------------------------------------------------------
// Minimal fixture — a well-formed 4-week plan that passes zod validation.
// Used across tests; each variant wraps this JSON differently.
// ---------------------------------------------------------------------------

const VALID_PLAN: TrainingPlanJson = {
  planName: "Plan siłowy 4-tygodniowy",
  phase: "base",
  summary: "Plan bazowy dla średniozaawansowanych.",
  weeklyOverview: "3 sesje/tydzień, nacisk na wielostawowe.",
  weeks: [1, 2, 3, 4].map((weekNumber) => ({
    weekNumber,
    focus: `Tydzień ${weekNumber}`,
    days: [
      {
        dayNumber: 1,
        dayName: "Dzień A - Gora",
        warmup: "5 min rower + mobilizacja",
        exercises: [
          {
            name: "Przysiad ze sztangą",
            sets: "4",
            reps: "8-10",
            intensity: "75% 1RM",
            rest: "90s",
            tempo: "3-1-2-0",
            notes: "Kontrola w ekscentrycznej",
          },
        ],
        cooldown: "Rolowanie 5 min",
        duration: "60 min",
      },
    ],
  })),
  progressionNotes: "Tydzień 4 = deload",
  nutritionTips: "3000 kcal",
  recoveryProtocol: "8h snu",
};

const VALID_PLAN_STRING = JSON.stringify(VALID_PLAN);

// ---------------------------------------------------------------------------
// parsePlanJson
// ---------------------------------------------------------------------------

describe("parsePlanJson", () => {
  it("parses clean JSON (fast path)", () => {
    const result = parsePlanJson(VALID_PLAN_STRING);
    expect(result.planName).toBe("Plan siłowy 4-tygodniowy");
    expect(result.weeks).toHaveLength(4);
  });

  it("parses JSON with surrounding whitespace", () => {
    const result = parsePlanJson(`   \n\n${VALID_PLAN_STRING}\n\n  `);
    expect(result.planName).toBe("Plan siłowy 4-tygodniowy");
  });

  it("strips markdown code fences (```json ... ```)", () => {
    const wrapped = "```json\n" + VALID_PLAN_STRING + "\n```";
    const result = parsePlanJson(wrapped);
    expect(result.planName).toBe("Plan siłowy 4-tygodniowy");
  });

  it("strips bare markdown code fences (``` ... ```)", () => {
    const wrapped = "```\n" + VALID_PLAN_STRING + "\n```";
    const result = parsePlanJson(wrapped);
    expect(result.planName).toBe("Plan siłowy 4-tygodniowy");
  });

  it("extracts JSON from preamble text when no fences present", () => {
    const wrapped =
      "Oto Twój plan treningowy:\n\n" + VALID_PLAN_STRING + "\n\nPowodzenia!";
    const result = parsePlanJson(wrapped);
    expect(result.planName).toBe("Plan siłowy 4-tygodniowy");
  });

  it("throws when no JSON object is present", () => {
    expect(() => parsePlanJson("just some random text")).toThrow(
      /No JSON object/,
    );
  });

  it("throws on malformed JSON syntax", () => {
    expect(() => parsePlanJson("{ not valid json")).toThrow(
      /Failed to parse JSON/,
    );
  });

  it("throws when schema validation fails (wrong week count)", () => {
    const bad = { ...VALID_PLAN, weeks: VALID_PLAN.weeks.slice(0, 2) };
    expect(() => parsePlanJson(JSON.stringify(bad))).toThrow();
  });

  it("throws when required field missing", () => {
    const bad = { ...VALID_PLAN, planName: "" };
    expect(() => parsePlanJson(JSON.stringify(bad))).toThrow();
  });
});
