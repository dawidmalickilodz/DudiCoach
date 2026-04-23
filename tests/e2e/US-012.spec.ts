import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

/**
 * US-012 — Testy sprawnościowe - dynamiczne per sport.
 *
 * Covers:
 *  - Coach tab "Testy": empty state, create result via form (AC-1, AC-3)
 *  - Sport-filtered dropdown + hint when sport unset (AC-2, AC-4)
 *  - Trend indicator text/symbol assertions — no CSS class assertions (AC-5)
 *  - Two-step delete confirm: cancel keeps result, confirm removes it (AC-6)
 *
 * Authenticated scenarios are skipped unless E2E_COACH_EMAIL +
 * E2E_COACH_PASSWORD are set. Same guard pattern as US-011.
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FitnessTestResult {
  id: string;
  athlete_id: string;
  test_key: string;
  value: number;
  test_date: string;
  notes: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Shared date strings (computed once per spec execution)
// ---------------------------------------------------------------------------

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

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
    throw new Error(`Unexpected create athlete status: ${response.status()}`);
  }
  const body = (await response.json()) as { data: { id: string } };
  return body.data.id;
}

async function cleanupAthlete(
  request: APIRequestContext,
  athleteId: string,
): Promise<void> {
  const response = await request.delete(`/api/athletes/${athleteId}`);
  const status = response.status();
  if (![204, 404].includes(status)) {
    // Teardown cleanup is best-effort and should not mask assertion failures.
    console.warn(
      `Teardown cleanup skipped for athlete ${athleteId} (status: ${status}).`,
    );
  }
}

/**
 * PATCH /api/athletes/[id] with { sport }.
 * updateAthleteSchema is partial and includes sport: z.string().nullable().optional()
 * so this payload is valid without any additional production changes.
 */
async function setAthleteSport(
  request: APIRequestContext,
  athleteId: string,
  sport: string | null,
): Promise<void> {
  const response = await request.patch(`/api/athletes/${athleteId}`, {
    data: { sport },
  });
  if (response.status() !== 200) {
    throw new Error(
      `Unexpected PATCH athlete sport status: ${response.status()}`,
    );
  }
}

async function createTestResult(
  request: APIRequestContext,
  athleteId: string,
  payload: {
    test_key: string;
    value: number;
    test_date: string;
    notes?: string;
  },
): Promise<FitnessTestResult> {
  const response = await request.post(`/api/athletes/${athleteId}/tests`, {
    data: payload,
  });
  if (response.status() !== 201) {
    const text = await response.text();
    throw new Error(
      `Unexpected create test result status: ${response.status()} — ${text}`,
    );
  }
  const body = (await response.json()) as { data: FitnessTestResult };
  return body.data;
}

