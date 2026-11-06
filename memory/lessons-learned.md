# Lessons Learned

> This file records mistakes, failed approaches, and hard-won discoveries.
> Agents MUST read this before starting any task.
> Agents MUST write here when a task reveals a non-obvious constraint or failure mode.

---

## Format

```
## YYYY-MM-DD — Short title

- **What failed**: describe the mistake or failed approach
- **Why it failed**: root cause
- **What to do instead**: correct approach
- **Affects**: which agents / files / areas are impacted
```

---

<!-- New lessons go below this line -->

## 2026-11-04 — Audio deduplication must follow successful playback

- **What failed**: smile-and-wave marked an assistant message played before afplay completed, so a failed attempt prevented a later idle event from retrying. The original reported silent playback's runtime cause is still unconfirmed.
- **Why it failed**: Attempted playback and successful playback used the same deduplication state; unmatched completion messages were silently skipped.
- **What to do instead**: Mark played only after afplay succeeds, retain that marker if the subsequent toast fails, and log subscription/idle/filter reasons/playback without message contents. Direct afplay exited zero; this does not establish audible receipt or the live event path.
- **Affects**: Global plugins/smile-and-wave/index.js and shared.js. Two offline regression tests pass; live workflow sound remains unverified.

## 2026-11-04 — V2 frontmatter alone does not align role instructions

- **What failed**: V2-format agent definitions still requested Task calls, skill name arguments, forbidden MCP services and mandatory report files from roles denied writing.
- **Why it failed**: Frontmatter migration did not update prose contracts or reconcile report persistence with effective permissions.
- **What to do instead**: Follow the global V2 runtime protocol and exposed schemas, return complete inline reports when writing is denied, and use an authorized mechanical writer only with exact scope and provenance. Validate final matching permissions, not just individual allow entries. Patch hunks within a file must follow source order; read back after a failed patch before retrying.
- **Affects**: All 13 global OpenCode agents and shared AGENTS.md. Offline structural checks passed; live role execution remains unverified.

## 2026-11-04 — Mixed agent frontmatter silently drops Skipper in V2

- **What failed**: Skipper disappeared and auto-workflow failed with Agent not found: skipper.
- **Why it failed**: A native `permissions` key selected the V2 loader, but its value was a legacy mapping rather than an ordered rule array. Installed v2.2.5 loader inspection showed the failed schema decode drops the agent; unsupported options/tools/tags warnings were secondary.
- **What to do instead**: Keep frontmatter consistently V2: request.body and permissions arrays, shell/subagent action names, normalized MCP names, broad read denial before exceptions. V2 write/edit/patch share edit permission; preserve the explicit deny rather than silently enabling writes. On macOS include /private/tmp/penguins as the canonical alias of the existing scratch allowlist.
- **Affects**: ~/.config/opencode/agents/skipper.md. The command's agent: skipper remains correct. Structural/permission tests passed; agent.updated was logged for whitelabel after the edit, but a complete workflow execution was not tested.

## 2026-11-04 — OpenCode V2 notification plugin migration

- **What failed**: Global smile-and-wave.js failed with reference err_9f51a12c; the matching server log reports SchemaError missing default.
- **Why it failed**: The installed OpenCode v2.2.5 requires a default id/setup or id/effect definition, while the file exported a V1 named function and experimental.text.complete hook.
- **What to do instead**: Use a local package with server and ./tui exports; subscribe to session.idle, inspect V2 typed assistant content, and deliver the toast through the CLI API. The server setup context has no legacy client.tui or shell $ helper. No new dependency is required for plain JavaScript definitions. Five mocked offline regression tests passed; live sound/toast receipt requires user confirmation.
- **Affects**: ~/.config/opencode/plugins/smile-and-wave/. The separate Penguins .opencode/plugins/smile-and-wave.js remains a legacy copy outside this repair's scope.

## 2026-11-02 - Notifier provider setting does not control delivery

- **What failed**: PENGUINS_NOTIFY_PROVIDER=ntfy still sent a Telegram notification.
- **Why it failed**: tools/notify.mjs reads provider configuration but unconditionally attempts Telegram first.
- **What to do instead**: Under the ntfy-only network exception, supply empty TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID for the notifier process only; the credential guard fails before any Telegram request, then ntfy fallback sends. Do not modify persisted env files. Verified workflow_complete status sent via ntfy-fallback, HTTP 200.
- **Affects**: Skipper workflow notifications and tools/notify.mjs invocation.

