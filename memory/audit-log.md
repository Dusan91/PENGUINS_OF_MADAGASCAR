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

## 2026-10-19 — Mobile Tolgee prerequisites blocker

- Status: BLOCKED; requires explicit approval for Tolgee dependencies and client-public translation config, plus confirmation of the runtime project ID.
- Notification: sent via Telegram (`blocked`, HTTP 200, blocker `mobile-tolgee-prerequisites`; `/tmp/penguins/notifications.jsonl` at `2026-10-19T13:30:46.399Z`).
- Evidence: `/tmp/penguins/private_diff.md`; no application changes or git commands.

## 2026-10-20 — tiered (LARGE) — Mobile Tolgee migration blocked

- Status: BLOCKED at Skipper approval; Private implementation and Melman validation were not started.
- Model: github-copilot/gpt-5.6-sol; Kowalski fallback: general specialist after two file-writing failures.
- Source: user-command.md; Jira and Figma inputs empty.
- Discovery: existing mobile Tolgee provider/dependencies found, but provider is skipped without `translationServiceUrl`; `app.json` supplies no such runtime value.
- Decision: REJECTED pending explicit approval for client-public mobile Tolgee runtime configuration and confirmation of service URL plus tenant namespace/project mapping, or instruction to deliver inventory/report only.
- Application changes: NONE. No dependencies, protected paths, auth/API/env/CI/migrations, browser/network access, or git writes.
- Artifacts: `/tmp/penguins/rico_findings.md`, `/tmp/penguins/kowalski_analysis.md`, `/tmp/penguins/skipper_decision.md`, `/tmp/penguins/skipper_plan.md`.
- Notification: blocker event `mobile-tolgee-runtime-config` sent via Telegram (HTTP 200; latest status `sent`).

## 2026-10-20 — tiered (LARGE) — Mobile Tolgee migration validation failed

- Status: FAIL; workflow stopped after validation and was not finalized.
- User clarification resolved runtime-config blocker: Tolgee service/config activation remained out of scope; local `apps/web-shell/translations` was authorized as read-only key reference.
- Inventory: 772 user-facing rows; 448 non-null keys, of which 445 had both namespace+key; generated report: 345 true, 427 false.
- Implementation declared 75 authorized source files plus `apps/mobile-shell/tolgee-translation-report.json`; no dependencies/runtime config/protected areas were intentionally changed.
- Validation blockers: incorrect duplicate-occurrence true attribution in profile navbar and verification page; translated-value comparison regression in verification-page document mapping; safely applicable matched rows skipped; punctuation/spacing regressions.
- Original Melman returned stale unrelated PASS twice; rejected. Fallback recovery validator produced the evidence-based FAIL report at `/tmp/penguins/melman_report.md`.
- Notification: `validation_failed` sent via Telegram (HTTP 200; latest status `sent`).
- Required next action: correct implementation and report, then rerun validation before finalization.

## 2026-10-20 — tiered (LARGE) — Mobile Tolgee translation implementation completed

- Status: SUCCESS; correction passes resolved duplicate attribution, verification mapping, skipped matched rows, punctuation/spacing, and report booleans.
- Deliverable: `apps/mobile-shell/tolgee-translation-report.json` with 772 rows (352 implemented, 420 not implemented, 93 remaining matched false).
- Validation: PASS via evidence-based recovery validator; focused grep/read only per user, with no full lint/typecheck/tests/runtime/browser/network/git commands.
- Compliance: no Tolgee runtime/config/dependency, web-shell/packages, protected/auth/API/CI/migration, package, or git-write changes.
- Artifacts: `/tmp/penguins/rico_findings.md`, `/tmp/penguins/kowalski_analysis.md`, `/tmp/penguins/skipper_plan.md`, `/tmp/penguins/private_diff.md`, `/tmp/penguins/melman_report.md`.
- Notification: `workflow_complete` sent via Telegram (HTTP 200 at `2026-10-20T08:05:11.203Z`).

## 2026-10-20 — Mobile Tolgee filtered replacement follow-up

- Status: SUCCESS; compared 420 filtered records, with 79 matches.
- Replacements: safely replaced 10 matches (8 exact, 2 normalized) and generated `/Users/dusanmilenkovic/Documents/mobile-shell-translations-unreplaced.json` with 410 records.
- Skips: 69 matched records were justified by module-scope, utility, ambiguity, or punctuation constraints.
- Correction: fixed the providers-list hook-order defect.
- Validation: PASS via final focused grep/read; no full lint, typecheck, or tests were run.
- Compliance: no config, provider, env, dependency, web translation, protected-area, or git changes.

## 2026-10-20 — Mobile Tolgee reconciliation follow-up

