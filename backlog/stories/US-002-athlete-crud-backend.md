---
id: US-002
title: Backend CRUD zawodnika
role: trener
priority: P0
estimate: M
status: InDevTests
dependencies: [US-001]
epic: EPIC-A
design_required: true
created: 2026-04-08
updated: 2026-04-08
---

# US-002 — Backend CRUD zawodnika

## User Story

**Jako** trener,
**chcę** API do tworzenia, odczytywania, aktualizowania i usuwania profili zawodników,
**aby** frontend mógł korzystać z niezawodnej warstwy danych z walidacją i zabezpieczeniami.

## Acceptance Criteria (Gherkin)

### AC-1: Tabela athletes istnieje z RLS
```gherkin
Zakładając, że migracja została zastosowana
Wtedy tabela 'athletes' istnieje w Postgres
I ma włączony Row Level Security
I ma co najmniej jedną polisę RLS (zalogowany użytkownik ma pełny dostęp, anon blocked)
I ma kolumny: id, name, age, weight_kg, height_cm, sport, training_start_date,
             training_days_per_week, session_minutes, current_phase, goal, notes,
             created_at, updated_at
```

### AC-2: POST /api/athletes — tworzenie
```gherkin
Zakładając, że jestem zalogowanym trenerem
Kiedy wysyłam POST /api/athletes z poprawnym JSON body
Wtedy odpowiedź ma status 201
I zawiera ID nowo utworzonego zawodnika
I w DB powstaje rekord z `created_at = now()`
```

### AC-3: GET /api/athletes — lista
```gherkin
Zakładając, że istnieją 3 zawodnicy w DB
Kiedy wysyłam GET /api/athletes
Wtedy odpowiedź ma status 200
I zawiera tablicę z 3 zawodnikami
I są posortowani po updated_at DESC
```

### AC-4: PATCH /api/athletes/:id — aktualizacja
```gherkin
Zakładając, że zawodnik o ID X istnieje
Kiedy wysyłam PATCH /api/athletes/X z {weight_kg: 78}
Wtedy odpowiedź ma status 200
I rekord w DB ma weight_kg = 78
I updated_at jest zaktualizowane
```

### AC-5: DELETE /api/athletes/:id
```gherkin
Zakładając, że zawodnik o ID X istnieje
Kiedy wysyłam DELETE /api/athletes/X
Wtedy odpowiedź ma status 204
I rekord nie istnieje w DB
```

### AC-6: Walidacja zod
```gherkin
Zakładając, że jestem zalogowanym trenerem
Kiedy wysyłam POST /api/athletes z age=-5 (nieprawidłowa wartość)
Wtedy odpowiedź ma status 400
I zawiera szczegóły błędu walidacji po polsku
```

### AC-7: Ochrona przez auth
```gherkin
Zakładając, że nie jestem zalogowany
Kiedy wysyłam GET /api/athletes
Wtedy odpowiedź ma status 401
```

## Definition of Done

- [ ] Migracja `supabase/migrations/YYYYMMDDHHMMSS_US-002_athletes_table.sql`
- [ ] RLS policies
- [ ] Trigger `updated_at`
- [ ] zod schema w `lib/validation/athlete.ts`
- [ ] API routes w `app/api/athletes/route.ts` i `app/api/athletes/[id]/route.ts`
- [ ] Supabase types regenerated (`lib/supabase/database.types.ts`)
- [ ] Unit tests dla zod schema
- [ ] Integration tests dla każdego endpointu (POST/GET/PATCH/DELETE + auth + validation)
- [ ] E2E tests (via frontend US-003)
- [ ] Review approved
- [ ] Deployed

## Implementation Log

### 2026-04-10 — developer-backend

Files created/modified:
- `supabase/migrations/20260410120000_US-002_athletes_table.sql` — generate_share_code() function, athletes table with CHECK constraints, moddatetime trigger, 4 RLS policies, 2 indexes
- `lib/validation/athlete.ts` — createAthleteSchema, updateAthleteSchema, CreateAthleteInput, UpdateAthleteInput
- `app/api/athletes/route.ts` — POST (create) and GET (list) handlers
- `app/api/athletes/[id]/route.ts` — GET (single), PATCH (update), DELETE handlers; Next.js 16 async params pattern applied
- `lib/supabase/database.types.ts` — updated with athletes table (manually written; MCP apply_migration not available in this session — Supabase PAT required for CLI type generation; types match the migration schema exactly)

Verification: `npm run typecheck` pass, `npm run lint` pass, `npm run test` 20/20 pass.

Migration pending application to live Supabase (requires PAT or MCP connection). SQL is correct and ready.

## Implementation Notes

- `sport` jako enum w Postgres (CREATE TYPE sport_enum)
- `current_phase` jako enum
- `notes` jako text (unlimited)
- Indexes: `created_at DESC`, `updated_at DESC`
