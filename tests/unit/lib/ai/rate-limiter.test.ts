/// <reference types="vitest/globals" />

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// The rate-limiter module holds its window state in module-level globals.
// Each test needs a fresh import to reset state, so we use dynamic imports
// inside individual tests and vi.resetModules() in beforeEach.
// ---------------------------------------------------------------------------

describe("checkRateLimit", () => {
  const originalRateLimitEnv = process.env.AI_RATE_LIMIT_PER_MIN;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (originalRateLimitEnv === undefined) {
      delete process.env.AI_RATE_LIMIT_PER_MIN;
    } else {
      process.env.AI_RATE_LIMIT_PER_MIN = originalRateLimitEnv;
    }
    vi.useRealTimers();
  });

  it("allows requests below the limit", async () => {
    const { checkRateLimit } = await import("@/lib/ai/rate-limiter");

    expect(checkRateLimit("coach-1").allowed).toBe(true);
    expect(checkRateLimit("coach-1").allowed).toBe(true);
    expect(checkRateLimit("coach-1").allowed).toBe(true);
  });

  it("blocks the 4th request inside the 1-minute window", async () => {
    const { checkRateLimit } = await import("@/lib/ai/rate-limiter");

    checkRateLimit("coach-1");
    checkRateLimit("coach-1");
    checkRateLimit("coach-1");

    const fourth = checkRateLimit("coach-1");
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
    expect(fourth.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("allows a new request after the window has passed", async () => {
    const { checkRateLimit } = await import("@/lib/ai/rate-limiter");

    vi.setSystemTime(new Date("2026-04-14T10:00:00Z"));
    checkRateLimit("coach-1");
    checkRateLimit("coach-1");
    checkRateLimit("coach-1");
    expect(checkRateLimit("coach-1").allowed).toBe(false);

    // Advance past the window
    vi.setSystemTime(new Date("2026-04-14T10:01:01Z"));
    expect(checkRateLimit("coach-1").allowed).toBe(true);
  });

  it("tracks each identifier independently", async () => {
    const { checkRateLimit } = await import("@/lib/ai/rate-limiter");

    checkRateLimit("coach-a");
    checkRateLimit("coach-a");
    checkRateLimit("coach-a");

    // coach-b still has full quota
    expect(checkRateLimit("coach-b").allowed).toBe(true);
    // coach-a is blocked
    expect(checkRateLimit("coach-a").allowed).toBe(false);
  });

  it("reports a retryAfterMs close to the remaining window time", async () => {
    const { checkRateLimit } = await import("@/lib/ai/rate-limiter");

    vi.setSystemTime(new Date("2026-04-14T10:00:00Z"));
    checkRateLimit("coach-1");
    checkRateLimit("coach-1");
    checkRateLimit("coach-1");

    // 30s elapsed → oldest request has ~30s until it falls out of the window
    vi.setSystemTime(new Date("2026-04-14T10:00:30Z"));
    const blocked = checkRateLimit("coach-1");
    expect(blocked.allowed).toBe(false);
    // retryAfterMs should be close to 30_000ms (+/- tolerance)
    expect(blocked.retryAfterMs).toBeGreaterThan(25_000);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(30_001);
  });

  it("falls back to default limit when AI_RATE_LIMIT_PER_MIN is invalid", async () => {
    process.env.AI_RATE_LIMIT_PER_MIN = "abc";
    const { checkRateLimit } = await import("@/lib/ai/rate-limiter");

    expect(checkRateLimit("coach-1").allowed).toBe(true);
    expect(checkRateLimit("coach-1").allowed).toBe(true);
    expect(checkRateLimit("coach-1").allowed).toBe(true);
    expect(checkRateLimit("coach-1").allowed).toBe(false);
  });

  it("uses configured limit when AI_RATE_LIMIT_PER_MIN is a valid positive number", async () => {
    process.env.AI_RATE_LIMIT_PER_MIN = "5";
    const { checkRateLimit } = await import("@/lib/ai/rate-limiter");

    expect(checkRateLimit("coach-1").allowed).toBe(true);
    expect(checkRateLimit("coach-1").allowed).toBe(true);
    expect(checkRateLimit("coach-1").allowed).toBe(true);
    expect(checkRateLimit("coach-1").allowed).toBe(true);
    expect(checkRateLimit("coach-1").allowed).toBe(true);
    expect(checkRateLimit("coach-1").allowed).toBe(false);
  });
});
