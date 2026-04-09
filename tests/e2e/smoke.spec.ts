import { test, expect } from "@playwright/test";

/**
 * E2E smoke test — verifies the home page renders with Polish copy.
 * US-001 will replace this with the real login flow.
 */
test("home page loads in Polish", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/DudiCoach/);
  await expect(page.getByRole("link", { name: /Logowanie trenera/i })).toBeVisible();
});
