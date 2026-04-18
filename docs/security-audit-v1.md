# Security Audit v1 - Checklist (PASS / FAIL / DO POPRAWY)

## Metadane audytu
- Data audytu: 
- Audytor: 
- Repo: 
- Branch / commit SHA: 
- Zakres (aplikacja / API / infra): 
- Środowisko (local / preview / production): 

## Legenda statusu
- `PASS` - kontrola spełniona, bez działań naprawczych.
- `FAIL` - krytyczna luka lub niespełniona kontrola, wymagane szybkie działania.
- `DO POPRAWY` - częściowo spełnione; jest ryzyko lub brak formalizacji.

## Priorytet napraw
- `P0` - sekret/security boundary/authorization/webhook verification.
- `P1` - RLS, branch protection, env segregation, idempotency.
- `P2` - spójność kontraktów błędów, hygiene i standaryzacja.

---

## 1) Repo i kod

### 1.1 Sekrety i `.env`
**Kontrole**
- [ ] `.env.local` oraz analogiczne pliki są w `.gitignore`.
- [ ] W repo nie ma realnych kluczy/tokenów/sekretów.
- [ ] Brak hardcoded sekretów w kodzie, testach, README i notatkach.
- [ ] W repo są tylko przykłady (`.env.example`), bez realnych wartości.
- [ ] Historia git nie zawiera commitów z dawnymi sekretami.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1/P2`
- Dowód (komendy, screenshoty, linki):
- Działanie naprawcze:
- Owner:
- Termin:

### 1.2 `NEXT_PUBLIC_*`
**Kontrole**
- [ ] Wszystkie `NEXT_PUBLIC_*` zawierają tylko dane publiczne.
- [ ] Brak sekretów w `NEXT_PUBLIC_*` (Stripe secret, `service_role`, `whsec_`, prywatne tokeny).

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1/P2`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

### 1.3 Granica klient/serwer
**Kontrole**
- [ ] Operacje uprzywilejowane wykonywane wyłącznie po stronie serwera.
- [ ] Klient nie korzysta bezpośrednio z sekretów.
- [ ] Brak logiki „zaufaj klientowi” dla akcji wrażliwych.
- [ ] UI pokazuje tylko zsanityzowane komunikaty błędów.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1/P2`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

### 1.4 Kontrakt błędów
**Kontrole**
- [ ] Route handlery nie zwracają `details`, stack trace, raw `error.message`.
- [ ] UI nie renderuje surowego payloadu błędu.
- [ ] Kody `401/403/404/500` są konsekwentnie rozdzielone.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1/P2`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

---

## 2) GitHub

### 2.1 Secret scanning + push protection
**Kontrole**
- [ ] Secret scanning jest włączony.
- [ ] Push protection jest włączone.
- [ ] Bypass push protection jest ograniczony.
- [ ] Alerty są monitorowane i mają ownera.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- Dowód:
- Działanie naprawcze:
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
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

### 2.3 Uprawnienia repo
**Kontrole**
- [ ] Lista collaboratorów jest aktualna.
- [ ] Minimalne role (least privilege).
- [ ] Brak starych kont z write/admin.
- [ ] Użycie PAT ograniczone do koniecznych przypadków.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

---

## 3) Vercel

### 3.1 Environment Variables
**Kontrole**
- [ ] Preview i Production mają rozdzielone sekrety.
- [ ] Wrażliwe env vars oznaczone jako Sensitive.
- [ ] Brak sekretów w `NEXT_PUBLIC_*`.
- [ ] Brak niepotrzebnego współdzielenia tych samych wartości między środowiskami.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

### 3.2 Dostęp do projektu/teamu
**Kontrole**
- [ ] Dostępy są ograniczone do minimum.
- [ ] Brak nieaktywnych kont z dostępem do projektu.
- [ ] Widoczność env vars ograniczona do potrzebnych osób.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

### 3.3 Deploy hygiene
**Kontrole**
- [ ] Po zmianie env vars wykonywany jest nowy deploy/redeploy.
- [ ] Preview nie używa produkcyjnych sekretów bez potrzeby.
- [ ] Production branch jest jawnie zdefiniowany.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

---

