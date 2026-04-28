/// <reference types="vitest/globals" />

import { afterEach, beforeEach, vi } from "vitest";

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: vi.fn(),
    };

    constructor(_options: unknown) {}
  }

  return {
    default: MockAnthropic,
  };
});

const ORIGINAL_TIMEOUT = process.env.ANTHROPIC_TIMEOUT_MS;
const ORIGINAL_PLAN_MAX_TOKENS = process.env.ANTHROPIC_PLAN_MAX_TOKENS;
const ORIGINAL_API_KEY = process.env.ANTHROPIC_API_KEY;

async function importClientModule() {
  return import("@/lib/ai/client");
}

beforeEach(() => {
  vi.resetModules();
  process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
  delete process.env.ANTHROPIC_TIMEOUT_MS;
  delete process.env.ANTHROPIC_PLAN_MAX_TOKENS;
});

afterEach(() => {
  vi.resetModules();

  if (ORIGINAL_TIMEOUT === undefined) {
    delete process.env.ANTHROPIC_TIMEOUT_MS;
  } else {
    process.env.ANTHROPIC_TIMEOUT_MS = ORIGINAL_TIMEOUT;
  }

  if (ORIGINAL_PLAN_MAX_TOKENS === undefined) {
    delete process.env.ANTHROPIC_PLAN_MAX_TOKENS;
  } else {
    process.env.ANTHROPIC_PLAN_MAX_TOKENS = ORIGINAL_PLAN_MAX_TOKENS;
  }

  if (ORIGINAL_API_KEY === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = ORIGINAL_API_KEY;
  }
});

describe("lib/ai/client config", () => {
  it("uses conservative defaults when env overrides are missing", async () => {
    const mod = await importClientModule();

    expect(mod.ANTHROPIC_TIMEOUT_MS).toBe(55_000);
    expect(mod.PLAN_MAX_TOKENS).toBe(3_000);
  });

  it("respects valid ANTHROPIC_TIMEOUT_MS and ANTHROPIC_PLAN_MAX_TOKENS values", async () => {
    process.env.ANTHROPIC_TIMEOUT_MS = "75000";
    process.env.ANTHROPIC_PLAN_MAX_TOKENS = "2500";

    const mod = await importClientModule();

    expect(mod.ANTHROPIC_TIMEOUT_MS).toBe(75_000);
    expect(mod.PLAN_MAX_TOKENS).toBe(2_500);
  });

  it("falls back to defaults for invalid or out-of-range env values", async () => {
    process.env.ANTHROPIC_TIMEOUT_MS = "abc";
    process.env.ANTHROPIC_PLAN_MAX_TOKENS = "99999";

    const mod = await importClientModule();

    expect(mod.ANTHROPIC_TIMEOUT_MS).toBe(55_000);
    expect(mod.PLAN_MAX_TOKENS).toBe(3_000);
  });
});
