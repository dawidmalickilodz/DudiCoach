# Security Audit v1 - Checklist (PASS / FAIL / DO POPRAWY)

## Metadane audytu
- Data audytu: 
- Audytor: 
- Repo: 
- Branch / commit SHA: 
- Zakres (aplikacja / API / infra): 
- ÄąĹˇrodowisko (local / preview / production): 

## Legenda statusu
- `PASS` - kontrola speÄąâ€šniona, bez dziaÄąâ€šaÄąâ€ž naprawczych.
- `FAIL` - krytyczna luka lub niespeÄąâ€šniona kontrola, wymagane szybkie dziaÄąâ€šania.
- `DO POPRAWY` - czĂ„â„˘Äąâ€şciowo speÄąâ€šnione; jest ryzyko lub brak formalizacji.

## Priorytet napraw
- `P0` - sekret/security boundary/authorization/webhook verification.
- `P1` - RLS, branch protection, env segregation, idempotency.
- `P2` - spÄ‚Ĺ‚jnoÄąâ€şĂ„â€ˇ kontraktÄ‚Ĺ‚w bÄąâ€šĂ„â„˘dÄ‚Ĺ‚w, hygiene i standaryzacja.

---

## 1) Repo i kod

### 1.1 Sekrety i `.env`
**Kontrole**
- [ ] `.env.local` oraz analogiczne pliki sĂ„â€¦ w `.gitignore`.
- [ ] W repo nie ma realnych kluczy/tokenÄ‚Ĺ‚w/sekretÄ‚Ĺ‚w.
- [ ] Brak hardcoded sekretÄ‚Ĺ‚w w kodzie, testach, README i notatkach.
- [ ] W repo sĂ„â€¦ tylko przykÄąâ€šady (`.env.example`), bez realnych wartoÄąâ€şci.
- [ ] Historia git nie zawiera commitÄ‚Ĺ‚w z dawnymi sekretami.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1/P2`
- DowÄ‚Ĺ‚d (komendy, screenshoty, linki):
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 1.2 `NEXT_PUBLIC_*`
**Kontrole**
- [ ] Wszystkie `NEXT_PUBLIC_*` zawierajĂ„â€¦ tylko dane publiczne.
- [ ] Brak sekretÄ‚Ĺ‚w w `NEXT_PUBLIC_*` (Stripe secret, `service_role`, `whsec_`, prywatne tokeny).

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1/P2`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 1.3 Granica klient/serwer
**Kontrole**
- [ ] Operacje uprzywilejowane wykonywane wyÄąâ€šĂ„â€¦cznie po stronie serwera.
- [ ] Klient nie korzysta bezpoÄąâ€şrednio z sekretÄ‚Ĺ‚w.
- [ ] Brak logiki Ă˘â‚¬Ĺľzaufaj klientowiĂ˘â‚¬ĹĄ dla akcji wraÄąÄ˝liwych.
- [ ] UI pokazuje tylko zsanityzowane komunikaty bÄąâ€šĂ„â„˘dÄ‚Ĺ‚w.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1/P2`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 1.4 Kontrakt bÄąâ€šĂ„â„˘dÄ‚Ĺ‚w
**Kontrole**
- [ ] Route handlery nie zwracajĂ„â€¦ `details`, stack trace, raw `error.message`.
- [ ] UI nie renderuje surowego payloadu bÄąâ€šĂ„â„˘du.
- [ ] Kody `401/403/404/500` sĂ„â€¦ konsekwentnie rozdzielone.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1/P2`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

---

## 2) GitHub

### 2.1 Secret scanning + push protection
**Kontrole**
- [ ] Secret scanning jest wÄąâ€šĂ„â€¦czony.
- [ ] Push protection jest wÄąâ€šĂ„â€¦czone.
- [ ] Bypass push protection jest ograniczony.
- [ ] Alerty sĂ„â€¦ monitorowane i majĂ„â€¦ ownera.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
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
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 2.3 Uprawnienia repo
**Kontrole**
- [ ] Lista collaboratorÄ‚Ĺ‚w jest aktualna.
- [ ] Minimalne role (least privilege).
- [ ] Brak starych kont z write/admin.
- [ ] UÄąÄ˝ycie PAT ograniczone do koniecznych przypadkÄ‚Ĺ‚w.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

