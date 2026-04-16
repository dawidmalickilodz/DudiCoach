---
story_group: US-003-US-005
agent: qa-test
stage: e2e
verdict: pass-preview
date: 2026-04-16
---

# E2E Report - US-003 + US-004 + US-005

## Summary

US-003, US-004 and US-005 (non-AI path) are passing end-to-end on PR #6 preview (desktop + mobile).

## Execution

- Command:

```bash
PLAYWRIGHT_BASE_URL="https://dudi-coach-git-codex-us-afb073-dawidmalickilodz-7164s-projects.vercel.app" \
E2E_COACH_EMAIL="***" \
E2E_COACH_PASSWORD="***" \
npx playwright test --reporter=list
```

- Result:
  - `22 passed`
  - `2 skipped`
  - `0 failed`

Skipped tests are expected:
- `US-005 happy path - generates a plan and renders 4-week viewer [opt-in]` (desktop)
- `US-005 happy path - generates a plan and renders 4-week viewer [opt-in]` (mobile)

These require explicit `E2E_ALLOW_AI_CALL=1` and valid AI provider key.

## Fix verified in this run

US-003 flake (auto-save race) was stabilized by waiting for persisted backend values before back navigation:

- file: `tests/e2e/US-003.spec.ts`
- mechanism: polling `GET /api/athletes/:id` until expected snapshot is persisted

This removed intermittent failures where form values were edited in UI but not yet committed before leaving the editor.

## Optional AI coverage

To include the US-005 happy path (real Anthropic call), run with:
- `E2E_ALLOW_AI_CALL=1`
