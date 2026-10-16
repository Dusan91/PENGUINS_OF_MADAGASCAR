# Notification Network Exception

External network access remains forbidden in Penguins workflow sessions except for the narrow notification exception documented here.

## Allowed Exception

Skipper may send workflow notifications by running `node tools/notify.mjs` without `--dry-run` only when this exception is active.

The only allowed external network request is:

- `POST https://ntfy.sh/<configured-topic>` through `tools/notify.mjs`

The default allowed topic is:

- `penguins-dusan-7f3a9c`

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

## Still Forbidden

Direct ad-hoc network calls to ntfy remain forbidden.

Network calls to any other external service remain forbidden.
