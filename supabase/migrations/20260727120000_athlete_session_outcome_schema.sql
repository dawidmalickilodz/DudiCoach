-- Athlete Session Outcome schema foundation (PR1, reworked).
-- Scope: additive outcome columns, validation constraints (added NOT VALID,
-- validated in the sibling 20260727120001 file), date trigger, partial index,
-- column documentation, hardened trigger-function ACL, and deterministic
-- client table ACL normalization (anon: none, authenticated: SELECT only).
-- Lane C. Design: docs/design/athlete-context-system-design.md §3, §10, §11.
--
-- Lock profile (this file's transaction):
--   The table is locked ACCESS EXCLUSIVE from the very first statement, so the
--   lock covers the legacy-row pre-check scan and both assert blocks in
--   addition to the DDL below. This is intentional: it serializes against
--   concurrent direct-RPC writes that the pre-check's MVCC snapshot could
--   otherwise miss (a TAB/CR/LF-only row would pass the legacy space-only
--   rule and later fail VALIDATE CONSTRAINT). The window is the sum of a
--   small-table count scan plus fast metadata-only DDL:
--   - ADD COLUMN x7 .......... metadata-only (no DEFAULT, no NOT NULL) - fast
--   - ADD CONSTRAINT x3 ...... NOT VALID - no table scan - fast
--   - DROP CONSTRAINT / ALTER COLUMN DROP NOT NULL - no scan - fast
--   - REVOKE/GRANT ........... fast catalog-only ACL normalization
--   - CREATE INDEX ........... SHARE (brief write block; small table)
--   - CREATE TRIGGER ......... SHARE ROW EXCLUSIVE (brief write block)
--   The expensive VALIDATE CONSTRAINT scans run in the NEXT transaction
--   (20260727120001) under SHARE UPDATE EXCLUSIVE, which does not block
--   concurrent INSERT/UPDATE/DELETE. Splitting the files bounds the
--   ACCESS EXCLUSIVE window to the count scan and fast DDL above.
--   NOT VALID constraints are enforced on every new INSERT/UPDATE after
--   creation, so no violating row can appear between the two migrations and
--   VALIDATE cannot race a concurrent write.
--   lock_timeout bounds the ACCESS EXCLUSIVE wait so production cannot wait
--   indefinitely behind an open transaction.

begin;

-- Bound the lock wait; production must fail fast instead of queueing behind
-- an unrelated open transaction.
set local lock_timeout = '10s';

-- Serialize against concurrent direct-RPC writes so the legacy-row pre-check
-- below cannot observe a snapshot that the later VALIDATE CONSTRAINT scan
-- (20260727120001) would reject. The lock is held until commit and overlaps
-- the fast DDL window only.
lock table public.plan_session_feedback in access exclusive mode;

-- Fail fast without exposing feedback content or athlete data.
do $$
declare
  v_existing_outcome_columns integer;
  v_invalid_legacy_rows bigint;
begin
  if to_regclass('public.plan_session_feedback') is null then
    raise exception 'Required table public.plan_session_feedback is missing';
  end if;

  select count(*)
  into v_existing_outcome_columns
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'plan_session_feedback'
    and c.column_name in (
      'session_date',
      'session_status',
      'session_rpe',
      'wellbeing',
      'pain_score',
      'pain_location',
      'pain_side'
    );

  if v_existing_outcome_columns <> 0 then
    raise exception 'Outcome schema pre-check failed: % outcome column(s) already exist',
      v_existing_outcome_columns;
  end if;

  if not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'plan_session_feedback'
      and c.column_name = 'feedback_text'
      and c.data_type = 'text'
      and c.is_nullable = 'NO'
  ) then
    raise exception 'Expected non-null text feedback_text column is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.plan_session_feedback'::regclass
      and c.conname = 'plan_session_feedback_feedback_text_check'
      and c.contype = 'c'
  ) then
    raise exception 'Expected legacy feedback_text check constraint is missing';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.plan_session_feedback'::regclass
      and c.conname = 'plan_session_feedback_plan_id_week_number_day_number_key'
      and c.contype = 'u'
  ) then
    raise exception 'Expected plan/day unique constraint is missing';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'public.plan_session_feedback'::regclass
      and t.tgname = 'plan_session_feedback_enforce_athlete_consistency'
      and not t.tgisinternal
  ) then
    raise exception 'Expected athlete consistency trigger is missing';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'public.plan_session_feedback'::regclass
      and t.tgname = 'plan_session_feedback_updated_at'
      and not t.tgisinternal
  ) then
    raise exception 'Expected updated_at trigger is missing';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'plan_session_feedback'
      and c.relrowsecurity
  ) then
    raise exception 'Expected RLS-enabled plan_session_feedback table';
  end if;

  -- ACL baseline (design §10: verify function ACLs before the migration).
  -- Existence is checked first: has_function_privilege returns NULL (and
  -- silently passes an IF test) when the function does not exist.
  if to_regprocedure(
    'public.upsert_plan_session_feedback(character,uuid,integer,integer,text)'
  ) is null then
    raise exception 'Pre-check failed: upsert RPC signature is missing';
  end if;
  if to_regprocedure(
    'public.get_plan_session_feedback_by_share_code(character,uuid,integer,integer)'
  ) is null then
    raise exception 'Pre-check failed: read RPC signature is missing';
  end if;
  if has_function_privilege(
    'public',
    'public.upsert_plan_session_feedback(character,uuid,integer,integer,text)',
    'execute'
  ) then
    raise exception 'Pre-check failed: upsert RPC is executable by PUBLIC';
  end if;
  if not has_function_privilege(
    'anon',
    'public.upsert_plan_session_feedback(character,uuid,integer,integer,text)',
    'execute'
  ) then
    raise exception 'Pre-check failed: upsert RPC lost anon execute';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.upsert_plan_session_feedback(character,uuid,integer,integer,text)',
    'execute'
  ) then
    raise exception 'Pre-check failed: upsert RPC lost authenticated execute';
  end if;
  if has_function_privilege(
    'public',
    'public.get_plan_session_feedback_by_share_code(character,uuid,integer,integer)',
    'execute'
  ) then
    raise exception 'Pre-check failed: read RPC is executable by PUBLIC';
  end if;

  -- Baseline: Supabase Cloud legacy projects grant full DML to anon and
  -- authenticated on user tables. Local replay has no such grants. Both
  -- states are accepted here because this migration deterministically
  -- normalizes the ACL below (anon: none, authenticated: SELECT only).
  -- RLS policies are verified separately and remain the row-level gate.

  select count(*)
  into v_invalid_legacy_rows
  from public.plan_session_feedback psf
  where psf.feedback_text is null
    or psf.feedback_text !~ '[^[:space:]]'
    or length(
      regexp_replace(
        psf.feedback_text,
        '^[[:space:]]+|[[:space:]]+$',
        '',
        'g'
      )
    ) not between 1 and 2000;

  if v_invalid_legacy_rows <> 0 then
    raise exception 'Legacy feedback pre-check failed: % invalid row(s)',
      v_invalid_legacy_rows;
  end if;
