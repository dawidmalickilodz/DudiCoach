---
task: Coach editor private-data flow hardening
lane: B
ui_review: true
security_review_trigger: true
reviewer: code-reviewer
date: 2026-04-18
verdict: Pass
---

# Workflow Test #4 - Coach editor private-data flow hardening

## Scope

- Harden client-side error exposure in coach private-data editing surfaces:
  - `AthleteProfileForm` auto-save status,
  - `InjuryEditForm` auto-save status,
  - `InjuryCreateForm` submit error,
  - `InjuryCard` delete error.
- Ensure user-facing copy is sanitized and sourced from `pl` dictionary.
- Keep auth/RLS/schema/deploy behavior unchanged.

## Checks run

- `npx vitest run tests/unit/lib/hooks/use-auto-save.test.ts tests/integration/coach/injuries-actions-state.test.tsx tests/integration/coach/athlete-profile-form-error-state.test.tsx`
- `npx vitest run`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Results

- Targeted tests: pass (`21/21`)
- Full unit+integration suite: pass (`259/259`)
- Typecheck: pass
- Lint: pass
- Build: pass

## UI review summary

- Save-state errors in profile/injuries auto-save now use stable, user-safe copy.
- Create/delete injury errors now avoid raw backend text and keep consistent alert UX.
- Existing loading/error/retry flow from `InjuriesTab` remains intact (no regression in visible states).

## Security review summary

- Trigger rationale: private athlete data flow on client editing surfaces.
- Verified:
  - no rendering of raw backend exception text in create/delete injury errors,
  - auto-save hook supports explicit public error message for sensitive flows,
  - no changes to authorization model, RLS, schema, or secret handling.

## Residual risks

- Not all client API flows are standardized on a shared error-normalization utility yet; this task hardens the active coach editor surfaces only.
- Some API modules still use mixed language error strings (PL/EN). This does not leak internals here, but consistency refactor remains useful.

## Workflow verdict

- Lane B was appropriate.
- Scope stayed constrained to UI/state + error exposure hardening.
- Planner -> implement -> QA checks -> UI review -> security review sequence completed successfully.
