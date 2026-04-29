# Engineering Policy

**Owner:** Dawid Malicki  
**Version:** 1.1.0
**Last updated:** 2026-04-29
**Status:** Active  
**Scope:** Web and mobile application development for this repository

## Change process

This document is the source of truth for engineering workflow and safety rules in this repository.

Changes to this policy are allowed only when at least one of the following is true:
- the stack, architecture, or deployment model changed materially
- a repeated delivery failure exposed a gap in the policy
- a security, billing, data integrity, or reliability risk requires stronger rules
- a rule is clearly obsolete or creates unnecessary process overhead

Policy changes must:
- be intentional and scoped
- be reviewed before merge
- include a short rationale
- update the version
- update the `Last updated` field

Do not modify this document as part of unrelated feature work.  
Do not weaken security, billing, auth, RLS, or verification rules without explicit review.  
If a policy change affects delivery workflow, security posture, or review requirements, reflect that change consistently in `AGENTS.md`, `CLAUDE.md`, and any tool-specific agent configuration.

## Framework freshness rule

When working with Next.js or other fast-moving framework APIs, do not rely on stale assumptions.
Before changing framework-specific code, inspect:
- current project files
- package versions
- official docs references already present in the repo
- local migration/deprecation notes if available

Prefer current repository conventions over generic prior knowledge.

## Mission

Build production-grade web/mobile features with high delivery speed and high safety.
Optimize for:
- correctness
- user value
- security and data protection
- maintainability
- operational reliability

Do not mark work as done until required verification passed.

## Core principles

- Prefer the smallest correct change over broad refactors.
- Reuse repository patterns before adding abstractions.
- Keep business logic out of UI components.
- Never claim checks passed unless they were actually executed.
- State assumptions explicitly when requirements are ambiguous.
- Be conservative on auth, billing, data integrity, and production changes.

## Mandatory task flow (all tasks)

Before any implementation work:
1. Produce a **Change Brief** with:
   - problem statement
   - evidence
   - root cause hypothesis
   - affected surfaces
   - lane classification
   - required gates
   - expected files to change
   - required tests/checks
   - security/privacy considerations
   - rollback plan
   - definition of done
2. Classify the task into Lane A/B/C **before any file edits**.
3. Do not modify files before Change Brief + lane classification are complete.
4. If evidence is insufficient, mark the task `Blocked` with exact missing evidence.
5. For Lane C, G2 architecture/design approval is required before implementation.

## Hard rules (non-negotiable)

- Never hardcode secrets or credentials.
- Never trust client input for sensitive actions.
- Never rely on client-side authorization for protected data/actions.
- Never skip RLS review for user data in Supabase.
- Never skip webhook signature + idempotency for Stripe.
- Never silently introduce breaking changes.
- Never approve your own work as final approver.
- Never report a task as complete based on reasoning alone when a deterministic check was possible but not run.

## Agile risk lanes (routing first)

Choose one lane before implementation.

## Lane selection rule

Choose the highest-risk applicable lane before implementation.
If uncertainty exists between two lanes, use the safer lane.
The task is complete only when all required gates for the selected lane pass.

### Lane A - Fast (low risk)

Use when all are true:
- small scoped change
- no schema/auth/billing/infra change
- no sensitive data exposure risk
- limited blast radius

Required flow:
1. Change Brief + lane classification
2. Mini plan (G1)
3. Dev (G3)
4. Required checks (lint/typecheck/tests/build as applicable)
5. Independent code review (G6)
6. Done

### Lane B - Standard (default)

Use for typical feature work that is not high-risk infrastructure/security.

Required flow:
1. Change Brief + lane classification
2. Planner (G1)
3. Dev (G3)
4. UI/UX review (G4, if user-facing)
5. QA/Test (G5)
6. Security review (G7, when triggered)
7. Runtime/performance review (G8, when triggered)
8. Independent code review (G6)
9. Done

### Lane C - Critical (high risk)

