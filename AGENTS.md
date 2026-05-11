# AGENTS.md

`docs/engineering-policy.md` is the primary and authoritative source of truth.
If this file conflicts with policy, follow `docs/engineering-policy.md`.

Core behavioral rules:
1. Don’t assume. Don’t hide confusion. Surface tradeoffs.
2. Minimum code that solves the problem. Nothing speculative.
3. Touch only what you must. Clean up only your own mess.
4. Define success criteria. Loop until verified.

Codex wrapper rules:
- Classify lane (A/B/C) before any work and before file edits.
- Keep changes small, reversible, and auditable.
- Prohibit unrelated changes outside approved scope.
- Do not claim tests/CI/runtime/security verification without evidence.
- Use Change Brief + required gates from `docs/engineering-policy.md`.