## 2026-07-16 — "Prati logiku" znači prati redosled operacija, ne tehnologiju

- **What failed**: Kada korisnik kaže "prati logiku sa web-shella", agent se fokusirao na tehnološke razlike (WebView vs Dialog, Monri Components JS SDK vs URL redirect) umesto na tačan redosled operacija. Implementacija je pozivala API pre otvaranja modala — suprotno od weba gde se modal otvara odmah na Pay klik, a API poziv se dešava unutar modala.
- **Why it failed**: Agent nije pažljivo pročitao sve relevantne fajlove pre pisanja koda (`monri-payment.tsx`, `second-step.tsx`, `provider-payments.tsx`, `first-step.tsx`). Da je to uradio, odmah bi video da web tok je: Pay klik → `setToggleDialog(true)` (odmah) → modal otvoren → `useEffect` unutar `SecondStep` → `getClientSecret` API. Umesto toga, agent je čitao parcijalno i pretpostavljao.
- **What to do instead**: Pre bilo kakve implementacije "prepiši logiku iz X u Y": (1) pročitaj SVE relevantne fajlove u izvornom toku, (2) napiši tačan redosled operacija kao listu, (3) tek onda implementiraj. Kada platforma ograničava tehnologiju (React Native nema DOM), samo zameni tehnologiju — redosled operacija ostaje identičan.
- **Affects**: Svi taskovi koji repliciraju tokove iz `apps/web-shell` u `apps/mobile-shell`.

## 2026-07-16 — transactions.service.ts: ALL (30-day) monthOffsets fetched 2 months instead of 1

- **What failed**: The `ALL` timePeriod branch (used for 30-day filter) fetched `[0, 1]` (current + previous month = 2 months), returning ~60 transactions. The `3_MONTHS` branch fetched `[0, 1, 2]` but returned only ~30 because those months had fewer entries. Result: 30-day showed more transactions than 3-month — logically inverted.
- **Why it failed**: `monthOffsets` ternary used `[0, 1]` as the fallback for `ALL`, incorrectly assuming 2 months covers "30 days". The 30-day filter is further narrowed client-side by `getStartAndEndDays`, so fetching only the current month `[0]` is sufficient and correct.
- **What to do instead**: `ALL` (30-day FE) must use `[0]` — only the current calendar month. `3_MONTHS` correctly uses `[0, 1, 2]`. This guarantees 3-month always returns >= 30-day results.
- **Affects**: `apps/mobile-shell/src/services/transactions.service.ts` line 110; any future changes to month-offset logic in this service.

## 2026-07-09 — Icon u mobile-shell mora imati color prop iz useMobileThemeColors

- **What failed**: Agent koristio `Icon` komponentu bez `color` propa — ikona se nije prikazivala ispravno jer tema boja nije primjenjena.
- **Why it failed**: U mobile-shell `Icon` komponenta ne reaguje na CSS klase (`text-foreground`) za boju na iOS u runtime — boja mora biti eksplicitno proslijeđena kroz `color` prop.
- **What to do instead**: Uvijek koristiti `useMobileThemeColors()` hook i proslijediti odgovarajuću boju kroz `color` prop. Primjer ispravnog koda:
  ```tsx
  const colors = useMobileThemeColors()
  <Icon as={ChevronLeft} className="text-foreground" size={16} color={colors.foreground} />
  ```
- **Affects**: Svi Private agent taskovi u `apps/mobile-shell` koji koriste `Icon` komponentu.

- **What failed**: Agent importovao `useGifts`, `activateGift`, `useNotifications` iz `@wh-label/shared` u mobile-shell komponentama.
- **Why it failed**: `@wh-label/shared` nije u `package.json` od `apps/mobile-shell` — paket nije dostupan u mobile-shell kontekstu.
- **What to do instead**: Svaki servis koji treba u mobile-shell mora biti kreiran lokalno u `apps/mobile-shell/src/services/`. Koristiti `expo/fetch` + `EXPO_PUBLIC_CONFIG_URL` ili `EXPO_PUBLIC_API_BASE_URL` + `queryOptions` + `useQuery` pattern. Pogledaj `kyc.service.ts`, `gifts.service.ts`, `notifications.service.ts` kao uzore.
- **Affects**: Svi Private agent taskovi u `apps/mobile-shell`. Važi sve dok korisnik ne doda `@wh-label/shared` u mobile-shell dependencies.

