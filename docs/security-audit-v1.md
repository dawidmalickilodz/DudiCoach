# Security Audit v1 - Checklist (PASS / FAIL / DO POPRAWY)

## Metadane audytu
- Data audytu: 
- Audytor: 
- Repo: 
- Branch / commit SHA: 
- Zakres (aplikacja / API / infra): 
- Ĺšrodowisko (local / preview / production): 

## Legenda statusu
- `PASS` - kontrola speĹ‚niona, bez dziaĹ‚aĹ„ naprawczych.
- `FAIL` - krytyczna luka lub niespeĹ‚niona kontrola, wymagane szybkie dziaĹ‚ania.
- `DO POPRAWY` - czÄ™Ĺ›ciowo speĹ‚nione; jest ryzyko lub brak formalizacji.

## Priorytet napraw
- `P0` - sekret/security boundary/authorization/webhook verification.
- `P1` - RLS, branch protection, env segregation, idempotency.
- `P2` - spĂłjnoĹ›Ä‡ kontraktĂłw bĹ‚Ä™dĂłw, hygiene i standaryzacja.

---

## 1) Repo i kod

### 1.1 Sekrety i `.env`
**Kontrole**
- [ ] `.env.local` oraz analogiczne pliki sÄ… w `.gitignore`.
- [ ] W repo nie ma realnych kluczy/tokenĂłw/sekretĂłw.
- [ ] Brak hardcoded sekretĂłw w kodzie, testach, README i notatkach.
- [ ] W repo sÄ… tylko przykĹ‚ady (`.env.example`), bez realnych wartoĹ›ci.
- [ ] Historia git nie zawiera commitĂłw z dawnymi sekretami.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1/P2`
- DowĂłd (komendy, screenshoty, linki):
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 1.2 `NEXT_PUBLIC_*`
**Kontrole**
- [ ] Wszystkie `NEXT_PUBLIC_*` zawierajÄ… tylko dane publiczne.
- [ ] Brak sekretĂłw w `NEXT_PUBLIC_*` (Stripe secret, `service_role`, `whsec_`, prywatne tokeny).

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1/P2`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 1.3 Granica klient/serwer
**Kontrole**
- [ ] Operacje uprzywilejowane wykonywane wyĹ‚Ä…cznie po stronie serwera.
- [ ] Klient nie korzysta bezpoĹ›rednio z sekretĂłw.
- [ ] Brak logiki â€žzaufaj klientowiâ€ť dla akcji wraĹĽliwych.
- [ ] UI pokazuje tylko zsanityzowane komunikaty bĹ‚Ä™dĂłw.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1/P2`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 1.4 Kontrakt bĹ‚Ä™dĂłw
**Kontrole**
- [ ] Route handlery nie zwracajÄ… `details`, stack trace, raw `error.message`.
- [ ] UI nie renderuje surowego payloadu bĹ‚Ä™du.
- [ ] Kody `401/403/404/500` sÄ… konsekwentnie rozdzielone.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1/P2`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

---

## 2) GitHub

### 2.1 Secret scanning + push protection
**Kontrole**
- [ ] Secret scanning jest wĹ‚Ä…czony.
- [ ] Push protection jest wĹ‚Ä…czone.
- [ ] Bypass push protection jest ograniczony.
- [ ] Alerty sÄ… monitorowane i majÄ… ownera.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 2.2 Branch protection (`main`)
**Kontrole**
- [ ] Direct push do `main` jest zablokowany/ograniczony.
- [ ] Wymagane review PR.
- [ ] Wymagane status checks.
- [ ] Admin bypass ograniczony do minimum.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 2.3 Uprawnienia repo
**Kontrole**
- [ ] Lista collaboratorĂłw jest aktualna.
- [ ] Minimalne role (least privilege).
- [ ] Brak starych kont z write/admin.
- [ ] UĹĽycie PAT ograniczone do koniecznych przypadkĂłw.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

---

## 3) Vercel

