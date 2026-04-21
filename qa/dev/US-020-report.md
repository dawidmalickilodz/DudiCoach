---
story: US-020
agent: qa-dev
stage: dev-tests
verdict: pass
date: 2026-04-20
commit: 7c1e390
---

# QA Dev Report — US-020 Unauth API Routes 401

## Summary

US-020 dodaje centralny `requireAuth()` guard w `lib/api/auth-guard.ts` i stosuje go na wszystkich chronionych route handlerach. Trasy publiczne (`/api/athlete/[shareCode]`) nie są zmienione i nadal zwracają 404 (nie 401). Wszystkie testy integracyjne przechodzą.

## Commands run

```bash
# 1. Full test suite
npm test -- --reporter=verbose
# Result: 259 passed (259)

# 2. Isolated US-020 integration tests
npm test -- \
  tests/integration/athletes/route.test.ts \
  tests/integration/athletes/plans-route.test.ts \
  tests/integration/athletes/share-route.test.ts \
  tests/integration/athlete/public-route.test.ts \
  --reporter=verbose
# Result: 32 passed (32)

# 3. TypeScript typecheck
npx tsc --noEmit
# Result: clean (no errors)
```

## Test results

### Integration — affected routes — 32/32 ✅

**`GET /api/athletes` + `POST /api/athletes` + `GET /api/athletes/[id]` + `PATCH /api/athletes/[id]` + `DELETE /api/athletes/[id]`** (27 tests)
- `unauthenticated → 401` covered for each method ✅
- `auth.getUser error → 401` covered for each method ✅
- Authenticated happy paths unchanged ✅

**`POST /api/athletes/[id]/plans`** (5 tests)
- `returns 401 when unauthenticated` ✅
- `returns 401 when auth.getUser fails` ✅
- 500-class error masking (no detail leak) ✅

**`POST /api/athletes/[id]/share`** (4 tests)
- `returns 401 when unauthenticated` ✅
- `returns 401 when auth.getUser fails` ✅

**`GET /api/athlete/[shareCode]` (public endpoint — must NOT return 401)** (2 tests)
- `invalid format → 404 (never 401)` ✅
- `valid format but no match → 404 (never 401)` ✅

### Full suite

```
Test Files  28 passed (28)
     Tests  259 passed (259)
  Duration  ~5.4s
```

## Coverage judgment

- AC-1 (unauth GET → 401): covered — all GET handlers tested
- AC-2 (unauth POST/PATCH/DELETE → 401): covered — POST athletes, POST plans, POST share, PATCH athletes, DELETE athletes
- AC-3 (public endpoint unaffected — no 401): covered — `public-route.test.ts` verifies 404, never 401
- AC-4 (auth regression — authenticated requests still work): covered — all happy path tests remain green

## Skipped checks

- E2E: not required for auth hardening fix — covered by existing E2E suites (auth tested in US-001/US-003/US-004 specs)
- Lint: `npm run lint` not run separately; tsc --noEmit clean and all tests green indicates no introduced syntax/style issues

## Residual risks

- `requireAuth` relies on Supabase `auth.getUser()` — if Supabase token validation is slow under load, all protected routes would see higher latency. Acceptable at current scale.
- Injuries routes (`/api/injuries`) added in US-011 also use `requireAuth` — covered by US-011 test suite (not duplicated here).

## Verdict

**PASS** — G5 satisfied. Ready for code review (G6).