## 2026-07-08 — "Prepisi" znači potpuna replika, ne parcijalna

- **What failed**: Kada korisnik kaže "prepisi" ili "implementiraj" komponentu iz web paketa u mobile-shell, agent je kreirao delimičnu repliku — propustio `showFreeBet` guard iz `useParams`, pogrešan uslov za prikaz iznosa (`showFreebetAmount ? freebetAmount : 0`), i hardkodovao string umesto translation key-a.
- **Why it failed**: Agent je prepisao samo "suštinu" logike a ne sve detalje originalne komponente. Tretirao je neke delove kao opcione.
- **What to do instead**: Kada se kaže "prepisi" ili "implementiraj po uzoru na", svaki logički detalj originala mora biti repliciran u native ekvivalentu: svi uslovi, svi computed values, svi labels (hardkodovani ako translation nije dostupan, ali identični originalnom stringu). Razlike treba eksplicitno nabrojati korisniku.
- **Affects**: Private agent, sve komponente koje se repliciraju iz `packages/betting` ili `packages/shared` u `apps/mobile-shell`.

## 2026-07-08 — U mobile-shell uvijek koristiti /ui/view i /ui/pressable

- **What failed**: Agent koristio `View` i `Pressable` direktno iz `react-native` u mobile-shell komponentama.
- **Why it failed**: Native `View` i `Pressable` iz react-native ne primjenjuju tema boje sa backenda — CSS varijable ne reaguju na iOS u runtime. `/ui/view` i `/ui/pressable` rješavaju ovo automatski kroz `useMobileThemeColors`.
- **What to do instead**: U `apps/mobile-shell` uvijek importovati `View` iz `@/components/ui/view` i `Pressable` iz `@/components/ui/pressable`. Nikad iz `react-native` direktno — osim unutar samih `ui/view.tsx` i `ui/pressable.tsx` fajlova.
- **Affects**: Svi Private agent taskovi u `apps/mobile-shell`. Važi sve dok korisnik ne kaže da prestane.

## 2026-09-25 — "Prepiši" zahteva potpunu bihevioralnu paritetnost

- **What failed**: Mobile filteri za custom komponente proglašeni su završenim i označeni kao PASS iako Providers nije prikazivao provajdere, a Search nije vraćao rezultate.
- **Why it failed**: Statičke provere i provere uslova samo čitanjem koda nisu obuhvatile ponašanje interakcija od početka do kraja.
- **What to do instead**: Pre implementacije nabrojati svako izvorno ponašanje, API poziv, promenu stanja, uslov renderovanja, loading/error/empty stanje, paginaciju, navigaciju, perzistenciju i prevod; napraviti matricu paritetnosti; implementirati sva primenljiva ponašanja; proveriti svaku korisničku interakciju od početka do kraja. Nikada ne proglašavati parcijalan rad završenim niti ga označavati kao PASS. Ako runtime validacija nije moguća, to eksplicitno navesti i ne tvrditi da je runtime ponašanje ispravno.
- **Affects**: Skipper, Rico, Private i Melman; svi zadaci replikacije sa weba na mobile ili replikacije komponenti, posebno filteri za custom komponente.

## 2026-09-25 — Više komponenti mora biti podeljeno u zasebne fajlove po postojećim standardima

- **What failed**: Replikacija koja je sadržala više komponenti smeštena je u jedan veliki fajl umesto u zasebne fajlove komponenti.
- **Why it failed**: Implementacija je optimizovana za brzinu i minimalan broj fajlova umesto da prati postojeću strukturu komponenti i granice odgovornosti.
- **What to do instead**: Pre implementacije pregledati konvencije obližnjih foldera i fajlova. Kreirati zaseban fajl za svaku logičku komponentu kada izvor ili referenca sadrži više komponenti ili odgovornosti. Kontejner/dispatcher, filtere/pretragu/listu provajdera, listu/karticu igara, paginaciju i druge odvojene UI odgovornosti držati zasebno kada projektni obrasci tako nalažu. Ponovo koristiti postojeće komponente i ne spajati komponente samo radi smanjenja broja fajlova. Uključiti sve potrebne fajlove u scope/plan i zatražiti proširenje scope-a pre pisanja ako je potrebno. Revieweri moraju proveriti podelu komponenti i fajlova prema konvencijama repozitorijuma i odbiti monolitne implementacije koje ih krše.
- **Affects**: Skipper, Rico, Kowalski, Private i Melman; svi zadaci replikacije komponenti i prenosa sa weba na mobile.

