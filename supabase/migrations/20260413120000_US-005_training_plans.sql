-- Migration: US-005 — training_plans table + RLS
-- Applied: 2026-04-13
-- Story: backlog/stories/US-005-ai-plan-generation.md
-- Design: docs/design/US-005-design.md

-- ---------------------------------------------------------------------------
-- Table: public.training_plans
-- Stores AI-generated training plans (immutable once created).
-- Re-generating creates a new row; editing is future story US-017.
-- ---------------------------------------------------------------------------

create table public.training_plans (
  id          uuid        primary key default gen_random_uuid(),
  athlete_id  uuid        not null references public.athletes(id) on delete cascade,
  plan_name   text        not null,
  phase       text,
  plan_json   jsonb       not null,
  created_at  timestamptz not null default now()
);

comment on table public.training_plans is
  'AI-generated training plans. Immutable — each generation creates a new row.';
comment on column public.training_plans.athlete_id is
  'FK to athletes. ON DELETE CASCADE removes all plans when athlete is deleted.';
comment on column public.training_plans.plan_name is
  'Denormalized from plan_json.planName for display without parsing JSONB.';
comment on column public.training_plans.phase is
  'Denormalized from plan_json.phase for display without parsing JSONB. Nullable.';
comment on column public.training_plans.plan_json is
  'Full plan JSON conforming to TrainingPlanJson zod schema (lib/validation/training-plan.ts).';

-- ---------------------------------------------------------------------------
-- Index: listing plans by athlete, most recent first
-- ---------------------------------------------------------------------------

create index idx_training_plans_athlete_created
  on public.training_plans (athlete_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.training_plans enable row level security;

-- Coach can read plans for athletes they own
create policy "coach_select_own_plans"
  on public.training_plans
  for select
  to authenticated
  using (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

-- Coach can insert plans for athletes they own
create policy "coach_insert_own_plans"
  on public.training_plans
  for insert
  to authenticated
  with check (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

-- Coach can delete plans for athletes they own
create policy "coach_delete_own_plans"
  on public.training_plans
  for delete
  to authenticated
  using (
    athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );
