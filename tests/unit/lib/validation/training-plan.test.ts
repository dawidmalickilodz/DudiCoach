/// <reference types="vitest/globals" />

import { trainingPlanJsonSchema } from "@/lib/validation/training-plan";

function makeExercise(name: string) {
  return {
    name,
    sets: "4",
    reps: "8-10",
    intensity: "75% 1RM",
    rest: "90s",
    tempo: "3-1-2-0",
    notes: "Kontrola ruchu i techniki.",
  };
}

function makePlan() {
  return {
    planName: "Plan kompaktowy",
    phase: "base",
    summary: "Krotkie podsumowanie planu w kilku zdaniach.",
    weeklyOverview: "3 dni tygodniowo, progresja i deload w tygodniu 4.",
    weeks: [1, 2, 3, 4].map((weekNumber) => ({
      weekNumber,
      focus: `Krotki fokus tygodnia ${weekNumber}.`,
      days: [
        {
          dayNumber: 1,
          dayName: "Dzien A",
          warmup: "Mobilizacja bioder i barkow przez 5 minut.",
          exercises: [makeExercise("Przysiad ze sztanga")],
          cooldown: "Spokojny oddech i lekkie rozciaganie przez 5 minut.",
          duration: "60 min",
        },
      ],
    })),
    progressionNotes: "Zwieszaj ciezar stopniowo, tydzien 4 wykonaj lzej.",
    nutritionTips: "Kazdy posilek opieraj na bialku i regularnym nawodnieniu.",
    recoveryProtocol: "Srednio 8 godzin snu i jeden dzien lzejszej aktywnosci.",
  };
}

describe("trainingPlanJsonSchema compact contract", () => {
  it("accepts compact plan with up to 4 exercises per day", () => {
    const plan = makePlan();
    plan.weeks[0].days[0].exercises = [
      makeExercise("Przysiad"),
      makeExercise("Wyciskanie"),
      makeExercise("Wioslowanie"),
      makeExercise("Martwy ciag rumunski"),
    ];

    const result = trainingPlanJsonSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  it("rejects day with more than 4 exercises", () => {
    const plan = makePlan();
    plan.weeks[0].days[0].exercises = [
      makeExercise("Przysiad"),
      makeExercise("Wyciskanie"),
      makeExercise("Wioslowanie"),
      makeExercise("Martwy ciag rumunski"),
      makeExercise("Wykroki"),
    ];

    const result = trainingPlanJsonSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it("rejects overly long summary", () => {
    const plan = makePlan();
    plan.summary = "a".repeat(301);

    const result = trainingPlanJsonSchema.safeParse(plan);
    expect(result.success).toBe(false);
  });

  it("accepts descriptive fields at max boundaries", () => {
    const plan = makePlan();
    plan.summary = "s".repeat(300);
    plan.weeklyOverview = "w".repeat(320);
    plan.progressionNotes = "p".repeat(320);
    plan.nutritionTips = "n".repeat(240);
    plan.recoveryProtocol = "r".repeat(240);
    plan.weeks[0].focus = "f".repeat(160);
    plan.weeks[0].days[0].warmup = "u".repeat(160);
    plan.weeks[0].days[0].cooldown = "c".repeat(160);
    plan.weeks[0].days[0].exercises[0].notes = "x".repeat(160);

    const result = trainingPlanJsonSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });
});
