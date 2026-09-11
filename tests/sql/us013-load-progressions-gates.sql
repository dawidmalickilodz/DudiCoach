-- US-013 load progressions gate tests.
-- Covers: schema, functional unique index (case/whitespace-insensitive),
-- trigger, RLS (owner CRUD, cross-coach deny, anon deny via
-- request.jwt.claim.sub simulation), DB caps mirroring the API, source
-- default, cascade delete, realtime non-publication.
-- Runs on any replayed DB (clean or upgraded) AFTER fixtures are seeded.

set client_min_messages to warning;

-- Result table must be writable by `authenticated` blocks (G11/G12) and
-- readable by the postgres verdict block, so create it AS authenticated.
set role authenticated;
create temp table us013_result (name text primary key, status text not null default 'fail');
reset role;

do $$
declare
  v_coach_a uuid := 'c0000000-0000-0000-0000-000000000001';
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
    and c.table_name = 'load_progressions'
    and c.column_name in (
      'id', 'athlete_id', 'exercise_name', 'entry_date', 'weight_kg',
      'reps', 'sets', 'note', 'source', 'created_at', 'updated_at'
    );
  if v_n = 11 then
    insert into us013_result values ('g01_columns', 'pass');
  else
    insert into us013_result values ('g01_columns', 'columns=' || v_n);
  end if;

  -- G02: the functional unique index is the only non-PK index on the table
  -- (no redundant per-athlete index was added).
  select count(*) into v_n
  from pg_indexes i
  where i.schemaname = 'public' and i.tablename = 'load_progressions'
    and i.indexname <> 'load_progressions_pkey';
  if v_n = 1 then
    insert into us013_result values ('g02_index_count', 'pass');
  else
    insert into us013_result values ('g02_index_count', 'indexes=' || v_n);
  end if;

  if exists (
    select 1 from pg_indexes i
    where i.schemaname = 'public'
      and i.tablename = 'load_progressions'
      and i.indexname = 'load_progressions_unique_day'
      and i.indexdef ilike '%CREATE UNIQUE INDEX%lower(btrim(%entry_date%'
  ) then
    insert into us013_result values ('g02_unique_day_index', 'pass');
  else
    insert into us013_result values ('g02_unique_day_index', 'missing or wrong expression');
  end if;

  -- G03: BEFORE UPDATE ROW trigger calling extensions.moddatetime.
  select t.tgtype, p.proname into v_n, v_text
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
  where t.tgrelid = 'public.load_progressions'::regclass
    and t.tgname = 'load_progressions_updated_at'
    and not t.tgisinternal;
  -- tgtype bitmask: ROW=1, BEFORE=2, UPDATE=16 -> expect 1|2|16 = 19.
  if v_n is not null and v_n & 19 = 19 and v_text = 'moddatetime' then
    insert into us013_result values ('g03_trigger', 'pass');
  else
    insert into us013_result values ('g03_trigger', 'tgtype=' || coalesce(v_n::text, 'null') || ' fn=' || coalesce(v_text, 'null'));
  end if;

  -- G04: RLS enabled.
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'load_progressions' and c.relrowsecurity
  ) then
    insert into us013_result values ('g04_rls_enabled', 'pass');
  else
    insert into us013_result values ('g04_rls_enabled', 'not enabled');
  end if;

  -- G05: exactly 4 coach-owner policies, none for anon, none for write-bypass.
  select count(*) into v_n
  from pg_policies p
  where p.schemaname = 'public' and p.tablename = 'load_progressions';
  if v_n = 4 then
    insert into us013_result values ('g05_policy_count', 'pass');
  else
    insert into us013_result values ('g05_policy_count', 'policies=' || v_n);
  end if;

  if exists (
    select 1 from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'load_progressions'
      and (p.roles @> array['anon']::name[]
           or p.qual !~ 'coach_id = auth.uid\(\)'
           or p.with_check is not null and p.with_check !~ 'coach_id = auth.uid\(\)')
  ) then
    insert into us013_result values ('g05_policy_acl', 'anon or non-owner policy');
  else
    insert into us013_result values ('g05_policy_acl', 'pass');
  end if;

  -- G06: NOT published to realtime.
  select count(*) into v_n
  from pg_publication_tables pt
  where pt.schemaname = 'public' and pt.tablename = 'load_progressions';
  if v_n = 0 then
    insert into us013_result values ('g06_no_realtime', 'pass');
  else
    insert into us013_result values ('g06_no_realtime', 'published=' || v_n);
  end if;

  -- G07: check constraints - weight bounds and source values.
  begin
    insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg)
    values (v_athlete_b, 'Squat', '2026-08-19', 0);
    insert into us013_result values ('g07_weight_min_check', 'accepted weight 0');
  exception when check_violation then
    insert into us013_result values ('g07_weight_min_check', 'pass');
  end;

  begin
    insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg)
    values (v_athlete_b, 'Squat', '2026-08-19', 10000);
    insert into us013_result values ('g07_weight_max_check', 'accepted weight 10000');
  exception when check_violation then
    insert into us013_result values ('g07_weight_max_check', 'pass');
  end;

  begin
    insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg, source)
    values (v_athlete_b, 'Squat', '2026-08-19', 80, 'referee');
    insert into us013_result values ('g07_source_check', 'accepted invalid source');
  exception when check_violation then
    insert into us013_result values ('g07_source_check', 'pass');
  end;

  -- G08: source defaults to 'coach'; per-day uniqueness (raw, case-variant,
  -- leading/trailing whitespace variant) raises 23505.
  insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg)
  values (v_athlete_b, 'Squat', '2026-08-19', 80);
  select count(*) into v_n
  from public.load_progressions
  where athlete_id = v_athlete_b and exercise_name = 'Squat' and entry_date = '2026-08-19' and source = 'coach';
  if v_n = 1 then
    insert into us013_result values ('g08_source_default', 'pass');
  else
    insert into us013_result values ('g08_source_default', 'rows=' || v_n);
  end if;

  begin
    insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg)
    values (v_athlete_b, 'Squat', '2026-08-19', 82.5);
    insert into us013_result values ('g08_unique_day', 'duplicate accepted');
  exception when unique_violation then
    insert into us013_result values ('g08_unique_day', 'pass');
  end;

  begin
    insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg)
    values (v_athlete_b, 'squat', '2026-08-19', 82.5);
    insert into us013_result values ('g08_unique_case_insensitive', 'case variant accepted');
  exception when unique_violation then
    insert into us013_result values ('g08_unique_case_insensitive', 'pass');
  end;

  begin
    insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg)
    values (v_athlete_b, '  squat  ', '2026-08-19', 82.5);
    insert into us013_result values ('g08_unique_whitespace_insensitive', 'whitespace variant accepted');
  exception when unique_violation then
    insert into us013_result values ('g08_unique_whitespace_insensitive', 'pass');
  end;

  -- G09 is split out below (own transaction) so now() advances past created_at.
