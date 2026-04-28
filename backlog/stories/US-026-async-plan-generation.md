---
id: US-026
title: Async AI plan generation via job table & polling
role: trener
priority: P0
estimate: L
status: Ready
lane: C
dependencies: [US-005]
epic: EPIC-B
design_required: true
design_doc: docs/design/US-026-async-plan-generation-design.md
adr_refs:
  - docs/adr/0007-async-plan-generation-via-job-table.md
created: 2026-04-28
updated: 2026-04-28
sprint: Sprint 3
---

# US-026 — Async AI Plan Generation via Job Table & Polling

## User Story

**Jako** trener,
**chcę** żeby generowanie planu AI działało niezawodnie również dla pełnych
4-tygodniowych planów (które zajmują 60-120 s),
**aby** kliknięcie "Generuj plan AI" zawsze kończyło się albo widocznym
planem albo zrozumiałym błędem — nigdy timeoutem czy 504.

## Background / problem statement

Dotychczasowy synchroniczny flow `POST /api/athletes/[id]/plans` (US-005)
nie mieści się w limicie funkcji Vercel:

| `max_tokens` | Skutek |
|---|---|
| 3000 | JSON ucięty → parse error → 500 |
| 4000 | JSON ucięty → parse error → 500 |
| 6000 | Timeout Anthropic / 504 z Vercel |

Konfiguracja modelu (`claude-sonnet-4-6`) i klucz API są poprawne — to
ograniczenie architektoniczne synchronicznego wywołania. Migracja do Opusa
i wydłużenie timeoutu Vercel są poza zakresem tej historii (patrz
ADR-0007).

Rozwiązanie: zamiana wywołania synchronicznego na model job-queue + worker
+ polling. Pełny opis w `docs/design/US-026-async-plan-generation-design.md`
oraz `docs/adr/0007-async-plan-generation-via-job-table.md`.

## Acceptance Criteria (Gherkin)

### AC-1: Klik "Generuj plan AI" tworzy job i zwraca 202 < 500 ms

```gherkin
Zakładając, że jestem zalogowanym trenerem na karcie "Plany" zawodnika z kompletnymi danymi
Kiedy klikam przycisk "Generuj plan AI"
Wtedy w ciągu 500 ms otrzymuję odpowiedź HTTP 202
I odpowiedź zawiera { data: { jobId, status: "pending" } }
I przycisk pokazuje stan "W kolejce..."
I przycisk jest zablokowany do czasu zakończenia jobu
```

### AC-2: UI poll-uje status i pokazuje "Generuję plan..." gdy worker przejmie

```gherkin
Zakładając, że job został utworzony
Kiedy worker (Vercel Cron, max 60 s opóźnienia) przejmie job
Wtedy UI w trakcie pollingu wykrywa zmianę status z "pending" na "processing"
I copy spinnera zmienia się z "W kolejce..." na "Generuję plan..."
```

### AC-3: Sukces — plan zapisany w training_plans, lista odświeżona

```gherkin
Zakładając, że worker pomyślnie wygenerował plan i wywołał complete_plan_job
Wtedy job ma status "succeeded" i niepuste plan_id
I odpowiedź GET /api/coach/plans/jobs/{jobId} zawiera planId
I lista planów (planKeys.byAthlete) jest unieważniona
I nowy plan widoczny jest na karcie "Plany"
I tabela training_plans zawiera nowy wiersz (4 tygodnie x N dni x 5-7 ćwiczeń)
I wiersz spełnia trainingPlanJsonSchema
```

### AC-4: Polling cadence i max budget

```gherkin
Zakładając, że job jest aktywny
Wtedy UI poll-uje GET /jobs/{jobId} co 2 s przez pierwsze 30 s
I co 3 s pomiędzy 30 a 90 sekundą
I co 5 s powyżej 90 sekundy
I po 180 sekundach bez stanu terminalnego polling zatrzymuje się
I UI pokazuje komunikat "Generowanie trwa dłużej niż zwykle. Odśwież stronę..."
I dostępny jest przycisk "Odśwież" wykonujący jednorazowy refetch
```

### AC-5: Błąd parse / walidacji — bez retry, czytelny komunikat

```gherkin
Zakładając, że Claude zwrócił niepoprawny JSON lub odpowiedź nie spełnia trainingPlanJsonSchema
Wtedy worker wywołuje fail_plan_job z error_code = "parse_error" lub "validation_error"
I requeue jest false (deterministyczne — zgodnie z US-005 §6)
I status jobu = "failed"
I UI pokazuje "Błąd formatu odpowiedzi AI. Spróbuj ponownie."
I widoczny jest przycisk "Spróbuj ponownie" tworzący nowy job
```

### AC-6: Błąd transient (Anthropic 5xx, timeout) — automatic requeue + retry

```gherkin
Zakładając, że worker otrzymał Anthropic 503 lub APIConnectionTimeoutError
Wtedy fail_plan_job jest wywołany z requeue = true (jeśli attempts < max_attempts)
I status jobu wraca do "pending"
I claim_token jest wyczyszczony
I następny tick crona (do 60 s) przejmuje job ponownie
I attempts wzrasta o 1
I jeśli attempts == max_attempts, kolejny błąd ustawia status "failed"
```

