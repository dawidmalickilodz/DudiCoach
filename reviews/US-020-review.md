---
story: US-020
stage: review
verdict: approved
reviewer: code-reviewer
date: 2026-04-20
commit: 7c1e390
---

# Review — US-020 Unauth API routes → 401

## Summary

Central `requireAuth()` helper in `lib/api/auth-guard.ts` applied to every protected Route Handler, returning JSON `401 { error: "Brak autoryzacji." }` for missing-user, Supabase-error, and thrown-exception paths. Public share-code endpoints correctly remain unaffected. All four ACs covered by integration tests; full suite 259/259 green; typecheck clean.

## Acceptance Criteria Verification

| AC | Implementation | Verified |
|---|---|---|
| AC-1 GET unauth → 401 | `requireAuth` in all GET handlers: `app/api/athletes/route.ts`, `[id]/route.ts`, `[id]/plans/route.ts` | Yes |
| AC-2 POST/PATCH/DELETE unauth → 401 | `requireAuth` in POST/PATCH/DELETE: `athletes/route.ts`, `[id]/route.ts`, `[id]/share/route.ts`, `[id]/plans/route.ts` | Yes |
| AC-3 Public `/api/athlete/[shareCode]` unaffected — 404 never 401 | No `requireAuth` in `app/api/athlete/[shareCode]/route.ts`; new `public-route.test.ts` asserts 404 | Yes |
| AC-4 Authenticated unchanged (regression) | Full 259/259 green | Yes |

## Security Checklist

- [x] `requireAuth` applied to every protected route (athletes, injuries, plans, share)
- [x] Public routes correctly excluded (`athlete/[shareCode]` + `athlete/[shareCode]/injuries`)
- [x] Error payload leaks no internal details — "Brak autoryzacji." only; Supabase error details logged server-side, never returned
- [x] Fail-closed: tests assert `mockFrom`/`mockRpc` never invoked on unauth paths
- [x] Both unauth modes tested: `setupUnauthenticated()` (user null) and `setupAuthError()` (error present) — covers all three failure paths
- [x] Hard-rule compliance: server-side authorization, no client trust

## Code Quality

- No `any` types; discriminated union `{ user: User; response: null } | { user: null; response: NextResponse }` correctly narrowed by `if (response) return response;` — `user.id` access after guard is safely non-null.
- `npx tsc --noEmit` clean.
- DRY without over-abstraction: one exported function, one exported constant, no premature generalization.
- Diff scoped to auth hardening — no bundled refactors.
- Route labels on every call site aid operational debugging.
- `try/catch` covers all three auth failure modes (null user, error object, thrown exception).

## Test Coverage

- [x] Both unauth modes tested per route
- [x] Negative assertions confirm guard short-circuits before DB work
- [x] New `public-route.test.ts` codifies "never 401" as a permanent regression trap
- [x] Happy-path regression coverage preserved

## Issues Found

None blocking.

## Minor Observations (non-blocking)

- `UNAUTHORIZED_ERROR_MESSAGE` lives in `lib/api/auth-guard.ts` rather than `lib/i18n/pl.ts`. Acceptable — it is an API error payload, not a UI component string; the i18n rule targets React components.
- Added latency from per-call `auth.getUser()` is bounded by token-validation speed. Acceptable at current scale.

## Verdict

**approved** — G6 passed. Story can be moved to Done.