### 3.1 Environment Variables
**Kontrole**
- [ ] Preview i Production majÄ… rozdzielone sekrety.
- [ ] WraĹĽliwe env vars oznaczone jako Sensitive.
- [ ] Brak sekretĂłw w `NEXT_PUBLIC_*`.
- [ ] Brak niepotrzebnego wspĂłĹ‚dzielenia tych samych wartoĹ›ci miÄ™dzy Ĺ›rodowiskami.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 3.2 DostÄ™p do projektu/teamu
**Kontrole**
- [ ] DostÄ™py sÄ… ograniczone do minimum.
- [ ] Brak nieaktywnych kont z dostÄ™pem do projektu.
- [ ] WidocznoĹ›Ä‡ env vars ograniczona do potrzebnych osĂłb.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 3.3 Deploy hygiene
**Kontrole**
- [ ] Po zmianie env vars wykonywany jest nowy deploy/redeploy.
- [ ] Preview nie uĹĽywa produkcyjnych sekretĂłw bez potrzeby.
- [ ] Production branch jest jawnie zdefiniowany.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

---

## 4) Supabase

### 4.1 Klucze API
**Kontrole**
- [ ] Frontend uĹĽywa wyĹ‚Ä…cznie `anon` key.
- [ ] `service_role` jest uĹĽywany tylko server-side.
- [ ] Brak `service_role` w bundle, URL, logach i test fixtures.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 4.2 RLS
**Kontrole**
- [ ] RLS jest wĹ‚Ä…czone na wszystkich tabelach z danymi prywatnymi.
- [ ] Polityki odpowiadajÄ… realnemu modelowi dostÄ™pu.
- [ ] Ownership (`auth.uid()`) jest wymuszany poprawnie.
- [ ] Brak przypadkowo otwartych tabel w `public`.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 4.3 Security Advisor
**Kontrole**
- [ ] Brak krytycznych alertĂłw bez planu naprawy.
- [ ] Alerty majÄ… status: naprawione / zaakceptowany wyjÄ…tek / plan + termin.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 4.4 Storage
**Kontrole**
- [ ] Public/private bucket access jest intencjonalny.
- [ ] Prywatne pliki nie sÄ… publicznie dostÄ™pne.
- [ ] Signed URLs majÄ… rozsÄ…dny TTL.
- [ ] Upload ma ograniczenia typu/rozmiaru pliku.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

---

## 5) Stripe

### 5.1 Test vs Live
**Kontrole**
- [ ] Rozdzielone klucze test/live.
- [ ] Rozdzielone webhook secrets test/live.
- [ ] Production nie uĹĽywa endpointĂłw testowych.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 5.2 Webhook security
**Kontrole**
- [ ] Weryfikacja podpisu webhooka jest obowiÄ…zkowa.
- [ ] Wykorzystywane jest `raw body`.
- [ ] BĹ‚Ä™dny podpis koĹ„czy siÄ™ `400`.
- [ ] Brak Ĺ›cieĹĽek omijajÄ…cych signature verification.
- [ ] Webhook secret jest przechowywany jako sekret i gotowy do rotacji.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 5.3 Idempotency i duplicate-event safety
**Kontrole**
- [ ] Eventy webhooka sÄ… obsĹ‚ugiwane idempotentnie.
- [ ] Retry/duplikaty nie nadajÄ… uprawnieĹ„ wielokrotnie.
- [ ] OpĂłĹşnione eventy nie psujÄ… finalnego stanu entitlements.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

### 5.4 Error exposure
**Kontrole**
- [ ] Klient nie dostaje raw Stripe error payload.
- [ ] Komunikaty billingowe sÄ… zsanityzowane.
- [ ] Logi serwera zachowujÄ… diagnostykÄ™ bez wycieku do UI.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1/P2`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

---

## 6) Backup i dostÄ™p wielourzÄ…dzeniowy

### 6.1 PodziaĹ‚ source of truth
**Kontrole**
- [ ] `GitHub` jest ĹşrĂłdĹ‚em prawdy dla kodu i historii zmian.
- [ ] `Google Drive` uĹĽywany tylko do dokumentĂłw roboczych/artefaktĂłw.
- [ ] Brak sekretĂłw (`.env`, klucze API, webhook secrets) na Google Drive.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P2`
- DowĂłd:
- DziaĹ‚anie naprawcze:
- Owner:
- Termin:

