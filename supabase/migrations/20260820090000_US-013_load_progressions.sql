-- Migration: US-013 - load_progressions table + RLS (coach-only)
-- Applied: 2026-08-20
-- Story: backlog/stories/US-013-load-progressions.md
-- Design: docs/design/US-013-load-progressions-design.md

-- ---------------------------------------------------------------------------
-- Table: public.load_progressions
--
-- Load progression entries per athlete/exercise/day. One entry per
-- (athlete, exercise_name, entry_date) - enforced by a functional unique
-- index (case- and leading/trailing-whitespace-insensitive). Conflicts are
-- surfaced as 409 by the API (no silent overwrite).
-- source=coach for coach-typed rows; source=athlete is reserved for the
-- EPIC-C athlete panel flow and is not writable through this story's API.
-- ---------------------------------------------------------------------------

create table public.load_progressions (
  id            uuid         primary key default gen_random_uuid(),
  athlete_id    uuid         not null references public.athletes(id) on delete cascade,
  exercise_name varchar(100) not null,
  entry_date    date         not null default current_date,
  weight_kg     numeric(6,1) not null check (weight_kg > 0 and weight_kg <= 9999.9),
  reps          varchar(20),
  sets          varchar(20),
  note          varchar(1000),
  source        text         not null default 'coach'
                 check (source in ('coach', 'athlete')),
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

comment on table public.load_progressions is
  'Load progression entries per athlete/exercise/day. source=athlete reserved for EPIC-C.';
comment on column public.load_progressions.exercise_name is
  'Free-text exercise name (max 100). Plans store exercises as JSONB free text; no FK.';
comment on column public.load_progressions.entry_date is
  'Calendar day of the entry, defaults to today.';
comment on column public.load_progressions.weight_kg is
  'Working weight in kg, 0.1-9999.9.';
comment on column public.load_progressions.source is
  'Entry origin: coach (this app) or athlete (EPIC-C, future).';

-- ---------------------------------------------------------------------------
-- Trigger: auto-touch updated_at on update
-- ---------------------------------------------------------------------------

create trigger load_progressions_updated_at
  before update on public.load_progressions
  for each row execute function extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- Indexes
--
-- Functional unique index enforces one entry per (athlete, exercise, day)
-- with case- and leading/trailing-whitespace-insensitive exercise names.
-- It also serves per-athlete scans. GET ordering by raw exercise_name is
-- client-side; per-athlete row volumes are small.
-- ---------------------------------------------------------------------------

create unique index load_progressions_unique_day
  on public.load_progressions (athlete_id, lower(btrim(exercise_name)), entry_date);

-- ---------------------------------------------------------------------------
-- RLS
--
-- Coach-only access. NO anon policy, NO public RPC, NO realtime publication:
-- load progression data is coach-only in this story. Ownership comes from
-- athletes.coach_id.
-- ---------------------------------------------------------------------------

alter table public.load_progressions enable row level security;

create policy "load_progressions_select_own"
  on public.load_progressions
  for select
  to authenticated
  using (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

create policy "load_progressions_insert_own"
  on public.load_progressions
  for insert
  to authenticated
  with check (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

create policy "load_progressions_update_own"
  on public.load_progressions
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

create policy "load_progressions_delete_own"
  on public.load_progressions
  for delete
  to authenticated
  using (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Grants
--
-- Deterministic least privilege: coach routes access this table directly as
-- `authenticated` under RLS. `anon` gets no table privileges (all coach
-- routes require authentication). Revoke first because Supabase Cloud
-- legacy projects carry full DML defaults for anon/authenticated.
-- ---------------------------------------------------------------------------

revoke all on table public.load_progressions from public;
revoke all on table public.load_progressions from anon;
revoke all on table public.load_progressions from authenticated;
grant select, insert, update, delete on table public.load_progressions to authenticated;

-- RLS policies read athletes.coach_id (owner check) as `authenticated`; the
-- cloud grants already allow this, the local dev stack does not. Idempotent.
GRANT SELECT ON TABLE public.athletes TO authenticated;