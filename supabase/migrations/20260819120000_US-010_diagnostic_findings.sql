-- Migration: US-010 - diagnostic_findings table + RLS (coach-only)
-- Applied: 2026-08-19
-- Story: backlog/stories/US-010-fms-diagnostics.md
-- Design: docs/design/US-010-fms-diagnostics-design.md

-- ---------------------------------------------------------------------------
-- Table: public.diagnostic_findings
--
-- Current FMS findings per athlete/muscle/side. One current finding per
-- (athlete, muscle, side) - enforced by a unique constraint; conflicts are
-- surfaced as 409 by the API (no silent overwrite, no upsert).
-- History/snapshots arrive with US-015 on top of this table.
-- ---------------------------------------------------------------------------

create table public.diagnostic_findings (
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

comment on table public.diagnostic_findings is
  'Current FMS findings per athlete/muscle/side. History via US-015 snapshots.';
comment on column public.diagnostic_findings.muscle_key is
  'Stable snake_case key of the versioned muscle catalog (lib/constants/muscles.ts).';
comment on column public.diagnostic_findings.side is
  'Body side of the finding: left or right.';
comment on column public.diagnostic_findings.severity is
  'FMS severity level: weak, very_weak, dysfunction.';
comment on column public.diagnostic_findings.observed_at is
  'Calendar day of the examination, defaults to today.';

-- ---------------------------------------------------------------------------
-- Trigger: auto-touch updated_at on update
-- ---------------------------------------------------------------------------

create trigger diagnostic_findings_updated_at
  before update on public.diagnostic_findings
  for each row execute function extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_diagnostic_findings_athlete_observed
  on public.diagnostic_findings (athlete_id, observed_at desc);

-- ---------------------------------------------------------------------------
-- RLS
--
-- Coach-only access. NO anon policy, NO public RPC, NO realtime publication:
-- FMS findings are coach-only in this story (athlete visibility is a US-015
-- decision). Ownership comes from athletes.coach_id.
-- ---------------------------------------------------------------------------

alter table public.diagnostic_findings enable row level security;

create policy "diagnostic_findings_select_own"
  on public.diagnostic_findings
  for select
  to authenticated
  using (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

create policy "diagnostic_findings_insert_own"
  on public.diagnostic_findings
  for insert
  to authenticated
  with check (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

create policy "diagnostic_findings_update_own"
  on public.diagnostic_findings
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

create policy "diagnostic_findings_delete_own"
  on public.diagnostic_findings
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

revoke all on table public.diagnostic_findings from public;
revoke all on table public.diagnostic_findings from anon;
revoke all on table public.diagnostic_findings from authenticated;
grant select, insert, update, delete on table public.diagnostic_findings to authenticated;

-- RLS policies read athletes.coach_id (owner check) as `authenticated`; the
-- cloud grants already allow this, the local dev stack does not. Idempotent.
GRANT SELECT ON TABLE public.athletes TO authenticated;