# 09 - Export API, Import API et Agent API

Ces API ne sont pas le coeur du front public Parigo, mais elles sont importantes pour trois sujets :

- portabilite/reversibilite des donnees ;
- automatisation de l'ingestion catalogue ;
- comprehension des droits et workflows internes Harvest/FLEX.

## Export API

Usage officiel : envoyer du contenu a des clients, networks et tiers pour automatiser la livraison audio + metadata sans FTP manuel. C'est probablement l'API la plus pertinente pour evaluer une sortie ou un backup de catalogue.

### Flow d'auth Export

```text
GET /getaccesstoken/{ExportAccessKey}
  -> AccessToken

GET /getsessiontoken/{AccessToken}/{Username}/{Password}?accessaccountid={AccessAccountID}
  -> SessionToken

Appels workspace avec {SessionToken}
```

### Endpoints Export

| Methode | Nom | Endpoint |
|---|---|---|
| INFO | Implementation Guide - Getting Started | `-` |
| GET | Get Access Token | `/getaccesstoken/{HM_ExportAPI_Key}` |
| GET | Get Access Info (Download formats & URL) | `/getaccessinfo/{AccessToken}` |
| GET | Get Access Accounts | `/getaccessaccounts/{AccessToken}` |
| GET | Get Session Token | `/getsessiontoken/{AccessToken}/{Username}/{Password}?accessaccountid={AccessAccountID}` |
| GET | Expire Session Token | `/expiretoken/{SessionToken}` |
| GET | Validate Access Token | `/validateaccesstoken/{AccessToken}` |
| GET | Validate Session Token | `/validatesessiontoken/{AccessToken}` |
| GET | Expire Access Token | `/expireaccesstoken/{AccessToken}` |
| INFO | Album Workflows | `-` |
| INFO | Track Workflows | `-` |
| INFO | Download INFO | `-` |
| INFO | Metadata INFO | `-` |
| GET | Get Labels/Libraries | `/getlibraries/{SessionToken}` |
| GET | Get Labels/Libraries All States | `/getlibrariesallstates/{SessionToken}` |
| POST | Get Albums By Workspace Status | `/getalbumsbyworkspacestatus/{SessionToken}` |
| GET | Get Workspace Items By Album | `/getworkspacealbumitems/{SessionToken}/{AlbumID}/{Format}` |
| GET | Get Workspace Items By Track | `/getworkspacetrackitems/{SessionToken}/{TrackID}/{Format}` |
| POST | Get Workspace Download | `/getmusicdownload/{SessionToken}` |
| POST | Set Album Tag | `/setalbumtag/{SessionToken}` |
| POST | Remove Album Tag | `/removealbumtag/{SessionToken}` |
| POST | Upsert Track Categories | `/bulkupserttrackcategories/{SessionToken}` |

### Questions Export a poser

- Peut-on obtenir des credentials Export API pour Parigo ?
- L'Export API peut-elle exporter tout le catalogue Parigo ou seulement un workspace/statut ?
- Quels formats metadata sont disponibles ?
- Les assets audio/artworks/stems sont-ils inclus ?
- Les donnees membres/playlists/favourites/tags/comments sont-elles exportables via Export API ou un autre mecanisme ?
- Quels couts et delais pour un export complet ?

## Import API

Usage officiel : creation/update/publish de libraries, albums, tracks et assets. C'est l'API a utiliser si Parigo veut automatiser l'arrivee de nouveaux albums/titres dans Harvest.

### Flow d'auth Import

```text
GET /getaccesstoken
  headers: AccessKey + Accept application/json
  -> AccessToken

GET /getsessiontoken/{AccessToken}/{Username}/{Password}
  -> SessionToken

Appels workspace avec {SessionToken}
```

### Endpoints Import

