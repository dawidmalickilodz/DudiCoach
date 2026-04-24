---
story: US-025
title: Athlete Public Panel — Training Plan Display
verdict: Approve
reviewer: code-reviewer
reviewed_at: 2026-04-24
lane: C
---

# Review — US-025: Athlete Public Panel: Training Plan Display

## Verdict: **Approve**

US-025 can be marked Done.

## Summary

- Lane-C gates fully met: additive-only migration, SECURITY DEFINER RPC with `set search_path = public`, `athlete_id` excluded at the DB boundary (not just in application code).
- Public/private boundary is clean: `PublicTrainingPlan` has exactly five fields; the RPC return signature mirrors those five columns; cross-athlete isolation enforced by SQL JOIN and covered in a dedicated test.
- `PlanHeader` prop widening is backward-compatible: both `TrainingPlan` (coach side) and `PublicTrainingPlan` (public side) structurally satisfy the narrowed Pick. No coach-side callers broken.
- All 8 security-checklist items from §8 of the design doc are covered. Cross-athlete isolation test and inactive-code gate test both present.
- No service-role key anywhere in the code path. ADR-0006 compliance verified.

## Per-file verdict

| File | Status | Notes |
|---|---|---|
| `supabase/migrations/20260424120000_US-025_public_plan_rpc.sql` | ✅ Approve | Additive only. `security definer` + `set search_path = public`. Explicit column list. Join on `share_active = true`. Grants to `anon` + `authenticated` only. No `ALTER PUBLICATION`. |
| `lib/types/plan-public.ts` | ✅ Approve | Five-field interface matches RPC return exactly. JSDoc references design doc §2. |
| `app/api/athlete/[shareCode]/plans/route.ts` | ✅ Approve | Regex before RPC. 404 on malformed. 500 log omits share code. `{ data: null }` on empty. No service-role client. |
| `components/athlete/PlanPublicSection.tsx` | ✅ Approve | `"use client"` justified by `useState`. Empty state and plan state correct. Design-system tokens only. All 3 i18n keys consumed. |
| `tests/integration/athlete/plans-route.test.ts` | ✅ Approve | 7 tests: malformed, forbidden chars, empty→null, happy path with `not.toHaveProperty("athlete_id")`, 500, lowercase normalization, cross-athlete isolation. |
| `tests/unit/components/athlete/PlanPublicSection.test.tsx` | ✅ Approve | 11 tests covering null + valid branches, subcomponent mocking, `generatedOn` date rendering. |
| `components/coach/PlanHeader.tsx` | ✅ Approve | Widened prop is strictly more sound (drops unused fields). No behaviour change in JSX. Both callers still satisfy structural type. |
| `app/(athlete)/[shareCode]/page.tsx` | ✅ Approve | 3-way parallel RPC. Profile RPC remains sole 404 gate. Plan error non-fatal (empty section > full-page 404). |
| `components/athlete/AthletePanel.tsx` | ✅ Approve | New prop threaded correctly. `PlanPublicSection` below injuries. No realtime wiring (per §5.1). |
| `lib/i18n/pl.ts` | ✅ Approve | Three new keys added; all three consumed. Natural Polish. |
| `tests/integration/athlete/public-route.test.ts` | ✅ Approve | New inactive-code gate test: profile RPC empty → 404, plan data never served. |

## Blocking issues

None.

## Non-blocking observations

1. **Design §8.7 vs §3.4 inconsistency**: §8.7 says "valid-inactive → 404" but §3.4 says "200 { data: null }" (the implemented behaviour). The implementation is correct; the design doc should be reconciled in a future housekeeping pass.
2. **`as unknown as` casts** in `route.ts:46` and `page.tsx:77`: correct but warrant a one-line rationale comment (Supabase `Json` vs `TrainingPlanJson` — shape validated at write time by `trainingPlanJsonSchema`).
3. **Plan-fetch failure silent to user**: `planError` shows empty state indistinguishable from "no plan yet". Acceptable (matches injuries pattern); future story may want a distinct error banner.
4. **Type location inconsistency**: `PublicTrainingPlan` lives in `lib/types/` while coach-side `TrainingPlan` lives in `lib/api/plans.ts`. Not worth reshuffling here.
5. **No E2E (Playwright) test**: Integration coverage is thorough; flag for a future story if E2E is required by DoD policy.

## Security checklist (verified)

- [x] Regex validation before any Supabase call
- [x] Malformed share code → 404 (not 400)
- [x] `SECURITY DEFINER` + `set search_path = public`
- [x] Explicit SELECT column list — no `tp.*`
- [x] `athlete_id` excluded at DB boundary
- [x] Join on `share_active = true`
- [x] EXECUTE grants: `anon` + `authenticated` only
- [x] Error log omits share code and athlete_id
- [x] `plan_json` not logged
- [x] No `ALTER PUBLICATION` in migration
- [x] No realtime subscription for plans
- [x] Cross-athlete isolation enforced in SQL + tested
- [x] Page-level `notFound()` gate for inactive/nonexistent codes tested

## Post-deploy monitoring (per design §10.5)

- RPC latency p99 < 50ms
- No `42883` (function-not-found) errors in logs
- No 500s on `/api/athlete/*/plans`
- No console errors in `PlanHeader` after prop-type widening
