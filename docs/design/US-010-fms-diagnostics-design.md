---
id: US-010-design
story: US-010
title: Diagnostyka FMS — bieżące znaleziska (CRUD + katalog mięśni)
status: proposed
created: 2026-08-19
updated: 2026-08-19
lane: C
related_adrs:
  - ADR-0002-route-handlers-for-crud-with-tanstack-query
  - ADR-0003-auto-save-with-react-hook-form-tanstack-query
supersedes_design: none (new; US-015 will extend this model with snapshots)
---

# US-010 Design — Diagnostyka FMS

## 0. TL;DR

Activate the disabled "Diagnostyka FMS" tab in the athlete editor. The coach
records **current** FMS findings per athlete: one row per `(athlete, muscle,
side)` with a severity level, note, and observation date. The 68-muscle
catalog from the original spec becomes a versioned TypeScript constant
(no editable DB table). Snapshots/history (US-015), athlete visibility, and AI
context integration are explicitly out of scope.

## 1. Problem

- The tab is `disabled: true` in `components/coach/AthleteEditorShell.tsx`.
- Plan generation always receives `diagnosticFindings: []`
  (`lib/ai/prompts/plan-generation.ts`) — the data model does not exist yet.
- The original spec defines the data shape (DiagnosticFinding) and the
  68-muscle catalog, but no implementation exists.

## 2. Data model

Migration `supabase/migrations/20260819120000_US-010_diagnostic_findings.sql`
(modeled on the US-011 injuries migration):

```sql
create table public.diagnostic_findings (
  id          uuid        primary key default gen_random_uuid(),
  athlete_id  uuid        not null references public.athletes(id) on delete cascade,
  muscle_key  text        not null,
  side        text        not null check (side in ('left', 'right')),
  severity    text        not null check (severity in ('weak', 'very_weak', 'dysfunction')),
  notes       varchar(1000),
  observed_at date        not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint diagnostic_findings_unique_current
    unique (athlete_id, muscle_key, side)
);

create index idx_diagnostic_findings_athlete_observed
  on public.diagnostic_findings (athlete_id, observed_at desc);

create trigger diagnostic_findings_updated_at
  before update on public.diagnostic_findings
  for each row execute function extensions.moddatetime(updated_at);

comment on table public.diagnostic_findings is
  'Current FMS findings per athlete/muscle/side. History via US-015 snapshots.';
```

- `muscle_key` references the TypeScript catalog by stable snake_case key —
  no FK to a DB table (catalog is versioned in code, matching
  `lib/constants/body-locations.ts` pattern used by injuries).
- Unique constraint gives DB-enforced "one current finding" semantics;
  conflicts surface as 409 in the API (never silent overwrite).
- Date stored as `date` (calendar day of examination), default today.

### Deviation from spec

The spec's `DiagnosticFinding.region` is NOT stored in the table: region
(Góra/Dół/Stopa) is derived from the catalog via `muscle_key`. Rationale:
region is immutable catalog metadata, not examination data; storing it would
allow inconsistency with the catalog. UI grouping reads it from
`MUSCLES` lookup.

### Rollback

- Forward: new table only; no changes to existing tables.
- Backward: table stays harmless; disabling the tab removes UI access.
- Destructive rollback (drop table) is NOT safe once data exists (US-015
  will need the rows for snapshots) — documented residual.
- Production-deployment risk: new table + RLS with no existing-data migration
  and no behavior change to existing endpoints — low risk; if a problem is
  found post-release, disable the tab (config-level revert, no data loss).

## 3. RLS and security

- `enable row level security` + 4 coach-owner policies exactly like `injuries`
  (`athlete_id in (select id from public.athletes where coach_id = auth.uid())`).
- NO anon policy, NO anon table grants, NO public RPC, NO realtime
  publication — FMS is coach-only in this story (athlete visibility is a
  US-015 decision). The migration revokes all table grants from
  `public`/`anon`/`authenticated` first, then grants CRUD to `authenticated`
  only, so legacy Cloud defaults cannot leave anon access behind.
- All API routes call `requireAuth` server-side; ownership is enforced by RLS
  (select returns empty / insert `WITH CHECK` fails) and by route-level 404
  semantics identical to injuries routes.
- Notes are free text, validated server-side (≤1000 chars) like injuries.

## 4. Muscle catalog