---

## 3) Vercel

### 3.1 Environment Variables
**Kontrole**
- [ ] Preview i Production majĂ„â€¦ rozdzielone sekrety.
- [ ] WraÄąÄ˝liwe env vars oznaczone jako Sensitive.
- [ ] Brak sekretÄ‚Ĺ‚w w `NEXT_PUBLIC_*`.
- [ ] Brak niepotrzebnego wspÄ‚Ĺ‚Äąâ€šdzielenia tych samych wartoÄąâ€şci miĂ„â„˘dzy Äąâ€şrodowiskami.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 3.2 DostĂ„â„˘p do projektu/teamu
**Kontrole**
- [ ] DostĂ„â„˘py sĂ„â€¦ ograniczone do minimum.
- [ ] Brak nieaktywnych kont z dostĂ„â„˘pem do projektu.
- [ ] WidocznoÄąâ€şĂ„â€ˇ env vars ograniczona do potrzebnych osÄ‚Ĺ‚b.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 3.3 Deploy hygiene
**Kontrole**
- [ ] Po zmianie env vars wykonywany jest nowy deploy/redeploy.
- [ ] Preview nie uÄąÄ˝ywa produkcyjnych sekretÄ‚Ĺ‚w bez potrzeby.
- [ ] Production branch jest jawnie zdefiniowany.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

---

## 4) Supabase

### 4.1 Klucze API
**Kontrole**
- [ ] Frontend uÄąÄ˝ywa wyÄąâ€šĂ„â€¦cznie `anon` key.
- [ ] `service_role` jest uÄąÄ˝ywany tylko server-side.
- [ ] Brak `service_role` w bundle, URL, logach i test fixtures.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 4.2 RLS
**Kontrole**
- [ ] RLS jest wÄąâ€šĂ„â€¦czone na wszystkich tabelach z danymi prywatnymi.
- [ ] Polityki odpowiadajĂ„â€¦ realnemu modelowi dostĂ„â„˘pu.
- [ ] Ownership (`auth.uid()`) jest wymuszany poprawnie.
- [ ] Brak przypadkowo otwartych tabel w `public`.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 4.3 Security Advisor
**Kontrole**
- [ ] Brak krytycznych alertÄ‚Ĺ‚w bez planu naprawy.
- [ ] Alerty majĂ„â€¦ status: naprawione / zaakceptowany wyjĂ„â€¦tek / plan + termin.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 4.4 Storage
**Kontrole**
- [ ] Public/private bucket access jest intencjonalny.
- [ ] Prywatne pliki nie sĂ„â€¦ publicznie dostĂ„â„˘pne.
- [ ] Signed URLs majĂ„â€¦ rozsĂ„â€¦dny TTL.
- [ ] Upload ma ograniczenia typu/rozmiaru pliku.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

---

## 5) Stripe

### 5.1 Test vs Live
**Kontrole**
- [ ] Rozdzielone klucze test/live.
- [ ] Rozdzielone webhook secrets test/live.
- [ ] Production nie uÄąÄ˝ywa endpointÄ‚Ĺ‚w testowych.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 5.2 Webhook security
**Kontrole**
- [ ] Weryfikacja podpisu webhooka jest obowiĂ„â€¦zkowa.
- [ ] Wykorzystywane jest `raw body`.
- [ ] BÄąâ€šĂ„â„˘dny podpis koÄąâ€žczy siĂ„â„˘ `400`.
- [ ] Brak Äąâ€şcieÄąÄ˝ek omijajĂ„â€¦cych signature verification.
- [ ] Webhook secret jest przechowywany jako sekret i gotowy do rotacji.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 5.3 Idempotency i duplicate-event safety
**Kontrole**
- [ ] Eventy webhooka sĂ„â€¦ obsÄąâ€šugiwane idempotentnie.
- [ ] Retry/duplikaty nie nadajĂ„â€¦ uprawnieÄąâ€ž wielokrotnie.
- [ ] OpÄ‚Ĺ‚ÄąĹźnione eventy nie psujĂ„â€¦ finalnego stanu entitlements.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

