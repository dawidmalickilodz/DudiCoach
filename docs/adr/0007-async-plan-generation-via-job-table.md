---
id: ADR-0007
title: Async AI plan generation via job table + Vercel Cron worker + polling
status: Accepted
date: 2026-04-28
author: architect
supersedes: []
superseded_by: []
related_stories:
  - US-005 (synchronous predecessor)
  - US-026 (this story)
related_adrs:
  - ADR-0001-server-actions-vs-route-handlers
  - ADR-0002-route-handlers-for-crud-with-tanstack-query
  - ADR-0004-claude-api-integration-pattern
  - ADR-0006-athlete-plan-rpc-vs-admin-client
---

# ADR-0007 — Async AI plan generation via job table + Vercel Cron worker + polling

## Status

Accepted (2026-04-28).

## Context

US-005 shipped a synchronous Claude API call inside the
`POST /api/athletes/[id]/plans` route handler:

```
coach click → route handler → anthropic.messages.create() → parse → INSERT → 201
```

This worked through internal testing but is not viable in production:

| `max_tokens` | Observed outcome on production traffic |
|---|---|
| 3000 | Claude truncates; `parsePlanJson()` throws; user sees 500. |
| 4000 | Same as 3000 — truncation + 500. |
| 6000 | Anthropic SDK 60s timeout, or Vercel platform 504 before that. |
| 8000 | Same shape as 6000, with higher per-call cost. |

Constraints during this analysis:

- The Anthropic API key (`ANTHROPIC_API_KEY`) is correctly provisioned in
  every environment.
- The compact prompt + zod-validated contract has shipped on `main`.
- The athlete public plan endpoint (US-025) is locked: its contract cannot
  change.
- Switching models (e.g., to Opus) is a separate cost/quality decision and
  is explicitly out of scope here.

We need a path that:

1. Allows generation to take 60-180 s reliably.
2. Returns a fast HTTP response from the coach-initiated request.
3. Surfaces success / failure clearly to the coach.
4. Keeps `training_plans` as the single source of truth for completed
   plans.
5. Does not regress the public athlete endpoint or the security model.

## Decision

**Adopt a job-queue + worker + polling architecture.**

Concretely:

1. A new table `public.plan_generation_jobs` stores generation metadata —
   inputs, status, attempts, claim metadata, and on success a foreign key
   to the resulting `training_plans` row.
2. The coach-facing `POST /api/coach/plans/jobs` route INSERTs a `pending`
   job and returns **HTTP 202** with the `jobId` in under 500 ms.
3. A **Vercel Cron** entry runs every 1 minute and POSTs to a worker route
   `POST /api/internal/plans/jobs/run`. The route is gated by a
   shared-secret bearer header (`PLAN_JOBS_WORKER_SECRET`).
4. The worker drains the queue using a `SECURITY DEFINER` RPC
   `claim_pending_plan_job` that performs `FOR UPDATE SKIP LOCKED` (atomic
   claim). On a successful generation, it calls `complete_plan_job` (also
   `SECURITY DEFINER`), which INSERTs into `training_plans` and flips the
   job to `succeeded` in a single transaction — **idempotent under crash**
   because the side effect and the lifecycle marker commit together.
5. The coach UI polls `GET /api/coach/plans/jobs/[jobId]` every 2-5 s
   (interval grows after 30 s and 90 s) up to a 180 s ceiling. On
   `succeeded`, the plan list query is invalidated and the new plan card
   appears. On `failed`, an actionable Polish error with retry CTA is
   shown.
6. A **stale-claim sweep** in the same `claim_pending_plan_job` RPC
   reclaims any `processing` job whose `processing_started_at` is older
   than 180 s, restoring it to `pending` so a fresh worker can retry.
7. RLS on `plan_generation_jobs`: SELECT and INSERT are restricted to
   `coach_id = auth.uid()`. **No UPDATE / DELETE policies exist for
   authenticated.** All state transitions are performed by the worker via
   `SECURITY DEFINER` RPCs granted only to `service_role`.
8. The public athlete endpoint `GET /api/athlete/[shareCode]/plans` is
   untouched. It continues to read from `training_plans` via
   `get_latest_plan_by_share_code` (US-025, ADR-0006). The jobs table is
   never visible to anonymous callers.

The full design — schema, RPC bodies, sequence diagrams, RLS policies,
test plan, rollback — is in `docs/design/US-026-async-plan-generation-design.md`.

