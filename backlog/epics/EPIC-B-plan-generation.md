---
id: EPIC-B
title: Generowanie planów treningowych AI
status: Planned
---

# EPIC-B — Generowanie planów AI

## Cel biznesowy
Kluczowa wartość aplikacji: trener generuje spersonalizowane plany treningowe przez Claude API, bazując na pełnym kontekście zawodnika (dane, cel, poziom, kontuzje, progresje, diagnostyka FMS).

## Stories w tym epiku

### MVP (v0.1)
- US-005 — Generowanie planu AI przez Claude

### Post-MVP (v1.1)
- US-016 — Export planu do PDF
- US-017 — Wiele planów per zawodnik
- US-018 — Podsumowanie cyklu

### v1.2+
- US-020 — Galeria wideo ćwiczeń
- US-022 — Progresje AI-rekomendowane
- US-023 — Template'y planów

## Success criteria
- Plan generowany w <60s
- Plan respektuje kontuzje (bezwzględnie)
- Plan ma konkretne kg bazujące na progresji
- Error handling dla timeout / invalid JSON
