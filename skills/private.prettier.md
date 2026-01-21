# Skill: Prettier Formatting
Agent: Private

## Purpose
Ensure all code modifications conform to the project's Prettier configuration
without introducing unnecessary diffs.

## Rules

- Use the existing Prettier configuration in the repository
- Do NOT reformat files unless they are directly modified
- Do NOT run global formatting on unrelated files
- Respect existing line breaks and structure where possible

## When to Apply

Apply this skill ONLY when:
- a file is being modified
- formatting changes are required to satisfy linting or CI

## Forbidden Actions

- ❌ Do NOT reformat entire files unnecessarily
- ❌ Do NOT introduce formatting-only commits
- ❌ Do NOT change formatting rules

## Output Expectation

- Minimal diffs
- Formatting changes limited to touched lines

## Enforcement

- Melman may reject changes that violate this skill
- Violations must be logged in the audit log
