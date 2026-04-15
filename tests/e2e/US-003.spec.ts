import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * US-003 — Frontend lista + edycja zawodnika z auto-save.
 *
 * Covers the coach-side athlete CRUD UI flow:
 *  - Dashboard grid + FAB + CreateAthleteDialog
 *  - Redirect to /coach/athletes/[id] after creation
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
  await page.getByLabel(/Hasło/i).fill(coachPassword);
  await page.getByRole("button", { name: /Zaloguj się/i }).click();
  await expect(page).toHaveURL(/\/coach\/dashboard/);
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

test.describe("US-003 — coach athlete CRUD frontend", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    missingCoachCredentials,
    "Set E2E_COACH_EMAIL and E2E_COACH_PASSWORD to run authenticated E2E tests.",
  );

  test("creates athlete via dialog, edits profile with auto-save, deletes via API", async ({
    page,
  }) => {
    await loginAsCoach(page);

    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const athleteName = `E2E Athlete US-003 ${uniqueSuffix}`;
    let athleteId: string | null = null;

    try {
      // --- AC-1 — Dashboard FAB opens the create dialog
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

      // --- AC-2 — Submitting the dialog redirects to the editor
      await dialog.getByPlaceholder(/Imię i nazwisko/i).fill(athleteName);
      await dialog.getByRole("button", { name: /^Dodaj$/i }).click();

      await expect(page).toHaveURL(/\/coach\/athletes\/[^/]+$/);
      // Grab the athlete id from the URL for cleanup.
      const url = new URL(page.url());
      athleteId = url.pathname.split("/").pop() ?? null;
      expect(athleteId).toBeTruthy();

      // Name visible in the editor shell header.
      await expect(
        page.getByRole("heading", { name: athleteName }),
      ).toBeVisible();

      // --- AC-3 — Auto-save on profile form fields (no explicit Save button)
      // Fill a few fields and wait for the "Zapisano" status.
      await page.getByLabel(/^Wiek$/i).fill("27");

      // "Zapisuję..." may flash then swap to "✓ Zapisano".
      // Wait up to 3s for the saved indicator — 800ms debounce + server round-trip.
      await expect(page.getByText(/✓\s*Zapisano/i)).toBeVisible({
        timeout: 5000,
      });

      await page.getByLabel(/Waga \(kg\)/i).fill("75");
      await expect(page.getByText(/✓\s*Zapisano/i)).toBeVisible({
        timeout: 5000,
      });

      await page.getByLabel(/Wzrost \(cm\)/i).fill("180");
      await expect(page.getByText(/✓\s*Zapisano/i)).toBeVisible({
        timeout: 5000,
      });

      // --- AC-4 — Level badge reflects training_start_date change
      // Setting today's date means level = Początkujący.
      const today = new Date().toISOString().slice(0, 10);
      await page.getByLabel(/Data rozpoczęcia/i).fill(today);
      await expect(page.getByText(/✓\s*Zapisano/i)).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/Początkujący/i).first()).toBeVisible();

      // --- AC-5 — Back navigation returns to the dashboard and the new card is there.
      await page.getByRole("link", { name: /Wstecz/i }).click();
      await expect(page).toHaveURL(/\/coach\/dashboard/);
      await expect(
        page.getByRole("button", { name: athleteName }),
      ).toBeVisible();

      // API-level verification (the response body is the source of truth).
      const getResponse = await page.request.get(`/api/athletes/${athleteId}`);
      expect(getResponse.status()).toBe(200);
      const getJson = (await getResponse.json()) as {
        data?: {
          age?: number | null;
          weight_kg?: number | string | null;
          height_cm?: number | null;
          training_start_date?: string | null;
        };
      };
      expect(getJson.data?.age).toBe(27);
      expect(Number(getJson.data?.weight_kg)).toBe(75);
      expect(getJson.data?.height_cm).toBe(180);
      expect(getJson.data?.training_start_date).toBe(today);
    } finally {
      if (athleteId) {
        await cleanupAthlete(page.request, athleteId);
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

    // Submit with empty name — form validation should keep the dialog open.
    await dialog.getByRole("button", { name: /^Dodaj$/i }).click();

    // Dialog stays open, inline required-error surfaces.
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toContainText(
      /To pole jest wymagane/i,
    );

    // Dismiss via Cancel (no athlete created — no cleanup needed).
    await dialog.getByRole("button", { name: /^Anuluj$/i }).click();
    await expect(dialog).not.toBeVisible();
  });
});