## 4) Supabase

### 4.1 Klucze API
**Kontrole**
- [ ] Frontend używa wyłącznie `anon` key.
- [ ] `service_role` jest używany tylko server-side.
- [ ] Brak `service_role` w bundle, URL, logach i test fixtures.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

### 4.2 RLS
**Kontrole**
- [ ] RLS jest włączone na wszystkich tabelach z danymi prywatnymi.
- [ ] Polityki odpowiadają realnemu modelowi dostępu.
- [ ] Ownership (`auth.uid()`) jest wymuszany poprawnie.
- [ ] Brak przypadkowo otwartych tabel w `public`.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

### 4.3 Security Advisor
**Kontrole**
- [ ] Brak krytycznych alertów bez planu naprawy.
- [ ] Alerty mają status: naprawione / zaakceptowany wyjątek / plan + termin.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

### 4.4 Storage
**Kontrole**
- [ ] Public/private bucket access jest intencjonalny.
- [ ] Prywatne pliki nie są publicznie dostępne.
- [ ] Signed URLs mają rozsądny TTL.
- [ ] Upload ma ograniczenia typu/rozmiaru pliku.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

---

## 5) Stripe

### 5.1 Test vs Live
**Kontrole**
- [ ] Rozdzielone klucze test/live.
- [ ] Rozdzielone webhook secrets test/live.
- [ ] Production nie używa endpointów testowych.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

### 5.2 Webhook security
**Kontrole**
- [ ] Weryfikacja podpisu webhooka jest obowiązkowa.
- [ ] Wykorzystywane jest `raw body`.
- [ ] Błędny podpis kończy się `400`.
- [ ] Brak ścieżek omijających signature verification.
- [ ] Webhook secret jest przechowywany jako sekret i gotowy do rotacji.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

### 5.3 Idempotency i duplicate-event safety
**Kontrole**
- [ ] Eventy webhooka są obsługiwane idempotentnie.
- [ ] Retry/duplikaty nie nadają uprawnień wielokrotnie.
- [ ] Opóźnione eventy nie psują finalnego stanu entitlements.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P1`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

### 5.4 Error exposure
**Kontrole**
- [ ] Klient nie dostaje raw Stripe error payload.
- [ ] Komunikaty billingowe są zsanityzowane.
- [ ] Logi serwera zachowują diagnostykę bez wycieku do UI.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P1/P2`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

---

## 6) Backup i dostęp wielourządzeniowy

### 6.1 Podział source of truth
**Kontrole**
- [ ] `GitHub` jest źródłem prawdy dla kodu i historii zmian.
- [ ] `Google Drive` używany tylko do dokumentów roboczych/artefaktów.
- [ ] Brak sekretów (`.env`, klucze API, webhook secrets) na Google Drive.

**Wynik**
- Status: `PASS / FAIL / DO POPRAWY`
- Priorytet: `P0/P2`
- Dowód:
- Działanie naprawcze:
- Owner:
- Termin:

---

## 7) Minimum Security Baseline (10 punktów)

Odhacz szybki baseline:
- [ ] `.env.local` i podobne są ignorowane przez git.
- [ ] W repo nie ma realnych sekretów.
- [ ] `NEXT_PUBLIC_*` nie zawiera sekretów.
- [ ] GitHub secret scanning i push protection są włączone.
- [ ] `main` ma branch protection.
- [ ] Vercel preview/prod secrets są rozdzielone i sensitive tam, gdzie trzeba.
- [ ] Supabase `service_role` nie wychodzi poza backend.
- [ ] Wszystkie tabele prywatne mają RLS.
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

## 9) Plan naprawy (kolejność)

Rekomendowana kolejność realizacji:
1. Sekrety i env (`P0`).
2. GitHub protections (`P0/P1`).
3. Supabase RLS + `service_role` boundary (`P0/P1`).
4. Stripe webhook verification + idempotency (`P0/P1`).
5. Error contract / UX hardening (`P2`).

---

## 10) Final sign-off
- Data zamknięcia audytu: 
- Decyzja: `Zamknięty / Częściowo zamknięty / Otwarty`
- Podpis audytora: 
- Podpis ownera technicznego: 
