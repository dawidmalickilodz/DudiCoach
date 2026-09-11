-- Athlete Session Outcome schema validation phase (PR1, reworked).
-- Lane C. Design: docs/design/athlete-context-system-design.md §10, §11.
--
-- VALIDATE CONSTRAINT acquires SHARE UPDATE EXCLUSIVE, which does not block
-- concurrent INSERT/UPDATE/DELETE (it conflicts with concurrent VALIDATE,
-- VACUUM, and SHARE-level DDL such as CREATE INDEX — negligible on this
-- table). Running it in a separate transaction (after 20260727120000
-- committed) bounds the ACCESS EXCLUSIVE window of the DDL phase and lets
-- writes continue during the validation scan. The constraints are NOT VALID
-- until this phase; they are still enforced on every new INSERT/UPDATE, so
-- no violating row can be written in between. If validation ever fails, the
-- constraints remain NOT VALID: fix the offending legacy rows, then re-run
-- the failed VALIDATE CONSTRAINT statement.

begin;

-- Bound the SHARE UPDATE EXCLUSIVE wait for the validation scans.
set local lock_timeout = '30s';

alter table public.plan_session_feedback
  validate constraint plan_session_feedback_outcome_complete;
alter table public.plan_session_feedback
  validate constraint plan_session_feedback_feedback_text_valid;
alter table public.plan_session_feedback
  validate constraint plan_session_feedback_has_content;

-- All three replacement constraints must be validated after this phase.
do $$
declare
  v_validated_constraints integer;
begin
  select count(*)
  into v_validated_constraints
  from pg_constraint c
  where c.conrelid = 'public.plan_session_feedback'::regclass
    and c.conname in (
      'plan_session_feedback_outcome_complete',
      'plan_session_feedback_feedback_text_valid',
      'plan_session_feedback_has_content'
    )
    and c.contype = 'c'
    and c.convalidated;

  if v_validated_constraints <> 3 then
    raise exception 'Validation phase failed: expected 3 validated constraints, found %',
      v_validated_constraints;
  end if;
end;
$$;

commit;
