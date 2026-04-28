import {
  trainingPlanJsonSchema,
  type TrainingPlanJson,
} from "@/lib/validation/training-plan";
import { z } from "zod";

// ---------------------------------------------------------------------------
// JSON extraction from Claude response
//
// Claude sometimes wraps JSON in markdown code fences or prefixes it with
// explanatory text despite instructions. This parser handles three cases:
//
//   1. Clean JSON (fast path — starts with '{')
//   2. Markdown fenced: ```json ... ``` or ``` ... ```
//   3. Embedded JSON — find first '{' and last '}'
// ---------------------------------------------------------------------------

function extractJsonString(raw: string): string {
  const trimmed = raw.trim();

  // Fast path: response already starts with '{'
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }

  // Find outermost braces
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("No JSON object found in Claude response");
}

/**
 * Parse and validate Claude's raw response into a TrainingPlanJson object.
 *
 * Throws if:
 *  - No JSON object can be extracted from the text
 *  - The extracted string is not valid JSON
 *  - The parsed object does not conform to the TrainingPlanJson schema
 *
 * Parse/validation failures are NOT retryable — they are deterministic for a
 * given prompt and retrying would waste API quota.
 */
export function parseJsonWithSchema<T>(
  raw: string,
  schema: z.ZodType<T>,
  entityLabel = "Claude response",
): T {
  const jsonString = extractJsonString(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse JSON from ${entityLabel}: ${message}`);
  }

  return schema.parse(parsed);
}

export function parsePlanJson(raw: string): TrainingPlanJson {
  return parseJsonWithSchema(raw, trainingPlanJsonSchema, "Claude response");
}
