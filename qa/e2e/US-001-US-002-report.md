---
story_group: US-001-US-002
agent: qa-test
stage: e2e
verdict: pending
date: 2026-04-14
---

# E2E Report — US-001 + US-002 (High-priority Fix Pack)

## Status

`PENDING EXECUTION` — raport przygotowany, testy wymagają uruchomienia na preview/staging z danymi konta testowego.

## Required Environment

- `PLAYWRIGHT_BASE_URL`
- `E2E_COACH_EMAIL`
- `E2E_COACH_PASSWORD`

## Planned Test Coverage

- US-001: ochrona `/coach/dashboard`, błędne logowanie, poprawne logowanie, wylogowanie
- US-002: authenticated API CRUD (`POST/GET/PATCH/DELETE`) + cleanup danych testowych

## Execution Command

```bash
npm run test:e2e
```

## Pass Criteria

- 0 failed tests w Playwright HTML report
- Brak artefaktów failure (trace/screenshot/video) poza retry
- CRUD test kończy się cleanupem danych (brak pozostawionych rekordów)

## Follow-up

Po pierwszym zielonym przebiegu uzupełnij ten raport o:
- URL środowiska,
- timestamp runu,
- liczbę testów pass/fail,
- link do artefaktów reportu.