### 5.4 Error exposure
**Kontrole**
- [ ] Klient nie dostaje raw Stripe error payload.
- [ ] Komunikaty billingowe sĂ„â€¦ zsanityzowane.
- [ ] Logi serwera zachowujĂ„â€¦ diagnostykĂ„â„˘ bez wycieku do UI.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1/P2`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

---

## 6) Backup i dostĂ„â„˘p wielourzĂ„â€¦dzeniowy

### 6.1 PodziaÄąâ€š source of truth
**Kontrole**
- [ ] `GitHub` jest ÄąĹźrÄ‚Ĺ‚dÄąâ€šem prawdy dla kodu i historii zmian.
- [ ] `Google Drive` uÄąÄ˝ywany tylko do dokumentÄ‚Ĺ‚w roboczych/artefaktÄ‚Ĺ‚w.
- [ ] Brak sekretÄ‚Ĺ‚w (`.env`, klucze API, webhook secrets) na Google Drive.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P2`
- DowÄ‚Ĺ‚d:
- DziaÄąâ€šanie naprawcze:
- Owner:
- Termin:

---

## 7) Minimum Security Baseline (10 punktÄ‚Ĺ‚w)

Odhacz szybki baseline:
- [ ] `.env.local` i podobne sĂ„â€¦ ignorowane przez git.
- [ ] W repo nie ma realnych sekretÄ‚Ĺ‚w.
- [ ] `NEXT_PUBLIC_*` nie zawiera sekretÄ‚Ĺ‚w.
- [ ] GitHub secret scanning i push protection sĂ„â€¦ wÄąâ€šĂ„â€¦czone.
- [ ] `main` ma branch protection.
- [ ] Vercel preview/prod secrets sĂ„â€¦ rozdzielone i sensitive tam, gdzie trzeba.
- [ ] Supabase `service_role` nie wychodzi poza backend.
- [ ] Wszystkie tabele prywatne majĂ„â€¦ RLS.
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

## 9) Plan naprawy (kolejnoÄąâ€şĂ„â€ˇ)

Rekomendowana kolejnoÄąâ€şĂ„â€ˇ realizacji:
1. Sekrety i env (`P0`).
2. GitHub protections (`P0/P1`).
3. Supabase RLS + `service_role` boundary (`P0/P1`).
4. Stripe webhook verification + idempotency (`P0/P1`).
5. Error contract / UX hardening (`P2`).

---

## 10) Final sign-off
- Data zamkniĂ„â„˘cia audytu: 
- Decyzja: `ZamkniĂ„â„˘ty / CzĂ„â„˘Äąâ€şciowo zamkniĂ„â„˘ty / Otwarty`
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

### 13) F1 evidence update (2026-04-18, automatic)

Hard evidence from public GitHub API:
- Endpoint: `GET https://api.github.com/repos/dawidmalickilodz/DudiCoach/branches/main`
- Result: `"protected": false`
- Protection summary: `"protection": { "enabled": false, "required_status_checks": { "enforcement_level": "off" ... } }`

Implication:
- `main` branch protection is currently not enabled.
- F1 cannot be closed until branch protection/ruleset is configured.

Immediate required action in GitHub UI:
1. Enable protection (branch rule or ruleset) for `main`.
2. Require PR reviews (minimum 1).
3. Require status checks before merge.
4. Restrict direct pushes/bypass where possible.
5. Re-check API output and update F1 status to `Closed` only after confirmation.
