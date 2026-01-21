# Input Validation Rules

## Purpose
Prevent task invention and undefined execution behavior when inputs are missing or empty.

---

## Jira Task Validation

`jira-task.md` is considered INVALID if:
- the file is missing
- the file is empty
- the file contains only whitespace
- the file contains only a title or placeholder text
- the file explicitly states "N/A", "TBD", or similar

When `jira-task.md` is INVALID:
- It MUST be ignored as a task source
- It MUST NOT trigger a new execution cycle
- No assumptions may be derived from it

---

## Allowed Task Sources (Priority Order)

When Jira is invalid or missing, tasks may ONLY come from:
1. `user-command.md`
2. Explicit user instructions in chat
3. Previously approved unfinished tasks

---

## Forbidden Behavior

When `jira-task.md` is invalid:
- ❌ Do NOT infer requirements
- ❌ Do NOT guess implementation details
- ❌ Do NOT create work items
- ❌ Do NOT start a cycle automatically

---

## Required Agent Behavior

- **Rico** must report Jira status as `INVALID`
- **Kowalski** must not include Jira-derived requirements
- **Skipper** must explicitly state that Jira was ignored
- **Melman** must block delivery if work was based on an invalid Jira

---

## Audit Logging

When Jira is invalid, log an audit entry:
- type: INPUT_VALIDATION
- source: jira-task.md
- status: IGNORED
