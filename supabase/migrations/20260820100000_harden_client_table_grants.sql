-- Migration: harden direct client table grants (Lane C forward-fix).
-- Scope: deterministic least-privilege ACL for plan_session_feedback,
-- diagnostic_findings, and load_progressions. Idempotent normalization for
-- environments where earlier migrations ran with legacy Supabase Cloud
-- default grants (anon/authenticated full DML) or with the older
-- anon-SELECT grants on the two new tables.
--
-- Target ACL:
--   plan_session_feedback: anon none, authenticated SELECT only
--     (coach reads under RLS; athlete writes stay RPC-only).
--   diagnostic_findings: anon none, authenticated SELECT/INSERT/UPDATE/DELETE
--     (coach-only direct PostgREST under RLS).
--   load_progressions: anon none, authenticated SELECT/INSERT/UPDATE/DELETE
--     (coach-only direct PostgREST under RLS).
-- RLS policies are unchanged by this migration.

begin;

-- Bound catalog-lock waits; grant changes are fast metadata operations.
set local lock_timeout = '10s';

-- Fail fast without leaking data when run out of order.
do $$
begin
  if to_regclass('public.plan_session_feedback') is null then
    raise exception 'Required table public.plan_session_feedback is missing';
  end if;
  if to_regclass('public.diagnostic_findings') is null then
    raise exception 'Required table public.diagnostic_findings is missing';
  end if;
  if to_regclass('public.load_progressions') is null then
    raise exception 'Required table public.load_progressions is missing';
  end if;
end;
$$;

revoke all on table public.plan_session_feedback from public;
revoke all on table public.plan_session_feedback from anon;
revoke all on table public.plan_session_feedback from authenticated;
grant select on table public.plan_session_feedback to authenticated;

revoke all on table public.diagnostic_findings from public;
revoke all on table public.diagnostic_findings from anon;
revoke all on table public.diagnostic_findings from authenticated;
grant select, insert, update, delete on table public.diagnostic_findings to authenticated;

revoke all on table public.load_progressions from public;
revoke all on table public.load_progressions from anon;
revoke all on table public.load_progressions from authenticated;
grant select, insert, update, delete on table public.load_progressions to authenticated;

-- RLS policy subqueries read athletes.coach_id as authenticated; keep the
-- explicit grant idempotent for local stacks without cloud defaults.
grant select on table public.athletes to authenticated;

-- Assert the intended end-state.
do $$
begin
  -- plan_session_feedback: anon none.
  if exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'plan_session_feedback'
      and g.grantee = 'anon'
      and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Grant hardening failed: anon grant on plan_session_feedback';
  end if;

  -- plan_session_feedback: authenticated SELECT only.
  if not exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'plan_session_feedback'
      and g.grantee = 'authenticated'
      and g.privilege_type = 'SELECT'
  ) then
    raise exception 'Grant hardening failed: authenticated SELECT missing on plan_session_feedback';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'plan_session_feedback'
      and g.grantee = 'authenticated'
      and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Grant hardening failed: authenticated write grant on plan_session_feedback';
  end if;

  -- diagnostic_findings: anon none, authenticated full CRUD.
  if exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'diagnostic_findings'
      and g.grantee = 'anon'
      and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Grant hardening failed: anon grant on diagnostic_findings';
  end if;

  if (
    select count(*)
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'diagnostic_findings'
      and g.grantee = 'authenticated'
      and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) <> 4 then
    raise exception 'Grant hardening failed: authenticated CRUD incomplete on diagnostic_findings';
  end if;

  -- load_progressions: anon none, authenticated full CRUD.
  if exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'load_progressions'
      and g.grantee = 'anon'
      and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) then
    raise exception 'Grant hardening failed: anon grant on load_progressions';
  end if;

  if (
    select count(*)
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'load_progressions'
      and g.grantee = 'authenticated'
      and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) <> 4 then
    raise exception 'Grant hardening failed: authenticated CRUD incomplete on load_progressions';
  end if;

  -- RLS must stay enabled with the existing coach-only policies.
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'plan_session_feedback'
      and c.relrowsecurity
  ) then
    raise exception 'Grant hardening failed: RLS disabled on plan_session_feedback';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'diagnostic_findings'
      and c.relrowsecurity
  ) then
    raise exception 'Grant hardening failed: RLS disabled on diagnostic_findings';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'load_progressions'
      and c.relrowsecurity
  ) then
    raise exception 'Grant hardening failed: RLS disabled on load_progressions';
  end if;

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
    raise exception 'Grant hardening failed: coach policy missing on plan_session_feedback';
  end if;
end;
$$;

commit;
