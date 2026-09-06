import { test, expect, type Page } from "@playwright/test";

/**
 * US-022 - structured session outcomes.
 *
 * Runs only against an isolated preview fixture. The share code is a bearer
 * credential, so traces/screenshots/videos are disabled for this spec.
 *
 * Required env:
 *   E2E_US022_SHARE_CODE - active synthetic athlete share code
 *   E2E_COACH_EMAIL      - coach owning the synthetic athlete
 *   E2E_COACH_PASSWORD   - coach password
 * Optional env:
 *   E2E_US022_WEEK_NUMBER - defaults to 1
 *   E2E_US022_DAY_NUMBER  - defaults to 1
 */

const shareCode = process.env.E2E_US022_SHARE_CODE ?? "";
const coachEmail = process.env.E2E_COACH_EMAIL ?? "";
const coachPassword = process.env.E2E_COACH_PASSWORD ?? "";
const weekNumber = Number(process.env.E2E_US022_WEEK_NUMBER ?? "1");
const dayNumber = Number(process.env.E2E_US022_DAY_NUMBER ?? "1");
const isCI = !!process.env.CI;

const CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

function validateFixture(): string | null {
  if (!shareCode) return "Set E2E_US022_SHARE_CODE.";
  if (!coachEmail || !coachPassword) {
    return "Set E2E_COACH_EMAIL and E2E_COACH_PASSWORD.";
  }
  if (shareCode !== shareCode.toUpperCase()) {
    return "E2E_US022_SHARE_CODE must be uppercase.";
  }
  if (!CODE_REGEX.test(shareCode)) {
    return "E2E_US022_SHARE_CODE has invalid format.";
  }
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 4) {
    return "E2E_US022_WEEK_NUMBER must be an integer from 1 to 4.";
  }
  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) {
    return "E2E_US022_DAY_NUMBER must be an integer from 1 to 7.";
  }
  return null;
}

function dateNDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function dayNumberForProject(projectName: string): number {
  if (!/mobile/i.test(projectName)) return dayNumber;
  return dayNumber === 7 ? 6 : dayNumber + 1;
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

const fixtureError = validateFixture();

if (isCI && fixtureError) {
  throw new Error(`US-022 E2E fixture misconfiguration: ${fixtureError}`);
}

test.use({ trace: "off", screenshot: "off", video: "off" });

test.describe("US-022 - structured session outcomes", () => {
  test.describe.configure({ mode: "serial" });

  test.skip(
    fixtureError !== null,
    fixtureError ?? "Set US-022 E2E fixture env vars.",
  );

  test("athlete adds and edits structured outcome visible to coach", async ({
    page,
  }, testInfo) => {
    const activeDayNumber = dayNumberForProject(testInfo.project.name);
    const sessionDate = dateNDaysAgo(1);
    const comment = `E2E US-022 structured outcome ${Date.now()}`;
    const updatedComment = `${comment} updated`;

    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await page.getByLabel(/Panel zawodnika/i).fill(shareCode);
    await page.getByRole("button", { name: /^Połącz$/i }).click();
    await expect(page.getByText("Feedback po treningu").first()).toBeVisible();

    if (weekNumber !== 1) {
      await page.getByRole("tab", { name: `Tydzień ${weekNumber}` }).click();
    }

    const feedbackSection = page.getByTestId(
      `public-feedback-${weekNumber}-${activeDayNumber}`,
    );
    await expect(feedbackSection).toBeVisible();
    await expect(feedbackSection.getByText(/Ładowanie feedbacku/i)).toHaveCount(
      0,
    );

    const addOutcomeButton = feedbackSection.getByRole("button", {
      name: /Uzupełnij podsumowanie/i,
    });
    if ((await addOutcomeButton.count()) > 0) {
      await addOutcomeButton.click();
    }

    await expect(
      feedbackSection.getByText(
        "Samopoczucie i ból są informacjami dotyczącymi zdrowia.",
      ),
    ).toBeVisible();
    await feedbackSection.getByLabel(/Data treningu/i).fill(sessionDate);
    await feedbackSection
      .getByLabel(/Status treningu/i)
      .selectOption("completed");
    await feedbackSection.getByLabel(/RPE/i).fill("8");
    await feedbackSection.getByLabel(/Samopoczucie/i).fill("4");
    await feedbackSection.getByLabel(/Ból \(0-10\)/i).fill("0");
    await feedbackSection.getByLabel(/Komentarz/i).fill(comment);

    await feedbackSection
      .getByRole("button", { name: /^Zapisz feedback$/i })
      .click();
    await expect(
      feedbackSection.getByText("Zapisano", { exact: true }),
    ).toBeVisible();

    await page.reload();
    if (weekNumber !== 1) {
      await page.getByRole("tab", { name: `Tydzień ${weekNumber}` }).click();
    }
    await expect(feedbackSection.getByLabel(/Data treningu/i)).toHaveValue(
      sessionDate,
    );
    await expect(feedbackSection.getByLabel(/Status treningu/i)).toHaveValue(
      "completed",
    );
    await expect(feedbackSection.getByLabel(/RPE/i)).toHaveValue("8");
    await expect(feedbackSection.getByLabel(/Samopoczucie/i)).toHaveValue("4");
    await expect(feedbackSection.getByLabel(/Ból \(0-10\)/i)).toHaveValue("0");
    await expect(feedbackSection.getByLabel(/Komentarz/i)).toHaveValue(comment);

    await feedbackSection
      .getByLabel(/Status treningu/i)
      .selectOption("partial");
    await feedbackSection.getByLabel(/RPE/i).fill("6");
    await feedbackSection.getByLabel(/Samopoczucie/i).fill("3");
    await feedbackSection.getByLabel(/Ból \(0-10\)/i).fill("2");
    await feedbackSection.getByLabel(/Miejsce bólu/i).selectOption("knee");
    await feedbackSection.getByLabel(/Strona bólu/i).selectOption("left");
    await feedbackSection.getByLabel(/Komentarz/i).fill(updatedComment);
    await feedbackSection
      .getByRole("button", { name: /^Zapisz feedback$/i })
      .click();
    await expect(
      feedbackSection.getByText("Zapisano", { exact: true }),
    ).toBeVisible();

    await page.reload();
    if (weekNumber !== 1) {
      await page.getByRole("tab", { name: `Tydzień ${weekNumber}` }).click();
    }
    await expect(feedbackSection.getByLabel(/Status treningu/i)).toHaveValue(
      "partial",
    );
    await expect(feedbackSection.getByLabel(/RPE/i)).toHaveValue("6");
    await expect(feedbackSection.getByLabel(/Samopoczucie/i)).toHaveValue("3");
    await expect(feedbackSection.getByLabel(/Ból \(0-10\)/i)).toHaveValue("2");
    await expect(feedbackSection.getByLabel(/Miejsce bólu/i)).toHaveValue(
      "knee",
    );
    await expect(feedbackSection.getByLabel(/Strona bólu/i)).toHaveValue(
      "left",
    );
    await expect(feedbackSection.getByLabel(/Komentarz/i)).toHaveValue(
      updatedComment,
    );

    await loginAsCoach(page);
    const athletesResponse = await page.request.get("/api/athletes");
    expect(athletesResponse.status()).toBe(200);
    const athletesJson = (await athletesResponse.json()) as {
      data?: Array<{ id: string; share_code: string }>;
    };
    const athlete = athletesJson.data?.find(
      (candidate) => candidate.share_code === shareCode,
    );
    expect(athlete?.id).toBeTruthy();

    await page.goto(`/athletes/${athlete!.id}`);
    await page.getByRole("tab", { name: /^Plany$/i }).click();
    if (weekNumber !== 1) {
      await page.getByRole("tab", { name: `Tydzień ${weekNumber}` }).click();
    }

    const coachFeedbackCard = page
      .locator("section")
      .filter({ hasText: "Feedback zawodnika" })
      .filter({ hasText: updatedComment })
      .first();
    await expect(coachFeedbackCard).toBeVisible({ timeout: 20_000 });
    await expect(coachFeedbackCard.getByText(updatedComment)).toBeVisible();
    await expect(coachFeedbackCard.getByText("Częściowy")).toBeVisible();
    await expect(coachFeedbackCard.getByText("Kolano")).toBeVisible();
    await expect(coachFeedbackCard.getByText("Lewa")).toBeVisible();
  });
});
