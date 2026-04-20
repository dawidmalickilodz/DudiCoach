---
story: error-normalization-helper
lane: B
stage: G6-Code-Review
date: 2026-04-20
reviewer: reviewer-subagent
verdict: APPROVED_WITH_MINOR_ISSUES
blocking: false
---

# Code Review — Error Normalization Helper

## Verdict

**APPROVED WITH MINOR ISSUES** — advisory notes only, no blocking defects.
PR may merge as-is.

---

## Scope Verified

Lane B constraint respected: no auth, RLS, schema, Stripe, deployment, or
broad refactor changes. 5 files changed, all within the declared scope.

Changed files:
- `lib/utils/normalize-api-error.ts` (new)
- `lib/hooks/use-auto-save.ts` (catch block only)
- `lib/api/share.ts` (fallback string only)
- `tests/unit/lib/utils/normalize-api-error.test.ts` (new)
- `tests/unit/lib/hooks/use-auto-save.test.ts` (4 tests updated)

---

## UI / Data-Exposure Questions

**Q1 — Does `normalizeApiError` eliminate all raw message leakage?**
Yes. Implementation is `return fallback` — `_error` is never read. The `_error`
prefix signals intentional non-use. Raw messages, stacks, and server detail
strings are unconditionally discarded.

**Q2 — Does `use-auto-save.ts` still have any raw `err.message` path?**
No. The catch block no longer references `err` at all except to pass it as
the first argument to `normalizeApiError`, which ignores it. There is no
remaining path that reads `err.message` or any property of `err`.

**Q3 — Is the `share.ts` fallback `"Share action failed"` ever user-visible?**
No. `OnlineTab.tsx` (lines 155–161) renders `{pl.coach.athlete.online.errorGeneric}`
whenever `anyError` is truthy — it never accesses `anyError.message` or
interpolates the Error content. The `shareAction` function throws with an
internal English message only so that consuming query hooks can detect failure;
the UI layer always substitutes its own pl.ts string.

---

## Code Quality

### `normalize-api-error.ts`
- Pure function, no side effects, no imports, trivially testable. ✓
- JSDoc explains the security intent clearly. ✓
- `_error: unknown` type is correct (catches any throw shape). ✓

### `use-auto-save.ts`
- Import additions are minimal and purposeful. ✓
- `publicErrorMessage ?? pl.common.error` precedence is correct. ✓
- No other logic changed — surgical edit. ✓

### `share.ts`
- English-only internal message appropriate for a throw boundary. ✓
- Change reduces coupling to the old Polish string that was inconsistently
  placed in an API layer. ✓

### Tests
- `normalize-api-error.test.ts`: 6 cases cover null, undefined, Error,
  string, plain object, and custom fallback. The `not.toBe(err.message)` on
  the Error-instance case is a good regression guard. ✓
- `use-auto-save.test.ts`: Updated assertions correctly reflect new behavior.
  The `publicErrorMessage` test additionally asserts `not.toContain` on the
  raw server string. ✓

---

## Advisory Notes (non-blocking)

1. **`_error` comment**: Adding `// intentionally ignored — never read`
   inline would make the intent clearer for future contributors who might
   not recognise the `_` convention.

2. **`share.ts` comment**: `// Internal only — UI always substitutes pl.ts string`
   on the throw line would document why the message is English-only.

3. **Substring assertion on `use-auto-save` tests**: A `not.toContain("failure")`
   or `not.toContain("Network")` assertion alongside `toBe(pl.common.error)`
   would give an extra guard against future catch-block regressions that
   partially leak raw content.

None of the above are defects. They are left as optional follow-up.

---

## Security

No auth, RLS, session, or secret changes — security subagent not required.
The change reduces attack surface by preventing raw server messages from
reaching the UI.

---

## Summary

| Check | Result |
|---|---|
| Scope control | ✓ Lane B bounds respected |
| UI data-exposure (Q1) | ✓ No raw leak |
| UI data-exposure (Q2) | ✓ No remaining `err.message` path |
| UI data-exposure (Q3) | ✓ share.ts fallback never user-visible |
| Tests pass | ✓ 265/265 |
| Typecheck | ✓ 0 errors |
| Lint | ✓ 0 warnings |
| Regressions | ✓ None |
| Blocking issues | None |
