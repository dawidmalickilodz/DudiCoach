---
story: US-019
stage: review
verdict: approved
reviewer: code-reviewer
date: 2026-04-20
commit: 52af115
---

# Review — US-019 Dashboard Hydration initialData

## Summary

Smallest-possible correct change: one optional param on `useAthletes`, one call-site update in `DashboardContent`, four unit tests. Correctly eliminates the redundant post-hydration `GET /api/athletes` while preserving the mutation-invalidation override path. TanStack Query v5 semantics (`initialData: undefined` = no-op, `staleTime` gates background refetch on mount) are used as intended. No regressions in other consumers. QA G5 passed (259/259, typecheck clean).

## Acceptance Criteria Verification

| AC | Implementation | Test | Verified |
|---|---|---|---|
| AC-1 No extra fetch after hydration | `lib/hooks/use-athletes.ts` — `initialData`, `staleTime: initialData ? 30_000 : 0`; `DashboardContent.tsx:28` passes `initialAthletes` in | Test 2 "uses initialData immediately and does NOT fetch within stale window" asserts `fetchAthletes` not called and `isFetching === false` | PASS |
| AC-2 Invalidation still works | Mutation paths unchanged (`lib/hooks/use-athletes.ts`); stale window overridden by explicit invalidation (v5 behavior) | Test 4 "refetches after invalidation even within stale window" simulates `invalidateQueries` and asserts refetch fires | PASS |
| AC-3 No regression in `useAthlete(id)` | `useAthlete(id)` body unchanged; only consumer is detail screen which wasn't touched | 259/259 pre-existing suite green | PASS (implicit) |

## Correctness

- `staleTime: initialData ? 30_000 : 0` — correct. When `initialData` is `undefined`, ternary yields `0` (same as pre-fix default), preserving previous immediate-fetch behavior.
- `initialData?: Athlete[]` — optional typing is safe with TanStack Query v5: passing `undefined` is treated as absent, does not overwrite cache.
- `DashboardContent` fallback changed from `= initialAthletes` to `= []`. With `initialData`, `data` is non-undefined on first render; `= []` is harmless defensive default.
- No other call sites to regress (`useAthletes()` has exactly one caller — confirmed by grep).

## Security

No new surface area. No auth, RLS, schema, billing, or secret surface changes. `initialData` flows server → client via the existing RSC JSON payload — no new exposure vector.

## Code Quality

- No `any`, no commented-out code, no TODOs.
- JSDoc on `useAthletes` accurately describes behavior and invalidation override.
- Tests: clean structure, `vi.mock` before dynamic import (Vitest hoisting), `retry: false`, `gcTime: Infinity`, `beforeEach` reset — correct test isolation.

## Issues Found

None blocking.

## Suggestions (non-blocking)

1. Test 3 title ("returns initialData without overwriting cache with undefined") is slightly misleading — the assertion is correct, but "returns provided initialData verbatim" would better match intent.
2. Consider extracting `30_000` into a named constant (`INITIAL_DATA_STALE_MS`) if other hooks adopt this pattern in future stories.

## Verdict

**approved** — G6 passed. Story can be moved to Done.
