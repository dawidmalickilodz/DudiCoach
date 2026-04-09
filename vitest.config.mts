import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Vitest config for unit + integration tests.
 * - happy-dom environment for React component tests (ESM-native, faster than jsdom)
 * - Testing Library matchers loaded via setup file
 * - Coverage target: ≥70% on changed files (see qa-dev agent contract)
 * - E2E tests live under tests/e2e and are excluded (owned by Playwright)
 */
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "tests/integration/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["app/**", "components/**", "lib/**"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "lib/supabase/database.types.ts",
        "app/**/layout.tsx",
        "app/**/loading.tsx",
        "app/**/not-found.tsx",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
