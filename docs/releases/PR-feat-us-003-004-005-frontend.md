---
branch: feat/us-004-us-005-frontend
base: main
status: draft
depends_on: PR #3 (codex/high-priority-api-e2e-fixes)
---

# PR — US-003 + US-004 + US-005 frontend

Target: `main`. **Must merge AFTER PR #3** (this branch was cut from PR #3's tip;
rebase onto `main` after PR #3 lands to keep diff clean — otherwise PR #3's 3
commits will appear in this PR too.)

## Stories

| ID | Title | Story | Design | QA dev |
|---|---|---|---|---|
| US-003 | Frontend lista + edycja zawodnika z auto-save | [US-003](../backlog/stories/US-003-athlete-crud-frontend.md) | [design](../docs/design/US-003-design.md) | [qa/dev/US-003](../qa/dev/US-003-report.md) — pass, 84/84 |
| US-004 | Share code + panel zawodnika + real-time sync | [US-004](../backlog/stories/US-004-share-code-realtime.md) | [design](../docs/design/US-004-design.md) | [qa/dev/US-004](../qa/dev/US-004-report.md) — pass |
| US-005 | Generowanie planu treningowego przez Claude AI | [US-005](../backlog/stories/US-005-ai-plan-generation.md) | [design](../docs/design/US-005-design.md) | [qa/dev/US-005](../qa/dev/US-005-report.md) — pass |

## Summary

### US-003 — athlete CRUD frontend

- Dashboard grid of `AthleteCard`s + FAB for creating new athletes
- `AthleteEditorShell` with tab pills (profile active; tests / injuries /
  diagnostics / progressions intentionally disabled until their stories land)
- `AthleteProfileForm` on react-hook-form + `useAutoSave` (800 ms debounce,
  optimistic state, save-status toast)
- `calculate-level` derives level from `training_start_date`
- TanStack Query wiring (providers, `use-athletes`, `lib/api/athletes`)

### US-004 — share-code panel + realtime sync

- `/[shareCode]` public athlete page (read-only profile + sync indicator)
- Coach `OnlineTab` with activate / deactivate / reset share-code flows
- Home page `ShareCodeForm` with client-side validation
- `useRealtimeAthlete` hook subscribes to `athlete:{code}` broadcast channel
- `PATCH /api/athletes/[id]` broadcasts `athlete_updated` after a successful
  UPDATE (fire-and-forget; broadcast failure never blocks the save)
- Public `GET /api/athlete/[shareCode]` via `get_athlete_by_share_code` RPC
- Migration: `share_active` column + `reset_share_code` RPC (SECURITY DEFINER
  with `auth.uid()` ownership check)

### US-005 — Claude AI plan generation

- Anthropic SDK client (`claude-sonnet-4-6`) with prompt caching on the system
  block (per ADR 0004)
- `POST /api/athletes/[id]/plans` — generate + validate + persist with retry
  on transient errors; `GET` lists plans
- Rate limiter (3 req/min sliding window, per coach)
- Robust JSON parser: strips ```json fences, bare ``` fences, and preamble
  text; surfaces typed errors on missing JSON / schema failure
- `PlanViewer` with 4-week navigation, `DayCard`, `ExerciseRow`, `PlanFooter`
  (progressionNotes / nutritionTips / recoveryProtocol)
- Migration: `training_plans` table + indexes + RLS policies

## Verification

- `npm run typecheck` — clean (`tsc --noEmit` — 0 errors)
- `npm run lint` — clean (0 errors, 0 warnings)
- `npm run test` — **180/180 pass** (13 test files)
- Manual browser preview: home share-code form + 404 paths verified (see the
  "Manual Verification" sections of `qa/dev/US-004-report.md` and
  `qa/dev/US-005-report.md`)

### What is NOT covered here

- Live Claude AI happy path (AC-3/AC-4 of US-005) — owned by `qa-test` E2E with
  a recorded fixture; cost + nondeterminism rules it out of CI.
- Two-browser-context realtime sync (AC-6/AC-7 of US-004) — owned by `qa-test`
  E2E (two Playwright contexts).
- Injury-aware prompting (AC-4 of US-005) — semantic check on Claude's output;
  also `qa-test` territory.

## New deps

- `@anthropic-ai/sdk`
- (others already present: `@hookform/resolvers`, `zod`, `@tanstack/react-query`
  — no version bumps)

## Migrations

- `20260413120000_US-005_training_plans.sql` — `training_plans` table
- `20260414120000_US-004_share_active_and_rpc.sql` — `share_active` column +
  `reset_share_code` RPC

Both migrations are idempotent-safe against a fresh DB and were verified locally
against the linked Supabase project.

## Review checklist for `code-reviewer`

- [ ] Security — prompt-injection review of `lib/ai/prompts/plan-generation.ts`
- [ ] Security — RLS coverage on `training_plans` + `share_active` column
- [ ] Polish copy — every new user-facing string goes through `lib/i18n/pl.ts`
- [ ] Dark theme tokens — no hardcoded colors in new components
- [ ] A11y — forms/buttons/alerts, `role="alert"`, aria-describedby on the
      share-code error