end;
$$;

-- G09: moddatetime touches updated_at on update (separate transactions so the
-- trigger's now() is later than the insert's transaction timestamp).
update public.load_progressions
set weight_kg = 85
where athlete_id = 'a0000000-0000-0000-0000-000000000003'
  and exercise_name = 'Squat' and entry_date = '2026-08-19';

do $$
declare
  v_n integer;
begin
  select count(*) into v_n
  from public.load_progressions
  where athlete_id = 'a0000000-0000-0000-0000-000000000003'
    and weight_kg = 85 and updated_at > created_at;
  if v_n = 1 then
    insert into us013_result values ('g09_updated_at_trigger', 'pass');
  else
    insert into us013_result values ('g09_updated_at_trigger', 'updated_at not touched');
  end if;
end;
$$;

-- G10: owner (coach A) full CRUD via RLS. The first row is KEPT (owned by
-- coach A) so G11 has something to try to read/mutate; the owner-delete
-- proof runs on a second row.
set role authenticated;
select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000001', false);
do $$
declare
  v_athlete_a uuid := 'a0000000-0000-0000-0000-000000000001';
  v_id uuid;
  v_n integer;
begin
  insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg, reps, sets, note)
  values (v_athlete_a, 'Martwy ciag', '2026-08-18', 100, '6', '3', 'RLS owner gate')
  returning id into v_id;

  select count(*) into v_n
  from public.load_progressions
  where id = v_id and weight_kg = 100 and source = 'coach';
  if v_n = 1 then
    insert into us013_result values ('g10_owner_insert_select', 'pass');
  else
    insert into us013_result values ('g10_owner_insert_select', 'rows=' || v_n);
  end if;

  update public.load_progressions
  set weight_kg = 105
  where id = v_id;
  select count(*) into v_n
  from public.load_progressions
  where id = v_id and weight_kg = 105;
  if v_n = 1 then
    insert into us013_result values ('g10_owner_update', 'pass');
  else
    insert into us013_result values ('g10_owner_update', 'rows=' || v_n);
  end if;

  insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg)
  values (v_athlete_a, 'Martwy ciag', '2026-08-19', 107.5);

  delete from public.load_progressions where entry_date = '2026-08-19';
  select count(*) into v_n from public.load_progressions where entry_date = '2026-08-19';
  if v_n = 0 then
    insert into us013_result values ('g10_owner_delete', 'pass');
  else
    insert into us013_result values ('g10_owner_delete', 'rows=' || v_n);
  end if;
end;
$$;
reset role;

-- G11: cross-coach deny - coach B sees zero rows of coach A and cannot write.
-- Coach A owns one row at this point (G10 kept it), so every deny gate here
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
  from public.load_progressions
  where athlete_id = v_athlete_a;
  if v_n = 0 then
    insert into us013_result values ('g11_cross_coach_select_denied', 'pass');
  else
    insert into us013_result values ('g11_cross_coach_select_denied', 'rows=' || v_n);
  end if;

  begin
    insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg)
    values (v_athlete_a, 'Zarzut', '2026-08-20', 40);
    insert into us013_result values ('g11_cross_coach_insert_denied', 'insert accepted');
  exception when insufficient_privilege or check_violation then
    insert into us013_result values ('g11_cross_coach_insert_denied', 'pass');
  end;

  update public.load_progressions set weight_kg = 1 where athlete_id = v_athlete_a;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    insert into us013_result values ('g11_cross_coach_update_denied', 'pass');
  else
    insert into us013_result values ('g11_cross_coach_update_denied', 'rows=' || v_n);
  end if;

  delete from public.load_progressions where athlete_id = v_athlete_a;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    insert into us013_result values ('g11_cross_coach_delete_denied', 'pass');
  else
    insert into us013_result values ('g11_cross_coach_delete_denied', 'rows=' || v_n);
  end if;
