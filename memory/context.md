# Project Context

## Project Name
PENGUINS_OF_MADAGASCAR

## Domain
Web application built with React and Next.js.

## Primary Goal
Enable a multi-agent AI workflow to safely implement features, fixes, and improvements
based on Jira tasks and Figma designs, while preserving existing logic and stability.

## Technology Stack
- React
- Next.js
- TypeScript (assumed unless discovered otherwise)
- Existing internal UI components and design system

## Repository Characteristics
- Medium to large codebase
- Existing business logic must be preserved
- Some areas are protected and require explicit approval

## AI Operating Model
This project is operated by a multi-agent AI team:

- **Skipper** – orchestration and final decision making
- **Kowalski** – analysis, planning, and solution comparison
- **Rico** – repository discovery (standards, components, patterns)
- **Privates** – implementation according to instructions
- **Melman** – testing, validation, and standards enforcement

## Authoritative Inputs
The following sources define what must be done and how:

1. `/rules/coding-standards.md` (highest priority)
2. `user-command.md`
3. `jira-task.md`
4. `figma-notes.md`
5. Discovered repository conventions (if no conflict exists)

## Non-Goals
- Large refactors
- Architectural rewrites
- Dependency upgrades
- Code style changes not required by the task

## Stability Principle
Stability and predictability are more important than optimization.

If in doubt, prefer the **least invasive solution**.
