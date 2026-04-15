---
id: US-003
title: Frontend lista i edycja zawodnika z auto-save
role: trener
priority: P0
estimate: M
status: InE2E
dependencies: [US-001, US-002]
epic: EPIC-A
design_required: true
created: 2026-04-08
updated: 2026-04-15
---

# US-003 — Frontend lista + edycja zawodnika z auto-save

## User Story

**Jako** trener,
**chcę** widzieć listę moich zawodników i otwierać szczegóły z formularzem który auto-zapisuje każdą zmianę,
**aby** szybko zarządzać danymi bez klikania przycisków "Zapisz".

## Acceptance Criteria (Gherkin)

### AC-1: Lista zawodników na dashboardzie
```gherkin
Zakładając, że jestem zalogowany i mam 2 zawodników w DB
Kiedy wchodzę na /dashboard
Wtedy widzę 2 karty zawodników
I każda karta pokazuje: imię, sport, wiek, poziom (badge z kolorem)
I nad kartami widzę statystyki: "2 zawodników"
```

### AC-2: FAB dodawania zawodnika
```gherkin
Zakładając, że jestem na /dashboard
Kiedy klikam pływający przycisk (+) w prawym dolnym rogu
Wtedy pojawia się modal/strona z formularzem nowego zawodnika
I mogę wpisać imię
I po zapisaniu jestem przekierowany na /athletes/<id>
```

### AC-3: Edytor zawodnika z zakładkami
```gherkin
Zakładając, że jestem na /athletes/<id>
Wtedy widzę zakładki (pills): "Profil"
I domyślnie aktywna jest "Profil"
I widzę pola: imię, sport (dropdown), wiek, waga, wzrost, data rozpoczęcia,
              dni/tydzień (1-7), minuty/sesja, faza (dropdown), cel (textarea), notatki (textarea)
```

### AC-4: Auto-save z debounce
```gherkin
Zakładając, że edytuję pole "wiek" z 25 na 26
Kiedy przestaję pisać na więcej niż 800ms
Wtedy w prawym górnym rogu pojawia się "✓ Zapisano"
I wartość jest zapisana w DB
I komunikat zanika po 1.5s
```

### AC-5: Auto-kalkulacja poziomu ze stażu
```gherkin
Zakładając, że data rozpoczęcia = 10 miesięcy temu
Wtedy pole "Poziom" pokazuje "Średniozaawansowany"
I widzę pasek postępu między poziomami
I gdy zmienię datę na 3 miesiące temu, poziom zmienia się na "Początkujący"
```

### AC-6: Back button + nawigacja
```gherkin
Zakładając, że jestem na /athletes/<id>
Kiedy klikam strzałkę "←" w lewym górnym rogu
Wtedy wracam na /dashboard
```

### AC-7: Dark theme + polski interfejs
```gherkin
Wtedy wszystkie stringi są po polsku (z lib/i18n/pl.ts)
I dark theme jest aplikowany konsekwentnie
I responsive działa do 375px
```

## Definition of Done

- [ ] Strona `/dashboard` z listą kart (shadcn/ui Card)
- [ ] Strona `/athletes/[id]` z formularzem
- [ ] Komponent FAB
- [ ] Custom hook `useAutoSave` w `lib/hooks/use-auto-save.ts`
- [ ] Funkcja `calculateLevel(startDate)` w `lib/utils/calculate-level.ts`
- [ ] `lib/i18n/pl.ts` z kluczami athlete
- [ ] TanStack Query mutations z optimistic updates
- [ ] Toast z "✓ Zapisano"
- [ ] Unit tests dla `calculateLevel` (XS, S, M, L, XL staż)
- [ ] Component tests dla `useAutoSave`
- [ ] E2E test: utwórz zawodnika, edytuj wagę, sprawdź auto-save w toast + w DB
- [ ] Review approved
- [ ] Deployed

## Implementation Notes

- Level thresholds: 0-6m Początkujący | 6-18m Średniozaawansowany | 18-48m Zaawansowany | 48m+ Elitarny
- Wszystkie pola w `useAutoSave` patrzą na cały formularz — jeden mutation dla całego profilu
- Pills dla zakładek: border-radius 20px

## Implementation Log

### 2026-04-13 — developer-frontend

Implemented all 20 new files and 2 modified files per design doc US-003-design.md.

**New files created:**
- `app/(coach)/layout.tsx` — CoachLayout wrapping QueryProvider
- `app/(coach)/providers.tsx` — QueryClientProvider CC wrapper
- `app/(coach)/athletes/[id]/page.tsx` — RSC athlete editor page
- `lib/api/athletes.ts` — fetch functions, athleteKeys query factory, Athlete type
- `lib/hooks/use-athletes.ts` — useAthletes, useAthlete, useCreateAthlete, useUpdateAthlete
- `lib/hooks/use-auto-save.ts` — 800ms debounced auto-save hook (ADR-0001)
- `lib/utils/calculate-level.ts` — calculateLevel() utility, all tier thresholds
- `lib/constants/sports.ts` — SPORTS const array and Sport type
- `components/coach/DashboardContent.tsx` — CC dashboard with athlete grid + dialog state
- `components/coach/AthleteCard.tsx` — clickable athlete card with level badge
- `components/coach/AthleteStatsBar.tsx` — "{count} zawodników" counter
- `components/coach/LevelBadge.tsx` — colored pill badge from calculateLevel
- `components/coach/FloatingActionButton.tsx` — fixed bottom-right + button
- `components/coach/CreateAthleteDialog.tsx` — name-only create dialog with mutation
- `components/coach/AthleteEditorShell.tsx` — editor with back button + tab pills
- `components/coach/AthleteProfileForm.tsx` — 11-field profile form with auto-save
- `components/coach/SaveStatusIndicator.tsx` — isSaving/lastSavedAt/saveError indicator
- `components/coach/LevelDisplay.tsx` — read-only level + progress bar
- `components/coach/TabPills.tsx` — pill tab navigation (Profil active, rest disabled)
- `components/coach/BackButton.tsx` — ← Wstecz navigation button

**Modified files:**
- `app/(coach)/dashboard/page.tsx` — replaced empty state with DashboardContent + server-side initial data fetch
- `lib/i18n/pl.ts` — added athleteCount, addAthlete, sport.*, createDialog.*, deleteConfirm.*

**Checks:**
- `npm run typecheck` — passes (1 pre-existing error in tests/integration/athletes/route.test.ts:557 — count: null type mismatch, not caused by this story)
- `npm run lint` — passes (0 errors; 1 pre-existing warning in coverage/block-navigation.js)
- `npx vitest run` — 84/84 tests pass
