import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * US-003 â€” Frontend lista + edycja zawodnika z auto-save.
 *
 * Covers the coach-side athlete CRUD UI flow:
 *  - Dashboard grid + FAB + CreateAthleteDialog
 *  - Redirect to /athletes/[id] after creation
 *  - AthleteProfileForm auto-save (no explicit "Save" button)
 *  - Level badge derived from training_start_date
 *  - Deleting an athlete via API as teardown
 *
 * All authenticated scenarios are skipped unless E2E_COACH_EMAIL +
 * E2E_COACH_PASSWORD are set (matches US-001/US-002 convention).
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

async function loginAsCoach(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/Email/i).fill(coachEmail);
  await page.getByLabel(/Has/i).fill(coachPassword);
  await page.getByRole("button", { name: /Zaloguj/i }).click();
  await expect(page).toHaveURL(/\/(?:coach\/)?dashboard\/?$/, {
    timeout: 20_000,
  });
}

async function cleanupAthlete(
  request: APIRequestContext,
  athleteId: string,
): Promise<void> {
  const response = await request.delete(`/api/athletes/${athleteId}`, {
    timeout: 15_000,
  });
  if (![204, 404].includes(response.status())) {
    throw new Error(
      `Unexpected cleanup status (${response.status()}) for athlete ${athleteId}`,
    );
  }
}

interface AthleteSnapshot {
  age?: number | null;
  weight_kg?: number | string | null;
  height_cm?: number | null;
  training_start_date?: string | null;
}

async function waitForAthleteSnapshot(
  request: APIRequestContext,
  athleteId: string,
  predicate: (snapshot: AthleteSnapshot) => boolean,
  timeoutMs = 15_000,
): Promise<AthleteSnapshot> {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot: AthleteSnapshot = {};

  while (Date.now() < deadline) {
    const response = await request.get(`/api/athletes/${athleteId}`);
    if (response.status() === 200) {
      const json = (await response.json()) as { data?: AthleteSnapshot };
      const snapshot = json.data ?? {};
      lastSnapshot = snapshot;

      if (predicate(snapshot)) {
        return snapshot;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Timed out waiting for athlete ${athleteId} snapshot to match expected values. Last snapshot: ${JSON.stringify(lastSnapshot)}`,
  );
}

test.describe("US-003 â€” coach athlete CRUD frontend", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    missingCoachCredentials,
    "Set E2E_COACH_EMAIL and E2E_COACH_PASSWORD to run authenticated E2E tests.",
  );

  test("creates athlete via dialog, edits profile with auto-save, deletes via API", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await loginAsCoach(page);

    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const athleteName = `E2E Athlete US-003 ${uniqueSuffix}`;
    let athleteId: string | null = null;

    try {
      // --- AC-1 â€” Dashboard FAB opens the create dialog
      await expect(
        page.getByRole("heading", { name: /Panel trenera/i }),
      ).toBeVisible();

      await page
        .getByRole("button", { name: /Dodaj zawodnika/i })
        .click();

      const dialog = page.getByRole("dialog", {
        name: /Nowy zawodnik/i,
      });
      await expect(dialog).toBeVisible();

      // --- AC-2 â€” Submitting the dialog redirects to the editor
      await dialog.locator("#new-athlete-name").fill(athleteName);
      await dialog.getByRole("button", { name: /^Dodaj$/i }).click();

      await expect(page).toHaveURL(/\/athletes\/[^/]+$/, {
        timeout: 20_000,
      });
      // Grab the athlete id from the URL for cleanup.
      const url = new URL(page.url());
      athleteId = url.pathname.split("/").pop() ?? null;
      expect(athleteId).toBeTruthy();

      // Name visible in the editor shell header.
      await expect(
        page.getByRole("heading", { name: athleteName }),
      ).toBeVisible();

      // --- AC-3 â€” Auto-save on profile form fields (no explicit Save button)
      await page.locator("#age").fill("27");
      await page.locator("#weight_kg").fill("75");
      await page.locator("#height_cm").fill("180");

      // --- AC-4 â€” Level badge reflects training_start_date change
      // Setting today's date means level = PoczÄ…tkujÄ…cy.
      await page.locator("#training_experience_bucket").selectOption("lessThan1Year");
      await expect(
        page.getByRole("status").filter({ hasText: /Zapis/i }).first(),
      ).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/Pocz/i).first()).toBeVisible();

      // Wait until the debounced auto-save is actually persisted in the backend.
      const persisted = await waitForAthleteSnapshot(
        page.request,
        athleteId as string,
        (snapshot) =>
          snapshot.age === 27 &&
          Number(snapshot.weight_kg) === 75 &&
          snapshot.height_cm === 180 &&
          snapshot.training_start_date != null,
      );

      expect(persisted.age).toBe(27);
      expect(Number(persisted.weight_kg)).toBe(75);
      expect(persisted.height_cm).toBe(180);
      expect(persisted.training_start_date).toBeTruthy();

      // --- AC-5 â€” Back navigation returns to the dashboard and the new card is there.
      await page.getByRole("button", { name: /Wstecz/i }).click();
      await expect(page).toHaveURL(/\/(?:coach\/)?dashboard\/?$/);
      await expect(
        page.getByRole("button", { name: athleteName }),
      ).toBeVisible();
    } finally {
      if (athleteId) {
        // Unmount auto-save form before cleanup to avoid in-flight PATCH requests
        // racing with DELETE on the same row.
        await page.goto("/dashboard");
        try {
          await cleanupAthlete(page.request, athleteId);
        } catch (cleanupErr) {
          console.warn(
            `[US-003 E2E] Cleanup failed for athlete ${athleteId}: ${
              cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)
            }`,
          );
        }
      }
    }
  });

  test("dialog validation blocks submit when name is empty", async ({
    page,
  }) => {
    await loginAsCoach(page);

    await page.getByRole("button", { name: /Dodaj zawodnika/i }).click();
    const dialog = page.getByRole("dialog", { name: /Nowy zawodnik/i });
    await expect(dialog).toBeVisible();

    // Submit with empty name â€” form validation should keep the dialog open.
    await dialog.getByRole("button", { name: /^Dodaj$/i }).click();

    // Dialog stays open, inline required-error surfaces.
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toContainText(
      /To pole jest wymagane/i,
    );

    // Dismiss via Cancel (no athlete created â€” no cleanup needed).
    await dialog.getByRole("button", { name: /^Anuluj$/i }).click();
    await expect(dialog).not.toBeVisible();
  });
});

