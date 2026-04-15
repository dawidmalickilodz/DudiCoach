---
story: US-005
reviewer: code-reviewer
date: 2026-04-15
verdict: Approve
---

# US-005 — Generowanie planu treningowego przez Claude AI — Code Review

## Summary

End-to-end implementation of Claude-driven plan generation is well-layered:
client-side typed errors map cleanly to Polish strings, the server route
enforces auth + rate-limit + completeness + retry + parse + validate + persist
in that order, the Anthropic client uses prompt caching per ADR 0004, and the
JSON parser is robust to fenced/preambled output. RLS on `training_plans` is
correct (three policies — SELECT/INSERT/DELETE — all gated on
athlete ownership). 180/180 tests pass, typecheck clean, lint clean.

## Checklist

| # | Check | Result |
|---|---|---|
| 1 | AC-1..AC-8 coverage | PASS |
| 2 | Rate limiter — keyed by `user.id` (per coach, not global), 3 req/min sliding window, `retryAfterMs` correct, prunes stale entries (`lib/ai/rate-limiter.ts`, 5 unit tests) | PASS |
| 3 | Retry logic — `MAX_ATTEMPTS=2`, `RETRYABLE_STATUS_CODES = {500,502,503,529}`, retry network errors (`fetch`/`network` substring), parse/validation errors NOT retried (`app/api/athletes/[id]/plans/route.ts:27-43, 125-143`) | PASS |
| 4 | Prompt caching — `cache_control: { type: "ephemeral" }` on the system block (`lib/ai/client.ts:41-47`), per ADR 0004 | PASS |
| 5 | Error mapping — 422 → IncompleteDataError, 429 → RateLimitError (w/ Retry-After header), 504 → TimeoutError, other → generic. All mapped to `pl.ts` strings via `mapErrorToMessage` (`components/coach/PlanTabContent.tsx:127-136`) | PASS |
| 6 | JSON parser — fast path (`{`), strips ```json fences + bare ``` fences, extracts outermost `{...}` from preambled text, zod-validates with `trainingPlanJsonSchema` (`lib/ai/parse-plan-json.ts`, 9 unit tests) | PASS |
| 7 | Migration — `training_plans` table with FK `on delete cascade`, composite index, RLS enabled, 3 policies all gated on `athlete_id in (select id from athletes where coach_id = auth.uid())`. No UPDATE policy — plans are immutable per design (`supabase/migrations/20260413120000_US-005_training_plans.sql`) | PASS |
| 8 | Auth + zod on API boundary — `supabase.auth.getUser()` gate on POST and GET; completeness guard (422) before calling Claude | PASS |
| 9 | Model + timeout — `claude-sonnet-4-6`, `max_tokens: 8000`, `timeout: 60_000` per AC-5 (`lib/ai/client.ts`) | PASS |
| 10 | Polish copy via `pl.ts` on client (`coach.athlete.plans.errorIncompleteData/errorRateLimit/errorTimeout/errorGeneric/noPlan/generating`); dark theme tokens; `role="alert"` on error; `role="tab"` + `aria-selected` on week navigation | PASS |
| 11 | TypeScript strict — no `any`, typed errors (`IncompleteDataError`/`RateLimitError`/`TimeoutError`), typed `TrainingPlan`/`TrainingPlanJson` | PASS |

## Issues

None (0 blocking).

## Suggestions (non-blocking)

- **Prompt-injection surface**: `lib/ai/prompts/plan-generation.ts:153, 165` interpolates coach-editable `goal` and `notes` verbatim into the user prompt. In a single-coach app the coach owns those fields, so the exposure is garbage-in/garbage-out rather than a privilege escalation. Worth revisiting once athlete-editable fields (RPE, per-exercise notes in US-014/US-021) arrive — wrap untrusted input in an XML/fenced block and instruct the model to treat it as data, not instructions.
- **Server error bodies are hardcoded Polish** (`route.ts:79, 102, 149, 160, 172, 187, 210`). The client maps typed errors to `pl.ts` on display, so there is no user-visible leak, but moving the Polish into `pl.ts` would keep the invariant literally true and let the i18n layer be the single source.
- **In-memory rate limiter resets on cold start** (`lib/ai/rate-limiter.ts:16`). Documented in the design and acceptable for the single-coach deployment (cost protection, not security). If we ever move to multi-coach or edge runtime, promote this to Supabase or Upstash.
- **Integration test for the POST route** (with a mocked Anthropic client) would cover the retry loop + error mapping end-to-end. Not blocking — the parse and rate-limiter logic carry the riskier deterministic paths and are already unit-tested.
- **`computeAthleteLevel` in `plan-generation.ts:174-179`** uses thresholds 0/6/24/60 months, while `lib/utils/calculate-level.ts` uses 0/6/18/48. These serve different purposes (UI display vs. prompt context) but a shared constants module would prevent drift.
- **No ownership pre-check on GET /plans**. RLS guarantees isolation; an explicit "does this athlete belong to this coach?" check would short-circuit before hitting the DB and give a cleaner 404. Non-blocking.

## Verdict

**Approve**

## Follow-up applied — 2026-04-15

Post-review audit found 2 blocking issues in scope of this story:

- **[P2] Rate limiter silently disabled by malformed env** (`lib/ai/rate-limiter.ts:10-13`) — `parseInt("abc", 10)` produced `NaN`, and `timestamps.length >= NaN` was always `false` → rate limit completely bypassed. Cost + abuse risk. Fixed: introduced `DEFAULT_MAX_REQUESTS = 3` and guard `Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_REQUESTS`. Malformed, zero, or negative values all fall back safely.
- **[P2] Plans API leaked internal error details to client** (`app/api/athletes/[id]/plans/route.ts:158-189`) — three 500 response bodies returned `details: lastError.message`, exposing Anthropic SDK internals and parser error substrings (which could include fragments of athlete input). Fixed: removed `details` field from all three 500 bodies; `console.error` paths retained so server-side diagnostics are unchanged. Client-side error mapping unaffected (checked: `lib/api/plans.ts` only destructures `json.error`).

Tests added:
- `tests/unit/lib/ai/rate-limiter.test.ts` extended — 6 new cases covering `"abc"`, `""`, `"0"`, `"-2"`, `"5"` (regression), and `undefined` env values.
- `tests/integration/athletes/plans-route.test.ts` created — 4 cases including APIError/parser/unexpected all returning 500 with `body.details === undefined`.

Total test count: 180 → 187. All green, typecheck + lint clean.

Story remains `InE2E` — fixes are follow-ups to this Approve verdict, not a Rework bounce. See hotfix commit `9fd2758` on branch `codex/us-004-us-005-review`.
