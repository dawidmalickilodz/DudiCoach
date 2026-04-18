---
cycle: Workflow Tests #1-#4
period: 2026-04-18
status: Stable
recommendation: Keep current process; do not change foundations yet
---

# Workflow Cycle Summary (#1-#4)

## 1) Tested task profiles

1. ShareCodeForm UX hardening (validation + user errors + loading/disabled + tests).
2. Injuries API error-contract hardening (401/404/500 + no internal details leak).
3. InjuriesTab UI/state matrix hardening (loading/error/retry/empty/success + action guards).
4. Coach editor private-data flow hardening (client-side error sanitization + no raw leak).

Coverage summary:
- UI-heavy flows: tested.
- Backend/private-data contract flow: tested.
- Client-side privacy-sensitive UX: tested.
- Cross-gate flow (UI + security trigger in Lane B): tested.

## 2) Gates performance

Observed gates worked consistently:
- G1 Planning: stable, scope was explicit before implementation.
- G3 Implementation: localized diffs, no uncontrolled scope growth.
- G4 UI review: triggered when applicable and produced concrete checks.
- G5 QA verification: deterministic checks run each time (tests/typecheck/lint/build).
- G6 Independent code review: present and actionable.
- G7 Security review: triggered only when exposure risk/private-data surface existed.

No failed required gate in tests #1-#4.

## 3) Lane selection quality

- All 4 tasks were handled in Lane B.
- Lane B was appropriate in all cases:
  - no schema/auth/RLS/deploy/Stripe changes,
  - meaningful feature/hardening scope,
  - review depth proportional to risk.
- No observed false escalation to Lane C.

## 4) Agent usefulness assessment

Current stack (`planner`, `reviewer`, `security`, `ui-reviewer`) is sufficient for daily work at current risk profile.

Observed quality:
- `planner`: useful and non-ceremonial.
- `ui-reviewer`: added real value on state-heavy UI tasks.
- `security`: triggered for the right reasons (data exposure, not generic backend bias).
- `reviewer`: effective for scope/control sanity.

No strong evidence yet that another agent is required immediately.

## 5) Most frequent residual risks

1. Error handling consistency drift (mixed PL/EN copy across modules).
2. Missing shared error-normalization helper (local hardening done, global standardization pending).
3. Some duplicated validation/contract logic may drift over time if not centralized.

These are technical follow-ups, not process-fundament issues.

## 6) Decision on `qa.toml`

Current decision: **do not add `qa.toml` now**.

Rationale:
- QA reporting quality is currently consistent.
- Deterministic checks are being run and documented reliably.
- No repeated QA-quality failure pattern across #1-#4.

Re-evaluation trigger:
- add `qa.toml` only if the next tasks show uneven QA output, skipped relevant checks, or inconsistent risk reporting.

## 7) Operational conclusion

The workflow is stable enough for daily use without changing foundations.

For now:
- keep `docs/engineering-policy.md`, wrappers, and current `.codex` setup unchanged,
- continue collecting short workflow notes per task,
- revisit expansion (`qa.toml` or further roles) only after evidence from additional real tasks.
