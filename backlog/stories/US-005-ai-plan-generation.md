---
id: US-005
title: Generowanie planu treningowego przez Claude AI
role: trener
priority: P0
estimate: L
status: InE2E
dependencies: [US-002, US-003]
epic: EPIC-B
design_required: true
design_doc: docs/design/US-005-design.md
created: 2026-04-08
updated: 2026-04-15
---

# US-005 — Generowanie planu treningowego przez Claude AI

## User Story

**Jako** trener,
**chcę** wygenerować spersonalizowany plan treningowy jednym kliknięciem na podstawie danych zawodnika,
**aby** zaoszczędzić czas i dostać profesjonalny plan zgodny z metodologią treningu.

## Acceptance Criteria (Gherkin)

### AC-1: Przycisk generowania w edytorze
```gherkin
Zakładając, że jestem na /athletes/<id> i zakładka "Plany"
Wtedy widzę przycisk "Generuj plan AI"
I pod przyciskiem widzę informację: poziom zawodnika, liczba progresji, "pierwszy plan" lub "kontynuacja po X"
```

### AC-2: Spinner podczas generowania
```gherkin
Zakładając, że klikam "Generuj plan AI"
Wtedy przycisk jest zablokowany
I widzę spinner z tekstem "Generuję plan..."
I progresja trwa do 60 sekund max
```

### AC-3: Plan zapisany i wyświetlony
```gherkin
Zakładając, że generowanie się udało
Wtedy widzę wygenerowany plan z nazwą, fazą, opisem
I plan ma 4 tygodnie
I każdy tydzień ma liczbę dni = training_days_per_week zawodnika
I każdy dzień ma 5-7 ćwiczeń
I każde ćwiczenie ma: nazwa, sets, reps, intensity, rest, tempo, notes
I plan jest zapisany w DB w tabeli `training_plans`
```

### AC-4: Kontuzje respektowane
```gherkin
Zakładając, że zawodnik ma aktywną kontuzję "Barku - naderwanie"
Kiedy generuję plan
Wtedy w wygenerowanym planie NIE MA ćwiczeń wyciskania nad głową
I w sekcji "progressionNotes" jest wzmianka o ograniczeniach
```

### AC-5: Obsługa timeout
```gherkin
Zakładając, że generowanie przekracza 60 sekund
Wtedy otrzymuję komunikat "Przekroczono czas. Spróbuj ponownie."
I plan NIE jest zapisany
I przycisk znowu jest aktywny
```

### AC-6: Obsługa invalid JSON
```gherkin
Zakładając, że Claude zwrócił tekst z markdown backticks lub dodatkowym tekstem
Wtedy parser JSON radzi sobie (strip backticks, extract JSON block)
I plan jest poprawnie zapisany
```

### AC-7: Retry po błędzie
```gherkin
Zakładając, że pierwsza próba się nie powiodła (500 Internal Server Error z Anthropic)
Wtedy system automatycznie ponawia raz
I jeśli druga próba się powiedzie, plan jest zapisany
I jeśli obie nieudane, użytkownik widzi szczegółowy błąd
```

### AC-8: Rate limiting
```gherkin
Zakładając, że zgenerowałem już 3 plany w ciągu ostatniej minuty
Kiedy próbuję wygenerować kolejny
Wtedy dostaję 429 Too Many Requests z komunikatem po polsku
```

## Definition of Done

- [ ] Migracja `training_plans` table (id, athlete_id FK, plan_json JSONB, plan_name, phase, created_at)
- [ ] RLS policies
- [ ] `lib/ai/client.ts` — Anthropic SDK wrapper z timeout 60s
- [ ] `lib/ai/prompts/plan-generation.ts` — system + user prompt z kontekstem zawodnika (wg spec)
- [ ] Prompt caching dla dużego kontekstu (muscle DB w przyszłości, coach rules)
- [ ] API route `POST /api/athletes/[id]/plans` — proxy do Claude API
- [ ] Parser JSON odporny na markdown i prefix/suffix
- [ ] Retry logic (1 retry po transient error)
- [ ] Rate limiter (3 req / minuta per trainer — prosty in-memory lub Supabase)
- [ ] Frontend: przycisk + spinner + wyświetlenie planu (Plan Viewer — minimalna wersja)
- [ ] Sekcja informacyjna nad przyciskiem (poziom, progresje, kontynuacja)
- [ ] Unit tests dla parsera JSON, prompt buildera, rate limitera
- [ ] Integration test z zamockowanym Anthropic SDK
- [ ] E2E test: zawodnik z kontuzją → wygenerowany plan nie zawiera problematycznych ćwiczeń
- [ ] Review approved
- [ ] Deployed

## Implementation Notes

- Model: `claude-sonnet-4-6`
- System prompt: `Odpowiadaj WYŁĄCZNIE poprawnym JSON. Bez markdown. Pierwszy znak: {, ostatni: }.`
- User prompt: pełny kontekst (wg spec) z danymi zawodnika
- Temperature: 0.7 (trade-off między kreatywnością a spójnością)
- Max tokens: 8000 (plan 4-tygodniowy bywa obszerny)
- Claude może czasem dodać markdown mimo instrukcji — parser musi być odporny
- Rate limit: 3 plan/min — niezbędne by nie przekroczyć quota i ograniczyć koszt

