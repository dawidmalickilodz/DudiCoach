---
id: US-004
title: Share code i panel zawodnika z real-time sync
role: trener, zawodnik
priority: P0
estimate: L
status: InE2E
dependencies: [US-002, US-003]
epic: EPIC-C
design_required: true
created: 2026-04-08
updated: 2026-04-15
---

# US-004 — Share code + panel zawodnika + real-time sync

## User Story

**Jako** trener, **chcę** generować 6-znakowy kod dla każdego zawodnika,
**aby** zawodnik mógł wejść na aplikację bez zakładania konta i zobaczyć swój profil.

**Jako** zawodnik, **chcę** wpisać 6-znakowy kod otrzymany od trenera,
**aby** zobaczyć swój profil i plan treningowy, który aktualizuje się w czasie rzeczywistym gdy trener coś zmieni.

## Acceptance Criteria (Gherkin)

### AC-1: Generowanie share code
```gherkin
Zakładając, że jestem trenerem na /athletes/<id>
I zakładka "Online" nie była jeszcze otwarta
Kiedy klikam zakładkę "Online"
I klikam "Aktywuj udostępnianie"
Wtedy w DB powstaje rekord `share_codes` z 6-znakowym kodem alfanumerycznym
I widzę kod wyświetlony dużą czcionką monospace
I mogę kliknąć "Kopiuj" aby skopiować kod
```

### AC-2: Unikalność share code
```gherkin
Zakładając, że generuję nowy kod
Wtedy kod jest unikalny w całej bazie
I jeśli trafi się kolizja, serwer generuje nowy aż do sukcesu
```

### AC-3: Panel zawodnika — ekran logowania
```gherkin
Zakładając, że wchodzę na stronę główną (niezalogowany)
Wtedy widzę ekran "Panel zawodnika" z polem na 6-znakowy kod
I pole jest monospace, uppercase
I przycisk "Połącz"
```

### AC-4: Wejście przez share code
```gherkin
Zakładając, że mam ważny kod "A3F7K9"
Kiedy wpisuję go w pole i klikam "Połącz"
Wtedy jestem przekierowany na /A3F7K9
I widzę read-only profil zawodnika
I widzę wskaźnik sync (zielona kropka)
```

### AC-5: Błędny kod
```gherkin
Zakładając, że wpisuję nieistniejący kod "XXXXXX"
Kiedy klikam "Połącz"
Wtedy widzę komunikat błędu: "Nieprawidłowy kod. Poproś trenera o nowy."
I pole pozostaje wypełnione
```

### AC-6: Real-time sync — zmiana trenera widoczna u zawodnika
```gherkin
Zakładając, że zawodnik ma otwarte /A3F7K9 w przeglądarce
I trener ma otwarte /athletes/<id>
Kiedy trener zmienia wagę z 75 na 76 kg
I auto-save zapisuje zmianę
Wtedy zawodnik widzi nową wagę 76 kg w ciągu <5 sekund
BEZ odświeżania strony
```

### AC-7: Wskaźnik sync
```gherkin
Zakładając, że zawodnik jest online i połączony
Wtedy widzi zieloną kropkę z tekstem "Zsynchronizowano"
Kiedy utraci połączenie
Wtedy widzi pulsującą żółtą kropkę z "Łączę..."
Kiedy odzyska połączenie
Wtedy kropka wraca do zielonej
```

### AC-8: Reset kodu przez trenera
```gherkin
Zakładając, że zawodnik ma kod "A3F7K9" i jest połączony
Kiedy trener klika "Resetuj kod"
Wtedy powstaje nowy kod
I stary kod przestaje działać (zawodnik widzi "Nieprawidłowy kod" po próbie reconnect)
```

## Definition of Done

- [ ] Migracja `supabase/migrations/YYYYMMDDHHMMSS_US-004_share_codes_table.sql`
- [ ] Funkcja DB `generate_share_code()` generująca unikalny 6-znakowy kod
- [ ] RLS policies (zawodnik może czytać profil powiązany z jego share code)
- [ ] RPC function `get_athlete_by_share_code(code)` (omijająca RLS kontrolnie)
- [ ] API route `POST /api/athletes/[id]/share` (generuj/resetuj)
- [ ] Strona publiczna `/[shareCode]` w `app/(athlete)/[shareCode]/page.tsx`
- [ ] Strona główna `/` z formularzem logowania kodem
- [ ] Custom hook `useRealtimeAthlete(shareCode)` — subskrybuje Supabase Realtime channel
- [ ] Zakładka "Online" w edytorze zawodnika
- [ ] Komponent SyncIndicator (zielona/żółta kropka)
- [ ] Unit tests (walidacja kodu, utility)
- [ ] Integration tests (API route, RLS, RPC function)
- [ ] E2E test z dwoma browser contexts: coach edytuje, athlete widzi update
- [ ] Review approved
- [ ] Deployed

## Implementation Notes

- Share code alfabet: A-Z + 0-9 bez 0/O/1/I (zmniejsza pomyłki) → 32 znaki × 6 pozycji = 1 mld kombinacji
- Channel name: `athlete:${shareCode}` (subskrypcja na postgres_changes na rekordzie)
- RLS dla zawodnika: osobna polisa na `athletes` table z `USING (EXISTS (SELECT 1 FROM share_codes WHERE share_codes.athlete_id = athletes.id AND share_codes.code = current_setting('request.jwt.claim.share_code', true)))`
- Alternatywnie: RPC function z SECURITY DEFINER

