# CLAUDE.md

`docs/engineering-policy.md` is the primary and authoritative project policy document (source of truth).
If this file conflicts with `docs/engineering-policy.md`, follow `docs/engineering-policy.md`.

Additional Claude-specific rules:
- Use Claude subagents when specialized analysis or review is useful.
- Use hooks to enforce deterministic checks where available.
- If hooks or subagents are unavailable, state the limitation and use the safest fallback.
- Summarize work by gates, checks run, and residual risks.
