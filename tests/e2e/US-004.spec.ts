import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

/**
 * US-004 — Share code + panel zawodnika + real-time sync.
 *
 * Covers:
 *  - Home share-code form validation (disabled while too short, inline error
 *    on a valid-format but non-existent code)
 *  - Coach Online tab: activate / deactivate / reset flows (UI + API state)
 *  - Public athlete panel at /{shareCode} renders profile + SyncIndicator
 *  - Realtime sync: coach PATCH → public page reflects change via broadcast
 *
 * All authenticated scenarios are skipped unless E2E_COACH_EMAIL +
 * E2E_COACH_PASSWORD are set (matches US-001/US-002/US-003 convention).
 */

const coachEmail = process.env.E2E_COACH_EMAIL ?? "";
const coachPassword = process.env.E2E_COACH_PASSWORD ?? "";
const missingCoachCredentials = !coachEmail || !coachPassword;
const isCI = !!process.env.CI;

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

interface AthleteRow {
  id: string;
  name: string;
  share_code: string;
  share_active: boolean;
}

async function getAthlete(
  request: APIRequestContext,
  athleteId: string,
): Promise<AthleteRow> {
  const response = await request.get(`/api/athletes/${athleteId}`);
  if (response.status() !== 200) {
    throw new Error(
      `Unexpected GET status (${response.status()}) for athlete ${athleteId}`,
    );
  }
  const body = (await response.json()) as { data: AthleteRow };
  return body.data;
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

test.describe("US-004 — share code panel + realtime", () => {
  test.describe.configure({ mode: "serial" });

  test("home share-code form rejects invalid codes", async ({ page }) => {
    await page.goto("/");

    const input = page.getByLabel(/Panel zawodnika/i);
    const submit = page.getByRole("button", { name: /^Połącz$/i });

    // Too short — submit is disabled (length !== 6 gate).
    await input.fill("ABC");
    await expect(submit).toBeDisabled();

    // Valid-format but non-existent code → HEAD check fails → inline error.
    await input.fill("ZZZZZZ");
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByRole("alert")).toContainText(
      /Nieprawidłowy kod/i,
    );
    // Stays on the home page — no navigation.
    await expect(page).toHaveURL(/\/(?:$|\?)/);
  });

  test.describe("authenticated coach flows", () => {
    test.skip(
      missingCoachCredentials,
      "Set E2E_COACH_EMAIL and E2E_COACH_PASSWORD to run authenticated E2E tests.",
    );

    test("coach activates, resets, and deactivates share code", async ({
      page,
    }) => {
      await loginAsCoach(page);

      const athleteId = await createAthlete(
        page.request,
        `E2E US-004 Share ${Date.now()}`,
      );

      try {
        await page.goto(`/coach/athletes/${athleteId}`);

        // --- AC-2 — Open Online tab, activate sharing
        await page.getByRole("tab", { name: /^Online$/i }).click();

        await expect(
          page.getByText(/Udostępnianie nieaktywne/i),
        ).toBeVisible();

        await page
          .getByRole("button", { name: /Aktywuj udostępnianie/i })
          .click();

        // After activation, share-code + link labels appear.
        await expect(page.getByText(/Kod dostępu/i)).toBeVisible({
          timeout: 5000,
        });
        await expect(page.getByText(/Link dla zawodnika/i)).toBeVisible();

        const afterActivate = await getAthlete(page.request, athleteId);
        expect(afterActivate.share_active).toBe(true);
        expect(afterActivate.share_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
        const originalCode = afterActivate.share_code;

        // --- AC-4 — Reset (window.confirm must be auto-accepted)
        page.once("dialog", async (dialog) => {
          expect(dialog.type()).toBe("confirm");
          await dialog.accept();
        });

        await page
          .getByRole("button", { name: /^Resetuj kod$/i })
          .click();

        // The backend should rotate the share_code.
        await expect
          .poll(
            async () =>
              (await getAthlete(page.request, athleteId)).share_code,
            { timeout: 5000 },
          )
          .not.toBe(originalCode);

        const afterReset = await getAthlete(page.request, athleteId);
        expect(afterReset.share_active).toBe(true);
        expect(afterReset.share_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

        // --- AC-3 — Deactivate returns to the inactive state.
        await page.getByRole("button", { name: /^Dezaktywuj$/i }).click();

        await expect(
          page.getByText(/Udostępnianie nieaktywne/i),
        ).toBeVisible({ timeout: 5000 });

        const afterDeactivate = await getAthlete(page.request, athleteId);
        expect(afterDeactivate.share_active).toBe(false);
      } finally {
        await cleanupAthlete(page.request, athleteId);
      }
    });

    test("public athlete page renders profile and reflects realtime edits", async ({
      browser,
    }) => {
      // Coach context: seeds the athlete and activates sharing.
      const coachContext = await browser.newContext();
      const coachPage = await coachContext.newPage();

      let athleteId: string | null = null;

      try {
        await loginAsCoach(coachPage);

        const initialName = `E2E US-004 Realtime ${Date.now()}`;
        athleteId = await createAthlete(coachPage.request, initialName);

        // Seed profile fields so the public view has something substantial.
        await patchAthlete(coachPage.request, athleteId, {
          age: 25,
          weight_kg: 70,
          height_cm: 175,
          sport: "pilka_nozna",
        });

        // Activate sharing via API (UI is covered by the previous test).
        const activateResponse = await coachPage.request.post(
          `/api/athletes/${athleteId}/share`,
          { data: { action: "activate" } },
        );
        expect(activateResponse.status()).toBe(200);
        const activateBody = (await activateResponse.json()) as {
          data: { share_code: string };
        };
        const code = activateBody.data.share_code;
        expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

        // --- Anonymous athlete context — open /{code}
        const athleteContext = await browser.newContext();
        const athletePage = await athleteContext.newPage();

        try {
          await athletePage.goto(`/${code}`);

          // --- AC-5 — read-only profile rendered.
          await expect(
            athletePage.getByRole("heading", { name: initialName }),
          ).toBeVisible();
          await expect(
            athletePage.getByText(/Piłka nożna/i),
          ).toBeVisible();

          // SyncIndicator is the live-region status node.
          await expect(athletePage.locator('[role="status"]')).toBeVisible();

          // --- AC-6 — realtime: coach PATCH → athlete page reflects the
          //     new name via the athlete:{code} broadcast channel.
          const newName = `${initialName} UPDATED`;
          await patchAthlete(coachPage.request, athleteId, { name: newName });

          await expect(
            athletePage.getByRole("heading", { name: newName }),
          ).toBeVisible({ timeout: 5000 });
        } finally {
          await athleteContext.close();
        }
      } finally {
        if (athleteId) {
          await cleanupAthlete(coachPage.request, athleteId);
        }
        await coachContext.close();
      }
    });
  });
});
