# CLAUDE.md

`docs/engineering-policy.md` is the primary and authoritative project policy document (source of truth).
If this file conflicts with `docs/engineering-policy.md`, follow `docs/engineering-policy.md`.

Additional Claude-specific rules:
- Use Claude subagents when specialized analysis or review is useful.
- For non-trivial work, determine the correct risk lane first and use the planner subagent before implementation.
- Use the reviewer subagent for independent review after implementation.
- Use the security subagent for changes affecting auth, billing, schema, RLS, secrets, admin actions, file access, or private-data exposure.
- Use the ui-reviewer subagent for user-facing changes involving forms, multiple states, retry behavior, or mobile/web UX impact.
- If hooks or subagents are unavailable, state the limitation explicitly and continue with the safest fallback.
- Do not declare work complete unless required checks and reviews have been completed.
- Summarize every completed task by gates, checks run, review verdicts, and residual risks.
