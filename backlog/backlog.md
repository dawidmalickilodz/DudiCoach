# Training Planner AI - Backlog

**Owner**: backlog-manager agent
**Last updated**: 2026-04-16
**Sprint**: Sprint 2 (Hardening + Athlete Data)

## Status Legend

| Status | Meaning |
|---|---|
| `Draft` | Story being written |
| `Ready` | DoR met, ready to pick up |
| `InDev` | Developer implementing |
| `InDevTests` | qa-dev running unit/integration tests |
| `InE2E` | qa-test running Playwright on preview |
| `InDeploy` | devops promoting to prod |
| `InReview` | code-reviewer doing final review |
| `Done` | Shipped |
| `Rework` | Bounced back - needs fix |

## Completed — Sprint 1 (closed 2026-04-16)

| ID | Title | Epic | Priority | Estimate | Status | Notes |
|---|---|---|---|---|---|---|
| US-001 | Logowanie trenera do panelu | EPIC-A | P0 | S | Done | Review Approve 2026-04-10; preview E2E pass 2026-04-16 |
| US-002 | Backend CRUD zawodnika | EPIC-A | P0 | M | Done | Review Approve 2026-04-10; preview E2E pass 2026-04-16 |
| US-003 | Frontend lista + edycja zawodnika z auto-save | EPIC-A | P0 | M | Done | Review Approve 2026-04-15; preview E2E pass 2026-04-16 |
| US-004 | Share code + panel zawodnika + real-time | EPIC-C | P0 | L | Done | Review Approve 2026-04-15; preview E2E pass 2026-04-16 |
| US-005 | Generowanie planu AI przez Claude | EPIC-B | P0 | L | Done | Review Approve 2026-04-15; preview E2E pass 2026-04-16 |

## Current Sprint — Sprint 2 (Hardening + Athlete Data)

| ID | Title | Epic | Priority | Estimate | Status | Notes |
|---|---|---|---|---|---|---|
| US-020 | Unauth API routes — 401 zamiast 500 | EPIC-A | P2 | S | InDevTests | Hardening; impl 7c1e390; 194/194 tests |
| US-019 | Dashboard hydration - initialData w useAthletes query | EPIC-A | P2 | XS | InDevTests | Perf fix; initialData + staleTime 30s; 198/198 tests |
| US-011 | Kontuzje zawodnika - lista z severity | EPIC-A | P1 | M | InE2E | Backend+frontend complete; `tests/e2e/US-011.spec.ts` added; local run skipped without `E2E_COACH_*` |
| US-012 | Testy sprawnościowe - dynamiczne per sport | EPIC-A | P1 | M | Draft | Nowa tabela fitness_test_results + katalog testów |

## Operational Notes (2026-04-15)

- PR #5 (hotfix) is merged to `main` as `6762f5c`; production `/` and `/login` now return 200.
- PR #6 (draft): US-003/US-004/US-005 bundle is open with working preview and updated E2E specs.

## Operational Notes (2026-04-16)

- Full E2E suite executed locally with auth credentials: `22 passed`, `2 skipped` (US-005 AI opt-in), `0 failed`.
- US-003 auto-save race in E2E was stabilized by waiting for persisted API snapshot before back navigation.
- Full E2E suite executed on PR #6 preview after env/redeploy: `22 passed`, `2 skipped`, `0 failed`.
- US-011: dedicated Playwright spec added (`tests/e2e/US-011.spec.ts`); local run result `0 passed`, `4 skipped`, `0 failed` due missing `E2E_COACH_EMAIL` / `E2E_COACH_PASSWORD`.

## Backlog - v1.1 (post-MVP)

| ID | Title | Epic | Priority | Estimate | Status |
|---|---|---|---|---|---|
| US-010 | Diagnostyka FMS - baza miesni + searchable dropdown | EPIC-A | P1 | XL | Draft |
| ~~US-011~~ | ~~Kontuzje zawodnika~~ | — | — | — | → Sprint 2 |
| ~~US-012~~ | ~~Testy sprawnościowe~~ | — | — | — | → Sprint 2 |
| US-013 | Progresje obciazen - tracker z wykresem | EPIC-A | P1 | L | Draft |
| US-014 | Checkbox done + notatki zawodnika per cwiczenie | EPIC-C | P1 | M | Draft |
| US-015 | Historia snapshotow diagnostyki FMS | EPIC-A | P1 | M | Draft |
| US-016 | Export planu do PDF | EPIC-B | P1 | S | Draft |
| US-017 | Wiele planow per zawodnik z historia | EPIC-B | P1 | M | Draft |
| US-018 | Podsumowanie cyklu (wyniki + notatki trenera) | EPIC-B | P1 | S | Draft |
| ~~US-019~~ | ~~Dashboard hydration~~ | — | — | — | → Sprint 2 |
| ~~US-020~~ | ~~Unauth API routes~~ | — | — | — | → Sprint 2 |

## Backlog - v1.2+ (nice-to-have)

| ID | Title | Epic | Priority |
|---|---|---|---|
| US-021 | Galeria wideo cwiczen | EPIC-B | P2 |
| US-022 | Raportowanie RPE i bolu przez zawodnika | EPIC-C | P2 |
| US-023 | Progresje AI-rekomendowane na bazie feedbacku | EPIC-B | P2 |
| US-024 | Template'y planow (duplikacja) | EPIC-B | P2 |

## Epics

- **EPIC-A**: Zarzadzanie zawodnikami - `epics/EPIC-A-athlete-mgmt.md`
- **EPIC-B**: Generowanie planow AI - `epics/EPIC-B-plan-generation.md`
- **EPIC-C**: Udostepnianie i real-time sync - `epics/EPIC-C-realtime-sync.md`

## Workflow Reminder

Every story must traverse all 6 SDLC stages:
1. Backlog -> 2. Production -> 3. Dev tests -> 4. Test-env tests -> 5. Deploy -> 6. Review -> **Done**

Any story bounced back gets `status: Rework`.
