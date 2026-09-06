-- =============================================================================
-- Manual migration apply: US-010 diagnostic_findings + US-013 load_progressions
-- Run in: Supabase Dashboard → SQL Editor → "Run new query"
-- =============================================================================

-- ── US-010: diagnostic_findings ──────────────────────────────────────────────

create table if not exists public.diagnostic_findings (
  id          uuid        primary key default gen_random_uuid(),
  athlete_id  uuid        not null references public.athletes(id) on delete cascade,
  muscle_key  text        not null,
  side        text        not null check (side in ('left', 'right')),
  severity    text        not null check (severity in ('weak', 'very_weak', 'dysfunction')),
  notes       varchar(1000),
  observed_at date        not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint diagnostic_findings_unique_current
    unique (athlete_id, muscle_key, side)
);

do $$ begin
  create trigger diagnostic_findings_updated_at
    before update on public.diagnostic_findings
    for each row execute function extensions.moddatetime(updated_at);
exception when duplicate_object then null;
end $$;

create index if not exists idx_diagnostic_findings_athlete_observed
  on public.diagnostic_findings (athlete_id, observed_at desc);

alter table public.diagnostic_findings enable row level security;

do $$ begin
  create policy "diagnostic_findings_select_own" on public.diagnostic_findings
    for select to authenticated
    using (athlete_id in (select id from public.athletes where coach_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "diagnostic_findings_insert_own" on public.diagnostic_findings
    for insert to authenticated
    with check (athlete_id in (select id from public.athletes where coach_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "diagnostic_findings_update_own" on public.diagnostic_findings
    for update to authenticated
    using (athlete_id in (select id from public.athletes where coach_id = auth.uid()))
    with check (athlete_id in (select id from public.athletes where coach_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "diagnostic_findings_delete_own" on public.diagnostic_findings
    for delete to authenticated
    using (athlete_id in (select id from public.athletes where coach_id = auth.uid()));
exception when duplicate_object then null;
end $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.diagnostic_findings TO authenticated;
GRANT SELECT ON TABLE public.diagnostic_findings TO anon;
GRANT SELECT ON TABLE public.athletes TO authenticated;

-- ── US-013: load_progressions ────────────────────────────────────────────────

create table if not exists public.load_progressions (
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

do $$ begin
  create trigger load_progressions_updated_at
    before update on public.load_progressions
    for each row execute function extensions.moddatetime(updated_at);
exception when duplicate_object then null;
end $$;

create unique index if not exists load_progressions_unique_day
  on public.load_progressions (athlete_id, lower(btrim(exercise_name)), entry_date);

alter table public.load_progressions enable row level security;

do $$ begin
  create policy "load_progressions_select_own" on public.load_progressions
    for select to authenticated
    using (athlete_id in (select id from public.athletes where coach_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "load_progressions_insert_own" on public.load_progressions
    for insert to authenticated
    with check (athlete_id in (select id from public.athletes where coach_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "load_progressions_update_own" on public.load_progressions
    for update to authenticated
    using (athlete_id in (select id from public.athletes where coach_id = auth.uid()))
    with check (athlete_id in (select id from public.athletes where coach_id = auth.uid()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "load_progressions_delete_own" on public.load_progressions
    for delete to authenticated
    using (athlete_id in (select id from public.athletes where coach_id = auth.uid()));
exception when duplicate_object then null;
end $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.load_progressions TO authenticated;
GRANT SELECT ON TABLE public.load_progressions TO anon;
GRANT SELECT ON TABLE public.athletes TO authenticated;