Mandatory if any apply:
- database schema change
- Supabase auth/RLS/policy changes
- Stripe billing/webhooks/entitlements
- secrets/runtime/deployment config changes
- admin/private data exposure risk
- production reliability-critical runtime behavior

Required flow:
1. Change Brief + lane classification
2. Planner (G1)
3. Architect/design (G2) **before implementation**
4. Dev (G3)
5. UI/UX review (G4, if user-facing)
6. QA/Test (G5)
7. Security review (G7, mandatory)
8. Runtime/performance review (G8, mandatory for runtime-sensitive work)
9. Independent code review (G6) before merge
10. Release readiness + runtime smoke (G9) before closeout
11. Done

## Stage gates (task cannot pass with failed gate)

- G1 Planning complete
- G2 Architecture approved (Lane C only)
- G3 Implementation complete
- G4 UI review passed (if applicable)
- G5 QA verification passed
- G6 Independent code review passed (required before merge)
- G7 Security review passed (mandatory for Lane C and for auth, RLS, secrets, private data, public endpoints, or internal worker routes)
- G8 Runtime/performance review passed (mandatory for AI generation, worker/cron, Vercel runtime/config, and Supabase runtime behavior changes)
- G9 Release readiness and runtime smoke evidence passed before closeout (mandatory for Lane C and runtime-critical changes)

If any required gate fails: return to Dev with explicit remediation items.

## Verification fallback rule

If automated checks are unavailable for a relevant area, perform the strongest available manual verification and explicitly state what remains unverified.
Lack of automation is not a reason to skip verification.

## Release readiness check

Required for Lane C:
- migrations reviewed
- env vars documented
- rollback path identified
- monitoring/logging impact reviewed
- billing/auth side effects reviewed
- production-only behavior considered
- user communication or admin action noted if needed
- runtime smoke checklist defined before release
- runtime smoke evidence captured before closeout

## Independence requirement

The same agent/person must not perform all of:
- define scope
- implement
- test
- final approve

Independent verification can be done by:
- a different subagent/reviewer
- a human reviewer
- CI checks + separate reviewer sign-off

Do not simulate independent review in one combined self-approval step.
Do not merge without a passing independent review verdict at G6.

## Role responsibilities

### Planner

Must produce:
- scope and non-goals
- assumptions and constraints
- affected files/modules/routes/schemas/integrations
- risks and edge cases
- verification checklist
- rollback/safe-change strategy

### Architect (Lane C or when triggered)

Must define:
- client/server/db boundaries
- validation location
- authorization location
- secret handling
- retry/idempotency strategy where relevant
- migration safety and rollback impact

Must reject unnecessary complexity.

### Dev

- Implement approved scope only.
- Keep diffs local and reviewable.
- Avoid unrelated file changes.
- Preserve compatibility unless breaking change is explicitly approved.
- Update types/schemas/docs when behavior changes.
- Add operationally useful server logs without leaking secrets.

### UI/UX Reviewer (if user-facing)

Verify:
- visual hierarchy and consistency
- responsive web behavior
- mobile usability
- accessibility basics + keyboard access
- loading/empty/error/success states
- form validation and disabled states
- safe confirmation for destructive actions

### QA/Test

Must report:
- exact commands run
- pass/fail results
- skipped checks with reason
- uncovered risks
- coverage sufficiency judgment

Run relevant checks:
- lint
- typecheck
- unit tests
- integration tests
- e2e for critical flows
- build
- smoke checks for affected routes/screens

### Code Reviewer (independent)

Return one verdict:
- approved
- approved with minor issues
- rejected

If rejected, provide precise actionable fixes.

### Security Reviewer (triggered or mandatory in Lane C)

Verify:
- secrets handling
- server-side authorization
- least privilege and RLS correctness
- trust-boundary input validation
- safe output rendering
- webhook verification/idempotency (Stripe)
- abuse controls (rate limiting where relevant)
- non-leaky error messaging
- creator-facing admin, billing, and operational surfaces are protected against privilege misuse, unintended free access, destructive mistakes, and sensitive business data leakage