---

## 7) Minimum Security Baseline (10 punktĂłw)

Odhacz szybki baseline:
- [ ] `.env.local` i podobne sÄ… ignorowane przez git.
- [ ] W repo nie ma realnych sekretĂłw.
- [ ] `NEXT_PUBLIC_*` nie zawiera sekretĂłw.
- [ ] GitHub secret scanning i push protection sÄ… wĹ‚Ä…czone.
- [ ] `main` ma branch protection.
- [ ] Vercel preview/prod secrets sÄ… rozdzielone i sensitive tam, gdzie trzeba.
- [ ] Supabase `service_role` nie wychodzi poza backend.
- [ ] Wszystkie tabele prywatne majÄ… RLS.
- [ ] Stripe webhook ma signature verification i idempotency.
- [ ] Klient nie renderuje raw backend/Supabase/Stripe errors.

**Wynik baselinu**
- Suma PASS: 
- Suma FAIL: 
- Suma DO POPRAWY: 
- Decyzja go/no-go dla release: `GO / NO-GO`

---

## 8) Rejestr FAIL (do naprawy)

| ID | Obszar | Opis problemu | Priorytet | Owner | Termin | Status |
|---|---|---|---|---|---|---|
| 1 |  |  | P0/P1/P2 |  |  | Open |
| 2 |  |  | P0/P1/P2 |  |  | Open |
| 3 |  |  | P0/P1/P2 |  |  | Open |

---

## 9) Plan naprawy (kolejnoĹ›Ä‡)

Rekomendowana kolejnoĹ›Ä‡ realizacji:
1. Sekrety i env (`P0`).
2. GitHub protections (`P0/P1`).
3. Supabase RLS + `service_role` boundary (`P0/P1`).
4. Stripe webhook verification + idempotency (`P0/P1`).
5. Error contract / UX hardening (`P2`).

---

## 10) Final sign-off
- Data zamkniÄ™cia audytu: 
- Decyzja: `ZamkniÄ™ty / CzÄ™Ĺ›ciowo zamkniÄ™ty / Otwarty`
- Podpis audytora: 
- Podpis ownera technicznego: 

---

## 11) Runda 1 - wyniki operacyjne (2026-04-18)

### Metadata (run 1)
- Auditor: Codex (technical pass)
- Repo: dawidmalickilodz/DudiCoach
- Branch/SHA at start: main / 4aba08f
- Scope: repository code + migrations + available GitHub metadata
- Environment verified directly: local

### Status by section

