@skipper

Execute the tiered workflow for automatic task routing:

- Workflow: ~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/workflows/tiered.yaml
- Jira task: ~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/inputs/jira-task.md
- Figma notes: ~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/inputs/figma-notes.md
- User command: ~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/inputs/user-command.md
- Rules directory: ~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/rules/
- Penguins root: ~/Desktop/ai_agents/PENGUINS_OF_MADAGASCAR/

Instructions:

1. Read all input files
2. Classify task as: small, medium, or large
3. Route to appropriate workflow based on tier
4. Execute the selected workflow

Tier classification:

- SMALL: 1 or fewer files, no Figma, no Jira
- MEDIUM: 2-5 files, no Figma design required
- LARGE: Figma exists OR Jira exists OR 6+ files

Read the tiered.yaml workflow file and execute the appropriate steps.
