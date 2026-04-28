import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Anthropic SDK singleton - one instance per Node.js process.
// Conservative defaults keep synchronous generation within common serverless
// execution budgets. Timeout/tokens can be overridden via environment.
// Model defaults to claude-sonnet-4-6; override via ANTHROPIC_MODEL env var.
// ---------------------------------------------------------------------------

const DEFAULT_ANTHROPIC_TIMEOUT_MS = 55_000;
const MIN_ANTHROPIC_TIMEOUT_MS = 10_000;
const MAX_ANTHROPIC_TIMEOUT_MS = 180_000;

const DEFAULT_PLAN_MAX_TOKENS = 3_000;
const MIN_PLAN_MAX_TOKENS = 500;
const MAX_PLAN_MAX_TOKENS = 8_000;

function readIntFromEnv(
  value: string | undefined,
  {
    min,
    max,
    fallback,
  }: { min: number; max: number; fallback: number },
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
}

function readAnthropicTimeoutMsFromEnv(): number {
  return readIntFromEnv(process.env.ANTHROPIC_TIMEOUT_MS, {
    min: MIN_ANTHROPIC_TIMEOUT_MS,
    max: MAX_ANTHROPIC_TIMEOUT_MS,
    fallback: DEFAULT_ANTHROPIC_TIMEOUT_MS,
  });
}

function readPlanMaxTokensFromEnv(): number {
  return readIntFromEnv(process.env.ANTHROPIC_PLAN_MAX_TOKENS, {
    min: MIN_PLAN_MAX_TOKENS,
    max: MAX_PLAN_MAX_TOKENS,
    fallback: DEFAULT_PLAN_MAX_TOKENS,
  });
}

export const ANTHROPIC_TIMEOUT_MS = readAnthropicTimeoutMsFromEnv();
export const PLAN_MAX_TOKENS = readPlanMaxTokensFromEnv();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: ANTHROPIC_TIMEOUT_MS,
});

export const MODEL =
  (process.env.ANTHROPIC_MODEL as string | undefined) ?? "claude-sonnet-4-6";

export interface GeneratePlanParams {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Call Claude to generate a training plan.
 *
 * The system prompt is sent with `cache_control: { type: 'ephemeral' }` so that
 * repeated calls with the same system prompt hit the prompt cache and reduce cost.
 *
 * Returns the raw text content from Claude. Callers are responsible for JSON
 * extraction and validation.
 *
 * Throws:
 *  - `Anthropic.APIConnectionTimeoutError` when timeout is exceeded
 *  - `Anthropic.APIError` for HTTP-level errors from the Anthropic API
 *  - `Error` if the response contains no text block
 */
export async function generatePlan(params: GeneratePlanParams): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: PLAN_MAX_TOKENS,
    temperature: 0.7,
    system: [
      {
        type: "text",
        text: params.systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: params.userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  return textBlock.text;
}
