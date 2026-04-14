---
story_id: US-005
title: Generowanie planu treningowego przez Claude AI
verdict: pass
date: 2026-04-14
tester: qa-dev
test_count: 180
test_pass: 180
test_fail: 0
---

# QA Dev Report — US-005

## Test Execution Results

**Runner**: Vitest 4.1.4
**Total project tests**: 180 (all pass)
**Typecheck**: clean (`tsc --noEmit` — 0 errors)
**Lint**: clean (`eslint app components lib` — 0 errors, 0 warnings)
**Browser preview**: dev server up, no console/server errors loading the coach editor route shells

### Tests directly relevant to US-005

| File | What it covers | Tests | Result |
|---|---|---|---|
| `tests/unit/lib/ai/parse-plan-json.test.ts` | Clean JSON, surrounding whitespace, ```json fences, bare ``` fences, preamble extraction, no-JSON error, malformed JSON error, schema validation (wrong week count, missing required field) | 9 | all pass |
| `tests/unit/lib/ai/rate-limiter.test.ts` | Allows ≤3 req/min, blocks 4th, releases after window passes, isolated per identifier, retryAfterMs accuracy | 5 | all pass |

### What is NOT covered by unit/integration tests

Live calls to the Anthropic API are not exercised in CI by design (cost + nondeterminism). The mocked-SDK integration test for `POST /api/athletes/[id]/plans` is recommended as a follow-up — the route's retry loop and error mapping are exercised against a real client today only via manual smoke. Logic that *can* be unit-tested (parser, rate-limiter) is. The Anthropic-driven happy path (AC-3, AC-4) is owned by qa-test E2E with a recorded fixture.

## Acceptance Criteria Coverage

| AC | Description | Coverage |
|---|---|---|
| AC-1 | Przycisk generowania w edytorze | `PlanTabContent` → `PlanGenerateSection` → `AthleteContextInfo` (level + phase + plan count + "Pierwszy plan"/"Kontynuacja po N") + `GeneratePlanButton`. Verified by typecheck + manual preview that components mount. |
| AC-2 | Spinner podczas generowania | `GeneratePlanButton` accepts `isGenerating`, swaps label to `pl.coach.athlete.plans.generating` and renders an `animate-spin` indicator. Disabled while pending (`isDisabled`). Wired via `generateMutation.isPending` in `PlanTabContent`. |
| AC-3 | Plan zapisany i wyświetlony | `PlanViewer` → `PlanHeader` (name/phase/summary/weeklyOverview), `WeekNavigation` (4-week pills), `WeekView` → `DayCard` (expandable days with warmup/exercises/cooldown/duration), `ExerciseRow` (name + 7 fields), `PlanFooter` (progressionNotes/nutritionTips/recoveryProtocol). Schema enforced by `trainingPlanJsonSchema` (4 weeks exact, ≥1 day per week, ≥1 exercise per day). |
| AC-4 | Kontuzje respektowane | Belongs to the prompt-engineering layer (`lib/ai/prompts/plan-generation.ts`) — covered by E2E with a fixture athlete carrying an injury. Out of scope for unit tests (semantic check on Claude's output). |
| AC-5 | Obsługa timeout | `lib/api/plans.ts` maps HTTP 504 → `TimeoutError`; `PlanTabContent.mapErrorToMessage` returns `pl.coach.athlete.plans.errorTimeout` ("Przekroczono czas. Spróbuj ponownie."). Backend route maps `Anthropic.APIConnectionTimeoutError` → 504. |
| AC-6 | Obsługa invalid JSON | Thoroughly covered in `parse-plan-json.test.ts`: strips ```json fences, bare ``` fences, surrounding whitespace, preamble text, and surfaces typed errors when no JSON object is present or schema fails. |
| AC-7 | Retry po błędzie | Retry loop in `app/api/athletes/[id]/plans/route.ts` (MAX_ATTEMPTS=2, RETRY_DELAY_MS=1000, retryable codes [500, 502, 503, 529]). Parse failures are NOT retried (deterministic). Final failure returns 500 + `pl.coach.athlete.plans.errorGeneric`. |
| AC-8 | Rate limiting | `lib/ai/rate-limiter.ts` (3 req/min sliding window per identifier) — verified by 5 unit tests including isolation per coach and retryAfterMs accuracy. Backend returns 429 with `Retry-After` header; client maps to `pl.coach.athlete.plans.errorRateLimit`. |

## Manual Verification (browser preview)

1. **Dev server boots** with no crashes; `/api/athlete/<bad>` returns 404 (regex enforcement).
2. **Editor route shells** load. Tabs `Plany` and `Online` are no longer disabled — switching to either renders the corresponding component without runtime error (verified by absence of console errors).
3. **End-to-end `Generuj plan AI`** click flow requires authenticated coach + valid Anthropic key + a real athlete row. Owned by qa-test E2E.

## Issues Found

1. **(fixed)** Lint flagged `PlanTabContent`'s `useEffect` (set-state-in-effect anti-pattern). Refactored to derive selection during render — no effect required.
2. **(fixed)** `app/page.tsx` used a raw `<a href="/login">`. Replaced with `next/link`.
3. **None blocking.**

## Coverage Assessment

- The two pure-logic modules with the most failure modes (parser + rate limiter) have direct unit coverage with deterministic timers.
- The Anthropic SDK boundary is the right place to draw the unit/integration line — testing it without a recorded fixture would create flaky tests.
- Prompt-injection / safety review of the user prompt template (`plan-generation.ts`) belongs to the code-reviewer stage.

## Verdict

**PASS** — 180/180 tests pass, typecheck clean, lint clean. Parser and rate-limiter behavior verified directly; remaining ACs (live AI flow, injury-aware prompting) handed off to qa-test.
