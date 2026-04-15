---
story_group: US-003-US-005
agent: qa-test
stage: e2e
verdict: partial-pass
date: 2026-04-15
---

# E2E Report - US-003 + US-004 + US-005

## Summary

Preview verification was executed against PR #6 preview deployment.

- Passed now: unauthenticated US-004 invalid share-code checks (desktop + mobile)
- Skipped by design: authenticated coach scenarios (US-003, US-004 auth flows, US-005 incomplete-data/auth paths) due missing coach credentials
- Skipped by design: US-005 live AI happy path without `E2E_ALLOW_AI_CALL=1`

## Key Fix Applied During Verification

A flaky selector in `tests/e2e/US-004.spec.ts` was fixed:
- before: `page.getByRole("alert")`
- after: `page.locator("#share-code-error")`

Reason: Next.js route announcer also uses `role="alert"`, which made strict Playwright locator matching fail.

## Execution Snapshot

- Command:

```bash
PLAYWRIGHT_BASE_URL=https://dudi-coach-git-codex-us-afb073-dawidmalickilodz-7164s-projects.vercel.app npm run test:e2e
```

- Result after selector fix:
  - `2 passed`
  - `22 skipped`
  - `0 failed`

## Remaining to Reach Full Pass

1. Set `E2E_COACH_EMAIL` and `E2E_COACH_PASSWORD`.
2. Re-run `npm run test:e2e` to execute authenticated paths.
3. Optionally set `E2E_ALLOW_AI_CALL=1` to exercise live AI happy path.

## Deployment Notes

- PR #6 preview route health: `/` and `/login` return 200.
- Production domain still depends on merging PR #5 hotfix into `main`.
