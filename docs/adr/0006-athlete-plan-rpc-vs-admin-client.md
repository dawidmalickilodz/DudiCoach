---
id: ADR-0006-athlete-plan-rpc-vs-admin-client
title: RPC + SECURITY DEFINER vs service-role admin client for the public athlete plan endpoint
status: Accepted
date: 2026-04-24
author: architect
supersedes: []
superseded_by: []
related_stories:
  - US-025
related_adrs:
  - ADR-0003 (Anonymous athlete access via share code with SECURITY DEFINER RPC)
---

# ADR-0006 — RPC + SECURITY DEFINER vs service-role admin client for the public athlete plan endpoint

> **Filename note.** This ADR is filed under
> `docs/adr/0002-athlete-plan-rpc-vs-admin-client.md` by explicit request from
> US-025's design brief. An ADR numbered `0002` already exists
> (`0002-route-handlers-for-crud-with-tanstack-query.md`). The conflict is a
> filename artifact only; the two ADRs address disjoint subjects (HTTP surface
> choice vs. anonymous-read authorization mechanism). If the convention is to
> keep ADR numbers unique, this file should be renamed to the next available
> number (`0006-athlete-plan-rpc-vs-admin-client.md`) before merge — this is
> called out in the US-025 summary so the renumbering is a trivial clerical
> fix, not a re-architecture.

## Status

Accepted (2026-04-24)

## Context

US-025 exposes the most recent training plan of an athlete through a public,
unauthenticated endpoint `GET /api/athlete/[shareCode]/plans`. The `training_plans`
table has RLS policies that limit reads to the coach who owns the plan (see
`supabase/migrations/20260413120000_US-005_training_plans.sql`). An anonymous
request would return zero rows under those policies.

There are two supported mechanisms in this stack to allow an anonymous server-side
read to bypass RLS on a specific shape:

1. A `SECURITY DEFINER` Postgres function (RPC) invoked via the Supabase anon
   client.
2. A server-side Supabase client constructed with the `SUPABASE_SERVICE_ROLE_KEY`
   (the "admin client"), which holds full access to the database.

ADR-0003 already chose option 1 for the athlete profile and injuries endpoints.
This ADR applies the same reasoning to plans and makes the choice explicit and
durable for future stories that expose additional private data via the share
code.

## Options Considered

### Option A: Service-role admin client in the route handler

The route handler builds a Supabase client with the service role key and queries
`training_plans` directly, filtering by a join-by-share-code.

```typescript
// Hypothetical (NOT what we are doing)
const supabase = createClient(url, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: athlete } = await supabase
  .from("athletes")
  .select("id")
  .eq("share_code", normalized)
  .eq("share_active", true)
  .single();

if (!athlete) return json404();

const { data: plan } = await supabase
  .from("training_plans")
  .select("id, plan_name, phase, plan_json, created_at")
  .eq("athlete_id", athlete.id)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

return NextResponse.json({ data: plan ?? null });
```

**Pros**

- Written entirely in TypeScript; no new SQL to maintain.
- Easy to prototype and extend.
- Does not require a migration.

**Cons**

- The service role key holds **full** database access. A bug, a refactor, or a
  future helper that passes the admin client into an unintended code path can
  leak arbitrary data from any table.
- The public-safe column list is enforced only in application code. A sloppy
  `select("*")` or a `returning("*")` would leak `athlete_id` (and anything
  else ever added to `training_plans`).
- The share-code and `share_active` checks are two separate application-level
  queries. If a developer forgets the `share_active = true` filter in the
  athlete lookup (or inverts it), inactive codes silently start working.
- Divergence from the US-004 / US-011 pattern. A second mechanism to audit,
  test, and document.
- Secret management overhead. `SUPABASE_SERVICE_ROLE_KEY` must be provisioned
  on every environment that runs this route (Vercel production, preview,
  development). Rotating it is a coordination event.
- Blast radius on compromise. If the route handler is tricked (SSRF, header
  injection, parameter pollution) into executing attacker-controlled queries,
  the service role has no limits.

### Option B: `SECURITY DEFINER` RPC

A Postgres function `get_latest_plan_by_share_code(char)` runs as the function
owner (bypassing RLS), performs an exact-match join on `share_code` and
`share_active`, and returns a precisely enumerated set of columns. The route
handler calls it with the anon client.

**Pros**

- Smallest possible privilege surface. The function body is the only code with
  elevated access, and it is a ~10-line SELECT with no dynamic SQL.
- Public-safe shape is enforced at the database. `athlete_id` is excluded by
  the function's `returns table (...)` clause. A bug in the route handler
  cannot widen the exposed columns.
