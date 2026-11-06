# Finalization Rule

## Purpose

Define event-specific final wording and truthful notification reporting for workflow statuses.

## Definition of "Cycle Completed"

A cycle is successfully completed (`workflow_complete`) only when:

- For SMALL, Skipper has supplied a current bounded plan, risks, exact file allowlist and explicit approval; Private has completed implementation; Melman has independently performed focused validation with PASS; and Skipper has approved delivery.
- For MEDIUM and LARGE, Rico has completed repository discovery, Kowalski has delivered final analysis, Privates have completed implementation, Melman has successfully validated the result, delivery is approved, and all applicable workflow-specific mandatory discovery, planning, risk, review and validation gates have passed.
- A blocked, failed, rejected or incomplete cycle is not `workflow_complete`.
- EVERY cycle, including SMALL and direct refactor/Jira/review, additionally requires the current mandatory Mort/Nana/Julien reports. Mort must supply ready target/task/source/constraints packets for specialist handoffs, reused only while current and applicable and refreshed on material changes. Missing/clarification/blocked context stops dependent work.
- Nana PREAPPROVAL must audit the current plan/scope/security before implementation or review approval; separate Nana POSTDIFF must audit the actual introduced/supplied diff before delivery. BLOCK, missing required evidence or unavailable role blocks; CAUTION requires explicit Skipper disposition. Existing discovery, risk, approval, implementation, review, TS, QA and audit gates remain applicable.
- Julien's current performance report is mandatory before finalization; `insufficient_data` is nonblocking ONLY for performance. State unmeasured and make no performance/speedup claims; a missing role/report blocks. Static acceptance never certifies runtime behavior.

## Constraints

- Select the final line by the actual event:
  - `workflow_complete`: `Smile and wave boys, smile and wave 🐧🐧🐧🐧🦒🐒`
  - `workflow_failed`: `Boys we have a problem!`
  - `validation_failed`: `Boys we have a problem!`
  - `blocked`: `Boys we have a problem!`
  - `blocker_resolved`: `Blocker je razrešen.`
  - `decision_required`: `Kowalski! Options!`
  - `approval_required`: `Kowalski! Options!`
  - `workflow_started`: `🐧 Penguins workflow started!`
- Only successfully validated `workflow_complete` may use the success phrase. Every other status must never append it; resolving a blocker is not workflow completion.
- DONE may describe only an actually completed and accepted scope. State explicitly when acceptance is static and runtime checks remain unverified; do not imply workflow_complete for a partially completed task.
- No additional text is allowed after the selected final line.
- These instructions do not override higher-priority runtime or current-session restrictions.

## Enforcement

- Failure to use the matching event-specific final line is a protocol violation
- Violations must be logged in the audit log

## Task Source

Before producing the completion notification, Skipper MUST read `/inputs/user-command.md` and extract the value of the `Task:` field.

## Mandatory Completion Notification

Before producing the final response for any successfully completed workflow cycle, Skipper MUST run the notification command from the Penguins root without `--dry-run`.

The `--message` value MUST include the extracted `Task:` text when it is present and non-empty.

When `Task:` is missing, empty, or whitespace-only, the `--message` value MUST fall back to `"Task completed successfully"`.

Example:

```bash
node tools/notify.mjs --event workflow_complete --title "Smile and wave boys, smile and wave" --message "Task completed successfully" --priority default
```

Skipper MUST read `/tmp/penguins/notifications.jsonl` after the command and include the current attempt's notification status (`sent`, `skipped`, or `failed`) in the audit log and final summary. If sending is unavailable or forbidden, report `not_attempted` with the reason; never reuse historical delivery evidence. If the notification command fails, report the failure reason and log it in audit. Notification delivery is separate from workflow validation and must not turn a failed or blocked workflow into success. Use the matching event for other statuses under the existing notification policy; do not send `workflow_complete` before successful validation.

## Mandatory Final Output

For each final status response, Skipper MUST:

1. Provide a concise summary of what was done
2. Confirm whether all rules and standards were followed
3. Report the actual workflow status and notification evidence or limitation
4. End with exactly the matching line from Constraints, with nothing after it