| Point | Status | Priority | Evidence / note |
|---|---|---|---|
| 1.1 Secrets and `.env` | DO POPRAWY | P1 | `.gitignore` contains `.env*`; tracked files include only `.env.example`; local `.env.local` is non-empty (not tracked). Need full history scan with dedicated scanner + local backup policy check. |
| 1.2 `NEXT_PUBLIC_*` | PASS | P0 | `.env.example` exposes only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`. |
| 1.3 Client/server boundary | PASS | P0 | No `SUPABASE_SERVICE_ROLE_KEY` usage found in app code paths; client-side env usage limited to `NEXT_PUBLIC_*`. |
| 1.4 Error contract | DO POPRAWY | P2 | Critical UI surfaces are sanitized; still global inconsistency across APIs (e.g. validation `details` shape and mixed wording). |
| 2.1 GitHub secret scanning/push protection | DO POPRAWY | P0 | Not verifiable from currently available API surface in this run. |
| 2.2 GitHub branch protection (`main`) | DO POPRAWY | P1 | Default branch confirmed as `main`; required checks/review/protection rules not yet confirmed. |
| 2.3 GitHub user access | DO POPRAWY | P1 | Owner/admin presence confirmed; full collaborator least-privilege review pending. |
| 3.1 Vercel env vars separation/sensitivity | DO POPRAWY | P0/P1 | Requires Vercel dashboard/API verification (Preview vs Production, Sensitive flags). |
| 3.2 Vercel project access | DO POPRAWY | P1 | Requires dashboard verification. |
| 3.3 Vercel deploy hygiene | DO POPRAWY | P1 | Requires verification of redeploy discipline after env changes. |
| 4.1 Supabase API key boundary | PASS | P0 | No service-role key exposure in tracked source; anon/public usage on client path. |
| 4.2 Supabase RLS | PASS | P0/P1 | Migrations define RLS and policies for `profiles`, `athletes`, `training_plans`, `injuries`. |
| 4.3 Supabase Security Advisor | DO POPRAWY | P1 | Dashboard check pending. |
| 4.4 Supabase Storage access | DO POPRAWY | P1 | Bucket visibility and signed URL TTL review pending. |
| 5.1 Stripe test/live separation | DO POPRAWY | P1 | Stripe integration not active in current codebase; pre-implementation control pending. |
| 5.2 Stripe webhook verification | DO POPRAWY | P0 | N/A now; mandatory before Stripe rollout. |
| 5.3 Stripe idempotency | DO POPRAWY | P0/P1 | N/A now; mandatory before Stripe rollout. |
| 5.4 Stripe error exposure | DO POPRAWY | P1/P2 | N/A now; mandatory before Stripe rollout. |
| 6.1 Backup/source-of-truth split | DO POPRAWY | P0/P2 | Requires manual validation: secrets not synced to cloud drives, code history in GitHub only. |

### Minimum baseline result (run 1)
- PASS: 5
- FAIL: 0
- DO POPRAWY: 5
- Release decision: NO-GO until P0/P1 checks in GitHub/Vercel/Supabase/Stripe readiness are closed.

### FAIL register (run 1 prioritized actions)

| ID | Area | Issue | Priority | Owner | Due date | Status |
|---|---|---|---|---|---|---|
| F1 | GitHub protections | Missing confirmation of Secret Scanning, Push Protection, and `main` branch protection rules. | P0/P1 | Dawid | 2026-04-19 | In Progress |
| F2 | Vercel env security | Missing confirmation of Preview/Production separation and Sensitive masking for secrets. | P0/P1 | Dawid | 2026-04-19 | Open |
| F3 | Supabase runtime controls | Missing dashboard confirmation of Security Advisor and Storage access model. | P1 | Dawid | 2026-04-20 | Open |

### Recommended execution order (next)
1. Close F1 (GitHub protections).
2. Close F2 (Vercel env controls).
3. Close F3 (Supabase dashboard controls).
4. Re-run baseline and switch release decision to GO only when P0/P1 are closed.

### 12) F1 closure pack - GitHub protections (in progress)

Objective: close F1 with evidence, not assumptions.

#### A. Quick facts already confirmed (from API/local)
- Repo: `dawidmalickilodz/DudiCoach`
- Default branch: `main`
- Owner account has `admin` permission

#### B. Manual checks to perform in GitHub UI
Path: `Repo -> Settings -> Code security and analysis`
- [ ] Secret scanning: Enabled
- [ ] Push protection: Enabled
- [ ] Alerts monitored by owner

Path: `Repo -> Settings -> Branches -> Branch protection rules`
- [ ] Rule exists for `main`
- [ ] Require pull request before merging
- [ ] Required approvals: at least 1
- [ ] Require status checks to pass before merging
- [ ] Include administrators (if acceptable for your workflow)
- [ ] Restrict who can push to matching branches (if feasible)

Path: `Repo -> Settings -> Collaborators and teams`
- [ ] Review all users with `admin`/`write`
- [ ] Remove stale/unneeded access
- [ ] Keep least privilege model

#### C. Evidence template (fill while checking)
- Screenshot/link 1 (Code security settings):
- Screenshot/link 2 (Branch protection rule):
- Screenshot/link 3 (Collaborators):
- Notes/exceptions:

#### D. F1 completion criteria
Mark F1 as `Closed` only if:
1. Secret scanning + push protection are enabled.
2. `main` has branch protection with review + required checks.
3. Access review is completed and stale write/admin access removed.
