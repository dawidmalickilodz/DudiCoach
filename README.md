# Training Planner AI

Profesjonalna aplikacja webowa dla trenera personalnego do zarządzania zawodnikami i generowania planów treningowych przez Claude AI, z synchronizacją w czasie rzeczywistym między trenerem a zawodnikiem.

## Architektura

- **Frontend + Backend**: Next.js 14 (App Router) + TypeScript strict
- **Baza + Auth + Realtime**: Supabase (Postgres + RLS + Realtime + Auth)
- **UI**: Tailwind CSS + shadcn/ui + Radix
- **Formularze**: react-hook-form + zod
- **State**: TanStack Query + Zustand
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`)
- **Testy**: Vitest (unit/integration) + Playwright (E2E)
- **Hosting**: Vercel + Supabase Cloud (Frankfurt)

## Proces wytwarzania — SDLC z agentami

Każda user story przechodzi przez **6 obowiązkowych etapów**, każdy z dedykowanym agentem:

```
[1 BACKLOG] → [2 PRODUKCJA] → [3 TESTY DEV] → [4 TESTY TEST-ENV] → [5 WDROŻENIE] → [6 REVIEW] → DONE
```

### Agenci (w `~/.claude/agents/`)

| Agent | Etap SDLC | Odpowiedzialność |
|---|---|---|
| `backlog-manager` | 1. Backlog | User stories z kryteriami Gherkin, priorytety, DoR |
| `architect` | 2a. Design | Design docs, ADRs, model danych, API contracts |
| `developer-backend` | 2b. Produkcja (BE) | API, migracje, RLS, Claude integration, Realtime |
| `developer-frontend` | 2c. Produkcja (FE) | React, auto-save, dark theme, Polish copy |
| `qa-dev` | 3. Testy dev | Vitest unit + integration, coverage ≥70% |
| `qa-test` | 4. Testy test-env | Playwright E2E na preview, axe a11y |
| `devops` | 5. Wdrożenie | GitHub Actions, Vercel, Supabase migracje, Sentry |
| `code-reviewer` | 6. Review | Finalny quality gate (read-only) |

## Struktura projektu

```
training-planner-ai/
  app/                    # Next.js App Router
    (coach)/              # Panel trenera
    (athlete)/            # Panel zawodnika (publiczny przez share code)
    api/                  # Route handlers
  components/             # React components
    ui/                   # shadcn/ui primitives
  lib/
    supabase/             # Supabase clients
    ai/                   # Anthropic SDK wrapper + prompts
    i18n/pl.ts            # Polskie stringi
    validation/           # zod schemas
  supabase/
    migrations/           # SQL migration files
  tests/
    unit/ integration/ e2e/
  backlog/
    backlog.md            # Kanban dashboard
    stories/              # US-XXX-*.md
    epics/                # EPIC-*.md
  docs/
    spec/                 # Specyfikacja
    adr/                  # Architecture Decision Records
    design/               # Design docs per story
    releases/             # Release notes
  qa/
    dev/                  # Reports z qa-dev
    e2e/                  # Reports z qa-test
  reviews/                # Reports z code-reviewer
  CLAUDE.md               # Global rules for agents
```

## Setup dla rozpoczęcia pracy

### 1. Wymagania wstępne (użytkownik)

- [x] Anthropic API key (masz)
- [x] GitHub account (masz)
- [ ] Supabase account + projekt (region Frankfurt)
- [ ] Vercel account

### 2. Inicjalizacja projektu Next.js

```bash
cd "C:\Users\dudeu\Desktop\Claude Code"
npx create-next-app@latest training-planner-ai \
  --typescript --tailwind --eslint --app \
  --no-src-dir --import-alias="@/*"
cd training-planner-ai
```

### 3. Instalacja zależności

```bash
# Core
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install @tanstack/react-query zustand
npm install react-hook-form zod @hookform/resolvers

# shadcn/ui
npx shadcn@latest init

# Testy
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D @playwright/test @axe-core/playwright
npx playwright install

# Dev tools
npm install -D supabase
```

### 4. Supabase setup

```bash
# Zainicjuj lokalny projekt Supabase
npx supabase init

# Zaloguj się do Supabase Cloud
npx supabase login

# Połącz z projektem (URL z dashboardu Supabase)
npx supabase link --project-ref <your-project-ref>

# Uruchom lokalnie (wymaga Docker)
npx supabase start
```

### 5. Zmienne środowiskowe

Skopiuj `.env.example` do `.env.local` i wypełnij:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (z Supabase Dashboard)
- `SUPABASE_SERVICE_ROLE_KEY` (z Supabase Dashboard — server-side only)
- `ANTHROPIC_API_KEY`

### 6. Pierwszy run

```bash
npm run dev     # localhost:3000
npm run test    # Vitest
npx playwright test  # E2E (wymaga uruchomionej aplikacji)
```

## Workflow dla pojedynczej user story

1. **Backlog**: `backlog-manager` tworzy `backlog/stories/US-XXX-*.md` z kryteriami Gherkin → `status: Ready`
2. **Design** (jeśli `design_required: true`): `architect` tworzy `docs/design/US-XXX-design.md` → `status: InDev`
3. **Produkcja**: `developer-backend` i/lub `developer-frontend` implementują na branchu `feat/US-XXX-slug` → `status: InDevTests`
4. **Testy dev**: `qa-dev` pisze Vitest, uruchamia, raport w `qa/dev/US-XXX-report.md` → `status: InE2E`
5. **Deploy preview**: `devops` robi `git push`, GitHub Actions deployuje preview na Vercel → `qa-test` invoked
6. **Testy test-env**: `qa-test` uruchamia Playwright na preview URL, raport w `qa/e2e/US-XXX-report.md` → `status: InDeploy`
7. **Wdrożenie**: `devops` mergeuje do main, taguje, deployuje na prod → `status: InReview`
8. **Review**: `code-reviewer` analizuje diff, raport w `reviews/US-XXX-review.md` → `status: Done`

## Backlog Sprint 1

| ID | Title | Estimate |
|---|---|---|
| US-001 | Logowanie trenera | S |
| US-002 | Backend CRUD zawodnika | M |
| US-003 | Frontend lista + edycja zawodnika z auto-save | M |
| US-004 | Share code + panel zawodnika + real-time sync | L |
| US-005 | Generowanie planu treningowego przez Claude AI | L |

Więcej w [`backlog/backlog.md`](backlog/backlog.md).

## Zasady non-negocjowalne

1. **Dark theme** — jedyny motyw (bg `#0A0F1A`, karty `#111827`)
2. **Polski UI** — wszystkie stringi przez `lib/i18n/pl.ts`
3. **Auto-save** — brak przycisków "Zapisz", debounce 600-800ms
4. **RLS always on** — każda tabela ma RLS z polisą
5. **TypeScript strict** — zero `any`
6. **Każda story przez wszystkie 6 etapów SDLC** — bez wyjątków