`lib/constants/muscles.ts`:

```ts
export type MuscleRegion = "upper" | "lower" | "foot";
export interface Muscle {
  key: string;        // stable snake_case, e.g. "anterior_deltoid"
  namePl: string;     // "Naramienny przedni"
  nameLatin: string;  // "Anterior Deltoid"
  region: MuscleRegion;
}
export const MUSCLES: Muscle[] = [ /* 68 entries — appendix */ ];
export const MUSCLE_KEYS = MUSCLES.map((m) => m.key) as [string, ...string[]];
```

- Search combines `namePl` + `nameLatin` (case-insensitive, diacritic-insensitive
  for Polish input where practical).
- Region grouping: Góra (30) / Dół (24) / Stopa (14) — full list in appendix.
- Keys are stable identifiers for DB rows and future AI context; renaming a
  key in the future = catalog version bump + mapping, not a DB migration.

## 5. API

Route pattern builds on `app/api/athletes/[id]/injuries*` (requireAuth,
ensureAthleteExists with PGRST116→404, zod validation, `23503`→404) and
EXTENDS it: the injuries routes do not map unique conflicts, so diagnostics
adds explicit `23505`→409 handling.

- `GET /api/athletes/[id]/diagnostics` → `{ data: DiagnosticFinding[] }`
  ordered by `observed_at desc, created_at desc`; `Cache-Control: no-store`
  (health data).
- `POST /api/athletes/[id]/diagnostics` → 201 `{ data }`; 409 on unique
  conflict (body: `"Znalezisko dla tego mięśnia i strony już istnieje."`).
- `PATCH /api/athletes/[id]/diagnostics/[findingId]` → 200; partial update;
  severity/notes/observed_at/side/muscle_key all allowed; 409 on conflict;
  400 on an empty body (nothing to update).
- `DELETE /api/athletes/[id]/diagnostics/[findingId]` → 204; 404 unknown id.

`lib/validation/diagnostic.ts`:

```ts
createDiagnosticSchema = z.object({
  muscle_key: z.enum(MUSCLE_KEYS),
  side: z.enum(["left", "right"]),
  severity: z.enum(["weak", "very_weak", "dysfunction"]),
  notes: z.string().max(1000).nullish(),
  observed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) // default today in UI
    .refine(calendar-valid date), // deviation: shape-only regex let
                                   // impossible dates (2026-02-31) reach the
                                   // DB and surface as generic 500s
});
updateDiagnosticSchema = createDiagnosticSchema.partial();
```

Implementation deviation (security): the schema-level `notes` cap is mirrored
in the DB as `notes varchar(1000)` (the app's own access path is direct
PostgREST as `authenticated`, so the DB must enforce the cap too).

## 6. UI

`components/coach/DiagnosticsTab.tsx` (+ `useDiagnostics` hook mirroring
`useInjuries`):

- Create form (top): searchable combobox (input filter + arrow/enter
  keyboard, results grouped by region, "Polska (Latin)" labels), side toggle
  (Lewa/Prawa), severity 3-button group (Słaby / Bardzo słaby / Dysfunkcja),
  date input (default today), notes textarea. Submit disabled until
  muscle + severity present (AC-7).
- List: grouped sections Góra / Dół / Stopa; within a group ordered by
  severity (dysfunction first, then very_weak, then weak) and by
  `observed_at` descending as tiebreak; each finding shows muscle
  (Polska (Latin)), side badge, severity badge, date, notes.
- Inline edit (expanded card, auto-save via `useAutoSave` pattern from
  injuries/edit forms): severity select, notes, date.
- Delete: confirm dialog (native `confirm`, like InjuriesTab).
- States: loading skeleton, empty state ("Brak zarejestrowanych znalezisk"),
  error toast, 409 inline message on create conflict.
- Tab activation: `AthleteEditorShell.tsx` TABS diagnostics `disabled: false`.
- i18n keys added to `lib/i18n/pl.ts` (region labels, severities, badges,
  form labels, messages) following existing naming.

## 7. Types

The `diagnostic_findings` entry in `lib/supabase/database.types.ts` was added
by hand (generator unavailable on the local stack; verified against the
migration). Regenerate with `npx supabase gen types typescript` when the
generator is available, then `DiagnosticFinding = Tables<"diagnostic_findings">`.

## 8. Verification

