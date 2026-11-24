# Notification Network Exception

External network access remains forbidden in Penguins workflow sessions except for the explicitly scoped exceptions documented here.

## Allowed Exception

Standing user permission activates this exception for future sessions: Skipper may send real workflow notifications by running `node tools/notify.mjs` from the Penguins root without `--dry-run`, without separate approval for each send.

Fresh explicit session restrictions and higher-priority runtime restrictions take precedence over this local policy. The 2026-11-02 cleanup-session prohibition is historical, not a standing ban on new sessions. Never bypass tool approval or sandbox controls.

The only external network request allowed by the Telegram notifier exception is:

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

Network calls outside the explicitly scoped exceptions in this policy remain forbidden.

## Agenza dependency registry exception

- For the Agenza Tiered Workflow task only, permit pnpm add/install invoked from /Users/dusanmilenkovic/Desktop/projects/agenza to fetch package metadata and tarballs over HTTPS from registry.npmjs.org.
- Approved direct additions: yaml in apps/api and @tanstack/react-query in apps/web. Access may include their required transitive dependencies and metadata needed to resolve existing locked workspace dependencies. No unrelated dependency upgrades.
- Use --ignore-scripts. No lifecycle scripts, pnpm run scripts, git/URL dependencies, other registries, or redirects to another host are authorized. Stop if the package manager requires any excluded access.
- No credentials, registry configuration, environment, tool permissions or sandbox settings may be changed. All unrelated network access, browser tools and WebFetch remain forbidden. Existing Telegram and local-embeddings exceptions remain unchanged.
- This future instruction-file exception does not override instructions already loaded at higher priority in an active session, tool approval, sandbox controls, or fresh session restrictions. No downloads are authorized by editing this file in the current session.

## Local embeddings exception

- Allow downloading Ollama from its official distribution.
- Allow downloading only Qwen3-Embedding-0.6B from the verified model registry.
- Allow local installation and running Ollama with cloud features disabled.
- Allow embedding requests only to the local loopback service.
- Never send source code, memory documents, or queries to external embedding APIs.
- No other network access or permission expansion is authorized.
