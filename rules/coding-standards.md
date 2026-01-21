# Coding Standards

> This document defines **non-negotiable rules, principles, and expectations** for all code changes made by humans or AI agents.
>
> These rules represent the **identity and boundaries** of the project.

---

## 1. Purpose

The goal of these coding standards is to:

* preserve system stability
* prevent unnecessary refactoring
* ensure predictable AI behavior
* protect critical business logic
* enable safe collaboration between multiple AI agents

This document is **authoritative**. If there is a conflict between discovered patterns and this file, **this file wins**.

---

## 2. Non-Negotiable Rules (Hard Constraints)

The following rules **must never be violated** unless explicitly stated in a task description.

### 2.1 Forbidden Changes

* ❌ Do NOT refactor existing code unless the task explicitly requires refactoring
* ❌ Do NOT change business logic implicitly
* ❌ Do NOT rename files, folders, or public APIs without approval
* ❌ Do NOT introduce new dependencies without approval
* ❌ Do NOT modify authentication, authorization, middleware, payments, or core infrastructure

### 2.2 Protected Areas

The following paths are considered **protected**:

```
/auth
/core
/middleware
/payments
```

Changes in these areas require **explicit approval** and must be highlighted in the audit log.

---

## 3. Change Scope Policy

AI agents must:

* keep diffs **as small as possible**
* modify only files directly related to the task
* avoid cosmetic changes (formatting, renaming, reordering)

If more than **X files** need to be changed, Skipper must explicitly approve the scope expansion.

---

## 4. Code Philosophy

When writing or modifying code, prefer:

* clarity over cleverness
* explicitness over abstraction
* existing patterns over new ones
* composition over inheritance

Avoid:

* premature optimization
* speculative abstractions
* hidden side effects

---

## 5. React & Next.js Principles

### 5.1 Components

* Use functional components only
* Keep components small and focused
* UI components must not contain business logic

### 5.2 State Management

* Prefer local state when possible
* Global state must be justified
* Side effects must be isolated (hooks / services)

### 5.3 Server vs Client

* Follow existing project conventions
* Do not convert server components to client components unless required

---

## 6. Styling Rules

* Follow the existing styling solution used in the project
* Reuse existing UI components and design tokens
* Do not introduce new styling paradigms

Rico is responsible for discovering actual styling conventions used in the repository.

---

## 7. Testing Policy

### 7.1 When Tests Are Required

Tests are required for:

* complex logic
* utilities
* bug fixes

### 7.2 Test Expectations

* Tests must be deterministic
* No flaky tests
* Snapshot tests only for UI

Melman may block delivery if tests are missing or insufficient.

---

## 8. AI-Specific Guardrails

AI agents must:

* explain non-trivial decisions
* log Skipper decisions in the audit log
* respect protected areas
* avoid large refactors without approval

Fallback model usage must be logged.

---

## 9. Conflict Resolution

If a conflict exists between:

* discovered repository patterns
* this document

**This document takes precedence.**

Kowalski must highlight the conflict and Skipper decides the final approach.

---

## 10. Enforcement

* Skipper enforces these rules
* Melman validates compliance
* Violations are logged as audit events

---

## 11. Final Note

These standards exist to ensure that:

* AI behaves predictably
* the codebase remains stable
* humans remain in control

## 12. Memory Rule

If a decision affects future work:
- it MUST be written to /memory/decisions.md
- it MUST be logged in audit

## 13. Skill Resolution Rule

- Each agent MUST follow skills defined for their role
- If multiple skills apply, the most restrictive rule wins
- If a skill conflicts with coding standards, coding standards win

## 14. Mandatory Finalization

Skipper MUST check `/rules/finalization.md`
before producing any final response.


**No agent is allowed to optimize at the cost of safety.**