### Performance Reviewer (when triggered)

Verify:
- no unnecessary rerenders/fetches
- efficient query scope/payloads
- no obvious critical-flow regressions
- responsive behavior on web/mobile affected paths

## Trigger matrix for required conditional reviews

### Security review required when any apply

- auth or authorization changes
- Supabase RLS/policies/user data access
- billing/Stripe/payment state changes
- external API calls with sensitive data
- file uploads/user-generated content handling
- admin/destructive actions
- secret/environment/runtime security impact
- public endpoint behavior changes
- internal worker route behavior changes

### Runtime/performance review required when any apply

- initial load/shared layout changes
- large lists/dashboards
- realtime/polling behavior
- heavy queries or payload changes
- mobile startup/critical interaction path changes
- AI generation path changes
- worker/cron behavior changes
- Vercel runtime/config behavior changes
- Supabase runtime behavior changes

## Critical flows requiring stronger verification

The following flows require integration or end-to-end verification when changed:
- sign up / sign in / password reset
- subscription purchase / renewal / cancellation
- webhook-driven entitlement updates
- account deletion
- admin actions
- file upload and retrieval permissions
- any flow that exposes or mutates private user data

## Cross-platform parity rule

When changing shared logic or user-facing flows that exist on both web and mobile:
- identify whether behavior must remain identical or intentionally differ
- verify affected states on both platforms
- do not assume a web-safe pattern is mobile-safe

## Migration safety rule

Any schema or migration change must explicitly state:
- forward migration impact
- backward compatibility impact
- handling of existing rows
- nullability/default behavior
- rollback feasibility
- production deployment risk

## Auditability rule

For auth, billing, entitlement, and destructive actions, preserve enough logs or event records to reconstruct what happened in production without exposing secrets or private content.

## Sensitive and critical data

Treat as sensitive by default:
- personal user data
- auth/session data
- payment and subscription data
- private files
- internal admin data
- creator financial/operational data
- API secrets and internal tokens

## Supabase rules

- Treat Supabase as a security boundary, not just storage.
- Use least privilege and RLS for user-owned data by default.
- Validate ownership assumptions (`auth.uid()`) explicitly.
- Keep service-role usage server-side only.
- For schema changes, consider existing data, nullability, backfills, and rollback.
- Review indexes for new high-traffic queries.

## Stripe rules

- Treat billing as high-risk.
- Never trust client-side payment state alone.
- Verify webhook signatures.
- Ensure webhook idempotency and duplicate-event safety.
- Keep test/live mode separation explicit.
- Keep entitlement changes consistent under retries/delays.

## Vercel and deployment rules

- Treat deployment config as production-critical.
- Make env var dependencies explicit and safe.
- Validate runtime assumptions (edge/serverless/node differences).
- Keep production logs useful and non-sensitive.

## Git/repository discipline

- Keep changes scoped and reviewable.
- Do not bundle opportunistic cleanup into feature work.
- Propose broader refactors separately.
- Keep commit intent clear.
- Prefer deterministic scripts over repeated manual steps.

## Dependency policy

- Add dependencies only when justified.
- Explain why existing tools are insufficient.
- Prefer mature, widely adopted libraries aligned with current stack.
- Avoid overlap and dependency sprawl.

## Failure handling

- If a required gate fails, task status is `Rework` or `Blocked`.
- Document exact blocker and next action.
- Never hide uncertainty; surface residual risk explicitly.

## Completion standard

A task is done only when:
- behavior matches requirements
- required tests/checks ran and passed
- required independent reviews passed
- security/performance reviews passed when triggered
- release readiness and runtime smoke evidence passed when required by G9
- residual risks and follow-ups are documented

## Required final delivery format

At task end, provide:
1. Summary of change
2. Files changed
3. Assumptions made
4. Checks run (exact commands)
5. Test results
6. Review verdicts by role
7. Security findings
8. Performance findings
9. Known limitations/residual risks
10. Follow-up recommendations
