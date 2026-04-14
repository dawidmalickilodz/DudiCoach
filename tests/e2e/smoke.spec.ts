import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

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

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(
    page.getByRole("heading", { name: /Panel trenera/i }),
  ).toBeVisible();
}

async function cleanupAthlete(
  request: APIRequestContext,
  athleteId: string,
): Promise<void> {
  const response = await request.delete(`/api/athletes/${athleteId}`);

  // 204 => cleaned, 404 => already deleted by test flow.
  if (![204, 404].includes(response.status())) {
    throw new Error(
      `Unexpected cleanup status (${response.status()}) for athlete ${athleteId}`,
    );
  }
}

test.describe("US-001 + US-002 high-priority E2E", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    missingCoachCredentials,
    "Set E2E_COACH_EMAIL and E2E_COACH_PASSWORD to run authenticated E2E tests.",
  );

  test("US-001: /dashboard is protected for unauthenticated users", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /Zaloguj się/i })).toBeVisible();
  });

  test("US-001: invalid credentials keep user on /login and clear password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/Email/i).fill(coachEmail);
    await page.getByLabel(/Hasło/i).fill(`${coachPassword}-wrong`);
    await page.getByRole("button", { name: /Zaloguj się/i }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText(/Nieprawidłowy email lub hasło/i),
    ).toBeVisible();
    await expect(page.locator("#password")).toHaveValue("");
  });

  test("US-001: successful login redirects to dashboard", async ({ page }) => {
    await loginAsCoach(page);
  });

  test("US-001: logout always redirects back to /login", async ({ page }) => {
    await loginAsCoach(page);

    await page.getByRole("button", { name: /Wyloguj/i }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /Zaloguj się/i })).toBeVisible();
  });

  test("US-002: authenticated API CRUD flow works end-to-end", async ({ page }) => {
    await loginAsCoach(page);

    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const athleteName = `E2E Athlete ${uniqueSuffix}`;
    let athleteId: string | null = null;

    try {
      const createResponse = await page.request.post("/api/athletes", {
        data: {
          name: athleteName,
          age: 25,
          weight_kg: 80,
          sport: "Siłownia",
          training_days_per_week: 4,
          session_minutes: 60,
        },
      });

      expect(createResponse.status()).toBe(201);
      const createJson = (await createResponse.json()) as {
        data?: { id?: string; name?: string };
      };
      athleteId = createJson.data?.id ?? null;
      expect(athleteId).toBeTruthy();
      expect(createJson.data?.name).toBe(athleteName);

      const listResponse = await page.request.get("/api/athletes");
      expect(listResponse.status()).toBe(200);
      const listJson = (await listResponse.json()) as {
        data?: Array<{ id: string; name: string }>;
      };
      expect(
        listJson.data?.some((athlete) => athlete.id === athleteId),
      ).toBe(true);

      const patchResponse = await page.request.patch(`/api/athletes/${athleteId}`, {
        data: {
          weight_kg: 82,
        },
      });
      expect(patchResponse.status()).toBe(200);
      const patchJson = (await patchResponse.json()) as {
        data?: { weight_kg?: number | string };
      };
      expect(Number(patchJson.data?.weight_kg)).toBe(82);

      const getSingleResponse = await page.request.get(`/api/athletes/${athleteId}`);
      expect(getSingleResponse.status()).toBe(200);
      const getSingleJson = (await getSingleResponse.json()) as {
        data?: { id?: string; name?: string };
      };
      expect(getSingleJson.data?.id).toBe(athleteId);
      expect(getSingleJson.data?.name).toBe(athleteName);

      const deleteResponse = await page.request.delete(`/api/athletes/${athleteId}`);
      expect(deleteResponse.status()).toBe(204);

      const getAfterDeleteResponse = await page.request.get(
        `/api/athletes/${athleteId}`,
      );
      expect(getAfterDeleteResponse.status()).toBe(404);

      // Prevent redundant cleanup call in finally.
      athleteId = null;
    } finally {
      if (athleteId) {
        await cleanupAthlete(page.request, athleteId);
      }
    }
  });
});
