---
id: US-011-design
story: US-011
title: Kontuzje zawodnika - lista z severity
status: proposed
created: 2026-04-16
updated: 2026-04-16
related_adrs: [ADR-0003]
---

# US-011 Design — Kontuzje zawodnika

## Context

US-011 adds injury tracking per athlete: a new `injuries` table, CRUD API routes,
a new "Kontuzje" tab in the athlete editor (with auto-save for edits, explicit
submit for creation), and a read-only injuries section on the public athlete panel.

The "Kontuzje" tab already exists in `AthleteEditorShell` with `disabled: true`
and `pl.coach.athlete.tabs.injuries = "Kontuzje"` is already defined.

---

## 1. Database Schema

### Migration: `20260416120000_US-011_injuries.sql`

```sql
-- US-011: Injury tracking per athlete
CREATE TABLE injuries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id  UUID        NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  body_location TEXT      NOT NULL,
  severity    SMALLINT    NOT NULL CHECK (severity BETWEEN 1 AND 5),
  injury_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  status      TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'healing', 'healed')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing injuries by athlete (ordered by date desc).
CREATE INDEX idx_injuries_athlete_id ON injuries(athlete_id, injury_date DESC);

-- RLS --
ALTER TABLE injuries ENABLE ROW LEVEL SECURITY;

-- Coach can SELECT injuries of own athletes.
CREATE POLICY injuries_select_own ON injuries
  FOR SELECT
  TO authenticated
  USING (
    athlete_id IN (
      SELECT id FROM athletes WHERE coach_id = auth.uid()
    )
  );

-- Coach can INSERT injuries for own athletes.
CREATE POLICY injuries_insert_own ON injuries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    athlete_id IN (
      SELECT id FROM athletes WHERE coach_id = auth.uid()
    )
  );

-- Coach can UPDATE injuries of own athletes.
CREATE POLICY injuries_update_own ON injuries
  FOR UPDATE
  TO authenticated
  USING (
    athlete_id IN (
      SELECT id FROM athletes WHERE coach_id = auth.uid()
    )
  )
  WITH CHECK (
    athlete_id IN (
      SELECT id FROM athletes WHERE coach_id = auth.uid()
    )
  );

-- Coach can DELETE injuries of own athletes.
CREATE POLICY injuries_delete_own ON injuries
  FOR DELETE
  TO authenticated
  USING (
    athlete_id IN (
      SELECT id FROM athletes WHERE coach_id = auth.uid()
    )
  );

-- Anon can read active injuries for shared athletes (public panel AC-6).
CREATE POLICY injuries_select_public ON injuries
  FOR SELECT
  TO anon
  USING (
    status = 'active'
    AND athlete_id IN (
      SELECT id FROM athletes WHERE share_active = true
    )
  );

-- Trigger: auto-update updated_at on row change.
CREATE OR REPLACE FUNCTION update_injuries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_injuries_updated_at
  BEFORE UPDATE ON injuries
  FOR EACH ROW
  EXECUTE FUNCTION update_injuries_updated_at();

-- Enable Realtime for injuries table (broadcast to athlete channel).
ALTER PUBLICATION supabase_realtime ADD TABLE injuries;
```

### Key decisions

| Decision | Rationale |
|---|---|
| RLS via subquery `athletes.coach_id = auth.uid()` | Same pattern as `training_plans`. No direct `coach_id` on `injuries` — single source of truth. |
| Anon policy filters `status = 'active'` + `share_active = true` | Public panel shows only active injuries (AC-6). |
| `updated_at` trigger | Consistent with `athletes` table behavior. Needed for auto-save "✓ Zapisano" timestamp. |
| Realtime publication | Enables broadcast to `athlete:{shareCode}` channel for live injury updates. |
| `body_location` as TEXT (not enum) | Values are defined in app code (`lib/constants/body-locations.ts`) for easier i18n. DB stores the key, UI translates. |

---

## 2. API Routes

### 2.1 `GET /api/athletes/[id]/injuries`

Returns all injuries for the athlete, ordered by `injury_date DESC`.

```
Response 200: { data: Injury[] }
Response 401: { error: "Brak autoryzacji." }
Response 500: { error: "Nie udało się pobrać kontuzji." }
```

### 2.2 `POST /api/athletes/[id]/injuries`

Creates a new injury.

```
Request body (Zod schema):
{
  name: string          // min 1, max 200
  body_location: string // must be in BODY_LOCATIONS keys
  severity: number      // integer 1-5
  injury_date: string   // ISO date YYYY-MM-DD
  status?: string       // 'active' | 'healing' | 'healed', default 'active'
  notes?: string        // max 1000
}

Response 201: { data: Injury }
Response 400: { error: string, issues?: ZodIssue[] }
Response 401: { error: "Brak autoryzacji." }
Response 500: { error: "Nie udało się dodać kontuzji." }
```