### AC-7: Stale-claim recovery — worker, który zniknął, nie blokuje kolejki

```gherkin
Zakładając, że worker przejął job (status "processing", processing_started_at = T0) i zginął
Kiedy mija więcej niż 180 s od T0
Wtedy następne wywołanie claim_pending_plan_job wykrywa stale claim
I flipuje status z "processing" z powrotem na "pending" (claim_token = null)
I zaraz potem przejmuje ten sam job pod nowym claim_token
I generowanie kontynuuje (attempts wzrasta)
```

### AC-8: Race condition — dwóch workerów, jeden job

```gherkin
Zakładając, że istnieje dokładnie jeden pending job
Kiedy dwa workery wołają claim_pending_plan_job równocześnie (FOR UPDATE SKIP LOCKED)
Wtedy dokładnie jeden worker dostaje wiersz
I drugi dostaje 0 wierszy (pusty wynik)
I tylko jeden plan jest zapisany w training_plans
I status jobu kończy na "succeeded" (nie ma wyścigu / duplikatów)
```

### AC-9: Idempotencja — crash workera między Claude a write

```gherkin
Zakładając, że worker wywołał Claude i otrzymał poprawny JSON, po czym proces zginął przed wywołaniem complete_plan_job
Wtedy training_plans NIE zawiera dodatkowego wiersza
I status jobu pozostaje "processing" do momentu sweepu stale-claim
I po reclaim, kolejny worker wykonuje nowe wywołanie Claude (token kosztuje, ale to zaakceptowany koszt)
I dokładnie jeden plan kończy w training_plans
```

### AC-10: RLS — coach A nie widzi jobów coacha B

```gherkin
Zakładając, że coach A i coach B są zalogowani niezależnie
Kiedy coach A tworzy job J_A
Wtedy GET /api/coach/plans/jobs/{J_A} przez coacha B zwraca 404
I bezpośrednie SELECT na plan_generation_jobs przez coacha B zwraca 0 wierszy
I anon (publiczny endpoint) nie widzi żadnego wiersza w plan_generation_jobs
```

### AC-11: Public athlete endpoint pozostaje niezmieniony

```gherkin
Zakładając, że US-025 (publiczny endpoint planu zawodnika) jest wdrożony
Kiedy w ramach US-026 wprowadzane są zmiany w stosach Coach + worker + jobs
Wtedy GET /api/athlete/[shareCode]/plans nie jest modyfikowany
I diff w `app/api/athlete/[shareCode]/plans/route.ts` jest pusty
I publiczny endpoint dalej wywołuje wyłącznie get_latest_plan_by_share_code
I tabela plan_generation_jobs nigdy nie jest czytana przez publiczny endpoint
```

### AC-12: Worker route wymaga shared-secret

```gherkin
Zakładając, że POST /api/internal/plans/jobs/run jest wywoływany
Kiedy nagłówek Authorization nie zawiera prawidłowego Bearer ${PLAN_JOBS_WORKER_SECRET}
Wtedy odpowiedź to 401 z pustym body (brak ujawnienia szczegółów)
Kiedy nagłówek jest poprawny (Vercel Cron lub manual)
Wtedy worker drainuje kolejkę
```

### AC-13: Rate limiting na tworzeniu jobów

```gherkin
Zakładając, że trener utworzył 3 joby w ciągu ostatniej minuty (sukces lub porażka, niezależnie)
Kiedy próbuje stworzyć kolejny
Wtedy POST /api/coach/plans/jobs zwraca 429
I body zawiera "Zbyt wiele prób. Poczekaj chwilę."
I nagłówek Retry-After jest ustawiony
```

### AC-14: Feature flag i rollback

```gherkin
Zakładając, że NEXT_PUBLIC_PLAN_GENERATION_MODE = "sync"
Wtedy frontend używa starego synchronicznego flow (US-005)
I nowy flow asynchroniczny nie jest aktywny pomimo zdeployowanego backendu
Zakładając, że NEXT_PUBLIC_PLAN_GENERATION_MODE = "async"
Wtedy frontend używa nowego flow z polling
I rollback do trybu sync wymaga jedynie zmiany env i redeploya (bez migracji DB)
```

## Definition of Done

### Backend (PR 1)

- [ ] Migracja `supabase/migrations/{ts}_US-026_plan_generation_jobs.sql`:
  - [ ] `plan_job_status` enum
  - [ ] `plan_generation_jobs` table z kolumnami i constraintami z designu §2.1
  - [ ] Indeksy z designu §2.2
  - [ ] RLS policies (SELECT/INSERT only) z designu §2.3
  - [ ] Trigger spójności `coach_id` z `athletes.coach_id`
  - [ ] RPCs: `claim_pending_plan_job`, `complete_plan_job`, `fail_plan_job`
