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
## Rapprochement compositeurs

Avec le serveur Parigo lancé localement, le smoke test suivant vérifie le filtre du label,
la couverture des recherches par alias, les crédits réels des pistes et la stabilité
des identifiants renvoyés par `/getrightholders` :

```bash
HARVEST_LIVE_TESTS=1 pnpm test:harvest:composers
```

La base BFF peut être remplacée avec `PARIGO_SMOKE_BASE_URL`.

Pour rafraîchir l’instantané versionné des variantes de crédits sans aucune
mutation distante :

```bash
pnpm audit:harvest:composers
```
