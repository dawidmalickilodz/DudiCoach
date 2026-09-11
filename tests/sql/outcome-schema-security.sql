-- Schema/ACL/RLS security assertions for the athlete session outcome schema.
-- Runs on any replayed DB (clean or upgraded) AFTER the fixtures are seeded.
-- Fails hard (ON_ERROR_STOP + raised exceptions) when an assertion is false.

set client_min_messages to warning;

do $$
declare
  v_nullable integer;
  v_validated integer;
  v_policies integer;
begin
  -- 1. Outcome columns: all nullable, no defaults.
  select count(*)
  into v_nullable
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'plan_session_feedback'
    and c.column_name in (
      'session_date', 'session_status', 'session_rpe', 'wellbeing',
      'pain_score', 'pain_location', 'pain_side'
    )
    and c.is_nullable = 'YES'
    and c.column_default is null;

  if v_nullable <> 7 then
    raise exception 'SECURITY-ASSERT 1 FAIL: expected 7 nullable columns without defaults, found %', v_nullable;
  end if;

  -- 2. All three replacement constraints validated.
  select count(*)
  into v_validated
  from pg_constraint c
  where c.conrelid = 'public.plan_session_feedback'::regclass
    and c.conname in (
      'plan_session_feedback_outcome_complete',
      'plan_session_feedback_feedback_text_valid',
      'plan_session_feedback_has_content'
    )
    and c.contype = 'c'
    and c.convalidated;

  if v_validated <> 3 then
    raise exception 'SECURITY-ASSERT 2 FAIL: expected 3 validated constraints, found %', v_validated;
  end if;

  -- 3. Legacy check constraint removed; feedback_text nullable.
  if exists (
    select 1 from pg_constraint c
    where c.conrelid = 'public.plan_session_feedback'::regclass
      and c.conname = 'plan_session_feedback_feedback_text_check'
      and c.contype = 'c'
  ) then
    raise exception 'SECURITY-ASSERT 3 FAIL: legacy feedback_text check still present';
  end if;

  if exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'plan_session_feedback'
      and c.column_name = 'feedback_text'
      and c.is_nullable = 'NO'
  ) then
    raise exception 'SECURITY-ASSERT 3 FAIL: feedback_text is NOT NULL';
  end if;

  -- 4. Date trigger enabled; helper not callable by client roles.
  if not exists (
    select 1 from pg_trigger t
    where t.tgrelid = 'public.plan_session_feedback'::regclass
      and t.tgname = 'plan_session_feedback_session_date_not_future'
      and t.tgenabled <> 'D'
      and not t.tgisinternal
  ) then
    raise exception 'SECURITY-ASSERT 4 FAIL: date trigger missing or disabled';
  end if;

  if has_function_privilege(
    'public', 'public.enforce_plan_session_feedback_session_date_not_future()', 'execute'
  ) or has_function_privilege(
    'anon', 'public.enforce_plan_session_feedback_session_date_not_future()', 'execute'
  ) or has_function_privilege(
    'authenticated', 'public.enforce_plan_session_feedback_session_date_not_future()', 'execute'
  ) then
    raise exception 'SECURITY-ASSERT 4 FAIL: date trigger helper executable by client roles';
  end if;

  -- 4b. Helper attributes: SECURITY INVOKER (no prosecdef) and hardened search_path.
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'enforce_plan_session_feedback_session_date_not_future'
      and (p.prosecdef or p.proconfig is distinct from array['search_path=pg_catalog'])
  ) then
    raise exception 'SECURITY-ASSERT 4b FAIL: date trigger helper attributes altered';
  end if;

  -- 5. Partial context index with exact predicate and column order.
  if not exists (
    select 1 from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename = 'plan_session_feedback'
      and i.indexname = 'idx_plan_session_feedback_athlete_session_date'
      and i.indexdef ilike '%(athlete_id, session_date DESC)%'
      and i.indexdef ilike '%WHERE (session_date IS NOT NULL)%'
  ) then
    raise exception 'SECURITY-ASSERT 5 FAIL: context index missing or wrong predicate/order';
  end if;

  -- 6. RLS enabled; exactly the coach read-only policy; no anon/write policy.
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'plan_session_feedback' and c.relrowsecurity
  ) then
    raise exception 'SECURITY-ASSERT 6 FAIL: RLS not enabled';
  end if;

  select count(*) into v_policies
  from pg_policies p
  where p.schemaname = 'public' and p.tablename = 'plan_session_feedback';

  if v_policies <> 1 then
    raise exception 'SECURITY-ASSERT 6 FAIL: expected exactly 1 policy, found %', v_policies;
  end if;

  if not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'plan_session_feedback'
      and p.policyname = 'plan_session_feedback_select_own'
      and p.cmd = 'SELECT'
      and p.roles @> array['authenticated']::name[]
      and p.qual ilike '%coach_id = auth.uid()%'
  ) then
    raise exception 'SECURITY-ASSERT 6 FAIL: coach read-only policy missing, altered, or qual tampered';
  end if;

  if exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'plan_session_feedback'
      and (p.roles @> array['anon']::name[] or p.cmd in ('INSERT', 'UPDATE', 'DELETE'))
  ) then
    raise exception 'SECURITY-ASSERT 6 FAIL: unexpected anon or write policy added';
  end if;

  -- 7. Deterministic client ACL: anon has no table access; authenticated
  -- has SELECT only (coach reads under RLS, writes stay RPC-only).
  if exists (
    select 1 from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'plan_session_feedback'
      and (
        (g.grantee = 'anon' and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE'))
        or (g.grantee = 'authenticated' and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE'))
      )
  ) then
    raise exception 'SECURITY-ASSERT 7 FAIL: unexpected direct table grant for client role detected';
  end if;

  if not exists (
    select 1 from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'plan_session_feedback'
      and g.grantee = 'authenticated'
      and g.privilege_type = 'SELECT'
  ) then
    raise exception 'SECURITY-ASSERT 7 FAIL: authenticated SELECT grant missing';
  end if;

  -- 8. RPC signatures and ACLs unchanged.
  if to_regprocedure('public.upsert_plan_session_feedback(character,uuid,integer,integer,text)') is null then
    raise exception 'SECURITY-ASSERT 8 FAIL: upsert RPC signature changed';
  end if;
  if to_regprocedure('public.get_plan_session_feedback_by_share_code(character,uuid,integer,integer)') is null then
    raise exception 'SECURITY-ASSERT 8 FAIL: read RPC signature changed';
  end if;
  if has_function_privilege('public', 'public.upsert_plan_session_feedback(character,uuid,integer,integer,text)', 'execute')
     or has_function_privilege('public', 'public.get_plan_session_feedback_by_share_code(character,uuid,integer,integer)', 'execute') then
    raise exception 'SECURITY-ASSERT 8 FAIL: RPC executable by PUBLIC';
  end if;
  if not has_function_privilege('anon', 'public.upsert_plan_session_feedback(character,uuid,integer,integer,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.upsert_plan_session_feedback(character,uuid,integer,integer,text)', 'execute')
     or not has_function_privilege('anon', 'public.get_plan_session_feedback_by_share_code(character,uuid,integer,integer)', 'execute')
     or not has_function_privilege('authenticated', 'public.get_plan_session_feedback_by_share_code(character,uuid,integer,integer)', 'execute') then
    raise exception 'SECURITY-ASSERT 8 FAIL: RPC ACL regression (anon/authenticated execute lost)';
  end if;

  -- 8b. RPC attributes unchanged: SECURITY DEFINER with search_path = public.
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'upsert_plan_session_feedback',
        'get_plan_session_feedback_by_share_code'
      )
      and (not p.prosecdef or p.proconfig is distinct from array['search_path=public'])
  ) then
    raise exception 'SECURITY-ASSERT 8b FAIL: RPC SECURITY DEFINER/search_path regression';
  end if;
