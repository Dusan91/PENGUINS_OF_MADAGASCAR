# Penguins Notifications

Penguins workflows can notify a phone through ntfy when a workflow finishes or needs a user decision.

Real workflow sends are allowed only under `rules/notification-network-exception.md`. External network access remains forbidden outside the exception: only `tools/notify.mjs` may send `POST https://ntfy.sh/<configured-topic>` for approved workflow notification events. Direct ad-hoc network calls to ntfy or any other service remain forbidden.

## Setup

1. Install the ntfy mobile app.
2. Subscribe to topic `penguins-dusan-7f3a9c`.
3. Keep notifications enabled for the topic.

No npm packages are required. The notifier uses Node's built-in `fetch`.

## Command

```sh
node tools/notify.mjs --event workflow_complete --title "Penguins" --message "Workflow finished"
```

Every notifier run appends one JSONL status entry to `/tmp/penguins/notifications.jsonl` by default. Use `--status-file` to write evidence somewhere else:

```sh
node tools/notify.mjs --event workflow_complete --title "Penguins" --message "Workflow finished" --status-file /tmp/penguins/custom-notifications.jsonl
```

Each entry includes `timestamp`, `event`, `title`, `status`, and optional `reason` or `statusCode`. Status is one of `sent`, `skipped`, or `failed`.

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

Use dry-run mode for simulations, local checks, or any session where the notification network exception is not active. When the exception is active, Skipper may omit `--dry-run` only for real workflow notification events.

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

The resolve button payload has the format `penguins:blocker:resolve:<blockerId>` and is limited to 64 characters. Clicking it appends a resolved entry to `/tmp/penguins/blockers.jsonl` and sends a follow-up `--event blocker_resolved` notification through the same `notify.mjs` path.

Blocker state is append-only. Open entries are written when a `blocked` notification is sent; resolved entries are written when the inline resolve action is handled by `tools/telegram-auto-workflow-bot.mjs`.

## Simulation

Run the built-in simulation without network access:

```sh
node tools/simulate-workflow-notifications.mjs
```

It writes dry-run evidence to `/tmp/penguins/notifications-simulation.jsonl` for `workflow_started`, `decision_required`, and `workflow_complete`.

## Real Phone Test

After subscribing to the ntfy topic on the phone, send one real notification only when `rules/notification-network-exception.md` applies, then check `/tmp/penguins/notifications.jsonl` for `"status":"sent"`:

```sh
node tools/notify.mjs --event decision_required --title "Penguins phone test" --message "Confirm this appeared on the phone" --priority high
```

## Environment Overrides

- `PENGUINS_NOTIFY_ENABLED=false` disables notifications and exits successfully.
- `PENGUINS_NOTIFY_PROVIDER=ntfy` selects the notifier provider.
- `PENGUINS_NTFY_URL=https://ntfy.sh` overrides the ntfy base URL.
- `PENGUINS_NTFY_TOPIC=penguins-dusan-7f3a9c` overrides the topic.

For local overrides, use an untracked `.penguins-notify.env` file if needed.

## Workflow Rule

Skipper should call `node tools/notify.mjs` when a workflow starts, completes, fails validation, fails overall, is blocked, or stops for a user decision or approval. Under `rules/notification-network-exception.md`, these real workflow sends should run without `--dry-run`; otherwise, use `--dry-run`. Skipper must include the notification command output and latest evidence status in the final summary and audit log. If the notifier fails, Skipper should still report the original workflow status and include the notification failure in the summary and audit log.
