---
story_group: US-001-US-002
agent: qa-test
stage: e2e
verdict: pass-preview
date: 2026-04-16
---

# E2E Report - US-001 + US-002

## Summary

US-001 (auth flow) and US-002 (API CRUD) are passing end-to-end against PR #6 preview using real credentials (`E2E_COACH_EMAIL` + `E2E_COACH_PASSWORD`).

## Execution

- Command:

```bash
PLAYWRIGHT_BASE_URL="https://dudi-coach-git-codex-us-afb073-dawidmalickilodz-7164s-projects.vercel.app" \
E2E_COACH_EMAIL="***" \
E2E_COACH_PASSWORD="***" \
npx playwright test --reporter=list
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

Runbook: `qa/e2e/US-001-US-002-runbook.md`
