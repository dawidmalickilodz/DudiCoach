---
id: EPIC-A
title: Zarządzanie zawodnikami
status: InProgress
---

# EPIC-A — Zarządzanie zawodnikami

## Cel biznesowy
Trener potrzebuje kompletnego systemu do zarządzania profilami zawodników — od podstawowych danych osobowych, przez historię kontuzji, wyniki testów sprawnościowych, po zaawansowaną diagnostykę FMS.

## Stories w tym epiku

### MVP (v0.1)
- US-001 — Logowanie trenera
- US-002 — Backend CRUD zawodnika
- US-003 — Frontend lista + edycja zawodnika

### Post-MVP (v1.1)
- US-010 — Diagnostyka FMS
- US-011 — Kontuzje
- US-012 — Testy sprawnościowe
- US-013 — Progresje obciążeń
- US-015 — Historia snapshotów diagnostyki

## Success criteria
- Trener może w <3 kliknięcia otworzyć profil dowolnego zawodnika
- Wszystkie pola auto-save z <1s opóźnienia
- Dane bezpieczne przez RLS (tylko zalogowany trener ma dostęp)