end;
$$;

alter table public.plan_session_feedback
  add column session_date date,
  add column session_status text,
  add column session_rpe smallint,
  add column wellbeing smallint,
  add column pain_score smallint,
  add column pain_location text,
  add column pain_side text;

-- Constraint 1: outcome fields are all NULL, or form one complete outcome.
alter table public.plan_session_feedback
  add constraint plan_session_feedback_outcome_complete
  check (
    (
      session_date is null
      and session_status is null
      and session_rpe is null
      and wellbeing is null
      and pain_score is null
      and pain_location is null
      and pain_side is null
    )
    or
    (
      session_date is not null
      and session_status is not null
      and session_status in ('completed', 'partial', 'skipped')
      and wellbeing is not null
      and wellbeing between 1 and 5
      and pain_score is not null
      and pain_score between 0 and 10
      and (
        (
          session_status in ('completed', 'partial')
          and session_rpe is not null
          and session_rpe between 1 and 10
        )
        or (
          session_status = 'skipped'
          and session_rpe is null
        )
      )
      and (
        pain_location is null
        or pain_location in (
          'head',
          'neck',
          'shoulder',
          'chest_ribs',
          'abdomen',
          'upper_back',
          'lower_back',
          'pelvis_sacrum',
          'arm',
          'elbow',
          'wrist_hand',
          'hip_groin',
          'buttock',
          'thigh',
          'knee',
          'lower_leg',
          'ankle_achilles',
          'foot',
          'other'
        )
      )
      and (
        pain_side is null
        or pain_side in ('left', 'right', 'bilateral', 'central')
      )
      and (pain_side is null or pain_location is not null)
      and (
        pain_score <> 0
        or (pain_location is null and pain_side is null)
      )
    )
  ) not valid;

