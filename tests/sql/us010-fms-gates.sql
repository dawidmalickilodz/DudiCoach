-- US-010 FMS diagnostics gate tests.
-- Covers: schema, constraints, trigger, index, RLS (owner CRUD, cross-coach
-- deny, anon deny via request.jwt.claim.sub simulation), unique conflict,
-- cascade delete, realtime non-publication.
-- Runs on any replayed DB (clean or upgraded) AFTER fixtures are seeded.

set client_min_messages to warning;

-- Result table must be writable by `authenticated` blocks (G11/G12) and
-- readable by the postgres verdict block, so create it AS authenticated.
set role authenticated;
create temp table us010_result (name text primary key, status text not null default 'fail');
reset role;

do $$
declare
  v_coach_a uuid := 'c0000000-0000-0000-0000-000000000001';
  v_coach_b uuid := 'c0000000-0000-0000-0000-000000000003';
  v_athlete_a uuid := 'a0000000-0000-0000-0000-000000000001';
  v_athlete_b uuid := 'a0000000-0000-0000-0000-000000000003';
  v_n integer;
  v_id uuid;
  v_text text;
begin
  -- G01: all required columns exist.
  select count(*) into v_n
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'diagnostic_findings'
    and c.column_name in (
      'id', 'athlete_id', 'muscle_key', 'side', 'severity',
      'notes', 'observed_at', 'created_at', 'updated_at'
    );
  if v_n = 9 then
    insert into us010_result values ('g01_columns', 'pass');
  else
    insert into us010_result values ('g01_columns', 'columns=' || v_n);
  end if;

  -- G02: unique constraint covers exactly (athlete_id, muscle_key, side).
  select array_agg(a.attname order by a.attnum) into v_text
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conrelid = 'public.diagnostic_findings'::regclass
    and c.conname = 'diagnostic_findings_unique_current'
    and c.contype = 'u';
  if v_text = '{athlete_id,muscle_key,side}' then
    insert into us010_result values ('g02_unique_constraint', 'pass');
  else
    insert into us010_result values ('g02_unique_constraint', 'keys=' || coalesce(v_text, 'missing'));
  end if;

  -- G03: index (athlete_id, observed_at desc).
  if exists (
    select 1 from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename = 'diagnostic_findings'
      and i.indexname = 'idx_diagnostic_findings_athlete_observed'
      and i.indexdef ilike '%(athlete_id, observed_at DESC)%'
  ) then
    insert into us010_result values ('g03_index', 'pass');
  else
    insert into us010_result values ('g03_index', 'missing or wrong order');
  end if;

  -- G04: BEFORE UPDATE ROW trigger calling extensions.moddatetime.
  select t.tgtype, p.proname into v_n, v_text
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
  where t.tgrelid = 'public.diagnostic_findings'::regclass
    and t.tgname = 'diagnostic_findings_updated_at'
    and not t.tgisinternal;
  -- tgtype bitmask: ROW=1, BEFORE=2, UPDATE=16 -> expect 1|2|16 = 19.
  if v_n is not null and v_n & 19 = 19 and v_text = 'moddatetime' then
    insert into us010_result values ('g04_trigger', 'pass');
  else
    insert into us010_result values ('g04_trigger', 'tgtype=' || coalesce(v_n::text, 'null') || ' fn=' || coalesce(v_text, 'null'));
  end if;

  -- G05: RLS enabled.
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'diagnostic_findings' and c.relrowsecurity
  ) then
    insert into us010_result values ('g05_rls_enabled', 'pass');
  else
    insert into us010_result values ('g05_rls_enabled', 'not enabled');
  end if;

  -- G06: exactly 4 coach-owner policies, none for anon, none for write-bypass.
  select count(*) into v_n
  from pg_policies p
  where p.schemaname = 'public' and p.tablename = 'diagnostic_findings';
  if v_n = 4 then
    insert into us010_result values ('g06_policy_count', 'pass');
  else
    insert into us010_result values ('g06_policy_count', 'policies=' || v_n);
  end if;

  if exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'diagnostic_findings'
      and (p.roles @> array['anon']::name[]
           or p.qual !~ 'coach_id = auth.uid\(\)'
           or p.with_check is not null and p.with_check !~ 'coach_id = auth.uid\(\)')
  ) then
    insert into us010_result values ('g06_policy_acl', 'anon or non-owner policy');
  else
    insert into us010_result values ('g06_policy_acl', 'pass');
  end if;

  -- G07: NOT published to realtime.
  select count(*) into v_n
  from pg_publication_tables pt
  where pt.schemaname = 'public' and pt.tablename = 'diagnostic_findings';
  if v_n = 0 then
    insert into us010_result values ('g07_no_realtime', 'pass');
  else
    insert into us010_result values ('g07_no_realtime', 'published=' || v_n);
  end if;

  -- G08: check constraints reject invalid side/severity.
  begin
    insert into public.diagnostic_findings (athlete_id, muscle_key, side, severity)
    values (v_athlete_b, 'anterior_deltoid', 'middle', 'weak');
    insert into us010_result values ('g08_side_check', 'accepted invalid side');
  exception when check_violation then
    insert into us010_result values ('g08_side_check', 'pass');
  end;

  begin
    insert into public.diagnostic_findings (athlete_id, muscle_key, side, severity)
    values (v_athlete_b, 'anterior_deltoid', 'left', 'perfect');
    insert into us010_result values ('g08_severity_check', 'accepted invalid severity');
  exception when check_violation then
    insert into us010_result values ('g08_severity_check', 'pass');
  end;

  -- G09: unique conflict on (athlete, muscle, side) raises 23505.
  insert into public.diagnostic_findings (athlete_id, muscle_key, side, severity, observed_at)
  values (v_athlete_b, 'anterior_deltoid', 'left', 'weak', '2026-08-19');
  begin
    insert into public.diagnostic_findings (athlete_id, muscle_key, side, severity, observed_at)
    values (v_athlete_b, 'anterior_deltoid', 'left', 'very_weak', '2026-08-20');
    insert into us010_result values ('g09_unique_conflict', 'duplicate accepted');
  exception when unique_violation then
    insert into us010_result values ('g09_unique_conflict', 'pass');
  end;

  -- G10 is split out below (own transaction) so now() advances past created_at.
