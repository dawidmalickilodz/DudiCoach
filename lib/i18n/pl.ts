/**
 * Central dictionary of Polish UI strings for DudiCoach.
 *
 * RULE: Every user-facing string MUST come from this file.
 * NEVER hardcode Polish in components.
 *
 * Usage:
 *   import { pl } from "@/lib/i18n/pl";
 *   <h1>{pl.common.save}</h1>
 */

export const pl = {
  common: {
    save: "Zapisz",
    saved: "✓ Zapisano",
    saving: "Zapisuję...",
    cancel: "Anuluj",
    delete: "Usuń",
    edit: "Edytuj",
    add: "Dodaj",
    back: "Wstecz",
    loading: "Ładowanie...",
    error: "Wystąpił błąd",
    tryAgain: "Spróbuj ponownie",
    confirm: "Potwierdź",
    close: "Zamknij",
  },

  home: {
    title: "DudiCoach",
    description:
      "Profesjonalne zarządzanie zawodnikami i generowanie planów treningowych z wykorzystaniem AI.",
    coachLoginCta: "Logowanie trenera",
    athletePanelComingSoon: "Panel zawodnika wkrótce",
  },

  auth: {
    login: {
      title: "Zaloguj się",
      subtitle: "Wprowadź email i hasło, aby uzyskać dostęp do panelu trenera",
      emailLabel: "Email",
      emailPlaceholder: "trener@example.com",
      passwordLabel: "Hasło",
      passwordPlaceholder: "••••••••",
      submitButton: "Zaloguj się",
      submitting: "Loguję...",
      errorInvalid: "Nieprawidłowy email lub hasło",
      errorGeneric: "Nie udało się zalogować. Spróbuj ponownie.",
      errorNetwork: "Brak połączenia. Sprawdź internet.",
    },
    logout: {
      button: "Wyloguj",
      confirming: "Wylogowuję...",
    },
  },

  coach: {
    dashboard: {
      title: "Panel trenera",
      welcome: "Witaj z powrotem!",
      noAthletes: "Nie masz jeszcze żadnych zawodników.",
      noAthletesCta: "Dodaj pierwszego zawodnika",
      stats: {
        athletes: "Zawodnicy",
        plans: "Plany",
        progressions: "Progresje",
        online: "Online",
      },
    },
    athlete: {
      newTitle: "Nowy zawodnik",
      editTitle: "Edytor zawodnika",
      tabs: {
        profile: "Profil",
        tests: "Testy",
        injuries: "Kontuzje",
        diagnostics: "Diagnostyka FMS",
        progressions: "Progresje",
        plans: "Plany",
        online: "Online",
      },
      profile: {
        name: "Imię i nazwisko",
        age: "Wiek",
        weight: "Waga (kg)",
        height: "Wzrost (cm)",
        sport: "Sport",
        trainingStartDate: "Data rozpoczęcia treningów",
        trainingDays: "Dni treningowe w tygodniu",
        sessionMinutes: "Minuty na sesję",
        currentPhase: "Faza treningowa",
        goal: "Cel treningowy",
        notes: "Notatki dodatkowe",
        level: "Poziom",
      },
      level: {
        beginner: "Początkujący",
        intermediate: "Średniozaawansowany",
        advanced: "Zaawansowany",
        elite: "Elitarny",
      },
      phase: {
        preparatory: "Przygotowawczy",
        base: "Bazowy",
        building: "Budujący",
        peak: "Szczytowy",
        transition: "Przejściowy",
      },
    },
  },

  athletePanel: {
    loginTitle: "Panel zawodnika",
    loginSubtitle: "Wpisz 6-znakowy kod otrzymany od trenera",
    codePlaceholder: "ABCDEF",
    connect: "Połącz",
    connecting: "Łączę...",
    errorInvalidCode: "Nieprawidłowy kod. Poproś trenera o nowy.",
    disconnect: "Rozłącz",
    refresh: "Odśwież",
    syncedJustNow: "Zsynchronizowano",
    syncing: "Łączę...",
  },

  validation: {
    required: "To pole jest wymagane",
    emailInvalid: "Nieprawidłowy format email",
    passwordTooShort: "Hasło musi mieć co najmniej 8 znaków",
    ageRange: "Wiek musi być między 10 a 100",
    weightRange: "Waga musi być między 30 a 250 kg",
    heightRange: "Wzrost musi być między 100 a 250 cm",
    trainingDaysRange: "Liczba dni musi być między 1 a 7",
    sessionMinutesRange: "Czas sesji musi być między 20 a 180 minut",
  },
} as const;

export type Pl = typeof pl;
