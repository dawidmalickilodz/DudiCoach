/**
 * normalize-api-error — safe client-side error message extractor.
 *
 * Always returns the caller-supplied `fallback` string, which must be a
 * user-safe string from pl.ts. Never exposes raw Error messages, stack
 * traces, or server-detail strings to the UI layer.
 *
 * The component layer owns the user-facing copy (via pl.ts).
 * This helper enforces that nothing raw escapes to the user.
 *
 * @param _error  - The caught value (any shape: Error, string, null, etc.)
 * @param fallback - A user-safe string from pl.ts to display on any error.
 * @returns        Always returns `fallback`.
 */
export function normalizeApiError(_error: unknown, fallback: string): string {
  return fallback;
}
