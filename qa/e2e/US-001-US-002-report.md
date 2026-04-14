---
story_group: US-001-US-002
agent: qa-test
stage: e2e
verdict: blocked-missing-credentials
date: 2026-04-14
---

# E2E Report - US-001 + US-002 (High-priority Fix Pack)

## Current Status

E2E suite is wired correctly and runs against Preview.
Full auth + CRUD verification is currently blocked by missing test coach credentials.

## Environment Check

- `PLAYWRIGHT_BASE_URL`: provided for verification run
- `E2E_COACH_EMAIL`: missing
- `E2E_COACH_PASSWORD`: missing

## Executions

1. Local run without `PLAYWRIGHT_BASE_URL`:
   - Command: `npm run test:e2e`
   - Result: failed before tests
   - Reason: Playwright started local `next dev`; app failed because Supabase URL/key env vars were not set.

2. Preview run with `PLAYWRIGHT_BASE_URL`:
   - Command: `PLAYWRIGHT_BASE_URL=https://dudi-coach-7qtwjevpw-dawidmalickilodz-7164s-projects.vercel.app npm run test:e2e`
   - Result: process succeeded, **10 tests skipped**
   - Reason: suite intentionally skips authenticated scenarios when coach credentials are not set.

## Planned Coverage (when credentials are available)

- US-001:
  - protected `/coach/dashboard` redirect
  - invalid login remains on `/login` and clears password
  - successful login redirect to dashboard
  - logout redirect to `/login`
- US-002:
  - authenticated API CRUD (`POST/GET/PATCH/DELETE`)
  - cleanup in `finally`

## Remaining Step to Unblock

Set these secrets (locally or CI) and rerun:

- `E2E_COACH_EMAIL`
- `E2E_COACH_PASSWORD`

Then execute:

```bash
npm run test:e2e
```
