/**
 * Canonical list of sport values used in athlete profiles.
 * Polish labels live in lib/i18n/pl.ts under coach.athlete.sport.*
 */

export const SPORTS = [
  "pilka_nozna",
  "koszykowka",
  "siatkowka",
  "tenis",
  "plywanie",
  "lekkoatletyka",
  "fitness",
  "crossfit",
  "boks",
  "mma",
  "inne",
] as const;

export type Sport = (typeof SPORTS)[number];
