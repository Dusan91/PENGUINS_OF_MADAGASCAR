# Audit Log

## 2026-06-26 — tiered (medium) — Tournaments Configurator in CMS

- Status: SUCCESS
- Model: github-copilot/claude-sonnet-4.6
- Tier: MEDIUM (2-5 files, no Figma, no Jira)
- Workflow steps executed:
  - Rico quick discovery completed: `/tmp/penguins/rico_findings.md`
  - Private implementation completed: `/tmp/penguins/private_diff.md`
  - Melman validation: APPROVED (Skipper direct review substituted due to stale cache)
- Skipper decisions:
  - react-query NOT used in CMS (not installed; consistent with 2026-06-17/18/22 decisions)
  - configApi NOT used in CMS (envService throws at module load); direct fetch() used
  - NEXT_PUBLIC_CONFIG_URL must be added to apps/wh-label-cms/.env
- Files created:
  - `apps/wh-label-cms/src/globals/TournamentConfig.ts`
  - `apps/wh-label-cms/src/components/CasinoConfigurator/index.tsx`
  - `apps/wh-label-cms/src/components/CasinoConfigurator/CasinoConfiguratorClient.tsx`
- Files modified:
  - `apps/wh-label-cms/src/globals/index.ts`
  - `apps/wh-label-cms/src/payload.config.ts`
  - `apps/wh-label-cms/src/app/(payload)/admin/importMap.js`
- Protected areas touched: NONE
- New npm dependencies: NONE
- Commits made: NONE (per user instruction "DONT COMMIT")

## 2026-05-25 — jira_figma_to_code_v2 — Tournament Component (Reduced Scope Option B)

- Status: SUCCESS (reduced-scope delivery)
- Model: github-copilot/gpt-5.4
- Fallback used: false
- Figma: MCP lookup attempted for node `11380:8339`, but design context was unavailable because the node/file was not active in Figma desktop.
- Workflow steps executed:
  - Rico discovery completed: `/tmp/penguins/rico_findings.md`
  - Kowalski analysis completed: `/tmp/penguins/kowalski_analysis.md`
  - Skipper approval completed: approved reduced-scope Option B (web-shell only)
  - Private implementation completed: `/tmp/penguins/private_diff.md`
  - Melman validation completed: PASS
- Scope decision:
  - Only `apps/web-shell` was allowed to change.
  - `apps/wh-label-cms` and `packages/**` remained out of scope.
- Files changed:
  - `apps/web-shell/src/app/[locale]/casino/_components/local-casino-page-heading.tsx`
  - `apps/web-shell/src/app/[locale]/casino/_components/local-casino-page-skeleton.tsx`
  - `apps/web-shell/src/app/[locale]/casino/_components/local-casino-tournament-section.tsx`
  - `apps/web-shell/src/app/[locale]/casino/_components/local-casino-section-renderer.tsx`
  - `apps/web-shell/src/app/[locale]/casino/_components/local-casino-page-renderer.tsx`
  - `apps/web-shell/src/app/[locale]/casino/_components/local-casino-responsive-lobby-renderer.tsx`
  - `apps/web-shell/src/app/[locale]/casino/casino-lobby-route.tsx`
  - `apps/web-shell/src/app/[locale]/casino/[lobbyGroup]/room/[roomId]/page.tsx`
- Compliance:
  - No new libraries added
  - No commits made
  - No protected areas changed
  - No auth/payments/middleware/env/CI/CD/database changes
  - No API contract changes
- Delivery limitation:
  - Tournament rendering works only when the existing normalized payload already includes active/enabled widget data with `schemaVersion: 'tournament/v1'` and sufficient tournament fields.
  - Banner and room-preview widget fallback behavior remained unchanged in this reduced-scope run.

## 2026-06-16 — tiered (MEDIUM) — Upcoming tournament list service

- Status: SUCCESS
- Model: github-copilot/claude-sonnet-4.6
- Fallback used: false
- Workflow: tiered.yaml → MEDIUM tier (rico_quick → private_medium → melman_medium)
- Jira: empty | Figma: empty | Source: user-command.md only
- Tier classification: MEDIUM (2 files: 1 new service + 1 component modification; no Figma, no Jira)
- Workflow steps executed:
  - Tier classification: MEDIUM
  - Rico discovery completed: `/tmp/penguins/rico_findings.md`
  - Private implementation completed: `/tmp/penguins/private_diff.md`
  - Melman validation completed: ✅ APPROVED (15/15 checks passed)
- Files changed:
  - `packages/casino/src/infrastructure/ibet/tournament-list.service.ts` (CREATED)
  - `packages/casino/src/components/upcoming-tournament/index.tsx` (MODIFIED — added `'use client'`, service import, hook call)
- Skipper decisions:
  - `<!-- ONLY MADE CHANGES IN WEB SHELL! -->` HTML-commented = lifted (same precedent as 2026-06-11)
  - `<!-- zod i react-form-hooks -->` HTML-commented = excluded (react-query only)
  - `'use client'` addition to index.tsx approved as necessary side effect
- Compliance:
  - No new libraries added
  - No commits made
  - No protected areas changed
  - No auth/payments/middleware/env/CI/CD/database changes
  - No other packages touched
  - All TypeScript errors are pre-existing TS6305 monorepo dist-not-built errors
- Warnings carried forward:
  - `tournamentListData` not yet wired to JSX (pending backend type confirmation)
  - `ITournamentListItem` is a placeholder (`id: string` only)

## 2026-06-16 — tiered (MEDIUM) — Jackpot configs-by-groups service

