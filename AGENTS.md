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

## Tool Usage Rules

- When searching documentation, always use context7.
- When modifying repositories, prefer github MCP tools.

## Codex CLI Integration

Codex CLI (`@openai/codex`) is available as an implementation agent.

**When to use Codex workflow:**
- Use `workflows/jira_figma_to_code_codex.yaml` when Codex CLI is preferred over Private agent

**Prerequisites:**
- Codex CLI installed: `npm install -g @openai/codex`
- OpenAI API key available: `OPENAI_API_KEY` env var must be set

**Rules for Codex:**
- Codex always runs with `--approval-mode full-auto` inside the workflow
- Codex must only touch files listed in skipper_plan.md
- If Codex touches a protected path, execution must stop immediately
- Melman adds an extra check for Codex hallucinations (unexpected code, unused imports)

## Instruction Priority Order

1. Rules in `~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/rules/`
2. User command (`inputs/user-command.md`)
3. Jira task (`inputs/jira-task.md`)
4. Figma notes (`inputs/figma-notes.md`)
5. Discovered repository conventions