end;
$$;
reset role;

-- G11b: the coach-A row survived coach B's update/delete attempts (postgres view).
do $$
declare
  v_athlete_a uuid := 'a0000000-0000-0000-0000-000000000001';
  v_n integer;
begin
  select count(*) into v_n
  from public.load_progressions
  where athlete_id = v_athlete_a and exercise_name = 'Martwy ciag' and weight_kg = 105;
  if v_n = 1 then
    insert into us013_result values ('g11b_row_intact', 'pass');
  else
    insert into us013_result values ('g11b_row_intact', 'rows=' || v_n);
  end if;
end;
$$;

-- G12: anon has no table privileges; reads and writes are blocked at grant
-- level with insufficient_privilege.
do $$
declare
  v_n integer;
begin
  select count(*) into v_n
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'load_progressions'
    and grantee = 'anon'
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  if v_n = 0 then
    insert into us013_result values ('g12_anon_no_grants', 'pass');
  else
    insert into us013_result values ('g12_anon_no_grants', 'grants=' || v_n);
  end if;
end;
$$;

set role anon;
do $$
begin
  begin
    perform count(*) from public.load_progressions;
    raise exception 'ANON SELECT DENIED FAIL';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg)
    values ('a0000000-0000-0000-0000-000000000001', 'Squat', '2026-08-19', 80);
    raise exception 'ANON INSERT DENIED FAIL';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

-- G12b: authenticated has DML grants (PostgREST access path used by the API).
do $$
declare
  v_n integer;
begin
  select count(*) into v_n
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'load_progressions'
    and grantee = 'authenticated'
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE');
  if v_n = 4 then
    insert into us013_result values ('g12b_auth_grants', 'pass');
  else
    insert into us013_result values ('g12b_auth_grants', 'grants=' || v_n);
  end if;
end;
$$;

-- G13: cascade - deleting the athlete removes their entries.
do $$
declare
  v_athlete_b uuid := 'a0000000-0000-0000-0000-000000000003';
  v_n integer;
begin
  delete from public.athletes where id = v_athlete_b;
  select count(*) into v_n from public.load_progressions where athlete_id = v_athlete_b;
  if v_n = 0 then
    insert into us013_result values ('g13_cascade_delete', 'pass');
  else
    insert into us013_result values ('g13_cascade_delete', 'rows=' || v_n);
  end if;
end;
$$;

-- G14: DB caps mirror the API validation (exercise_name varchar(100),
-- weight_kg CHECK <= 9999.9) and are behaviorally enforced.
do $$
declare
  v_athlete_a uuid := 'a0000000-0000-0000-0000-000000000001';
  v_n integer;
begin
  select count(*) into v_n
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'load_progressions'
    and c.column_name in ('exercise_name', 'weight_kg', 'note');
  if v_n = 3 then
    insert into us013_result values ('g14_columns_present', 'pass');
  else
    insert into us013_result values ('g14_columns_present', 'columns=' || v_n);
  end if;

  select count(*) into v_n
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'load_progressions'
    and c.column_name = 'exercise_name'
    and c.character_maximum_length = 100;
  if v_n = 1 then
    insert into us013_result values ('g14_exercise_name_cap', 'pass');
  else
    insert into us013_result values ('g14_exercise_name_cap', 'exercise_name max length=' || coalesce(
      (select c.character_maximum_length::text from information_schema.columns c
       where c.table_schema = 'public' and c.table_name = 'load_progressions' and c.column_name = 'exercise_name'),
      'none'));
  end if;

  begin
    insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg)
    values (v_athlete_a, repeat('x', 101), '2026-08-20', 50);
    insert into us013_result values ('g14b_exercise_name_too_long_rejected', 'insert accepted');
  exception when sqlstate '22001' then
    insert into us013_result values ('g14b_exercise_name_too_long_rejected', 'pass');
  end;

  begin
    insert into public.load_progressions (athlete_id, exercise_name, entry_date, weight_kg)
    values (v_athlete_a, 'Squat', '2026-08-20', 9999.95);
    insert into us013_result values ('g14c_weight_too_large_rejected', 'insert accepted');
  exception when check_violation then
    insert into us013_result values ('g14c_weight_too_large_rejected', 'pass');
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
  from us013_result
  where status <> 'pass';

  if v_failures is not null then
    raise exception 'US-013 GATE TESTS FAILED:%', E'\n' || v_failures;
  end if;
end;
$$;

drop table us013_result;