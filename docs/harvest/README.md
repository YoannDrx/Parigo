# Documentation Harvest Media API pour Parigo

Ce dossier contient le livrable consolide pour la documentation Harvest Media API, au meme format que le dossier AIMS : rapport Markdown, HTML, PDF et inventaire CSV des endpoints.

Les anciennes notes numerotees `01` a `09` ont ete consolidees dans le rapport principal. Le dossier `postman/` vide a ete supprime. Les scripts de test API sont conserves dans `smoke-tests/` pour le moment ou Harvest fournira les acces.

## Sources verifiees

| Documentation | Collection | URL |
|---|---:|---|
| Harvest Media API | `8325040/SVYouLCf` | <https://developer.harvestmedia.net/> |
| FLEX | `8325040/UzQxP58G` | <https://flex.developer.harvestmedia.net/> |

Extraction Harvest Media API du 26 mai 2026 :

- Collection Postman publique : `1fdbc3d4-864c-498a-ae3e-ae52d2c5b256`
- Published ID : `SVYouLCf`
- Version tag : `latest`
- Version Postman Documenter : `8.11.2`

La cle API Postman personnelle n'est pas stockee dans le repo et n'a pas ete necessaire pour generer ces fichiers.

## Fichiers

| Fichier | Role |
|---|---|
| [rapport-harvest-api.md](./rapport-harvest-api.md) | Rapport Markdown lisible directement dans le repo |
| [rapport-harvest-api.pdf](./rapport-harvest-api.pdf) | Rapport PDF principal a partager |
| [rapport-harvest-api.html](./rapport-harvest-api.html) | Source HTML du PDF |
| [endpoint-inventory.csv](./endpoint-inventory.csv) | Inventaire CSV des 277 entrees documentees, dont 255 endpoints HTTP |
| [smoke-tests/](./smoke-tests/) | Script de smoke test a lancer quand les credentials Harvest seront disponibles |

## Couverture

| Metrique | Valeur |
|---|---:|
| Entrees documentees | 277 |
| Endpoints HTTP | 255 |
| Pages guide / INFO | 22 |
| Routes HTTP methode + chemin uniques | 222 |
| GET / POST / DELETE | 112 / 140 / 3 |

Le rapport couvre `Public API`, `Export API`, `Import API`, `Agent API / Integration API` et les pages d'informations additionnelles : codes fonctionnels, rate limits et health endpoint.

## Smoke test

Le script de test minimal est ici :

```bash
pnpm tsx docs/harvest/smoke-tests/harvest-api-smoke-test.ts
```

Il valide le flux de base : access token, service token, service info, region, guest member token et recherche minimale si les variables optionnelles sont disponibles.

Variables minimales :

```bash
export HARVEST_AUTH_URL="..."
export HARVEST_SERVICE_URL="..."
export HARVEST_ACCESS_KEY="..."
export HARVEST_CLIENT_ID="..."
export HARVEST_CLIENT_SECRET="..."
```

## Notes d'integration

- `client_id`, `client_secret`, `AccessKey`, access token et service token doivent rester cote serveur.
- Les appels front Parigo doivent passer par une route serveur Parigo qui normalise les reponses Harvest.
- Les Asset URLs renvoyees par Harvest doivent etre utilisees selon la documentation pour conserver le tracking usage.
- FLEX reste une source externe utile pour comparer des scenarios d'ecran, mais ce dossier conserve uniquement le livrable Harvest API consolide et les smoke tests.
