import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for E2E tests (owned by qa-test agent).
 *
 * Local runs: `npm run dev` in another terminal, then `npm run test:e2e`.
 * CI runs: webServer block boots the Next.js dev server automatically.
 * Preview deployments: override baseURL via PLAYWRIGHT_BASE_URL env var.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  outputDir: "test-results",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Polish locale — matches the app's UI language.
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],

  // Boot dev server for local runs only — against a preview URL this is skipped.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
});