### 2.3 `PATCH /api/athletes/[id]/injuries/[injuryId]`

Updates an existing injury (partial update).

```
Request body (Zod schema — all optional):
{
  name?: string
  body_location?: string
  severity?: number
  injury_date?: string
  status?: string
  notes?: string | null
}

Response 200: { data: Injury }
Response 400: { error: string }
Response 401: { error: "Brak autoryzacji." }
Response 404: { error: "Nie znaleziono kontuzji." }
Response 500: { error: "Nie udało się zaktualizować kontuzji." }
```

### 2.4 `DELETE /api/athletes/[id]/injuries/[injuryId]`

Deletes an injury.

```
Response 204: (no body)
Response 401: { error: "Brak autoryzacji." }
Response 404: { error: "Nie znaleziono kontuzji." }
Response 500: { error: "Nie udało się usunąć kontuzji." }
```

### Zod schemas

File: `lib/validation/injury.ts`

```typescript
import { z } from "zod";
import { BODY_LOCATIONS } from "@/lib/constants/body-locations";

const bodyLocationKeys = BODY_LOCATIONS.map(l => l.key);

export const createInjurySchema = z.object({
  name: z.string().min(1).max(200),
  body_location: z.enum(bodyLocationKeys as [string, ...string[]]),
  severity: z.number().int().min(1).max(5),
  injury_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["active", "healing", "healed"]).default("active"),
  notes: z.string().max(1000).nullish(),
});

export const updateInjurySchema = createInjurySchema.partial();

export type CreateInjuryInput = z.infer<typeof createInjurySchema>;
export type UpdateInjuryInput = z.infer<typeof updateInjurySchema>;
```

### Route handler pattern

Same as `share/route.ts`:
1. `await params` (Next.js 16 async)
2. `requireAuth(supabase, label)`
3. Body parse → Zod validate → Supabase call
4. PGRST116 check → 404, other errors → 500

---

## 3. Client-side Data Layer

### Query key factory

File: `lib/api/injuries.ts`

```typescript
export const injuryKeys = {
  all: (athleteId: string) => ["athletes", athleteId, "injuries"] as const,
  list: (athleteId: string) => [...injuryKeys.all(athleteId), "list"] as const,
};
```

Nested under the athlete key hierarchy so `invalidateQueries({ queryKey: athleteKeys.detail(id) })`
does NOT accidentally affect injury queries and vice versa.

### Hooks

File: `lib/hooks/use-injuries.ts`

```typescript
// useInjuries(athleteId)  — list all injuries for athlete
// useCreateInjury(athleteId)  — mutation: POST
// useUpdateInjury(athleteId)  — mutation: PATCH (used via useAutoSave)
// useDeleteInjury(athleteId)  — mutation: DELETE
```

- `useCreateInjury.onSuccess` → `invalidateQueries(injuryKeys.list(athleteId))`
- `useUpdateInjury.onSuccess` → optimistic `setQueryData` update in list cache
- `useDeleteInjury.onSuccess` → `invalidateQueries(injuryKeys.list(athleteId))`

---

## 4. Component Tree

```
AthleteEditorShell [CC] (existing — flip injuries tab disabled → false)
  TabPills [CC] (existing)
  {activeTab === "injuries" &&
    InjuriesTab [CC]                          ← NEW
      InjuryCreateForm [CC]                   ← NEW (dialog or inline)
      InjuryList [CC]                         ← NEW
        InjuryCard [CC] (mapped per injury)   ← NEW
          InjurySeverityBadge [CC]            ← NEW
          InjuryStatusBadge [CC]             ← NEW
          InjuryEditForm [CC]                ← NEW (expandable inline)
            SaveStatusIndicator [CC] (existing — reuse)
  }

AthletePanel [CC] (existing — public view)
  AthleteProfileView [CC] (existing)
  InjuriesPublicSection [CC]                  ← NEW (read-only, active only)
```

### Component details

#### `InjuriesTab`
- Props: `{ athlete: Athlete }`
- Fetches `useInjuries(athlete.id)` for the list
- Top section: "Dodaj kontuzję" button → opens `InjuryCreateForm` dialog
- Bottom section: `InjuryList` with all injuries (sorted by `injury_date DESC`)
- Empty state: card with `pl.coach.athlete.injuries.empty` message

#### `InjuryCreateForm`
- Dialog (modal) using Radix Dialog primitive
- react-hook-form + Zod validation (`createInjurySchema`)
- Fields: name (input), body_location (select), severity (select 1-5),
  injury_date (date input, default today), status (select), notes (textarea)
- **Explicit submit** (not auto-save — this is a deliberate creation action)
- On success: close dialog, `useCreateInjury` invalidates list