## Consequences

### Positive

- **Generation time decoupled from user-facing latency.** The coach sees
  202 in < 500 ms regardless of how long Claude takes.
- **Durable retry for free.** Transient Anthropic failures requeue without
  losing the request; the user does not re-click.
- **Idempotency by transaction.** The atomic INSERT-plan + UPDATE-job
  closes the duplicate-write window we'd otherwise face.
- **Observability.** Every generation attempt is a row in
  `plan_generation_jobs` with attempts, error codes, timestamps.
  Diagnosing "why didn't this plan generate" becomes a SQL query.
- **Pattern reuse.** The endpoint shape (Route Handler + TanStack Query
  consumer) matches ADR-0002. The privileged DB code (`SECURITY DEFINER`
  RPCs with explicit grants) matches ADR-0006. No new architectural
  primitives.
- **Public endpoint is unaffected.** ADR-0006 stands; US-025 stays frozen.

### Negative

- **More moving parts.** The system grows from "one route" to "one route +
  one cron + one worker route + three RPCs + one table". More to
  understand, document, and test.
- **One-minute floor on time-to-first-byte for generation work.** The
  Vercel Cron interval is the granularity. A coach who clicks "Generuj
  plan" right after a tick waits up to 60 s before the worker even starts.
  Mitigation: not a real constraint for a coach-facing tool where the
  result will take 60-120 s anyway; total perceived time is similar.
- **Vercel tier dependency.** `maxDuration: 60` for the worker route
  requires Hobby+; reliable 120 s budget requires Pro. Documented as Q1 in
  the design's open questions.
- **Job table accumulates.** Cleanup is left for a follow-up (Q3 in
  design).
- **Coach cannot cancel a running job in v1.** Documented as Q4 / D7.

### Neutral

- Future model upgrades (claude-opus-N, claude-sonnet-N+1) require only
  bumping `ANTHROPIC_MODEL` and possibly `maxDuration`; no architectural
  change.
- Future jobs (e.g., periodization re-plans, exercise recommendations)
  follow the same pattern: another table or a `job_type` column +
  worker switch.
- Future cleanup of the synchronous route can happen in a separate PR
  after a stable period of `async` mode in production.

## Rejected alternatives

### A. Realtime push (Supabase Realtime broadcast or `postgres_changes`)

**What it would be**: instead of polling, the coach UI subscribes to a
Realtime channel keyed by job id. The worker (or a Postgres trigger)
broadcasts when status changes.

**Why rejected**:

1. **Adds an authorization surface.** Realtime `postgres_changes`
   subscriptions require either a permissive RLS policy on
   `plan_generation_jobs` (which we explicitly want to avoid — see ADR-0003
   for the parallel reasoning on athletes) or a careful broadcast pattern
   from the worker. Either way, it's a second access mechanism to audit.
2. **Debugging cost.** Polling shows up in the browser's Network tab as
   plain GETs. WebSocket messages require dedicated tooling.
3. **Marginal UX gain.** With a 2 s polling interval, the user sees the
   transition within 2 s of it happening. Realtime would shave that to
   <500 ms — imperceptible improvement for a 60-120 s generation.
4. **No inherent retry.** A dropped WebSocket means the client misses the
   notification entirely; we'd need to add a polling fallback anyway.
5. **Policy alignment.** ADR-0003 already chose the
   "no-Realtime-postgres-changes-for-anon" pattern for similar reasons.
   Adding it for the authenticated coach side would create a third pattern.

If a future story shows the polling cost is meaningful at scale, we can
add Realtime as a layer **on top of** the job table — the table and RPCs
remain the source of truth.

### B. Longer Vercel function timeout (configure 300 s on the synchronous route)

**What it would be**: bump `maxDuration` on
`app/api/athletes/[id]/plans/route.ts` to 300 s, accept the long-running
HTTP request.

**Why rejected**:

1. **The browser is the bottleneck.** A 300 s open HTTP request through a
   browser is fragile to mobile networks, proxies, sleep, and tab
   discards. The user has no feedback for 5 minutes.
2. **No retry.** A network blip during the 300 s window forces the user
   to re-click; their previous attempt's Claude tokens are wasted.
3. **No queue.** A double-click queues two simultaneous Claude calls (cost).
4. **No rollback for partial state.** If the route INSERTs the plan and
   then the response is dropped, the user thinks generation failed and
   re-runs, producing a duplicate.