### SQL gates — `tests/sql/us010-fms-gates.sql` (wired into `verify-migrations.sh`)

- anon: zero table grants; select/insert denied at grant level
  (`insufficient_privilege`).
- cross-coach: coach B cannot select/insert/update/delete coach A findings.
- coach-owner: full CRUD works for owner.
- unique: second insert same (athlete, muscle, side) → constraint error.
- cascade: athlete delete removes findings.
- checks: invalid side/severity rejected; moddatetime touches updated_at.

### Integration (`tests/integration/athletes/diagnostics-route.test.ts`, `diagnostics-detail-route.test.ts`)

Auth 401, 404 unknown athlete, 400 invalid body, 201 create, 409 duplicate,
PATCH partial, 404 unknown finding, DELETE 204/404, ordering.

### Unit

- `tests/unit/lib/constants/muscles.test.ts` — 68 entries, unique keys,
  region counts (30/24/14), search behavior (empty/Polish/Latin,
  diacritic-insensitive).
- `tests/unit/lib/validation/diagnostic.test.ts` — zod cases (incl.
  calendar-impossible date rejection).
- `tests/unit/components/coach/MuscleCombobox.test.tsx` — search filter
  (Polish/Latin, diacritic-insensitive), keyboard selection (arrows/Enter/
  Escape), click selection, ARIA combobox contract.
- `tests/unit/components/coach/DiagnosticCreateForm.test.tsx` — disabled
  submit until muscle chosen, payload + close on success, server error
  (409) message, submitting state.
- `tests/unit/components/coach/DiagnosticCard.test.tsx` — severity
  auto-save + saved state, rollback on failed save, no re-PATCH on
  unchanged blur, delete confirm.
- `tests/unit/components/coach/DiagnosticsTab.test.tsx` — loading/empty/
  error+retry, region grouping, severity+date ordering, create-form toggle,
  submit-disabled state.

### E2E — `tests/e2e/US-010.spec.ts`

Env-gated (E2E_COACH_EMAIL/PASSWORD, pattern of US-011/US-012): AC-1..AC-7
desktop + Pixel 7 mobile, ephemeral fixture athlete + cleanup.

### Gates

G1 (this story), G2 (this design), G3 dev, G4 UI review, G5 QA, G6 independent
code review, G7 security review (RLS/health data), G9 release readiness +
preview smoke. G8: not triggered (no polling/realtime/heavy queries).

## 9. Out of scope / future

- US-015: snapshot history + restore (depends on this table; will need
  retention/immutability decisions).
- Public athlete visibility of FMS (decision with US-015).
- AI context integration: requires consent/health-data decision
  (`docs/design/athlete-context-system-design.md` §10) — separate story.

## Appendix — muscle catalog (68)

Góra (30): anterior_deltoid, lateral_deltoid, posterior_deltoid,
upper_trapezius, middle_trapezius, lower_trapezius, latissimus_dorsi,
pectoralis_major, pectoralis_minor, biceps_brachii, triceps_brachii,
brachioradialis, rhomboid, serratus_anterior, supraspinatus, infraspinatus,
subscapularis, teres_minor, teres_major, levator_scapulae, erector_spinae,
rectus_abdominis, external_oblique, internal_oblique, transversus_abdominis,
wrist_extensors, wrist_flexors, diaphragm, multifidus, quadratus_lumborum.

Dół (24): rectus_femoris, vastus_lateralis, vastus_medialis,
vastus_intermedius, biceps_femoris, semitendinosus, semimembranosus,
gluteus_maximus, gluteus_medius, gluteus_minimus, adductor_longus,
adductor_magnus, adductor_brevis, gracilis, tensor_fasciae_latae, iliopsoas,
piriformis, gastrocnemius, soleus, tibialis_anterior, peroneus_longus,
peroneus_brevis, popliteus, sartorius.

Stopa (14): flexor_digitorum_brevis, flexor_digitorum_longus, abductor_hallucis,
adductor_hallucis, flexor_hallucis_brevis, flexor_hallucis_longus,
extensor_digitorum_brevis, extensor_digitorum_longus, dorsal_interossei,
plantar_interossei, lumbricals, quadratus_plantae, tibialis_posterior,
abductor_digiti_minimi.

Polish/Latin labels: from `docs/spec/original-spec.md` "Baza mięśni — Diagnostyka FMS (68 mięśni)" (authoritative source).