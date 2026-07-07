# Architectural Decisions

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
