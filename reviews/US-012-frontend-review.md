---
story: US-012
stage: review
scope: frontend
verdict: approve
reviewer: code-reviewer
date: 2026-04-21
---

# Review — US-012 Frontend Slice

## Summary
Frontend slice cleanly wraps existing API with a controlled form, sport-filtered selector, history list with per-test trend, and two-step delete. Scope respected; no API changes, no auto-save, no shell refactor beyond enabling the tab.

## Mandatory Questions

### Q1 — sport = null
Handled without error. `getFitnessTestsForSport(null)` returns the 5 "all" tests (squat/bench/deadlift 1RM, plank, run 1000m), so the dropdown is populated. User sees: functional dropdown + muted hint `pl.coach.athlete.tests.sportNotSet` ("Ustaw sport zawodnika, aby zobaczyć testy specyficzne dla sportu."). `TestSelector.tsx:23-26` + `fitness-tests.ts:162-164`.

### Q2 — TrendIndicator lower_is_better
Correct. `TrendIndicator.tsx:16,26-30`: `delta = current - previous`. For `lower_is_better` with current < previous, delta < 0 → `isImprovement = true` → `text-success` (GREEN) + `↓` arrow. For current > previous, delta > 0 → `isImprovement = false` → `text-destructive` (RED) + `↑`. Semantics inverted correctly per direction flag.

### Q3 — Strings in pl.ts
All user-facing copy is sourced from `pl.ts`. Unicode glyphs in TrendIndicator (`→ `, `↑`, `↓`) are presentation symbols, not localizable text. No hardcoded Polish/English found in any of the 4 new components.

### Q4 — CREATE/DELETE flows
- CREATE: loading (`tests.loading`), error (form inline `createMutation.error` + list-level `errorGeneric`), empty (`TestHistory.empty/emptyHint`), success (`reset()` + `setIsFormOpen(false)`) — all present (`TestsTab.tsx:68-78,175-179,204-218`).
- DELETE: Two-step confirm via `pendingDeleteId`; both Confirm and Cancel are `disabled={isDeleting}`; Confirm shows `deleting` label during mutation; list refresh via `invalidateQueries(fitnessTestKeys.list(athleteId))` — predictable (`TestHistory.tsx:34-47,121-138` + `use-fitness-tests.ts:42-46`). Correct query key used in both mutations.

## Standard Checklist
- No `any` types; `setValueAs` uses `unknown` properly (`TestsTab.tsx:135,167`).
- Scope respected: no new endpoints, no auto-save, no result editing, no shell refactor beyond `activeTab === "tests"` branch.
- DB errors not leaked: fetch layer throws generic `Error`; UI shows `pl.common.error` / `errorGeneric` only.
- Query invalidation keys correct and consistent.

## Advisory Findings
1. **AC-6 wording** — story says "confirm dialog"; implementation uses inline confirm region (no `role="dialog"`). UX is acceptable and keyboard-friendly; consider aligning the AC wording or adding a proper dialog later.
2. **Date display** — `TestHistory.tsx:74` renders `result.test_date` as raw ISO string. Acceptable for MVP; Polish locale formatting would be nicer.
3. **Trend edge case** — `delta === 0` shows neutral text without color (`text-muted-foreground`); matches AC-5 "szary". Fine.
4. **`reset()` defaults** — after submit, `value: 0` is restored; if coach rapidly logs multiple tests, they must clear the zero. Minor ergonomics only.

## Verdict
APPROVED — no blockers. Story frontend DoD items for TestsTab/TestSelector/TestHistory/TrendIndicator/i18n are satisfied.
