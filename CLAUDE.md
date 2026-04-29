# CLAUDE.md

`docs/engineering-policy.md` is the primary and authoritative project policy document (source of truth).
If this file conflicts with `docs/engineering-policy.md`, follow `docs/engineering-policy.md`.

## Additional Claude-specific rules

- Produce a full Change Brief before every task.
- Classify lane (A/B/C) before any file edits.
- Do not modify files before Change Brief + lane classification are complete.
- Use subagents when specialised analysis or review is useful.
- For non-trivial work, determine the correct risk lane first (see policy §Agile risk lanes), then invoke `planner` before implementation.
- For Lane C, do not implement before G2 architecture/design approval.
- Run security review (G7) when auth/RLS/secrets/private data/public endpoints/internal worker surfaces are touched.
- Run runtime/performance review (G8) when AI generation, worker/cron, Vercel runtime/config, or Supabase runtime behavior is affected.
- Require independent code review (G6) before merge.
- Require release readiness + runtime smoke evidence (G9) before closeout for Lane C/runtime-critical work.
- Do not declare work complete unless all required gates for the selected lane have passed.
- Summarise every completed task by: gates passed, exact checks run, review verdicts, and residual risks.
- If a subagent is unavailable, state the limitation explicitly and continue with the safest available fallback.

## Agent routing

All project agents are defined in `.claude/agents/`. Every agent treats `docs/engineering-policy.md`
as the source of truth. Use the table below to select the correct agent for each task.

| Agent | Invoke when |
|---|---|
| `backlog-manager` | Adding a feature, writing a user story, refining or re-prioritising the backlog |
| `planner` | Any non-trivial task before implementation — produces scope, lane, risks, verification checklist (G1) |
| `architect` | Lane C, or any story with `design_required: true` — produces design doc + ADR (G2) |
| `developer-backend` | API routes, Supabase migrations, RLS policies, Claude API integration, Realtime channels |
| `developer-frontend` | React components, forms, auto-save, i18n strings, real-time UI |
| `qa-dev` | After implementation is complete — unit + integration tests, coverage report (G5 dev gate) |
| `qa-test` | After devops deploys a preview — Playwright E2E on staging URL (G5 E2E gate) |
| `devops` | CI/CD setup, preview/staging/prod deployment, env vars, release tagging |
| `ui-reviewer` | User-facing changes involving forms, multiple states, retry behaviour, or mobile/web UX (G4) |
| `security` | Auth, RLS, public data exposure, secrets, admin actions, file access, or any private-data risk (G7) |
| `reviewer` | Lightweight mid-development spot check — correctness, scope control, early quality signal. **Not the final gate.** |
| `code-reviewer` | Final independent review after all tests are green — produces `reviews/US-XXX-review.md` with Approve / Request Changes verdict (G6). READ-ONLY. |

## Lane summary (from policy)

| Lane | Use when | Required gates |
|---|---|---|
| **A — Fast** | Small scoped change, no schema/auth/billing/infra change, limited blast radius | Change Brief + lane → G1 mini-plan → G3 dev → checks → G6 review |
| **B — Standard** | Typical feature work, not high-risk | Change Brief + lane → G1 → G3 → G4 (if user-facing) → G5 → G7/G8 when triggered → G6 |
| **C — Critical** | Schema change, auth/RLS, billing/Stripe, secrets, admin data, production-critical behaviour | Change Brief + lane → G1 → G2 (before implementation) → G3 → G4 → G5 → G7 → G8 (runtime/perf as required by policy) → G6 (before merge) → G9 (release readiness + runtime smoke) |

When uncertain between two lanes, choose the safer lane.
