---
title: Training Planner AI — Specyfikacja Aplikacji
owner: user (personal trainer)
status: imported
imported_date: 2026-04-08
source: original user request
---

# Training Planner AI — Specyfikacja Aplikacji

## Podsumowanie
Aplikacja webowa do profesjonalnego tworzenia i zarządzania planami treningowymi. Trener personalny zarządza profilami zawodników, generuje plany treningowe za pomocą AI (Anthropic Claude API), a zawodnicy mają dostęp online do swoich planów, mogą logować progresje i zostawiać notatki — widoczne w czasie rzeczywistym dla trenera.

Język interfejsu: **polski**.

---

## Stack technologiczny (zdecydowany)

- **Frontend**: Next.js 14 (App Router) + TypeScript strict
- **Backend**: Next.js route handlers (`app/api/**`)
- **Baza danych**: Supabase (Postgres + RLS)
- **Auth**: Supabase Auth (single-user — jeden trener)
- **Real-time sync**: Supabase Realtime (postgres_changes channels)
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`)
- **Deploy**: Vercel + Supabase Cloud (region Frankfurt, GDPR)

> Kluczowe: dane muszą być współdzielone online w czasie rzeczywistym między trenerem a zawodnikiem. Supabase Realtime rozwiązuje to w pełni.

---

## Role użytkowników

### 1. Trener (Coach) — jedyny użytkownik z kontem
- Loguje się (Supabase Auth, email + password lub magic link)
- Zarządza wieloma zawodnikami
- Ma pełny dostęp do edycji profili, generowania planów AI, diagnostyki FMS
- Widzi progresje i notatki wpisywane przez zawodnika (real-time)
- Generuje kod dostępu dla każdego zawodnika osobno

### 2. Zawodnik (Athlete) — bez konta
- Nie tworzy konta — otwiera link do aplikacji i wpisuje 6-znakowy kod otrzymany od trenera
- Widzi swój profil i plany treningowe (read-only — nie edytuje profilu)
- Może: odznaczać wykonane ćwiczenia, logować obciążenia (kg), pisać notatki przy ćwiczeniach
- Jego dane (progresje, notatki, oznaczone ćwiczenia) widoczne dla trenera w czasie rzeczywistym
- Osobna zakładka na prywatne progresje obciążeń

---

## Model danych

### Athlete (profil zawodnika)
```
{
  id: string (UUID),
  coachId: string (FK do trenera),
  shareCode: string (6 znaków, unikalne, np. "H2EKZ5"),

  name: string,
  age: number,
  weight: number (kg),
  height: number (cm),
  sport: string (enum),

  trainingStartDate: date,
  // Poziom obliczany automatycznie na podstawie stażu:
  //   0–6 mies. = "Początkujący"
  //   6–18 mies. = "Średniozaawansowany"
  //   18–48 mies. = "Zaawansowany"
  //   48+ mies. = "Elitarny"

  trainingDaysPerWeek: number (1-7),
  sessionMinutes: number (20-180),
  currentPhase: string (enum),
  goal: string,
  notes: string,

  tests: { [testName: string]: string },
  injuries: Injury[],
  diagnostics: {
    current: DiagnosticFinding[],
    history: DiagnosticSnapshot[]
  },
  progressions: { [exerciseName: string]: ProgressionEntry[] },
  plans: TrainingPlan[],

  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Injury
```
{
  id: string,
  name: string,
  severity: "Lekka" | "Średnia" | "Poważna" | "Chroniczna",
  notes: string,
  status: "aktywna" | "wyleczona"
}
```

### DiagnosticFinding (FMS)
```
{
  id: string,
  region: "Góra" | "Dół" | "Stopa",
  side: "Lewa" | "Prawa",
  muscle: string,
  severity: "słaby" | "bardzo_słaby" | "dysfunkcja",
  notes: string,
  date: timestamp
}
```

### DiagnosticSnapshot
```
{
  snapshot: DiagnosticFinding[],
  date: timestamp,
  note: string
}
```

### ProgressionEntry
```
{
  date: timestamp,
  weight: number (kg),
  reps: string,
  sets: string,
  note: string,
  source: "coach" | "athlete"
}
```

### TrainingPlan
```
{
  id: string,
  planName: string,
  phase: string,
  summary: string,
  weeklyOverview: string,
  weeks: Week[],
  progressionNotes: string,
  nutritionTips: string,
  recoveryProtocol: string,
  results: string,
  coachNotes: string,
  createdAt: timestamp
}
```

### Week → Day → Exercise (hierarchia planu)
Week: weekNumber, focus, days[]
Day: dayNumber, dayName, warmup, exercises[], cooldown, duration
Exercise: name, sets, reps, intensity, rest, tempo, notes

### AthletePlanNotes (feedback zawodnika)
```
{
  athleteShareCode: string,
  planId: string,
  exerciseNotes: {
    [key: string]: { done: boolean, note: string }
  }
}
```

### AthleteProgressions (progresje zawodnika — oddzielne)
```
{
  athleteShareCode: string,
  progressions: { [exerciseName: string]: ProgressionEntry[] }
}
```

---

## Baza mięśni — Diagnostyka FMS (68 mięśni)

### Góra (30 mięśni)
- Naramienny przedni (Anterior Deltoid)
- Naramienny boczny (Lateral Deltoid)
- Naramienny tylny (Posterior Deltoid)
- Czworoboczny górny (Upper Trapezius)
- Czworoboczny środkowy (Middle Trapezius)
- Czworoboczny dolny (Lower Trapezius)
- Najszerszy grzbietu (Latissimus Dorsi)
- Piersiowy większy (Pectoralis Major)
- Piersiowy mniejszy (Pectoralis Minor)
- Dwugłowy ramienia (Biceps Brachii)
- Trójgłowy ramienia (Triceps Brachii)
- Ramienno-promieniowy (Brachioradialis)
- Równoległoboczny (Rhomboid)
- Zębaty przedni (Serratus Anterior)
- Nadgrzebieniowy (Supraspinatus)
- Podgrzebieniowy (Infraspinatus)
- Podłopatkowy (Subscapularis)
- Obły mniejszy (Teres Minor)
- Obły większy (Teres Major)
- Dźwigacz łopatki (Levator Scapulae)
- Prostowniki grzbietu (Erector Spinae)
- Prosty brzucha (Rectus Abdominis)
- Skośny zewnętrzny (External Oblique)
- Skośny wewnętrzny (Internal Oblique)
- Poprzeczny brzucha (Transversus Abdominis)
- Prostownik nadgarstka (Wrist Extensors)
- Zginacz nadgarstka (Wrist Flexors)
- Przepona (Diaphragm)
- Wielodzielny (Multifidus)
- Czworoboczny lędźwi (Quadratus Lumborum)

### Dół (24 mięśnie)
- Czworogłowy uda – prosty (Rectus Femoris)
- Czworogłowy – boczny (Vastus Lateralis)
- Czworogłowy – przyśrodkowy (Vastus Medialis)
- Czworogłowy – pośredni (Vastus Intermedius)
- Dwugłowy uda (Biceps Femoris)
- Półścięgnisty (Semitendinosus)
- Półbłoniasty (Semimembranosus)
- Pośladkowy wielki (Gluteus Maximus)
- Pośladkowy średni (Gluteus Medius)
- Pośladkowy mały (Gluteus Minimus)
- Przywodziciel długi (Adductor Longus)
- Przywodziciel wielki (Adductor Magnus)
- Przywodziciel krótki (Adductor Brevis)
- Smukły (Gracilis)
- Naprężacz powięzi szerokiej (TFL)
- Biodrowo-lędźwiowy (Iliopsoas)
- Gruszkowaty (Piriformis)
- Brzuchaty łydki (Gastrocnemius)
- Płaszczkowaty (Soleus)
- Piszczelowy przedni (Tibialis Anterior)
- Strzałkowy długi (Peroneus Longus)
- Strzałkowy krótki (Peroneus Brevis)
- Podkolanowy (Popliteus)
- Krawiecki (Sartorius)

### Stopa (14 mięśni)
- Zginacz krótki palców (Flexor Digitorum Brevis)
- Zginacz długi palców (Flexor Digitorum Longus)
- Odwodziciel palucha (Abductor Hallucis)
- Przywodziciel palucha (Adductor Hallucis)
- Zginacz krótki palucha (Flexor Hallucis Brevis)
- Zginacz długi palucha (Flexor Hallucis Longus)
- Prostownik krótki palców (Extensor Digitorum Brevis)
- Prostownik długi palców (Extensor Digitorum Longus)
- Mięśnie międzykostne grzbietowe (Dorsal Interossei)
- Mięśnie międzykostne podeszwowe (Plantar Interossei)
- Robaczkowate stopy (Lumbricals)
- Czworoboczny podeszwy (Quadratus Plantae)
- Piszczelowy tylny (Tibialis Posterior)
- Odwodziciel palca małego (Abductor Digiti Minimi)

---

## Sporty i testy sprawnościowe

| Sport | Testy |
|-------|-------|
| Siłownia | 1RM Squat, 1RM Bench, 1RM Deadlift, 1RM OHP |
| Piłka nożna | Beep test, Sprint 30m, Skok w dal, Yo-Yo test |
| Koszykówka | Vertical jump, Lane agility, Sprint 3/4, T-test |
| Siatkówka | Vertical jump, Block jump, Sprint 10m, Zasięg ataku |
| Bieganie | VO2max, Próg mleczanowy, Cooper test, Tempo 1km |
| Kolarstwo | FTP test, VO2max, Ramp test, 20min power |
| Crossfit | 1RM Back Squat, 1RM Deadlift, Fran time, 2km wioślarnia |
| Sztuki walki | Beep test, Pull-ups max, Plank max, Sprint 10x30m |
| Pływanie | 100m kraul, 400m kraul, CSS test, Vertical kick |
| Inny | Test własny |

## Fazy treningowe
Przygotowawczy | Bazowy | Budujący | Szczytowy | Przejściowy (Regeneracja)

---

## Funkcjonalności szczegółowe

### 1. Panel trenera — lista zawodników (dashboard)
Karty zawodników z: imię, sport, poziom (kolorowy badge), staż, liczba planów, liczba śledzonych progresji, aktywne kontuzje, kod udostępniania. Statystyki u góry. FAB do dodawania. Przycisk "Podgląd klienta" przełącza widok.

### 2. Edytor zawodnika — zakładki
**Profil**: imię, sport (dropdown), wiek, waga, wzrost, data rozpoczęcia (→ auto-kalkulacja poziomu), pasek postępu między poziomami, faza, dni/tydzień, minuty/sesja, cel, notatki, AUTO-SAVE 600ms.

**Testy**: dynamiczna lista zależna od sportu, pola tekstowe, własne testy.

**Kontuzje**: lista z badge stopnia i statusu, dodawanie/edycja/przełączanie statusu/usuwanie.

**Diagnostyka FMS**: formularz z searchable dropdown mięśni (format "Polska (Latin)"), pogrupowane znaleziska (Góra 💪 / Dół 🦵 / Stopa 🦶, lewa | prawa), 3 przyciski stopnia, notatki, historia snapshotów z przywracaniem.

**Progresje**: lista śledzonych ćwiczeń, wykres słupkowy + historia, badge zmiany, formularz dodawania. Progresje zawodnika z oznaczeniem "● zawodnik" (zielony).

**Plany**: przycisk "Generuj plan AI", lista planów, kliknięcie otwiera Plan Viewer.

**Online (udostępnianie)**: 6-znakowy kod, przyciski publikuj/reset, status sync, feedback zawodnika.

### 3. Plan Viewer
Współdzielony między trenerem i zawodnikiem (różne uprawnienia). Nagłówek, struktura tygodnia, nawigacja po tygodniach, fokus tygodnia, dni (rozgrzewka, ćwiczenia z checkbox done, parametry, ostatnia progresja, notatka zawodnika, wskazówki techniczne, przycisk "kg" do szybkiego logowania, cool-down), sekcje (progresja/żywienie/regeneracja), podsumowanie cyklu.

### 4. Panel zawodnika
Ekran logowania: pole na 6-znakowy kod, przycisk "Połącz". Dashboard: profil (read-only), wskaźnik sync, zakładki Plany | Progresje, Plan Viewer, tracker progresji, Rozłącz/Odśwież.

---

## Generowanie planu AI

### Model
`claude-sonnet-4-6` via Anthropic Messages API

### System prompt
```
Odpowiadaj WYŁĄCZNIE poprawnym JSON. Bez markdown. Pierwszy znak: {, ostatni: }.
```

### User prompt — zawiera WSZYSTKIE dane zawodnika
(patrz: oryginalna specyfikacja w repozytorium — format prompta z danymi zawodnika, celem, testami, kontuzjami, progresjami, diagnostyką FMS, poprzednim planem)

### Zasady generowania planu
- Periodyzacja odpowiednia do poziomu
- Ćwiczenia specyficzne dla sportu
- BEZWZGLĘDNIE omijaj ćwiczenia obciążające kontuzjowane partie
- Progresja obciążeń między tygodniami, deload w tygodniu 4
- Tempo (ekscentryczne-izometryczne-koncentryczne-pauza)
- Konkretne kg na podstawie progresji
- Ćwiczenia korekcyjne na słabe mięśnie z FMS
- Symetria lewa-prawa

### Format odpowiedzi (JSON)
planName, phase, summary, weeklyOverview, weeks[weekNumber, focus, days[dayNumber, dayName, warmup, exercises[name, sets, reps, intensity, rest, tempo, notes], cooldown, duration]], progressionNotes, nutritionTips, recoveryProtocol.

---

## Synchronizacja danych (Real-time)

### Przepływ
- Trener zapisuje → Zawodnik widzi (profil, plany, diagnostyka opcjonalnie, kontuzje opcjonalnie)
- Zawodnik zapisuje → Trener widzi (odznaczone ćwiczenia, notatki, progresje scalone z badge, zalogowane kg)

### Wymagania
- Zmiany trenera → zawodnik w <5s
- Zmiany zawodnika → trener w <5s
- Offline fallback z buforowaniem lokalnym
- Wskaźnik sync (zielona kropka = OK, pulsująca żółta = sync w toku)

---

## UX / Design

### Motyw
- Dark theme (bg `#0A0F1A`)
- Karty `#111827` z 1px border `#1E293B`
- Inputy `#1A2236`
- Akcje: cyan `#22D3EE` (główny), green `#34D399` (sukces), red `#F87171` (błąd), orange `#FB923C` (ostrzeżenie), purple `#A78BFA` (udostępnianie), yellow `#FBBF24` (progresje)
- Font: DM Sans
- Border radius: 10px (karty), 6px (inputy), 20px (pill badges)

### Zasady UX
- Brak przycisków "Zapisz" (auto-save debounce 600-800ms)
- Subtelne "✓ Zapisano" (zanika po 1.5s)
- Nawigacja przez zakładki (pills)
- Mobile-first (max-width 900px)
- Back button w lewym górnym rogu
- FAB do dodawania
- Searchable dropdown zamyka się po klik poza

---

## Obsługa błędów

### Generowanie AI
- Timeout 60s
- Retry 1x
- Obsługa markdown backticks, tekstu przed/po JSON
- Szczegółowy komunikat błędu (status HTTP, treść)
- Spinner "Generuję plan..."

### Sync
- Automatyczny reconnect
- Last-write-wins
- Wizualny feedback

---

## Endpoints API (zdecydowane)

```
POST   /api/auth/login
GET    /api/athletes
POST   /api/athletes
PUT    /api/athletes/:id
DELETE /api/athletes/:id
POST   /api/athletes/:id/share
GET    /api/shared/:code
POST   /api/athletes/:id/plans
PUT    /api/plans/:id
DELETE /api/plans/:id
PUT    /api/shared/:code/feedback
GET    /api/shared/:code/feedback
POST   /api/ai/generate
```

---

## Priorytet implementacji

1. **Auth + schemat DB** — migracje, CRUD
2. **Panel trenera** — profil zawodnika, zakładki (bez AI)
3. **Diagnostyka FMS** — searchable dropdown, regiony, historia
4. **Generowanie planu AI** — integracja z Claude API
5. **Plan Viewer** — pełny widok z checkboxami i logowaniem kg
6. **Progresje** — tracker obciążeń z wykresami
7. **System udostępniania** — kody, panel zawodnika, real-time sync
8. **Dwustronna synchronizacja** — notatki i progresje zawodnika u trenera
9. **Polish & deploy**
