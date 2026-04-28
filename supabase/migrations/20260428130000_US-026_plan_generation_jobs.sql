-- Migration: US-026 - async plan generation jobs + worker RPCs
-- Applied: 2026-04-28
-- Story: backlog/stories/US-026-async-plan-generation.md
-- Design: docs/design/US-026-async-plan-generation-design.md
-- ADR: docs/adr/0007-async-plan-generation-via-job-table.md

-- ---------------------------------------------------------------------------
-- Enum: public.plan_generation_job_status
-- ---------------------------------------------------------------------------

create type public.plan_generation_job_status as enum (
  'queued',
  'processing',
  'succeeded',
  'failed',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- Table: public.plan_generation_jobs
--
-- Stores async generation jobs. training_plans remains the final artifact table.
-- ---------------------------------------------------------------------------

create table public.plan_generation_jobs (
  id               uuid primary key default gen_random_uuid(),
  athlete_id       uuid not null references public.athletes(id) on delete cascade,
  coach_id         uuid not null,
  status           public.plan_generation_job_status not null default 'queued',
  attempt_count    integer not null default 0 check (attempt_count >= 0),
  max_attempts     integer not null default 3 check (max_attempts between 1 and 5),
  claim_token      uuid,
  claimed_at       timestamptz,
  claim_expires_at timestamptz,
  prompt_inputs    jsonb not null,
  model            text not null,
  max_tokens       integer not null check (max_tokens > 0),
  plan_id          uuid references public.training_plans(id) on delete set null,
  error_code       text,
  error_message    text,
  completed_at     timestamptz,
  failed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.plan_generation_jobs is
  'Async queue for AI plan generation. Final generated plan is stored in training_plans.';
comment on column public.plan_generation_jobs.prompt_inputs is
  'Snapshot of athlete context used to build AI prompts. Private/internal only.';
comment on column public.plan_generation_jobs.claim_token is
  'Lease token proving worker claim ownership for complete/fail transitions.';
comment on column public.plan_generation_jobs.error_message is
  'Sanitized internal error details for diagnostics. Never expose raw provider output to client.';

-- ---------------------------------------------------------------------------
-- Trigger: auto-touch updated_at
-- ---------------------------------------------------------------------------

create trigger plan_generation_jobs_updated_at
  before update on public.plan_generation_jobs
  for each row execute function extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_plan_generation_jobs_coach_created
  on public.plan_generation_jobs (coach_id, created_at desc);

create index idx_plan_generation_jobs_queue
  on public.plan_generation_jobs (status, created_at asc)
  where status in ('queued', 'processing');

create unique index ux_plan_generation_jobs_active_per_athlete
  on public.plan_generation_jobs (athlete_id)
  where status in ('queued', 'processing');

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.plan_generation_jobs enable row level security;

create policy "plan_jobs_select_own"
  on public.plan_generation_jobs
  for select
  to authenticated
  using (
    coach_id = auth.uid()
    and athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

create policy "plan_jobs_insert_own"
  on public.plan_generation_jobs
  for insert
  to authenticated
  with check (
    status = 'queued'
    and coach_id = auth.uid()
    and athlete_id in (
      select id from public.athletes where coach_id = auth.uid()
    )
  );

-- No client-side update/delete policies: lifecycle transitions are worker-only.

-- ---------------------------------------------------------------------------
-- Worker RPC: claim next pending job
-- ---------------------------------------------------------------------------

create or replace function public.claim_pending_plan_generation_job(
  p_lock_seconds integer default 120
)
returns table (
  id uuid,
  athlete_id uuid,
  coach_id uuid,
  claim_token uuid,
  prompt_inputs jsonb,
  model text,
  max_tokens integer,
  attempt_count integer,
  max_attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock interval := make_interval(secs => greatest(30, least(coalesce(p_lock_seconds, 120), 600)));
begin
  return query
  with candidate as (
    select j.id
    from public.plan_generation_jobs j
    where j.status = 'queued'
       or (
         j.status = 'processing'
         and j.claim_expires_at is not null
         and j.claim_expires_at < now()
       )
    order by j.created_at asc
    for update skip locked
    limit 1
  ),
  claimed as (
    update public.plan_generation_jobs j
    set
      status = 'processing',
      attempt_count = j.attempt_count + 1,
      claim_token = gen_random_uuid(),
      claimed_at = now(),
      claim_expires_at = now() + v_lock,
      error_code = null,
      error_message = null,
      failed_at = null,
      updated_at = now()
    from candidate c
    where j.id = c.id
    returning
      j.id,
      j.athlete_id,
      j.coach_id,
      j.claim_token,
      j.prompt_inputs,
      j.model,
      j.max_tokens,
      j.attempt_count,
      j.max_attempts
  )
  select * from claimed;
end;
$$;

-- ---------------------------------------------------------------------------
-- Worker RPC: complete job + persist final plan artifact
-- ---------------------------------------------------------------------------

create or replace function public.complete_plan_generation_job(
  p_job_id uuid,
  p_claim_token uuid,
  p_plan_name text,
  p_phase text,
  p_plan_json jsonb
)
returns table (
  job_id uuid,
  plan_id uuid,
  status public.plan_generation_job_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.plan_generation_jobs%rowtype;
  v_plan_id uuid;
begin
  select *
  into v_job
  from public.plan_generation_jobs
  where id = p_job_id
    and claim_token = p_claim_token
    and status = 'processing'
    and claim_expires_at is not null
    and claim_expires_at >= now()
  for update;

  if not found then
    return;
  end if;

  insert into public.training_plans (
    athlete_id,
    plan_name,
    phase,
    plan_json
  )
  values (
    v_job.athlete_id,
    p_plan_name,
    p_phase,
    p_plan_json
  )
  returning id into v_plan_id;

  update public.plan_generation_jobs
  set
    status = 'succeeded',
    plan_id = v_plan_id,
    claim_token = null,
    claimed_at = null,
    claim_expires_at = null,
    completed_at = now(),
    error_code = null,
    error_message = null,
    updated_at = now()
  where id = p_job_id;

  return query
  select
    j.id as job_id,
    j.plan_id,
    j.status
  from public.plan_generation_jobs j
  where j.id = p_job_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Worker RPC: fail job (retry or terminal failure)
-- ---------------------------------------------------------------------------

create or replace function public.fail_plan_generation_job(
  p_job_id uuid,
  p_claim_token uuid,
  p_error_code text,
  p_error_message text,
  p_retryable boolean default false
)
returns table (
  job_id uuid,
  status public.plan_generation_job_status,
  attempt_count integer,
  max_attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with transitioned as (
    update public.plan_generation_jobs j
    set
      status = case
        when p_retryable and j.attempt_count < j.max_attempts then 'queued'::public.plan_generation_job_status
        else 'failed'::public.plan_generation_job_status
      end,
      claim_token = null,
      claimed_at = null,
      claim_expires_at = null,
      failed_at = case
        when p_retryable and j.attempt_count < j.max_attempts then null
        else now()
      end,
      error_code = left(coalesce(p_error_code, 'unknown_error'), 64),
      error_message = left(coalesce(p_error_message, 'unknown error'), 320),
      updated_at = now()
    where j.id = p_job_id
      and j.claim_token = p_claim_token
      and j.status = 'processing'
    returning
      j.id,
      j.status,
      j.attempt_count,
      j.max_attempts
  )
  select
    t.id as job_id,
    t.status,
    t.attempt_count,
    t.max_attempts
  from transitioned t;
end;
$$;

revoke all on function public.claim_pending_plan_generation_job(integer) from public;
revoke all on function public.complete_plan_generation_job(uuid, uuid, text, text, jsonb) from public;
revoke all on function public.fail_plan_generation_job(uuid, uuid, text, text, boolean) from public;

grant execute on function public.claim_pending_plan_generation_job(integer) to service_role;
grant execute on function public.complete_plan_generation_job(uuid, uuid, text, text, jsonb) to service_role;
grant execute on function public.fail_plan_generation_job(uuid, uuid, text, text, boolean) to service_role;