end;
$$;

-- G10: moddatetime touches updated_at on update (separate transactions so the
-- trigger's now() is later than the insert's transaction timestamp).
update public.diagnostic_findings
set severity = 'very_weak'
where athlete_id = 'a0000000-0000-0000-0000-000000000003'
  and muscle_key = 'anterior_deltoid' and side = 'left';

do $$
declare
  v_n integer;
begin
  select count(*) into v_n
  from public.diagnostic_findings
  where athlete_id = 'a0000000-0000-0000-0000-000000000003'
    and severity = 'very_weak' and updated_at > created_at;
  if v_n = 1 then
    insert into us010_result values ('g10_updated_at_trigger', 'pass');
  else
    insert into us010_result values ('g10_updated_at_trigger', 'updated_at not touched');
  end if;
end;
$$;

-- G11: owner (coach A) full CRUD via RLS. The first row is KEPT (owned by
-- coach A) so G12 has something to try to read/mutate; the owner-delete
-- proof runs on a second row.
set role authenticated;
select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000001', false);
do $$
declare
  v_athlete_a uuid := 'a0000000-0000-0000-0000-000000000001';
  v_id uuid;
  v_n integer;
begin
  insert into public.diagnostic_findings (athlete_id, muscle_key, side, severity, notes, observed_at)
  values (v_athlete_a, 'supraspinatus', 'right', 'dysfunction', 'RLS owner gate', '2026-08-19')
  returning id into v_id;

  select count(*) into v_n
  from public.diagnostic_findings
  where id = v_id and severity = 'dysfunction';
  if v_n = 1 then
    insert into us010_result values ('g11_owner_insert_select', 'pass');
  else
    insert into us010_result values ('g11_owner_insert_select', 'rows=' || v_n);
  end if;

  update public.diagnostic_findings
  set severity = 'weak'
  where id = v_id;
  select count(*) into v_n
  from public.diagnostic_findings
  where id = v_id and severity = 'weak';
  if v_n = 1 then
    insert into us010_result values ('g11_owner_update', 'pass');
  else
    insert into us010_result values ('g11_owner_update', 'rows=' || v_n);
  end if;

  insert into public.diagnostic_findings (athlete_id, muscle_key, side, severity)
  values (v_athlete_a, 'lateral_deltoid', 'right', 'very_weak');

  delete from public.diagnostic_findings where muscle_key = 'lateral_deltoid';
  select count(*) into v_n from public.diagnostic_findings where muscle_key = 'lateral_deltoid';
  if v_n = 0 then
    insert into us010_result values ('g11_owner_delete', 'pass');
  else
    insert into us010_result values ('g11_owner_delete', 'rows=' || v_n);
  end if;
end;
$$;
reset role;

-- G12: cross-coach deny - coach B sees zero rows of coach A and cannot write.
-- Coach A owns one row at this point (G11 kept it), so every deny gate here
-- discriminates a real row: read must see 0, mutations must touch 0 rows,
-- and the row must survive both attempts (verified as postgres below).
set role authenticated;
select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000003', false);
do $$
declare
  v_athlete_a uuid := 'a0000000-0000-0000-0000-000000000001';
  v_n integer;
begin
  select count(*) into v_n
  from public.diagnostic_findings
  where athlete_id = v_athlete_a;
  if v_n = 0 then
    insert into us010_result values ('g12_cross_coach_select_denied', 'pass');
  else
    insert into us010_result values ('g12_cross_coach_select_denied', 'rows=' || v_n);
  end if;

  begin
    insert into public.diagnostic_findings (athlete_id, muscle_key, side, severity)
    values (v_athlete_a, 'soleus', 'left', 'weak');
    insert into us010_result values ('g12_cross_coach_insert_denied', 'insert accepted');
  exception when insufficient_privilege or check_violation then
    insert into us010_result values ('g12_cross_coach_insert_denied', 'pass');
  end;

  update public.diagnostic_findings set severity = 'weak' where athlete_id = v_athlete_a;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    insert into us010_result values ('g12_cross_coach_update_denied', 'pass');
  else
    insert into us010_result values ('g12_cross_coach_update_denied', 'rows=' || v_n);
  end if;

  delete from public.diagnostic_findings where athlete_id = v_athlete_a;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    insert into us010_result values ('g12_cross_coach_delete_denied', 'pass');
  else
    insert into us010_result values ('g12_cross_coach_delete_denied', 'rows=' || v_n);
  end if;
end;
$$;
reset role;

-- G12b: the coach-A row survived coach B's update/delete attempts (postgres view).
do $$
declare
  v_athlete_a uuid := 'a0000000-0000-0000-0000-000000000001';
  v_n integer;
begin
  select count(*) into v_n
  from public.diagnostic_findings
  where athlete_id = v_athlete_a and muscle_key = 'supraspinatus' and severity = 'weak';
  if v_n = 1 then
    insert into us010_result values ('g12b_row_intact', 'pass');
  else
    insert into us010_result values ('g12b_row_intact', 'rows=' || v_n);
  end if;
end;
$$;

-- G13: anon has no table privileges; reads and writes are blocked at grant
-- level with insufficient_privilege.
do $$
declare
  v_n integer;
begin
  select count(*) into v_n
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'diagnostic_findings'
    and grantee = 'anon'
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  if v_n = 0 then
    insert into us010_result values ('g13_anon_no_grants', 'pass');
  else
    insert into us010_result values ('g13_anon_no_grants', 'grants=' || v_n);
  end if;
end;
$$;

set role anon;
do $$
begin
  begin
    perform count(*) from public.diagnostic_findings;
    raise exception 'ANON SELECT DENIED FAIL';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.diagnostic_findings (athlete_id, muscle_key, side, severity)
    values ('a0000000-0000-0000-0000-000000000001', 'soleus', 'left', 'weak');
    raise exception 'ANON INSERT DENIED FAIL';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- G13b: authenticated has DML grants (PostgREST access path used by the API).
do $$
declare
  v_n integer;
begin
  select count(*) into v_n
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'diagnostic_findings'
    and grantee = 'authenticated'
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  if v_n = 4 then
    insert into us010_result values ('g13b_auth_grants', 'pass');
  else
    insert into us010_result values ('g13b_auth_grants', 'grants=' || v_n);
  end if;
end;
$$;

-- G14: cascade - deleting the athlete removes their findings.
do $$
declare
  v_athlete_b uuid := 'a0000000-0000-0000-0000-000000000003';
  v_n integer;
begin
  delete from public.athletes where id = v_athlete_b;
  select count(*) into v_n from public.diagnostic_findings where athlete_id = v_athlete_b;
  if v_n = 0 then
    insert into us010_result values ('g14_cascade_delete', 'pass');
  else
    insert into us010_result values ('g14_cascade_delete', 'rows=' || v_n);
  end if;
end;
$$;

-- G15: notes column capped at 1000 chars (matches API validation; direct
-- PostgREST writes cannot exceed the cap either).
do $$
declare
  v_n integer;
begin
  select count(*) into v_n
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'diagnostic_findings'
    and c.column_name = 'notes'
    and c.character_maximum_length = 1000;
  if v_n = 1 then
    insert into us010_result values ('g15_notes_length_cap', 'pass');
  else
    insert into us010_result values ('g15_notes_length_cap', 'notes max length=' || coalesce(
      (select c.character_maximum_length::text from information_schema.columns c
       where c.table_schema = 'public' and c.table_name = 'diagnostic_findings' and c.column_name = 'notes'),
      'none'));
  end if;

  begin
    insert into public.diagnostic_findings (athlete_id, muscle_key, side, severity, notes)
    values ('a0000000-0000-0000-0000-000000000001', 'soleus', 'left', 'weak', repeat('x', 1001));
    insert into us010_result values ('g15b_notes_too_long_rejected', 'insert accepted');
  exception when sqlstate '22001' then
    insert into us010_result values ('g15b_notes_too_long_rejected', 'pass');
  end;
end;
$$;

-- Final verdict: any non-pass case fails the run.
do $$
declare
  v_failures text;
begin
  select string_agg(name || ': ' || status, E'\n')
  into v_failures
  from us010_result
  where status <> 'pass';

  if v_failures is not null then
    raise exception 'US-010 GATE TESTS FAILED:%', E'\n' || v_failures;
  end if;
end;
$$;

drop table us010_result;