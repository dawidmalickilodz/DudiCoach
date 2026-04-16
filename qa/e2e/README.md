# E2E Handbook (US-001 to US-005)

## Scope

Current Playwright suite covers:
- `smoke.spec.ts` -> US-001 + US-002
- `US-003.spec.ts` -> coach athlete CRUD frontend
- `US-004.spec.ts` -> share code panel + realtime
- `US-005.spec.ts` -> AI plan generation
- `US-011.spec.ts` -> injuries tab CRUD + public active-only injuries view

## Required Environment Variables

Set in local `.env.local` or CI secrets:

```bash
PLAYWRIGHT_BASE_URL=https://<preview-or-staging-url>
E2E_COACH_EMAIL=<test-coach-email>
E2E_COACH_PASSWORD=<test-coach-password>
```

Optional:

```bash
E2E_ALLOW_AI_CALL=1
```

`E2E_ALLOW_AI_CALL=1` enables the live Anthropic happy-path test in `US-005.spec.ts`.

## Skip Rules

- Without `E2E_COACH_EMAIL` + `E2E_COACH_PASSWORD`, authenticated scenarios are skipped by design.
- Without `E2E_ALLOW_AI_CALL=1`, the live AI happy path stays skipped by design.

## Local Run

```bash
npm run test:e2e
```

PowerShell example:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://<deployment>.vercel.app"
$env:E2E_COACH_EMAIL = "coach@example.com"
$env:E2E_COACH_PASSWORD = "<password>"
npm run test:e2e
```

## CI Run

1. Add secrets:
   - `PLAYWRIGHT_BASE_URL`
   - `E2E_COACH_EMAIL`
   - `E2E_COACH_PASSWORD`
2. Run `npm run test:e2e`.
3. Keep traces/screenshots/videos only for failures (configured in Playwright).

## Latest Snapshot (2026-04-15)

- Preview on PR #6 is healthy (`/` and `/login` return 200).
- Full authenticated flows are still blocked by missing coach credentials in the local environment.
- Unauthenticated US-004 invalid-code checks pass on desktop and mobile.
- US-011 spec is present and runnable; without `E2E_COACH_*` it reports `4 skipped` by design.
