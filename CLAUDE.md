# CLAUDE.md

`docs/engineering-policy.md` is the primary and authoritative source of truth.
If this file conflicts with policy, follow `docs/engineering-policy.md`.

Core behavioral rules:
1. Don't assume. Don't hide confusion. Surface tradeoffs.
2. Minimum code that solves the problem. Nothing speculative.
3. Touch only what you must. Clean up only your own mess.
4. Define success criteria. Loop until verified.

Claude wrapper rules:
- Before implementation, define: scope, out-of-scope, affected surfaces, success criteria, verification plan, and security/privacy impact.
- Classify lane (A/B/C) before any edits and follow required gates from policy.
- Keep changes small, surgical, and reversible.
- After implementation, summarize changed files and exact checks run.
- Do not claim tests, CI, runtime behavior, security posture, or production readiness without evidence.