## 2026-09-29 — URLSearchParams vrednosti ne treba unapred kodirati

- **What failed**: Trimovane vrednosti query parametara prosleđene su kroz `encodeURIComponent` pre dodavanja u `URLSearchParams`, pa su razmaci postali dvostruko kodirani kao `%2520` umesto `%20`.
- **Why it failed**: `URLSearchParams` već obavlja percent-encoding, pa je prethodno kodiranje ponovo kodirano.
- **What to do instead**: U `URLSearchParams` proslediti sirove trimovane vrednosti i prepustiti mu kodiranje query stringa.
- **Affects**: Izgradnja game route query stringa u `apps/mobile-shell/src/features/casino/components/sections/custom-component-filters-section.tsx` i sva buduća upotreba `URLSearchParams`.

## 2026-09-29 — Native room-preview measurement and layering must be branch-invariant

- **What failed**: Arrow paging used a missing or unrelated layout width in conditional ScrollView branches, while background and hero media risked obscuring or intercepting interactive content.
- **Why it failed**: One-row and multi-row branches did not consistently attach the same viewport `onLayout` measurement, and decorative image layers were not treated uniformly as non-interactive background layers.
- **What to do instead**: Attach the same viewport `onLayout` measurement used by arrow paging to every ScrollView render branch; keep background and hero images absolute, non-interactive, and below content.
- **Affects**: Native room-preview hero/background layering and horizontal paging in `apps/mobile-shell/src/features/casino/components/sections/room-preview-section.tsx`.

## 2026-09-30 — Validate banner jackpot behavior against an exact API payload

- **What failed**: Prior validation falsely passed after reasoning from inferred banner and jackpot shapes. In the concrete response, pure widget slides were dropped before render, so the jackpot never reached the banner component.
- **Why it failed**: Validation did not trace one concrete API fixture through every mapper and null guard. It also misread contract details: `dualsoft` uses the standard jackpot path, `widget.config.levelConfigs` must become root `tiers`, autoplay is nested at `options.autoplayIntervalSeconds`, and `backgroundStyle: 'image'` is a display mode rather than a color value.
- **What to do instead**: Validate a concrete fixture end to end through normalization, widget retention, section synthesis, jackpot routing, tier normalization, query inputs, and render guards. Explicitly list the expected tier IDs; for the verified payload they are `321`, `322`, `323`, and `324`.
- **Affects**: Rico, Private, Melman, and Skipper; mobile `banner-carousel/v1` jackpot mapping and validation in `casino-page-mapper.ts`, `banner-carousel-section.tsx`, and `jackpot-standard-section.tsx`.

## 2026-10-27 — Tolgee initialization is a lifecycle side effect

- **What failed**: Tolgee was initialized while deriving provider state, and an initialized builder was then reused for final language initialization.
- **Why it failed**: Initialization owns runtime resources and is not a memoizable value transformation; reuse can double-initialize an instance and becomes unsafe under React Strict Mode or provider-key changes.
- **What to do instead**: Use a disposable fallback instance to read `getLanguage()` and call `stop()`, bound persisted-language hydration, key the hydration owner by runtime configuration, then create a fresh final instance in an effect, call `init()` exactly once, and call `stop()` during cleanup.
- **Affects**: Mobile Tolgee providers and any future Tolgee provider lifecycle implementation.

## 2026-11-02 — Retire empty-Telegram-credentials transport workaround

- **What failed**: The earlier 2026-11-02 provider-setting lesson recommended empty Telegram credentials to activate the ntfy fallback; that workaround is now retired and must not be followed.
- **Why it failed**: Historical implementation and network policy disagreed; provider selection did not control delivery. Keeping the workaround would contradict the approved Telegram-only transport and stricter session restrictions.
- **What to do instead**: Use the sole Telegram notifier only when session/network authorization permits. Missing credentials or delivery failures remain nonfatal with secret-safe failed evidence and no fallback or lifecycle append. Preserve the old lesson as historical evidence, not active advice. Syntax and 48 isolated offline cases passed; no live delivery was attempted or verified.
- **Affects**: Skipper, Private, Melman; notifier policy/docs, tools/notify.mjs, historical notification evidence.

## 2026-11-02 — Resolve artifact writer capability against the actual runtime

