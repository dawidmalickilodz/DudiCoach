---
story: US-003
reviewer: code-reviewer
date: 2026-04-15
verdict: Approve
---

# US-003 — Frontend lista + edycja zawodnika z auto-save — Code Review

## Summary

Clean, idiomatic React 19 / Next.js 16 implementation that faithfully follows the
design doc and ADR-0001 (auto-save with react-hook-form + TanStack Query). All 7
acceptance criteria are covered by code, 84/84 unit tests pass, typecheck and
lint are clean. Polish copy lives in `lib/i18n/pl.ts`, dark theme uses token
utility classes, a11y attributes are in place (role="dialog", role="alert",
htmlFor bindings, aria-describedby). No security issues.

## Checklist

| # | Check | Result |
|---|---|---|
| 1 | AC-1..AC-7 coverage in code paths | PASS |
| 2 | Auto-save — 800ms debounce, no "Save" button, optimistic + toast | PASS |
| 3 | `useAutoSave` correctness — stable refs, skip-first-render, error branch, cleanup (`lib/hooks/use-auto-save.ts`) | PASS |
| 4 | `calculateLevel` thresholds 0/6/18/48 + infinity tier + null + future date (`lib/utils/calculate-level.ts`) | PASS |
| 5 | Polish copy via `pl.ts` — no hardcoded Polish in `AthleteProfileForm`, `DashboardContent`, `CreateAthleteDialog`, `AthleteEditorShell` | PASS |
| 6 | Dark theme — only token utility classes (`bg-card`, `text-foreground`, `border-border`, `text-destructive`), no hex literals | PASS |
| 7 | A11y — `htmlFor`/`id` pairs on every field, `role="alert"` on errors, `role="dialog"` + `aria-modal` + `aria-labelledby` on create dialog, `aria-describedby`+`aria-invalid` on name input, Escape closes dialog, focus-on-open | PASS |
| 8 | TypeScript strict — no `any`, typed hooks + form values via `UpdateAthleteInput` | PASS |
| 9 | Security — no `dangerouslySetInnerHTML`, no PII in console.log, errors sanitized | PASS |
| 10 | TanStack Query wiring — `setQueryData` + `invalidateQueries` on mutation success, `retry: 1` on update (`lib/hooks/use-athletes.ts`) | PASS |

## Issues

None (0 blocking).

## Suggestions (non-blocking)

- `useAutoSave` includes `setError` in the effect deps (`lib/hooks/use-auto-save.ts:106`). react-hook-form returns a new reference per render; the resulting re-subscribe is cheap and correct (the timer lives in a ref), but a stable wrapper would remove the churn.
- `AthleteProfileForm` eslint-disables `exhaustive-deps` on the reset effect (line 56). Acceptable — the intent is "only reset when the athlete id changes" — but a comment pointing at the athlete-switch use case would help future readers.
- `CreateAthleteDialog` is the one screen with an explicit submit button. Consistent with spec (creation requires affirmative action); consider documenting the exception in the design doc so it doesn't look like drift.
- Integration-level coverage of `DashboardContent` + `CreateAthleteDialog` flow is deferred to E2E (`tests/e2e/US-003.spec.ts`), which is the right call per the QA report.

## Verdict

**Approve**
