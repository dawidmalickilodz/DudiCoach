---
story_group: US-001-US-005
owner: qa-test
stage: e2e
updated: 2026-04-15
---

# Runbook E2E (US-001 to US-005)

## Goal

Run real E2E checks against preview/staging for:
- auth flow
- athlete CRUD flow
- share code + realtime flow
- AI plan generation flow

## Required Secrets

- `PLAYWRIGHT_BASE_URL` - preview/staging URL (for example `https://<deployment>.vercel.app`)
- `E2E_COACH_EMAIL` - coach test account email
- `E2E_COACH_PASSWORD` - coach test account password

Optional:
- `E2E_ALLOW_AI_CALL=1` - enables live Anthropic happy path in US-005

## Expected Skip Behavior

- If `E2E_COACH_*` are missing, authenticated tests are skipped intentionally.
- If `E2E_ALLOW_AI_CALL` is missing, US-005 live AI happy path is skipped intentionally.

## Local Run (PowerShell)

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://<deployment>.vercel.app"
$env:E2E_COACH_EMAIL = "coach@example.com"
$env:E2E_COACH_PASSWORD = "<strong-password>"
# optional
$env:E2E_ALLOW_AI_CALL = "1"

npm run test:e2e
```

## Local Run (bash)

```bash
PLAYWRIGHT_BASE_URL="https://<deployment>.vercel.app" \
E2E_COACH_EMAIL="coach@example.com" \
E2E_COACH_PASSWORD="<strong-password>" \
E2E_ALLOW_AI_CALL="1" \
npm run test:e2e
```

## CI Setup (GitHub Actions)

1. Repository -> `Settings` -> `Secrets and variables` -> `Actions`.
2. Add:
   - `PLAYWRIGHT_BASE_URL`
   - `E2E_COACH_EMAIL`
   - `E2E_COACH_PASSWORD`
   - (optional) `E2E_ALLOW_AI_CALL`
3. Expose secrets in the E2E job `env`.

## Expected Outcomes

- US-001: protected route, invalid login, valid login, logout.
- US-002: authenticated API CRUD with cleanup.
- US-003: coach CRUD frontend and auto-save UX.
- US-004: invalid share code handling + authenticated realtime scenarios.
- US-005: incomplete-data error mapping + optional live AI happy path.

## Artifacts

- HTML report: `playwright-report/`
- Failure artifacts: `test-results/`
- Traces/videos/screenshots are collected only on failure/retry.
