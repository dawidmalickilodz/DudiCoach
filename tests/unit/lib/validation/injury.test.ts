/// <reference types="vitest/globals" />

import {
  createInjurySchema,
  updateInjurySchema,
} from "@/lib/validation/injury";

describe("createInjurySchema", () => {
  it("accepts valid input", () => {
    const result = createInjurySchema.safeParse({
      name: "Naciagniecie lydki",
      body_location: "calf",
      severity: 3,
      injury_date: "2026-04-16",
      status: "active",
      notes: "Bez sprintow",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid severity", () => {
    const result = createInjurySchema.safeParse({
      name: "Uraz",
      body_location: "knee",
      severity: 9,
      injury_date: "2026-04-16",
      status: "active",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid body_location", () => {
    const result = createInjurySchema.safeParse({
      name: "Uraz",
      body_location: "neck",
      severity: 2,
      injury_date: "2026-04-16",
      status: "active",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = createInjurySchema.safeParse({
      name: "Uraz",
      body_location: "knee",
      severity: 2,
      injury_date: "16-04-2026",
      status: "active",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateInjurySchema", () => {
  it("accepts empty object for PATCH", () => {
    const result = updateInjurySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update", () => {
    const result = updateInjurySchema.safeParse({
      severity: 4,
      status: "healing",
    });
    expect(result.success).toBe(true);
  });
});
