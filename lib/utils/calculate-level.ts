import type { AthleteLevelInfo } from "@/lib/types/athlete";

const MONTH = 1000 * 60 * 60 * 24 * 30.4375;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateLevel(startDate: string | null): AthleteLevelInfo {
  if (!startDate) {
    return { key: "beginner", months: 0, progressPct: 0 };
  }

  const startedAt = new Date(startDate);
  if (Number.isNaN(startedAt.getTime())) {
    return { key: "beginner", months: 0, progressPct: 0 };
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - startedAt.getTime());
  const months = diffMs / MONTH;

  if (months < 6) {
    return {
      key: "beginner",
      months,
      progressPct: clamp((months / 6) * 100, 0, 100),
    };
  }

  if (months < 18) {
    return {
      key: "intermediate",
      months,
      progressPct: clamp(((months - 6) / 12) * 100, 0, 100),
    };
  }

  if (months < 48) {
    return {
      key: "advanced",
      months,
      progressPct: clamp(((months - 18) / 30) * 100, 0, 100),
    };
  }

  return {
    key: "elite",
    months,
    progressPct: 100,
  };
}

