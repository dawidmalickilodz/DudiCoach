-- Migration: US-025 - public RPC for latest training plan by share_code
-- Applied: 2026-04-24
-- Story: US-025 Athlete Public Panel: Training Plan Display
-- Design: docs/design/US-025-design.md

-- ---------------------------------------------------------------------------
-- Public RPC: get_latest_plan_by_share_code(p_code)
--
-- SECURITY DEFINER function used by the public athlete panel.
-- Returns the single most recent training plan when share_active = true.
-- Excludes athlete_id from the return shape (public-safe).
-- ---------------------------------------------------------------------------

create or replace function public.get_latest_plan_by_share_code(p_code char(6))
returns table (
  id         uuid,
  plan_name  text,
  phase      text,
  plan_json  jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      tp.id,
      tp.plan_name,
      tp.phase,
      tp.plan_json,
      tp.created_at
    from public.training_plans tp
    join public.athletes a on a.id = tp.athlete_id
    where a.share_code = upper(p_code)
      and a.share_active = true
    order by tp.created_at desc
    limit 1;
end;
$$;

grant execute on function public.get_latest_plan_by_share_code(char) to anon;
grant execute on function public.get_latest_plan_by_share_code(char) to authenticated;

comment on function public.get_latest_plan_by_share_code(char) is
  'Public lookup of the most recent training plan by athlete share_code. Returns zero rows when code is invalid/inactive or when the athlete has no plans.';
