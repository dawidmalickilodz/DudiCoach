---
id: ADR-0003
title: Anonymous athlete access via share code with SECURITY DEFINER RPC
status: Accepted
date: 2026-04-13
author: architect
supersedes: []
superseded_by: []
related_stories:
  - US-004
---

# ADR-0003 -- Anonymous athlete access via share code with SECURITY DEFINER RPC

## Status

Accepted (2026-04-13)

## Context

US-004 introduces the athlete panel: a public, unauthenticated page where an athlete enters a 6-character share code and sees their read-only profile with real-time updates from the coach. The athlete has no Supabase Auth account -- the share code is the sole access credential.

This creates a tension with the project's "RLS always on" rule (CLAUDE.md rule 6). The `athletes` table has four RLS policies that all require `auth.uid() = coach_id`, meaning unauthenticated (anonymous) requests return zero rows.

We need a pattern that:
1. Lets an anonymous user read exactly one athlete row -- the one matching their share code.
2. Does NOT expose other athletes' data.
3. Does NOT require the athlete to create a Supabase Auth account.
4. Works with Supabase Realtime for live updates.
5. Is simple enough for a single-coach application.

## Options Considered

### Option A: Anonymous RLS policy on the athletes table

Add a SELECT policy for the `anon` role:

```sql
create policy "athletes_select_by_share_code"
  on public.athletes for select to anon
  using (share_code = current_setting('request.header.x-share-code', true));
```

The athlete panel would pass the share code as a custom header.

Pros: Pure RLS, no extra functions, Realtime postgres_changes would work with proper channel filters.
Cons: Supabase Realtime subscriptions do NOT pass custom headers -- they use the anon key's JWT. The `current_setting('request.header.*')` approach works for PostgREST REST calls but NOT for Realtime WebSocket connections. This means the RLS policy would block Realtime updates for anonymous users. Dealbreaker.

### Option B: SECURITY DEFINER RPC function for initial fetch + Realtime broadcast channel

Use a `SECURITY DEFINER` RPC function (`get_athlete_by_share_code`) for the initial data fetch. This function runs with the definer's privileges (bypassing RLS), looks up the athlete by share code, and returns a sanitized row (excluding `coach_id` and other internal fields).

For real-time updates, instead of relying on `postgres_changes` (which requires RLS to allow the subscriber to see the row), use a Supabase Realtime **broadcast channel** keyed by the share code. The server-side code (triggered after a coach PATCH) broadcasts the updated athlete data to the channel. Alternatively, use a database trigger + `pg_notify` + Supabase Realtime integration.

Actually, the simpler approach: the athlete panel subscribes to a `postgres_changes` channel filtered to `share_code=eq.{code}`. For this to work, we need an RLS policy that allows `anon` to SELECT rows matching a specific share code. But as noted in Option A, the filter value must be available in the RLS context.

**Revised approach for Option B**: Use the RPC function for the initial fetch. For Realtime, add a minimal anon SELECT policy that uses the Realtime channel's filter as the access control. Supabase Realtime `postgres_changes` with a filter `share_code=eq.ABC123` will only deliver rows matching that filter. Combined with a permissive anon SELECT policy, the client only receives the row it is filtering for. The "security" is the share code itself being a 32^6 = ~1 billion combinations secret.

Pros: Clean separation. RPC handles validated fetch. Realtime works naturally.
Cons: The anon SELECT policy is broad (`to anon using (true)`) or needs a filter. A `using (true)` policy would technically allow an anonymous PostgREST `SELECT * FROM athletes` to return all rows -- which is unacceptable.

### Option C: SECURITY DEFINER RPC for fetch + Realtime broadcast (no postgres_changes)

Use the RPC function for initial data. For live updates, use Supabase Realtime **broadcast** channels (not `postgres_changes`). The coach's auto-save PATCH handler, after successfully saving, explicitly broadcasts the updated data to the `athlete:{shareCode}` broadcast channel using the server-side Supabase admin client.

