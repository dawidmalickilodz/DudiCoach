-- Migration: RPC privilege hardening (Lane C)
-- Scope: function EXECUTE grants/revokes only

begin;

-- reset_share_code: authenticated only
revoke execute on function public.reset_share_code(uuid) from public;
revoke execute on function public.reset_share_code(uuid) from anon;
grant execute on function public.reset_share_code(uuid) to authenticated;

-- public share RPCs: explicit anon/authenticated, no implicit PUBLIC
revoke execute on function public.get_athlete_by_share_code(char) from public;
grant execute on function public.get_athlete_by_share_code(char) to anon;
grant execute on function public.get_athlete_by_share_code(char) to authenticated;

revoke execute on function public.get_active_injuries_by_share_code(char) from public;
grant execute on function public.get_active_injuries_by_share_code(char) to anon;
grant execute on function public.get_active_injuries_by_share_code(char) to authenticated;

revoke execute on function public.get_latest_plan_by_share_code(char) from public;
grant execute on function public.get_latest_plan_by_share_code(char) to anon;
grant execute on function public.get_latest_plan_by_share_code(char) to authenticated;

-- generate_share_code: remove anon/public surface, preserve needed execution paths
revoke execute on function public.generate_share_code() from public;
revoke execute on function public.generate_share_code() from anon;
grant execute on function public.generate_share_code() to authenticated;

commit;