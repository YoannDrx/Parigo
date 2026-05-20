# Documentation Harvest Media & FLEX pour Parigo

Cette documentation regroupe l'analyse technique des deux portails transmis par Harvest :

- Harvest Media API : <https://developer.harvestmedia.net/>
- FLEX : <https://flex.developer.harvestmedia.net/>

Elle est destinee au cadrage d'un nouveau front Next.js Parigo qui consommerait Harvest comme back-end catalogue, recherche, membres, playlists, assets, downloads et eventuellement licensing/e-commerce.

## Lecture rapide

Le constat principal est le suivant : Harvest publie une API large et exploitable, mais l'integration n'est pas un simple appel REST moderne. Le flux officiel est en deux temps : obtention d'un access token via `Get Authorised`, puis obtention d'un service token via `Get Service Token`, avec `Authorization` et `AccessKey` en headers. Ensuite, beaucoup d'appels front ne se font pas avec le service token directement, mais avec un `memberToken`, y compris pour les visiteurs anonymes via un guest member token regionalise.

FLEX, de son cote, n'est pas une documentation de code source. C'est une collection Postman de scenarios d'ecrans : initial load, recherche, albums, playlists, membre, partage, e-commerce, spotlight, etc. Elle montre comment FLEX orchestre les endpoints Harvest. Elle confirme que FLEX repose massivement sur la Public API (`cloudsearch`, `autocomplete`, `gettracks`, playlists, downloads), mais elle revele aussi des endpoints supplementaires non presents dans la documentation Harvest generique.

## Sources verifiees

Les fichiers ci-dessous s'appuient sur les collections Postman publiques chargees le 23 avril 2026 :

| Documentation | Collection | URL |
|---|---:|---|
| Harvest Media API | `8325040/SVYouLCf` | <https://developer.harvestmedia.net/> |
| FLEX | `8325040/UzQxP58G` | <https://flex.developer.harvestmedia.net/> |

Metadonnees utiles :

- Harvest Media API : collection publique, publiee le 29 juin 2020, version Postman documenter `8.10.1`.
- FLEX : documentation publiee le 19 juillet 2022, indiquee `public: true` par Postman mais `isPublicCollection: false` dans les metadonnees.
- Les deux portails n'exposent aucun environnement Postman public ; toutes les valeurs de variables doivent etre fournies par Harvest.

## Arborescence

| Fichier | Role |
|---|---|
| [01-api-overview.md](./01-api-overview.md) | Vue d'ensemble des API Harvest, URLs, tokens et architecture recommandee |
| [02-authentication.md](./02-authentication.md) | Auth officielle : access token, service token, guest/member token, SSO, management |
| [03-public-api-endpoints.md](./03-public-api-endpoints.md) | Cartographie fonctionnelle des 195 entrees Public API |
| [04-data-model.md](./04-data-model.md) | Modele conceptuel des donnees exposees : catalogue, recherche, membres, assets, e-commerce |
| [05-flex-platform.md](./05-flex-platform.md) | Analyse de la documentation FLEX, scenarios d'ecrans, ecarts avec Harvest Public API |
| [06-errors-limits-health.md](./06-errors-limits-health.md) | Codes d'erreur, rate limits, health endpoint, monitoring |
| [07-testing-guide.md](./07-testing-guide.md) | Procedure concrete pour commencer les tests API avec credentials Harvest |
| [08-open-questions.md](./08-open-questions.md) | Questions a poser a Harvest avant chiffrage engageant |
| [09-export-import-agent-apis.md](./09-export-import-agent-apis.md) | Details Export API, Import API et Agent API |
| [examples/](./examples/) | Exemples executables ou copiables pour smoke tests |

## Ce qui est confirme

| Sujet | Statut | Commentaire |
|---|---|---|
| Public API exploitable pour un front custom | Confirme | La doc Harvest dit explicitement que la Public API sert a construire des moteurs de recherche musicaux et outils de management custom. |
| Auth en deux etapes | Confirme | `Get Authorised` fournit un access token ; `Get Service Token` fournit un service token avec `Authorization` + `AccessKey`. |
| Token dans le path | Confirme | Les endpoints utilisent `/{serviceToken}`, `/{memberToken}` ou `/{managementToken}` dans l'URL. |
| Guest member token | Confirme | `getguestmembertoken/{serviceToken}/{RegionID}` permet d'obtenir un token visiteur regionalise. |
| Recherche principale | Confirme | `POST /cloudsearch/{memberToken}` est le coeur de la recherche, y compris similarite IA. |
| Predictive search | Confirme | `POST /autocomplete/{memberToken}`. |
| Assets et tracking usage | Confirme | `getserviceinfo` et `getmember` renvoient des patterns d'Asset URLs ; Harvest demande de les utiliser pour tracker les usages. |
| Rate limit Public API | Confirme | 3600 requetes / 5 minutes / IP apres auth. |
| Health endpoint | Confirme | `https://service.harvest.music/health`. |
| FLEX = orchestration de scenarios | Confirme | 335 entrees dans la collection FLEX, classees par pages et actions. |

## Points critiques non confirmes

| Sujet | Risque |
|---|---|
| Sandbox ou staging Parigo | Non visible dans les collections publiques. Il faut un acces officiel distinct de la prod. |
| Credentials exacts Parigo | A demander : auth URL, service URL, access key, client ID, client secret, regions, eventuels comptes test. |
| Parite FLEX/Public API | FLEX contient des endpoints absents de la doc Harvest generique ; il faut confirmer qu'ils sont accessibles au developpeur externe. |
| Webhooks | Aucun webhook visible. Sans webhook, synchronisation par polling/cache/revalidation. |
| Export complet/reversibilite | L'Export API livre metadata + assets par workflows, mais ce n'est pas documente comme un dump complet Parigo. |
| Couts IA | AIMS/Cyanite/Harmix sont presentes comme services specialises, indexation requise, couts associes. |

## Hypothese d'architecture Parigo

Le front ne doit jamais appeler Harvest directement depuis le navigateur. L'architecture cible est :

```text
Navigateur Parigo
  -> Next.js app / API routes / server actions
    -> cache access token + service token
    -> obtention guest/member token selon session/region
    -> appels Harvest Public API
      -> catalogue, recherche, assets, playlists, downloads
```

Regles :

- `client_id`, `client_secret`, `AccessKey`, access token et service token restent cote serveur.
- Le `memberToken` doit etre traite comme une session sensible ; stockage recommande en cookie `httpOnly`, `Secure`, `SameSite=Lax`.
- Les Asset URL renvoyees par Harvest peuvent etre exposees si elles sont prevues pour le front, mais leur duree de vie/cache doit etre testee.
- Toute strategie SSG/ISR doit respecter le rate limit IP et l'absence de webhook.

## Premier objectif de test

La premiere session technique doit valider, dans cet ordre :

1. `POST {HM_ServiceAPI_AuthUrl}` avec `grant_type=client_credentials`.
2. `GET {HM_ServiceAPI_URL}/getservicetoken` avec headers `Authorization` et `AccessKey`.
3. `GET /getserviceinfo/{serviceToken}`.
4. `GET /getregionbyip/{serviceToken}?ip=...` ou `GET /getregions/{serviceToken}`.
5. `GET /getguestmembertoken/{serviceToken}/{RegionID}`.
6. `POST /cloudsearch/{guestMemberToken}` sur une recherche minimale.
7. `POST /autocomplete/{guestMemberToken}`.

Le guide detaille est dans [07-testing-guide.md](./07-testing-guide.md).
