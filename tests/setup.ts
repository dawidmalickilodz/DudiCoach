import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Global test setup for Vitest + Testing Library.
 * Runs before every test file.
 */

// Unmount components after each test to prevent memory leaks + cross-test bleed.
afterEach(() => {
  cleanup();
});

// Provide fake env vars so modules reading process.env don't crash in tests.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.ANTHROPIC_API_KEY ??= "test-anthropic-key";
process.env.ANTHROPIC_MODEL ??= "claude-sonnet-4-6";

// jsdom does not implement matchMedia — stub so components using it don't crash.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}
