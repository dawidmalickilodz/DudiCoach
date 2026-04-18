/**
 * Share code validation helpers used by athlete public access flow.
 *
 * Format contract:
 * - exactly 6 chars
 * - uppercase letters excluding ambiguous I and O
 * - digits 2-9 (excluding 0 and 1)
 */
export const SHARE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

/**
 * Normalizes user-entered share code:
 * - uppercases
 * - removes all whitespace
 */
export function normalizeShareCode(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "");
}

/**
 * Checks whether a share code matches the expected format.
 */
export function isShareCodeFormatValid(value: string): boolean {
  return SHARE_CODE_REGEX.test(value);
}
