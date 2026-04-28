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

export interface PlanGenerationMetadata {
  mode: "text" | "repair" | "structured_tool";
  stopReason: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  textLength: number | null;
  toolInputLength: number | null;
}

export interface GeneratePlanWithMetadataResult {
  text: string;
  metadata: PlanGenerationMetadata;
}

interface ExtractedTextBlock {
  type: "text";
  text: string;
}

const PLAN_OUTPUT_TOOL_NAME = "submit_training_plan";
const PLAN_HEADER_TOOL_NAME = "submit_training_plan_header";
const PLAN_WEEK_TOOL_NAME = "submit_training_plan_week";

const TRAINING_PLAN_TOOL_SCHEMA: Anthropic.Messages.Tool["input_schema"] = {
  type: "object",
  additionalProperties: false,
  properties: {
    planName: { type: "string" },
    phase: { type: "string" },
    summary: { type: "string" },
    weeklyOverview: { type: "string" },
    weeks: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          weekNumber: { type: "integer", minimum: 1, maximum: 4 },
          focus: { type: "string" },
          days: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                dayNumber: { type: "integer", minimum: 1, maximum: 7 },
                dayName: { type: "string" },
                warmup: { type: "string" },
                exercises: {
                  type: "array",
                  minItems: 1,
                  maxItems: 4,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      name: { type: "string" },
                      sets: { type: "string" },
                      reps: { type: "string" },
                      intensity: { type: "string" },
                      rest: { type: "string" },
                      tempo: { type: "string" },
                      notes: { type: "string" },
                    },
                    required: [
                      "name",
                      "sets",
                      "reps",
                      "intensity",
                      "rest",
                      "tempo",
                      "notes",
                    ],
                  },
                },
                cooldown: { type: "string" },
                duration: { type: "string" },
              },
              required: [
                "dayNumber",
                "dayName",
                "warmup",
                "exercises",
                "cooldown",
                "duration",
              ],
            },
          },
        },
        required: ["weekNumber", "focus", "days"],
      },
    },
    progressionNotes: { type: "string" },
    nutritionTips: { type: "string" },
    recoveryProtocol: { type: "string" },
  },
  required: [
    "planName",
    "phase",
    "summary",
    "weeklyOverview",
    "weeks",
    "progressionNotes",
    "nutritionTips",
    "recoveryProtocol",
  ],
};

const TRAINING_PLAN_HEADER_TOOL_SCHEMA: Anthropic.Messages.Tool["input_schema"] = {
  type: "object",
  additionalProperties: false,
  properties: {
    planName: { type: "string" },
    phase: { type: "string" },
    summary: { type: "string" },
    weeklyOverview: { type: "string" },
    progressionNotes: { type: "string" },
    nutritionTips: { type: "string" },
    recoveryProtocol: { type: "string" },
  },
  required: [
    "planName",
    "phase",
    "summary",
    "weeklyOverview",
    "progressionNotes",
    "nutritionTips",
    "recoveryProtocol",
  ],
};

const TRAINING_PLAN_WEEK_TOOL_SCHEMA: Anthropic.Messages.Tool["input_schema"] = {
  type: "object",
  additionalProperties: false,
  properties: {
    weekNumber: { type: "integer", minimum: 1, maximum: 4 },
    focus: { type: "string" },
    days: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          dayNumber: { type: "integer", minimum: 1, maximum: 7 },
          dayName: { type: "string" },
          warmup: { type: "string" },
          exercises: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                sets: { type: "string" },
                reps: { type: "string" },
                intensity: { type: "string" },
                rest: { type: "string" },
                tempo: { type: "string" },
                notes: { type: "string" },
              },
              required: [
                "name",
                "sets",
                "reps",
                "intensity",
                "rest",
                "tempo",
                "notes",
              ],
            },
          },
          cooldown: { type: "string" },
          duration: { type: "string" },
        },
        required: [
          "dayNumber",
          "dayName",
          "warmup",
          "exercises",
          "cooldown",
          "duration",
        ],
      },
    },
  },
  required: ["weekNumber", "focus", "days"],
};

const PLAN_OUTPUT_TOOL: Anthropic.Messages.Tool = {
  name: PLAN_OUTPUT_TOOL_NAME,
  description:
    "Submit the final full training plan as one JSON object following the required schema.",
  input_schema: TRAINING_PLAN_TOOL_SCHEMA,
  strict: true,
  type: "custom",
};

const PLAN_HEADER_TOOL: Anthropic.Messages.Tool = {
  name: PLAN_HEADER_TOOL_NAME,
  description:
    "Submit the training plan header fields only (no weeks array).",
  input_schema: TRAINING_PLAN_HEADER_TOOL_SCHEMA,
  strict: true,
  type: "custom",
};

