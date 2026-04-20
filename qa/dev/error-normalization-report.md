---
story: error-normalization-helper
lane: B
stage: G5-QA-Dev
date: 2026-04-20
verdict: PASS
---

# QA Dev Report — Error Normalization Helper

## Scope

Lane B task: introduce `lib/utils/normalize-api-error.ts` and adopt it in
`lib/hooks/use-auto-save.ts` and `lib/api/share.ts`.

No schema, auth, RLS, Stripe, or deployment changes.

## Files Under Test

| File | Type |
|---|---|
| `lib/utils/normalize-api-error.ts` | New utility |
| `lib/hooks/use-auto-save.ts` | Modified (catch block) |
| `tests/unit/lib/utils/normalize-api-error.test.ts` | New unit tests |
| `tests/unit/lib/hooks/use-auto-save.test.ts` | Updated unit tests |

## Test Run

```
npx vitest run --reporter=verbose
```

**Result: 265 / 265 passed, 0 failed, 0 skipped**

### normalize-api-error suite (6 tests)

| # | Test | Result |
|---|---|---|
| 1 | returns fallback when error is null | PASS |
| 2 | returns fallback when error is undefined | PASS |
| 3 | returns fallback (not the Error message) when error is an Error instance | PASS |
| 4 | returns fallback when error is a plain string throw | PASS |
| 5 | returns fallback when error is a non-Error object | PASS |
| 6 | uses the exact fallback string provided by the caller | PASS |

Key assertion on case 3: `expect(result).not.toBe(err.message)` — confirms raw
message is never returned.

### use-auto-save suite (13 tests)

All 13 tests pass. Four tests were updated to assert `pl.common.error` instead
of the former raw messages (`"Network failure"`, `"Save failed"`, `"First fail"`).

Key assertions:
- `saveError === pl.common.error` when no `publicErrorMessage` is provided
- `saveError === "Nie udało się zapisać zmian."` when `publicErrorMessage` is provided
- `saveError` never contains the raw `Error.message` string

## Static Checks

```
npx tsc --noEmit       → 0 errors
npx eslint .           → 0 warnings, 0 errors
```

## Coverage

Changed files:
- `normalize-api-error.ts`: 6 dedicated tests — all branches exercised
- `use-auto-save.ts` catch block: success path, error path (w/ and w/o `publicErrorMessage`), clear-on-retry — all exercised

## Verdict

**PASS** — all 265 tests green, typecheck clean, lint clean.
No regressions in unchanged test suites.