- **What failed**: The user reported two Kowalski attempts returned no plan because writing was unavailable, despite role-declared writer tools.
- **Why it failed**: Declared tools do not guarantee that the runtime exposes a usable writer. Repeating the same unsuccessful attempt did not produce the required artifact.
- **What to do instead**: Use an available artifact writer in a bounded fallback or return the plan inline rather than repeatedly returning no plan. A bounded writer subsequently wrote and read back `/tmp/penguins/kowalski_plan.md`; task-specific approval was supplied separately. No fallback model identity is established by this evidence. During offline harness development, normalize cross-VM objects before strict comparison and derive callback boundary lengths from the actual prefix rather than a guessed count.
- **Affects**: Kowalski, Skipper, artifact-writing delegation and offline VM regression harnesses.

## 2026-11-02 - Verify validation report content before accepting returned paths

- **What failed**: In the MEDIUM stake-input cycle, Melman first lacked a file writer, then returned a path to a stale notifier report. Path-only output also deviated from requested structured communication; an apparent reporting success was not current-task validation.
- **Why it failed**: Writer availability is runtime-dependent, and a shared scratch filename can retain unrelated task content. A returned path alone establishes neither freshness nor a task-specific independent verdict.
- **What to do instead**: Read the report and verify task, scope, evidence and verdict before accepting its path. Reject stale evidence, preserve it unchanged as clearly named historical scratch, obtain task-specific independent fallback review, and materialize supplied results through an available bounded writer with provenance/readback. Record the path-only deviation and safe recovery, do not invent model identity, and distinguish PASS_STATIC from unverified runtime/build behavior. This cycle used supplied Maurice independent PASS_STATIC and Skipper static-only acceptance without validation reruns.
- **Affects**: Skipper, Melman, Maurice, bounded artifact writers, shared /tmp/penguins reports and MEDIUM finalization.

## 2026-11-02 - Keep controlled accordion values defined and collision-free

- **What failed**: Passing undefined for closed Accordion Root switched the installed controllable primitive out of controlled mode; repeated reopen/close could select retained uncontrolled state. The raw-ID empty-string fix initially lacked nonempty-ID and installed-type evidence, so Private correctly stopped.
- **Why it failed**: The installed hook determines controlled mode by prop !== undefined, not external ownership intent. Raw app IDs are strings that can be empty, so an empty closed sentinel requires a separate noncolliding internal item value.
- **What to do instead**: Under explicit refined approval, verify installed string declarations and use nonempty internal sport-${sportId} for Root/Item/callback comparison, with defined closed ''. Keep internal IDs distinct in purpose from raw app keys and forward original sportId; preserve the correct parent setter/equality guard and complete callback dependencies. Trace initial closed/expanded and close-open-close statically; do not equate PASS_STATIC with verified device/animation/first-click visual behavior.
- **Affects**: Mobile boosted-odds sport header, installed controllable accordion integration, Private/Melman/Skipper. Historical guidance remains preserved; this is a task-specific refinement, not permission to normalize unrelated app IDs.

## 2026-11-02 - Recover canceled preparation and path-only handoffs by artifact readback

- **What failed**: Accordion preparation was canceled and Private later returned only an artifact path instead of structured output; shared scratch could still contain unrelated footer/stake material. Melman supplied substantive inline validation but lacked a report writer.
- **Why it failed**: Cancellation/path existence does not establish current content or completion, and reporting capability differs from review capability. No unavailable Melman or fallback identity should be inferred from missing writes.
- **What to do instead**: Inspect actual task/scope/approval/evidence, preserve prior histories with clear names without duplicate backups, recover prerequisites, and use a bounded writer to materialize the supplied current verdict and acceptance with provenance/readback. Record the communication deviation and resolved blockers; never reuse old verdicts or notification deliveries. Here notification remains not_attempted due session restrictions.
- **Affects**: Skipper, Private, Melman, bounded writers and shared /tmp/penguins artifacts; complements the historical stake-report lesson without replacing it.

## 2026-11-02 - Threshold-only scroll savings do not establish faster initial loading