| Methode | Nom | Endpoint |
|---|---|---|
| INFO | Implementation Guide - Getting Started | `-` |
| GET | Get Access Token | `/getaccesstoken` |
| GET | Get Session Token | `/getsessiontoken/{AccessToken}/{Username}/{Password}` |
| GET | Expire Session Token | `/expiretoken/{SessionToken}` |
| INFO | Primary Workflows | `-` |
| GET | Get Attribute Types | `/getattributetypes/{SessionToken}` |
| GET | Get Labels/Libraries | `/getlibraries/{SessionToken}` |
| POST | Create Label/Library | `/library/{SessionToken}/insert` |
| POST | Update Label/Library | `/library/{SessionToken}/update` |
| POST | Create Album | `/album/{SessionToken}/insert` |
| POST | Update Album | `/album/{SessionToken}/update` |
| DELETE | Remove Album | `/album/{SessionToken}/{AlbumIdentity}` |
| POST | Get Albums By Workspace State | `/getalbumsbyworkspacestate/{SessionToken}` |
| GET | Publish Album & Tracks | `/album/{SessionToken}/{AlbumIdentity}/publish` |
| POST | Create Track | `/track/{SessionToken}/insert` |
| POST | Update Track | `/track/{SessionToken}/update` |
| DELETE | Remove Track | `/track/{SessionToken}/{TrackIdentity}` |
| POST | Get Tracks By Workspace Album & State | `/getalbumtracksbyworkspacestate/{SessionToken}` |
| GET | Publish Track On Imported Album | `/track/{SessionToken}/{TrackIdentity}/publish` |
| GET | Unpublish Track On Imported Album | `/track/{SessionToken}/{TrackID}/unpublish` |
| POST | Move Tracks On Import Album | `/track/{SessionToken}/move` |
| POST | Get Asset Upload URL | `/getpresigneduploadurl/{SessionToken}` |
| POST | Confirm Asset Upload Complete | `/confirmpresignedupload/{SessionToken}` |
| POST | Set External Asset (URL) | `/setasseturl/{SessionToken}` |
| POST | Set External Asset (Amazon S3) | `/setexternals3asset/{SessionToken}` |

### Questions Import a poser

- Parigo a-t-il aujourd'hui un workflow Import API ou tout passe-t-il par Harvest Admin ?
- Les credentials Import peuvent-ils etre fournis en staging ?
- Quels `Attribute Types` existent pour Parigo ?
- Les assets peuvent-ils etre fournis par URL externe/S3 ou uniquement upload pre-signe ?
- Quelles validations Harvest applique avant publish ?
- Peut-on publier un track sans publier l'album entier ?

## Agent / Integration API

L'Agent API est proche d'une API workspace/management pour labels/agents. FLEX utilise aussi des variables `HM_IntegrationAPI_*` pour le CMS et certains flux.

### Flow d'auth Agent

```text
POST {HM_IntegrationAPI_AuthUrl}
  grant_type=client_credentials
  client_id=...
  client_secret=...
  -> AccessToken

GET /getservicetoken
  headers: Authorization + AccessKey
  -> IntegrationToken
```

### Endpoints Agent

| Methode | Nom | Endpoint |
|---|---|---|
| POST | Get Authorised | `{HM_IntegrationAPI_AuthUrl}` |
| GET | Get Service Token | `/getservicetoken` |
| GET | Get Service Token Info | `/getservicetokeninfo/{IntegrationToken}` |
| GET | Get Service Info (Download formats & URL) | `/getserviceinfo/{IntegrationToken}` |
| GET | Expire Service Token | `/expiretoken/{IntegrationToken}` |
| INFO | Primary Workflows | `-` |
| GET | Get Labels/Libraries | `/getlibraries/{IntegrationToken}` |
| POST | Get Labels/Libraries By Tag | `/getlibrariesbytag/{IntegrationToken}` |
| POST | Get Albums by Workspace Status | `/getalbumsbyworkspacestatus/{IntegrationToken}` |
| GET | Get Tracks By Workspace Album | `/getworkspacealbumtracks/{IntegrationToken}/{AlbumID}/{Format}` |
| POST | Get Tracks | `/gettracks/{IntegrationToken}` |
| GET | Get Management User Token | `/getmanagementusertoken/{IntegrationToken}/{username}/{password}` |
| POST | Get Management User Download | `/getmanagementuserdownload/{IntegrationToken}` |
| POST | Set Album Tag | `/setalbumtag/{IntegrationToken}` |
| POST | Remove Album Tag | `/removealbumtag/{IntegrationToken}` |
| POST | Set Library Tag | `/setlibrarytag/{IntegrationToken}` |
| POST | Remove Library Tag | `/removelibrarytag/{IntegrationToken}` |

## Implication pour la refonte Parigo

| Besoin | API probable |
|---|---|
| Nouveau front public catalogue/search | Public API |
| Reprise des playlists/members historiques | Public API + export specifique a confirmer |
| Export complet en cas de sortie Harvest | Export API + demande contractuelle |
| Automatisation d'ingestion | Import API |
| Back-office avance ou reprise de fonctions FLEX CMS | Agent/Integration API |

Le front public ne doit jamais utiliser Import/Export/Agent directement. Ces APIs doivent etre reservees a des jobs serveur, back-office internes ou scripts d'administration.