- Status: SUCCESS; all 410 records reconciled: 388 newly wired, 18 already wired, 4 technical tokens excluded, and 0 blocked.
- Resources: 363 EN/SR keys across 8 namespaces, with zero missing, extra, empty, or placeholder mismatches; remote Tolgee resync remains required for `profile.withdrawal.cash.success-message` and `betting.ticket.value-n-value` after the user's import.
- Validation: PASS (`/tmp/penguins/melman_report.md`, `/tmp/penguins/mobile_tolgee_final_report.json`); 118 affected TS/TSX files parsed with zero diagnostics, 143 legal hooks, and 676 resolved translator calls.
- Compliance: no full lint/typecheck/tests/browser/network/git writes and no provider/env/dependency/web-shell/packages/protected/API/CI/migration changes; utility/domain boundaries remain hooks-free and backend precedence is preserved.

## 2026-10-22 — tiered (SMALL) — Mobile casino menu validation blocked

- Status: BLOCKED; Rico discovery and Private implementation completed, but Melman validation is FAIL.
- Exact blocker: Mobile casino menu validation failed: icon lookup needs runtime key validation.
- Evidence note: `/tmp/penguins/melman_report.md` contains a stale unrelated Mobile Tolgee PASS and does not validate the current menu change.
- Private artifact: `/tmp/penguins/private_diff.md` records the mobile casino menu implementation.
- Protected changes: NONE.
- Required follow-up: Harden the icon-map lookup, then rerun validation.

## 2026-10-22 — tiered (MEDIUM) — Mobile home/signup scope blocked

- Status: BLOCKED after Rico discovery; Private implementation and Melman validation were not run.
- Exact scope conflict: implementation is requested in `apps/mobile-shell`, but the authorized source paths list only `apps/web-shell/src/app/[locale]/page.tsx` and `apps/web-shell/src/app/[locale]/signup/page.tsx`; explicit permission to discover and modify the required mobile-shell route and feature files is missing.
- Source changes: NONE. No application source changes or git commands were made.
- Evidence: `/tmp/penguins/rico_findings.md`.
- Notification: blocker `mobile-home-scope` sent via Telegram (HTTP 200 at `2026-10-22T10:03:12.560Z`; latest status `sent`).
- Required follow-up: Authorize discovery and modification of the required mobile-shell route and feature files.

## 2026-10-22 — tiered (LARGE) — Native Home/Signup approval rejected

- Status: BLOCKED at Skipper approval; large workflow rerouted to stop before Private implementation.
- Discovery and analysis completed: `/tmp/penguins/rico_findings.md` and `/tmp/penguins/kowalski_analysis.md`.
- Decision: REJECTED. Home is feasible using existing CMS BFF conventions, but Signup parity requires protected auth changes and unconfirmed registration contracts; Jira is empty, so guardrails exception conditions are not met.
- Authorized source files: NONE. Private execution prohibited; no source changes or git commands were made.
- Artifacts: `/tmp/penguins/skipper_decision.md`, `/tmp/penguins/skipper_plan.md`.
- Notification: blocker event `mobile-signup-auth-contract` sent via Telegram (HTTP 200 at `2026-10-22T10:09:09.313Z`; latest status `sent`).
- Resume condition: choose Home-only delivery or provide an explicit Jira registration contract and protected-area authorization.

## 2026-10-22 — Registration Jira authorization blocker

- Status: BLOCKED. Direct user/Skipper approval received, but `rules/guardrails.md` also requires Jira to explicitly require auth changes; `inputs/jira-task.md` is empty and registration behavior/contracts are missing.
- Source changes: NONE. No authoritative inputs were modified and no git commands were run.
- Notification: blocker `registration-jira-authorization` sent via Telegram (HTTP 200 at `2026-10-22T10:31:54.051Z`; latest status `sent`).
- Required follow-up: Populate `jira-task.md` with registration behavior and confirmed contracts, then rerun the workflow.

## 2026-10-22 — Casino lobby HTTP 400 runtime payload blocker

- Status: BLOCKED after diagnostic-only Melman PASS; safe diagnostics are persisted in `/tmp/penguins/melman_report.md`.
- Remaining blocker: capture one structured `Casino BFF request failed` runtime log to determine whether the BFF rejects the tenant, resolved key, or payload.
- Application source changes during this task: NONE. No Git commands were run.
- Notification: blocker `casino-lobby-400-payload` sent via Telegram (HTTP 200 at `2026-10-22T12:27:28.497Z`; latest status `sent`).

## 2026-10-27 — tiered (MEDIUM) — Room preview background mapper scope blocked

