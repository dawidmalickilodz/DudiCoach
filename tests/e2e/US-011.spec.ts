import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
} from "@playwright/test";

/**
 * US-011 - Kontuzje zawodnika.
 *
 * Covers:
 *  - Coach tab "Kontuzje": empty state, create, inline edit (auto-save), delete
 *  - Public panel: only active injuries are visible
 *  - Public panel refresh after coach changes injury status (active -> healed)
 *
 * Authenticated scenarios are skipped unless E2E_COACH_EMAIL +
 * E2E_COACH_PASSWORD are set.
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

interface InjuryRow {
  id: string;
  athlete_id: string;
  name: string;
  body_location: string;
  severity: number;
  injury_date: string;
  status: "active" | "healing" | "healed";
  notes: string | null;
}

async function loginAsCoach(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/Email/i).fill(coachEmail);
  await page.getByLabel(/Has/i).fill(coachPassword);
  await page.getByRole("button", { name: /Zaloguj/i }).click();
  await expect(page).toHaveURL(/\/(?:coach\/)?dashboard\/?$/, {
    timeout: 20_000,
  });
}

async function createAthlete(
  request: APIRequestContext,
  name: string,
): Promise<string> {
  const response = await request.post("/api/athletes", {
    data: { name },
  });
  if (response.status() !== 201) {
    throw new Error(`Unexpected create status: ${response.status()}`);
  }
  const body = (await response.json()) as { data: { id: string } };
  return body.data.id;
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

async function listInjuries(
  request: APIRequestContext,
  athleteId: string,
): Promise<InjuryRow[]> {
  const response = await request.get(`/api/athletes/${athleteId}/injuries`);
  if (response.status() !== 200) {
    throw new Error(
      `Unexpected injuries list status (${response.status()}) for athlete ${athleteId}`,
    );
  }
  const body = (await response.json()) as { data?: InjuryRow[] };
  return body.data ?? [];
}

async function waitForInjuries(
  request: APIRequestContext,
  athleteId: string,
  predicate: (injuries: InjuryRow[]) => boolean,
  timeoutMs = 15_000,
): Promise<InjuryRow[]> {
  const deadline = Date.now() + timeoutMs;
  let last: InjuryRow[] = [];

  while (Date.now() < deadline) {
    const injuries = await listInjuries(request, athleteId);
    last = injuries;
    if (predicate(injuries)) return injuries;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Timed out waiting for injuries predicate. Last snapshot: ${JSON.stringify(last)}`,
  );
}

async function createInjury(
  request: APIRequestContext,
  athleteId: string,
  input: {
    name: string;
    body_location: string;
    severity: number;
    injury_date: string;
    status: "active" | "healing" | "healed";
    notes?: string;
  },
): Promise<InjuryRow> {
  const response = await request.post(`/api/athletes/${athleteId}/injuries`, {
    data: input,
  });
  if (response.status() !== 201) {
    throw new Error(
      `Unexpected create injury status (${response.status()}) for athlete ${athleteId}`,
    );
  }
  const body = (await response.json()) as { data: InjuryRow };
  return body.data;
}

async function patchInjury(
  request: APIRequestContext,
  athleteId: string,
  injuryId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const response = await request.patch(
    `/api/athletes/${athleteId}/injuries/${injuryId}`,
    {
      data: payload,
    },
  );
  if (response.status() !== 200) {
    throw new Error(
      `Unexpected patch injury status (${response.status()}) for athlete ${athleteId}, injury ${injuryId}`,
    );
  }
}

async function activateShare(
  request: APIRequestContext,
  athleteId: string,
): Promise<string> {
  const response = await request.post(`/api/athletes/${athleteId}/share`, {
    data: { action: "activate" },
  });
  if (response.status() !== 200) {
    throw new Error(
      `Unexpected share activation status (${response.status()}) for athlete ${athleteId}`,
    );
  }
  const body = (await response.json()) as { data: { share_code: string } };
  return body.data.share_code;
}

async function runPublicPanelFilteringScenario(browser: Browser): Promise<void> {
  const coachContext = await browser.newContext();
  const coachPage = await coachContext.newPage();
  let athleteId: string | null = null;

  try {
    await loginAsCoach(coachPage);

    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const athleteName = `E2E US-011 Public ${uniqueSuffix}`;
    athleteId = await createAthlete(coachPage.request, athleteName);

    const shareCode = await activateShare(coachPage.request, athleteId);
    expect(shareCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    const activeInjury = await createInjury(coachPage.request, athleteId, {
      name: `US-011 Active ${uniqueSuffix}`,
      body_location: "knee",
      severity: 3,
      injury_date: new Date().toISOString().slice(0, 10),
      status: "active",
      notes: "Do monitorowania",
    });

    const healedInjury = await createInjury(coachPage.request, athleteId, {
      name: `US-011 Healed ${uniqueSuffix}`,
      body_location: "shoulder",
      severity: 2,
      injury_date: new Date().toISOString().slice(0, 10),
      status: "healed",
      notes: "Zamknięta",
    });

    const athleteContext = await browser.newContext();
    const athletePage = await athleteContext.newPage();

    try {
      await athletePage.goto(`/${shareCode}`);

      await expect(
        athletePage.getByRole("heading", { name: athleteName }),
      ).toBeVisible();
      await expect(
        athletePage.getByRole("heading", { name: /^Kontuzje$/i }),
      ).toBeVisible();

      // AC-6: only active injuries should be visible on the public panel.
      await expect(athletePage.getByText(activeInjury.name)).toBeVisible();
      await expect(athletePage.getByText(healedInjury.name)).toHaveCount(0);

      // Change active -> healed and verify public list refreshes.
      await patchInjury(
        coachPage.request,
        athleteId,
        activeInjury.id,
        { status: "healed" },
      );

      await expect
        .poll(async () => {
          const response = await athletePage.request.get(
            `/api/athlete/${shareCode}/injuries`,
          );
          if (response.status() !== 200) {
            return -1;
          }
          const body = (await response.json()) as { data?: InjuryRow[] };
          return body.data?.length ?? 0;
        }, { timeout: 15_000 })
        .toBe(0);

      await expect(athletePage.getByText(activeInjury.name)).toHaveCount(0);
      await expect(
        athletePage.getByText(/Brak aktywnych kontuzji/i),
      ).toBeVisible();
    } finally {
      await athleteContext.close();
    }
  } finally {
    if (athleteId) {
      await cleanupAthlete(coachPage.request, athleteId);
    }
    await coachContext.close();
  }
}

test.describe("US-011 - injuries feature", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    missingCoachCredentials,
    "Set E2E_COACH_EMAIL and E2E_COACH_PASSWORD to run authenticated E2E tests.",
  );

  test("coach can create, auto-save edit and delete an injury", async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsCoach(page);

    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const athleteName = `E2E US-011 Coach ${uniqueSuffix}`;
    const injuryName = `US-011 Knee ${uniqueSuffix}`;
    let athleteId: string | null = null;

    try {
      athleteId = await createAthlete(page.request, athleteName);
      await page.goto(`/athletes/${athleteId}`);
      await page.getByRole("tab", { name: /^Kontuzje$/i }).click();

      // AC-1: injuries tab + empty state.
      await expect(
        page.getByRole("heading", { name: /Kontuzje zawodnika/i }),
      ).toBeVisible();
      await expect(
        page.getByText(/Brak zarejestrowanych kontuzji/i),
      ).toBeVisible();

      // AC-2: create new injury from the form.
      await page.getByRole("button", { name: /^Dodaj kontuzję$/i }).click();
      await page.locator("#injury-create-name").fill(injuryName);
      await page.locator("#injury-create-body-location").selectOption("knee");
      await page.locator("#injury-create-severity").selectOption("5");
      await page.locator("#injury-create-status").selectOption("active");
      await page.locator("#injury-create-notes").fill("Ból przy przysiadzie");

      await page
        .locator("form")
        .filter({ has: page.locator("#injury-create-name") })
        .getByRole("button", { name: /^Dodaj kontuzję$/i })
        .click();

      await expect(page.locator("article").filter({ hasText: injuryName }).first()).toBeVisible({ timeout: 10_000 });

      const createdInjuries = await waitForInjuries(
        page.request,
        athleteId,
        (injuries) => injuries.some((injury) => injury.name === injuryName),
      );
      const createdInjury = createdInjuries.find(
        (injury) => injury.name === injuryName,
      );
      expect(createdInjury).toBeTruthy();

      const card = page.locator("article").filter({ hasText: injuryName }).first();
      await card.locator("button[aria-expanded]").click();

      // AC-4 + AC-5: inline edit with auto-save.
      await page.locator('select[id^="injury-edit-severity-"]').first().selectOption("4");
      await page.locator('select[id^="injury-edit-status-"]').first().selectOption("healing");
      await page.locator('textarea[id^="injury-edit-notes-"]').first().fill(
        "Kontrola za 7 dni",
      );

      await expect(
        page.getByRole("status").filter({ hasText: /Zapis/i }).first(),
      ).toBeVisible({ timeout: 10_000 });

      await waitForInjuries(
        page.request,
        athleteId,
        (injuries) =>
          injuries.some(
            (injury) =>
              injury.name === injuryName &&
              injury.severity === 4 &&
              injury.status === "healing" &&
              injury.notes === "Kontrola za 7 dni",
          ),
      );

      // AC-3/AC-4 visual confirmation.
      await expect(card.getByText(/4 - Poważna/i)).toBeVisible();
      await expect(card.getByText(/W leczeniu/i)).toBeVisible();

      // AC-5: delete with confirm dialog.
      page.once("dialog", async (dialog) => {
        expect(dialog.type()).toBe("confirm");
        await dialog.accept();
      });
      await card.getByRole("button", { name: /Usuń/i }).click();

      await waitForInjuries(
        page.request,
        athleteId,
        (injuries) => !injuries.some((injury) => injury.name === injuryName),
      );
      await expect(page.locator("article").filter({ hasText: injuryName })).toHaveCount(0);
    } finally {
      if (athleteId) {
        // Avoid race with possible in-flight autosave call.
        await page.goto("/dashboard");
        await cleanupAthlete(page.request, athleteId);
      }
    }
  });

  test("public panel shows only active injuries and updates after status change", async ({
    browser,
  }) => {
    await runPublicPanelFilteringScenario(browser);
  });
});
