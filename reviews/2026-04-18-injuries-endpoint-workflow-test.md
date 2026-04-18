---
task: Injuries endpoint error-contract hardening
lane: B
security_review_trigger: true
reviewer: code-reviewer
date: 2026-04-18
verdict: Pass
---

# Workflow Test #2 — Injuries endpoint hardening

## Scope

- Harden error contract for coach injuries API:
  - `GET /api/athletes/[id]/injuries`
  - `POST /api/athletes/[id]/injuries`
  - regression coverage for detail route (`PATCH/DELETE`) leak behavior.
- Standardize behavior:
  - `401` unauthenticated,
  - `404` missing/not-owned resource,
  - `500` backend failure without internal `details` leakage.
- Keep authorization model, RLS, schema, and deployment unchanged.

## Checks run

- `npx vitest run tests/integration/athletes/injuries-route.test.ts tests/integration/athletes/injury-detail-route.test.ts`
- `npx vitest run`
- `npx tsc --noEmit`
- `npm run lint -- .`
- `npm run build`

## Results

- Targeted integration tests: pass (`20/20`)
- Full unit+integration suite: pass (`245/245`)
- Typecheck: pass
- Lint: pass
- Build: pass

## Security review summary

- Trigger rationale: endpoint handles private athlete injury data.
- Verified:
  - no client-facing internal error details on 500 paths,
  - server-side logging preserved for diagnostics,
  - `404` used for missing/not-owned athlete in list/create routes,
  - no auth/RLS model change introduced.

## Residual risks

- Error message strings across API routes are still inconsistent globally (Polish vs English in some modules). This task keeps injuries endpoints consistent but does not unify the whole API surface.
- A broader shared error contract helper across route handlers remains a future refactor.

## Workflow verdict

- Lane B selection was appropriate.
- Security review trigger fired for the right reason (private data exposure risk).
- Scope stayed controlled (no schema/auth/RLS/deploy changes).
- Planner -> implement -> verify -> independent+security review sequence completed successfully.
