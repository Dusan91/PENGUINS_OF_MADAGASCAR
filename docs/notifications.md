# Penguins Notifications

Penguins workflows can notify a phone through Telegram when a workflow finishes or needs a user decision. Telegram is the sole transport; failed delivery has no fallback.

Standing user permission authorizes real workflow sends in future sessions under `rules/notification-network-exception.md`, without separate approval for each send. External network access remains forbidden outside the exception: only `tools/notify.mjs` may send `POST https://api.telegram.org/bot<token>/sendMessage` for approved workflow notification events. Direct ad-hoc network calls, bot polling/launch, and credential changes remain forbidden. Fresh explicit session restrictions and higher-priority runtime restrictions take precedence; historical cleanup-session bans do not apply automatically to new sessions. Never bypass tool approval or sandbox controls.

## Setup

Use the existing Telegram bot/chat configuration identified by `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, and keep Telegram notifications enabled on the phone. Do not expose their values or edit credentials as part of this cleanup.

No npm packages are required. The notifier uses Node's built-in `fetch`.

## Command

```sh
node tools/notify.mjs --event workflow_complete --title "Penguins" --message "Workflow finished"
```

Every notifier run appends one JSONL status entry to `/tmp/penguins/notifications.jsonl` by default. Use `--status-file` to write evidence somewhere else:

```sh
node tools/notify.mjs --event workflow_complete --title "Penguins" --message "Workflow finished" --status-file /tmp/penguins/custom-notifications.jsonl
```

For valid invocations, each entry includes `timestamp`, `event`, `title`, `status`, and optional `reason`, `statusCode`, `provider`, or `blockerId`. Status is one of `sent`, `skipped`, or `failed`; confirmed sends include `provider: telegram`. Delivery errors use fixed secret-safe reasons, never raw transport errors or response bodies, and are nonfatal. Invalid arguments are rejected with a nonzero exit before delivery or status persistence.

Supported events:

- `workflow_started`
- `workflow_complete`
- `workflow_failed`
- `validation_failed`
- `decision_required`
- `approval_required`
- `blocked`
- `blocker_resolved`

Optional priority values are `min`, `low`, `default`, `high`, `urgent`, or `1` through `5`:

Priority remains accepted for CLI compatibility but does not select Telegram delivery urgency. `--options` accepts a JSON array of label/value objects for inline buttons; message text uses MarkdownV2 escaping.

```sh
node tools/notify.mjs --event decision_required --title "Penguins decision needed" --message "Skipper needs user input" --priority high
```

## Evidence Log

Review the default evidence log with:

```sh
tail -n 20 /tmp/penguins/notifications.jsonl
```

Dry-run mode validates the event/title/message arguments and writes a skipped status without sending a network request:

```sh
node tools/notify.mjs --dry-run --event workflow_complete --title "Penguins" --message "Workflow finished"
```

Use dry-run mode for simulations or local checks where permitted. Dry-run takes precedence over disabled mode. Dry-run reads environment configuration and writes real evidence, so use an isolated mocked harness when session restrictions require it. Under standing permission, Skipper should omit `--dry-run` for real workflow notification events unless a fresh session or runtime restriction prohibits execution.

## Blocker Lifecycle

Use `--blocker-id` and `--followup-message` with `--event blocked` to send a Telegram notification with a default inline **Resolve blocker** button:

```sh
node tools/notify.mjs --event blocked \
  --title "Penguins blocked" \
  --message "Workflow classifier needs clearer input" \
  --blocker-id "tiered-blocked" \
  --followup-message "Provide a clearer user command, Jira task, or Figma notes." \
  --priority high
```

The resolve button payload has the format `penguins:blocker:resolve:<blockerId>` and is limited to 64 characters. Clicking it delegates a follow-up `--event blocker_resolved` notification to the same `notify.mjs` path, using the stored follow-up text. `--resolved-by` records the resolver.

Blocker state is append-only in `/tmp/penguins/blockers.jsonl` by default (`--blockers-file` overrides the path). Only `notify.mjs` writes an open or resolved row after successful sending, retaining the Telegram message ID; the bot delegates resolution and does not append a duplicate. Failed delivery appends no lifecycle row.

## Simulation

The built-in simulation uses dry-run without network access:

```sh
node tools/simulate-workflow-notifications.mjs
```

It writes dry-run evidence to `/tmp/penguins/notifications-simulation.jsonl` for `workflow_started`, `decision_required`, and `workflow_complete`.

## Real Phone Test

Standing permission covers real workflow events, not synthetic phone tests. A live phone test requires separate explicit authorization and must respect session/runtime restrictions. When authorized, use the existing notifier and check the evidence for `"status":"sent"`:

```sh
node tools/notify.mjs --event decision_required --title "Penguins phone test" --message "Confirm this appeared on the phone" --priority high
```

## Environment Overrides

- `PENGUINS_NOTIFY_ENABLED=false` disables notifications and exits successfully.
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` identify the existing Telegram configuration. Missing values produce nonfatal failed evidence without a network request.

The notifier loads the Penguins root `.env` using its existing loader; existing process environment values take precedence, including empty values. An absent or unreadable file is nonfatal. No environment or credential files are changed by this task.

## Workflow Rule

Skipper should call `node tools/notify.mjs` when a workflow starts, completes, fails validation, fails overall, is blocked, or stops for a user decision or approval, subject to stricter session restrictions. Under `rules/notification-network-exception.md`, authorized real workflow sends should run without `--dry-run`. Skipper must include command output and latest evidence status in the final summary and audit log. When execution is forbidden, record `not_attempted` and the reason instead; do not fabricate or reuse historical delivery evidence. If delivery fails, report the original workflow status and the nonfatal notification failure; no other transport is attempted.
