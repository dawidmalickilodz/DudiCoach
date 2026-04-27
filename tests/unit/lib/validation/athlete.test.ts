/// <reference types="vitest/globals" />

import { pl } from "@/lib/i18n/pl";
import {
  createAthleteSchema,
  updateAthleteSchema,
} from "@/lib/validation/athlete";
import { TRAINING_GOALS } from "@/lib/constants/training-goals";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorsFor(
  result: ReturnType<typeof createAthleteSchema.safeParse>,
  field: string,
): string[] {
  if (result.success) return [];
  return result.error.issues
    .filter((i) => i.path[0] === field)
    .map((i) => i.message);
}

// ---------------------------------------------------------------------------
// createAthleteSchema
// ---------------------------------------------------------------------------

describe("createAthleteSchema", () => {
  describe("valid inputs", () => {
    it("accepts minimal valid input: { name: 'Jan Kowalski' }", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan Kowalski" });
      expect(result.success).toBe(true);
    });

    it("accepts full input with all fields populated", () => {
      const result = createAthleteSchema.safeParse({
        name: "Anna Nowak",
        age: 25,
        weight_kg: 65.5,
        height_cm: 170,
        sport: "Pływanie",
        training_start_date: "2024-01-15",
        training_days_per_week: 5,
        session_minutes: 90,
        current_phase: "base",
        goal: "strength",
        notes: "Preferuje trening poranny",
      });
      expect(result.success).toBe(true);
    });

    it("accepts nullable fields with explicit null values", () => {
      const result = createAthleteSchema.safeParse({
        name: "Piotr Wiśniewski",
        age: null,
        weight_kg: null,
        height_cm: null,
        sport: null,
        training_start_date: null,
        training_days_per_week: null,
        session_minutes: null,
        current_phase: null,
        goal: null,
        notes: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts current_phase: 'preparatory'", () => {
      const result = createAthleteSchema.safeParse({
        name: "Jan",
        current_phase: "preparatory",
      });
      expect(result.success).toBe(true);
    });

    it("accepts all valid current_phase values", () => {
      const phases = ["preparatory", "base", "building", "peak", "transition"] as const;
      for (const phase of phases) {
        const result = createAthleteSchema.safeParse({ name: "Jan", current_phase: phase });
        expect(result.success, `phase '${phase}' should be valid`).toBe(true);
      }
    });
  });

  // ---- name validation ----

  describe("name validation", () => {
    it("rejects missing name — fails with a type error (name is required)", () => {
      // When name is entirely absent, Zod emits a type error ("Invalid input:
      // expected string, received undefined") rather than the .min(1) message.
      // The .min(1) message only fires for empty strings. Both cases produce
      // validation failure; this test verifies the field is indeed required.
      const result = createAthleteSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameErrors = errorsFor(result, "name");
        expect(nameErrors.length).toBeGreaterThan(0);
      }
    });

    it("rejects empty string name with pl.validation.required", () => {
      const result = createAthleteSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameErrors = errorsFor(result, "name");
        expect(nameErrors.length).toBeGreaterThan(0);
        expect(nameErrors[0]).toBe(pl.validation.required);
      }
    });
  });

  // ---- age validation ----

  describe("age validation", () => {
    it("rejects age: 9 (below minimum 10) with pl.validation.ageRange", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", age: 9 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const ageErrors = errorsFor(result, "age");
        expect(ageErrors.length).toBeGreaterThan(0);
        expect(ageErrors[0]).toBe(pl.validation.ageRange);
      }
    });

    it("rejects age: 5 (well below minimum) with pl.validation.ageRange", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", age: 5 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const ageErrors = errorsFor(result, "age");
        expect(ageErrors.length).toBeGreaterThan(0);
        expect(ageErrors[0]).toBe(pl.validation.ageRange);
      }
    });

    it("rejects age: 101 (above maximum 100) with pl.validation.ageRange", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", age: 101 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const ageErrors = errorsFor(result, "age");
        expect(ageErrors.length).toBeGreaterThan(0);
        expect(ageErrors[0]).toBe(pl.validation.ageRange);
      }
    });

    it("rejects age: 150 (well above maximum) with pl.validation.ageRange", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", age: 150 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const ageErrors = errorsFor(result, "age");
        expect(ageErrors.length).toBeGreaterThan(0);
        expect(ageErrors[0]).toBe(pl.validation.ageRange);
      }
    });

    it("accepts boundary age: 10 (minimum)", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", age: 10 });
      expect(result.success).toBe(true);
    });

    it("accepts boundary age: 100 (maximum)", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", age: 100 });
      expect(result.success).toBe(true);
    });
  });

  // ---- weight_kg validation ----

  describe("weight_kg validation", () => {
    it("rejects weight_kg: 29 (below minimum 30) with pl.validation.weightRange", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", weight_kg: 29 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "weight_kg");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toBe(pl.validation.weightRange);
      }
    });

    it("rejects weight_kg: 10 (well below minimum) with pl.validation.weightRange", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", weight_kg: 10 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "weight_kg");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toBe(pl.validation.weightRange);
      }
    });

    it("rejects weight_kg: 251 (above maximum 250) with pl.validation.weightRange", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", weight_kg: 251 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "weight_kg");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toBe(pl.validation.weightRange);
      }
    });

    it("accepts boundary weight_kg: 30 (minimum)", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", weight_kg: 30 });
      expect(result.success).toBe(true);
    });
  });

  // ---- height_cm validation ----

  describe("height_cm validation", () => {
    it("rejects height_cm: 99 (below minimum 100) with pl.validation.heightRange", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", height_cm: 99 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "height_cm");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toBe(pl.validation.heightRange);
      }
    });

    it("rejects height_cm: 50 (well below minimum) with pl.validation.heightRange", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", height_cm: 50 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "height_cm");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toBe(pl.validation.heightRange);
      }
    });

    it("rejects height_cm: 251 (above maximum 250) with pl.validation.heightRange", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", height_cm: 251 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "height_cm");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toBe(pl.validation.heightRange);
      }
    });

    it("accepts boundary height_cm: 100 (minimum)", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", height_cm: 100 });
      expect(result.success).toBe(true);
    });
  });

  // ---- training_days_per_week validation ----

  describe("training_days_per_week validation", () => {
    it("rejects training_days_per_week: 0 with pl.validation.trainingDaysRange", () => {
      const result = createAthleteSchema.safeParse({
        name: "Jan",
        training_days_per_week: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "training_days_per_week");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toBe(pl.validation.trainingDaysRange);
      }
    });

    it("rejects training_days_per_week: 8 (above maximum 7) with pl.validation.trainingDaysRange", () => {
      const result = createAthleteSchema.safeParse({
        name: "Jan",
        training_days_per_week: 8,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "training_days_per_week");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toBe(pl.validation.trainingDaysRange);
      }
    });

    it("accepts boundary training_days_per_week: 1 (minimum)", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", training_days_per_week: 1 });
      expect(result.success).toBe(true);
    });

    it("accepts boundary training_days_per_week: 7 (maximum)", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", training_days_per_week: 7 });
      expect(result.success).toBe(true);
    });
  });

  // ---- session_minutes validation ----

  describe("session_minutes validation", () => {
    it("rejects session_minutes: 19 (below minimum 20) with pl.validation.sessionMinutesRange", () => {
      const result = createAthleteSchema.safeParse({
        name: "Jan",
        session_minutes: 19,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "session_minutes");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toBe(pl.validation.sessionMinutesRange);
      }
    });

    it("rejects session_minutes: 10 (well below minimum) with pl.validation.sessionMinutesRange", () => {
      const result = createAthleteSchema.safeParse({
        name: "Jan",
        session_minutes: 10,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "session_minutes");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toBe(pl.validation.sessionMinutesRange);
      }
    });

    it("rejects session_minutes: 181 (above maximum 180) with pl.validation.sessionMinutesRange", () => {
      const result = createAthleteSchema.safeParse({
        name: "Jan",
        session_minutes: 181,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "session_minutes");
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toBe(pl.validation.sessionMinutesRange);
      }
    });

    it("accepts boundary session_minutes: 20 (minimum)", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", session_minutes: 20 });
      expect(result.success).toBe(true);
    });
  });

  // ---- goal validation ----

  describe("goal validation", () => {
    it("accepts all six TRAINING_GOALS keys", () => {
      for (const key of TRAINING_GOALS) {
        const result = createAthleteSchema.safeParse({ name: "Jan", goal: key });
        expect(result.success, `goal '${key}' should be valid`).toBe(true);
      }
    });

    it("rejects a free-form goal string (not in allowed enum)", () => {
      const result = createAthleteSchema.safeParse({
        name: "Jan",
        goal: "Zwiększenie masy mięśniowej",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.filter((i) => i.path[0] === "goal");
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it("accepts goal: null (nullable)", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", goal: null });
      expect(result.success).toBe(true);
    });

    it("accepts goal: undefined (optional, field omitted)", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan" });
      expect(result.success).toBe(true);
    });

    it("accepts goal: '' (select empty option)", () => {
      const result = createAthleteSchema.safeParse({ name: "Jan", goal: "" });
      expect(result.success).toBe(true);
    });
  });

  // ---- current_phase validation ----

  describe("current_phase validation", () => {
    it("rejects current_phase: 'invalid' (not in allowed enum values)", () => {
      const result = createAthleteSchema.safeParse({
        name: "Jan",
        current_phase: "invalid",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = errorsFor(result, "current_phase");
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it("rejects current_phase: 'nonexistent' (not in allowed enum values)", () => {
      const result = createAthleteSchema.safeParse({
        name: "Jan",
        current_phase: "nonexistent",
      });
      expect(result.success).toBe(false);
    });

    it("accepts current_phase: null (nullable)", () => {
      const result = createAthleteSchema.safeParse({
        name: "Jan",
        current_phase: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts current_phase: '' (select empty option)", () => {
      const result = createAthleteSchema.safeParse({
        name: "Jan",
        current_phase: "",
      });
      expect(result.success).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// updateAthleteSchema
// ---------------------------------------------------------------------------

describe("updateAthleteSchema", () => {
  it("accepts empty object {} — all fields optional for PATCH", () => {
    const result = updateAthleteSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update with single field { weight_kg: 78 }", () => {
    const result = updateAthleteSchema.safeParse({ weight_kg: 78 });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with { weight_kg: 75 }", () => {
    const result = updateAthleteSchema.safeParse({ weight_kg: 75 });
    expect(result.success).toBe(true);
  });

  it("name is optional (PATCH does not require name re-send)", () => {
    const result = updateAthleteSchema.safeParse({ sport: "Bieganie" });
    expect(result.success).toBe(true);
  });

  it("accepts empty select/date values in PATCH payload", () => {
    const result = updateAthleteSchema.safeParse({
      goal: "",
      current_phase: "",
      training_start_date: "",
    });
    expect(result.success).toBe(true);
  });

  it("applies ageRange validation when age is provided (age: 9 fails)", () => {
    const result = updateAthleteSchema.safeParse({ age: 9 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path[0] === "age");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe(pl.validation.ageRange);
    }
  });

  it("applies weightRange validation when weight_kg is provided (weight_kg: 10 fails)", () => {
    const result = updateAthleteSchema.safeParse({ weight_kg: 10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path[0] === "weight_kg");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe(pl.validation.weightRange);
    }
  });

  it("applies heightRange validation when height_cm is provided (height_cm: 50 fails)", () => {
    const result = updateAthleteSchema.safeParse({ height_cm: 50 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path[0] === "height_cm");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe(pl.validation.heightRange);
    }
  });

  it("applies trainingDaysRange when training_days_per_week is provided (0 fails)", () => {
    const result = updateAthleteSchema.safeParse({ training_days_per_week: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter(
        (i) => i.path[0] === "training_days_per_week",
      );
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe(pl.validation.trainingDaysRange);
    }
  });

  it("applies sessionMinutesRange when session_minutes is provided (10 fails)", () => {
    const result = updateAthleteSchema.safeParse({ session_minutes: 10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.issues.filter((i) => i.path[0] === "session_minutes");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe(pl.validation.sessionMinutesRange);
    }
  });

  it("rejects invalid current_phase when provided", () => {
    const result = updateAthleteSchema.safeParse({ current_phase: "invalid" });
    expect(result.success).toBe(false);
  });
});
