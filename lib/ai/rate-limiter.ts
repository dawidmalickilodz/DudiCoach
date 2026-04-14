// ---------------------------------------------------------------------------
// In-memory sliding window rate limiter
//
// Design: single-coach app → one Node.js process; in-memory is sufficient.
// If the process cold-starts the window resets — acceptable for cost protection.
// See: docs/design/US-005-design.md §7, ADR-0001 §In-Memory Rate Limiting
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS =
  process.env.AI_RATE_LIMIT_PER_MIN != null
    ? parseInt(process.env.AI_RATE_LIMIT_PER_MIN, 10)
    : 3;

// Map<identifier, timestamp[]>
const windows = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until the oldest request falls out of the window. */
  retryAfterMs?: number;
}

/**
 * Check and record a request from `identifier` (coach user ID).
 *
 * Side-effect: if the request is allowed, appends `Date.now()` to the
 * window for this identifier. Stale entries (older than WINDOW_MS) are
 * pruned on each call to prevent unbounded memory growth.
 */
export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();

  // Prune timestamps that have fallen outside the current window
  const timestamps = (windows.get(identifier) ?? []).filter(
    (t) => t > now - WINDOW_MS,
  );

  if (timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = timestamps[0];
    return {
      allowed: false,
      retryAfterMs: oldestInWindow + WINDOW_MS - now,
    };
  }

  timestamps.push(now);
  windows.set(identifier, timestamps);
  return { allowed: true };
}
