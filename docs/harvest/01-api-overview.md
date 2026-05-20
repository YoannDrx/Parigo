# 01 - Vue d'ensemble Harvest Media API

## Perimetre officiel

Le portail Harvest Media API annonce deux grands endpoints fonctionnels : Public API et Export API. La collection Postman publiee contient en realite cinq groupes :

| Groupe | Entrees | Usage pour Parigo |
|---|---:|---|
| Public API | 195 | Front public, catalogue, recherche, membres, playlists, downloads, contenu, e-commerce |
| Export API | 22 | Livraison de metadata/assets vers tiers ; interessant pour reversibilite et migration |
| Import API | 25 | Creation/update/publish de labels, albums, tracks, assets ; plutot ingestion back-office |
| Agent API | 17 | Workspace/management cote label/agent ; acces sensible, pas front public |
| Additional Information | 4 | Glossaire, response codes, rate limiting, health |

Pour le nouveau site Parigo, le perimetre prioritaire est la Public API. L'Export API doit etre etudiee separement pour la portabilite des donnees et les exports de catalogue.

## URLs et variables a obtenir

Les collections Postman utilisent des variables, pas des valeurs publiques. Il faut demander a Harvest les valeurs suivantes :

| Variable Postman | Role |
|---|---|
| `HM_ServiceAPI_AuthUrl` | Endpoint OAuth/client credentials pour obtenir l'access token Public API |
| `HM_ServiceAPI_URL` | Base URL Public API, probablement un service type `HMP-WS.svc` |
| `HM_ServiceAPI_Key` | Access key Public API liee au compte Parigo |
| `HM_ServiceAPI_AuthClientID` | Client ID pour `Get Authorised` |
| `HM_ServiceAPI_AuthClientSecret` | Client secret pour `Get Authorised` |
| `HM_ExportAPI_URL`, `HM_ExportAPI_Key` | Base URL + key Export API |
| `HM_ImportAPI_URL`, `HM_ImportAPI_Key` | Base URL + key Import API |
| `HM_IntegrationAPI_URL`, `HM_IntegrationAPI_Key` | Base URL + key Agent/Integration/FLEX |

La vieille hypothese `GET /getservicetoken/{api_key}` n'est pas celle de la collection Postman actuelle. La collection indique :

```http
POST {HM_ServiceAPI_AuthUrl}
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
client_id={client_id}
client_secret={client_secret}
```

puis :

```http
GET {HM_ServiceAPI_URL}/getservicetoken
Accept: application/json
Authorization: {access_token}
AccessKey: {HM_ServiceAPI_Key}
Content-Type: application/json
```

## Familles de tokens

Harvest distingue plusieurs niveaux de tokens :

| Token | Obtenu via | Porteur | Usage |
|---|---|---|---|
| Access token | `POST Get Authorised` | Serveur Parigo | Autorise l'application a demander un service token |
| Service token | `GET /getservicetoken` | Serveur Parigo | Token de service, partageable cote application, expire |
| Guest member token | `GET /getguestmembertoken/{serviceToken}/{RegionID}` | Session visiteur | Token visiteur regionalise pour search/assets/usage tracking |
| Member token | `POST /getmembertoken/{serviceToken}` | Session utilisateur connecte | Playlists, favoris, downloads, profil, historique |
| Persistent login token | `POST /getmembertoken` avec `PersistentLogin=true` | Cookie longue duree | Remember-me ; a valider/renouveler |
| SSO token | `GET /getssotoken/{memberToken}` | Flow SSO | Token single-use optionnel |
| Management token | `POST /getmanagementtoken/{serviceToken}` | Back-office serveur | Actions admin sensibles |
| Export access/session token | Export API | Jobs serveur | Exports workspace et downloads |
| Import access/session token | Import API | Jobs serveur | Ingestion/publication |

## Pourquoi le memberToken apparait partout

Un point important : beaucoup d'endpoints de lecture catalogue n'utilisent pas `{serviceToken}`, mais `{memberToken}` :

```http
GET /getlibraries/{memberToken}
GET /getalbumtracks/{memberToken}/{AlbumID}/mainonly
POST /cloudsearch/{memberToken}
POST /autocomplete/{memberToken}
```

Cela ne veut pas dire que l'utilisateur doit forcement etre connecte. Pour un visiteur anonyme, le front doit obtenir un guest member token. Harvest recommande cette approche pour associer les Asset URLs et le tracking usage au bon contexte de region/session.

## Regions et tracking usage

