---
id: US-013-design
story: US-013
title: Progresje obciążeń — tracker z wykresem (CRUD wpisów + karty ćwiczeń)
status: proposed
created: 2026-08-19
updated: 2026-08-19
lane: C
related_adrs:
  - ADR-0002-route-handlers-for-crud-with-tanstack-query
  - ADR-0003-auto-save-with-react-hook-form-tanstack-query
supersedes_design: none (new)
---

# US-013 Design — Progresje obciążeń

## 0. TL;DR

Activate the disabled "Progresje" tab in the athlete editor. The coach logs
load progression entries per athlete: one entry per `(athlete, exercise_name,
entry_date)` with weight, reps, sets and a note. Entries are grouped into
exercise cards showing a change badge (last vs. previous weight), a hand-rolled
SVG bar chart (no new dependency), and the entry history. `source` is stored
for the future athlete-side flow (EPIC-C) but this story only accepts
`'coach'`.

## 1. Problem

- The tab is `disabled: true` in `components/coach/AthleteEditorShell.tsx`
  (TABS `progressions`).
- The original spec defines `ProgressionEntry`
  (`{date, weight, reps, sets, note, source: "coach"|"athlete"}`) and
  `AthleteProgressions` keyed by exercise name, plus the screen: "lista
  śledzonych ćwiczeń, wykres słupkowy + historia, badge zmiany, formularz
  dodawania" — no implementation exists.
- No chart library is installed; per dependency policy a simple bar chart is
  hand-rolled in SVG (no new npm dependency).

## 2. Data model

Migration `supabase/migrations/20260820090000_US-013_load_progressions.sql`
(modeled on the US-010 diagnostics migration):

```sql
create table public.load_progressions (
  id            uuid         primary key default gen_random_uuid(),
  athlete_id    uuid         not null references public.athletes(id) on delete cascade,
  exercise_name varchar(100) not null,
  entry_date    date         not null default current_date,
  weight_kg     numeric(6,1) not null check (weight_kg > 0 and weight_kg <= 9999.9),
  reps          varchar(20),
  sets          varchar(20),
  note          varchar(1000),
  source        text         not null default 'coach'
                 check (source in ('coach', 'athlete')),
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

-- one entry per exercise per day, case/leading-trailing-whitespace-insensitive
create unique index load_progressions_unique_day
  on public.load_progressions (athlete_id, lower(btrim(exercise_name)), entry_date);

create trigger load_progressions_updated_at
  before update on public.load_progressions
  for each row execute function extensions.moddatetime(updated_at);

comment on table public.load_progressions is
  'Load progression entries per athlete/exercise/day. source=athlete reserved for EPIC-C.';
```

- `exercise_name` is free text (plans store exercises as JSONB free text; a FK
  would break athletes without plans). API normalizes: trim + collapse
  internal whitespace; the DB cap `varchar(100)` mirrors the API max (the app
  path is direct PostgREST as `authenticated` — same rationale as US-010
  G15). The functional unique index rejects `(Squat, 2026-08-19)` vs
  `(squat, 2026-08-19)` — case- and leading/trailing-whitespace-insensitive
  per-day uniqueness. Internal-whitespace variants ("Squat  Row" vs
  "Squat Row") are only closed by the API normalization; a direct-PostgREST
  caller could create them (data-integrity nuance, no privilege boundary).
- `weight_kg numeric(6,1)` — range 0.1–9999.9 kg enforced by CHECK (mirrors
  the zod cap). `reps`/`sets` are short free-text (e.g. "8", "6-8", "3x5") —
  nullable, max 20 chars.
- `source` is server-forced to `'coach'` on insert (the client never sends
  it); `'athlete'` entries arrive later via the EPIC-C share-code path.
  Residual risk (documented): the DB check allows both values, so a
  coach-session caller writing directly via PostgREST could insert
  `source='athlete'` — no privilege escalation; consequence is badge
  mislabeling ("● zawodnik") in EPIC-C. A BEFORE INSERT trigger forcing
  `'coach'` is deliberately NOT added (EPIC-C would need to drop it; the
  route-level forcing covers the app path).
