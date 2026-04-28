import type { Tables } from "@/lib/supabase/database.types";
import { pl } from "@/lib/i18n/pl";

type Athlete = Tables<"athletes">;

// ---------------------------------------------------------------------------
// Athlete context enriched with computed + related fields
// In v1 injuries/diagnostics/progressions tables don't exist yet (US-010/011/013).
// The builder accepts empty arrays so the prompt works without those tables,
// and will flow in seamlessly once those stories ship.
// ---------------------------------------------------------------------------

export interface InjuryContext {
  name: string;
  severity: string;
  notes?: string | null;
}

export interface DiagnosticContext {
  muscle: string;
  region: string;
  side: string;
  severity: string;
  notes?: string | null;
}

export interface ProgressionContext {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

export interface AthleteWithContext extends Athlete {
  /** Computed from training_start_date — months of training experience */
  trainingMonths: number;
  /** Derived level label: beginner / intermediate / advanced / elite */
  level: string;
  /** Active injuries (empty in v1) */
  activeInjuries: InjuryContext[];
  /** FMS diagnostic findings (empty in v1) */
  diagnosticFindings: DiagnosticContext[];
  /** Recent progression log entries (empty in v1) */
  recentProgressions: ProgressionContext[];
}

// ---------------------------------------------------------------------------
// System prompt (static, cached)
//
// Uses ASCII-only Polish (no diacritics) to avoid encoding issues in prompt
// caching. Output from Claude will use proper Polish characters.
// cache_control is applied by the client wrapper (lib/ai/client.ts).
// ---------------------------------------------------------------------------

export function buildSystemPrompt(): string {
  return `Jestes ekspertem od planowania treningowego. Odpowiadaj WYLACZNIE poprawnym JSON. Bez markdown, bez backtickow, bez tekstu przed lub po JSON. Pierwszy znak odpowiedzi: {, ostatni znak: }.

Zasady planowania:
- Periodyzacja odpowiednia do poziomu zawodnika
- Cwiczenia specyficzne dla sportu
- BEZWZGLEDNIE omijaj cwiczenia obciazajace kontuzjowane partie ciala
- Progresja obciazen miedzy tygodniami
- Tydzien 4 = deload (zmniejszone obciazenie)
- Tydzien 4 ma miec mniejsza objetosc niz tygodnie 1-3
- Tempo: ekscentryczne-izometryczne-koncentryczne-pauza (np. "3-1-2-0")
- Konkretne kilogramy na podstawie historii progresji (jesli dostepna)
- Cwiczenia korekcyjne na slabe miesnie z diagnostyki FMS
- Symetria lewa-prawa przy dysfunkcjach jednostronnych
- Rozgrzewka i cool-down w kazdym dniu
- Czas sesji musi sie miesic w podanym limicie minut
- Utrzymuj odpowiedz zwiezla: bez dlugich list i bez rozbudowanych opisow
- warmup, cooldown, focus i notes: dokladnie 1 krotkie zdanie
- summary, weeklyOverview, progressionNotes, nutritionTips, recoveryProtocol: zwiezle, bez elaboracji

Format odpowiedzi JSON (scisle przestrzegaj tego schematu):
{
  "planName": "string - nazwa planu",
  "phase": "string - faza treningowa",
  "summary": "string - krotkie podsumowanie planu (2-3 zdania)",
  "weeklyOverview": "string - ogolny zarys tygodniowej struktury",
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "string - fokus tygodnia",
      "days": [
        {
          "dayNumber": 1,
          "dayName": "string - np. Dzien A - Gora",
          "warmup": "string - opis rozgrzewki",
          "exercises": [
            {
              "name": "string - nazwa cwiczenia po polsku",
              "sets": "string - np. 4",
              "reps": "string - np. 8-10",
              "intensity": "string - np. 75% 1RM lub 40kg",
              "rest": "string - np. 90s",
              "tempo": "string - np. 3-1-2-0",
              "notes": "string - wskazowki techniczne"
            }
          ],
          "cooldown": "string - opis cool-downu",
          "duration": "string - szacowany czas np. 60 min"
        }
      ]
    }
  ],
  "progressionNotes": "string - wskazowki dotyczace progresji i ograniczen",
  "nutritionTips": "string - ogolne wskazowki zywieniowe",
  "recoveryProtocol": "string - protokol regeneracji"
}`;
}

// ---------------------------------------------------------------------------
// User prompt (dynamic, per athlete)
// ---------------------------------------------------------------------------

type GoalKey = keyof typeof pl.coach.athlete.goal;

/** Translates an internal goal key to its Polish display label. */
function goalToLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key in pl.coach.athlete.goal) {
    return pl.coach.athlete.goal[key as GoalKey];
  }
  // Fallback for any legacy free-form text that may still exist in the DB
  return key;
}

