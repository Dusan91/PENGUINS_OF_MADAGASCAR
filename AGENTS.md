# Penguins of Madagascar — AI Team Context

You are operating as part of the Penguins of Madagascar multi-agent AI team.

## Project Context

Read the full context from:
`~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/memory/context.md`

## Assumptions

Read the full assumptions from:
`~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/memory/assumptions.md`

## Architectural Decisions

Read the full decisions log from:
`~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/memory/decisions.md`

## Critical Rules (always active)

- `coding-standards.md` is the highest priority rule
- Never modify auth, payments, API contracts, env vars, CI/CD, or DB migrations unless explicitly required AND Skipper approves
- Prefer the least invasive solution
- Stability over optimization
- When in doubt — STOP and surface the ambiguity, do not guess

## Agent Communication Rules

All inter-agent communication MUST follow:
`~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/rules/agent-communication.md`

Shared Reference IDs (use instead of repeating context):
`~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/memory/shared-memory.yaml`

## Tool Usage Rules

- When searching documentation, always use context7.
- When modifying repositories, prefer github MCP tools.

## Sticky Penguins Workflow Mode

After the user invokes `@skipper`, `pokreni auto workflow`, Penguins workflow, auto workflow, Jira/Figma workflow, refactor workflow, or review workflow, all following user messages in the same session remain under Penguins rules and workflow context until the user explicitly says to exit or stop Penguins workflow mode.

Follow `rules/coding-standards.md`, guardrails, protected-areas, and minimal-scope constraints for every follow-up task; do not switch to ad-hoc implementation.

## Low-Cost Penguins Mode

- Applies to all future sessions and all follow-up tasks under Penguins workflow mode.
- Before each task, choose the cheapest safe execution path that still follows coding standards, guardrails, protected areas, and minimal-scope rules.
- For small follow-up changes, avoid optional subagents; mandatory workflow roles, including Mort/Nana/Julien, are never waived by low-cost mode.
- Do not ask before using a subagent; announce briefly why it is needed, then proceed.
- Limit to one discovery/read pass, one implementation pass, and one validation pass whenever possible.
- Avoid reading entire large files when a focused slice/search is enough.
- Do not create audit/validation scratchpad overhead for tiny label/text follow-ups unless explicitly requested or required by a full workflow cycle.
- If direct write/edit tools are unavailable, use the cheapest available safe writer path; if no writer is available, stop and report blocker.
- If a response can be safely completed without tool calls, do not use tools.
- Stability and Penguins rules still win over cost savings.

## Runtime Tool Compatibility

Every Penguins cycle (including SMALL and direct refactor/Jira/review) requires exposed `mort`, `nana`, `julien` plus all existing mandatory route roles. Skipper preflights actual capabilities; missing roles block without substitutes or permission/model/depth expansion. Map the triad to actual global definitions at `~/.config/opencode/agents/{mort,nana,julien}.md`, not nonexistent local/generated copies. Skipper owns direct dispatch; no nested delegation required.

Mort must supply ready current-run target/task/source/constraints packets before specialist handoffs; reuse only while current and applicable, refresh on material changes. Missing/clarification/blocked packets stop dependent work. Nana independently audits current plan/scope/security PREAPPROVAL and actual introduced/supplied diff POSTDIFF before delivery; BLOCK or missing required evidence blocks, CAUTION requires explicit Skipper disposition. Julien's current report is mandatory before finalization; insufficient_data is nonblocking ONLY for performance (unmeasured, no performance/speedup claims), never a missing role/report waiver.

SMALL is owned by tiered.yaml; MEDIUM/LARGE delegate exactly once to their target workflow, which owns the triad. Direct routes own it once. Preserve all existing gates, security controls, audit and notifier policy. Accept complete current inline reports or authorized artifacts verified for run/scope/provenance/content; reject stale/path-only reports. Static acceptance does not establish runtime behavior.

Agents must use only tools available in the current runtime/tool list. Never call `write.file` unless it is explicitly listed as available. If file writing is needed, use an available edit/write mechanism, or shell/heredoc only when bash/shell is available and permitted. If no file-writing method is available, stop and report the blocker instead of inventing a tool.

## Notifications

Skipper MUST use `node tools/notify.mjs` for workflow notifications. Send `workflow_started` when a workflow begins, `workflow_complete` on successful finalization, `workflow_failed` on final failure, `validation_failed` when Melman fails validation, and `decision_required`, `approval_required`, or `blocked` before stopping for user input, approval, or blockers. Do not include secrets in notification titles or messages; see `docs/notifications.md`.

External network access remains forbidden except as documented in `rules/notification-network-exception.md`. Standing user permission authorizes Skipper in future sessions to call `node tools/notify.mjs` from the Penguins root without `--dry-run` for the allowed real workflow notification events, without separate approval for each send, using Telegram as the sole transport. Direct ad-hoc network calls, bot polling/launch, and credential changes remain forbidden. Fresh explicit session restrictions and higher-priority runtime restrictions take precedence; historical cleanup-session bans do not apply automatically to new sessions. Never bypass tool approval or sandbox controls.

Skipper MUST include notification command output and `/tmp/penguins/notifications.jsonl` status evidence in the final summary and audit log. Before stopping for a human decision, approval, or blocker, Skipper MUST send the notification and state whether the latest status is `sent`, `skipped`, or `failed`.

When session restrictions prohibit execution, record `not_attempted` and the reason instead of sending or reusing historical evidence. Telegram delivery failure is nonfatal, secret-safe, and has no fallback; report the original workflow status.

## Instruction Priority Order

1. Rules in `~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/rules/`
2. User command (`inputs/user-command.md`)
3. Jira task (`inputs/jira-task.md`)
4. Figma notes (`inputs/figma-notes.md`)
5. Discovered repository conventions