- Access preconditions (`share_active = true`, `share_code = upper(p_code)`)
  are encoded in one place, as SQL, and visible in code review as one
  statement.
- Matches the existing `get_athlete_by_share_code` (US-004) and
  `get_active_injuries_by_share_code` (US-011) pattern. A reviewer already
  knows what to look for.
- The anon client (with `NEXT_PUBLIC_SUPABASE_ANON_KEY`) is already used by
  every route in the app. No new secret to manage.
- If the function has a bug, the blast radius is the function's return shape,
  not the entire database.

**Cons**

- Requires a migration for every new public read. Non-trivial to iterate on.
- SQL is a second language to maintain. Developers must be comfortable editing
  `plpgsql`.
- The RPC return type is duplicated in TypeScript. `PublicTrainingPlan` must
  stay in sync with `returns table (...)`. Mitigation: the Supabase types
  generator produces a typed `Database["public"]["Functions"]` entry; the
  `lib/types/plan-public.ts` interface mirrors it.

### Option C: Postgres VIEW with a public RLS policy

Create a VIEW over `training_plans JOIN athletes` that exposes only the public
columns, and add an `anon` SELECT policy on the view.

**Pros**

- Encodes the public shape in DDL.

**Cons**

- Views do not support per-row RLS in Supabase the way tables do; the policy
  has to live on the underlying table, which brings back the question of how
  to gate by share code for an anonymous subscriber. (This was the dealbreaker
  in ADR-0003 option A.)
- Adds one more object to maintain. No material benefit over Option B.

## Decision

**Option B: `SECURITY DEFINER` RPC function `get_latest_plan_by_share_code(char)`**
invoked from a route handler using the standard anon-role server Supabase client.

The route handler **MUST NOT** construct or import a service-role Supabase
client for this endpoint. Compliance is enforced in code review. Any future
story that exposes private data via the share code follows this same pattern
(a new SECURITY DEFINER RPC per domain object), consistent with ADR-0003.

## Consequences

### Positive

- **Principle of least privilege.** The only elevated-privilege code is ~10
  lines of SQL that do one thing. Everything else runs as anon.
- **Shape enforcement.** The public response shape is pinned by the function's
  return signature. A review of the function gives a complete picture of what
  the endpoint can return. The application code cannot accidentally leak more.
- **Consistency.** US-004, US-011, and US-025 all follow the same
  "`SECURITY DEFINER` RPC per public read" pattern. A single security
  reviewer checklist can audit them with a common template.
- **No service-role key in this code path.** Reduces secret sprawl; reduces
  the number of places where a key leak matters.
- **Trivial to revoke.** `REVOKE EXECUTE ... FROM anon, authenticated`
  instantly disables the endpoint at the database level without a code
  deploy — the fast mitigation path in US-025 §10.1.

### Negative

- **Migration cost per endpoint.** Each new public read shape requires a new
  migration. For a small feature this feels ceremonial, but the ceremony is
  the whole point: it forces a per-shape review.
- **Type-duplication friction.** The TS type (`PublicTrainingPlan`) and the
  SQL return signature must be kept in sync. Mitigation: the Supabase type
  generator emits the function's signature, so drift manifests as a type
  error immediately.
- **SQL literacy requirement.** Developers must be comfortable reading and
  writing small plpgsql functions. Already a project norm per ADR-0003.

### Neutral

- **Future extension.** If US-025 ever needs to expose plan *history* (all
  plans, not just latest), a new function `get_plans_by_share_code(char)` is
  added. The existing latest-only function remains untouched and continues to
  be used by `PlanPublicSection` in its current form. This keeps feature
  evolution additive.
- **Multi-tenant scaling.** If DudiCoach ever adds a second coach role or
  becomes multi-tenant, the RPC pattern generalizes naturally (add a
  `coach_id` scope parameter or rely on existing RLS through the
  `authenticated` role). The service-role alternative would require
  rewriting the route's authorization logic from scratch.

## Compliance

Any code that provides anonymous (unauthenticated) access to training-plan
data **MUST**:

1. Use `get_latest_plan_by_share_code` (or a successor RPC following the same
   pattern), invoked via the anon-role server Supabase client created by
   `createClient()` from `lib/supabase/server.ts`.
2. Never construct a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` in any
   public (unauthenticated) code path.
3. Never expose `athlete_id` or `coach_id` (or any other non-public column) in
   the response body.
4. Enforce the share-code format regex (`^[A-HJ-NP-Z2-9]{6}$`) at the route
   boundary, before the RPC call.

The `security-reviewer` agent MUST verify these properties for any PR touching
`app/api/athlete/**` or any new `SECURITY DEFINER` function on
`training_plans`.
