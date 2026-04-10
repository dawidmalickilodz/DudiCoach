---
id: ADR-0001
title: Server Actions as the default mutation surface
status: Accepted
date: 2026-04-09
author: architect
supersedes: []
superseded_by: []
related_stories:
  - US-001
---

# ADR-0001 — Server Actions as the default mutation surface

## Status

Accepted (2026-04-09)

## Context

DudiCoach is a Next.js 16.2.3 App Router application with a single first-party client (the web UI itself). Every mutation in the foreseeable backlog — coach login, athlete CRUD, plan editing, progressions, AI plan generation, share-code rotation — originates from a form or button inside our own UI. There is no public REST or GraphQL surface, no mobile app, and no third-party integration that needs to call our backend.

Next.js gives us two equivalent ways to perform mutations against Supabase from the server:

1. **Server Actions** — async functions tagged `"use server"`, called directly from Client Components via `<form action={...}>` or `startTransition(() => action(...))`. They run on the server, can read/write cookies, and can call `redirect()` from `next/navigation`.
2. **Route Handlers** — `app/api/<path>/route.ts` files exporting `POST`, `PUT`, `DELETE`, etc. They are HTTP endpoints; the client must `fetch()` them and parse JSON responses.

US-001 (coach login) is the first story that needs a mutation surface. Without an explicit decision, every future story will re-debate this point and the codebase will end up with both patterns scattered through it. This ADR locks in a single default.

## Decision

**Server Actions are the default mutation surface for all features in DudiCoach.**

Specifically:

1. **Default to Server Actions** for any mutation initiated by our own UI: form submissions, button clicks, optimistic updates, auto-save flows.
2. **Server Actions live next to the page or component that calls them**, in a sibling `actions.ts` file (e.g. `app/(coach)/login/actions.ts`, `app/(coach)/athletes/[id]/actions.ts`). For shared actions, place them under `lib/actions/<domain>.ts`.
3. **Use Route Handlers only when** one of the following is true:
   - A third-party system (webhook receiver, OAuth callback, Supabase webhook, Sentry tunnel, Vercel cron) must call us over HTTP.
   - We need to expose a public API surface for an external client we don't control.
   - We need streaming responses (`Response` with a `ReadableStream` body) that Server Actions cannot deliver, e.g. SSE for AI generation token streaming. (Note: most streaming use cases inside our own UI can also be handled with Server Components + `Suspense` + `use()`, so this exception is narrower than it first looks.)
4. **Validate every Server Action input with zod** at the very top of the action body, using a schema imported from `lib/validation/<domain>.ts`. The same schema is used by `react-hook-form` on the client via `zodResolver`.
5. **Never trust the client.** Client-side zod is a UX nicety; the server-side `safeParse` is the security boundary. Both must use the identical schema.
6. **Never expose backend error codes to the client.** Server Actions return narrow discriminated-union result types like `{ ok: true } | { ok: false; error: "invalid_credentials" | "network" | "generic" }`. The client maps these tags to Polish strings from `lib/i18n/pl.ts`.
7. **Never include PII in error logs.** Action error handlers may log a category and stack but never echo email addresses, passwords, or other user-supplied content.

## Consequences

### Positive

- **Less boilerplate.** No `fetch()` wrapper, no JSON serialization layer, no separate API route file per mutation. The code that calls the mutation and the code that performs it live in the same directory.
- **Type safety end-to-end.** The Client Component imports the action's TypeScript signature directly. There is no string-typed URL or `unknown`-shaped JSON response in the middle.
- **Cookie + session handling is automatic.** Server Actions go through the same `@supabase/ssr` cookie machinery as Server Components, so the session refresh path is identical to RSC reads.
- **Redirects compose naturally.** A successful action can call `redirect()` from `next/navigation` and the framework handles the navigation. With Route Handlers, the client has to read the JSON response and call `router.push()` itself.
- **Easier testing.** Server Actions are async functions that can be unit-tested by importing them and calling them with a mocked Supabase client. No need to spin up an HTTP test harness.
- **Smaller client bundle.** No `fetch()` wrappers, no API client code shipped to the browser.

### Negative

- **Vendor lock-in to Next.js App Router.** Server Actions are a Next.js-specific feature. Migrating off Next.js later would mean rewriting every mutation as an HTTP endpoint. We accept this — Next.js is locked in the stack and migration risk is theoretical.
- **No public API surface.** If we ever need third-party integration, we will have to add Route Handlers retroactively. Acceptable: the spec is single-coach with no third-party requirements.
- **Less familiar to engineers from other ecosystems.** A developer used to "every mutation is a REST endpoint" needs to learn the Server Actions mental model. Mitigation: this ADR plus US-001 design doc act as the worked example.
- **Harder to test from outside the app.** You cannot `curl` a Server Action. For QA we use Playwright (which exercises the real form path) and Vitest (which imports the action directly). We never need to hit it as an HTTP endpoint.
- **Server Actions are POST-only and have framework-imposed payload limits.** Both fine for our forms; flagged here so the constraint is documented.
- **Devtools observability is awkward.** Server Action calls show up in the Network tab as opaque POSTs to the page URL with framework-encoded payloads. Mitigation: structured server-side logging is the source of truth, not the browser devtools panel.

### Neutral / future considerations

- **AI plan-generation streaming** is the most likely future case where we will need a Route Handler (for SSE token streaming from Claude). When that story is written, the developer should add the Route Handler under `app/api/ai/<endpoint>/route.ts` and document the exception in the story's design doc. This ADR's exception #3 already covers it.
- **Supabase webhooks** (e.g. database event triggers calling out to our app) will live under `app/api/webhooks/<source>/route.ts` and are explicitly covered by exception #1.
- **Cron jobs** (Vercel Cron) call HTTP endpoints, so any cron logic lives under `app/api/cron/<job>/route.ts` per exception #1.
- **OAuth callbacks** — not needed today (no OAuth providers), but if added later they would live under `app/api/auth/callback/<provider>/route.ts` per exception #1.

## Compliance

Every PR introducing a mutation must either:

- **Use a Server Action**, or
- **Justify the use of a Route Handler in the PR description** by referencing one of the three exceptions in the Decision section above.

The `code-reviewer` agent enforces this convention during review.
