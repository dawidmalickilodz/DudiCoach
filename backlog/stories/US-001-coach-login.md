---
id: US-001
title: Logowanie trenera do panelu
role: trener
priority: P0
estimate: S
status: Ready
dependencies: []
epic: EPIC-A
design_required: true
created: 2026-04-08
updated: 2026-04-08
---

# US-001 — Logowanie trenera do panelu

## User Story

**Jako** trener,
**chcę** zalogować się do panelu przez email i hasło,
**aby** uzyskać bezpieczny dostęp do zarządzania moimi zawodnikami.

## Acceptance Criteria (Gherkin)

### AC-1: Udane logowanie
```gherkin
Zakładając, że konto trenera zostało utworzone w Supabase
Kiedy wchodzę na stronę /login
I wpisuję poprawny email i hasło
I klikam "Zaloguj się"
Wtedy jestem przekierowany na /coach/dashboard
I widzę pusty panel zawodników z komunikatem powitalnym
```

### AC-2: Nieudane logowanie
```gherkin
Zakładając, że jestem na stronie /login
Kiedy wpisuję błędne hasło
I klikam "Zaloguj się"
Wtedy widzę komunikat błędu po polsku ("Nieprawidłowy email lub hasło")
I pozostaję na stronie /login
I pole hasła jest wyczyszczone
```

### AC-3: Ochrona panelu trenera przez middleware
```gherkin
Zakładając, że nie jestem zalogowany
Kiedy próbuję wejść bezpośrednio na /coach/dashboard
Wtedy jestem przekierowany na /login
```

### AC-4: Wylogowanie
```gherkin
Zakładając, że jestem zalogowany
Kiedy klikam przycisk "Wyloguj" w menu
Wtedy sesja jest usunięta
I jestem przekierowany na /login
```

### AC-5: Dark theme + polski interfejs
```gherkin
Zakładając, że jestem na stronie /login
Wtedy wszystkie teksty są po polsku ("Zaloguj się", "Email", "Hasło")
I tło strony ma kolor #0A0F1A
I karta formularza ma kolor #111827
I używa fontu DM Sans
```

## Definition of Done

- [ ] Migracja Supabase (jeśli potrzebna — profile table)
- [ ] RLS policies
- [ ] Middleware `middleware.ts` chroni `/coach/**`
- [ ] API route `/api/auth/*` (lub użycie helpers `@supabase/ssr`)
- [ ] Strona `/login` z react-hook-form + zod
- [ ] Strona `/coach/dashboard` (placeholder OK w tej story)
- [ ] Przycisk "Wyloguj" w navbar
- [ ] `lib/i18n/pl.ts` z kluczami auth
- [ ] Unit tests dla walidatorów zod
- [ ] Integration test dla middleware
- [ ] E2E Playwright pokrywający AC-1..AC-5
- [ ] Code review approved
- [ ] Deployed to prod

## Implementation Notes

- Use Supabase Auth (not NextAuth) — mniej bibliotek, natywne z Supabase
- Konto trenera tworzymy RĘCZNIE w Supabase Studio (single-user, bez rejestracji)
- Session via cookies (Supabase SSR helpers)
- Middleware pattern: `@supabase/ssr` z `middleware.ts` w root

## Implementation Log

(Uzupełniane przez developerów w trakcie implementacji)
