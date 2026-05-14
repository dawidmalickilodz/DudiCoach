# F4 Runtime Verification Note (PR #49)

## Metadata
- Date: 2026-05-13
- Area: Supabase RPC privilege hardening runtime verification (G9)
- PR: #49 - security(supabase): harden rpc execute privileges
- Merge commit: `032d3c2540ba585cc33a7edf0582b060b2e77c19`
- Migration: `supabase/migrations/20260507120000_RPC_privilege_hardening.sql`
- Runtime target: `qpsgpfnqlbbrvawjeeaj.supabase.co`

## Scope
This note records post-merge G9 runtime evidence only. It does not change SQL, grants, RLS, functions, auth config, or application code.

## Verification Results

### 1) Direct SQL privilege matrix
Status: PASS

Expected and observed state match:
- `reset_share_code(uuid)`: anon=false, authenticated=true, public=false
- `generate_share_code()`: anon=false, authenticated=true, public=false
- `get_athlete_by_share_code(char)`: anon=true, authenticated=true, public=false
- `get_active_injuries_by_share_code(char)`: anon=true, authenticated=true, public=false
- `get_latest_plan_by_share_code(char)`: anon=true, authenticated=true, public=false

### 2) Denied anon RPC smoke
Status: PASS

- anon -> `generate_share_code()` returned 401 / 42501 permission denied
- anon -> `reset_share_code(dummy_uuid)` returned 401 / 42501 permission denied

Interpretation: restricted RPCs are denied at execute privilege level for anon.

### 3) Public share anon smoke
Status: PASS

- anon -> `get_athlete_by_share_code(<SAMPLE-ACTIVE-CODE>)` -> 200, rows=1
- anon -> `get_athlete_by_share_code(<SAMPLE-INVALID-CODE>)` -> 200, rows=0
- anon -> `get_active_injuries_by_share_code(<SAMPLE-ACTIVE-CODE>)` -> 200, rows=0
- anon -> `get_active_injuries_by_share_code(<SAMPLE-INVALID-CODE>)` -> 200, rows=0
- anon -> `get_latest_plan_by_share_code(<SAMPLE-ACTIVE-CODE>)` -> 200, rows=0
- anon -> `get_latest_plan_by_share_code(<SAMPLE-INVALID-CODE>)` -> 200, rows=0

Only status codes and row counts are recorded; no private payloads are included.

### 3a) Exposed share-code rotation follow-up
Status: PASS

- Exposed code `DKG3YF` was rotated manually through authenticated coach flow.
- Post-rotation verification:
  - `GET /api/athlete/DKG3YF` -> 404
  - `GET /api/athlete/DKG3YF/plans` -> 404
- Old code is no longer active/reachable for athlete or plans data.
- No new share code was recorded or printed in this evidence note.

### 4) Authenticated coach smoke
Status: NIEZWERYFIKOWANE

Reason: no safe authenticated credentials/session were available during this verification.

### 5) Runtime logs review
Status: NIEZWERYFIKOWANE

Reason: no Supabase/Vercel log channel was available in this verification step.

### 6) Migration tracking
Status: DO POPRAWY (audit-trail gap)

- SQL Editor check for version `20260507120000` in `supabase_migrations.schema_migrations` returned no rows.
- Runtime grants were manually repaired and behaviorally verified.
- Behavioral state is correct, but migration tracking/audit trail is incomplete.

## Overall G9 Result
PARTIAL / BEHAVIORAL PASS WITH EVIDENCE GAPS

Behavioral privilege outcomes are verified as correct, and exposed share-code rotation follow-up is completed (PASS). Formal closeout still requires missing evidence and migration audit-trail decision.

## Required Follow-ups
1. Execute authenticated coach smoke on a safe test account:
   - coach reset share route
   - athlete creation/share_code generation
2. Review Supabase and Vercel runtime logs after grant repair.
3. Decide and document how to close migration tracking audit-trail gap without silently inserting tracking rows.
4. Optionally verify Supabase advisor warning delta after hardening.

## Closeout Recommendation
Do not mark PR #49 runtime verification as fully closed until follow-ups (1)-(3) are completed or explicitly accepted as residual risk with owner/date.
