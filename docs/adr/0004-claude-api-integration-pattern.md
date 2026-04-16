---
id: ADR-0001
title: Claude API Integration Pattern
status: accepted
date: 2026-04-13
decision_makers: [architect]
story_refs: [US-005]
---

# ADR-0001: Claude API Integration Pattern

## Context

US-005 introduces AI plan generation via the Anthropic Claude API. This is the
first AI integration in DudiCoach and establishes the pattern for all future AI
features (e.g., exercise recommendations, plan adjustments).

Key constraints:
- Single-coach application (one user generating plans)
- Claude API calls are expensive (~$0.003-0.015 per plan generation)
- Response time can reach 30-60 seconds for long outputs
- Claude sometimes wraps JSON in markdown despite instructions
- CLAUDE.md mandates prompt caching for large static context

We need to decide on the architecture for calling Claude from Next.js route
handlers.

## Decision

### Architecture: Server-Side Proxy Pattern

All Claude API calls go through Next.js API route handlers. The frontend never
calls Claude directly. This provides:
1. API key protection (never exposed to client)
2. Server-side rate limiting
3. Response validation before storage
4. Consistent error handling

### Module Structure

```
lib/ai/
  client.ts           -- Thin wrapper around @anthropic-ai/sdk
  rate-limiter.ts     -- In-memory sliding window rate limiter
  parse-plan-json.ts  -- JSON extraction from potentially-markdown response
  prompts/
    plan-generation.ts -- System + user prompt builders for training plans
    (future: other prompt files per AI feature)
```

### Key Patterns

1. **SDK Client Singleton**: One `Anthropic` instance per process, created at
   module scope with `ANTHROPIC_API_KEY` from env and 60s timeout.

2. **Prompt Caching**: System prompts use `cache_control: { type: 'ephemeral' }`
   for large static content. This reduces cost by ~90% on cache hits since the
   system prompt contains training methodology rules that are identical across
   requests.

3. **Structured Output via JSON Mode**: The system prompt instructs Claude to
   respond with pure JSON. A defensive parser strips markdown fences or
   surrounding text if Claude does not comply. All responses are validated
   against a zod schema before storage.

4. **Retry with Discrimination**: Retry once on transient HTTP errors
   (500/502/503/529) and network failures. Never retry on 400-level errors or
   parse failures (deterministic -- retrying wastes quota).

5. **In-Memory Rate Limiting**: Sliding window (3 requests per 60 seconds per
   user ID). Acceptable for single-coach app. Not shared across Vercel
   serverless instances, but a single user will typically hit the same warm
   instance.

6. **Timeout Propagation**: The SDK client timeout (60s) handles the total
   request timeout. The frontend shows a spinner with progress hint. If timeout
   occurs, the SDK throws `APIConnectionTimeoutError` which the route handler
   catches and returns as 504.

## Consequences

### Positive
- API key never leaves the server
- Consistent error handling for all AI features
- Prompt caching reduces cost significantly
- Defensive JSON parsing handles Claude's occasional markdown wrapping
- Rate limiting prevents accidental cost overruns

### Negative
- In-memory rate limiter resets on cold start (acceptable for single-user)
- 60s timeout is long for a web request (mitigated by good frontend UX with
  spinner and cancel)
- Each AI feature requires a new prompt file (intentional -- keeps prompts
  focused and testable)

### Neutral
- Future AI features follow the same pattern: add prompt file, add route handler,
  reuse client + parser + rate limiter
- If we need multi-tenant rate limiting in the future, replace in-memory with
  Supabase table or Vercel KV

## Alternatives Considered

### 1. Direct Client-Side SDK Call
Rejected: exposes API key, no server-side validation, no rate limiting.

### 2. Edge Function (Vercel Edge Runtime)
Rejected: @anthropic-ai/sdk relies on Node.js APIs. Edge runtime has limited
compatibility. Standard Node.js runtime is simpler and sufficient.

### 3. Supabase Edge Function (Deno)
Rejected: adds infrastructure complexity. We already have Next.js route handlers
which can call the Anthropic SDK directly. No benefit for single-tenant.

### 4. Streaming Response
Considered for future: streaming would improve perceived latency by showing
tokens as they arrive. Deferred because plan generation returns structured JSON
that needs to be complete before parsing. Streaming JSON is complex and
error-prone. Can revisit for free-text AI features.