-- Constraint 2: optional feedback is non-whitespace and 1-2000 chars after trim.
alter table public.plan_session_feedback
  add constraint plan_session_feedback_feedback_text_valid
  check (
    feedback_text is null
    or (
      feedback_text ~ '[^[:space:]]'
      and length(
        regexp_replace(
          feedback_text,
          '^[[:space:]]+|[[:space:]]+$',
          '',
          'g'
        )
      ) between 1 and 2000
    )
  ) not valid;

-- Constraint 3: each row has a complete outcome or non-empty feedback text.
-- Constraint 1 guarantees that non-NULL session_status implies completeness.
alter table public.plan_session_feedback
  add constraint plan_session_feedback_has_content
  check (
    session_status is not null
    or (
      feedback_text is not null
      and feedback_text ~ '[^[:space:]]'
    )
  ) not valid;

-- The validated replacement constraints are in place before relaxing legacy text.
alter table public.plan_session_feedback
  drop constraint plan_session_feedback_feedback_text_check,
  alter column feedback_text drop not null;

-- Deterministic client ACL: coach route reads plan_session_feedback directly
-- as authenticated under RLS; public athlete writes stay RPC-only.
-- Supabase Cloud legacy projects carry full DML grants for anon and
-- authenticated, so revoke everything first, then grant SELECT only.
revoke all on table public.plan_session_feedback from public;
revoke all on table public.plan_session_feedback from anon;
revoke all on table public.plan_session_feedback from authenticated;
grant select on table public.plan_session_feedback to authenticated;

-- A trigger is used instead of a time-dependent CHECK constraint.
create function public.enforce_plan_session_feedback_session_date_not_future()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.session_date is not null
     and new.session_date > (now() at time zone 'Europe/Warsaw')::date then
    raise exception 'session_date cannot be in the future'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

-- Trigger helpers are callable only by the table owner / trigger engine.
-- Never grant EXECUTE to anon/authenticated/PUBLIC for this helper.
revoke all on function public.enforce_plan_session_feedback_session_date_not_future()
  from public;
revoke all on function public.enforce_plan_session_feedback_session_date_not_future()
  from anon;
revoke all on function public.enforce_plan_session_feedback_session_date_not_future()
  from authenticated;

create trigger plan_session_feedback_session_date_not_future
  before insert or update of session_date
  on public.plan_session_feedback
  for each row
  execute function public.enforce_plan_session_feedback_session_date_not_future();

create index idx_plan_session_feedback_athlete_session_date
  on public.plan_session_feedback (athlete_id, session_date desc)
  where session_date is not null;

comment on table public.plan_session_feedback is
  'Athlete feedback and optional structured outcome bound to one concrete plan day.';
comment on column public.plan_session_feedback.feedback_text is
  'Optional plain-text athlete feedback; non-whitespace and 1-2000 characters after full whitespace trim.';
