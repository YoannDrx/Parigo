# Documentation AIMS API pour Parigo

Cette documentation contient le compte-rendu d'exploration de la documentation publique AIMS Similarity Search pour preparer une future barre de recherche IA dans Parigo.

Sources consultees le 20 mai 2026 :

- Documentation publique : https://docs.aimsapi.com/
- Base API : https://api.aimsapi.com/v1/
- Collection Postman : e25a9929-95ab-4b8d-a6c9-bd9fa1d120a1, publishedId S17qTprj, tag latest

Fichiers :

| Fichier | Role |
|---|---|
| [rapport-aims-api.md](./rapport-aims-api.md) | Rapport Markdown lisible directement dans le repo |
| [rapport-aims-api.pdf](./rapport-aims-api.pdf) | Rapport PDF principal |
| [rapport-aims-api.html](./rapport-aims-api.html) | Source HTML du PDF |
| [endpoint-inventory.csv](./endpoint-inventory.csv) | Inventaire CSV des 182 requetes documentees |

Constat rapide : AIMS expose un socle de recherche similaire et des addons payants. Pour une barre de recherche IA Parigo, le candidat principal est `POST /v1/search` en mode Unified Search ou Prompt Search, a confirmer contractuellement avec AIMS.
