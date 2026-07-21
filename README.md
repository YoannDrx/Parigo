# Parigo

Site catalogue et lecteur audio de Parigo Music, alimenté exclusivement par la Public API Harvest. Le navigateur appelle les routes Next.js du projet ; les identifiants et jetons Harvest restent côté serveur. Le projet n’utilise ni base PostgreSQL, ni Prisma, ni couche d’authentification locale.

## Installation

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Variables obligatoires pour le catalogue public :

- `HARVEST_CLIENT_ID`
- `HARVEST_CLIENT_SECRET`
- `HARVEST_ACCESS_KEY`

Pour activer les comptes Parigo, ajouter `HARVEST_SESSION_SECRET`, un secret indépendant généré par exemple avec `openssl rand -base64 48`. Son absence désactive uniquement la surface membre ; elle ne fait pas tomber le catalogue public.

`HARVEST_AUTH_URL`, `HARVEST_SERVICE_URL` et `HARVEST_AUTH_GRANT_TYPE` ont des valeurs officielles par défaut. `HARVEST_DEFAULT_REGION_ID` est facultatif : la région globale du service est découverte automatiquement. Les anciens alias `HM_ServiceAPI_*` ne sont plus pris en charge.

## Commandes

```bash
pnpm dev
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
HARVEST_LIVE_TESTS=1 pnpm test:harvest
HARVEST_MEMBER_MUTATION_TESTS=1 pnpm test:harvest:member
```

La suite Harvest live standard est strictement en lecture. La suite membre exige en plus `HARVEST_TEST_MEMBER_EMAIL` et `HARVEST_TEST_MEMBER_PASSWORD`, ne s’exécute jamais en CI standard et nettoie les ressources qu’elle crée. L’inscription et le reset par e-mail nécessitent une boîte Gmail de test réauthentifiée et restent une validation Preview explicite.

## Architecture

- `src/lib/harvest/` : OAuth, service/guest/member tokens, client résilient, mappers, recherche, assets, session chiffrée et activités membre.
- `src/app/api/` : BFF public de Parigo ; aucun secret Harvest n’est envoyé au navigateur.
- `src/app/` : catalogue, recherche, collections, playlists, comptes et pages institutionnelles.
- `docs/harvest/` : rapport d’audit, inventaire d’endpoints et smoke tests live.

Les données membre sont servies avec `Cache-Control: no-store`. Le catalogue et les référentiels utilisent des caches courts côté BFF. Les URLs audio Harvest restent directes afin de préserver les requêtes Range, le suivi d’audition et les droits du service.
