---
id: US-020
title: Unauth API routes — 401 zamiast 500
role: trener
priority: P2
estimate: S
status: Draft
dependencies: []
epic: EPIC-A
design_required: false
created: 2026-04-16
updated: 2026-04-16
---

# US-020 — Unauth API routes — 401 zamiast 500

## User Story

**Jako** trener (lub zewnetrzny klient API),
**chce** dostawac HTTP 401 Unauthorized kiedy odpytuję chronione API bez sesji,
**aby** komunikat bledu byl jednoznaczny i nie sugerowal awarii serwera.

## Kontekst (follow-up)

Znalezione podczas post-merge health-check Sprint 1 (2026-04-16). Unauthenticated
`GET /api/athletes` zwraca HTTP 500 z pustym body zamiast 401.

Przyczyna: middleware (`lib/supabase/middleware.ts`) chroni prefixes
`["/dashboard", "/athletes"]`, ale `/api/athletes` zaczyna sie od `/api/` — nie
jest objety redirectem. Request dociera do route handlera bez sesji, Supabase
client bez tokenu rzuca blad RLS, a handler nie lapie go z wlasciwym statusem.

Dotyczy co najmniej:
- `app/api/athletes/route.ts` (GET, POST)
- `app/api/athletes/[id]/route.ts` (GET, PATCH, DELETE)
- `app/api/athletes/[id]/plans/route.ts` (POST)
- `app/api/athletes/[id]/share/route.ts` (POST)

Nie dotyczy publicznego endpointu:
- `app/api/athlete/[shareCode]/route.ts` (GET/HEAD — celowo bez auth)

## Acceptance Criteria (Gherkin)

### AC-1: GET /api/athletes bez sesji zwraca 401

```gherkin
Zakladajac ze nie mam aktywnej sesji (brak cookie sb-*)
Kiedy wysylam GET /api/athletes
Wtedy odpowiedz ma status 401
I body zawiera { "error": "Brak autoryzacji." }
```

### AC-2: POST/PATCH/DELETE na chronionych endpointach zwracaja 401

```gherkin
Zakladajac ze nie mam aktywnej sesji
Kiedy wysylam POST /api/athletes z prawidlowym body
Wtedy odpowiedz ma status 401
I body zawiera { "error": "Brak autoryzacji." }
```

### AC-3: Publiczny endpoint nie jest objety guardem

```gherkin
Zakladajac ze nie mam aktywnej sesji
Kiedy wysylam GET /api/athlete/VALIDCODE
Wtedy odpowiedz NIE jest 401 (moze byc 200 lub 404 zaleznie od kodu)
```

### AC-4: Autoryzowany request dziala bez zmian

```gherkin
Zakladajac ze mam aktywna sesje trenera
Kiedy wysylam GET /api/athletes
Wtedy odpowiedz ma status 200 z lista zawodnikow (regresja)
```

## Definition of Done

- [ ] Auth guard na poczatku kazdego chronionego route handlera (`supabase.auth.getUser()` → 401 jesli brak usera)
- [ ] Alternatywa: dodanie `/api/athletes` do `protectedPrefixes` w middleware (wada: middleware redirect vs JSON 401)
- [ ] Integration testy: 4 case'y (unauth GET, POST, PATCH, DELETE → 401)
- [ ] Istniejace testy green (187+)
- [ ] Code review approved
- [ ] Deployed

## Implementation Notes

- Preferowany wariant: auth guard w kazdym route handlerze (return `NextResponse.json({ error: "Brak autoryzacji." }, { status: 401 })`).
  Middleware redirect nie jest odpowiedni dla API — klienci JSON oczekuja statusu 401, nie 307 redirect do HTML.
- Mozna wyodrebnic helper `requireAuth(request)` w `lib/api/auth-guard.ts` zeby DRY.
- Nie dotyczy `app/api/athlete/[shareCode]/route.ts` — ten endpoint jest celowo publiczny.
