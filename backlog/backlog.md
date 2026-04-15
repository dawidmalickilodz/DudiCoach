# Training Planner AI - Backlog

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
| `Rework` | Bounced back - needs fix |

## Current Sprint - Sprint 1

| ID | Title | Epic | Priority | Estimate | Status | Notes |
|---|---|---|---|---|---|---|
| US-001 | Logowanie trenera do panelu | EPIC-A | P0 | S | InE2E | Waiting for coach E2E credentials |
| US-002 | Backend CRUD zawodnika | EPIC-A | P0 | M | InE2E | Waiting for coach E2E credentials |
| US-003 | Frontend lista + edycja zawodnika z auto-save | EPIC-A | P0 | M | InE2E | Draft PR #6 open |
| US-004 | Share code + panel zawodnika + real-time | EPIC-C | P0 | L | InE2E | E2E invalid-code checks passing on desktop/mobile |
| US-005 | Generowanie planu AI przez Claude | EPIC-B | P0 | L | InE2E | Live AI path gated by E2E_ALLOW_AI_CALL |

## Operational Notes (2026-04-15)

- PR #5 (hotfix) is merged to `main` as `6762f5c`; production `/` and `/login` now return 200.
- PR #6 (draft): US-003/US-004/US-005 bundle is open with working preview and updated E2E specs.

## Backlog - v1.1 (post-MVP)

| ID | Title | Epic | Priority | Estimate | Status |
|---|---|---|---|---|---|
| US-010 | Diagnostyka FMS - baza miesni + searchable dropdown | EPIC-A | P1 | XL | Draft |
| US-011 | Kontuzje zawodnika - lista z severity | EPIC-A | P1 | M | Draft |
| US-012 | Testy sprawnosciowe - dynamiczne per sport | EPIC-A | P1 | M | Draft |
| US-013 | Progresje obciazen - tracker z wykresem | EPIC-A | P1 | L | Draft |
| US-014 | Checkbox done + notatki zawodnika per cwiczenie | EPIC-C | P1 | M | Draft |
| US-015 | Historia snapshotow diagnostyki FMS | EPIC-A | P1 | M | Draft |
| US-016 | Export planu do PDF | EPIC-B | P1 | S | Draft |
| US-017 | Wiele planow per zawodnik z historia | EPIC-B | P1 | M | Draft |
| US-018 | Podsumowanie cyklu (wyniki + notatki trenera) | EPIC-B | P1 | S | Draft |

## Backlog - v1.2+ (nice-to-have)

| ID | Title | Epic | Priority |
|---|---|---|---|
| US-020 | Galeria wideo cwiczen | EPIC-B | P2 |
| US-021 | Raportowanie RPE i bolu przez zawodnika | EPIC-C | P2 |
| US-022 | Progresje AI-rekomendowane na bazie feedbacku | EPIC-B | P2 |
| US-023 | Template'y planow (duplikacja) | EPIC-B | P2 |

## Epics

- **EPIC-A**: Zarzadzanie zawodnikami - `epics/EPIC-A-athlete-mgmt.md`
- **EPIC-B**: Generowanie planow AI - `epics/EPIC-B-plan-generation.md`
- **EPIC-C**: Udostepnianie i real-time sync - `epics/EPIC-C-realtime-sync.md`

## Workflow Reminder

Every story must traverse all 6 SDLC stages:
1. Backlog -> 2. Production -> 3. Dev tests -> 4. Test-env tests -> 5. Deploy -> 6. Review -> **Done**

Any story bounced back gets `status: Rework`.
