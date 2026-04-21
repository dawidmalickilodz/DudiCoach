-- Migration: US-012 - fitness_test_results table + RLS
-- Applied: 2026-04-20
-- Story: backlog/stories/US-012-fitness-tests.md

-- ---------------------------------------------------------------------------
-- Table: public.fitness_test_results
-- Stores historical fitness test measurements per athlete.
-- ---------------------------------------------------------------------------

create table public.fitness_test_results (
  id          uuid        primary key default gen_random_uuid(),
  athlete_id  uuid        not null references public.athletes(id) on delete cascade,
  test_key    text        not null,
  value       numeric     not null check (value >= 0),
  test_date   date        not null default current_date,
  notes       text,
  created_at  timestamptz not null default now()
);

comment on table public.fitness_test_results is
  'Historical fitness test measurements per athlete.';
comment on column public.fitness_test_results.test_key is
  'Catalog key from lib/constants/fitness-tests.ts.';
comment on column public.fitness_test_results.value is
  'Raw numeric measurement. Unit is defined in test catalog.';
comment on column public.fitness_test_results.test_date is
  'Date when the test was performed.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_fitness_test_results_athlete_date
  on public.fitness_test_results (athlete_id, test_date desc, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.fitness_test_results enable row level security;

create policy "fitness_tests_select_own"
  on public.fitness_test_results
  for select
  to authenticated
  using (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

create policy "fitness_tests_insert_own"
  on public.fitness_test_results
  for insert
  to authenticated
  with check (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

create policy "fitness_tests_delete_own"
  on public.fitness_test_results
  for delete
  to authenticated
  using (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.fitness_test_results;