- Status: SUCCESS
- Model: github-copilot/claude-sonnet-4.6
- Fallback used: false
- Workflow: tiered.yaml → MEDIUM tier (rico_quick → private_medium → melman_medium)
- Jira: empty | Figma: empty | Source: user-command.md only
- Tier classification: MEDIUM (2 files: 1 new service + 1 component modification; no Figma, no Jira)
- Workflow steps executed:
  - Tier classification: MEDIUM
  - Rico discovery completed inline (jackpot/index.tsx, jackpot/jackpot/index.tsx, all ibet services, domain types)
  - Private implementation completed
  - Melman validation completed: ✅ APPROVED (15/15 checks passed)
- Files changed:
  - `packages/casino/src/infrastructure/ibet/jackpot-configs-by-groups.service.ts` (CREATED)
  - `packages/casino/src/components/jackpot/index.tsx` (MODIFIED — added `'use client'`, service import, hook call)
- Skipper decisions:
  - "Promene su samo u casino packages" — confirms `packages/casino` is the direct target
  - `'use client'` addition to `jackpot/index.tsx` approved as necessary side effect
  - `useJackpotConfigsByGroups([])` called with empty placeholder array — groups must be wired to real IDs once backend contract confirmed
- Compliance:
  - No new libraries added
  - No commits made
  - No protected areas changed
  - No auth/payments/middleware/env/CI/CD/database changes
  - No other packages touched
  - Single TS6305 on new service file is pre-existing monorepo dist-not-built pattern
- Warnings carried forward:
  - `jackpotConfigsByGroupsData` not yet wired to JSX (pending backend type confirmation)
  - `JackpotConfigsByGroupsItem` is a placeholder (`id: string` only)
  - Groups array `[]` is a placeholder — real group IDs must be sourced once contract confirmed

## 2026-10-07 — Emergency implementation — Jackpot winners casino migration

- Status: SUCCESS
- Model: github-copilot/gpt-5.6-sol (emergency implementer; Private unavailable)
- Source: user-command.md plus explicit emergency migration command; Jira and Figma empty
- Changes: moved both jackpot-winners components from web-shell to `packages/casino`, extracted the React Query service, added public component/infrastructure exports, redirected the home-page import, and deleted the old feature files
- Modal fixes: valid dialog semantics; controlled `(open: boolean) => void` state assignment; custom close explicitly sets false
- Locale: package Tolgee convention; no Next route coupling
- Validation: focused grep/read and scoped `git diff --check` passed; full lint/typecheck intentionally not run
- Compliance: no dependencies, protected areas, API transformations, unrelated cleanup, browser/network access, or git writes
- Artifact: `/tmp/penguins/private_diff.md`
- Notification: sent via Telegram (`workflow_complete`, `/tmp/penguins/notifications.jsonl` latest entry)

## 2026-10-07 — tiered (LARGE/Figma) — Gift card visual alignment

- Status: SUCCESS
- Model: github-copilot/gpt-5.6-sol
- Source: `user-command.md` plus Figma node `12:9089`; Jira empty
- Tier: LARGE because Figma notes were present; low-cost execution retained one-file scope
- Changed: `apps/web-shell/src/components/profile/gifts/gift-card.tsx`
- Implementation: replaced the image tile with the measured responsive text-first card, 48px gift icon, status pill, date/action column, mobile divider, and 128x40 activation action
- Behavior: existing card click, activation call, translation use, status union, and API/domain contracts preserved
- Validation: Melman PASS after rejecting one stale unrelated report and correcting non-functional bonus controls; focused read/grep only per command
- Compliance: no dependencies, protected paths, business logic, API contracts, env, CI/CD, migrations, or git writes
- Notification: sent via Telegram (`workflow_complete`; latest `/tmp/penguins/notifications.jsonl` entry at `2026-10-07T11:19:50.511Z`)

## 2026-10-09 — Local WH stack alignment

- `bet-admin-web` `.env` auth URL changed to `localhost:8081`.
- `user-management` `.env` created for port `8081`, `bet-admin`, local cookies, local config import, and bootstrap.
- `wh-cms-backend` `.env` uses a matching local internal token, port `8083`, `wh-admin`, and JWKS on `8081`; no tokens or secrets are recorded here.
- `runtime-config.ts` was not changed because environment overrides are sufficient.
- MongoDB, user-management, backend, and frontend started on ports `27017`, `8081`, `8083`, and `3000` respectively.
- Health, JWKS, and CORS checks returned `200`; the unauthenticated registration endpoint returned the expected `401`.
- Local databases are empty and bootstrap is allowed; manual action with a real Dualsoft subject is still required.
- No auth bypass or source auth modification was made; existing dirty source changes were preserved.

## 2026-10-09 — Local BFF setup

- `wh-cms-bff-service` `.env` created for port `8084`, tenant `wh-admin`, and local CORS; no secrets are recorded here.
- `web-shell` `.env` set `WEB_SHELL_PRERENDER=false`, `BET_ADMIN_TENANT_KEY=test`, and `WH_CMS_BFF_API=http://localhost:8084`.
- BFF domain, response, and mapper extended with nullable `value` and `text`; an integration test was added.
- Focused `WhRegistrationConfigBffIntegrationTest` passed.
- BFF health/readiness and tenant test registration/themes checks returned `200`.
- `web-shell` restarted on port `3001`; `/api/registration-config` returned `200` with `value` and `text`.
- Multiple text/link duplicate support remains out of scope.
- No migration, dependency, auth bypass, or git write was made.
- `GlobalAppConfig` warning was observed and is unrelated to registration.