#### `InjuryCard`
- Expandable card: collapsed shows name + severity badge + status badge + date
- Click to expand → shows `InjuryEditForm` inline
- Delete icon (trash) in top-right → `window.confirm()` → `useDeleteInjury`

#### `InjuryEditForm`
- Inline form within expanded `InjuryCard`
- react-hook-form + `useAutoSave` (reuse from US-003)
- `mutationFn` → `useUpdateInjury.mutateAsync`
- `SaveStatusIndicator` shows "✓ Zapisano" on successful auto-save
- Debounce 800ms, same as profile form

#### `InjurySeverityBadge`
- Pure presentational. Props: `{ severity: 1 | 2 | 3 | 4 | 5 }`
- Color map:
  ```
  1 → green   "1 - Lekka"
  2 → lime    "2 - Umiarkowana"
  3 → yellow  "3 - Średnia"
  4 → orange  "4 - Poważna"
  5 → red     "5 - Ciężka"
  ```

#### `InjuryStatusBadge`
- Pure presentational. Props: `{ status: 'active' | 'healing' | 'healed' }`
- Color map:
  ```
  active  → red    "Aktywna"
  healing → yellow "W leczeniu"
  healed  → green  "Wyleczona"
  ```

#### `InjuriesPublicSection`
- Props: `{ injuries: InjuryPublic[] }` (only active injuries, filtered by RLS)
- Read-only list of injury cards (no edit, no delete)
- Shows: name, body_location (translated), severity badge, injury_date
- Rendered in `AthletePanel` below the profile section

---

## 5. Constants

### `lib/constants/body-locations.ts`

```typescript
export interface BodyLocation {
  key: string;     // DB value, e.g. "knee"
  label_pl: string; // Display via i18n, e.g. "Kolano"
}

export const BODY_LOCATIONS: BodyLocation[] = [
  { key: "shoulder",       label_pl: "Bark" },
  { key: "upper_arm",      label_pl: "Ramię" },
  { key: "elbow",          label_pl: "Łokieć" },
  { key: "wrist",          label_pl: "Nadgarstek" },
  { key: "hand",           label_pl: "Dłoń" },
  { key: "cervical_spine", label_pl: "Kręgosłup szyjny" },
  { key: "thoracic_spine", label_pl: "Kręgosłup piersiowy" },
  { key: "lumbar_spine",   label_pl: "Kręgosłup lędźwiowy" },
  { key: "hip",            label_pl: "Biodro" },
  { key: "knee",           label_pl: "Kolano" },
  { key: "ankle",          label_pl: "Kostka" },
  { key: "foot",           label_pl: "Stopa" },
  { key: "quad",           label_pl: "Udo (przód)" },
  { key: "hamstring",      label_pl: "Udo (tył)" },
  { key: "calf",           label_pl: "Łydka" },
  { key: "chest",          label_pl: "Klatka piersiowa" },
  { key: "abdomen",        label_pl: "Brzuch" },
  { key: "other",          label_pl: "Inne" },
];
```

Keys stored in DB, labels rendered via `pl.coach.athlete.injuries.bodyLocation[key]`
(or directly from `BODY_LOCATIONS.find(l => l.key === value)?.label_pl`).

---

## 6. i18n Additions

```typescript
// lib/i18n/pl.ts — new section under coach.athlete
injuries: {
  empty: "Brak zarejestrowanych kontuzji.",
  addButton: "Dodaj kontuzję",
  createTitle: "Nowa kontuzja",
  editTitle: "Edytuj kontuzję",
  deleteConfirm: "Czy na pewno chcesz usunąć tę kontuzję?",
  field: {
    name: "Nazwa / opis",
    bodyLocation: "Lokalizacja",
    severity: "Stopień ciężkości",
    injuryDate: "Data kontuzji",
    status: "Status",
    notes: "Notatki",
  },
  severity: {
    1: "1 - Lekka",
    2: "2 - Umiarkowana",
    3: "3 - Średnia",
    4: "4 - Poważna",
    5: "5 - Ciężka",
  },
  status: {
    active: "Aktywna",
    healing: "W leczeniu",
    healed: "Wyleczona",
  },
  bodyLocation: {
    shoulder: "Bark",
    upper_arm: "Ramię",
    elbow: "Łokieć",
    // ... (all keys from BODY_LOCATIONS)
    other: "Inne",
  },
},
```

---

## 7. Public Panel Extension (AC-6)

### Option A (recommended): Separate fetch in AthletePanel

The `AthletePanel` client component currently receives `initialData: AthletePublic`
from the RSC page and subscribes to Supabase Realtime.

For injuries:
1. RSC page does a **second query**: `supabase.from("injuries").select("*").eq("athlete_id", initialData.id)`
   — RLS anon policy auto-filters to `status = 'active'` + `share_active = true`.