- `entry_date` (not `date`) to avoid the reserved-word shadowing.

### Rollback

- Forward: new table only; no changes to existing tables.
- Backward: table stays harmless; disabling the tab removes UI access.
- Destructive rollback (drop table) loses coach-entered health data — only as
  an emergency option before real usage.
- Production-deployment risk: new table + RLS, no existing-data migration —
  low; config-level revert (disable tab) has no data loss.

## 3. RLS and security

- `enable row level security` + 4 coach-owner policies exactly like
  `diagnostic_findings` (`athlete_id in (select id from public.athletes where
  coach_id = auth.uid())`).
- NO anon policy, NO public RPC, NO realtime publication — coach-only data.
- Grants are deterministic least privilege (explicit REVOKE ALL from
  `public`/`anon`/`authenticated` first, as Cloud legacy projects carry full
  DML defaults): all-DML to `authenticated`, no table grants to `anon`,
  SELECT on `athletes` to `authenticated` (policy subquery).
- All API routes call `requireAuth` server-side; ownership is enforced by RLS
  and route-level 404 semantics identical to diagnostics routes (cross-coach
  reads/writes resolve to 404 — non-leaky; 401 only when unauthenticated).
- `note` free text, validated server-side (≤1000) and capped in DB
  (`varchar(1000)`), same deviation rationale as US-010.
- Free-text fields (`exercise_name`, `note`, `reps`, `sets`) are rendered by
  React as text nodes / attribute values (`title` tooltips on chart bars) —
  React escapes by default; no raw-HTML sink exists.

## 4. API

Route pattern mirrors `app/api/athletes/[id]/diagnostics*` exactly
(requireAuth, ensureAthleteExists PGRST116→404, zod validation, `23503`→404,
`23505`→409, `Cache-Control: no-store`):

- `GET /api/athletes/[id]/progressions` → `{ data: LoadProgression[] }`
  ordered by `exercise_name asc, entry_date asc` (client groups and computes
  deltas).
- `POST /api/athletes/[id]/progressions` → 201 `{ data }`; 409 on per-day
  conflict (body: `"Wpis progresji dla tego ćwiczenia i dnia już istnieje."`);
  server forces `source: 'coach'` (ignores any client-provided `source`).
- `PATCH /api/athletes/[id]/progressions/[entryId]` → 200; partial update;
  409 on conflict; 400 on empty body (nothing to update).
- `DELETE /api/athletes/[id]/progressions/[entryId]` → 204; 404 unknown id.

`lib/validation/progression.ts`:

```ts
createProgressionSchema = z.object({
  exercise_name: z.string().trim().min(1).max(100),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(calendar-valid date),        // like US-010 observed_at
  weight_kg: z.number().positive().max(9999.9),
  reps: z.string().trim().max(20).optional(),
  sets: z.string().trim().max(20).optional(),
  note: z.string().trim().max(1000).optional(),
  // source is NOT accepted from the client
});
updateProgressionSchema = createProgressionSchema.partial();
```

Decimal `weight_kg` arrives as JSON number (PostgREST `numeric` ↔ JS number
for ≤15 significant digits — safe for 9999.9).

## 5. UI

`components/coach/ProgressionsTab.tsx` (+ `useProgressions` hook mirroring
`useDiagnostics`):

- Create form (top): exercise name text input with `<datalist>` suggestions
  from the athlete's existing tracked exercises, date input (default today),
  weight number input, reps/sets text inputs, notes textarea. Submit disabled
  until exercise name + weight present (AC-8). On 409 the server message is
  rendered inline (form stays open).
