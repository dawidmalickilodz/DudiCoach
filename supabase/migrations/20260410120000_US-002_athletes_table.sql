-- Migration: US-002 — athletes table + RLS
-- Applied: 2026-04-10
-- Story: backlog/stories/US-002-athlete-crud-backend.md
-- Design: docs/design/US-002-design.md

-- ---------------------------------------------------------------------------
-- Function: generate_share_code()
-- Generates a random 6-char uppercase alphanumeric code, retries on collision.
-- Excludes ambiguous characters (0/O, 1/I/L) to reduce athlete data-entry errors.
-- ---------------------------------------------------------------------------

create or replace function public.generate_share_code()
returns char(6)
language plpgsql
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result char(6);
  collision boolean;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    end loop;
    select exists(select 1 from public.athletes where share_code = result) into collision;
    if not collision then
      return result;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Table: public.athletes
-- ---------------------------------------------------------------------------

create table public.athletes (
  id                     uuid         primary key default gen_random_uuid(),
  coach_id               uuid         not null references auth.users(id) on delete cascade,
  name                   text         not null,
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
  share_code             char(6)      not null unique default generate_share_code(),
  created_at             timestamptz  not null default now(),
  updated_at             timestamptz  not null default now(),

  constraint athletes_age_check
    check (age is null or (age >= 10 and age <= 100)),
  constraint athletes_weight_check
    check (weight_kg is null or (weight_kg >= 30 and weight_kg <= 250)),
  constraint athletes_height_check
    check (height_cm is null or (height_cm >= 100 and height_cm <= 250)),
  constraint athletes_training_days_check
    check (training_days_per_week is null or (training_days_per_week >= 1 and training_days_per_week <= 7)),
  constraint athletes_session_minutes_check
    check (session_minutes is null or (session_minutes >= 20 and session_minutes <= 180)),
  constraint athletes_current_phase_check
    check (current_phase is null or current_phase in ('preparatory', 'base', 'building', 'peak', 'transition'))
);

comment on table public.athletes is
  'Athlete profiles managed by the coach. One coach owns many athletes.';
comment on column public.athletes.coach_id is
  'FK to auth.users — the coach who owns this athlete. RLS anchor.';
comment on column public.athletes.sport is
  'Free-form sport name. NOT an enum — avoids painful migrations when new sports are added.';
comment on column public.athletes.current_phase is
  'Training periodization phase. Constrained by CHECK, not enum, for migration friendliness.';
comment on column public.athletes.share_code is
  'Unique 6-char uppercase alphanumeric code for athlete panel access (US-004).';

-- ---------------------------------------------------------------------------
-- Trigger: auto-touch updated_at on athletes update
-- moddatetime extension already enabled in US-001 migration
-- ---------------------------------------------------------------------------

create trigger athletes_updated_at
  before update on public.athletes
  for each row execute function extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.athletes enable row level security;

-- Coach can read only their own athletes
create policy "athletes_select_own"
  on public.athletes
  for select
  to authenticated
  using (auth.uid() = coach_id);

-- Coach can insert athletes only for themselves
create policy "athletes_insert_own"
  on public.athletes
  for insert
  to authenticated
  with check (auth.uid() = coach_id);

-- Coach can update only their own athletes
create policy "athletes_update_own"
  on public.athletes
  for update
  to authenticated
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- Coach can delete only their own athletes
create policy "athletes_delete_own"
  on public.athletes
  for delete
  to authenticated
  using (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- coach_id: RLS filtering performance
create index idx_athletes_coach_id on public.athletes(coach_id);

-- updated_at DESC: default sort order for athlete list
create index idx_athletes_updated_at on public.athletes(updated_at desc);