- **What failed**: A faster-data/faster-display request cannot be considered measured initial-load improvement merely because a patch removes redundant scroll-driven state updates. This is a claim boundary, not evidence of a failed runtime test.
- **Why it failed**: Scroll rerenders and repeated group/sort derivation are separate from initial query/backend latency. Static inspection can establish redundant work but cannot measure network time or device performance. Coarsened state also no longer represents the latest exact offset.
- **What to do instead**: Coarsen scroll state ONLY when all consumers depend solely on the same threshold; keep producer/consumer thresholds aligned and preserve the exact boundary predicate. Revisit the optimization before introducing any exact-offset consumer. Profile initial loading, query durations and device scroll commits under separate authorization before prioritizing initial-load changes; never equate scroll-work savings with faster fetching or claim a measured speedup from source reads. Read actual task-specific reports after path-only handoffs and distinguish Private static evidence from independent validation.
- **Affects**: Results page apps/mobile-shell/src/app/(tabs)/sportsbook/results.tsx, its sole BackToTop consumer, future scroll-state consumers, and Private/Skipper performance reporting. Current acceptance is ACCEPTED_STATIC under SMALL private_direct; initial/backend latency and device behavior remain unverified.

## 2026-11-03 - Keyboard viewport ownership does not guarantee device reveal

- **What failed**: The original search-only scope could not safely control an ancestor viewport; an input-row wrapper or a generic extra KAV/padding would not establish focused-input reveal and could double native avoidance. This records the scope/design limitation, not a failed device test.
- **Why it failed**: Insets/scroll range belong to screen ScrollViews, while keyboard/viewport coordinate ownership and actual Android resize depend on native deployment. Static source evidence cannot prove device ordering, initial insets or sufficient scroll range.
- **What to do instead**: Obtain explicit screen scope/platform confirmation; use one native iOS inset owner and Android's existing resize owner, with bounded public-API measured reveal for current local focus. Preserve stale-measurement/unmount/blur/user-scroll guards; dragging disables correction until next focus. Use installed same-key-window coordinate evidence, not guessed offsets/conversion. If Android does not resize or scroll range is absent, report the gap and require separate native/config evidence and approval, never duplicate KAV/padding.
- **Limits to retain**: Actual Android resize unknown; short content/iOS newly mounted viewport with IME already open may lack native inset/range; initial keyboard metrics can be stale and intervening scroll can cancel correction. Full-window/same-key-window TextInput-bounds only, no floating/split/multiwindow/whole-row assurance. Tests/build/lint/typecheck/runtime/StrictMode ordering unverified; PASS_STATIC is not device completion.
- **Handoff recovery**: Read actual current artifacts after Private path-only output; preserve unrelated accordion report before materializing Melman's supplied inline independent PASS_STATIC when its writer is unavailable. Do not fabricate a completed Kowalski-subagent/model identity, independent writer verdict, or notification delivery. Supplied Skipper ACCEPTED_STATIC resolves only the expanded cycle; historical BLOCKED event stays unchanged.
- **Affects**: CasinoScreen/CasinoLobbyScreen keyboard handling and future Skipper/Private/Melman keyboard work; audit/2026-11-03.json. Required later device checks include both backgrounds/screens, short/long content, already-open IME, async layouts, native resize, manual drag and navigation transitions.

## 2026-11-03 - Diagnostic logging must preserve production and guard evaluation

- **What failed**: Supplied Melman FAIL rejected casino keyboard diagnostics: unconditional diagnostic-only usePathname adds production routing subscription, and cancellation snapshots query native refs/focus after the original liveness/identity conjunction short-circuits. Exact prediagnostic source/diff is missing from the current implementation report, so preservation is not fully independently established. No demonstrated runtime crash is claimed.
- **Why it failed**: A no-op logger does not prevent evaluation of its arguments. Logging guards cannot neutralize unconditional production hooks or make native queries safe after failed liveness/host-identity guards. Narrative preservation claims do not replace an exact baseline/diff.
- **What to do instead**: Keep dev diagnostics outside production hooks, preserve hook rules and original short-circuit protection, and do not query native refs after failed liveness/identity guards. Retain exact prediagnostic source and introduced diff for behavioral-preservation audit. Stop on FAIL; obtain fresh user direction before correction or revert and revalidation, then obtain a targeted trace rather than asking users to run rejected diagnostics.
- **Affects**: CasinoScreen, CasinoLobbyScreen, custom-component-filters/search-input.tsx, Private/Melman/Skipper diagnostic review and bounded administrative writers. Prior PASS_STATIC remains historical static evidence, not runtime success; actual keyboard cause remains unresolved.

## 2026-11-03 - Tiered MEDIUM dispatch must satisfy task-specific Private prerequisites

