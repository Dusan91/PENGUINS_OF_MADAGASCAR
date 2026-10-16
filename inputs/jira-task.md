# Jira Task
Odobreno je proširenje registration konfiguracionog API ugovora poljem `imageMediaId`, uključujući frontend tipove, staged state, backend writer model i BFF read model. Javni registration API ne treba da vraća resolved image URL.

## Approved Public Registration API Contract Change

Public registration API change approved: /api/registration-config must return config.imageUrl resolved by wh-cms-bff-service from the persisted imageMediaId. Do not expose imageMediaId publicly. Missing/deleted media or disabled public URLs must return an empty string. Update affected BFF contract/tests and whitelabel consumer types/wiring.
