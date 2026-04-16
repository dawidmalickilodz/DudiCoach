---
id: US-011
title: Kontuzje zawodnika - lista z severity
role: trener
priority: P1
estimate: M
status: Draft
dependencies: [US-002, US-003]
epic: EPIC-A
design_required: true
created: 2026-04-08
updated: 2026-04-16
sprint: Sprint 2
---

# US-011 — Kontuzje zawodnika - lista z severity

## User Story

**Jako** trener,
**chce** rejestrować kontuzje zawodnika z datą, opisem, severity i statusem,
**aby** uwzględniać ograniczenia w planowaniu treningow i śledzić historię urazów.

## Acceptance Criteria (Gherkin)

### AC-1: Zakładka Kontuzje w edytorze zawodnika

```gherkin
Zakładając, że jestem na /athletes/<id>
Wtedy widzę zakładkę "Kontuzje" obok istniejących (Profil, Online, Plany)
Kiedy klikam "Kontuzje"
Wtedy widzę listę kontuzji zawodnika (lub pusty stan z komunikatem)
```

### AC-2: Dodawanie nowej kontuzji

```gherkin
Zakładając, że jestem na zakładce Kontuzje
Kiedy klikam "Dodaj kontuzję"
Wtedy pojawia się formularz z polami:
  | Pole          | Typ        | Wymagane |
  | Nazwa/opis    | text       | tak      |
  | Lokalizacja   | dropdown   | tak      |
  | Severity      | select 1-5 | tak      |
  | Data kontuzji | date       | tak      |
  | Status        | select     | tak      |
  | Notatki       | textarea   | nie      |
I po wypełnieniu i zatwierdzeniu kontuzja pojawia się na liście
```

### AC-3: Severity z kolorowym badge'em

```gherkin
Zakładając, że kontuzja ma severity 1 (lekka)
Wtedy badge jest zielony z tekstem "1 - Lekka"
Zakładając, że kontuzja ma severity 5 (ciężka)
Wtedy badge jest czerwony z tekstem "5 - Ciężka"
```

### AC-4: Statusy kontuzji

```gherkin
Zakładając, że kontuzja jest dodana
Wtedy status może być jednym z:
  | Status      | Kolor   |
  | Aktywna     | czerwony |
  | W leczeniu  | żółty   |
  | Wyleczona   | zielony |
I zmiana statusu jest auto-save (bez przycisku Zapisz)
```

### AC-5: Edycja i usuwanie kontuzji

```gherkin
Zakładając, że widzę kontuzję na liście
Kiedy klikam na nią
Wtedy mogę edytować wszystkie pola
I zmiany są auto-save (debounce 800ms, "✓ Zapisano")
Kiedy klikam ikonę usunięcia i potwierdzam (confirm dialog)
Wtedy kontuzja jest usunięta z listy
```

### AC-6: Lista kontuzji na panelu zawodnika (read-only)

```gherkin
Zakładając, że zawodnik ma aktywne udostępnianie (share_active = true)
I ma 2 kontuzje: 1 aktywna, 1 wyleczona
Kiedy otwieram panel zawodnika /{shareCode}
Wtedy widzę sekcję "Kontuzje" z listą aktywnych kontuzji (bez wyleczonych)
I dane są read-only
```

## Schemat DB (propozycja)

```sql
CREATE TABLE injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body_location TEXT NOT NULL,
  severity SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  injury_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'healing', 'healed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: coach can CRUD own athletes' injuries
ALTER TABLE injuries ENABLE ROW LEVEL SECURITY;
```

## Lokalizacje ciała (wstępna lista)

Ramię, Bark, Łokieć, Nadgarstek, Dłoń, Kręgosłup szyjny, Kręgosłup piersiowy,
Kręgosłup lędźwiowy, Biodro, Kolano, Kostka, Stopa, Udo (przód), Udo (tył),
Łydka, Klatka piersiowa, Brzuch, Inne

## Definition of Done

- [ ] Migracja SQL: tabela `injuries` z RLS
- [ ] API route: `app/api/athletes/[id]/injuries/route.ts` (GET, POST)
- [ ] API route: `app/api/athletes/[id]/injuries/[injuryId]/route.ts` (PATCH, DELETE)
- [ ] Komponent: `InjuriesTab` w edytorze zawodnika
- [ ] Komponent: `InjuryForm` (dialog do dodawania / inline edycja)
- [ ] Komponent: `InjurySeverityBadge`
- [ ] Komponent: `InjuryStatusBadge`
- [ ] Auto-save na edycji (debounce 800ms)
- [ ] Panel zawodnika: sekcja read-only z aktywnymi kontuzjami
- [ ] Realtime: zmiana kontuzji broadcastowana do panelu zawodnika
- [ ] Tłumaczenia w `lib/i18n/pl.ts`
- [ ] Unit testy: badge'e, form validation
- [ ] Integration testy: API CRUD + RLS
- [ ] E2E test: dodaj / edytuj / usuń kontuzję
- [ ] Code review approved
- [ ] Deployed

## Implementation Notes

- Nowa zakładka "Kontuzje" w `AthleteEditorShell` — reuse `TabPills` pattern z US-003/004
- Auto-save: reuse `useAutoSave` hook z US-003
- Severity 1-5 mapuje na kolory: green → yellow → orange → red → darkred
- Body location jako const array w `lib/constants/body-locations.ts` (nie enum DB — łatwiejsze i18n)
- Panel zawodnika filtruje tylko `status = 'active'` — wyleczone kontuzje widzi tylko trener
