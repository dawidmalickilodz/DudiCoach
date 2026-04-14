---
story_group: US-001-US-002
owner: qa-test
stage: e2e
updated: 2026-04-14
---

# Runbook E2E (US-001 + US-002)

## Cel

Uruchomienie pełnych testów E2E auth + API CRUD przeciw środowisku preview/staging.

## Wymagane sekrety

- `PLAYWRIGHT_BASE_URL` — URL preview/staging (np. `https://<deployment>.vercel.app`)
- `E2E_COACH_EMAIL` — email testowego konta trenera
- `E2E_COACH_PASSWORD` — hasło testowego konta trenera

Bez `E2E_COACH_EMAIL` i `E2E_COACH_PASSWORD` scenariusze auth są celowo `skip`.

## Szybkie uruchomienie lokalnie (PowerShell)

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://<deployment>.vercel.app"
$env:E2E_COACH_EMAIL = "coach@example.com"
$env:E2E_COACH_PASSWORD = "<strong-password>"
npm run test:e2e
```

## Szybkie uruchomienie lokalnie (bash)

```bash
PLAYWRIGHT_BASE_URL="https://<deployment>.vercel.app" \
E2E_COACH_EMAIL="coach@example.com" \
E2E_COACH_PASSWORD="<strong-password>" \
npm run test:e2e
```

## Ustawienie sekretów w CI (GitHub Actions)

1. Repo -> `Settings` -> `Secrets and variables` -> `Actions`.
2. Dodaj:
   - `PLAYWRIGHT_BASE_URL`
   - `E2E_COACH_EMAIL`
   - `E2E_COACH_PASSWORD`
3. W workflow przekazuj je do joba E2E przez `env:`.

## Oczekiwany wynik

- US-001:
  - ochrona `/dashboard`
  - błędne logowanie zostaje na `/login`
  - poprawne logowanie przekierowuje na dashboard
  - logout przekierowuje na `/login`
- US-002:
  - pełny CRUD przez API (`POST/GET/PATCH/DELETE`)
  - cleanup w `finally`

## Artefakty i debug

- HTML report: `playwright-report/`
- Artefakty awarii: `test-results/`
- Trace/screenshot/video zapisują się tylko przy błędach/retry (zgodnie z `playwright.config.ts`).
