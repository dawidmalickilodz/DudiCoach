import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Anthropic SDK singleton — one instance per Node.js process.
// Timeout is 120s total to avoid production timeouts on first-plan generation.
// Model defaults to claude-sonnet-4-6; override via ANTHROPIC_MODEL env var.
// ---------------------------------------------------------------------------

export const ANTHROPIC_TIMEOUT_MS = 120_000;
export const PLAN_MAX_TOKENS = 8000;

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
