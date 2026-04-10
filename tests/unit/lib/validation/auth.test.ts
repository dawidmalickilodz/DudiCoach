/// <reference types="vitest/globals" />

import { pl } from "@/lib/i18n/pl";
import { loginSchema } from "@/lib/validation/auth";

describe("loginSchema", () => {
  describe("valid input", () => {
    it("accepts a valid email and 8-char password", () => {
      const result = loginSchema.safeParse({
        email: "coach@example.com",
        password: "Password1",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid email and a longer password", () => {
      const result = loginSchema.safeParse({
        email: "trener@dudicoach.pl",
        password: "AVeryLongPassword123!",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("email validation", () => {
    it("rejects empty email with required message", () => {
      const result = loginSchema.safeParse({
        email: "",
        password: "Password1",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailErrors = result.error.issues.filter(
          (i) => i.path[0] === "email",
        );
        expect(emailErrors.length).toBeGreaterThan(0);
        expect(emailErrors[0].message).toBe(pl.validation.required);
      }
    });

    it("rejects malformed email (no @ sign) with emailInvalid message", () => {
      const result = loginSchema.safeParse({
        email: "not-an-email",
        password: "Password1",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailErrors = result.error.issues.filter(
          (i) => i.path[0] === "email",
        );
        expect(emailErrors.length).toBeGreaterThan(0);
        expect(emailErrors[0].message).toBe(pl.validation.emailInvalid);
      }
    });

    it("rejects whitespace-only email with emailInvalid message", () => {
      const result = loginSchema.safeParse({
        email: "   ",
        password: "Password1",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailErrors = result.error.issues.filter(
          (i) => i.path[0] === "email",
        );
        expect(emailErrors.length).toBeGreaterThan(0);
        // Whitespace-only fails .email() check
        expect(emailErrors[0].message).toBe(pl.validation.emailInvalid);
      }
    });
  });

  describe("password validation", () => {
    it("rejects a 7-char password with passwordTooShort message", () => {
      const result = loginSchema.safeParse({
        email: "coach@example.com",
        password: "Short1!", // exactly 7 chars
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordErrors = result.error.issues.filter(
          (i) => i.path[0] === "password",
        );
        expect(passwordErrors.length).toBeGreaterThan(0);
        expect(passwordErrors[0].message).toBe(pl.validation.passwordTooShort);
      }
    });

    it("rejects empty password with required message", () => {
      const result = loginSchema.safeParse({
        email: "coach@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordErrors = result.error.issues.filter(
          (i) => i.path[0] === "password",
        );
        expect(passwordErrors.length).toBeGreaterThan(0);
        // First .min(1) fires for empty string — gives required message
        expect(passwordErrors[0].message).toBe(pl.validation.required);
      }
    });
  });
});
