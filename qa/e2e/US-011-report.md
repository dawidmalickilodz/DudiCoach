---
story_group: US-011
agent: qa-test
stage: e2e
verdict: blocked-missing-credentials
date: 2026-04-16
---

# E2E Report - US-011

## Summary

US-011 Playwright spec was added and executed, but authenticated scenarios were skipped because local coach credentials were not available in environment variables.

## Execution

- Command:

```bash
npx playwright test tests/e2e/US-011.spec.ts --reporter=list
```

- Result:
  - `0 passed`
  - `4 skipped`
  - `0 failed`

## Skip reason

All tests in `tests/e2e/US-011.spec.ts` are guarded by:
- `E2E_COACH_EMAIL`
- `E2E_COACH_PASSWORD`

When those variables are missing, authenticated flows are skipped by design (same convention as US-001..US-005).

## Next step

Run against preview/staging with credentials set:

```bash
PLAYWRIGHT_BASE_URL="https://<preview>.vercel.app" \
E2E_COACH_EMAIL="***" \
E2E_COACH_PASSWORD="***" \
npx playwright test tests/e2e/US-011.spec.ts --reporter=list
```