2. Pass as `initialInjuries: InjuryPublic[]` prop to `AthletePanel`.
3. `AthletePanel` renders `<InjuriesPublicSection injuries={initialInjuries} />`.
4. Realtime: subscribe to `injuries` table changes for the athlete and update local state.

### Why not extend the RPC?

`get_athlete_by_share_code` returns a flat row. Adding injuries would require
returning JSONB arrays or multiple result sets. A separate query is simpler,
type-safe, and follows the existing pattern where the RSC page makes multiple
parallel Supabase calls.

---

## 8. Realtime

### Coach-side (editor)
Not needed — TanStack Query handles optimistic updates and invalidation.
Only one coach uses the app (single-user mode per CLAUDE.md).

### Athlete-side (public panel)
Subscribe to Postgres changes on `injuries` table filtered by `athlete_id`.
On `INSERT`, `UPDATE`, `DELETE` events → refetch injuries or patch local state.

Same channel as existing athlete realtime: `athlete:{shareCode}`.

Implementation in `AthletePanel`: extend the existing `useRealtimeAthlete`
subscription or add a parallel subscription for injuries changes.

---

## 9. Test Plan

### Unit tests (Vitest + Testing Library)

| Test file | Cases |
|---|---|
| `tests/unit/components/coach/InjurySeverityBadge.test.tsx` | 5 severity levels → correct text + color class |
| `tests/unit/components/coach/InjuryStatusBadge.test.tsx` | 3 statuses → correct text + color class |
| `tests/unit/lib/validation/injury.test.ts` | createInjurySchema: valid, missing required, invalid severity, invalid body_location, invalid date format |

**Estimated: ~15 cases**

### Integration tests (Vitest, mocked Supabase)

| Test file | Cases |
|---|---|
| `tests/integration/athletes/injuries-route.test.ts` | GET list (200, 401, 500), POST create (201, 400 validation, 401, 500) |
| `tests/integration/athletes/injury-detail-route.test.ts` | PATCH update (200, 400, 401, 404, 500), DELETE (204, 401, 404, 500) |

**Estimated: ~14 cases**

### E2E tests (Playwright)

| Test file | Cases |
|---|---|
| `tests/e2e/US-011.spec.ts` | Create injury via dialog → appears in list, edit severity inline (auto-save "✓ Zapisano"), change status (auto-save), delete with confirm, verify API cleanup |

**Estimated: ~4 cases** (serial, one comprehensive flow + edge cases)

---

## 10. File Change Summary

| Action | Path |
|---|---|
| **NEW** | `supabase/migrations/20260416120000_US-011_injuries.sql` |
| **NEW** | `lib/constants/body-locations.ts` |
| **NEW** | `lib/validation/injury.ts` |
| **NEW** | `lib/api/injuries.ts` (fetch fns + query keys) |
| **NEW** | `lib/hooks/use-injuries.ts` |
| **NEW** | `app/api/athletes/[id]/injuries/route.ts` (GET, POST) |
| **NEW** | `app/api/athletes/[id]/injuries/[injuryId]/route.ts` (PATCH, DELETE) |
| **NEW** | `components/coach/InjuriesTab.tsx` |
| **NEW** | `components/coach/InjuryCreateForm.tsx` |
| **NEW** | `components/coach/InjuryList.tsx` |
| **NEW** | `components/coach/InjuryCard.tsx` |
| **NEW** | `components/coach/InjuryEditForm.tsx` |
| **NEW** | `components/coach/InjurySeverityBadge.tsx` |
| **NEW** | `components/coach/InjuryStatusBadge.tsx` |
| **NEW** | `components/athlete/InjuriesPublicSection.tsx` |
| **MODIFY** | `components/coach/AthleteEditorShell.tsx` — flip `injuries` disabled → false, add InjuriesTab render |
| **MODIFY** | `lib/i18n/pl.ts` — add `coach.athlete.injuries.*` section |
| **MODIFY** | `lib/supabase/database.types.ts` — regenerate (new `injuries` table type) |
| **MODIFY** | `app/(athlete)/[shareCode]/page.tsx` — fetch injuries, pass to panel |
| **MODIFY** | `components/athlete/AthletePanel.tsx` — render InjuriesPublicSection |
| **NEW** | Test files (see section 9) |

**Total: ~16 new files, ~5 modified files**

---

## 11. Scope Boundaries

### In scope
- Injuries CRUD (coach editor)
- Auto-save for editing existing injuries
- Severity + status badges with color coding
- Public panel: read-only active injuries section
- Realtime updates on public panel
- Body locations as static constant (not DB enum)

### Out of scope (future stories)
- Injury impact on AI plan generation (US-005 enhancement)
- Injury history timeline / chart visualization
- Photo attachments for injuries
- Linking injuries to specific exercises
- Coach-to-athlete injury notifications
