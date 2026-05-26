# Smoke tests Harvest API

Ces scripts sont prevus pour demarrer les tests quand Harvest fournit les credentials. Ils ne contiennent aucun secret.

## Smoke test TypeScript

```bash
pnpm tsx docs/harvest/smoke-tests/harvest-api-smoke-test.ts
```

Variables minimales :

```bash
export HARVEST_AUTH_URL="..."
export HARVEST_SERVICE_URL="..."
export HARVEST_ACCESS_KEY="..."
export HARVEST_CLIENT_ID="..."
export HARVEST_CLIENT_SECRET="..."
```

Variables optionnelles :

```bash
export HARVEST_AUTH_HEADER_PREFIX="Bearer"
export HARVEST_REGION_ID="..."
export HARVEST_TEST_IP="8.8.8.8"
export HARVEST_SEARCH_KEYWORD="piano"
export HARVEST_MEMBER_USERNAME="..."
export HARVEST_MEMBER_PASSWORD="..."
```

Si Harvest demande `Authorization: {token}` sans `Bearer`, lancer :

```bash
export HARVEST_AUTH_HEADER_PREFIX=""
```
