/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest";

import {
  isShareCodeFormatValid,
  normalizeShareCode,
} from "@/lib/validation/share-code";

describe("share code validation helpers", () => {
  it("normalizes value to uppercase and removes whitespace", () => {
    expect(normalizeShareCode(" ab c2 34 ")).toBe("ABC234");
  });

  it("accepts a valid 6-char share code format", () => {
    expect(isShareCodeFormatValid("ABC234")).toBe(true);
  });

  it("rejects ambiguous characters (I, O, 0, 1)", () => {
    expect(isShareCodeFormatValid("ABC1D2")).toBe(false);
    expect(isShareCodeFormatValid("AB0CD2")).toBe(false);
    expect(isShareCodeFormatValid("ABICD2")).toBe(false);
    expect(isShareCodeFormatValid("ABOCD2")).toBe(false);
  });

  it("rejects values with wrong length", () => {
    expect(isShareCodeFormatValid("ABC23")).toBe(false);
    expect(isShareCodeFormatValid("ABC2345")).toBe(false);
  });
});