comment on column public.plan_session_feedback.session_date is
  'Athlete-supplied local session date; required for structured outcomes, has no default, and cannot be later than the current Europe/Warsaw date.';
comment on column public.plan_session_feedback.session_status is
  'Structured outcome status: completed, partial, or skipped.';
comment on column public.plan_session_feedback.session_rpe is
  'Session RPE: 1 = very easy, 10 = maximum effort; required for completed/partial and NULL for skipped.';
comment on column public.plan_session_feedback.wellbeing is
  'Athlete wellbeing: 1 = very poor, 5 = very good; required for structured outcomes.';
comment on column public.plan_session_feedback.pain_score is
  'Athlete-reported pain: 0 = no pain, 10 = maximum perceived pain; required for structured outcomes.';
comment on column public.plan_session_feedback.pain_location is
  'Optional controlled pain location: head, neck, shoulder, chest_ribs, abdomen, upper_back, lower_back, pelvis_sacrum, arm, elbow, wrist_hand, hip_groin, buttock, thigh, knee, lower_leg, ankle_achilles, foot, or other; NULL when pain is zero.';
comment on column public.plan_session_feedback.pain_side is
  'Optional pain laterality: left, right, bilateral, or central; NULL means not provided/not applicable, and central means a midline location rather than unspecified.';
comment on function public.enforce_plan_session_feedback_session_date_not_future() is
  'Rejects future session_date values using the Europe/Warsaw calendar date.';

-- Assert the intended schema end-state without changing policies or RPCs.
-- Client table grants are deterministically normalized above.
do $$
declare
  v_nullable_outcome_columns integer;
  v_outcome_constraints integer;
  v_policies integer;
