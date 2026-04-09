---
id: EPIC-C
title: Udostępnianie planów i real-time sync
status: Planned
---

# EPIC-C — Udostępnianie i real-time sync

## Cel biznesowy
Zawodnik otrzymuje 6-znakowy kod od trenera i może w czasie rzeczywistym widzieć swój plan, odznaczać wykonane ćwiczenia, logować obciążenia i dodawać notatki — wszystko widoczne natychmiast u trenera.

## Stories w tym epiku

### MVP (v0.1)
- US-004 — Share code + panel zawodnika + real-time

### Post-MVP (v1.1)
- US-014 — Checkbox done + notatki zawodnika

### v1.2+
- US-021 — Raportowanie RPE i bólu

## Success criteria
- Zmiany trenera → widoczne u zawodnika w <5s
- Zmiany zawodnika → widoczne u trenera w <5s
- Offline fallback z buforowaniem lokalnym
- RLS gwarantuje, że zawodnik widzi tylko swoje dane (via share code)
