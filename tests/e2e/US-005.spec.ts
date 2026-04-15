import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

/**
 * US-005 — Generowanie planu treningowego przez Claude AI.
 *
 * The happy path (real Claude call) is expensive and non-deterministic, so
 * it is opt-in only via `E2E_ALLOW_AI_CALL=1`. CI defaults to the cheap
 * slice only: UI presence + 422 "incomplete data" error flow, which is
 * entirely server-driven and stable.
 *
 * Opt-in happy path (run locally by the engineer):
 *   E2E_ALLOW_AI_CALL=1 npm run test:e2e -- tests/e2e/US-005.spec.ts
 */

const coachEmail = process.env.E2E_COACH_EMAIL ?? "";
const coachPassword = process.env.E2E_COACH_PASSWORD ?? "";
const missingCoachCredentials = !coachEmail || !coachPassword;
const isCI = !!process.env.CI;
const allowAiCall = process.env.E2E_ALLOW_AI_CALL === "1";

if (isCI && missingCoachCredentials) {
  throw new Error(
    "Missing E2E credentials in CI. Set E2E_COACH_EMAIL and E2E_COACH_PASSWORD.",
  );
}

async function loginAsCoach(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/Email/i).fill(coachEmail);
  await page.getByLabel(/Hasło/i).fill(coachPassword);
  await page.getByRole("button", { name: /Zaloguj się/i }).click();
  await expect(page).toHaveURL(/\/coach\/dashboard/);
}

async function createAthlete(
  request: APIRequestContext,
  name: string,
): Promise<string> {
  const response = await request.post("/api/athletes", { data: { name } });
  if (response.status() !== 201) {
    throw new Error(`Unexpected create status: ${response.status()}`);
  }
  const body = (await response.json()) as { data: { id: string } };
  return body.data.id;
}

async function patchAthlete(
  request: APIRequestContext,
  athleteId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const response = await request.patch(`/api/athletes/${athleteId}`, {
    data: payload,
  });
  if (response.status() !== 200) {
    throw new Error(
      `Unexpected PATCH status (${response.status()}) for athlete ${athleteId}`,
    );
  }
}

async function cleanupAthlete(
  request: APIRequestContext,
  athleteId: string,
): Promise<void> {
  const response = await request.delete(`/api/athletes/${athleteId}`);
  if (![204, 404].includes(response.status())) {
    throw new Error(
      `Unexpected cleanup status (${response.status()}) for athlete ${athleteId}`,
    );
  }
}

test.describe("US-005 — AI plan generation", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    missingCoachCredentials,
    "Set E2E_COACH_EMAIL and E2E_COACH_PASSWORD to run authenticated E2E tests.",
  );

  test("incomplete athlete data surfaces errorIncompleteData from the Plany tab", async ({
    page,
  }) => {
    await loginAsCoach(page);

    // Athlete created WITHOUT sport / training_days_per_week — server must
    // return 422 before ever calling Claude.
    const athleteId = await createAthlete(
      page.request,
      `E2E US-005 Incomplete ${Date.now()}`,
    );

    try {
      await page.goto(`/coach/athletes/${athleteId}`);
      await page.getByRole("tab", { name: /^Plany$/i }).click();

      const generateButton = page.getByRole("button", {
        name: /Generuj plan AI/i,
      });
      await expect(generateButton).toBeVisible();
      await generateButton.click();

      await expect(page.getByRole("alert")).toContainText(
        /Uzupełnij dane zawodnika \(sport, dni treningowe\)/i,
        { timeout: 10_000 },
      );
    } finally {
      await cleanupAthlete(page.request, athleteId);
    }
  });

  // ---------------------------------------------------------------------------
  // Opt-in: real Claude API call + plan render.
  // Requires E2E_ALLOW_AI_CALL=1 AND ANTHROPIC_API_KEY set in the deployed
  // environment. Skipped otherwise.
  // ---------------------------------------------------------------------------
  test("happy path — generates a plan and renders 4-week viewer [opt-in]", async ({
    page,
  }) => {
    test.skip(
      !allowAiCall,
      "Set E2E_ALLOW_AI_CALL=1 to run the live Claude API generation test.",
    );

    test.setTimeout(120_000); // Claude call alone can take 60s + retry buffer.

    await loginAsCoach(page);

    const athleteId = await createAthlete(
      page.request,
      `E2E US-005 Happy ${Date.now()}`,
    );

    try {
      // Fill all required context so the server passes the completeness check.
      await patchAthlete(page.request, athleteId, {
        age: 26,
        weight_kg: 75,
        height_cm: 180,
        sport: "pilka_nozna",
        training_start_date: new Date(Date.now() - 365 * 24 * 3600 * 1000)
          .toISOString()
          .slice(0, 10),
        training_days_per_week: 4,
        session_minutes: 60,
        current_phase: "base",
        goal: "Wytrzymałość ogólna",
      });

      await page.goto(`/coach/athletes/${athleteId}`);
      await page.getByRole("tab", { name: /^Plany$/i }).click();

      await page
        .getByRole("button", { name: /Generuj plan AI/i })
        .click();

      // Spinner copy first — "Generuję plan..." — then the viewer appears.
      await expect(page.getByText(/Generuję plan/i)).toBeVisible();

      // 4 week tabs in a tablist — this is the definitive "plan rendered" signal.
      await expect(
        page.getByRole("tab", { name: /Tydzień 1/i }),
      ).toBeVisible({ timeout: 90_000 });
      await expect(page.getByRole("tab", { name: /Tydzień 2/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Tydzień 3/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Tydzień 4/i })).toBeVisible();

      // Switching to week 2 works.
      await page.getByRole("tab", { name: /Tydzień 2/i }).click();
      await expect(
        page.getByRole("tab", { name: /Tydzień 2/i }),
      ).toHaveAttribute("aria-selected", "true");
    } finally {
      await cleanupAthlete(page.request, athleteId);
    }
  });
});
