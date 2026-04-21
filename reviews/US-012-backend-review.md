---
story: US-012
lane: C
stage: G6
date: 2026-04-21
verdict: APPROVED WITH MINOR ISSUES
blocking: false
reviewer: code-reviewer (Claude)
pr_branch: origin/codex/us-012-backend-tests
pr_commit: 64b74d2
---

# G6 Independent Code Review — US-012 backend slice

Scope: backend slice only — migration + RLS, GET/POST list route, DELETE detail route, catalog, Zod schema, integration + unit tests. Frontend (Tabs/Form/History/Trend) and E2E remain out of scope per DoD checklist update in this PR.

Note: prompt description listed GET-single + PATCH for `[testId]/route.ts`; actual file (and DoD) covers DELETE only. No issue — matches story.

## Security / Auth — PASS
- `requireAuth` is invoked first in every handler; `mockFrom` non-call asserted in 401 tests confirms guard ordering. (`route.ts:91`, `:130`, `[testId]/route.ts:18`)
- RLS is correctly defense-in-depth on top of `requireAuth`: SELECT/INSERT/DELETE policies all gate via `athlete_id IN (SELECT id FROM athletes WHERE coach_id = auth.uid())`. Migration also enables RLS before adding policies.
- No `SECURITY DEFINER` introduced (US-011 added one for share_code; US-012 does not need one — correct minimal scope).
- DB error messages never bubble to client; only `code/message` logged server-side, generic Polish strings returned.
- No service-role usage; routes use `createClient()` (cookie-bound user session). Good.
- App-layer sport-vs-test allowlist (`isFitnessTestKeyAllowedForSport`) enforced server-side on POST; cannot be bypassed from client.

## Code quality — PASS with minor advisories
- Strict TS, no `any`, no `as unknown as X`. `as readonly string[]` cast in `normalizeSport` is justified (narrowing union from sports.ts const tuple to lookup).
- Zod schema column alignment: `value` numeric `>= 0` matches `check (value >= 0)`; `test_date` regex matches `date` default; `notes` `nullish().max(1000)` matches nullable `text`. `test_key` `max(64)` is app-layer only — DB column is `text` unbounded; acceptable since allowlist guards it.
- Response shape `{ data }` / `{ error, issues? }` consistent with `injuries` route precedent. Status codes correct: 200/201/204/400/401/404/500.
- Pattern consistency with US-011 injuries route is excellent — `fetchAthleteSummary` is essentially a typed superset of `ensureAthleteExists` (returns athlete object so POST can read sport). Sensible reuse pattern.

Advisories (non-blocking):
1. `lib/constants/fitness-tests.ts:174` — `getFitnessTestsForSport` does a linear scan per call; fine at N=18, but if catalog grows consider a precomputed `Map<Sport, FitnessTestDefinition[]>`.
2. Migration: no `update_own` policy and no `updated_at` column — consistent with DoD ("DELETE only", no edit). If a future story adds editing of past results, the policy gap will need attention.
3. Migration: realtime publication added (`supabase_realtime add table`) but there is no broadcast logic in routes (unlike `injuries`). Harmless, but unused capability — confirm intent or drop.
4. Polish copy uses ASCII-folded strings ("Nie udalo sie", "usunac") — matches existing precedent in this file but inconsistent with the diacritic-correct "Nie udało się" in `injuries/route.ts`. Centralizing copy in `lib/i18n/pl.ts` would fix both. Out of scope for this PR.
5. `value.max(100000)` is a soft sanity cap — fine, but no DB-side upper bound. Acceptable.

## Tests — PASS
- Integration: 401 (unauth + auth-error), 400 (bad JSON path implicitly via schema, invalid body, sport-mismatch), 404 (PGRST116 athlete missing, FK-23503, no-row delete), 200/201/204 happy paths, 500 with no `details` leakage. Strong coverage.
- Unit catalog: positive + negative sport filtering, null-sport branch, unknown key, metadata lookup. Good.
- Unit Zod: valid, unknown key, negative, bad date format. Could add: missing test_key, oversize notes, NaN/Infinity value, optional test_date omitted accepted — minor gaps.
- Tests use module-level `vi.mock` for `@/lib/supabase/server`; no real DB credentials, no RLS bypass.

## Scope control — PASS
- 12 files; all are net-new for the feature OR allowed metadata updates (`backlog/backlog.md` status flip Draft→InDev, `backlog/stories/US-012-fitness-tests.md` DoD checkboxes + `updated`, `lib/supabase/database.types.ts` regenerated row for the new table).
- Migration is purely additive (`create table`, `alter ... enable rls`, `create policy`, `create index`, `alter publication add table`). No `ALTER TABLE` on existing tables. Forward-only; rollback is `drop table` + remove from publication — feasible.
- No edits to `use-auto-save.ts`, `share.ts`, `CLAUDE.md`, `.gitignore`. Confirmed via diff.

## CI status
- lint / typecheck / test / build = green per prompt.
- Supabase Preview = red due to known `moddatetime` extension issue on US-011 migration (pre-existing infra limitation, not introduced by this PR). Non-blocking for G6; flag for release readiness (G9) only if it blocks merge automation.

## Verdict
APPROVED WITH MINOR ISSUES — no blocking findings. Advisories 1–5 are tracked here and may be addressed opportunistically or in the frontend slice; do not gate merge of this backend PR.

## Follow-ups for next slice
- Frontend Tabs/Selector/Form/History/TrendIndicator + i18n entries.
- E2E spec covering add → list → trend → delete.
- If catalog grows, switch sport→tests lookup to precomputed Map.
- Consider centralising error copy through `lib/i18n/pl.ts`.
