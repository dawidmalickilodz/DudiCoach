# AGENTS.md

`docs/engineering-policy.md` is the primary and authoritative project policy document (source of truth).
If this file conflicts with `docs/engineering-policy.md`, follow `docs/engineering-policy.md`.

Additional Codex-specific rules:
- Choose risk lane first (A/B/C) before implementation.
- For non-trivial work, run `planner` first.
- Run `architect` for Lane C or design-required tasks.
- Route implementation by scope:
  - `backend` for API/server/data logic.
  - `frontend` for UI/client state/forms.
- Run `qa-dev` for lint/typecheck/unit/integration/build verification.
- Run `qa-test` for preview/staging E2E and runtime closeout checks.
- Run `ui-reviewer` for user-facing changes.
- Run `security` when auth, RLS, secrets, private data, billing, or public endpoint risk is involved.
- Run `code-reviewer` as the final independent review gate.
- Run `devops-release` for release/deploy readiness in critical or release-impacting work.
- Run `backlog-manager` for story status, backlog updates, and transition hygiene.
- `reviewer` is a lightweight/mid-development compatibility reviewer, not the final approval gate.
- No self-approval across plan -> dev -> QA -> final review.
- Use project-scoped agents in `.codex/agents/` when relevant.
- Summarize work by gates, checks run, review verdicts, and residual risks.
