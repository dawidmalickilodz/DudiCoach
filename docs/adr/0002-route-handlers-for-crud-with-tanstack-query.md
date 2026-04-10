---
id: ADR-0002
title: Route Handlers for CRUD endpoints consumed by TanStack Query
status: Accepted
date: 2026-04-10
author: architect
supersedes: []
superseded_by: []
related_stories:
  - US-002
  - US-003
---

# ADR-0002 — Route Handlers for CRUD endpoints consumed by TanStack Query

## Status

Accepted (2026-04-10)

## Context

ADR-0001 establishes Server Actions as the default mutation surface for DudiCoach. US-002 introduces the first CRUD resource (athletes) and US-003 consumes it from the frontend using TanStack Query with auto-save debounce and optimistic updates.

The auto-save pattern in US-003 works as follows:

1. The coach edits a form field (e.g., weight).
2. A `useAutoSave` hook debounces changes (800ms).
3. After the debounce, the hook calls `mutate()` on a TanStack Query `useMutation`.
4. The mutation function calls `fetch("PATCH /api/athletes/[id]", { body })`.
5. TanStack Query manages optimistic cache updates (`onMutate`), error rollback (`onError`), and cache invalidation (`onSettled`).
6. A toast ("Zapisano") appears on success.

This pattern is fundamentally different from the form-submission pattern that Server Actions are optimized for. The tension requires a clear decision.

## Decision

**CRUD endpoints consumed by TanStack Query's `useMutation`/`useQuery` use Route Handlers, not Server Actions.** This is a documented exception to ADR-0001.

The boundary is precise:

- **Route Handlers** when the consumer is `useQuery` (GET) or `useMutation` (POST/PATCH/DELETE) from TanStack Query, typically in auto-save or data-fetching patterns.
- **Server Actions** when the consumer is a `<form action={...}>` or `startTransition(() => action(...))`, typically in one-shot form submissions (login, logout, settings).

### Justification

1. **TanStack Query is designed around `fetch()`.** Its `queryFn` and `mutationFn` expect async functions that return data from HTTP endpoints. Wrapping a Server Action inside a `mutationFn` is possible but requires an adapter that loses type safety on the response (Server Actions return `ActionResult` discriminated unions, not the raw data TanStack Query expects) and prevents TanStack Query from inspecting HTTP status codes for its retry logic.

2. **Auto-save calls mutations imperatively, not from form events.** The `useAutoSave` hook calls `mutate()` from a `useEffect` triggered by form value changes after a debounce. Server Actions are designed to be called from `<form action>` or `startTransition` -- calling them from `useEffect` is an anti-pattern that bypasses the framework's transition tracking and can cause unexpected re-renders.

3. **PATCH semantics require HTTP method distinction.** Server Actions are always POST. A partial-update operation is naturally a PATCH. With Route Handlers, the HTTP method conveys intent. With Server Actions, you would need to encode the operation type ("create" vs "update" vs "delete") in the payload, adding complexity.

4. **Cache invalidation is cleaner.** TanStack Query invalidates caches by query key (e.g., `["athletes"]`). With Route Handlers, the mutation's `onSettled` callback calls `queryClient.invalidateQueries({ queryKey: ["athletes"] })` and the refetch hits the same `GET /api/athletes` endpoint. With Server Actions, you would need to call `revalidatePath` or `revalidateTag` -- a different cache system entirely -- and coordinate between Next.js's cache and TanStack Query's cache, leading to double-caching bugs.

5. **The exception is narrow.** It applies only to resource CRUD endpoints that TanStack Query consumes. The number of affected stories is bounded: athlete CRUD (US-002), plan CRUD, progression CRUD, and possibly test/injury sub-resources. Form-based mutations (auth, settings) remain Server Actions.

## Consequences

### Positive

- TanStack Query works naturally with its designed API surface (fetch-based queries and mutations).
- Auto-save with debounce and optimistic updates requires no awkward wrappers.
- HTTP semantics (GET/POST/PATCH/DELETE) convey operation intent clearly.
- No double-caching between Next.js server cache and TanStack Query client cache.
- Route Handlers are testable via standard HTTP test utilities.

### Negative

- Two mutation patterns in the codebase (Server Actions for auth, Route Handlers for CRUD). Developers must know which to use. Mitigation: this ADR plus each story's design doc specify the pattern.
- Slightly more boilerplate per endpoint (explicit `NextResponse.json()` serialization, manual status codes). Acceptable for the clarity gained.
- Route Handler auth check is manual (`getUser()` at the top of each handler) rather than automatic via the Server Action cookie flow. Mitigation: consistent pattern documented in US-002 design doc; consider a shared `withAuth` wrapper if the pattern repeats more than 5 times.

### Neutral

- AI plan generation (future story) will also use a Route Handler, but for a different reason (SSE streaming). That falls under ADR-0001 exception #3, not this ADR.
- If a future story introduces a form-based CRUD operation (not auto-save), it should use Server Actions per ADR-0001, not Route Handlers per this ADR.

## Compliance

Every PR introducing a CRUD endpoint must either:

- **Use Route Handlers** and reference this ADR in the PR description, confirming the endpoint is consumed by TanStack Query, or
- **Use Server Actions** per ADR-0001 and explain why TanStack Query is not the consumer.

The `code-reviewer` agent enforces this convention during review.