async function listTestResults(
  request: APIRequestContext,
  athleteId: string,
): Promise<FitnessTestResult[]> {
  const response = await request.get(`/api/athletes/${athleteId}/tests`);
  if (response.status() !== 200) {
    throw new Error(
      `Unexpected list test results status: ${response.status()}`,
    );
  }
  const body = (await response.json()) as { data?: FitnessTestResult[] };
  return body.data ?? [];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("US-012 - fitness tests feature", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    missingCoachCredentials,
    "Set E2E_COACH_EMAIL and E2E_COACH_PASSWORD to run authenticated E2E tests.",
  );

  // ─── AC-1, AC-3: empty state + create result via form ────────────────────

  test("coach sees empty state and adds a test result via form (AC-1, AC-3)", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await loginAsCoach(page);

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const athleteName = `E2E US-012 Form ${suffix}`;
    let athleteId: string | null = null;

    try {
      athleteId = await createAthlete(page.request, athleteName);
      await page.goto(`/athletes/${athleteId}`);
      await page.getByRole("tab", { name: /^Testy$/i }).click();

      // AC-1: section heading visible, empty state shown.
      await expect(
        page.getByRole("heading", { name: /Testy sprawności/i }),
      ).toBeVisible();
      await expect(page.getByText(/Brak wyników testów/i)).toBeVisible();

      // AC-3: open form and submit a result.
      await page.getByRole("button", { name: /Dodaj wynik/i }).click();
      await expect(
        page.getByRole("heading", { name: /Nowy wynik testu/i }),
      ).toBeVisible();

      // squat_1rm is a universal test (sports: "all") — valid regardless of sport.
      await page.locator("#test-selector").selectOption("squat_1rm");
      await page.locator("#test-value").fill("100");
      await page.locator("#test-date").fill(today);
      await page.getByRole("button", { name: /Zapisz wynik/i }).click();

      // Form closes after successful submit.
      await expect(
        page.getByRole("heading", { name: /Nowy wynik testu/i }),
      ).toBeHidden({ timeout: 10_000 });

      // Result appears in history with name and value.
      await expect(page.getByText("Przysiad 1RM")).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(/100\s*kg/)).toBeVisible();
    } finally {
      if (athleteId) {
        await cleanupAthlete(page.request, athleteId);
      }
    }
  });

  // ─── AC-2, AC-4: sport-filtered dropdown + sport hint ────────────────────

  test("sport=null shows only universal tests with hint; setting sport exposes sport-specific options (AC-2, AC-4)", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await loginAsCoach(page);

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const athleteName = `E2E US-012 Sport ${suffix}`;
    let athleteId: string | null = null;

    try {
      athleteId = await createAthlete(page.request, athleteName);
      // Athlete has sport=null by default (createAthleteSchema makes sport optional).

      await page.goto(`/athletes/${athleteId}`);
      await page.getByRole("tab", { name: /^Testy$/i }).click();
      await page.getByRole("button", { name: /Dodaj wynik/i }).click();

      const selector = page.locator("#test-selector");
      await expect(selector).toBeVisible();

      // AC-4: five universal tests present when sport=null.
      await expect(
        page.locator('#test-selector option[value="squat_1rm"]'),
      ).toBeAttached();
      await expect(
        page.locator('#test-selector option[value="bench_press_1rm"]'),
      ).toBeAttached();
      await expect(
        page.locator('#test-selector option[value="deadlift_1rm"]'),
      ).toBeAttached();
      await expect(
        page.locator('#test-selector option[value="plank_hold"]'),
      ).toBeAttached();
      await expect(
        page.locator('#test-selector option[value="run_1000m"]'),
      ).toBeAttached();

      // AC-2: sport-specific tests must NOT be present when sport=null.
      await expect(
        page.locator('#test-selector option[value="sprint_30m"]'),
      ).toHaveCount(0);
      await expect(
        page.locator('#test-selector option[value="yoyo_ir1"]'),
      ).toHaveCount(0);

      // Hint text visible when sport is unset.
      await expect(page.getByText(/Ustaw sport zawodnika/i)).toBeVisible();

      // Set sport via API, then reload the page so the server re-renders with
      // the updated athlete.sport prop.
      await setAthleteSport(page.request, athleteId, "pilka_nozna");
      await page.goto(`/athletes/${athleteId}`);
      await page.getByRole("tab", { name: /^Testy$/i }).click();
      await page.getByRole("button", { name: /Dodaj wynik/i }).click();

      // After sport is set: pilka_nozna-specific tests are present.
      await expect(
        page.locator('#test-selector option[value="sprint_30m"]'),
      ).toBeAttached();
      await expect(
        page.locator('#test-selector option[value="yoyo_ir1"]'),
      ).toBeAttached();
      await expect(
        page.locator('#test-selector option[value="t_test"]'),
      ).toBeAttached();
      await expect(
        page.locator('#test-selector option[value="broad_jump"]'),
      ).toBeAttached();

      // Hint must be gone once sport is set.
      await expect(page.getByText(/Ustaw sport zawodnika/i)).toHaveCount(0);
    } finally {
      if (athleteId) {
        await cleanupAthlete(page.request, athleteId);
      }
    }
  });

  // ─── AC-5: trend indicator text and symbol ────────────────────────────────

  test("trend indicator shows correct arrow and label text after two results (AC-5)", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await loginAsCoach(page);

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const athleteName = `E2E US-012 Trend ${suffix}`;
    let athleteId: string | null = null;

    try {
      athleteId = await createAthlete(page.request, athleteName);

      // Seed squat_1rm (higher_is_better):
      //   yesterday=90 kg, today=100 kg → delta=+10 → ↑ (improvement)
      // squat_1rm is sports:"all" so no sport PATCH needed.
      await createTestResult(page.request, athleteId, {
        test_key: "squat_1rm",
        value: 90,
        test_date: yesterday,
      });
      await createTestResult(page.request, athleteId, {
        test_key: "squat_1rm",
        value: 100,
        test_date: today,
      });

      // Seed run_1000m (lower_is_better):
      //   yesterday=240 s, today=200 s → delta=-40 → ↓ (improvement — faster time)
      // run_1000m is sports:"all" so no sport PATCH needed.
      await createTestResult(page.request, athleteId, {
        test_key: "run_1000m",
        value: 240,
        test_date: yesterday,
      });
      await createTestResult(page.request, athleteId, {
        test_key: "run_1000m",
        value: 200,
        test_date: today,
      });

      await page.goto(`/athletes/${athleteId}`);
      await page.getByRole("tab", { name: /^Testy$/i }).click();

      // squat_1rm: today(100) vs yesterday(90) → delta=+10, higher_is_better
      // TrendIndicator renders: "↑ 10 kg"  (arrow=↑, absDelta=10, unit=kg)
      await expect(page.getByText(/↑\s*10\s*kg/)).toBeVisible({
        timeout: 10_000,
      });

      // run_1000m: today(200) vs yesterday(240) → delta=-40, lower_is_better
      // TrendIndicator renders: "↓ 40 s"  (arrow=↓, absDelta=40, unit=s)
      await expect(page.getByText(/↓\s*40\s*s/)).toBeVisible({
        timeout: 10_000,
      });

      // Older results (yesterday for each test) have no trend indicator text
      // because there is no prior result to compare against.
      // We assert that each trend text appears exactly once (not doubled).
      await expect(page.getByText(/↑\s*10\s*kg/)).toHaveCount(1);
      await expect(page.getByText(/↓\s*40\s*s/)).toHaveCount(1);
    } finally {
      if (athleteId) {
        await cleanupAthlete(page.request, athleteId);
      }
    }
  });

  // ─── AC-6: two-step delete confirm flow ──────────────────────────────────

  test("delete confirm: cancel keeps result, confirm removes it and refreshes list (AC-6)", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await loginAsCoach(page);

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
    const athleteName = `E2E US-012 Delete ${suffix}`;
    let athleteId: string | null = null;

    try {
      athleteId = await createAthlete(page.request, athleteName);

      // Seed a single result to delete — plank_hold (sports:"all", name:"Deska").
      const seeded = await createTestResult(page.request, athleteId, {
        test_key: "plank_hold",
        value: 60,
        test_date: today,
      });

      await page.goto(`/athletes/${athleteId}`);
      await page.getByRole("tab", { name: /^Testy$/i }).click();

      // Result visible in history.
      await expect(page.getByText("Deska")).toBeVisible({ timeout: 10_000 });

      // Step 1: click Usuń → confirm area appears, no deletion yet.
      await page.getByRole("button", { name: /^Usuń$/i }).click();
      await expect(page.getByText(/Na pewno usunąć/i)).toBeVisible();

      // Cancel path: Anuluj → confirm area gone, result still present.
      await page.getByRole("button", { name: /^Anuluj$/i }).click();
      await expect(page.getByText(/Na pewno usunąć/i)).toHaveCount(0);
      await expect(page.getByText("Deska")).toBeVisible();

      // Confirm path: Usuń → Potwierdź → result removed.
      await page.getByRole("button", { name: /^Usuń$/i }).click();
      await expect(page.getByText(/Na pewno usunąć/i)).toBeVisible();
      await page.getByRole("button", { name: /Potwierdź/i }).click();

      // Result disappears from UI and empty state is shown.
      await expect(page.getByText("Deska")).toHaveCount(0, {
        timeout: 10_000,
      });
      await expect(page.getByText(/Brak wyników testów/i)).toBeVisible();

      // Verify via API that the row was actually deleted from the database.
      const remaining = await listTestResults(page.request, athleteId);
      expect(remaining.find((r) => r.id === seeded.id)).toBeUndefined();
    } finally {
      if (athleteId) {
        await cleanupAthlete(page.request, athleteId);
      }
    }
  });
});
