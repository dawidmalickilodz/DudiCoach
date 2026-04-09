# Training Planner AI — Global Rules for All Agents

**Language**: This project is single-coach (one trainer, many athletes). UI is 100% Polish. Code, comments, commit messages, documentation in English. User stories and backlog in Polish.

## Stack (locked — actual versions scaffolded 2026-04-08)

- **Framework**: Next.js 16.2.3 (App Router) + React 19.2.4 + TypeScript strict
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/postcss`, NOT v3 — config is CSS-based, not `tailwind.config.js`)
- **UI primitives**: shadcn/ui + Radix primitives
- **DB + Auth + Realtime**: Supabase (Postgres + RLS + Realtime + Auth)
- **Forms**: react-hook-form + zod
- **Client state**: TanStack Query (server state) + Zustand (only for transient UI state)
- **Unit/Integration tests**: Vitest + Testing Library
- **E2E tests**: Playwright + @axe-core/playwright
- **AI**: `@anthropic-ai/sdk` — model `claude-sonnet-4-6`
- **Hosting**: Vercel (app) + Supabase Cloud (DB, Frankfurt region for GDPR)
- **Monitoring**: Sentry + Vercel Analytics

### Important Tailwind v4 Notes
- Config lives in `app/globals.css` via `@theme` directive, not `tailwind.config.js`
- PostCSS plugin is `@tailwindcss/postcss`, not `tailwindcss`
- CSS variables defined with `--color-*` become utility classes automatically

### Important React 19 Notes
- Server Components by default
- `use()` hook available for promises/context
- `ref` as prop (no `forwardRef` needed for simple cases)

## Non-negotiable Rules

1. **Dark theme only** — background `#0A0F1A`, cards `#111827`, borders `#1E293B`. DM Sans font.
2. **Polish UI** — all user-facing strings via `lib/i18n/pl.ts`. NEVER hardcode Polish in components.
3. **Auto-save everywhere** — no "Save" buttons. Debounced mutations (600-800ms) with optimistic UI and toast "✓ Zapisano".
4. **Mobile-first responsive** — athlete panel primary target 375-900px width.
5. **TypeScript strict** — no `any` types. `tsc --noEmit` must pass.
6. **RLS always on** — every Supabase table has RLS enabled with at least one policy. No exceptions.
7. **Zod everywhere at boundaries** — input validation on every API route.
8. **Single-user mode** — this is NOT multi-tenant SaaS. One trainer account, many athletes. Don't over-engineer for multi-coach scenarios.
9. **Real-time via Supabase Realtime** — share code = channel key. Coach writes → Postgres changes → athlete subscribed channel receives update in <2s.
10. **Prompt caching on Claude API** — use `cache_control: { type: 'ephemeral' }` for large static context (muscle DB, coach rules) to reduce cost.

## SDLC Workflow — 6 Stages

Every user story MUST pass through all 6 stages:

```
[1 BACKLOG] → [2 PRODUKCJA] → [3 TESTY DEV] → [4 TESTY TEST-ENV] → [5 WDROŻENIE] → [6 REVIEW] → DONE
```

Story status tracked in YAML frontmatter `status:` field: `Draft | Ready | InDev | InDevTests | InE2E | InDeploy | InReview | Done | Rework`.

## Agents and Their Roles

| Agent | Owns Stage | Writes To |
|---|---|---|
| `backlog-manager` | Backlog | `backlog/**` |
| `architect` | Design (pre-dev) | `docs/design/**`, `docs/adr/**` |
| `developer-backend` | Produkcja (BE) | `app/api/**`, `supabase/**`, `lib/supabase/**`, `lib/ai/**` |
| `developer-frontend` | Produkcja (FE) | `app/(coach)/**`, `app/(athlete)/**`, `components/**`, `lib/i18n/**` |
| `qa-dev` | Testy dev | `tests/unit/**`, `tests/integration/**`, `qa/dev/**` |
| `qa-test` | Testy test-env | `tests/e2e/**`, `qa/e2e/**` |
| `devops` | Wdrożenie | `.github/workflows/**`, `docs/releases/**` |
| `code-reviewer` | Review | `reviews/**` (READ-ONLY on source) |

## Branching & PR Rules

- One story = one branch `feat/US-XXX-<slug>` = one PR
- Migration files named `YYYYMMDDHHMMSS_US-XXX_description.sql`
- PR body links to the story file
- PR cannot merge until qa-dev report shows verdict: pass
- Main branch triggers staging deploy; git tag `v*.*.*` triggers prod deploy

## File Conventions

- All stories, ADRs, designs, QA reports, reviews have YAML frontmatter
- Markdown docs use `##` as top-level headings (reserve `#` for doc title only)
- Polish content in user stories + backlog; English in code and ADRs

## Before Writing Code — Checklist

Every agent, before touching files:
1. Read this `CLAUDE.md` in full
2. Read the story file `backlog/stories/US-XXX-*.md`
3. Read relevant design doc `docs/design/US-XXX-design.md` if exists
4. Read latest ADRs in `docs/adr/`
5. Read existing similar code for conventions

## When in Doubt

- Favor simplicity over abstraction (three similar lines > premature helper)
- Favor Polish UX spec over developer convenience
- Ask the user via `AskUserQuestion` only when truly blocked — otherwise make a reasonable choice and document it in ADR
