---
id: US-019
title: Dashboard hydration — initialData w useAthletes query
role: trener
priority: P2
estimate: XS
status: Draft
dependencies: [US-003]
epic: EPIC-A
design_required: false
created: 2026-04-15
updated: 2026-04-16
sprint: Sprint 2
---

# US-019 — Dashboard hydration — initialData w useAthletes query

## User Story

**Jako** trener,
**chcę** żeby dashboard po hydracji nie robił zbędnego re-fetcha listy zawodników,
**aby** wejście na `/dashboard` było szybsze i nie marnowało requestów do API.

## Kontekst (follow-up)

Znalezione w post-review audit 2026-04-15 jako finding P3. RSC page fetchuje listę
w `app/(coach)/dashboard/page.tsx` i przekazuje ją jako `initialAthletes` prop do
client component `DashboardContent`. CC używa `useAthletes()` (TanStack Query), który
**natychmiast po hydracji wykonuje drugi fetch** tej samej listy, bo query nie ma
`initialData`. Fallback `data: athletes = initialAthletes` w `DashboardContent:28`
jedynie zasłania flash, nie zapobiega request'owi.

Refs:
- `components/coach/DashboardContent.tsx:28`
- `lib/hooks/use-athletes.ts:33`

## Acceptance Criteria (Gherkin)

### AC-1: Brak dodatkowego fetcha po hydracji

```gherkin
Zakładając, że jestem zalogowanym trenerem i wchodzę na /dashboard
I RSC page fetchuje listę 3 zawodników i renderuje HTML
Kiedy strona się zhydratuje
Wtedy TanStack Query ma stan z initialAthletes jako cached data
I NIE wykonuje dodatkowego GET /api/athletes
I lista zawodników renderuje się bez migania/loading state
```

### AC-2: Invalidation dalej działa

```gherkin
Zakładając, że dashboard jest zhydratowany z initialAthletes
Kiedy trener tworzy nowego zawodnika przez FAB + CreateAthleteDialog
Wtedy mutation onSuccess invaliduje query key athleteKeys.list()
I lista jest re-fetchowana (pojawia się nowy zawodnik)
```

### AC-3: Regresja useAthlete detail

```gherkin
Zakładając, że fix dotyczy tylko useAthletes list query
Wtedy useAthlete(id) detail query działa bez zmian
I edytor /athletes/[id] nie ma regresji
```

## Definition of Done

- [ ] `useAthletes` akceptuje opcjonalny `initialData?: Athlete[]` argument
- [ ] `DashboardContent` przekazuje `initialAthletes` do `useAthletes(initialAthletes)`
- [ ] Alternatywnie: canonical Next.js 16 + TanStack Query pattern z `HydrationBoundary` + `dehydrate` na page.tsx (do rozważenia — sprawdzić koszt refactoru vs. zysk)
- [ ] Unit/component test: mount z initialData → brak fetch'a w pierwszej tick'u
- [ ] Existing integration tests green
- [ ] Code review approved
- [ ] Deployed

## Implementation Notes

- Najprostsza ścieżka: `useQuery({ queryKey, queryFn, initialData })` — 1 linijka zmiany w hook + 1 w DashboardContent.
- Ścieżka kanoniczna (`HydrationBoundary`) daje cleaner separation RSC/CC ale wymaga QueryClient w server context — większy refactor, odłożyć na później jeśli prosta ścieżka wystarczy.
- Mierz przed/po: DevTools Network tab → liczba `GET /api/athletes` w pierwszych 2s po wejściu na `/dashboard`. Było: 2. Cel: 1.