- Status: BLOCKED after Rico discovery; Private implementation and Melman validation were not started.
- Exact blocker: room-preview background rendering already exists, but the upstream room-preview mapper and `CasinoRoomPreviewConfig` type required to supply the image are outside authorized scope.
- Source changes: NONE. No application source changes or git commands were made.
- Artifact: `/tmp/penguins/rico_findings.md`.
- Notification: blocker `room-preview-background-mapper-scope` sent via Telegram (HTTP 200 at `2026-10-27T08:25:57.408Z`; status `sent`, provider `telegram`; evidence: `/tmp/penguins/notifications.jsonl`).

## 2026-10-27 — tiered (MEDIUM) — Room preview background mapping validation failed

- Status: FAIL; workflow stopped after Melman validation.
- Rico discovery complete: `/tmp/penguins/rico_findings.md`.
- Private implementation: `apps/mobile-shell/src/features/casino/infrastructure/casino-page-mapper.ts`; artifact: `/tmp/penguins/private_diff.md`.
- Melman FAIL: image mode is inferred from an unknown source before `asString` normalization, allowing `{ mode: 'image', image: undefined }`; report: `/tmp/penguins/melman_report.md`.
- Required correction: normalize the selected image source with `asString` first and infer image mode only from the resulting non-empty string.
- Compliance: no unrelated, protected-area, dependency, API-contract, layering, or git changes.
- Notification: `validation_failed` sent via Telegram (HTTP 200 at `2026-10-27T08:42:54.570Z`; latest status `sent`, provider `telegram`; evidence: `/tmp/penguins/notifications.jsonl`).

## 2026-10-27 — tiered (LARGE) — Mobile device persistence validation failed

- Status: FAIL; discovery, analysis, approval, and execution completed; Melman retry failed and the workflow stopped before finalization.
- Execution scope: seven authorized application files recorded in `/tmp/penguins/private_diff.md`.
- Exact blocker: `ticket-selection.context.tsx` sets hydration complete before its separate persistence effect subscribes, so an early interactive mutation can be missed; no immediate post-hydration write closes the gap.
- Required correction: attach persistence before interactive render or provide an equivalent ordering guarantee.
- Artifacts: `/tmp/penguins/rico_findings.md`, `/tmp/penguins/kowalski_analysis.md`, `/tmp/penguins/skipper_plan.md`, `/tmp/penguins/private_diff.md`, `/tmp/penguins/melman_report.md`.
- Compliance: no protected-area, dependency, API-contract, environment, CI/CD, migration, or git changes; no guardrail, unauthorized-change, or new `any` evidence found.
- Validation: focused read/grep only; tests were not run.
- Notification: `validation_failed` sent via Telegram (HTTP 200 at `2026-10-27T09:30:09.839Z`; latest status `sent`, provider `telegram`; evidence: `/tmp/penguins/notifications.jsonl`).

## 2026-10-27 — tiered (LARGE) — Mobile device persistence validation-failed follow-up

- Status: FAIL; workflow remains stopped after focused Melman validation.
- Prior race fixed: persistence now subscribes before the ticket hydration gate opens, with Strict Mode-safe cleanup.
- Remaining blockers: `ticket-selection.context.tsx` storage read has no timeout and can gate forever; `tolgee/provider.tsx` language read has no timeout and can gate forever.
- Required correction: bounded timeout fallbacks to empty selected tips and `DEFAULT_LANGUAGE`.
- Evidence: `/tmp/penguins/melman_report.md`; focused read/grep only, with no guardrail, unauthorized-change, or TypeScript failure evidence.
- Compliance: no new protected-area, dependency, API-contract, environment, CI/CD, migration, application-source, or git changes.
- Notification: `validation_failed` sent via Telegram (HTTP 200 at `2026-10-27T09:35:18.282Z`; latest status `sent`, provider `telegram`; evidence: `/tmp/penguins/notifications.jsonl`).

## 2026-10-27 — tiered (LARGE) — Mobile device persistence lifecycle validation-failed follow-up

- Status: FAIL; workflow remains stopped after focused read/grep validation.
- Prior blockers fixed: ticket hydration/subscription is bounded and correctly ordered; language hydration has a bounded timeout with `getLanguage()` fallback and no `DEFAULT_LANGUAGE` usage.
- Remaining lifecycle blocker: `provider.tsx` initializes `baseTolgee` at line 27, then calls `updateDefaults(...).init()` on the same instance at lines 69-73 when the stored language differs.
- Required correction: use a separate fallback instance and initialize the final Tolgee instance exactly once after language resolution.
- Evidence: `/tmp/penguins/melman_report.md`.
- Compliance: no application source, protected-area, dependency, API-contract, environment, CI/CD, migration, audit JSON, or git changes.
- Notification: `validation_failed` sent via Telegram (HTTP 200 at `2026-10-27T09:50:32.067Z`; latest status `sent`, provider `telegram`; evidence: `/tmp/penguins/notifications.jsonl`).