5. **Tier dependency.** `maxDuration: 300` requires Vercel Pro. The async
   design also wants Pro for the worker, but the worker is a single
   timeout-tolerant code path; the synchronous route would be in the
   user-facing critical path.

The async design also runs on Pro, but isolates the cost to a non-user-
facing route and adds durability the synchronous route cannot have.

### C. Switch to Opus (faster generation, fits in 60 s)

**What it would be**: change `ANTHROPIC_MODEL` from `claude-sonnet-4-6`
to `claude-opus-4-N`. Opus is reportedly faster on long-tail outputs.

**Why rejected (here)**:

1. **Out of scope.** The story brief explicitly bars this decision. Cost
   per call rises ~5x with Opus. Quality may improve or change in
   unpredictable ways. Both deserve a separate evaluation story.
2. **Doesn't fix the architecture.** Even if Opus generates in 30 s, a
   future model or a richer prompt would re-create the timeout problem.
   The async pattern is robust to model choice; the sync pattern is not.
3. **Feature flag still helps.** The async design ships behind a feature
   flag; if Opus later proves to be reliably <60 s, we can flip back to
   `sync`. The async work isn't wasted because it remains the
   contingency.

### D. In-band streaming (Server-Sent Events from a long-running route)

**What it would be**: the coach opens an SSE connection; the route
streams Claude's output token-by-token; the UI accumulates and parses on
final.

**Why rejected**:

1. **Vercel function timeout still applies to the open SSE connection.**
   We don't gain a longer execution window; we just see partial output
   sooner.
2. **JSON streaming is fragile.** The plan is structured JSON. Token-by-
   token parsing of streamed JSON is complex and error-prone — see
   ADR-0004 §Alternatives Considered #4 for the original deferral.
3. **No durability.** A dropped connection mid-stream still loses the
   work. The user re-runs from scratch.
4. **Browser tab close kills the request.** With async polling, the work
   continues server-side and the next page load shows the result.

Streaming may be worthwhile for free-form chat AI features in the future;
not for structured plan generation.

### E. External job queue (Inngest, Trigger.dev, BullMQ + Redis)

**What it would be**: adopt a third-party job runner.

**Why rejected**:

1. **Vendor sprawl.** We have one user, one Postgres, one deployment
   surface. Adding a queue vendor is unjustified.
2. **Postgres is the queue.** A single FOR UPDATE SKIP LOCKED query meets
   our throughput needs (one coach generates a few plans per day).
3. **Migration cost on multi-tenant.** If we ever multi-tenant, the
   Postgres queue scales to thousands of jobs / hour without a vendor
   swap. If it stops scaling, we revisit.

### F. Supabase Edge Functions (Deno) for the worker

**What it would be**: move the worker out of Next.js and into a Supabase
Edge Function written in Deno, scheduled by `pg_cron` calling
`net.http_post`.

**Why rejected (for v1)**:

1. **No existing Edge Functions in this repo.** Adding a second runtime
   doubles the deployment surface, adds a new local dev workflow, and
   forces us to maintain two TypeScript build pipelines.
2. **The Anthropic SDK supports Deno**, but the prompt/parser modules are
   written assuming Node. We'd port or duplicate them.
3. **Vercel Cron is already on the deployment surface.**

Reconsider if Q1 (Vercel tier) cannot be resolved — Edge Functions on
Supabase have a higher (150 s) timeout on the free tier, which becomes a
real lever if we cannot run the worker on Vercel Pro.

## Compliance

Any code path that generates a plan via Claude **MUST**:

1. Insert into `plan_generation_jobs` (never call Anthropic directly from a
   coach-facing route handler in production).
2. Use the three SECURITY DEFINER RPCs for state transitions (never UPDATE
   `plan_generation_jobs` from a route handler).
3. Never expose `prompt_inputs`, `claim_token`, or `processing_started_at`
   in API responses.
4. Never grant `anon` or `authenticated` direct EXECUTE on the worker
   RPCs.
5. Never modify `app/api/athlete/[shareCode]/plans/route.ts` as part of
   this work (US-025 is frozen).

The `security-reviewer` and `code-reviewer` agents enforce these
properties on every PR touching `app/api/coach/plans/jobs/**`,
`app/api/internal/plans/jobs/**`, or any `plan_generation_jobs`-related
migration.
