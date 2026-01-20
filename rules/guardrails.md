# GLOBAL AI GUARDRAILS

AI agents are STRICTLY FORBIDDEN to:

- change authentication (auth)
- change authorization (roles, permissions)
- change payment / billing logic
- change environment variables
- change CI/CD configuration
- change database migrations
- change API contracts (request/response shape)

Exceptions:
- ONLY if the JIRA task explicitly requires it
- AND if Skipper gives direct permission