## 2026-10-27 — tiered (LARGE) — Mobile device persistence finalization

- Status: SUCCESS; the prior subscription-order, unbounded ticket/language hydration, `DEFAULT_LANGUAGE` fallback, Tolgee single-init/Strict Mode lifecycle, and selector rejection/list-consistency validation failures are resolved.
- Workflow: `tiered.yaml` → `jira_figma_to_code_v2`; Rico/Kowalski parallel discovery and analysis, Skipper approval, Private/Melman preparation, focused validation, and finalization completed.
- Scope: exactly seven authorized application files changed: `apps/mobile-shell/src/features/home/application/betting/ticket-selection.persistence.ts`, `apps/mobile-shell/src/features/home/application/betting/ticket-selection.context.tsx`, `apps/mobile-shell/src/features/home/domain/__tests__/ticket-selection-context.test.ts`, `apps/mobile-shell/src/context/color-scheme.context.tsx`, `apps/mobile-shell/src/tolgee/language-storage.ts`, `apps/mobile-shell/src/tolgee/provider.tsx`, and `apps/mobile-shell/src/components/layout/lang-selector.tsx`.
- Artifacts: `/tmp/penguins/rico_findings.md`, `/tmp/penguins/kowalski_analysis.md`, `/tmp/penguins/skipper_decision.md`, `/tmp/penguins/skipper_plan.md`, `/tmp/penguins/private_diff.md`, `/tmp/penguins/melman_report.md`, and `/tmp/penguins/notifications.jsonl`.
- Validation: final Maurice fallback PASS after stale/unwritable Melman; focused read/grep only; tests not run per command.
- Compliance: no protected-area, dependency, API-contract, environment, CI/CD, migration, authentication/logout-scope, unauthorized-scope, type, network/browser, or git changes/violations.
- Notification: status `sent`, provider `telegram`, timestamp `2026-10-27T10:01:54.833Z`; evidence: `/tmp/penguins/notifications.jsonl`.

## 2026-10-27 — tiered (MEDIUM) — Started-match backend error contract blocked

- Status: BLOCKED after Rico discovery; Private implementation and Melman validation were not started.
- Exact ambiguity: the started-match backend `messageCode` and payload shape are unconfirmed; available evidence does not establish whether regular or quick-ticket responses identify started matches through `messageParams` or `transactionErrorMessages`.
- Source changes: NONE. No application source changes or git commands were made.
- Artifact: `/tmp/penguins/rico_findings.md`.
- Notification: blocker `started-match-error-contract` status `sent`, provider `telegram`, timestamp `2026-10-27T10:51:47.577Z`; evidence: `/tmp/penguins/notifications.jsonl`.
- Required payload: provide one regular or quick-ticket response for an already-started selected match, including `messageCode`, `messageParams`, and `transactionErrorMessages`.

## 2026-10-27 — tiered (MEDIUM) — Started-match selective removal finalization

- Status: SUCCESS; the initial backend-code blocker was resolved through the authorized web-shell/package reference, which establishes a local kickoff-time criterion rather than a backend started-match code.
- Workflow: `tiered.yaml` → MEDIUM; Rico, Private, and Melman validation steps completed.
- Implementation: web behavior was adapted using kickoff milliseconds earlier than the current time for past non-live selections; both regular and express flows run the preflight before submission lock or API invocation.
- File changed: `apps/mobile-shell/src/app/ticket.tsx` only.
- Behavior: confirmation removes captured exact selection identities only; cancel/back close only, backdrop dismissal is disabled, no whole-slip clear occurs, and unrelated dialog defaults are preserved.
- Validation: final Maurice fallback PASS after two stale Melman reports; focused read/grep only; tests not run per command.
- Persistence: selective removal uses the existing revision-aware removal and queued persistence path.
- Compliance: no protected-area, dependency, API-contract, authentication, environment, CI/CD, migration, application-source-finalization, network/browser, or Git changes/violations beyond the recorded `ticket.tsx` implementation.
- Artifacts: `/tmp/penguins/rico_findings.md`, `/tmp/penguins/private_diff.md`, `/tmp/penguins/melman_report.md`, and `/tmp/penguins/notifications.jsonl`.
- Notification: status `sent`, provider `telegram`, timestamp `2026-10-27T11:10:45.466Z`; evidence: `/tmp/penguins/notifications.jsonl`.
