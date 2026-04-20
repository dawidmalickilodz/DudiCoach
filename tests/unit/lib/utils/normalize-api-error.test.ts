/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest";
import { normalizeApiError } from "@/lib/utils/normalize-api-error";

const FALLBACK = "Wystąpił błąd";

describe("normalizeApiError", () => {
  it("returns fallback when error is null", () => {
    expect(normalizeApiError(null, FALLBACK)).toBe(FALLBACK);
  });

  it("returns fallback when error is undefined", () => {
    expect(normalizeApiError(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it("returns fallback (not the Error message) when error is an Error instance", () => {
    const err = new Error("Internal server error — do not show to user");
    const result = normalizeApiError(err, FALLBACK);
    expect(result).toBe(FALLBACK);
    expect(result).not.toBe(err.message);
  });

  it("returns fallback when error is a plain string throw", () => {
    expect(normalizeApiError("raw string error", FALLBACK)).toBe(FALLBACK);
  });

  it("returns fallback when error is a non-Error object", () => {
    expect(normalizeApiError({ code: 500, detail: "db error" }, FALLBACK)).toBe(
      FALLBACK,
    );
  });

  it("uses the exact fallback string provided by the caller", () => {
    const customFallback = "Nie udało się zapisać. Spróbuj ponownie.";
    expect(normalizeApiError(new Error("boom"), customFallback)).toBe(
      customFallback,
    );
  });
});
