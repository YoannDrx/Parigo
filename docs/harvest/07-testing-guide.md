# 07 - Guide de test API Harvest

Objectif : verifier rapidement que les credentials Harvest fonctionnent, comprendre les payloads reels Parigo et valider l'architecture proxy Next.js avant de developper le front.

## Pre-requis a obtenir de Harvest

Sans ces informations, aucun test API serieux n'est possible :

| Variable | Exemple attendu | Obligatoire |
|---|---|---|
| `HARVEST_AUTH_URL` | URL `Get Authorised` | Oui |
| `HARVEST_SERVICE_URL` | Base URL Public API | Oui |
| `HARVEST_ACCESS_KEY` | Access key Parigo | Oui |
| `HARVEST_CLIENT_ID` | Client ID OAuth/client credentials | Oui |
| `HARVEST_CLIENT_SECRET` | Client secret | Oui |
| `HARVEST_REGION_ID` | Region de test | Recommande |
| `HARVEST_TEST_IP` | IP pour `getregionbyip` | Optionnel |
| `HARVEST_MEMBER_USERNAME` | Compte membre test | Optionnel |
| `HARVEST_MEMBER_PASSWORD` | Mot de passe test | Optionnel |

Demander en priorite un environnement staging/test. Si Harvest fournit seulement la production, commencer par des endpoints read-only et un membre test dedie.

## Etape 1 - Tester l'access token

```bash
curl -X POST "$HARVEST_AUTH_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=client_credentials" \
  --data-urlencode "client_id=$HARVEST_CLIENT_ID" \
  --data-urlencode "client_secret=$HARVEST_CLIENT_SECRET"
```

Verifier :

- presence d'un token ;
- presence d'un `expires_in` ;
- format exact (`access_token`, `token`, autre) ;
- eventuel `token_type`.

## Etape 2 - Tester le service token

La collection Postman indique :

```bash
curl "$HARVEST_SERVICE_URL/getservicetoken" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "AccessKey: $HARVEST_ACCESS_KEY" \
  -H "Authorization: $HARVEST_AUTHORIZATION"
```

Point a confirmer : `HARVEST_AUTHORIZATION` vaut-il `Bearer {access_token}` ou seulement `{access_token}` ? Tester les deux si Harvest n'a pas repondu.

## Etape 3 - Tester service info

```bash
curl "$HARVEST_SERVICE_URL/getserviceinfo/$HARVEST_SERVICE_TOKEN" \
  -H "Accept: application/json" \
  -H "Authorization: $HARVEST_AUTHORIZATION"
```

Extraire et documenter :

- Asset URL patterns ;
- stream/sample URLs ;
- waveform image URL ;
- waveform datapoint URL ;
- direct download URL ;
- formats de fichiers ;
- formats par defaut.

## Etape 4 - Tester region et guest token

```bash
curl "$HARVEST_SERVICE_URL/getregions/$HARVEST_SERVICE_TOKEN" \
  -H "Accept: application/json" \
  -H "Authorization: $HARVEST_AUTHORIZATION"
```

Puis :

```bash
curl "$HARVEST_SERVICE_URL/getguestmembertoken/$HARVEST_SERVICE_TOKEN/$HARVEST_REGION_ID" \
  -H "Accept: application/json" \
  -H "Authorization: $HARVEST_AUTHORIZATION"
```

Le guest member token sera utilise comme `{memberToken}` pour search/catalogue public.

## Etape 5 - Tester un cloudsearch minimal

Payload de depart :

```json
{
  "SaveSearchHistory": "false",
  "SearchFilters": {
    "SearchType": "Normal",
    "IncludeInactive": "false",
    "MainOnly": "true",
    "AlternateOnly": "false",
    "NearestBPM": "false",
    "NearestDuration": "false",
    "NearestAlternate": "false",
    "ParentSearchHistoryID": "",
    "SearchTermBundle": {
      "St_Keyword_Aggregated": {
        "ExactPhrase": "false",
        "Wildcard": "true",
        "DisableKeywordGroup": "false",
        "OrOperation": "false",
        "Keywords": "piano",
        "Negative": "false"
      }
    },
    "ResultView": {
      "View": "Track",
      "Sort_Predefined": "ReleaseDate_Desc",
      "RankExpression": "",
      "Skip": "0",
      "Limit": "10",
      "Facet_Library": "true",
      "Facet_BPM": "true",
      "Facet_Duration": "true",
      "Facet_Category": "true"
    }
  }
}
```

```bash
curl -X POST "$HARVEST_SERVICE_URL/cloudsearch/$HARVEST_GUEST_MEMBER_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: $HARVEST_AUTHORIZATION" \
  --data @payload-search.json
```

Verifier :

- shape de la reponse ;
- IDs des tracks ;
- facets disponibles ;
- `SearchHistoryID` si present ;
- URLs assets directement presentes ou a reconstruire via `getserviceinfo` ;
- pagination `Skip`/`Limit`.

## Etape 6 - Tester predictive search

```json
{
  "Keyword": "piano",
  "Wildcard": true,
  "ReturnTracks": true,
  "ReturnTracks_MainOnly": true,
  "ReturnTracks_Fields": "DisplayTitle,Keywords,Instrumentation,MusicFor,Mood",
  "ReturnTracks_Limit": 5,
  "ReturnAlbums": true,
  "ReturnAlbums_Fields": "CdCode,DisplayTitle,Description,Keywords",
  "ReturnAlbums_Limit": 5,
  "ReturnLyrics": true,
  "ReturnLyrics_Limit": 5,
  "ReturnFeaturedPlaylists": true,
  "ReturnFeaturedPlaylists_Limit": 5,
  "ReturnLibraries": true,
  "ReturnStyles": true,
  "ReturnCategoryAttributes": true,
  "ReturnRightHolders": true,
  "ReturnKeywords": true
}
```

```bash
curl -X POST "$HARVEST_SERVICE_URL/autocomplete/$HARVEST_GUEST_MEMBER_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: $HARVEST_AUTHORIZATION" \
  --data @payload-autocomplete.json
```

## Etape 7 - Tester details track/album

Apres un `cloudsearch`, recuperer quelques IDs :

```bash
curl -X POST "$HARVEST_SERVICE_URL/gettracks/$HARVEST_GUEST_MEMBER_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: $HARVEST_AUTHORIZATION" \
  --data '{"TrackIDs":["TRACK_ID_1","TRACK_ID_2"]}'
```

Le nom exact du champ (`TrackIDs`, `Tracks`, `IDs`, etc.) doit etre confirme avec le payload Postman ou par essai, car la doc publique donne surtout la structure conceptuelle.

## Etape 8 - Tester membre connecte

Uniquement avec un compte test :

```bash
curl -X POST "$HARVEST_SERVICE_URL/getmembertoken/$HARVEST_SERVICE_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: $HARVEST_AUTHORIZATION" \
  --data "{
    \"UserName\":\"$HARVEST_MEMBER_USERNAME\",
    \"Password\":\"$HARVEST_MEMBER_PASSWORD\",
    \"PersistentLogin\":true,
    \"ReturnMemberDetails\":true
  }"
```

Puis tester :

- `GET /getmember/{memberToken}` ;
- `GET /getfavourites/{memberToken}` ;
- `GET /getmemberplaylistsnotracks/{memberToken}` ;
- `POST /addmemberplaylist/{memberToken}` uniquement en staging ou compte test confirme.

## Etape 9 - Tester downloads sans casser la prod

Ne tester un vrai download que si Harvest confirme que le compte test peut le faire.

Commencer par validation :

```json
{
  "Identifier": "TRACK_ID",
  "ContentIDs": "",
  "DownloadType": "track",
  "Format": ["FORMAT_ID"],
  "TrimEndSecs": 0,
  "TrimStartSecs": 0,
  "IncludeVersionCheck": false
}
```

Endpoint :

```http
POST /validatemusicdownloadrequest/{memberToken}
```

Ne pas appeler `getmusicdownload` en production sans confirmation, car cela peut declencher tracking, limites, email ou queue.

## Script de smoke test

Un script TypeScript est disponible :

```bash
pnpm tsx docs/harvest/examples/harvest-smoke-test.ts
```

Il lit les variables d'environnement, obtient l'access token, le service token, teste `getserviceinfo`, puis tente region/guest/search si les variables optionnelles sont disponibles.

## Checklist d'observation

Pour chaque appel, noter :

- URL logique appelee ;
- methode ;
- headers requis ;
- status HTTP ;
- code erreur Harvest si present ;
- shape JSON/XML reelle ;
- temps de reponse ;
- presence de pagination ;
- presence de facets ;
- presence d'Asset URLs ;
- tokens retournes et expiry ;
- champs absents par rapport au besoin UI.

Ajouter ensuite les payloads reels dans une doc locale separee, sans secrets ni tokens.

## Regles de securite pendant les tests

- Ne jamais commiter `.env`.
- Ne jamais coller de token dans Slack/email.
- Ne jamais ouvrir les endpoints Harvest directement depuis le navigateur avec un token dans l'URL.
- Ne pas logger les URLs completes contenant tokens.
- Flouter/supprimer les IDs sensibles si les payloads sortent du repo prive.
- En production, tout passera par un proxy Next.js serveur.
