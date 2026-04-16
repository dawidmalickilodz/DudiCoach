"use client";

import { useRouter } from "next/navigation";

import { pl } from "@/lib/i18n/pl";
import type { Athlete } from "@/lib/api/athletes";
import { cn } from "@/lib/utils";
import LevelBadge from "./LevelBadge";

interface AthleteCardProps {
  athlete: Athlete;
}

export default function AthleteCard({ athlete }: AthleteCardProps) {
  const router = useRouter();

  const sportKey = athlete.sport as keyof typeof pl.coach.athlete.sport | null;
  const sportLabel =
    sportKey && sportKey in pl.coach.athlete.sport
      ? pl.coach.athlete.sport[sportKey]
      : athlete.sport;

  function handleClick() {
    router.push(`/athletes/${athlete.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={athlete.name}
      className={cn(
        "bg-card border-border rounded-card border p-5",
        "cursor-pointer transition-colors hover:border-primary/50",
        "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2",
      )}
    >
      {/* Name */}
      <h3 className="text-foreground mb-3 text-base font-semibold leading-snug">
        {athlete.name}
      </h3>

      {/* Details row */}
      <div className="text-muted-foreground mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {athlete.age !== null && (
          <span>
            {pl.coach.athlete.profile.age}: {athlete.age}
          </span>
        )}
        {sportLabel && (
          <span>
            {pl.coach.athlete.profile.sport}: {sportLabel}
          </span>
        )}
      </div>

      {/* Level badge */}
      <LevelBadge trainingStartDate={athlete.training_start_date} />
    </div>
  );
}