La documentation "Tracking Usage & Asset URLs" donne deux chemins :

| Scenario | Flow recommande |
|---|---|
| Site monoregion | `getserviceinfo` au boot, puis `getmember` apres login pour remplacer les Asset URLs par celles du membre |
| Site multiregion | `getregionbyip` -> `getguestmembertoken` -> `getmember` guest ; apres login, `getmember` du membre connecte |

Le point technique cle : les Asset URLs ne sont pas seulement des chemins CDN. Elles participent au tracking de l'usage (samples, streams, downloads). Il ne faut donc pas inventer les URLs a la main ; il faut utiliser les patterns renvoyes par Harvest.

## Recherche

Le moteur principal est :

```http
POST /cloudsearch/{memberToken}
```

La recherche utilise un objet `SearchFilters` compose de :

- options top-level (`SearchType`, `IncludeInactive`, `MainOnly`, `LibraryType`, `HasStems`, etc.) ;
- `SearchTermBundle` pour le filtre courant ;
- `PreviousSearchTermBundles` pour les recherches "within results" ;
- `ResultView` pour le type de resultat, pagination, tri et facets.

FLEX montre des usages plus riches que la doc Harvest de base :

- vues : `Track`, `Album`, `Library`, `Playlist`, `Style`, `RightHolder` ;
- filtres : keyword, album, audio, BPM, category, duration, library, playlist, release date, right holder, style, style group, track ;
- facets : library, album, style, category, BPM, duration, composer, release year ;
- tris : `ReleaseDate_Desc`, `Alphabetic_Asc`, `Custom_Asc`, `PureRandom`, `Random`, `EvokeRanking`, `RankExpression`.

## Search Similar / IA

Harvest documente trois fournisseurs :

| Provider | Modes visibles |
|---|---|
| AIMS | TrackID, upload audio, URL, prompt |
| Cyanite | TrackID, upload audio, URL, free text |
| Harmix | TrackID, upload audio, URL, prompt |

Tous passent finalement par `POST /cloudsearch/{memberToken}` avec `SearchTermBundle.St_Audio`, sauf les etapes d'upload/ingestion :

- `POST /getpresigneduploadurl/{memberToken}`
- `POST /confirmpresignedupload/{memberToken}`
- `POST /getexternalaudiobyurl/{memberToken}`
- `POST /getexternalaudiostatus/{memberToken}` pour Cyanite

Harvest precise que ces services sont specialises, demandent l'indexation du compte, et peuvent avoir des couts d'integration/usage. Pour Parigo, il faut confirmer par ecrit quels providers sont actifs et factures.

## Export / Import / Agent

Ces API ne doivent pas etre appelees depuis le front public.

### Export API

Interet principal pour Parigo :

- verifier qu'un export complet metadata/assets est possible ;
- obtenir les formats disponibles ;
- obtenir des downloads workspace ;
- tagger ou mettre a jour certaines categories dans des workflows d'export.

Le flow Export est :

```text
access key -> access token -> session token -> workspace methods
```

### Import API

Permet de creer/mettre a jour/publier :

- labels/libraries ;
- albums ;
- tracks ;
- assets via URL pre-signee, URL externe ou S3.

Ce perimetre peut devenir critique si Parigo veut automatiser son ingestion au lieu de passer par le back-office Harvest.

### Agent API

Expose des operations workspace et management (`getmanagementusertoken`, downloads management, tags album/library). A isoler strictement cote serveur si jamais il est utilise.

## Architecture recommandee pour Parigo

```text
Next.js Server
  - stocke client_id/client_secret/access_key en env
  - obtient et renouvelle access token
  - obtient et renouvelle service token
  - resout region -> guest member token
  - gere member token en cookie httpOnly
  - proxy toutes les requetes Harvest

Next.js Client
  - appelle seulement /api/parigo/*
  - ne voit jamais client_secret/access_key/service_token
  - peut recevoir des metadata et Asset URLs deja autorisees
```

## Consequences pour le developpement

- Le premier livrable technique doit etre un "Harvest adapter" serveur, pas une integration directe dans les composants React.
- Les tokens dans l'URL imposent une vigilance logs : ne pas logger les URLs Harvest completes en production.
- Le cache doit distinguer : service-level data, guest region data, member-specific data.
- Les pages publiques search/catalogue devront probablement etre SSR/dynamique ou ISR controlee, car les Asset URLs et le tracking usage dependent des tokens/regions.
- Sans webhook visible, les mises a jour catalogue devront etre gerees par revalidation planifiee ou invalidation manuelle.
