---
name: private-prettier
description: Prettier formatting discipline — apply formatting only to modified lines, never reformat entire files or unrelated code
---

## What I do

- Use the existing Prettier configuration in the repository
- Apply formatting only to lines that are directly modified
- Ensure modified code passes linting and CI checks

## When to use me

Apply this skill whenever implementing code changes to ensure formatting compliance.

## Rules

- Do NOT reformat files unless they are directly modified
- Do NOT run global formatting on unrelated files
- Do NOT introduce formatting-only changes
- Minimal diffs — formatting changes limited to touched lines

## Enforcement

- Melman may reject changes that violate this skill
- Violations must be logged in the audit log
