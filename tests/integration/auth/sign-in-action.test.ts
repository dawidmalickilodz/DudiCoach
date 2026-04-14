/// <reference types="vitest/globals" />

import { beforeEach, vi } from "vitest";

// vi.mock factories are hoisted to the top of the file before any imports or
// variable declarations. Use vi.hoisted() so mocks are available inside the
// factory closures at the time they execute.

const { mockRedirect, mockSignInWithPassword } = vi.hoisted(() => {
  const mockSignInWithPassword = vi.fn();
  const mockRedirect = vi.fn((url: string) => {
    throw new Error(`MOCK_REDIRECT:${url}`);
  });
  return { mockRedirect, mockSignInWithPassword };
});

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  })),
}));

// Import the unit under test after mocks are wired.
import { signInAction } from "@/app/(coach)/login/actions";

// ---- Helper ----
function isRedirectTo(url: string, err: unknown): boolean {
  return err instanceof Error && err.message === `MOCK_REDIRECT:${url}`;
}

// ---- Tests ----
describe("signInAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore the throwing behaviour after clearAllMocks resets it.
    mockRedirect.mockImplementation((url: string) => {
      throw new Error(`MOCK_REDIRECT:${url}`);
    });
  });

  describe("valid credentials — happy path", () => {
    it("calls signInWithPassword then redirects to /dashboard", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

      let redirectError: unknown;
      try {
        await signInAction({ email: "coach@example.com", password: "Password1" });
      } catch (err) {
        redirectError = err;
      }

      expect(mockSignInWithPassword).toHaveBeenCalledOnce();
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "coach@example.com",
        password: "Password1",
      });
      expect(isRedirectTo("/dashboard", redirectError)).toBe(true);
    });
  });

  describe("invalid credentials", () => {
    it("returns { ok: false, error: 'invalid_credentials' } for Supabase 400 error", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid login credentials", status: 400 },
      });

      const result = await signInAction({
        email: "coach@example.com",
        password: "WrongPassword1",
      });

      expect(result).toEqual({ ok: false, error: "invalid_credentials" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("network failure", () => {
    it("returns { ok: false, error: 'network' } when signInWithPassword throws TypeError", async () => {
      mockSignInWithPassword.mockRejectedValueOnce(
        new TypeError("fetch failed"),
      );

      const result = await signInAction({
        email: "coach@example.com",
        password: "Password1",
      });

      expect(result).toEqual({ ok: false, error: "network" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("Supabase 503", () => {
    it("returns { ok: false, error: 'generic' } for a 503 response", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: "Service unavailable", status: 503 },
      });

      const result = await signInAction({
        email: "coach@example.com",
        password: "Password1",
      });

      expect(result).toEqual({ ok: false, error: "generic" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("malformed input — server-side validation short-circuits", () => {
    it("returns { ok: false, error: 'generic' } and never calls signInWithPassword for invalid email", async () => {
      const result = await signInAction({
        email: "not-an-email",
        password: "x",
      });

      expect(result).toEqual({ ok: false, error: "generic" });
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it("returns { ok: false, error: 'generic' } for empty password", async () => {
      const result = await signInAction({
        email: "coach@example.com",
        password: "",
      });

      expect(result).toEqual({ ok: false, error: "generic" });
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe("PII non-leakage", () => {
    it("does not log the submitted email or password in console.warn for invalid_credentials", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockSignInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid login credentials", status: 400 },
      });

      await signInAction({
        email: "secret-email@example.com",
        password: "SuperSecret1",
      });

      for (const call of warnSpy.mock.calls) {
        const serialised = JSON.stringify(call);
        expect(serialised).not.toContain("secret-email@example.com");
        expect(serialised).not.toContain("SuperSecret1");
      }
      warnSpy.mockRestore();
    });
  });
});
