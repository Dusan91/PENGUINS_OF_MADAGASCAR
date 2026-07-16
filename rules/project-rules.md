# Project Rules

> Specific rules for this project. These are NON-NEGOTIABLE and apply to all agents.
> These rules extend `coding-standards.md` — if there is a conflict, `coding-standards.md` wins.

---

## 1. Data Fetching — React Query

- **ALWAYS use `react-query` (`@tanstack/react-query`) for data fetching**
- Do NOT use raw `fetch()` + `useState` + `useEffect` for server data
- Do NOT use SWR, RTK Query, or any other fetching library
- Follow existing `queryOptions` + `useQuery` patterns already in the codebase
- `staleTime` must always be set explicitly (do not leave it undefined)

---

## 2. Dependencies — No New Libraries

- **NEVER install new npm packages or libraries**
- If a task seems to require a new dependency, **STOP immediately**
- Ask the user: "This task requires `<package-name>`. Should I install it?"
- Wait for explicit approval before proceeding
- This applies to: npm packages, devDependencies, peerDependencies, and monorepo workspace additions

---

## 3. Git — No Commits

- **NEVER run `git commit`**
- **NEVER run `git push`**
- **NEVER run `git add` with intent to commit**
- Do NOT create branches, tags, or stashes unless explicitly asked
- Code changes are written to disk only — the user handles all git operations

---

## 4. Change Notification Rule

- If any change is about to affect something **outside the explicit task scope**, STOP and notify the user
- Format: "I noticed that [X] would also need to change. Should I include it?"
- Do NOT silently expand scope

---

## Enforcement

- Kowalski must check these rules during plan creation
- Melman must verify compliance during validation
- Skipper must reject any plan that violates §2 or §3 without user approval
