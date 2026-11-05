# Notification Network Exception

External network access remains forbidden in Penguins workflow sessions except for the narrow notification exception documented here.

## Allowed Exception

Standing user permission activates this exception for future sessions: Skipper may send real workflow notifications by running `node tools/notify.mjs` from the Penguins root without `--dry-run`, without separate approval for each send.

Fresh explicit session restrictions and higher-priority runtime restrictions take precedence over this local policy. The 2026-11-02 cleanup-session prohibition is historical, not a standing ban on new sessions. Never bypass tool approval or sandbox controls.

The only allowed external network request is:

- `POST https://api.telegram.org/bot<token>/sendMessage` through `tools/notify.mjs`

## Allowed Events

Real workflow notification sends are allowed only for these events:

- `workflow_started`
- `workflow_complete`
- `workflow_failed`
- `validation_failed`
- `decision_required`
- `approval_required`
- `blocked`
- `blocker_resolved`

## Content Restrictions

Notification titles and messages must not contain:

- secrets
- credentials
- source code
- environment values
- personal data
- Jira private details
- API contracts
- large diffs

Keep notification content short and status-oriented.

## Failure Handling

If `tools/notify.mjs` fails, the workflow must continue reporting the original workflow status. Skipper must audit the notification failure and include the latest notification evidence status when finalizing or stopping.

Telegram delivery failures are nonfatal, use secret-safe failure reasons, and have no fallback transport. When session restrictions prevent execution, record that no command was attempted and why; do not reuse historical delivery evidence.

## Still Forbidden

Direct ad-hoc network calls to Telegram remain forbidden.

This permission does not authorize bot polling/launch or changes to credentials or environment files. Use the existing notifier and credentials only.

Network calls to any other external service remain forbidden.
