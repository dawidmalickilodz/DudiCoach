-- Migration: US-001 — profiles table + RLS
-- Applied: 2026-04-09
-- Story: backlog/stories/US-001-coach-login.md

-- ---------------------------------------------------------------------------
-- Table: public.profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Per-user metadata for authenticated users (single-coach mode: 1 row).';
comment on column public.profiles.display_name is
  'Human-readable name shown in coach navbar; defaults to email local-part.';

-- ---------------------------------------------------------------------------
-- Trigger 1: auto-create profile row on auth.users insert
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Trigger 2: auto-touch updated_at on profiles update
-- ---------------------------------------------------------------------------

create extension if not exists moddatetime schema extensions;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

-- A user can read their own profile row.
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- A user can update only their own profile row.
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
