# Project Assumptions

## Technical Assumptions

- The project uses the Next.js App Router (unless Rico discovers otherwise)
- TypeScript is used across most of the codebase
- Existing UI components should be reused instead of creating new ones
- Styling follows an existing convention (e.g. CSS Modules, Tailwind, or styled-components)

## Process Assumptions

- Jira task description defines the scope of work
- Figma designs are the source of truth for UI appearance
- Tasks are expected to be implemented incrementally
- Refactoring is NOT expected unless explicitly stated

## AI Behavior Assumptions

- AI agents should not make product decisions
- AI agents should not invent requirements
- Ambiguities should be surfaced, not guessed
- Skipper makes final decisions when conflicts exist

## Risk Assumptions

- Some parts of the codebase may lack tests
- Some legacy code may not follow current standards
- Changing shared components may have wide impact

## Validation Rule

If any assumption is:
- proven false
- partially incorrect
- conflicting with discovered code

Rico MUST report it and Kowalski MUST reassess the plan.
