-- Cloud legacy ACL fixture (upgrade replay only).
-- Reproduces the production Supabase Cloud default grants observed on
-- public.plan_session_feedback before the outcome migration:
-- anon SELECT/INSERT/UPDATE/DELETE + authenticated SELECT/INSERT/UPDATE/DELETE.
-- Local Supabase stacks omit these defaults, so grant them explicitly here.
-- The outcome migration must normalize them deterministically instead of
-- failing the pre-check.

set client_min_messages to warning;

grant select, insert, update, delete on table public.plan_session_feedback to anon;
grant select, insert, update, delete on table public.plan_session_feedback to authenticated;

-- Fail fast when the preconditions for the upgrade replay are wrong.
do $$
begin
  if (
    select count(*)
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'plan_session_feedback'
      and g.grantee = 'anon'
      and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) <> 4 then
    raise exception 'CLOUD-ACL FIXTURE FAIL: anon legacy grants incomplete';
  end if;

  if (
    select count(*)
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'plan_session_feedback'
      and g.grantee = 'authenticated'
      and g.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) <> 4 then
    raise exception 'CLOUD-ACL FIXTURE FAIL: authenticated legacy grants incomplete';
  end if;
end;
$$;
