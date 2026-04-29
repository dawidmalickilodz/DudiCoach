# AGENTS.md

`docs/engineering-policy.md` is the primary and authoritative project policy document (source of truth).
If this file conflicts with `docs/engineering-policy.md`, follow `docs/engineering-policy.md`.

Additional Codex-specific rules:
- Produce a full Change Brief before every task.
- Classify lane (A/B/C) before any file edits.
- Do not modify files before Change Brief + lane classification are complete.
- Choose risk lane first (A/B/C) before implementation.
- For non-trivial work, run `planner` first.
- Run `architect` for Lane C or design-required tasks.
- For Lane C, do not implement before G2 architecture/design approval.
- Route implementation by scope:
  - `backend` for API/server/data logic.
  - `frontend` for UI/client state/forms.
- Run `qa-dev` for lint/typecheck/unit/integration/build verification.
- Run `qa-test` for preview/staging E2E and runtime closeout checks.
- Run `ui-reviewer` for user-facing changes.
- Run `security` when auth, RLS, secrets, private data, billing, public endpoint, or internal worker risk is involved.
- Run runtime/performance review (G8 owner) when AI generation, worker/cron, Vercel runtime/config, or Supabase runtime behavior is affected.
- Run `code-reviewer` as the final independent review gate (G6) before merge.
- Run `devops-release` for release/deploy readiness in critical or release-impacting work.
- Run `backlog-manager` for story status, backlog updates, and transition hygiene.
- `reviewer` is a lightweight/mid-development compatibility reviewer, not the final approval gate.
- No self-approval across plan -> dev -> QA -> final review.
- If the same defect receives 2 failed fixes, escalate to Lane C with a fresh G2 design before further code attempts.
- For Lane C and runtime-critical changes, require G9 release readiness + runtime smoke evidence before closeout.
- Use project-scoped agents in `.codex/agents/` when relevant.
- Summarize work by gates, checks run, review verdicts, and residual risks.
