# Auto Workflow Proces

Ovaj dokument opisuje sta se desava kada se pokrene `/auto-workflow` u OpenCode okruzenju za whitelabel projekat. Namenjen je brzom razumevanju toka rada, odgovornosti agenata, ruta izvrsavanja, zastitnih pravila i zavrsne validacije.

Nakon izmene OpenCode agent konfiguracije potrebno je restartovati OpenCode da bi nove vrednosti iz agent fajlova stupile na snagu. Trenutna sesija nastavlja da koristi konfiguraciju ucitanu pri startovanju.

## Polazne Datoteke I Putanje

Auto workflow koristi konfiguraciju, pravila i ulazne fajlove iz lokalnog multi-agent okruzenja.

| Svrha | Putanja |
| --- | --- |
| Glavna workflow konfiguracija | `/Users/dusanmilenkovic/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/workflows/tiered.yaml` |
| Korisnicka komanda | `/Users/dusanmilenkovic/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/inputs/user-command.md` |
| Jira task | `/Users/dusanmilenkovic/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/inputs/jira-task.md` |
| Figma beleske | `/Users/dusanmilenkovic/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/inputs/figma-notes.md` |
| Privremeni workflow artefakti | `/tmp/penguins/` |
| Audit log | `/Users/dusanmilenkovic/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/memory/audit-log.md` |
| Pravila kodiranja | `/Users/dusanmilenkovic/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/rules/coding-standards.md` |
| Guardrails | `/Users/dusanmilenkovic/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/rules/guardrails.md` |
| Protected areas | `/Users/dusanmilenkovic/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/rules/protected-areas.md` |

## Modeli Agenata

| Agent | Uloga | Model |
| --- | --- | --- |
| Skipper | Orkestracija, odluke, finalizacija | `github-copilot/gpt-5.5` |
| Rico | Glavni repository discovery koordinator | `github-copilot/kimi-k2.7-code` |
| Rico-files | Pronalazenje relevantnih fajlova | `github-copilot/kimi-k2.7-code` |
| Rico-patterns | Analiza obrazaca u kodu | `github-copilot/kimi-k2.7-code` |
| Rico-deps | Mapa import-a, eksport-a i zavisnosti | `github-copilot/kimi-k2.7-code` |
| Rico-figma | Discovery sa Figma kontekstom | `github-copilot/kimi-k2.7-code` |
| Kowalski | Analiza i plan implementacije | `github-copilot/gpt-5.3-codex` |
| Kowalski-risk | Analiza rizika i guardrails provera | `github-copilot/gpt-5.4` |
| Private | Implementacija odobrenog plana | `github-copilot/kimi-k2.7-code` |
| Private-2 | Drugi implementator za odvojene fajl grupe | `github-copilot/kimi-k2.7-code` |
| Melman | Validacija i QA | `github-copilot/gpt-5.3-codex` |
| Melman-ts | TypeScript validacija | `github-copilot/gpt-5.3-codex` |
| Maurice | Zavrsni review i sanity check | `github-copilot/gpt-5.3-codex` |

## Sta Pokrece `/auto-workflow`

Pokretanje `/auto-workflow` aktivira tiered workflow. Skipper prvo cita relevantne instrukcije, pravila, memoriju projekta i ulazne fajlove, a zatim odlucuje kojom rutom treba ici.

Workflow ne pocinje implementacijom odmah. Prvo se radi klasifikacija zadatka, procena opsega, provera zabranjenih oblasti i izbor odgovarajucih agenata.

## Ulazna Interpretacija

Pre bilo kakvog rada proveravaju se ulazni fajlovi.

| Uslov | Rezim |
| --- | --- |
| `jira-task.md` postoji i nije prazan | Feature/Product task |
| `figma-notes.md` postoji i nije prazan | Feature/Product task sa Figma kontekstom |
| Jira i Figma fajlovi su prazni, ali `user-command.md` sadrzi zahtev | Refactor/Improvement ili direktan task iz komande |
| `user-command.md` nedostaje ili je nejasan u refactor rezimu | Stop condition |

U feature rezimu Jira i Figma su autoritativni izvori. U refactor rezimu instrukcije se uzimaju samo iz `user-command.md`, a menjaju se samo eksplicitno navedeni fajlovi.

## Tiered Rute

Auto workflow bira jednu od tri rute: small, medium ili large. Ruta zavisi od opsega, rizika, broja fajlova, potrebe za dizajn kontekstom, potrebe za paralelnom implementacijom i toga da li zadatak dodiruje osetljive delove sistema.

### Small Ruta

Small ruta se koristi za jasne, lokalne, niskorizicne izmene.

Tipicni primeri:

- izmena jedne komponente bez promene API ugovora
- mala UI korekcija u poznatom fajlu
- dodavanje ili korekcija teksta
- jednostavan bug fix sa ogranicenim kontekstom

Tok small rute:

1. Skipper cita ulaze i pravila.
2. Rico radi ograniceni discovery relevantnih fajlova i obrazaca.
3. Kowalski daje kratak plan i rizike.
4. Private implementira samo odobrene fajlove.
5. Melman proverava diff, pravila i minimalnu validaciju.
6. Skipper daje zavrsni rezime.

Small ruta ne sme prerasti u siru izmenu bez eksplicitne odluke Skippera.

### Medium Ruta

Medium ruta se koristi kada zadatak zahteva vise konteksta, nekoliko povezanih fajlova ili dodatnu analizu zavisnosti.

Tipicni primeri:

- nova UI funkcionalnost sa postojecim servisima
- povezivanje postojeceg hook-a ili store-a
- promena kroz nekoliko komponenti u jednom paketu
- task koji zahteva proveru import/export obrazaca

Tok medium rute:

1. Skipper cita ulaze, pravila i memoriju.
2. Rico koordinira `rico-files`, `rico-patterns` i `rico-deps`.
3. Nalazi se zapisuju u `/tmp/penguins/rico_findings.md`.
4. Kowalski priprema plan korak po korak.
5. Kowalski-risk proverava rizike, protected areas i potencijalne API promene.
6. Skipper odobrava tacan spisak fajlova za implementaciju.
7. Private implementira odobreni plan.
8. Melman i po potrebi Melman-ts validiraju rezultat.
9. Maurice moze uraditi dodatni sanity review ako postoji veci rizik.
10. Skipper finalizuje rezime.

Medium ruta je podrazumevana kada task nije trivijalan, ali ne zahteva paralelnu implementaciju.

### Large Ruta

Large ruta se koristi za slozene zadatke, vise nezavisnih grupa fajlova ili zadatke sa vecim regresionim rizikom.

Tipicni primeri:

- feature koji dodiruje vise paketa
- task sa Figma dizajnom i vise UI stanja
- promene koje zahtevaju servis, tipove, komponente i validaciju
- implementacija koja se moze podeliti na nezavisne file grupe

Tok large rute:

1. Skipper radi inicijalnu klasifikaciju i proveru stop uslova.
2. Rico ili Rico-figma radi detaljan discovery.
3. Rico specialist agenti paralelno prikupljaju fajlove, obrasce i zavisnosti.
4. Kowalski pise detaljan plan sa koracima, rizicima i redosledom rada.
5. Kowalski-risk posebno proverava protected paths, API contract rizike, auth/payment/middleware zabrane i opseg.
6. Skipper donosi odluku o dozvoljenim fajlovima i podeli posla.
7. Private i Private-2 rade samo ako postoje jasno razdvojene file grupe.
8. Ako nema sigurne podele posla, koristi se samo Private.
9. Melman proverava uskladjenost sa planom i pravilima.
10. Melman-ts proverava TypeScript rizike kada je primenljivo.
11. Maurice radi zavrsni review kada je potreban dodatni nivo sigurnosti.
12. Skipper pise finalni rezime, navodi sta je menjano i potvrdjuje standarde.

Large ruta daje prednost stabilnosti nad brzinom. Paralelizacija je dozvoljena samo kada nema preklapanja fajlova i nema rizika od konflikta.

## Uloge U Detalje

### Skipper

Skipper je glavni orkestrator. On odlucuje rutu, tumaci pravila, odobrava opseg, zaustavlja workflow kod nejasnoca i daje finalni odgovor.

Skipper mora:

- procitati pravila pre odluke
- proveriti ulazne fajlove
- zastititi auth, payments, middleware, env, config, API contracts i migracije
- odobriti tacan spisak fajlova za implementaciju
- osigurati da finalni odgovor sadrzi sazetak i status validacije

### Rico Grupa

Rico agenti rade discovery. Njihov posao nije da predloze resenje, vec da pronadju cinjenice.

Rico grupa prikuplja:

- relevantne fajlove
- postojece komponente i hook-ove
- data fetching obrasce
- TypeScript i naming konvencije
- import/export strukturu
- package granice
- postojece testove i validacione obrasce
- Figma specifikacije kada je task dizajn-driven

Rico findings se obicno zapisuju u `/tmp/penguins/rico_findings.md`.

### Kowalski I Kowalski-risk

Kowalski pretvara discovery u plan implementacije. Plan mora biti minimalan, eksplicitan i vezan za konkretne fajlove.

Kowalski-risk proverava:

- da li se diraju protected paths
- da li postoji implicitna promena business logike
- da li se menja API ugovor
- da li se uvodi nova zavisnost
- da li je refactor zabranjen ili izvan opsega
- da li treba zaustaviti workflow i traziti odluku korisnika

### Private I Private-2

Private agenti izvrsavaju plan. Oni ne improvizuju i ne sire opseg.

Private sme da menja samo fajlove koje je Skipper odobrio. Ako se pojavi neocekivan problem, agent treba da stane i prijavi blocker umesto da nagadja.

