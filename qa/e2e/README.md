# E2E Runbook (US-001 / US-002)

## Cel

Zweryfikować krytyczne przepływy high-priority:
- US-001: auth (redirect ochronny, logowanie poprawne/błędne, wylogowanie)
- US-002: backend CRUD zawodnika przez realne endpointy API

## Wymagane zmienne środowiskowe

Ustaw w `.env.local` (lokalnie) lub jako sekrety CI:

```bash
PLAYWRIGHT_BASE_URL=https://<preview-or-staging-url>
E2E_COACH_EMAIL=<test-coach-email>
E2E_COACH_PASSWORD=<test-coach-password>
```

Uwagi:
- `PLAYWRIGHT_BASE_URL` wskazuje środowisko preview/staging.
- Jeśli `PLAYWRIGHT_BASE_URL` nie jest ustawione, Playwright użyje domyślnie `http://localhost:3000` (z `playwright.config.ts`).

## Uruchomienie lokalne

```bash
npm run test:e2e
```

## Uruchomienie w CI

1. Ustaw sekrety: `PLAYWRIGHT_BASE_URL`, `E2E_COACH_EMAIL`, `E2E_COACH_PASSWORD`.
2. Uruchom `npm run test:e2e`.
3. W CI brak `E2E_COACH_*` powinien failować job (intencjonalnie).

## Stabilność testów

- Test CRUD tworzy unikalnego zawodnika (`Date.now() + random`).
- Test czyści dane w `finally` (DELETE), żeby nie zostawiać śmieci.
- Suite działa w trybie `serial`, aby ograniczyć flaki przy współdzielonym koncie testowym.
