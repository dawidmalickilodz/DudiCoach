# Training Planner AI — Backlog

**Owner**: backlog-manager agent
**Last updated**: 2026-04-15
**Sprint**: Sprint 1 (Foundation + First Vertical Slice)

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
| `Rework` | Bounced back — needs fix |

## Current Sprint — Sprint 1

| ID | Title | Epic | Priority | Estimate | Status | Notes |
|---|---|---|---|---|---|---|
| US-001 | Logowanie trenera do panelu | EPIC-A | P0 | S | Done | Auth + middleware + logout + QA |
| US-002 | Backend CRUD zawodnika | EPIC-A | P0 | M | Done | Route Handlers + RLS + integration/E2E API |
| US-003 | Frontend lista + edycja zawodnika z auto-save | EPIC-A | P0 | M | InDev | Dashboard cards + editor + useAutoSave |
| US-004 | Share code + panel zawodnika + real-time | EPIC-C | P0 | L | Ready | Do realizacji po domknięciu US-003 |
| US-005 | Generowanie planu AI przez Claude | EPIC-B | P0 | L | Ready | Do realizacji po US-004 |

## Backlog — v1.1 (post-MVP)

| ID | Title | Epic | Priority | Estimate | Status |
|---|---|---|---|---|---|
| US-010 | Diagnostyka FMS — baza mięśni + searchable dropdown | EPIC-A | P1 | XL | Draft |
| US-011 | Kontuzje zawodnika — lista z severity | EPIC-A | P1 | M | Draft |
| US-012 | Testy sprawnościowe — dynamiczne per sport | EPIC-A | P1 | M | Draft |
| US-013 | Progresje obciążeń — tracker z wykresem | EPIC-A | P1 | L | Draft |
| US-014 | Checkbox done + notatki zawodnika per ćwiczenie | EPIC-C | P1 | M | Draft |
| US-015 | Historia snapshotów diagnostyki FMS | EPIC-A | P1 | M | Draft |
| US-016 | Export planu do PDF | EPIC-B | P1 | S | Draft |
| US-017 | Wiele planów per zawodnik z historią | EPIC-B | P1 | M | Draft |
| US-018 | Podsumowanie cyklu (wyniki + notatki trenera) | EPIC-B | P1 | S | Draft |

## Backlog — v1.2+ (nice-to-have)

| ID | Title | Epic | Priority |
|---|---|---|---|
| US-020 | Galeria wideo ćwiczeń | EPIC-B | P2 |
| US-021 | Raportowanie RPE i bólu przez zawodnika | EPIC-C | P2 |
| US-022 | Progresje AI-rekomendowane na bazie feedbacku | EPIC-B | P2 |
| US-023 | Template'y planów (duplikacja) | EPIC-B | P2 |

## Epics

- **EPIC-A**: Zarządzanie zawodnikami — `epics/EPIC-A-athlete-mgmt.md`
- **EPIC-B**: Generowanie planów AI — `epics/EPIC-B-plan-generation.md`
- **EPIC-C**: Udostępnianie i real-time sync — `epics/EPIC-C-realtime-sync.md`

## Workflow Reminder

Every story MUST traverse all 6 SDLC stages:
1. Backlog (this file) → 2. Produkcja → 3. Testy dev → 4. Testy test-env → 5. Wdrożenie → 6. Review → **Done**

Any story bounced back gets `status: Rework`.