Pros: No anon RLS policy on athletes table needed at all. Full control over what data is broadcast. Share code remains the access secret. Broadcast channels do not require database-level permissions.
Cons: Slightly more server-side code (the PATCH handler must broadcast after save). But this is a one-time addition to the existing PATCH route.

### Option D: Separate `athlete_profiles_public` view with its own RLS

Create a Postgres VIEW that exposes only safe columns, with its own RLS policy using share code matching.

Pros: Clean data boundary.
Cons: Views with RLS are complex in Supabase. Realtime does not work on views. Adds unnecessary indirection.

## Decision

**Option C -- SECURITY DEFINER RPC for initial fetch + Realtime broadcast channels for live updates.**

The details:

1. **Initial fetch**: A `SECURITY DEFINER` RPC function `get_athlete_by_share_code(p_code char(6))` looks up the athlete, returns a sanitized row (excluding `coach_id`). It returns NULL/empty if the code does not exist. This function is callable by `anon` and `authenticated` roles.

2. **Real-time updates**: After the coach's PATCH auto-save succeeds, the API route handler broadcasts the updated (sanitized) athlete data to a Supabase Realtime broadcast channel named `athlete:{shareCode}`. The athlete panel subscribes to this channel on mount.

3. **No anon RLS policy on athletes**: The existing RLS policies remain unchanged. Anonymous users cannot query the `athletes` table directly. All anonymous access goes through the RPC function (which bypasses RLS by design of `SECURITY DEFINER`).

4. **Share code as access secret**: The share code is the sole access credential. At 32^6 (~1.07 billion combinations), brute-forcing a valid code is impractical for a single-coach application with <100 athletes.

5. **API route for share code lookup**: A public API route `GET /api/athlete/[shareCode]` calls the RPC function and returns the sanitized athlete data. This route does NOT require authentication.

6. **Broadcast from PATCH handler**: The existing `PATCH /api/athletes/[id]` handler is modified to broadcast the updated athlete data to the `athlete:{shareCode}` channel after a successful save. This uses the Supabase server client (which has the service role key for admin operations) or the authenticated client (broadcast does not require admin).

## Consequences

### Positive

- No changes to existing RLS policies on the `athletes` table. The security model for coach access is untouched.
- Anonymous users have no direct database access to the athletes table. The RPC function is the only entry point, and it validates the share code and returns a sanitized response.
- Broadcast channels are lightweight and do not require database-level subscriptions. No risk of leaking data through Realtime channel misconfiguration.
- The share code remains the single secret. Resetting it (generating a new one) immediately invalidates the old channel -- the athlete's subscription to `athlete:{oldCode}` receives no further broadcasts.
- Cleanly separable: the athlete panel code has zero coupling to coach auth logic.

### Negative

- The PATCH handler must explicitly broadcast after save. This is a small amount of additional code but introduces a coupling: if a future story adds another way to update athlete data (e.g., a Server Action), it must also broadcast. Mitigation: document this requirement clearly; the single PATCH endpoint is the only update path for the foreseeable backlog.
- Broadcast channels are fire-and-forget. If the athlete is disconnected when the coach saves, they miss the update. Mitigation: the athlete panel re-fetches via the RPC function when reconnecting (the `useRealtimeAthlete` hook handles this).
- The RPC function bypasses RLS. If the function has a bug (e.g., returns rows for NULL share codes), it could leak data. Mitigation: the function is simple (single SELECT with exact match), easy to audit, and tested.

### Neutral

- Future stories (US-014: athlete exercise feedback) will need a WRITE path for anonymous users. That will require a separate RPC function for inserts/updates, following the same SECURITY DEFINER pattern. This ADR covers only the READ path.
- If the application ever becomes multi-tenant, the RPC function would need a `coach_id` scope parameter. Not needed for single-coach.

## Compliance

Any code that provides anonymous (unauthenticated) access to athlete data must:
- Use the `get_athlete_by_share_code` RPC function, NOT a direct table query.
- Never expose `coach_id` in the response to anonymous users.
- Use Realtime broadcast channels (not `postgres_changes`) for live updates to anonymous subscribers.
