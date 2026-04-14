-- Migration: US-004 — share_active column + public RPC functions for athlete panel
-- Applied: 2026-04-14
-- Story: backlog/stories/US-004-share-code-realtime.md
-- Design: docs/design/US-004-design.md

-- ---------------------------------------------------------------------------
-- New column: athletes.share_active
--
-- Gates whether the share code can be used to access the athlete panel.
-- Sharing is OFF by default — coach must explicitly activate it.
-- This allows deactivating access without destroying the code.
-- ---------------------------------------------------------------------------

alter table public.athletes
  add column share_active boolean not null default false;

comment on column public.athletes.share_active is
  'Whether the share_code currently grants access to the public athlete panel. Default false — opt-in.';

-- ---------------------------------------------------------------------------
-- RPC: get_athlete_by_share_code(p_code)
--
-- SECURITY DEFINER — runs as function owner to bypass RLS for anonymous
-- callers (the athlete panel is unauthenticated).
--
-- Returns the athlete row sanitized for public view (no coach_id, no
-- created_at) iff the code is active. Zero rows otherwise.
--
-- UPPER(p_code) normalizes lowercase input (share codes are always stored
-- uppercase by generate_share_code()).
-- ---------------------------------------------------------------------------

create or replace function public.get_athlete_by_share_code(p_code char(6))
returns table (
  id                     uuid,
  name                   text,
  age                    integer,
  weight_kg              numeric(5,1),
  height_cm              numeric(5,1),
  sport                  text,
  training_start_date    date,
  training_days_per_week integer,
  session_minutes        integer,
  current_phase          text,
  goal                   text,
  notes                  text,
  share_code             char(6),
  updated_at             timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      a.id,
      a.name,
      a.age,
      a.weight_kg,
      a.height_cm,
      a.sport,
      a.training_start_date,
      a.training_days_per_week,
      a.session_minutes,
      a.current_phase,
      a.goal,
      a.notes,
      a.share_code,
      a.updated_at
    from public.athletes a
    where a.share_code = upper(p_code)
      and a.share_active = true;
end;
$$;

grant execute on function public.get_athlete_by_share_code(char) to anon;
grant execute on function public.get_athlete_by_share_code(char) to authenticated;

comment on function public.get_athlete_by_share_code(char) is
  'Public lookup of an athlete by share_code. Returns zero rows when code is invalid or share_active=false.';

-- ---------------------------------------------------------------------------
-- RPC: reset_share_code(p_athlete_id)
--
-- SECURITY DEFINER — needs privileged access to generate_share_code() which
-- queries athletes. Ownership is verified manually via auth.uid() since RLS
-- is bypassed.
--
-- Generates a new code for the athlete and returns it. Old code stops
-- working immediately (UNIQUE constraint on share_code ensures no reuse).
-- ---------------------------------------------------------------------------

create or replace function public.reset_share_code(p_athlete_id uuid)
returns char(6)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_code char(6);
begin
  -- Ownership check — SECURITY DEFINER bypasses RLS, so we do it manually
  if not exists (
    select 1 from public.athletes
    where id = p_athlete_id
      and coach_id = auth.uid()
  ) then
    raise exception 'Not found or not authorized';
  end if;

  v_new_code := public.generate_share_code();

  update public.athletes
  set share_code = v_new_code
  where id = p_athlete_id;

  return v_new_code;
end;
$$;

grant execute on function public.reset_share_code(uuid) to authenticated;

comment on function public.reset_share_code(uuid) is
  'Generates a new share_code for the given athlete (owned by the caller). Revokes the previous code.';