end;
$$;

-- Behavioral ACL checks: anon cannot touch the table; authenticated SELECT is RLS-gated.
-- Session-level set role: a failed role switch raises immediately instead of
-- being swallowed by the insufficient_privilege handler below.
set role anon;
do $$
begin
  begin
    perform count(*) from public.plan_session_feedback;
    raise exception 'SECURITY-ASSERT 9 FAIL: anon can select the table directly';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

set role authenticated;
do $$
declare
  v_n integer;
begin
  select count(*) into v_n from public.plan_session_feedback;
  if v_n <> 0 then
    raise exception 'SECURITY-ASSERT 10 FAIL: unauthenticated JWT context bypassed RLS: % rows', v_n;
  end if;
end;
$$;
reset role;

-- Public write path still works via the upsert RPC (text-only, unchanged).
set role anon;
do $$
declare
  v_id uuid;
  v_text text;
  v_rows integer;
begin
  select t.id into v_id
  from public.upsert_plan_session_feedback('ABCDEF', 'e0000000-0000-0000-0000-000000000001', 2, 3, 'rpc legacy text') t;

  if v_id is null then
    raise exception 'SECURITY-ASSERT 11 FAIL: upsert RPC returned no row';
  end if;

  select t.feedback_text into v_text
  from public.get_plan_session_feedback_by_share_code('ABCDEF', 'e0000000-0000-0000-0000-000000000001', 2, 3) t;

  if v_text is distinct from 'rpc legacy text' then
    raise exception 'SECURITY-ASSERT 11 FAIL: read RPC mismatch: %', v_text;
  end if;

  select count(*) into v_rows
  from public.get_plan_session_feedback_by_share_code('ZZZZZZ', 'e0000000-0000-0000-0000-000000000001', 2, 3);

  if v_rows <> 0 then
    raise exception 'SECURITY-ASSERT 11 FAIL: read RPC returned rows for unknown share code';
  end if;
end;
$$;
reset role;

-- The RPC-written row must have only text columns set (no outcome fields).
do $$
declare
  v_outcome_set integer;
begin
  select count(*) into v_outcome_set
  from public.plan_session_feedback
  where id = (
    select id from public.plan_session_feedback
    where plan_id = 'e0000000-0000-0000-0000-000000000001'
      and week_number = 2 and day_number = 3
    order by created_at desc limit 1
  )
  and session_date is null and session_status is null and session_rpe is null
  and wellbeing is null and pain_score is null and pain_location is null
  and pain_side is null;

  if v_outcome_set <> 1 then
    raise exception 'SECURITY-ASSERT 12 FAIL: RPC path wrote unexpected outcome fields';
  end if;
end;
$$;