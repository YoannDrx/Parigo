# 06 - Erreurs, rate limits et health status

## Codes d'erreur API

La documentation Harvest liste les codes suivants.

| Code | Signification | Traitement recommande |
|---:|---|---|
| 1 | Corrupt Input Data | Verifier body, IDs, champs obligatoires ; erreur developpeur ou payload invalide |
| 2 | Incorrect Input Data | Semblable au code 1 ; verifier valeurs et formats |
| 3 | Access Denied | Verifier credentials, scopes, droits compte Parigo ; escalade Harvest |
| 4 | Internal Operation Error | Retenter une fois si idempotent, logger request ID si disponible, escalade Harvest |
| 5 | Invalid Token | Renouveler service/member token puis rejouer une seule fois |
| 6 | Invalid Login Details | Afficher erreur login generique |
| 7 | Member Does Not Exist | Verifier ID/user ; possible compte supprime/non active |
| 8 | Playlist Does Not Exist | Verifier playlist ID |
| 9 | Track Not Found | Verifier track ID, statut actif, region |
| 10 | Album Not Found | Verifier album ID, statut actif, region |
| 11 | Playlist Not Found | Verifier playlist ID |
| 12 | Downloads Disabled | Membre non approuve pour download |
| 13 | Downloads Not Allowed | Membre/groupe non configure pour download |
| 14 | Download Limit Reached | Afficher limite atteinte ; contacter Parigo/admin |
| 15 | Download Added To Queue | Etat normal pour download asynchrone/email |
| 16 | File Not Found | Asset manquant ; fallback UI + escalade si catalogue |
| 17 | Record Already Exists | Collision sur create ; afficher ou recuperer existant |
| 18 | Not Activated | Feature non activee sur le compte ; demande Harvest |
| 19 | Cloud Search Not Available | Search pas active/configuree ; bloquant pour front |
| 20 | Not All Downloads Were Added to Queue | Download partiel ; afficher et logger |
| 21 | Access Token Expired | Renouveler access token puis service token si necessaire |
| 22 | Playlist Category Does Not Exist | Verifier category/folder ID |

## Rate limits officiels

Harvest applique les limites apres authentification, par IP.

| API | Rate limit |
|---|---:|
| Public API | 3600 requetes / 5 minutes / IP |
| Export API | 300 requetes / 5 minutes / IP |
| Import API | 200 requetes / 5 minutes / IP |
| Integration/Agent API | 300 requetes / 5 minutes / IP |

Important : le rate limit est IP-based. Pour la Public API, cela signifie que les 3600 requetes ne sont pas partagees par access token, mais par IP emettrice. Si tout passe par Vercel/Next.js server, l'IP de sortie peut devenir un goulot.

## Reponse en cas de depassement

La documentation annonce :

- status code HTTP `403` ;
- body type : "The request could not be satisfied. Request blocked. We can't connect to the server for this app or website at this time."
- blocage de la requete courante et des requetes suivantes jusqu'a la fin de la fenetre de 5 minutes.

## Implications pour Parigo

### Cache obligatoire

Les donnees suivantes doivent etre cachees :

- `getserviceinfo` ;
- `getregions`, `getcountries` ;
- styles/categories ;
- libraries ;
- pages catalogue publiques ;
- details albums/tracks frequemment consultes ;
- facets statiques ou semi-statiques.

### Pas de boucle aggressive

Eviter :

- autocomplete declenche a chaque frappe sans debounce ;
- waveform image regeneree a chaque resize ;
- polling court pour downloads/status ;
- recherche relancee a chaque toggle sans batch ;
- build SSG qui parcourt tout le catalogue sans throttling.

### Exponential backoff

Harvest recommande l'exponential backoff pour Export/Import/Integration API. Il faut l'appliquer aussi aux flows asynchrones Public API.

Pattern :

```text
retries = 0
wait 2^retries * 100 ms
si SUCCESS -> stop
si NOT_READY ou THROTTLED -> retry
sinon -> stop
max retries et max delay obligatoires
```

## Health endpoint

Endpoint officiel :

```http
GET https://service.harvest.music/health
```

Exemple de structure :

```json
{
  "metrics": {
    "apdex": [
      { "type": "Search", "value": "0.97", "description": "Excellent" },
      { "type": "GeoIP", "value": "1.00", "description": "Excellent" },
      { "type": "Data", "value": "0.98", "description": "Excellent" },
      { "type": "Cache", "value": "0.82", "description": "Fair" },
      { "type": "Asset", "value": "0.97", "description": "Excellent" },
      { "type": "Download", "value": "0.82", "description": "Fair" }
    ]
  }
}
```

Metriques :

| Type | Impact si degrade |
|---|---|
| Search | Recherche metadata et predictive search lentes ou indisponibles |
| GeoIP | Detection region, registration et guest auth impactees |
| Data | Requetes API globalement impactees |
| Cache | Reponses plus lentes |
| Asset | Artworks, samples, streams impactes |
| Download | Downloads et cuesheets impactes |

Apdex :

| Score | Rating |
|---|---|
| 0.94 - 1 | Excellent |
| 0.85 - 0.93 | Good |
| 0.70 - 0.84 | Fair |
| < 0.70 | Poor/frustrated users probable |

## Monitoring recommande cote Parigo

Mettre en place :

- check periodique `https://service.harvest.music/health` ;
- Sentry cote Next.js pour erreurs API et mapping ;
- logs structures avec endpoint logical name, status, code erreur Harvest, duree, retry count ;
- alerte si code 5/21 en boucle ;
- alerte si 403 rate limit ;
- compteur de requetes Harvest par minute ;
- cache hit/miss ratio ;
- monitoring download queue/status si downloads actifs.

Ne jamais logger :

- `client_secret` ;
- `AccessKey` ;
- access token ;
- service token ;
- member token ;
- URLs Harvest completes contenant un token.
