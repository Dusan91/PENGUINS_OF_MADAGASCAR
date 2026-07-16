# Penguins of Madagascar — Multi-Agent Workflow Documentation

> Kompletna referenca: ko su agenti, kako rade, kako se pokreće sistem.

---

## Sadržaj

1. [Pregled sistema](#1-pregled-sistema)
2. [Agenti — kompletan spisak](#2-agenti--kompletan-spisak)
3. [Kako se pokreće workflow](#3-kako-se-pokreće-workflow)
4. [Workflow tipovi](#4-workflow-tipovi)
5. [Tok podataka između agenata](#5-tok-podataka-između-agenata)
6. [Paralelizacija](#6-paralelizacija)
7. [Memory sistem](#7-memory-sistem)
8. [Skills sistem](#8-skills-sistem)
9. [Rules i guardrails](#9-rules-i-guardrails)
10. [Zaštićene oblasti](#10-zaštićene-oblasti)

---

## 1. Pregled sistema

Sistem se zove **Penguins of Madagascar**. To je multi-agent AI workflow koji radi unutar OpenCode-a.

**Osnovna ideja:** Svaki agent ima jednu jasno definisanu ulogu. Niko ne radi posao drugog. Skipper orkestrira sve ostale kroz `Task` tool.

**Direktorijum sistema:** `~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/`

**Repozitorijum na kome se radi:** `~/Desktop/Hermes/whitelabel`

**Kako se poziva:** Korisnik upiše sadržaj `start_auto.md` (ili `start_review.md`) u OpenCode prompt i sistem se pokreće autonomno.

---

## 2. Agenti — kompletan spisak

Ukupno: **13 agenata** (7 koordinatora + 6 specijalista)

### 2.1 Primerni agenti (primary)

Nema — svi agenti u ovom sistemu su **subagenti** (`mode: subagent`). Korisnik direktno poziva sistem kroz OpenCode Build agenta.

---

### 2.2 Koordinatori (subagenti koje poziva Skipper)

#### Skipper
- **Uloga:** Orchestrator — čita workflow yaml i koordinira sve ostale
- **Model:** `github-copilot/gpt-5.4`
- **Može da poziva:** rico, rico-figma, kowalski, kowalski-risk, private, private-2, melman, melman-ts, maurice
- **NE piše kod**
- **Specifičnosti:**
  - Jedini koji donosi APPROVED/REJECTED odluku
  - Piše `skipper_decision.md` sam (bez delegacije)
  - Piše audit log na kraju svake sesije
  - Završava sa tačno: `Smile and wave boys, smile and wave 🐧🐧🐧🐧🦒🐒`
  - Zna kada da pokrene Private i Private-2 paralelno
  - Zna da uvek pokrene Melman i Melman-TS paralelno

#### Rico (koordinator)
- **Uloga:** Lead codebase researcher — koordinira 3 specijalista paralelno
- **Model:** `github-copilot/gpt-5.3-codex`
- **Može da poziva:** rico-files, rico-patterns, rico-deps (sva tri paralelno)
- **NE piše kod, NE predlaže rešenja**
- **Specifičnosti:**
  - Uvek prvo kreira `/tmp/penguins/` direktorijum
  - Pokreće sva 3 specijalista u jednoj poruci (paralelno)
  - Čeka sve tri, pa merguje u `rico_findings.md`
  - Verifikuje fajl sa `wc -l`
  - Vraća 3–5 bullet poena najvažnijih nalaza

#### Rico-Figma
- **Uloga:** Ista kao Rico, ali sa Figma MCP pristupom
- **Model:** `github-copilot/claude-sonnet-4.6` (potreban za Figma MCP)
- **Kada se koristi:** Samo kada `inputs/figma-notes.md` nije prazan
- **Specifičnosti:**
  - Koristi Figma MCP tools za dizajn kontekst (komponente, boje, spacing)
  - Output format uključuje sekciju `## Figma design context`
  - **Ne pokreće sub-specijaliste** (nema `permission.task`) — radi samostalno

#### Kowalski
- **Uloga:** Analyst — čita Rico nalaze i pravi implementacioni plan
- **Model:** `github-copilot/gpt-5.4`
- **NE piše kod, NE donosi finalnu odluku**
- **Skills:** `kowalski-analysis`
- **Specifičnosti:**
  - Piše `kowalski_plan.md` sa: fajlovi za menjanje, fajlovi za ne diranja, koraci, rizici, guardrails compliance
  - Kowalski-Risk radi paralelno interno (pokreće ga Skipper istovremeno)

#### Private (implementer 1)
- **Uloga:** Izvršni developer — implementira tačno ono što plan kaže
- **Model:** `github-copilot/claude-sonnet-4.6`
- **Ima:** write + edit + bash pristup
- **Skills:** `private-react`, `private-prettier`
- **Specifičnosti:**
  - Može da menja SAMO fajlove sa `skipper_decision.md`
  - Ako naiđe na neočekivano → piše `private_blockers.md` i STAJE
  - Ne improvizuje, ne optimizuje, ne refaktoriše van scope-a

#### Melman
- **Uloga:** QA validator — paranoidni proveravač
- **Model:** `github-copilot/gpt-5.4-mini`
- **NE menja kod**
- **Skills:** `melman-testing`
- **Specifičnosti:**
  - Prva linija `melman_report.md` mora biti `PASS` ili `FAIL`
  - Proverava: plan vs implementacija, guardrails, TypeScript greške, neovlašćeni fajlovi, edge cases
  - Melman-TS radi paralelno

#### Maurice
- **Uloga:** Code reviewer — pregleda diff za bugove i rizike
- **Model:** `github-copilot/gpt-5.4-mini`
- **NE menja kod**
- **Specifičnosti:**
  - Koristi se opciono (nije u svakom workflowu)
  - Piše `maurice_review.md` sa: findings + severity (low/medium/high) + APPROVED/NEEDS FIXES

---

### 2.3 Specijalisti (hidden subagenti — ne vide se u @autocomplete)

#### Rico-Files
- **Poziva ga:** Rico koordinator
- **Model:** `github-copilot/gpt-5.3-codex`
- **Uloga:** Pronalazi relevantne fajlove — glob i grep, entry points, bareli, test fajlovi
- **NE čita sadržaj fajlova** — samo ih locira
- **Output:** `/tmp/penguins/rico_files.md`

#### Rico-Patterns
- **Poziva ga:** Rico koordinator
- **Model:** `github-copilot/gpt-5.3-codex`
- **Uloga:** Čita fajlove i ekstrahuje coding patterne (state, data fetching, styling, TypeScript, naming)
- **Output:** `/tmp/penguins/rico_patterns.md`

#### Rico-Deps
- **Poziva ga:** Rico koordinator
- **Model:** `github-copilot/gpt-5.3-codex`
- **Uloga:** Mapira importove, barrel eksporte, cross-package zavisnosti, nedostajuće eksporte
- **Output:** `/tmp/penguins/rico_deps.md`

#### Kowalski-Risk
- **Poziva ga:** Skipper (paralelno sa Kowalskim)
- **Model:** `github-copilot/gpt-5.4`
- **Uloga:** Proverava guardrails compliance i rizike predloženih promena
- **Proverava:** zaštićene oblasti, API contract promene, new dependencies, `any` tipovi, scope violations
- **Output:** `/tmp/penguins/kowalski_risk.md` — završava sa: `PROCEED / PROCEED WITH CAUTION / BLOCK`

#### Private-2
- **Poziva ga:** Skipper (paralelno sa Private)
- **Model:** `github-copilot/claude-sonnet-4.6`
- **Uloga:** Drugi implementer za nezavisne grupe fajlova
- **Kada se koristi:** Samo kada `skipper_decision.md` ima fajlove i za Private i za Private-2
- **Output:** `/tmp/penguins/private_2_diff.md`

#### Melman-TS
- **Poziva ga:** Skipper (paralelno sa Melman)
- **Model:** `github-copilot/gpt-5.4-mini`
- **Uloga:** TypeScript i lint specialist — proverava `any` upotrebu, type greške, import greške, client/server boundary violations
- **NE menja kod**
- **Output:** `/tmp/penguins/melman_ts.md`

---

## 3. Kako se pokreće workflow

### Automatsko pokretanje (preporučeno)

Upiši sadržaj `start_auto.md` kao poruku:

```
@skipper

Execute the tiered workflow for automatic task routing:

- Workflow: ~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/workflows/tiered.yaml
- Jira task: .../inputs/jira-task.md
- Figma notes: .../inputs/figma-notes.md
- User command: .../inputs/user-command.md
...
```

Skipper automatski klasifikuje zadatak (small/medium/large) i rutira na pravi workflow.

### Input fajlovi

Pre pokretanja, popuni relevantne fajlove:

| Fajl | Kada se popunjava |
|---|---|
| `inputs/user-command.md` | Uvek — opis zadatka |
| `inputs/jira-task.md` | Za feature taskove iz Jire |
| `inputs/figma-notes.md` | Kada postoji Figma dizajn |

**Pravilo:** Ako je `jira-task.md` ili `figma-notes.md` neprazan → **Feature Mode** (Jira/Figma su autoritativni). Ako su oba prazna → **Refactor Mode** (samo `user-command.md`).

---

## 4. Workflow tipovi

### Tiered (automatsko rutiranje)
`workflows/tiered.yaml`

| Tier | Uslovi | Workflow |
|---|---|---|
| **small** | ≤1 fajl, nema Figme, nema Jire | Private direktno |
| **medium** | 2–5 fajlova, nema Figme | Rico → Private → Melman |
| **large** | Figma postoji ILI Jira postoji ILI ≥6 fajlova | Puni paralelni workflow |

### Jira + Figma → Code (Parallel v2)
`workflows/jira_figma_to_code_v2.yaml`

Puni workflow sa 2 paralelne grupe:

```
Parallel Group 1: Rico + Kowalski (istovremeno)
         ↓
    Skipper Decision
         ↓
Parallel Group 2: Private + Melman-Prep (istovremeno)
         ↓
    Melman Validation
         ↓
    Skipper Finalization
```

### Refactor v2
`workflows/refactor_v2.yaml`

Za refactor/improvement taskove bez Figme:

```
Parallel Group 1: Rico + Kowalski (istovremeno)
         ↓
    Skipper Approval
         ↓
    Private Implementation
         ↓
    Melman Validation
         ↓
    Skipper Finalization
```

---

## 5. Tok podataka između agenata

Svi privremeni fajlovi idu u `/tmp/penguins/`:

```
rico_files.md        ← Rico-Files
rico_patterns.md     ← Rico-Patterns
rico_deps.md         ← Rico-Deps
    ↓
rico_findings.md     ← Rico (merge sva 3)
    ↓
kowalski_plan.md     ← Kowalski
kowalski_risk.md     ← Kowalski-Risk (paralelno)
    ↓
skipper_decision.md  ← Skipper (piše sam)
    ↓
private_diff.md      ← Private
private_2_diff.md    ← Private-2 (paralelno, ako postoji)
private_blockers.md  ← Private (ako je blokiran)
    ↓
melman_report.md     ← Melman
melman_ts.md         ← Melman-TS (paralelno)
    ↓
audit/<datum>.jsonl  ← Skipper (finalizacija)
```

---

## 6. Paralelizacija

### Nivo 1 — Interno u Rico-u
Rico pokreće 3 specijalista **istovremeno** u jednoj Task poruci:
- `rico-files` + `rico-patterns` + `rico-deps` → merge → `rico_findings.md`

### Nivo 2 — Workflow paralelne grupe
U `jira_figma_to_code_v2.yaml`:
- **Group 1 (discovery):** Rico + Kowalski istovremeno
- **Group 2 (execution):** Private + Melman-Prep istovremeno

### Nivo 3 — Skipper paralelizacija
Skipper pokreće u jednoj poruci:
- `melman` + `melman-ts` uvek paralelno
- `private` + `private-2` paralelno ako plan ima 2+ nezavisne grupe fajlova

### Šta ostaje sekvencijalno
- Skipper mora da čeka Rico i Kowalski pre odluke
- Private mora da čeka Skipper approval
- Melman mora da čeka Private

---

## 7. Memory sistem

Svi memory fajlovi se učitavaju na početku svake sesije (definisano u `AGENTS.md`):

| Fajl | Sadržaj |
|---|---|
| `memory/context.md` | Projekat kontekst, tech stack, AI operativni model |
| `memory/assumptions.md` | Tehničke i procesne pretpostavke |
| `memory/decisions.md` | Arhitekturalne odluke (datiran log) |
| `memory/lessons-learned.md` | Greške, failovani pristupi, šta raditi umesto |
| `memory/audit-log.md` | Log svih audit događaja |

**Pravilo pisanja:**
- Svaka odluka koja utiče na buduće zadatke → `decisions.md`
- Svaka greška ili neočigledna ograničenja → `lessons-learned.md`
- Oba se pišu na kraju svake sesije (coding-standards.md §12)

---

## 8. Skills sistem

Skills su specijalizovane instrukcije koje agenti učitavaju na početku zadatka kroz `skill` tool.

| Skill | Koristi ga | Sadržaj |
|---|---|---|
| `rico-discovery` | Rico | Kako istraživati codebase, šta tražiti, kako formatirati nalaze |
| `kowalski-analysis` | Kowalski | Kako analizirati Rico nalaze, kako praviti plan |
| `melman-testing` | Melman | Šta proveravati, kako validirati, paranoid checklist |
| `private-react` | Private, Private-2 | React konvencije, functional components, hooks |
| `private-prettier` | Private, Private-2 | Formatting — samo modifikovane linije, nikada ceo fajl |

Skills fajlovi su na 2 mesta:
- `~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/skills/` (lokalni)
- `~/.config/opencode/skills/` (globalni)

---

## 9. Rules i guardrails

### Prioritet pravila
1. `rules/coding-standards.md` — **najveći prioritet, uvek pobeđuje**
2. `inputs/user-command.md`
3. `inputs/jira-task.md`
4. `inputs/figma-notes.md`
5. Otkrivene konvencije u repozitorijumu

### Ključna pravila (coding-standards.md)
- Zabranjeno refaktorisanje osim ako task to eksplicitno traži
- Diff mora biti što manji
- Samo fajlovi direktno vezani za task smeju biti menjani
- Functional components only (React)
- Ne uvoditi nove dependencies bez odobrenja
- `any` tip zabranjem — ako se koristi, mora biti dokumentovan

### Guardrails (guardrails.md)
Agenti su strogo zabranjeno da menjaju:
- Autentikaciju i autorizaciju
- Payment/billing logiku
- Environment varijable
- CI/CD konfiguraciju
- Database migracije
- API contract (shape requesta/responsa)

Izuzetak: JEDINO ako Jira task eksplicitno to traži I Skipper da direktno odobrenje.

---

## 10. Zaštićene oblasti

Sledeći putevi su automatski zaštićeni (protected-areas.md):

```
/auth/**
/payments/**
/middleware.ts
/env/**
/config/**
/api/core/**
.github/**
database/migrations/**
```

Ako bilo koji od ovih fajlova bude promenjen, obrisan ili dodat — Melman to prijavljuje kao `CRITICAL ERROR`.

---

## Brza referenca

```
Korisnik popuni inputs/ → pozove @skipper → Skipper klasifikuje tier →

LARGE workflow:
  Rico (paralelno pokreće: rico-files + rico-patterns + rico-deps)
    ↕ (paralelno sa Rico)
  Kowalski
    ↕ (paralelno sa Kowalskim)
  Kowalski-Risk
  → Skipper odlučuje (piše skipper_decision.md)
  → Private + Private-2 (paralelno, ako zadatak dozvoljava)
  → Melman + Melman-TS (uvek paralelno)
  → Skipper piše audit log
  → "Smile and wave boys, smile and wave 🐧🐧🐧🐧🦒🐒"
```
