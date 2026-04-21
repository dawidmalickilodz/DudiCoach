/**
 * Training experience bucket definitions.
 *
 * Maps between the three UX buckets shown in the "Staż treningowy" select
 * and the ISO date stored in `athletes.training_start_date`.
 *
 * Bucket → Date (dateFromBucket):
 *   lessThan1Year  → today - 3 months   (beginner range; 3 months maps to ~Początkujący)
 *   oneToTwoYears  → today - 18 months  (midpoint of 12-23 month intermediate range)
 *   moreThan2Years → today - 36 months  (safely inside the 24-48 month advanced range)
 *
 * Date → Bucket (bucketFromDate):
 *   0–11 months  → lessThan1Year
 *   12–23 months → oneToTwoYears
 *   24+ months   → moreThan2Years
 *
 * Natural aging: a date saved as "-3 months" ages in the DB over time.
 * After 9 more months it becomes "-12 months" → oneToTwoYears bucket.
 * This is intentional — the athlete has genuinely gained experience.
 *
 * Display labels live in pl.ts under pl.coach.athlete.trainingSeniority.
 */

export const TRAINING_EXPERIENCE_BUCKETS = [
  "lessThan1Year",
  "oneToTwoYears",
  "moreThan2Years",
] as const;

export type TrainingExperienceBucket =
  (typeof TRAINING_EXPERIENCE_BUCKETS)[number];

/**
 * Returns a synthetic ISO date string for the given bucket.
 *
 * @param bucket - The training experience bucket.
 * @param today  - Injectable "now" for testing (defaults to `new Date()`).
 */
export function dateFromBucket(
  bucket: TrainingExperienceBucket,
  today: Date = new Date(),
): string {
  const d = new Date(today);
  switch (bucket) {
    case "lessThan1Year":
      d.setMonth(d.getMonth() - 3);
      break;
    case "oneToTwoYears":
      d.setMonth(d.getMonth() - 18);
      break;
    case "moreThan2Years":
      d.setMonth(d.getMonth() - 36);
      break;
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Reverse-maps an ISO date string to a training experience bucket.
 * Returns null when the date is null, undefined, or empty.
 */
export function bucketFromDate(
  isoDate: string | null | undefined,
): TrainingExperienceBucket | null {
  if (!isoDate) return null;
  const start = new Date(isoDate);
  const now = new Date();
  const months = Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth()),
  );
  if (months < 12) return "lessThan1Year";
  if (months < 24) return "oneToTwoYears";
  return "moreThan2Years";
}
