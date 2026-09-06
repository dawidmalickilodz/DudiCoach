import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

/**
 * Accessibility smoke tests using axe-core.
 *
 * Tests public-facing pages that do not require authentication:
 *  - /login
 *  - /{shareCode} — invalid share code triggers 404, so we test /login only.
 *
 * For authenticated pages, run with E2E_COACH_EMAIL + E2E_COACH_PASSWORD set.
 */

const coachEmail = process.env.E2E_COACH_EMAIL ?? "";
const coachPassword = process.env.E2E_COACH_PASSWORD ?? "";
const missingCoachCredentials = !coachEmail || !coachPassword;

test.describe("Accessibility — axe-core smoke", () => {
  test("login page has no critical/serious violations", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Zaloguj/i })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include("body")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    const serious = results.violations.filter((v) => v.impact === "serious");

    // Log violations for debugging but don't fail on moderate/minor.
    if (critical.length > 0 || serious.length > 0) {
      console.error(
        "Accessibility violations (critical/serious):",
        results.violations
          .filter((v) => v.impact === "critical" || v.impact === "serious")
          .map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length,
            help: v.help,
          })),
      );
    }

    expect(critical, "No critical accessibility violations").toHaveLength(0);
    expect(serious, "No serious accessibility violations").toHaveLength(0);
  });

  test("dashboard has no critical/serious violations", async ({ page }) => {
    test.skip(missingCoachCredentials, "Set E2E_COACH_EMAIL and E2E_COACH_PASSWORD.");
    await page.goto("/login");
    await page.getByLabel(/Email/i).fill(coachEmail);
    await page.getByLabel(/Has/i).fill(coachPassword);
    await page.getByRole("button", { name: /Zaloguj/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 20_000 });

    const results = await new AxeBuilder({ page })
      .include("body")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    const serious = results.violations.filter((v) => v.impact === "serious");

    if (critical.length > 0 || serious.length > 0) {
      console.error(
        "Accessibility violations (critical/serious) on dashboard:",
        results.violations
          .filter((v) => v.impact === "critical" || v.impact === "serious")
          .map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length,
            help: v.help,
          })),
      );
    }

    expect(critical, "No critical accessibility violations on dashboard").toHaveLength(0);
    expect(serious, "No serious accessibility violations on dashboard").toHaveLength(0);
  });

  test("athlete editor has no critical/serious violations", async ({ page }) => {
    test.skip(missingCoachCredentials, "Set E2E_COACH_EMAIL and E2E_COACH_PASSWORD.");
    await page.goto("/login");
    await page.getByLabel(/Email/i).fill(coachEmail);
    await page.getByLabel(/Has/i).fill(coachPassword);
    await page.getByRole("button", { name: /Zaloguj/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 20_000 });

    // Create an athlete to visit the editor.
    const createRes = await page.request.post("/api/athletes", {
      data: { name: `A11y Test ${Date.now()}` },
    });
    expect(createRes.status()).toBe(201);
    const { data } = (await createRes.json()) as { data: { id: string } };
    const athleteId = data.id;

    try {
      await page.goto(`/athletes/${athleteId}`);
      // Wait for the page to render — look for any tab.
      await page.getByRole("tab", { name: /Profil/i }).waitFor({ timeout: 15_000 });

      const results = await new AxeBuilder({ page })
        .include("body")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
        .analyze();

      const critical = results.violations.filter((v) => v.impact === "critical");
      const serious = results.violations.filter((v) => v.impact === "serious");

      if (critical.length > 0 || serious.length > 0) {
        console.error(
          "Accessibility violations (critical/serious) on athlete editor:",
          results.violations
            .filter((v) => v.impact === "critical" || v.impact === "serious")
            .map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.length,
              help: v.help,
            })),
        );
      }

      expect(critical, "No critical accessibility violations on athlete editor").toHaveLength(0);
      expect(serious, "No serious accessibility violations on athlete editor").toHaveLength(0);
    } finally {
      await page.request.delete(`/api/athletes/${athleteId}`);
    }
  });
});
