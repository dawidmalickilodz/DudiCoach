/**
 * Formats a plan's created_at ISO timestamp into "DD.MM.YYYY HH:MM" format.
 * Used in PlanListItem.
 */
export function formatPlanDate(isoString: string): string {
  const date = new Date(isoString);

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}
