---
id: US-012
title: Testy sprawnosciowe - dynamiczne per sport
role: trener
priority: P1
estimate: M
status: InDev
dependencies: [US-002, US-003]
epic: EPIC-A
design_required: true
created: 2026-04-08
updated: 2026-04-20
sprint: Sprint 2
---

# US-012 — Testy sprawnościowe - dynamiczne per sport

## User Story

**Jako** trener,
**chce** rejestrować wyniki testów sprawnościowych zawodnika dopasowanych do jego sportu,
**aby** śledzić progres i mieć dane do planowania treningów.

## Acceptance Criteria (Gherkin)

### AC-1: Zakładka Testy w edytorze zawodnika

```gherkin
Zakładając, że jestem na /athletes/<id>
Wtedy widzę zakładkę "Testy" obok istniejących (Profil, Online, Plany, Kontuzje)
Kiedy klikam "Testy"
Wtedy widzę sekcję dodawania testu i historię wyników
```

### AC-2: Dynamiczna lista testów per sport

```gherkin
Zakładając, że zawodnik ma sport = "pilka_nozna"
Kiedy jestem na zakładce Testy
Wtedy widzę dropdown z testami dedykowanymi piłce nożnej:
  | Test                | Jednostka |
  | Bieg 30m            | sekundy   |
  | Yo-Yo IR1           | metry     |
  | T-test              | sekundy   |
  | Skok wzwyż z miejsca| cm        |
I NIE widzę testów specyficznych dla np. pływania
```

### AC-3: Rejestracja wyniku testu

```gherkin
Zakładając, że wybrałem test "Bieg 30m" z dropdown
Kiedy wpisuję wynik "4.35" i klikam "Zapisz wynik"
Wtedy wynik pojawia się w historii z datą, wartością i jednostką
I w historii widzę chronologiczną listę wyników tego testu
```

### AC-4: Wspólne testy (niezależne od sportu)

```gherkin
Zakładając, że zawodnik ma dowolny sport
Wtedy oprócz testów sportowych widzę testy ogólne:
  | Test           | Jednostka |
  | Przysiad 1RM   | kg        |
  | Wyciskanie 1RM | kg        |
  | Martwy ciąg 1RM| kg        |
  | Deska (plank)  | sekundy   |
  | Bieg 1000m     | sekundy   |
```

### AC-5: Historia wyników z trendem

```gherkin
Zakładając, że zawodnik ma 3+ wyniki dla "Bieg 30m"
Kiedy patrzę na historię tego testu
Wtedy widzę listę wyników (data + wartość) od najnowszego
I przy ostatnim wyniku widzę wskaźnik trendu:
  ↑ lepszy niż poprzedni (zielony)
  ↓ gorszy niż poprzedni (czerwony)
  = bez zmiany (szary)
```

### AC-6: Usuwanie wyniku

```gherkin
Zakładając, że widzę wynik testu w historii
Kiedy klikam ikonę usunięcia i potwierdzam (confirm dialog)
Wtedy wynik jest usunięty z historii
I wskaźnik trendu przelicza się
```

## Schemat DB (propozycja)

```sql
CREATE TABLE fitness_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  test_key TEXT NOT NULL,        -- klucz z katalogu testów, np. "sprint_30m"
  value NUMERIC NOT NULL,        -- wynik liczbowy
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: coach can CRUD own athletes' test results
ALTER TABLE fitness_test_results ENABLE ROW LEVEL SECURITY;
```

## Katalog testów (statyczny, w kodzie)

Plik: `lib/constants/fitness-tests.ts`

```typescript
interface FitnessTest {
  key: string;
  name_pl: string;        // z pl.ts
  unit: string;           // "s" | "m" | "cm" | "kg" | "reps"
  direction: "lower_is_better" | "higher_is_better";
  sports: string[] | "all";  // "all" = test ogólny
}
```

Przykładowe sporty z `lib/constants/sports.ts`:
`silownia`, `pilka_nozna`, `bieganie`, `plywanie`, `koszykowka`, `tenis`, `mma`

## Definition of Done

- [x] Migracja SQL: tabela `fitness_test_results` z RLS
- [x] Katalog testów: `lib/constants/fitness-tests.ts` z mapowaniem sport → testy
- [x] API route: `app/api/athletes/[id]/tests/route.ts` (GET, POST)
- [x] API route: `app/api/athletes/[id]/tests/[testId]/route.ts` (DELETE)
- [ ] Komponent: `TestsTab` w edytorze zawodnika
- [ ] Komponent: `TestSelector` (dropdown filtrowany per sport)
- [ ] Komponent: `TestResultForm` (wynik + data)
- [ ] Komponent: `TestHistory` (lista wyników z trendem)
- [ ] Komponent: `TrendIndicator` (↑/↓/= z kolorem)
- [ ] Tłumaczenia w `lib/i18n/pl.ts`
- [ ] Unit testy: trend calculation, sport filtering, form validation (sport filtering + validation gotowe; trend pending z frontendem)
- [x] Integration testy: API CRUD + RLS
- [ ] E2E test: dodaj wynik / sprawdź trend / usuń
- [ ] Code review approved
- [ ] Deployed

## Implementation Notes

- Katalog testów jest STATYCZNY w kodzie (nie w DB) — prostsze, szybsze, łatwiejsze i18n.
  Jeśli w przyszłości trener będzie chciał własne testy, to osobna story.
- `direction` w katalogu decyduje logikę trendu: dla biegu 30m mniejszy = lepszy,
  dla skoku wzwyż większy = lepszy.
- Dropdown testów filtruje: `test.sports === "all" || test.sports.includes(athlete.sport)`
- Nie ma auto-save dla dodawania wyniku — explicit "Zapisz wynik" button (to jest
  deliberate action, nie edycja istniejącego pola). Ale usuwanie ma confirm dialog.
- Panel zawodnika (read-only): w przyszłości można dodać sekcję z ostatnimi wynikami,
  ale w MVP tej story NIE jest to wymagane (scope creep risk).
