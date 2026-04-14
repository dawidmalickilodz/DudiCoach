---
id: ADR-0001
title: Auto-save pattern using react-hook-form watch + TanStack Query mutation
status: proposed
date: 2026-04-13
decision_makers: [architect]
related_stories: [US-003]
---

# ADR-0001 — Auto-save pattern using react-hook-form watch + TanStack Query mutation

## Context

US-003 requires auto-save on every form field change with 800ms debounce. The project rules
(CLAUDE.md) mandate "no Save buttons anywhere" and "debounced mutations (600-800ms) with
optimistic UI and toast". We need a reusable pattern because future stories (US-010 through
US-018) will all use auto-save as well.

Key constraints:
- Must work with react-hook-form (project stack)
- Must use TanStack Query for mutations (project stack)
- Must show "Zapisano" toast that disappears after 1.5s
- Must handle concurrent rapid edits (last-write-wins)
- Must handle network errors gracefully

## Options Considered

### Option A: form.watch() + useEffect + setTimeout debounce + useMutation

Use react-hook-form's `watch()` to observe all field changes, debounce with a plain
`setTimeout` in a `useEffect`, then fire a TanStack Query `useMutation`. On success,
show toast; on error, show error state. No optimistic update on the query cache because
the form itself IS the optimistic state (user sees their own edits immediately).

Pros: Simple, predictable, easy to test, no extra dependencies.
Cons: Manual debounce logic (but trivial).

### Option B: onBlur-based save

Save only when user leaves a field (onBlur event).

Pros: Fewer API calls.
Cons: Violates the spec requirement of 800ms debounce. User might close tab before
blur fires. Does not feel "auto-save" — feels like traditional forms.

### Option C: Zustand middleware for form state + auto-save

Store form state in Zustand, sync with react-hook-form, debounce from Zustand.

Pros: Centralized state.
Cons: Duplicates state (form + Zustand), unnecessary complexity, violates project
rule "Zustand only for transient UI state."

## Decision

**Option A** — `watch()` + `useEffect` + `setTimeout` debounce + `useMutation`.

The custom hook `useAutoSave` will:
1. Accept `{ watch, formState, mutationFn, debounceMs }` parameters
2. Watch form values via react-hook-form `watch()`
3. Skip saves when `formState.isDirty === false` or validation errors exist
4. Debounce changes with `setTimeout` (800ms default)
5. Call `useMutation.mutateAsync()` with the full form payload
6. On success: invalidate the relevant TanStack Query cache + show toast
7. On error: set form error via `setError("root", ...)`
8. Return `{ isSaving, lastSavedAt }` for UI feedback

This keeps the form itself as the source of truth for optimistic state. The query cache
is only invalidated (not optimistically updated) because we PATCH the full profile and
the returned data replaces the cache entry.

## Consequences

- Every auto-save form in the app will use this same hook (US-010, US-011, etc.)
- Network errors need a retry strategy; we rely on TanStack Query's built-in retry (1 retry)
- If user navigates away during a pending save, we accept potential data loss for the
  last sub-800ms edit window. A `beforeunload` warning is NOT added (spec does not require it)
- The hook must be unit-testable with fake timers (Vitest)

## Status

Proposed
