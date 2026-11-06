# Architectural Decisions

## 2026-11-04 - Event-specific workflow final wording

- Run status-wording-20261104: supplied Skipper approval limits success wording to successfully validated workflow_complete. Failures, blocked and blocker_resolved use "Boys we have a problem!"; decisions/approvals use "Kowalski! Options!"; workflow_started uses "🐧 Penguins workflow started!". Six instruction sources aligned; runtime/session restrictions retain priority.
- User explicitly approved minimal indentation repairs in the two scoped v2 workflows after baseline YAML parsing failed. No step order, agent, dependency, permission, notifier transport or application change authorized.
- Private implementation evidence is recorded under /tmp/penguins/status-wording-20261104/. Independent validation and Skipper acceptance remain pending; no live delivery or runtime behavior certified. Historical records remain unchanged.

## 2026-11-04 - OpenCode V2 agent instruction alignment

- User explicitly authorized fixing the instruction issues found in all 13 global agents. Scope: global AGENTS.md and agents/*.md plus required memory/audit records; unrelated application input task is not executed.
- All agents follow a shared V2 runtime protocol: load the OpenCode skill for relevant work, consult V2 docs through Context7, use exposed subagent/skill schemas, and use local file tools instead of prohibited MCP services. Final FFF/MemoryGraph deny rules override earlier allows in every agent.
- Preserve read-only edit denials. When report writing is unavailable, return complete inline content with artifact_written: false rather than a fabricated file path. Skipper may delegate exact-content mechanical persistence with a file allowlist to an authorized writer; this narrow administrative assignment does not require an application implementation plan or confer decision authority.
- YAML/frontmatter and effective FFF/MemoryGraph denials verified offline for all 13 agents, along with retained read-only edit denials and absence of obsolete Task tool/skill name syntax. Actual child-agent execution and live workflow behavior remain unverified.

## 2026-11-04 - Standing permission for future Telegram workflow notifications

- User explicitly requested persistent Telegram notification permission for future sessions. Scope approved: global OpenCode instructions and Penguins notification policy/documentation plus this decision and audit entry; no application work or old input task is authorized by this request.
- Future sessions may run the existing `node tools/notify.mjs` from the Penguins root without `--dry-run` for real allowed workflow events, without separate approval per send. Only the notifier's Telegram sendMessage request is excepted from the network ban.
- This supersedes interpreting the 2026-11-02 cleanup-session ban as a persistent prohibition. Historical decisions and delivery/audit records remain unchanged. Fresh explicit session restrictions and higher-priority runtime/tool restrictions still win; never bypass approval or sandbox controls.
- No direct network calls, synthetic phone tests without separate approval, bot polling/launch, credential/environment changes, or other network access are authorized. Existing credentials are used only by the notifier. No notifier or OpenCode JSON configuration change was needed; no global permission override was added.
- Restart OpenCode to load revised instructions. This administrative change does not verify credentials, notifier validation, or live Telegram delivery, and does not close prior validation blockers. No live send was attempted in the editing session.

## 2026-08-14 — Skipper notifier requirement for decisions and blockers

- Future Skipper decisions and workflow blockers must trigger `node tools/notify.mjs` notification when shell/tool access permits.
- Notifications must be run from the Penguins root without `--dry-run` unless the task explicitly requests a dry run.
- If notification cannot be sent, Skipper must explicitly report why and record the failure/blocker in the audit log.

## 2026-06-26 — Tournaments Configurator in CMS (apps/wh-label-cms)

- **New Payload Global created**: `apps/wh-label-cms/src/globals/TournamentConfig.ts` — slug `tournament-config`, single `json` field named `config`, same pattern as SportsbookConfig/OddsDisplayConfig/HomePageConfig.
- **Tournament config shape**: `{ tournaments: TournamentConfigItem[] }` where `TournamentConfigItem = { tournamentId: number; image: string; rulesPath: string; active: boolean }` — stored as JSON in the Global.
- **New admin view created**: `apps/wh-label-cms/src/components/CasinoConfigurator/` — `index.tsx` (server wrapper) + `CasinoConfiguratorClient.tsx` (`'use client'`); follows SportsbookConfigurator pattern exactly.
- **react-query NOT used** — consistent with decisions 2026-06-17, 2026-06-18, 2026-06-22; `@tanstack/react-query` is not installed in `apps/wh-label-cms`; raw `fetch()` + `useState`/`useEffect` used.
- **configApi NOT used in CMS** — `configApi` from `@wh-label/shared` cannot be safely used in the CMS app because `envService` throws at module load when `NEXT_PUBLIC_CONFIG_URL` is absent from the CMS env; direct `fetch()` to `${NEXT_PUBLIC_CONFIG_URL}/ibet/getITournamentList.json` used instead with env guard.
- **`NEXT_PUBLIC_CONFIG_URL` required in CMS env**: must be added to `apps/wh-label-cms/.env` pointing to the ibet backend for the tournament list fetch to work; a visible warning is shown in the UI when not set.
- **Merge pattern**: tournament list always from ibet API; config always from `GET /api/globals/tournament-config`; merged by `iTournament.id === tournamentConfig.tournamentId`; missing config defaults to `image:'', rulesPath:'', active:false`.
- **Per-row save**: clicking Save in the edit dialog calls `POST /api/globals/tournament-config` with the full updated config array; no page-level Save button.
- **payload.config.ts updated**: `casinoConfigurator` view registered at path `/casino-configurator`; `TournamentConfig` added to `globals` array.
- **importMap.js updated**: new entry `"/components/CasinoConfigurator#default"` with hash `2879b46109fff95a8c2fd8f051768415`.
- **Dashboard not modified**: card linking to `/admin/casino-configurator` was already present.
- **No new npm dependencies introduced**.

## 2026-06-26 — Provider jackpot components refactored to use consolidated services

- **All 4 remaining provider jackpot components refactored** — replaced `useState`/`useEffect`/raw `fetch` with `useQuery` hooks from `jackpots/jacpots.services.ts`.
- **`egt-jackpot/index.tsx`**: uses `useEgtJackpot()`; `JackpotLevel = 'I' | 'II' | 'III' | 'IV'`; template literal key access `data[\`currentLevel${level}\`]`; amounts already `number`.
- **`egt-digital-jackpot/index.tsx`**: uses `useEgtDigitalJackpot()`; `parseInt(..., 10) || 0` for amounts; `!== 'null'` guards for string-"null" backend values; `currency` field absent in response (not rendered).
- **`synot-jackpot/index.tsx`**: uses `useSynotJackpot()`; `parseFloat(...) || 0` for amounts (backend sends float strings); `(Image as any).src` pattern preserved for Next.js static image imports.
- **`fazi-jackpot/index.tsx`**: keeps `useIcParams` + `useTolgee`; uses `useFaziJackpot({ url, type, currency, locale })`; `IcParamsResponse` imported and used as explicit type for `select` callback param to avoid TS7006.
- **TS validation**: zero new logic errors introduced; all remaining errors are pre-existing TS6305 (unbuilt dist) or pre-existing TS7006 in unrelated files.

## 2026-06-26 — Consolidated jackpot services (jackpots/ directory)

- **`packages/casino/src/infrastructure/jackpots/types.ts` created**: all types for all 5 providers — `EgtJackpotWinnerItem`, `EgtJackpotBody`, `EgtJackpotResponse`, `EgtDigitalJackpotResponse`, `SynotJackpotResponse`, `FaziJackpotLastWin`, `FaziJackpotItem`, `FaziJackpotApiResponse`, `FaziJackpotParams`, `EgtDigitalJackpotItem`, `EgtDigitalJackpotForInstanceNamesResponse`.
- **`packages/casino/src/infrastructure/jackpots/jacpots.services.ts` created** (note typo "jacpots" is intentional — matches pre-existing file on disk): 5 services — `useEgtJackpot`, `useEgtDigitalJackpot`, `useSynotJackpot`, `useFaziJackpot`, `useEgtDigitalJackpotForInstanceNames`; all use `configApi` + `queryOptions + useQuery + staleTime: 30 * 1000`.
- **EgtJackpot double-parse**: `getEgtJackpots.json` wraps body as JSON-encoded string in `outer.data.body`; service does `JSON.parse(outer.data.body)` as `EgtJackpotBody`.
- **FaziJackpot uses POST + dynamic URL**: `fetchFaziJackpot` accepts `FaziJackpotParams` with `url: string | null`; uses native `fetch()` (not configApi) with `application/x-www-form-urlencoded`; `enabled: !!params.url`.
- **EgtDigitalJackpot + SynotJackpot + EgtJackpot**: switched from hardcoded `https://dual-dev.betole.com/ibet/...` absolute URLs to `configApi` (uses `CONFIG_URL/ibet` env-driven URL).
- **Old `ibet/egt-digital-jackpot-for-instance-names.service.ts` converted to re-export barrel**: points to `../jackpots/types` and `../jackpots/jacpots.services`; consumer component (`egt-digital-jackpot-for-isntance-names/index.tsx`) does NOT need import path changes.
- **No barrel update**: `jackpots/` services follow same direct-import convention as other jackpot services.

## 2026-06-26 — EgtDigitalJackpotForInstanceNames implementation

- **New service file created**: `packages/casino/src/infrastructure/ibet/egt-digital-jackpot-for-instance-names.service.ts` — follows `jackpot-config.service.ts` pattern; `configApi`, endpoint `getEgtDigitalJackpotsForInstanceNames.json`, `searchParams: { locale: 'sr' }` hardcoded, `queryOptions + useQuery`, `staleTime: 30 * 1000`. Response type is `Record<string, EgtDigitalJackpotItem>` (a named map, not an array).
- **`EgtDigitalJackpotItem` type defined**: all 20 level fields typed as `string` — backend returns numeric values as strings and uses the literal string `"null"` for missing values; component guards with `!== 'null'` before using.
- **`tiers` amounts parsed with `parseInt(..., 10)`**: `CasinoJackpotTierConfig.amount` is `number`; backend sends strings; `|| 0` fallback for NaN.
- **`egt-digital-jackpot-for-isntance-names/index.tsx` replaced**: stub → full implementation; follows `egt-digital-jackpot/index.tsx` pattern (useMemo tiers + jackpotDetails); accepts `type: string` prop; filters with `allData?.[type]`.
- **`providers-jackpot/index.tsx` updated**: `<EgtDigitalJackpotForInstanceNames type="Clover Chance" />` — placeholder; user confirmed `"Clover Chance"` as the type value.
- **No barrel export added**: jackpot services use direct relative imports (convention established prior to this task).
- **Folder typo preserved**: folder is `egt-digital-jackpot-for-isntance-names` ("isntance" not "instance") — matches existing import in `providers-jackpot/index.tsx`.

## 2026-06-25 — Tournament detail server-side prefetch

- **New service file created**: `packages/casino/src/infrastructure/ibet/tournament-detail.service.ts` — mirrors `tournament-list.service.ts` pattern; uses `configApi`, endpoint `getITournamentWithRoundData.json`, `searchParams` built dynamically (lr/lrl omitted when null), `queryOptions + useQuery + prefetchTournamentDetail`, `staleTime: 30 * 1000`.
- **Barrel export added**: `packages/casino/src/infrastructure/index.ts` now exports `tournament-detail.service` — same precedent as `tournament-list.service` (2026-06-25).
- **`tournament/[slug]/page.tsx` updated**: async server component; `slug` parsed via `parseInt(slug, 10)`; `getIcParams()` called server-side and cast `as unknown as CasinoIcParams` to extract `lr`/`lrl`; `prefetchTournamentDetail` called; `HydrationBoundary` + `dehydrate` pattern (same as tournaments/promo pages); `<></>` placeholder for future child components.
- **`as unknown as CasinoIcParams` cast in page.tsx**: justified — `IcParamsResponse` doesn't declare `limitTournamentRoundForShow`/`limitTournamentRangListLength` but backend returns them at runtime; `CasinoIcParams` has an index signature `[key: string]: string | null | undefined`; no `any` used; documented in comment.

## 2026-06-25 — Tournament image URL construction

- **`coreDesign` added to `CasinoIcParams`**: `packages/casino/src/infrastructure/ibet/ic-params.types.ts` — field not present anywhere in codebase before; backend returns it at runtime; typed as `string | null`.
- **`getTournamentImageUrl` helper added**: `packages/casino/src/infrastructure/ibet/tournament-list.service.ts` — constructs `${NEXT_PUBLIC_CONFIG_URL}/ibet/img/${coreDesign}/icimage_${imageId}.png`; uses `process.env.NEXT_PUBLIC_CONFIG_URL` directly (avoids envService platform-detection issues on server).
- **`TournamentsList` converted to client component**: `'use client'` added — required for `useIcParams` hook; `coreDesign` extracted via `select: data => (data as unknown as CasinoIcParams).coreDesign` — cast via `unknown` documented in comment, no `any` used.
- **`backgroundImage` guard**: only constructed when `imageId !== null && coreDesign` — safe fallback to `undefined` when either is missing.

## 2026-06-25 — Tournament list server-side prefetch

- **`prefetchITournamentList` added to existing service**: `packages/casino/src/infrastructure/ibet/tournament-list.service.ts` — follows `prefetchHomePageConfig`/`prefetchPromoPages` pattern; `getQueryClient()` + `client.prefetchQuery(iTournamentListQueryOptions())` + returns `client`.
- **`getQueryClient` added to import**: from `@wh-label/shared` — already exported there, no new dependency.
- **Barrel export added**: `packages/casino/src/infrastructure/index.ts` now exports `tournament-list.service` — previous "no barrel" decision (2026-06-16) was for intra-package usage; web-shell requires an exported path via `@wh-label/casino/infrastructure`.
- **`page.tsx` updated**: `apps/web-shell/src/app/[locale]/tournaments/page.tsx` is now an async server component; uses `HydrationBoundary` + `dehydrate` pattern (same as promo page); `<></>` placeholder for future tournament components.

## 2026-06-24 — Cashout submitPrePayoutRequest implementation

- **`submitPrePayoutRequest` added to existing service**: `packages/betting/src/infrastructure/betting/ticket/ticket-prepayout.service.ts` — follows `acceptPrepayment`/`rejectPrepayment` pattern exactly; URLSearchParams body with `tuuid`, `requestUuid`, `cashoutValue`; POST `/ticket/submitPrePayoutRequest.json`.
- **New domain service file created**: `packages/betting/src/domain/services/ticket-prepayout-submit.service.ts` — `useSubmitPrePayoutRequest` hook wraps infrastructure fn with `useMutation`; follows `ticket-accept-reject.service.ts` pattern.
- **Domain import in component tolerated**: `played-ticket.tsx` (in `src/components/`) imports from `domain/services` — consistent with 18 pre-existing violations (incl. `ticket-auth-overlay.tsx`); `check-components-no-domain-imports.mjs` was already failing before this task.
- **`uuid` package used in component layer**: `import { v4 as uuid } from 'uuid'` — already hoisted in pnpm workspace via application layer; not added to package.json.

- Use audit-log for all agent actions
- coding-standards.md is authoritative
- User-command.md has higher priority than Jira

## 2026-05-07 — Codex CLI integration

- **Codex CLI replaces Private agent** for implementation in the new `jira_figma_to_code_codex.yaml` workflow.
- **Skipper acts as Codex executor** — invokes `codex --approval-mode full-auto "<step>"` per each step from skipper_plan.md.
- **Parallel execution disabled** in Codex workflow — Codex CLI needs sequential context to avoid file conflicts.
- **Melman gets extra hallucination check** — Codex may introduce unexpected code; Melman explicitly validates for this.
- **Protected path guardrail applies to Codex output** — if Codex touches /auth, /payments, /middleware.ts, /config, execution stops immediately.

## 2026-03-13 — ticket-accept-reject endpoint

- **react-hook-form excluded** when there is no form context — adding unused hook violates "clarity over cleverness" (§4). Decision: use zod-only validation.
- **Domain service may call configApi directly** when it follows existing pattern (stream.service.ts does the same). No need to create an additional infrastructure wrapper.
- **useMutation hook must be instantiated at component level**, not inside callbacks (React rules of hooks).

## 2026-05-25 — Tournament Component reduced-scope delivery

- **User-approved Option B** allows a web-shell-only implementation when full CMS/package work is out of scope.
- **Web-shell may locally override casino page rendering** by composing exported `@wh-label/casino` page data/types/components, without modifying `packages/casino`.
- **Tournament sections must fail closed** in reduced scope: if active widget/tournament payload data is missing, invalid, inactive, or insufficient, render `null` with no placeholder.
- **Banner and room-preview tournament widget behavior remains unchanged** unless web-shell already has enough safe documented payload data to override it locally.

## 2026-06-11 — Jackpot live config service

- **packages/casino modified directly** (not web-shell override) — user-command.md explicitly named `packages/casino/src/components/jackpot/jackpot/index.tsx`; the "ONLY MADE CHANGES IN WEB SHELL!" note was HTML-commented (lifted); the web-shell-override architectural decision was specific to the Tournament task only.
- **New service file created**: `packages/casino/src/infrastructure/ibet/jackpot-config.service.ts` — follows `game-detail.service.ts` pattern; uses `configApi` (ibet client), `queryOptions + useQuery`, `URLSearchParams.append` for repeated `configIds` params.
- **`JackpotConfigInfoItem` response type is a placeholder** (`configId: string` only) — must be extended once the full `getJackpotConfigInfo.json` backend contract is confirmed.
- **`jackpotConfigData` declared but not yet wired to JSX** — available for the next step; only an ESLint warning (not error) due to `onlyWarn` config.

## 2026-06-11 — Jackpot live data service

- **New service file created**: `packages/casino/src/infrastructure/ibet/jackpot-data.service.ts` — mirrors `jackpot-config.service.ts` exactly; uses `configApi`, `URLSearchParams.append` for repeated `configIds`, endpoint `jackpot/getJackpotData.json`.
- **`JackpotDataItem` response type is a placeholder** (`configId: string` only) — extend once `getJackpotData.json` backend contract is confirmed.
- **`jackpotData` available in `Jackpot` component** — declared alongside `jackpotConfigData`; not yet wired to JSX; ESLint warning only.
- **Pre-existing `as any` casts** on `jackpotConfigData` indexing in JSX (lines 153,154,188,189) were introduced by the user between sessions — flagged but not touched (out of scope).

## 2026-06-16 — Upcoming tournament list service

- **`packages/casino` modified directly** — `<!-- ONLY MADE CHANGES IN WEB SHELL! -->` is HTML-commented (lifted), same precedent as 2026-06-11 jackpot decisions.
- **New service file created**: `packages/casino/src/infrastructure/ibet/tournament-list.service.ts` — mirrors `jackpot-config.service.ts` exactly; uses `configApi`, endpoint `ibet/getITournamentList.json`, no URLSearchParams (no params, plain GET), `queryOptions + useQuery`, `staleTime: 30 * 1000`.
- **`ITournamentListItem` response type is a placeholder** (`id: string` only) — must be extended once the full `ibet/getITournamentList.json` backend contract is confirmed.
- **`'use client'` added to `index.tsx`** — required to use react-query hook; converts component from server to client component. Necessary side effect, user notified.
- **`tournamentListData` declared but not yet wired to JSX** — available for the next step; ESLint warning only (not error) per `onlyWarn` config.
- **No barrel export update needed** — jackpot services are not in the barrel; direct import pattern used (same convention).

## 2026-06-17 — Home Page Configurator (apps/wh-label-cms)

- **Payload Global + JSON field chosen** for persistence — slug `home-page-config`, single `json` field named `config` stores full HomePageConfig object. Simpler than separate collections for a single-document config.
- **Public GET endpoint**: `GET /api/globals/home-page-config` — auto-provided by Payload when `read: () => true` on the Global. No custom endpoint needed.
- **react-query conflict resolved by user**: `@tanstack/react-query` was not installed in `apps/wh-label-cms`; user explicitly chose to use existing raw `fetch()` + `useState`/`useEffect` pattern instead of installing react-query.
- **Component pattern**: follows NavigationElementsAdmin exactly — server wrapper with `AdminViewServerProps` + `DefaultTemplate`, client component with 'use client', DnD via `@dnd-kit/core` + `@dnd-kit/sortable`, `ImageUploadField` reused for banner and product link images.
- **No migration needed** — Payload manages its own globals table internally; registering the Global in `globals: [HomePageConfig]` in payload.config.ts is sufficient.
- **importMap.js auto-regenerated** by `pnpm generate:importmap` after adding the view registration.
- **TypeScript strict: zero errors** — no `any` types introduced.

- **`packages/casino` modified directly** — user-command.md explicitly states "Promene su samo u casino packages"; no web-shell restriction applies.
- **New service file created**: `packages/casino/src/infrastructure/ibet/jackpot-configs-by-groups.service.ts` — mirrors `jackpot-config.service.ts` exactly; uses `configApi`, endpoint `jackpot/getJackpotConfigsByGroups.json`, URLSearchParams with repeated `groups` param, `queryOptions + useQuery`, `enabled: groups.length > 0`, `staleTime: 30 * 1000`.
- **`JackpotConfigsByGroupsItem` response type is a placeholder** (`id: string` only) — must be extended once the full `jackpot/getJackpotConfigsByGroups.json` backend contract is confirmed.
- **`'use client'` added to `packages/casino/src/components/jackpot/index.tsx`** — required to use react-query hook; converts container component from server to client component. Necessary side effect, user notified.
- **`jackpotConfigsByGroupsData` declared with empty placeholder groups `[]`** — available for the next step; groups array must be wired to real group IDs once backend contract is confirmed. ESLint warning only (not error).
- **No barrel export update needed** — jackpot services are not in the barrel; direct import pattern used (same convention).

## 2026-06-18 — Odds Display Configurator (apps/wh-label-cms)

- **Payload Global chosen** for persistence — slug `odds-display-config`, single `json` field named `config`. Same pattern as HomePageConfig (2026-06-17).
- **Public GET endpoint**: `GET /api/globals/odds-display-config` — auto-provided by Payload when `read: () => true` on the Global. No custom endpoint code needed.
- **react-query conflict resolved**: User command said "Koristi react-query" but also "Dont install nothing new". `@tanstack/react-query` is not installed in `apps/wh-label-cms`. Consistent with 2026-06-17 decision, raw `fetch()` + `useState`/`useEffect` used. User must confirm if they want react-query installed.
- **Component pattern**: follows HomePageConfigurator exactly — server wrapper with `AdminViewServerProps` + `DefaultTemplate`, client component with `'use client'`, raw fetch, loading/error states.
- **3 fixed odds types**: `SPEC_DESK` (Spec Desc), `SPEC_MOBILE` (Spec Mobile), `TOP_VIEW_MOBILE` (Top View Mobile). No create/delete — only update + read.
- **Each item**: `type` (read-only display) + `dropdownLabel` (`'Left' | 'Top'`).
- **OddsPreviewCube**: simple inline component showing Left vs Top layout visually. User said they'll customize it.
- **importMap.js auto-regenerated** by `pnpm generate:importmap` after view registration in payload.config.ts.
- **Dashboard card was pre-existing** — `Dashboard/index.tsx` already had the link card for `/admin/odds-display-configurator` before this task.
- **TypeScript strict: zero errors** — no `any` types introduced.

## 2026-06-18 — Odds Display Config service in packages/betting

- **`packages/betting` uses split infrastructure pattern**: raw fetch fn in `infrastructure/betting/*.service.ts`, react-query hook in `infrastructure/query/betting/*.ts`, @legendapp/state store in `application/stores/*.store.ts`.
- **First cmsApi usage in packages/betting** — import via `import { cmsApi } from '@wh-label/shared'`; all existing betting services use `restApi`. Pattern confirmed working.
- **New service**: `packages/betting/src/infrastructure/betting/odds-display-config.service.ts` — types (OddsDisplayType, DropdownLabel, OddsDisplayItem, OddsDisplayConfig) + `fetchOddsDisplayConfig()` with `throwHttpErrors: false` null-safe pattern.
- **New store**: `packages/betting/src/application/stores/odds-display-config.store.ts` — `oddsDisplayConfig$` observable initialized to `null`, follows `search.store.ts` minimal pattern.
- **New query**: `packages/betting/src/infrastructure/query/betting/odds-display-config.ts` — `oddsDisplayConfigQueryOptions()` (staleTime 30s) + `useOddsDisplayConfigQuery()` which syncs data to `oddsDisplayConfig$` via `useEffect`.
- **Store exported via barrel**: `application/stores/index.ts` — `export * from './odds-display-config.store'` added.
- **Usage pattern**: call `useOddsDisplayConfigQuery()` in a layout/root client component to trigger initial fetch; read `oddsDisplayConfig$.get()` or use `use$`/`useValue` from any other component.

## 2026-06-22 — Sportsbook Configurator (apps/wh-label-cms)

- **Payload Global chosen** for persistence — slug `sportsbook-config`, single `json` field named `config`. Same pattern as HomePageConfig (2026-06-17) and OddsDisplayConfig (2026-06-18).
- **Public GET endpoint**: `GET /api/globals/sportsbook-config` — auto-provided by Payload when `read: () => true`. No custom endpoint needed.
- **react-query NOT used** — consistent with 2026-06-17 and 2026-06-18 decisions; `@tanstack/react-query` is not installed in `apps/wh-label-cms`. Raw `fetch()` + `useState`/`useEffect` used.
- **Component pattern**: follows OddsDisplayConfigurator exactly — server wrapper with `AdminViewServerProps` + `DefaultTemplate`, client component with `'use client'`, raw fetch, loading/error states, no tabs, no DnD.
- **2-column grid layout**: `grid grid-cols-1 lg:grid-cols-2` — left column has 5 cards (Cashout, Express Ticket, Default Theme, Swipe Gesture, More Games); right column has Top View Filters grouped in one card.
- **Conditional leagueSortType field**: rendered only when `config.topViewFilters.defaultSorting === 'LEAGUE'`; stored as `LeagueSortType | null` in TypeScript types.
- **importMap.js auto-regenerated** by `pnpm generate:importmap` after adding the view registration in payload.config.ts.
- **TypeScript strict: zero errors** — no `any` types introduced.
- **Dashboard card added**: 5th card using `BarChart2` icon from lucide-react.

## 2026-09-30 — Mobile banner-carousel/v1 jackpot contract

- Mobile `banner-carousel/v1` reads carousel settings from nested `options`, including `options.autoplayIntervalSeconds`; media slides use `mediaUrl` with `contentType`.
- Enabled widget-only `jackpot/v1` slides must be retained without media. `dualsoft` follows the standard jackpot path, and `widget.config.levelConfigs` maps to root `tiers`.
- Every carousel page uses a consistent height of at least `320`; `backgroundStyle: 'image'` is a mode and must not be applied as a color.
- Video playback remains unsupported until a dependency is explicitly approved; no video package is added implicitly.

## 2026-10-27 — Mobile device persistence architecture

- Bet-slip selections are device-global and stored as versioned, strictly validated AsyncStorage records with bounded hydration, revision protection, and queued writes.
- Theme persistence keeps and hardens the existing override key and startup gate; storage failures remain nonfatal.
- Tolgee language uses versioned AsyncStorage validated against shared `ALL_LANGUAGES`; missing or invalid data falls back through Tolgee `getLanguage()`, and keyed provider ownership gives each configuration a disposable fallback lifecycle plus one fresh final initialization.
- Authentication and logout scoping remain unchanged; persistence is not account-scoped.
- No new dependencies were introduced.

## 2026-11-02 — Telegram-only notifier supersedes legacy transport guidance

- Task-specific Skipper approval: `/tmp/penguins/skipper_decision.md`; implementation plan: `/tmp/penguins/kowalski_plan.md`. Exactly nine files plus scratch authorized; unrelated odds-toggle inputs are not task authority.
- Telegram is the sole notifier transport. `PENGUINS_NOTIFY_PROVIDER` and `PENGUINS_NTFY_*` settings are no longer read; there is no fallback. Missing Telegram credentials and delivery failures produce nonfatal failed evidence, not confirmed sends or blocker lifecycle transitions.
- This supersedes earlier transport/workaround guidance, not historical delivery records. Do not blank Telegram credentials to activate another transport or edit credentials for this cleanup.
- Session restrictions override local notification permission, including the earlier mandatory-notifier decision: no live sends, bot launch, or completion notification in this session. Record `not_attempted` with its reason rather than reusing historical evidence.
- Actual implementation checks: syntax check and 48 isolated offline regression cases passed; independent Melman validation is pending. Live Telegram delivery remains unverified. No dependencies or credential files changed.

## 2026-11-03 - Casino keyboard screen ownership and static-only acceptance

- Supplied Skipper ACCEPTED_STATIC follows independent Melman PASS_STATIC for the expanded MEDIUM casino/lobby keyboard cycle, with bounded planning fallback rather than a completed Kowalski-subagent run. Mechanical finalization does not issue another verdict or assert model identity. Audit: audit/2026-11-03.json and memory/audit-log.md.
- User approved both screen files beyond initial search-only scope and confirmed BOTH platforms via question tool, as supplied. Only casino.screen.tsx and casino-lobby.screen.tsx changed; search-input.tsx unchanged. Scope claims concern the introduced patch, not a worktree audit; old BLOCKED history remains intact.
- Screen ScrollViews own native iOS automatic keyboard insets and Android viewport-only reveal under documented Expo resize ownership. No duplicate KeyboardAvoidingView/padding, global provider/window changes, guessed offsets, or dependency additions. Measured reveal uses current local focus, minimal overflow and stale-measurement/unmount/blur/user-scroll guards; drag suppresses reveal until next local focus.
- Installed RN same-key-window evidence bounds coordinate comparison to normal full-window deployment and native TextInput bounds. Android actual resize remains unknown; short content/iOS viewport mount with IME already open may lack scroll range/insets, cached metrics may be stale, and async/native scroll can invalidate correction. No floating/split/multiwindow/whole-row or runtime/StrictMode certification.
- Device validation of these boundaries remains separately required. Future Android native/window/config changes require separate evidence and explicit approval; do not silently stack avoidance or generalize this scoped static acceptance. Notifications not_attempted under session restriction; no historical delivery reused.

## 2026-11-03 - Explicit auto-workflow invocations always start fresh

- User instruction: every explicit `/auto-workflow` or `/auto-worklfow` invocation starts a fresh cycle with fresh classification, discovery, plan and approval as required by the selected workflow and agent prerequisites. Use unique run artifacts; shared scratch and historical plans/approvals/reports/outcomes are not current authority merely because their paths exist.
- Fresh workflow means fresh evidence/authorization, not erasing source work. Preserve user/concurrent source work and audit/history; never reset the worktree, revert unrelated changes or rewrite historical verdicts to manufacture a clean start.
- Resolve tooling limits against actual runtime capabilities. Use bounded capable helpers when needed; faithfully attribute inline plans/verdicts and executed evidence. Never invent tools/model identities or bypass safety, scope or approval requirements.
- Applied to fresh MEDIUM favorites run `rico-20261103-104010`: supplementary Kowalski inline plan and task-specific Skipper approval preceded one-file filters-section.tsx patch; independent runner assist enabled Melman evidence review on one retry despite reviewer shell/writer limits. Supplied PASS_STATIC/ACCEPTED_STATIC mechanically recorded, not new writer verdicts. Audit: audit/2026-11-03.json and memory/audit-log.md.
- Notifications not_attempted under session prohibition, no historical delivery reuse. Static acceptance is not clean typecheck, device/runtime/React lifecycle or real-cache certification.

## 2026-11-03 - Mobile balance bridge fallback and static-only acceptance

- Run `rico-20261103-111658-11664`: supplied Melman PASS_STATIC and Skipper inline ACCEPTED_STATIC mechanically persisted, not new writer verdicts. Specialized planner failed twice solely for writer absence; general-agent bounded fallback plan and task-specific approval authorized one hunk only. Stale reviewer favorites path was rejected before current inline retry review; runner execution and reviewer judgment remain separately attributed.
- Scope: one `injectedJavaScript={MESSAGE_BRIDGE_SCRIPT}` prop at mobile game.tsx:593 adds document-end fallback while retaining early injection and idempotence. Preserve parser (including blank/whitespace-to-zero), mode, cache/updater, auth/financial/API behavior; no polling/refetch, package or protected-area changes authorized. Web remains byte-equal to run baseline. No permission to generalize to other providers/screens.
- Evidence: 83 actual-source offline cases with installed real QueryClient and disabled offline QueryObserver, not mounted UI; original and independent runner outputs match. TS 82 diagnostics each and ESLint 16 errors/one warning each, zero introduced, not clean checks. Acceptance is scoped to reviewed patch and supplied baselines, never whole-worktree certification.
- Root cause remains unconfirmed. Native/device/provider/frame/payload timing, navigation/fullscreen, React lifecycle/enabled observers and in-flight overwrite need separately authorized evidence. Late fallback cannot recover prior missed messages. This is not a universal runtime diagnosis or certified device repair.
- Current canonical/run-local reports identify this run; prior canonical favorites report archived unchanged as historical only. Earlier events and source work preserved. Audit: audit/2026-11-03.json and memory/audit-log.md. Notifications not_attempted under session prohibition despite Task request; no notifier or historical delivery reuse. No workflow/config changes required.

## 2026-11-04 - Odds toggle consumer-local selection and static boundary

- Run odds-toggle-20261104-02: supplied Melman PASS_STATIC and Skipper ACCEPTED_STATIC, mechanically finalized, not a new finalizer verdict. User's 'resi blokere' authorized exactly the mobile odds-toggle.tsx and mobile offer/mobile-boosted-odds-matches.tsx introduced patch; web reference and hook files remain outside write scope.
- Consumer owns per-sport requested IDs because parent MOBILE_PREMATCH_TOP selection cannot represent MOBILE_BONUS_TIP groups. Controlled header and rows share the effective group/list; validate ID 0 explicitly. Preserve parent/first and existing any-match availability fallbacks; retain requests through collapse/refresh/temporary removal, reset on consumer unmount. This task-specific decision does not authorize unrelated state or availability changes.
- Private's 21 mocked offline cases, unchanged full failing TS logs and three unchanged lint warnings, supplied independent source review and earlier writer integrity recomputation support static-only acceptance. No device/runtime/React lifecycle/real-payload/whole-worktree certification; separate missing-odds diagnosis remains unresolved. Audit: audit/2026-11-04.json and memory/audit-log.md. Fresh authorized completion notification: sent via Telegram, HTTP 200, 2026-11-04T09:45:52.714Z; API acceptance, not device receipt.

## 2026-11-04 - Status-wording administrative delivery accepted statically

- Run status-wording-20261104: supplied Skipper ACCEPTED_STATIC follows supplied independent Melman PASS_STATIC, mechanically persisted without a new writer verdict. Review covered six instruction sources/diff, eight-event mapping, successful-validation gate, intended YAML nesting and unchanged controls; no issues reported. Private's 66 offline checks passed; reviewer did not rerun them.
- This closes only the administrative wording task at static scope. No live agent behavior, whole-worktree certification or Android stake fix is claimed. Android stake issue remains unresolved; no application work authorized by finalization.
- Fresh authorized workflow_complete notification sent via existing notifier, Telegram HTTP 200, 2026-11-04T14:17:57.173Z, notifications.jsonl line 13. Message explicitly separates administrative completion from unresolved Android issue. API acceptance is not device receipt. Prior pending/blocker history retained; report: /tmp/penguins/status-wording-20261104/finalization.md.

## 2026-11-05 - Optimization instruction routing accepted statically

- Supplied Skipper memory decision, mechanically persisted by Private for optimize-20261105-01/correction-01; no new writer decision.
- 2026-11-05: Inline structured current-run report authority with optional authorized verified persistence; SMALL bounded Skipper plan/approval+independent validation, MEDIUM single refactor chain, high-risk/LARGE mandatory gates; direct available specialist dispatch, disjoint independent Private-2 ownership. Run optimize-20261105-01 static acceptance only; models/security/depth unchanged.
- Supplied Melman PASS_STATIC and Skipper ACCEPTED_STATIC resolve M1/M2 only; not all six-phase objectives complete. Effective permissions/built-ins/live routing and speedup unverified; no external/service bypass or whole-worktree certification.
- Report: /tmp/penguins/optimize-20261105-01/finalization.md. Current blocker_resolved notification sent via Telegram HTTP 200 at 2026-11-05T15:12:26.951Z; /tmp/penguins/notifications.jsonl line 6. API acceptance, not device receipt; not workflow_complete.

## 2026-11-05 - Finalization wording mapping accepted statically

- Supplied Skipper mapping decision, mechanically persisted by Private; historical mappings retained unchanged.
- wording-20261105-02: Melman PASS_STATIC independently reviewed six current files/diff/snapshots/checker/results; Private 56 offline checks, reviewer did not rerun. Six blocker_resolved mappings now Blocker je razrešen.; canonical DONE clarification restricts scope claims and distinguishes static acceptance/unverified runtime. All other mappings/security/completion gates unchanged in scoped patch. Skipper ACCEPTED_STATIC; bounded wording task workflow_complete, not completion of prior six-phase optimization/runtime audit. No live loaded-session guarantee. Author verdicts retained; writer mechanical only.
- Report: /tmp/penguins/wording-20261105-02/finalization.md.

## 2026-11-05 - Mandatory triad routing accepted statically

- Supplied Skipper decision, mechanically persisted by Private for integrate-agents-20261105-01/stage1+stage2 correction01; not a new writer verdict. ACCEPTED_STATIC / workflow_complete after supplied independent review and final Melman PASS_STATIC. Historical stage2 failure retained.
- Mort/Nana/Julien mandatory every cycle, including SMALL and direct routes; preflight actual exposed roles. Mort supplies current ready packets before handoffs, reuses only current applicable packets and refreshes on material changes. Direct inline handoffs avoid nested depth-limit retrieval.
- Nana preapproval requires exact immutable reviewed plan identity; changed plan requires re-audit before approval. Postdiff requires actual introduced/supplied diff and approved scope. Missing/stale/mismatched evidence blocks; CAUTION requires explicit Skipper disposition.
- Julien current report mandatory; insufficient_data nonblocking ONLY for performance, reported unmeasured with no speedup claims. Delegated target owns triad once; no router duplication. Legacy global commands point to current routes; stage1 read-only V2 model/body preserved.
- Supplied correction Maurice/Melman-ts/final Melman PASS_STATIC and explicit Skipper Nana PRE/POST CAUTION disposition support administrative static acceptance only. No runtime/effective-dispatch/performance/application certification; unrelated accordion/virtualizer input Task not performed.
- Report: /tmp/penguins/integrate-agents-20261105-01/finalization.md. Current completion notification sent via Telegram HTTP 200 at 2026-11-05T18:13:13.540Z; API acceptance, not device receipt.