- [ ] Wszystkie RPCs są `SECURITY DEFINER` z `set search_path = public`
- [ ] EXECUTE na RPCs grant-owany WYŁĄCZNIE do `service_role`
- [ ] `app/api/coach/plans/jobs/route.ts` (POST) — auth, rate-limit, walidacja, INSERT, 202
- [ ] `app/api/coach/plans/jobs/[jobId]/route.ts` (GET) — auth, RLS-gated SELECT, sanitized response
- [ ] `app/api/internal/plans/jobs/run/route.ts` (POST) — bearer auth, claim → generate → complete/fail loop
- [ ] `lib/ai/error-classification.ts` — mapowanie błędów na error_code
- [ ] `lib/api/plan-jobs.ts` — typy + fetch helpers
- [ ] `vercel.json` — Vercel Cron entry + `maxDuration` na worker route
- [ ] `lib/i18n/pl.ts` — `coach.athlete.plans.job.*` keys
- [ ] `app/api/athletes/[id]/plans/route.ts` — POST za feature flagiem (sync/async); GET niezmieniony
- [ ] Regenerated `lib/supabase/database.types.ts`
- [ ] Unit tests wg designu §8
- [ ] Integration tests wg designu §8 (RLS, claim race, stale recovery, all routes)
- [ ] `npx tsc --noEmit` clean
- [ ] `npx eslint --max-warnings 0` clean
- [ ] `npx vitest run` clean
- [ ] Security review (G7) approved per checklist w designie §7
- [ ] Code review (G6) approved

### Frontend (PR 2)

- [ ] `lib/hooks/useStartPlanJob.ts` — `useMutation` na POST /coach/plans/jobs
- [ ] `lib/hooks/usePlanJob.ts` — `useQuery` z `refetchInterval` zgodnym z polling cadence (§5.4)
- [ ] `components/coach/PlanGenerateSection.tsx` — state machine driven by job status
- [ ] `components/coach/GeneratePlanButton.tsx` — copy "W kolejce..." / "Generuję plan..." / sukces transient
- [ ] `components/coach/PlanTabContent.tsx` — `onSettled` invalidation
- [ ] Polish copy w `pl.ts` zgodne z §5.5 designu
- [ ] E2E test `tests/e2e/US-026.spec.ts` (z opt-in `E2E_ALLOW_AI_CALL=1` dla pełnego cyklu)
- [ ] E2E test `tests/e2e/US-026-failure.spec.ts` — flow błędu z retry CTA
- [ ] UI review (G4) approved
- [ ] Code review (G6) approved
- [ ] Smoke test w preview Vercel: pełny cykl POST → cron → polling → succeeded

### Release readiness (G9)

- [ ] Migracja zaaplikowana w preview i produkcji
- [ ] `PLAN_JOBS_WORKER_SECRET` ustawiony w Vercel (production + preview)
- [ ] `NEXT_PUBLIC_PLAN_GENERATION_MODE` ustawiony (`async` po cutover)
- [ ] Vercel tier potwierdzony (musi obsługiwać `maxDuration: 60` minimum; rekomendowane 300 — Pro)
- [ ] Rollback path zweryfikowany w preview (flip env do `sync`, ponowny deploy)
- [ ] Logs zweryfikowane: brak `prompt_inputs`, brak `share_code`, brak raw Claude responses w logach

## Implementation Notes

- **Lane**: C — schemat DB + RLS + nowe SECURITY DEFINER funkcje + worker
  bezpieczeństwa. Mandatory G2 (architect, ten dokument), G7 (security
  review), G9 (release readiness).
- **Brak zmiany w `lib/validation/training-plan.ts`** — worker reużywa
  istniejącego zod schema.
- **Brak zmiany w prompcie** — worker reużywa
  `lib/ai/prompts/plan-generation.ts` w całości.
- **Brak zmiany w `lib/ai/client.ts`** — `generatePlan()` jest wywoływany z
  workera identycznie jak z synchronicznego route'a.
- **`max_tokens`** pozostaje 8000 (jak w US-005). Nie zmniejszamy w tej
  historii — to zmiana modelu/jakości i jest poza zakresem.
- **Cleanup starych rekordów**: out of scope (Q3 w designie). Kolejna
  historia może dodać dziennego crona usuwającego stare succeeded/failed
  joby.

## Open questions / blockers (z designu)

| # | Pytanie | Status |
|---|---|---|
| Q1 | Vercel tier (potrzebny `maxDuration: 60`+) | **BLOCKER dla G3 backend.** Wymaga potwierdzenia od właściciela projektu. |
| Q2 | Polityka rotacji `PLAN_JOBS_WORKER_SECRET` | Doc-only, nie blokuje. |
| Q3 | Retencja jobów (auto-cleanup) | Out of scope; follow-up. |
| Q4 | Concurrent jobs per athlete | Out of scope; follow-up. |
| Q5 | Observability / alerting na stuck jobs | Out of scope; follow-up. |

## Dependencies

- **US-005** — synchronous plan generation (deprecatable po cutover, ale
  pozostaje za feature flagiem jako fallback).
- **US-025** — publiczny endpoint planu zawodnika; **frozen, nie zmieniamy**.
- ADR-0001, ADR-0002, ADR-0004, ADR-0006 — polityki, do których ten ADR
  się dostosowuje.
