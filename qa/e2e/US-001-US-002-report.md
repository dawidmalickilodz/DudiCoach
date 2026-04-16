---
story_group: US-001-US-002
agent: qa-test
stage: e2e
verdict: pass-local
date: 2026-04-16
---

# E2E Report - US-001 + US-002

## Summary

US-001 (auth flow) and US-002 (API CRUD) are passing end-to-end locally with a real coach account (`E2E_COACH_EMAIL` + `E2E_COACH_PASSWORD`).

## Execution

- Command:

```bash
npm run test:e2e
```

- Result:
  - `22 passed`
  - `2 skipped` (US-005 AI opt-in path only)
  - `0 failed`

## Covered in this run

- US-001:
  - `/dashboard` protection for unauthenticated users
  - invalid login stays on `/login` and clears password
  - successful login redirects to `/dashboard`
  - logout redirects to `/login`
- US-002:
  - authenticated API CRUD (`POST / GET-list / PATCH / GET-single / DELETE / GET-after-delete`)
  - cleanup in `finally`

## Remaining for preview/CI parity

To reproduce the same full auth path on preview and CI, secrets still need to be set in target environments:

- `E2E_COACH_EMAIL`
- `E2E_COACH_PASSWORD`

Runbook: `qa/e2e/US-001-US-002-runbook.md`