- **What failed**: Favorites-count MEDIUM orchestration stopped at Private after classification and Rico discovery; implementation and validation did not occur.
- **Why it failed**: Tiered MEDIUM routing can conflict with Private's mandatory plan/approval requirements; shared plan and approval artifacts still authorized an unrelated casino task.
- **What to do instead**: Check task-specific plan, approval and file allowlist before dispatch. Obtain a fresh favorites-specific Kowalski plan and Skipper approval; never reuse stale authority or overwrite historical artifacts merely to bypass the prerequisite.
- **Affects**: Skipper, Kowalski, Private, tiered MEDIUM routing and shared /tmp/penguins plan/approval artifacts.

## 2026-11-03 - Balance bridge role writers and current report identity

- **What failed**: Specialized planner failed twice solely because its runtime lacked a writer. Reviewer first returned a stale canonical favorites report path; no current balance-bridge report had been written by Melman.
- **Why it failed**: Role capability declarations and shared filenames do not establish available runtime tools, current run identity, substantive review or artifact persistence. A read-only reviewer can inspect evidence without writing it.
- **What to do instead**: Use a bounded capable general-agent planning fallback with accurate attribution and task-specific approval; reject stale paths after content/run inspection. Obtain current inline reviewer source/patch/harness/log review, distinguish runner execution from reviewer judgment, then mechanically persist supplied PASS_STATIC and inline ACCEPTED_STATIC through an available writer. Archive old reports unchanged as clearly historical, verify canonical/run-local equality and scoped source hashes, and never invent role/model execution or reuse notification delivery.
- **Limits**: This balance-bridge cycle has 83 actual-source offline cases with real QueryClient/disabled offline QueryObserver; TS 82 each and ESLint 16 errors/one warning each with zero introduced, not clean checks. Native/provider timing, mounted UI/React lifecycle and in-flight overwrite remain unverified; modeled missed early installation is not confirmed runtime cause and fallback cannot recover already missed messages.
- **Affects**: Skipper, Kowalski, Melman, runner assistants, administrative writers and shared /tmp/penguins reports; run rico-20261103-111658-11664 only.

## 2026-11-04 - Conditional mixed-group odds lookup is runtime-unconfirmed

- **What failed**: Reported boosted matches lack odds while all-matches shows odds for the same match IDs. Static diagnosis establishes a possible missing-odds mechanism, not the actual runtime cause or a tested fix.
- **Why it failed**: In the supplied source-read review, TopViewMobile calculates specialValue from the passed group but conditionally chooses a matching child prematch group for tip inputs; absent that group, it retains the passed group. A truthy betMap prevents flat odds fallback, so incompatible keys, locked entries or invalid values can produce a disabled dash; an empty visible tip slice yields no buttons. Both parent paths share the child, and sport-level any-match availability does not prove per-row compatibility. This mechanism remains runtime-unconfirmed for the reported symptom.
- **What to do instead**: Obtain contemporaneous redacted same-match responses and actual parent/child groups, visible tips, specialValue, normalized keys and entry status/value. Trace the exact pair through lookup before proposing a fix; do not assume identical IDs mean identical payloads or generalize conditional override into a universal cause. Keep supplied Private post-discovery hashes separate from independent review and whole-worktree claims.
- **Affects**: Mobile home boosted/all-matches odds, TopViewMobile, PrematchOddMobile, domain/odds.ts and future Rico/Private/Melman/Skipper diagnostic work; odds-diagnosis-20261104-01.

## 2026-11-04 - Equal diagnostic counts do not establish equal contents

- **What failed**: Boosted-odds implementation's unchanged-normalized-TypeScript claim was rejected by supplied independent Melman FAIL despite 82 diagnostics in each run.
- **Why it failed**: Equal counts alone cannot establish content equality; position-only normalization cannot erase changed module names. Current artifact readback does not corroborate the review's cited filename discrepancy, so supplied review and current evidence must remain distinctly attributed, not silently reconciled.
- **What to do instead**: Preserve exact evidence and supplied FAIL/STOP. With fresh authorization, reconcile exact diagnostic contents and provenance before asserting no new errors; never promote equal counts to equal diagnostics or infer callback parity from serialized trees that omit callbacks.
- **Affects**: Private/Melman/Skipper baseline comparisons and administrative persistence; boosted-odds-fix-20261104-01. No correction or revalidation performed in this stop-recording task.
# 2026-11-04 - Status wording and baseline YAML validation