begin
  select count(*)
  into v_nullable_outcome_columns
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'plan_session_feedback'
    and c.column_name in (
      'session_date',
      'session_status',
      'session_rpe',
      'wellbeing',
      'pain_score',
      'pain_location',
      'pain_side'
    )
    and c.is_nullable = 'YES'
    and c.column_default is null;

  if v_nullable_outcome_columns <> 7 then
    raise exception 'Outcome schema post-check failed: expected 7 nullable columns without defaults, found %',
      v_nullable_outcome_columns;
  end if;

  -- The three replacement constraints must exist; validation happens in
  -- 20260727120001_athlete_session_outcome_validate.sql.
  select count(*)
  into v_outcome_constraints
  from pg_constraint c
  where c.conrelid = 'public.plan_session_feedback'::regclass
    and c.conname in (
      'plan_session_feedback_outcome_complete',
      'plan_session_feedback_feedback_text_valid',
      'plan_session_feedback_has_content'
    )
    and c.contype = 'c';

  if v_outcome_constraints <> 3 then
    raise exception 'Outcome schema post-check failed: expected 3 replacement constraints, found %',
      v_outcome_constraints;
  end if;

  if exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.plan_session_feedback'::regclass
      and c.conname = 'plan_session_feedback_feedback_text_check'
      and c.contype = 'c'
  ) then
    raise exception 'Outcome schema post-check failed: legacy feedback_text check still present';
  end if;

  if not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'plan_session_feedback'
      and c.column_name = 'feedback_text'
      and c.is_nullable = 'YES'
  ) then
    raise exception 'Outcome schema post-check failed: feedback_text is still NOT NULL';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    where t.tgrelid = 'public.plan_session_feedback'::regclass
      and t.tgname = 'plan_session_feedback_session_date_not_future'
      and t.tgenabled <> 'D'
      and not t.tgisinternal
  ) then
    raise exception 'Outcome schema post-check failed: date trigger missing or disabled';
  end if;

  -- Trigger helper must not be callable by PUBLIC/anon/authenticated, must not
  -- be SECURITY DEFINER, and must keep its hardened search_path.
  if has_function_privilege(
    'public',
    'public.enforce_plan_session_feedback_session_date_not_future()',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.enforce_plan_session_feedback_session_date_not_future()',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.enforce_plan_session_feedback_session_date_not_future()',
    'execute'
  ) then
    raise exception 'Outcome schema post-check failed: date trigger helper is executable outside the owner';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'enforce_plan_session_feedback_session_date_not_future'
      and (p.prosecdef or p.proconfig is distinct from array['search_path=pg_catalog'])
  ) then
    raise exception 'Outcome schema post-check failed: date trigger helper attributes altered';
  end if;

  if not exists (
    select 1
    from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename = 'plan_session_feedback'
      and i.indexname = 'idx_plan_session_feedback_athlete_session_date'
      and i.indexdef ilike '%(athlete_id, session_date DESC)%'
      and i.indexdef ilike '%WHERE (session_date IS NOT NULL)%'
  ) then
    raise exception 'Outcome schema post-check failed: context index missing or wrong predicate/order';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'plan_session_feedback'
      and c.relrowsecurity
  ) then
    raise exception 'Outcome schema post-check failed: RLS is not enabled';
  end if;

  select count(*)
  into v_policies
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename = 'plan_session_feedback';

  if v_policies < 1 then
    raise exception 'Outcome schema post-check failed: no RLS policies on plan_session_feedback';
  end if;

  -- RLS surface unchanged: the coach read-only policy exists, no policy
  -- targets anon, and there is no client write policy. The USING expression
  -- is checked so a tampered qual (e.g. `true`) cannot pass.
  if not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'plan_session_feedback'
      and p.policyname = 'plan_session_feedback_select_own'
      and p.cmd = 'SELECT'
      and p.roles @> array['authenticated']::name[]
      and p.qual ilike '%coach_id = auth.uid()%'
  ) then
    raise exception 'Outcome schema post-check failed: coach read-only policy missing or altered';
  end if;

  if exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'plan_session_feedback'
      and (p.roles @> array['anon']::name[] or p.cmd in ('INSERT', 'UPDATE', 'DELETE'))
  ) then
    raise exception 'Outcome schema post-check failed: unexpected anon or write policy added';
  end if;

  -- Deterministic client ACL: anon has no table privileges; authenticated
  -- has SELECT only (coach reads under RLS, writes stay RPC-only).
  if exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'plan_session_feedback'
      and g.grantee = 'anon'
      and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Outcome schema post-check failed: anon table grant detected';
  end if;

  if not exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'plan_session_feedback'
      and g.grantee = 'authenticated'
      and g.privilege_type = 'SELECT'
  ) then
    raise exception 'Outcome schema post-check failed: authenticated SELECT grant missing';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'plan_session_feedback'
      and g.grantee = 'authenticated'
      and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Outcome schema post-check failed: authenticated write grant detected';
  end if;

  -- RPC surface unchanged.
  if to_regprocedure(
    'public.upsert_plan_session_feedback(character,uuid,integer,integer,text)'
  ) is null then
    raise exception 'Outcome schema post-check failed: upsert RPC signature changed';
  end if;

  if to_regprocedure(
    'public.get_plan_session_feedback_by_share_code(character,uuid,integer,integer)'
  ) is null then
    raise exception 'Outcome schema post-check failed: read RPC signature changed';
  end if;

  if not has_function_privilege(
    'anon',
    'public.upsert_plan_session_feedback(character,uuid,integer,integer,text)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.upsert_plan_session_feedback(character,uuid,integer,integer,text)',
    'execute'
  ) or not has_function_privilege(
    'anon',
    'public.get_plan_session_feedback_by_share_code(character,uuid,integer,integer)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.get_plan_session_feedback_by_share_code(character,uuid,integer,integer)',
    'execute'
  ) then
    raise exception 'Outcome schema post-check failed: RPC ACL regression detected';
  end if;
end;
$$;

commit;
