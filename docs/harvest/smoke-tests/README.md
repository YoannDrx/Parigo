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

## Conformité de la documentation Public API

La campagne de lecture directe rejoue les contrats publics sûrs avec les exemples
JSON documentés, puis écrit une synthèse expurgée dans
`docs/harvest/last-public-read-run.json` :

```bash
pnpm audit:harvest:public-read
```

Elle ne supprime aucun compte, ne déclenche aucun paiement ni e-mail et ne lance
aucun import ou export de catalogue.