export function buildUserPrompt(athlete: AthleteWithContext): string {
  const goalDisplay = goalToLabel(athlete.goal);
  const injuriesSection =
    athlete.activeInjuries.length > 0
      ? athlete.activeInjuries
          .map(
            (i) =>
              `- ${i.name} (${i.severity})${i.notes ? ": " + i.notes : ""}`,
          )
          .join("\n")
      : "Brak aktywnych kontuzji";

  const diagnosticsSection =
    athlete.diagnosticFindings.length > 0
      ? athlete.diagnosticFindings
          .map(
            (d) =>
              `- ${d.muscle} (${d.region}, ${d.side}): ${d.severity}${d.notes ? " - " + d.notes : ""}`,
          )
          .join("\n")
      : "Brak zarejestrowanych dysfunkcji";

  const progressionsSection =
    athlete.recentProgressions.length > 0
      ? athlete.recentProgressions
          .map((p) => `- ${p.exercise}: ${p.weight}kg x${p.reps} (${p.date})`)
          .join("\n")
      : "Brak historii progresji";

  return `Wygeneruj 4-tygodniowy plan treningowy dla nastepujacego zawodnika:

## Dane zawodnika
- Imie: ${athlete.name}
- Wiek: ${athlete.age ?? "brak danych"}
- Waga: ${athlete.weight_kg != null ? String(athlete.weight_kg) + " kg" : "brak danych"}
- Wzrost: ${athlete.height_cm != null ? String(athlete.height_cm) + " cm" : "brak danych"}
- Sport: ${athlete.sport ?? "ogolny fitness"}
- Poziom: ${athlete.level}
- Staz treningowy: ${athlete.trainingMonths} miesiecy
- Faza treningowa: ${athlete.current_phase ?? "bazowy"}
- Dni treningowe/tydzien: ${athlete.training_days_per_week ?? 3}
- Czas sesji: ${athlete.session_minutes ?? 60} minut
- Cel: ${goalDisplay ?? "poprawa ogolnej sprawnosci"}

## Kontuzje (aktywne)
${injuriesSection}

## Diagnostyka FMS (aktualne dysfunkcje)
${diagnosticsSection}

## Historia progresji (ostatnie wpisy)
${progressionsSection}

## Dodatkowe notatki trenera
${athlete.notes ?? "Brak"}

Wygeneruj plan zgodny z podanym formatem JSON. Plan powinien miec dokladnie ${athlete.training_days_per_week ?? 3} dni treningowych na tydzien i 3-4 cwiczenia na sesje.
Zachowaj zwiezly styl: warmup/cooldown/focus/notes po 1 krotkim zdaniu, a sekcje summary/weeklyOverview/progressionNotes/nutritionTips/recoveryProtocol krotko i bez dlugich list.`.trim();
}

// ---------------------------------------------------------------------------
// Helper: compute athlete level from training months
// ---------------------------------------------------------------------------

export function computeAthleteLevel(trainingMonths: number): string {
  if (trainingMonths < 6) return "beginner";
  if (trainingMonths < 24) return "intermediate";
  if (trainingMonths < 60) return "advanced";
  return "elite";
}

// ---------------------------------------------------------------------------
// Helper: compute training months from training_start_date
// ---------------------------------------------------------------------------

export function computeTrainingMonths(
  trainingStartDate: string | null,
): number {
  if (!trainingStartDate) return 0;
  const start = new Date(trainingStartDate);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  return Math.max(0, months);
}