- Exercise cards (grouped by `exercise_name`, alphabetical): header with
  exercise name + change badge — delta between the last two entries' weights
  (▲ green up / ▼ red down / — gray unchanged; hidden with 0–1 entries);
  SVG bar chart (hand-rolled: bars = weight_kg by entry_date ascending, Y
  range from data min/max, date labels, tooltip via `title`); history list of
  entries (date, weight kg, reps, sets, note) with inline edit (auto-save via
  `useAutoSave` pattern, last-persisted refs + rollback on error, saved state
  indicator — pattern from US-010 `DiagnosticCard`) and delete with native
  `confirm` (pattern from InjuriesTab).
- States: loading skeleton, empty state ("Brak śledzonych progresji"), error
  toast with retry.
- Tab activation: `AthleteEditorShell.tsx` TABS `progressions` → `disabled:
  false` + render `ProgressionsTab`.
- i18n keys added to `lib/i18n/pl.ts` (form labels, badge, messages) following
  existing naming (tab label "Progresje" already exists).

### Chart — deviation decision

No chart library is added. The bar chart is a small presentational SVG
component (`components/coach/ProgressionChart.tsx`): width 100%, fixed height
(~120px), bars scaled to data min/max with padded domain, `entry_date` labels,
`title` tooltips. Rationale: 1–30 entries per exercise, one metric, static —
a library would add dependency weight for no feature gain.

## 6. Types

`load_progressions` entry in `lib/supabase/database.types.ts` added by hand
(generator unavailable locally — same approach as US-010), verified against
the migration.

## 7. Verification

### SQL gates — `tests/sql/us013-load-progressions-gates.sql`
(wired into `verify-migrations.sh` phases 1 and 2b, with
`tests/sql/fixtures/us013-load-progressions-seed.sql`)

- anon: zero table grants; select/insert denied at grant level
  (`insufficient_privilege`).
- cross-coach: coach B cannot select/insert/update/delete coach A entries.
- coach-owner: full CRUD works for owner.
- per-day uniqueness: second insert same (athlete, exercise_name, entry_date)
  → unique violation; case-variant ("Squat" vs "squat") and
  leading/trailing-whitespace variant also rejected.
- caps: `exercise_name varchar(100)` + `weight_kg` upper CHECK ≤ 9999.9
  (behavioral probe: 101-char name and 10000 kg both rejected, US-010 G15
  pattern).
- checks: `weight_kg <= 0` rejected; invalid `source` rejected; `source`
  defaults to `'coach'`.
- cascade: athlete delete removes entries.
- moddatetime: `updated_at` changes on update.

### Integration (`tests/integration/athletes/progressions-route.test.ts`,
`progressions-detail-route.test.ts`)

Auth 401, 404 unknown athlete, 400 invalid body, 201 create, 409 duplicate,
server-forced `source='coach'`, PATCH partial + 400 empty body, 404 unknown
entry, DELETE 204/404, ordering.

### Unit

- `tests/unit/lib/validation/progression.test.ts` — zod cases (trim, caps,
  calendar-valid date, weight bounds, no `source` accepted).
- `tests/unit/components/coach/ProgressionChart.test.tsx` — 0/1/2+ entries,
  scaling, labels.
- `tests/unit/components/coach/ProgressionCard.test.tsx` — change badge
  (up/down/equal/hidden), auto-save + rollback, delete confirm.
- `tests/unit/components/coach/ProgressionsTab.test.tsx` — loading/empty/
  error+retry, grouping, create-form validation, 409 inline message.

### E2E — `tests/e2e/US-013.spec.ts`

Env-gated (E2E_COACH_EMAIL/PASSWORD, pattern of US-010): AC-1..AC-8 desktop +
Pixel 7 mobile, ephemeral fixture athlete + cleanup.

### Gates

G1 (this story), G2 (this design), G3 dev, G4 UI review, G5 QA, G6 independent
code review, G7 security review (RLS/health data), G9 release readiness.
G8: not triggered (no polling/realtime/heavy queries; charts are static SVG).

## 8. Out of scope / future

- EPIC-C: athlete-side entries (`source='athlete'`) via share-code RPC +
  realtime; badge marks them "● zawodnik" (green) — schema is ready.
- US-019: dashboard card count of tracked progressions.
- AI context integration (consent/health-data decision pending).