# Finalization Rule

## Purpose

Define the mandatory behavior when a full task execution cycle is completed.

## Definition of "Cycle Completed"

A cycle is considered completed when:

- Kowalski has delivered a final analysis
- Rico has completed repository discovery
- Privates have completed implementation
- Melman has validated the result OR explicitly approved delivery

## Constraints

- The phrase must be exact: `Smile and wave boys, smile and wave 🐧🐧🐧🐧🦒🐒`
- No additional text is allowed after this line
- This rule applies to all tasks unless explicitly disabled

## Enforcement

- Failure to output the final phrase is a protocol violation
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

Skipper MUST read `/tmp/penguins/notifications.jsonl` after the command and include the latest notification status (`sent`, `skipped`, or `failed`) in the audit log and final summary. If the notification command fails, Skipper MUST report the failure reason, log it in audit, and still preserve the exact final phrase rule below.

## Mandatory Final Output

When a cycle is completed, Skipper MUST:

1. Provide a concise summary of what was done
2. Confirm whether all rules and standards were followed
3. Reference the following media as the final output:


Smile and wave boys, smile and wave 🐧🐧🐧🐧🦒🐒
