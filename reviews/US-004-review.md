---
story: US-004
reviewer: code-reviewer
date: 2026-04-15
verdict: Approve
---

# US-004 — Share code + panel zawodnika + real-time sync — Code Review

## Summary

Solid implementation of the public athlete surface, with a defensible security
posture end-to-end: RLS-bypassing RPCs are `SECURITY DEFINER` with explicit
`auth.uid()` ownership checks or a `share_active = true` guard; the public row
shape strips `coach_id` and `created_at`; the broadcast payload mirrors the
public shape; regex normalization is consistent across client and server. All 8
acceptance criteria covered, 180/180 tests pass, typecheck and lint clean.

## Checklist

| # | Check | Result |
|---|---|---|
| 1 | AC-1..AC-8 coverage | PASS |
| 2 | Migration — `share_active boolean not null default false` (opt-in); `get_athlete_by_share_code` SECURITY DEFINER returns sanitized columns and filters `share_active = true`; `reset_share_code` SECURITY DEFINER with `auth.uid()` ownership check (`supabase/migrations/20260414120000_US-004_share_active_and_rpc.sql`) | PASS |
| 3 | Public `GET /api/athlete/[shareCode]` validates regex before DB, normalizes `toUpperCase()`, 404 on format/miss/inactive — no coach_id leak (`app/api/athlete/[shareCode]/route.ts`) | PASS |
| 4 | Broadcast — PATCH broadcasts `athlete_updated` on `athlete:{share_code}` ONLY when `share_active`; try/catch + `removeChannel`; non-fatal on failure (`app/api/athletes/[id]/route.ts:135-167`) | PASS |
| 5 | Broadcast payload — mirrors public RPC shape; `coach_id` and `created_at` stripped | PASS |
| 6 | Share-code regex `/^[A-HJ-NP-Z2-9]{6}$/` consistent — home form (`ShareCodeForm.tsx:8`), public route (`route.ts:10`), page component, DB `generate_share_code()` alphabet | PASS |
| 7 | `useRealtimeAthlete` — subscribes, listens for broadcast, sets connection state on SUBSCRIBED/CHANNEL_ERROR/TIMED_OUT/CLOSED, re-fetches on reconnect, cleans up via `removeChannel` (`lib/hooks/use-realtime-athlete.ts`) | PASS |
| 8 | Zod validation on share action (`shareActionSchema.enum(['activate','deactivate','reset'])`) + input JSON guard | PASS |
| 9 | Polish copy via `pl.ts` — `athletePanel.*`, `coach.athlete.online.*`, `home.*` | PASS |
| 10 | A11y — `role="alert"` on share-code error, `aria-describedby`+`aria-invalid` on input, `role="status"` + `aria-live="polite"` on SyncIndicator (verified in QA/E2E selectors) | PASS |
| 11 | Dark theme — OnlineTab uses `var(--color-*)` inline, other components use utility classes — both valid; no hex literals | PASS |
| 12 | TypeScript strict — no `any`, `AthletePublic` type mirrors RPC output | PASS |

## Issues

None (0 blocking).

## Suggestions (non-blocking)

- `components/coach/OnlineTab.tsx` uses explicit `bg-[var(--color-card)]` / `text-[var(--color-foreground)]` inline syntax, while the rest of the codebase uses Tailwind v4 token utility classes (`bg-card`, `text-foreground`, …). Both compile to the same CSS, but converging on one style would aid consistency and readability.
- `app/api/athletes/[id]/share/route.ts:99` returns a hardcoded Polish error body (`"Nie udało się zresetować kodu."`) on 500. `OnlineTab` ignores the server message and renders `pl.coach.athlete.online.errorGeneric`, so there is no user-visible leak — but moving the English key ("Failed to reset share code.") into the API response would keep the "Polish copy lives in `pl.ts`" invariant literally true.
- `route.ts:112-122` — if the post-reset `share_active=true` UPDATE fails, the handler still returns 200 with `share_active: false`. That is semantically a partial failure. Consider returning 500 so the UI can surface "Reset wygenerował kod, ale nie udało się włączyć udostępniania — spróbuj Aktywuj ponownie." instead of silently reporting success.
- Consider adding integration tests for `POST /api/athletes/[id]/share` and `GET /api/athlete/[shareCode]` alongside the existing `tests/integration/athletes/route.test.ts`. The current RLS + SECURITY DEFINER posture is the safer path, but direct integration coverage would catch future regressions.

## Verdict

**Approve**