- **What failed**: Unconditional success endings could follow failed/blocked finalization; baseline v2 workflow YAML had malformed indentation (10 Jira/Figma and 8 refactor parser errors).
- **Why it failed**: Final wording was not gated by actual workflow status; malformed input/task indentation prevented parsing independently of wording edits.
- **What to do instead**: Select exact event-specific endings, reserve success for successful validation, report notification evidence separately, and obtain explicit approval before repairing pre-existing structural issues. User approved indentation-only repair in this run; independent review remains pending.
- **Affects**: Six approved finalization instruction sources; status-wording-20261104. No notifier or application changes.

## 2026-11-05 - Compare routing representations and mandatory planning skills

- Supplied lesson mechanically persisted by Private for optimize-20261105-01/correction-01, not a new writer finding.
- 2026-11-05: Static classifier tests missed contradictory tier triggers and one-option text conflicted with mandatory planning skill. Compare both routing representations and loaded skill instructions; retain frozen-hash failures after authorized edits and explain provenance, never suppress evidence. Affects workflows/planner validation.
- Supplied evidence: 864 modeled cases (192 valid, 672 modeled preflight blocked), 224 assertions pass; legacy82 has 80 pass and 2 expected frozen-hash failures, not all-pass. Historical harness-error evidence remains preserved. Supplied PASS_STATIC is not effective-runtime or measured-performance certification.

## 2026-11-05 - Inspect agent visibility before declaring reload impossible

- Supplied Skipper lesson, mechanically persisted by Private for integrate-agents-20261105-01; no new writer verdict.
- What failed: agents existed, but hidden:true excluded them from the catalog per V2 documentation. The earlier claim that dynamic reload was impossible was incorrect.
- What to do instead: inspect visibility, use documented reload, and verify the actual runtime catalog before resuming mandatory roles. Visibility is not permission; preserve model and security settings.
- Scope: kowalski-risk/melman-ts visibility edits accepted statically by Skipper after supplied independent Melman PASS_STATIC; prior-content preservation attributed to Private hash evidence. Runtime loading remains unverified and overall integration remains BLOCKED_CAPABILITY, not Julien/Mort/Nana integration success.

## 2026-11-05 - Structural gates do not prove audited-plan identity or evidence propagation

- Supplied Skipper lesson, mechanically persisted by Private for integrate-agents-20261105-01/stage2; not a new writer verdict.
- What failed: 256 structural static checks did not establish immutable Nana-reviewed plan identity at SMALL approval or explicit Nana pre/post plan/scope/actual-diff evidence propagation. Maurice FAIL remains controlling despite supplied Melman-ts PASS_STATIC and Nana CAUTION.
- Why: Dependency ordering and literal triadOwners assertions do not prove that approval consumes the exact audited plan or that a specialist actually receives required evidence; static structure is not runtime certification.
- What to do instead: Assert immutable reviewed-plan identity, require re-audit on changes, and explicitly wire Nana evidence inputs. Pass current inline Mort handoffs directly from the main orchestrator instead of attempting nested session retrieval that exceeds the runtime depth limit. Obtain user correction authorization before editing after FAIL.
- Affects: tiered/refactor/Jira routing, specialist handoffs, Private structural checks and Skipper approval. No final Melman or delivery approval; Julien insufficient_data means performance unmeasured, with no speedup claim.

## 2026-11-05 - Preserve failure history when evidence-wiring corrections pass

- Supplied Skipper lesson mechanically persisted by Private for integrate-agents-20261105-01/correction01 acceptance; no new writer verdict.
- What failed: Original structural gate assertions missed audited-plan identity and Nana evidence input wiring. A malformed empty patch was rejected before writes; no bypass occurred. Nested Mort packet retrieval hit a depth limit before inline context resolved it.
- What to do instead: Bind approval to retained immutable reviewed content or a verified run/scope/provenance digest, block changed plans until re-audit, explicitly supply actual diff/approval/scope/rules evidence and test missing/stale/mismatched inputs. Main orchestrator should supply current inline Mort packets directly rather than require nested retrieval.
- Correction checks are source-anchored static/model evidence, not runtime proof. Preserve original FAIL alongside later authorized correction and independent PASS_STATIC; do not rewrite earlier reviewer authorship or report-time pending status. Julien's report preceded final Melman PASS and remains performance insufficient_data/unmeasured, not a speedup claim.
- Affects: Workflow evidence propagation, immutable approval identity, static acceptance boundaries and mechanical finalization. Administrative integration accepted statically; unrelated application Task and runtime/performance remain unverified.
