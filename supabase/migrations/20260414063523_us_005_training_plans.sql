-- Baseline reconciliation stub for remote migration version 20260414063523.
--
-- Purpose: align local supabase/migrations/ directory with the remote
--   supabase_migrations.schema_migrations table, which records this migration
--   under timestamp 20260414063523 rather than the canonical local timestamp.
--
-- Canonical schema migration (source of truth for SQL applied to this database):
--   supabase/migrations/20260413120000_US-005_training_plans.sql
--
-- This stub is intentionally a no-op. Running it has zero schema effect.
-- Do not edit. Do not delete without a corresponding remote tracking-table repair.

select 1 where false;
