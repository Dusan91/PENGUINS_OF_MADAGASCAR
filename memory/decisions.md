# Architectural Decisions

- Use audit-log for all agent actions
- coding-standards.md is authoritative
- User-command.md has higher priority than Jira

## 2026-03-13 — ticket-accept-reject endpoint

- **react-hook-form excluded** when there is no form context — adding unused hook violates "clarity over cleverness" (§4). Decision: use zod-only validation.
- **Domain service may call configApi directly** when it follows existing pattern (stream.service.ts does the same). No need to create an additional infrastructure wrapper.
- **useMutation hook must be instantiated at component level**, not inside callbacks (React rules of hooks).
