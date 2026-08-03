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
| [audit-integration-2026-07-29.md](./audit-integration-2026-07-29.md) | Audit live corrigé, centré sur les écarts à transmettre à Harvest |
| [documentation-conformance-audit-2026-08-03.md](./documentation-conformance-audit-2026-08-03.md) | Audit complet de conformité de la documentation `latest` et des contrats live sûrs |
| [code-documentation-conformance-matrix-2026-08-03.csv](./code-documentation-conformance-matrix-2026-08-03.csv) | Comparaison ligne par ligne des 257 contrats officiels avec les 87 endpoints documentés utilisés par le code Parigo, plus l'appel non documenté de suppression de compte |
| [email-draft-api-documentation-feedback-2026-08-03.md](./email-draft-api-documentation-feedback-2026-08-03.md) | Brouillon de réponse à Roland et Peter avec les erreurs reproductibles |
| [runtime-route-matrix.csv](./runtime-route-matrix.csv) | Matrice UI → BFF → Harvest et preuves de persistance |
| [last-audit-run.json](./last-audit-run.json) | Synthèse expurgée du dernier run |
| [rapport-harvest-api.md](./rapport-harvest-api.md) | Rapport Markdown lisible directement dans le repo |
| [rapport-harvest-api.pdf](./rapport-harvest-api.pdf) | Rapport PDF principal a partager |
| [rapport-harvest-api.html](./rapport-harvest-api.html) | Source HTML du PDF |
| [endpoint-inventory.csv](./endpoint-inventory.csv) | Inventaire CSV des 279 entrees documentees, dont 257 endpoints HTTP |
| [smoke-tests/](./smoke-tests/) | Script de smoke test a lancer quand les credentials Harvest seront disponibles |

## Couverture

| Metrique | Valeur |
|---|---:|
| Entrees documentees | 279 |
| Endpoints HTTP | 257 |
| Pages guide / INFO | 22 |
| Routes HTTP methode + chemin uniques | 222 |
| GET / POST / DELETE | 111 / 143 / 3 |

La campagne de conformité en lecture peut être rejouée avec :

```bash
pnpm audit:harvest:public-read
```

L'inventaire officiel `latest`, les classifications et la matrice code ↔ documentation
peuvent être régénérés ensemble avec :

```bash
pnpm audit:harvest:docs
```

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