const PLAN_WEEK_TOOL: Anthropic.Messages.Tool = {
  name: PLAN_WEEK_TOOL_NAME,
  description:
    "Submit exactly one training week object for the requested week number.",
  input_schema: TRAINING_PLAN_WEEK_TOOL_SCHEMA,
  strict: true,
  type: "custom",
};

type ToolUseBlock = Extract<Anthropic.Messages.ContentBlock, { type: "tool_use" }>;

function toMetadata(
  response: Anthropic.Messages.Message,
  mode: PlanGenerationMetadata["mode"],
  {
    text,
    toolInput,
  }: {
    text?: string | null;
    toolInput?: unknown;
  } = {},
): PlanGenerationMetadata {
  const textLength = typeof text === "string" ? text.length : null;
  const toolInputLength =
    toolInput == null ? null : JSON.stringify(toolInput).length;

  return {
    mode,
    stopReason: response.stop_reason ?? null,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
    textLength,
    toolInputLength,
  };
}

function extractTextFromResponse(response: Anthropic.Messages.Message): string {
  const textBlock = response.content.find((b) => b.type === "text") as
    | ExtractedTextBlock
    | undefined;
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  return textBlock.text;
}

function extractToolInputFromResponse(
  response: Anthropic.Messages.Message,
  toolName: string,
): unknown {
  const toolUse = response.content.find(
    (block): block is ToolUseBlock =>
      block.type === "tool_use" && block.name === toolName,
  );
  if (!toolUse) {
    throw new Error(`No structured tool output in Claude response (${toolName})`);
  }
  return toolUse.input;
}

async function generateStructuredWithTool(
  params: GeneratePlanParams,
  {
    tool,
    toolName,
  }: {
    tool: Anthropic.Messages.Tool;
    toolName: string;
  },
): Promise<{ output: unknown; metadata: PlanGenerationMetadata }> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: PLAN_MAX_TOKENS,
    temperature: 0,
    system: [
      {
        type: "text",
        text: params.systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: params.userPrompt }],
    tools: [tool],
    tool_choice: {
      type: "tool",
      name: toolName,
      disable_parallel_tool_use: true,
    },
  });

  const output = extractToolInputFromResponse(response, toolName);
  return {
    output,
    metadata: toMetadata(response, "structured_tool", { toolInput: output }),
  };
}

export async function generatePlanStructured(
  params: GeneratePlanParams,
): Promise<{ plan: unknown; metadata: PlanGenerationMetadata }> {
  const { output: plan, metadata } = await generateStructuredWithTool(params, {
    tool: PLAN_OUTPUT_TOOL,
    toolName: PLAN_OUTPUT_TOOL_NAME,
  });
  return {
    plan,
    metadata,
  };
}

export async function generatePlanHeaderStructured(
  params: GeneratePlanParams,
): Promise<{ header: unknown; metadata: PlanGenerationMetadata }> {
  const { output: header, metadata } = await generateStructuredWithTool(params, {
    tool: PLAN_HEADER_TOOL,
    toolName: PLAN_HEADER_TOOL_NAME,
  });
  return {
    header,
    metadata,
  };
}

export async function generatePlanWeekStructured(
  params: GeneratePlanParams,
): Promise<{ week: unknown; metadata: PlanGenerationMetadata }> {
  const { output: week, metadata } = await generateStructuredWithTool(params, {
    tool: PLAN_WEEK_TOOL,
    toolName: PLAN_WEEK_TOOL_NAME,
  });
  return {
    week,
    metadata,
  };
}

export async function generatePlanWithMetadata(
  params: GeneratePlanParams,
): Promise<GeneratePlanWithMetadataResult> {
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

  const text = extractTextFromResponse(response);
  return {
    text,
    metadata: toMetadata(response, "text", { text }),
  };
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
  const result = await generatePlanWithMetadata(params);
  return result.text;
}

/**
 * Attempt a single JSON repair pass for malformed plan output.
 *
 * Used only after parse failure in async worker flow. Keeps schema validation
 * strict: callers must still parse and validate the repaired output.
 */
export async function repairPlanJson(rawPlanText: string): Promise<string> {
  const result = await repairPlanJsonWithMetadata(rawPlanText);
  return result.text;
}

export async function repairPlanJsonWithMetadata(
  rawPlanText: string,
): Promise<GeneratePlanWithMetadataResult> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: PLAN_MAX_TOKENS,
    temperature: 0,
    system: [
      {
        type: "text",
        text: "You repair malformed training-plan JSON. Return ONLY valid minified JSON object, no markdown, no backticks, no prose.",
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Fix this malformed JSON so it becomes valid JSON matching the same training plan schema.",
              "Do not add commentary. Return JSON object only.",
              "MALFORMED_JSON_START",
              rawPlanText,
              "MALFORMED_JSON_END",
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const text = extractTextFromResponse(response);
  return {
    text,
    metadata: toMetadata(response, "repair", { text }),
  };
}