Private-2 se koristi samo za odvojene, nepreklapajuce fajl grupe. Ako postoji rizik da oba agenta menjaju isti modul ili povezanu logiku, workflow koristi jednog implementatora.

### Melman, Melman-ts I Maurice

Melman proverava da li implementacija prati plan, da li su pravila ispostovana i da li nema neovlascenih promena.

Melman-ts se koristi kada TypeScript validacija ima poseban rizik ili kada task uvodi tipove, generike, service response shape ili strict typing promene.

Maurice se koristi za dodatni zavrsni pregled, posebno kod vecih ili rizicnijih izmena.

## Guardrails

Auto workflow mora postovati sledeca pravila:

| Oblast | Pravilo |
| --- | --- |
| Auth i authorization | Ne menjati bez eksplicitnog zahteva i odobrenja |
| Payments i billing | Ne menjati bez eksplicitnog zahteva i odobrenja |
| Middleware | Ne menjati bez eksplicitnog zahteva i odobrenja |
| Env varijable | Ne menjati bez eksplicitnog zahteva i odobrenja |
| CI/CD | Ne menjati bez eksplicitnog zahteva i odobrenja |
| DB migracije | Ne menjati bez eksplicitnog zahteva i odobrenja |
| API contracts | Ne menjati request/response shape bez eksplicitnog zahteva |
| Dependency changes | Ne instalirati i ne dodavati nove pakete bez odobrenja |
| Refactor | Zabranjen osim ako je eksplicitno trazen |
| TypeScript | Ne koristiti `any` osim kada nema alternative i postoji jasno obrazlozenje |

Protected paths se tretiraju kao visokorizicne oblasti. Ako task zahteva njihovu izmenu, workflow mora to posebno prijaviti i dobiti jasnu odluku pre implementacije.

## Notification Network Exception

Spoljni network pristup ostaje zabranjen osim uskog izuzetka opisanog u `rules/notification-network-exception.md`.

Skipper sme da pokrene `node tools/notify.mjs` bez `--dry-run` samo za stvarne workflow notification event-e i samo kroz taj alat. Dozvoljeni su samo `POST https://ntfy.sh/<configured-topic>` zahtevi preko `tools/notify.mjs`, sa podrazumevanim topic-om `penguins-dusan-7f3a9c`.

Direktni ad-hoc pozivi ka ntfy ili drugim servisima ostaju zabranjeni. Ako notification slanje ne uspe, workflow nastavlja da prijavljuje originalni status, a Skipper belezi notification failure u audit i finalni rezime.

## Stop Conditions

Workflow mora stati kada se pojavi jedan od sledecih uslova:

| Stop uslov | Sta se radi |
| --- | --- |
| Nejasan zahtev | Zaustavlja se i trazi pojasnjenje |
| Refactor bez eksplicitno navedenih fajlova | Zaustavlja se |
| Potrebna nova zavisnost | Zaustavlja se i trazi odobrenje |
| Promena auth/payments/middleware/env/CI/API contract | Zaustavlja se bez eksplicitnog odobrenja |
| Konflikt izmedju plana i pravila | Pravila pobedjuju, Skipper odlucuje dalje |
| Neocekivane postojece izmene koje blokiraju task | Zaustavlja se i pita korisnik |
| Implementacija zahteva veci opseg od odobrenog | Zaustavlja se i trazi prosirenje opsega |

Stop condition nije greska workflow-a. To je mehanizam kojim se cuva stabilnost projekta.

## Audit Log

Znacajne odluke i dogadjaji se beleze u audit log.

Audit log treba da zabelezi:

- pokretanje workflow-a
- izabranu rutu
- koji ulazi su korisceni
- protected area upozorenja
- Skipper odluke
- blokere
- validacione rezultate
- svako odstupanje od standardnog toka

Privremeni artefakti idu u `/tmp/penguins/`, dok dugorocne odluke koje uticu na buduci rad treba upisati u odgovarajuce memory fajlove.

## Final Summary Flow

Na kraju uspesnog ciklusa Skipper daje kratak i jasan zavrsni rezime.

Finalni tok obicno sadrzi:

1. sta je implementirano ili provereno
2. koje datoteke su promenjene
3. koja validacija je izvrsena
4. da li su pravila i guardrails ispostovani
5. eventualne preostale rizike ili napomene

Ako validacija nije mogla da se izvrsi, finalni rezime mora jasno navesti sta nije pokrenuto i zasto.

## Restart OpenCode Nakon Izmena Agenata

Agent definicije u `/Users/dusanmilenkovic/.config/opencode/agents/` ucitavaju se pri startu OpenCode-a. Kada se promeni `model:` linija ili bilo koji drugi deo agent frontmatter-a, potrebno je ugasiti i ponovo pokrenuti OpenCode.

Bez restarta, nova konfiguracija moze postojati na disku, ali aktivna sesija i dalje koristi prethodno ucitane modele.
