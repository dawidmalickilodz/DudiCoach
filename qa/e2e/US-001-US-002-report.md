---
story_group: US-001-US-002
agent: qa-test
stage: e2e
verdict: blocked-missing-credentials
date: 2026-04-15
---

# E2E Report - US-001 + US-002

## Current Status

Suite wiring is correct and runs on preview deployments.
Full auth + API CRUD verification is still blocked by missing coach credentials in the local environment.

## Environment Check

- `PLAYWRIGHT_BASE_URL`: set during verification runs
- `E2E_COACH_EMAIL`: missing locally
- `E2E_COACH_PASSWORD`: missing locally

## Executions

1. Hotfix preview run (PR #5 preview URL):
   - Command: `PLAYWRIGHT_BASE_URL=<pr5-preview> npm run test:e2e`
   - Result: process succeeded, smoke scenarios skipped (missing coach credentials)

2. Feature preview run (PR #6 preview URL):
   - Command: `PLAYWRIGHT_BASE_URL=<pr6-preview> npm run test:e2e`
   - Result: process succeeded, all US-001/US-002 scenarios skipped (missing coach credentials)

3. Local re-check on PR #6 branch:
   - Command: `npm run typecheck && npm run test && npm run test:e2e`
   - Result:
     - `typecheck`: passed
     - `test`: passed (`180/180`)
     - `test:e2e`: passed process (`2 passed`, `22 skipped`, `0 failed`)
   - Note: all US-001/US-002 scenarios still skipped without `E2E_COACH_*` credentials.

## Planned Coverage (when credentials are available)

- US-001:
  - protected `/dashboard` redirect
  - invalid login remains on `/login` and clears password
  - successful login redirect to dashboard
  - logout redirect to `/login`
- US-002:
  - authenticated API CRUD (`POST/GET/PATCH/DELETE`)
  - cleanup in `finally`

## Unblock Step

Set locally or in CI:
- `E2E_COACH_EMAIL`
- `E2E_COACH_PASSWORD`

Then run:

```bash
npm run test:e2e
```

Runbook: `qa/e2e/US-001-US-002-runbook.md`
