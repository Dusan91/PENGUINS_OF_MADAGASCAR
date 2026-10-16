# Agent Communication & Token Optimization Rules

> These rules are **mandatory** for all inter-agent communication.
> Goal: minimize token usage while preserving accuracy.
> Violations must be logged in audit-log.md.

---

## Rule 1 — Never Forward Full Conversation History

Send only what is required for the task.

```yaml
task:
  description: Implement auth middleware

files:
  - auth.ts
  - middleware.ts

constraints:
  - Next.js 15
  - Existing JWT implementation

questions:
  - Is middleware reusable?
  - Where should token validation happen?
```

---

## Rule 2 — Return Structured Output Only

Never return reasoning, explanations, or thought process.

```yaml
status: DONE

changed:
  - auth.ts
  - middleware.ts

issues:
  - duplicate validation

tests: PASS

next:
  - update middleware tests
```

---

## Rule 3 — Replace Conversation History With Summaries

```yaml
summary:
  - auth implemented
  - tests passing
  - middleware pending

knownIssues:
  - cookie expiration
```

Summaries must be refreshed after every completed task.

---

## Rule 4 — Use a Message Compressor

Every message between agents must be compressed to:

```yaml
summary:
goals:
constraints:
files:
risks:
nextTask:
```

Target: **20,000 tokens → under 500 tokens**

Remove:
- conversation history
- duplicated context
- reasoning
- explanations
- repeated requirements

---

## Rule 5 — Send Diffs Instead of Files

Never send entire files unless explicitly requested.

```diff
- validateUser()
+ validateUser(jwt)
```

---

## Rule 6 — Maintain Semantic Memory

Never resend project metadata. Reference `shared-memory.yaml` instead.

```yaml
requirementsRef: REQ-01
architectureRef: ARCH-01
styleGuideRef: STYLE-01
codingStandardsRef: CODE-01
```

See `/memory/shared-memory.yaml` for ID definitions.

---

## Rule 7 — Do Not Explain Decisions

Never include:
- "I analyzed..."
- "I decided..."
- "My reasoning..."
- "Possible approach..."

Return only actionable results.

---

## Rule 8 — Minimize Inter-Agent Communication

Delegate only when required. Each delegation increases token usage.

Preferred:
```
Skipper → Kowalski
```

Avoid unnecessary chains:
```
Skipper → Kowalski → Rico → Private
```

---

## Rule 9 — Exchange Structured Data

Prefer YAML or JSON over natural language.

```yaml
task:
files:
constraints:
result:
next:
```

---

## Rule 10 — Include Only Relevant Files

```yaml
files:
  - auth.ts
  - middleware.ts
```

Never send the entire repository.

---

## Rule 11 — Use Reference IDs Instead of Repeating Context

```yaml
requirementsRef: REQ-01
architectureRef: ARCH-01
```

Agents resolve references from `/memory/shared-memory.yaml` only when full content is required.

---

## Standard Task Message Format

```yaml
task:
  description:

files:

constraints:

dependencies:

questions:

expectedOutput:
```

## Standard Result Message Format

```yaml
status:

changed:

issues:

tests:

summary:

next:
```

---

## Compression Checklist

Always **remove**:
- chain-of-thought
- duplicate requirements
- repeated history
- unchanged files
- unrelated code
- implementation explanations

Always **preserve**:
- current task
- relevant files
- constraints
- risks
- next action
