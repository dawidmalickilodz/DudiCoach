-- Migration: US-011 - injuries table + RLS + public RPC by share_code
-- Applied: 2026-04-16
-- Story: backlog/stories/US-011-athlete-injuries.md
-- Design: docs/design/US-011-design.md

-- ---------------------------------------------------------------------------
-- Table: public.injuries
-- ---------------------------------------------------------------------------

create table public.injuries (
  id            uuid        primary key default gen_random_uuid(),
  athlete_id    uuid        not null references public.athletes(id) on delete cascade,
  name          text        not null,
  body_location text        not null,
  severity      smallint    not null check (severity between 1 and 5),
  injury_date   date        not null default current_date,
  status        text        not null default 'active'
                            check (status in ('active', 'healing', 'healed')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.injuries is
  'Injury records per athlete, managed by the coach.';
comment on column public.injuries.athlete_id is
  'FK to athletes. Ownership comes from athletes.coach_id via RLS.';
comment on column public.injuries.body_location is
  'Stored as a key (text), translated in the UI layer.';
comment on column public.injuries.severity is
  'Severity scale 1..5.';
comment on column public.injuries.status is
  'Injury state: active, healing, healed.';

-- ---------------------------------------------------------------------------
-- Trigger: auto-touch updated_at on injuries update
-- ---------------------------------------------------------------------------

create trigger injuries_updated_at
  before update on public.injuries
  for each row execute function extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_injuries_athlete_injury_date
  on public.injuries (athlete_id, injury_date desc);

-- ---------------------------------------------------------------------------
-- RLS
--
-- IMPORTANT: No global anon SELECT policy. Public read is exposed only via
-- SECURITY DEFINER RPC by share_code (see function below).
-- ---------------------------------------------------------------------------

alter table public.injuries enable row level security;

create policy "injuries_select_own"
  on public.injuries
  for select
  to authenticated
  using (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

create policy "injuries_insert_own"
  on public.injuries
  for insert
  to authenticated
  with check (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

create policy "injuries_update_own"
  on public.injuries
  for update
  to authenticated
  using (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  )
  with check (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

create policy "injuries_delete_own"
  on public.injuries
  for delete
  to authenticated
  using (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Public RPC: get_active_injuries_by_share_code(p_code)
--
-- SECURITY DEFINER function used by the public athlete panel.
-- Returns only active injuries, and only when the athlete share is active.
-- ---------------------------------------------------------------------------

create or replace function public.get_active_injuries_by_share_code(p_code char(6))
returns table (
  id            uuid,
  athlete_id    uuid,
  name          text,
  body_location text,
  severity      smallint,
  injury_date   date,
  status        text,
  notes         text,
  created_at    timestamptz,
  updated_at    timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select
      i.id,
      i.athlete_id,
      i.name,
      i.body_location,
      i.severity,
      i.injury_date,
      i.status,
      i.notes,
      i.created_at,
      i.updated_at
    from public.injuries i
    join public.athletes a on a.id = i.athlete_id
    where a.share_code = upper(p_code)
      and a.share_active = true
      and i.status = 'active'
    order by i.injury_date desc, i.created_at desc;
end;
$$;

grant execute on function public.get_active_injuries_by_share_code(char) to anon;
grant execute on function public.get_active_injuries_by_share_code(char) to authenticated;

comment on function public.get_active_injuries_by_share_code(char) is
  'Public lookup of active injuries by athlete share_code. Returns zero rows when code is invalid/inactive or no active injuries.';

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.injuries;

