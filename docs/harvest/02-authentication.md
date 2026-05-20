# 02 - Authentification Harvest

## Vue generale

L'authentification Harvest actuelle repose sur deux couches avant d'appeler les ressources metier :

1. `Get Authorised` : obtient un access token OAuth-like via `client_credentials`.
2. `Get Service Token` : obtient un service token Harvest via `Authorization` + `AccessKey`.

Ensuite, selon les endpoints, on utilise soit le service token, soit un member token. Pour les visiteurs anonymes, le member token est un guest member token.

## Etape 1 - Get Authorised

Endpoint :

```http
POST {HM_ServiceAPI_AuthUrl}
Content-Type: application/x-www-form-urlencoded
```

Body :

```text
grant_type=client_credentials
client_id={HM_ServiceAPI_AuthClientID}
client_secret={HM_ServiceAPI_AuthClientSecret}
```

Selon la documentation officielle, la reponse fournit un access token et un `expires_in` en secondes. Harvest indique que cet access token doit etre passe dans le header `Authorization` de tous les appels API qui le demandent.

Question a valider avec Harvest : le header doit-il etre `Authorization: Bearer {token}` ou `Authorization: {token}` ? La collection Postman met seulement `{{HM_ServiceAPI_AuthToken}}`, sans prefixe explicite. Le script de test supporte les deux via `HARVEST_AUTH_HEADER_PREFIX`.

## Etape 2 - Get Service Token

Endpoint :

```http
GET {HM_ServiceAPI_URL}/getservicetoken
Accept: application/json
Authorization: {accessToken}
AccessKey: {HM_ServiceAPI_Key}
Content-Type: application/json
```

La reponse contient un service token et son expiration. La documentation recommande de ne pas attendre l'expiration exacte : il faut renouveler le token en avance et le conserver dans un cache application partage par tous les utilisateurs du site.

## Etape 3 - Valider / expirer un token

```http
GET /getservicetokeninfo/{serviceToken}
GET /expiretoken/{serviceToken}
```

Les memes endpoints sont utilises pour les member tokens :

```http
GET /getservicetokeninfo/{memberToken}
GET /expiretoken/{memberToken}
```

Les dates retournees sont annoncees en timezone Australie (`UTC+10` ou `UTC+11`) avec un format type `YYYY-MM-DDTHH:MM:SS:SSS`. Il faut les parser prudemment ou se baser sur un TTL local conservateur.

## Etape 4 - Token visiteur anonyme

Harvest recommande un flow multiregion :

1. Detecter la region.
2. Obtenir un guest member token pour cette region.
3. Appeler `getmember/{guestMemberToken}` pour recuperer les Asset URLs contextualisees.

Endpoints :

```http
GET /getregionbyip/{serviceToken}?ip={IP}
GET /getregions/{serviceToken}
GET /getguestmembertoken/{serviceToken}/{RegionID}
GET /getmember/{guestMemberToken}
```

Pour un site public, ce guest member token est probablement le token a utiliser pour :

```http
POST /cloudsearch/{guestMemberToken}
POST /autocomplete/{guestMemberToken}
GET /getlibraries/{guestMemberToken}
GET /getalbumtracks/{guestMemberToken}/{AlbumID}/mainonly
```

## Etape 5 - Connexion membre

Endpoint :

```http
POST /getmembertoken/{serviceToken}
Authorization: {accessToken}
Accept: application/json
```

Body officiel :

```json
{
  "UserName": "{username}",
  "Password": "{password}",
  "PersistentLogin": true,
  "ReturnMemberDetails": true
}
```

Si `PersistentLogin` vaut `true`, Harvest peut retourner un persistent login token a stocker dans un cookie longue duree. La documentation precise qu'un membre avec mot de passe temporaire peut retourner une propriete `TemporaryPassword: "true"` dans le `MemberToken`; il faut alors forcer l'UI a afficher un changement de mot de passe.

## Persistent login

Validation :

```http
POST /validatepersistentlogintoken/{serviceToken}
```

La documentation recommande de passer `renewexpiry` et `generatememberToken` a `true` pour renouveler l'expiration et generer un nouveau member token.

Expiration :

```http
POST /expirepersistentlogintoken/{serviceToken}
```

Important : si un membre ou un admin change le mot de passe, tous les persistent login tokens associes expirent automatiquement.

## SSO

Generation :

```http
GET /getssotoken/{memberToken}
```

Validation / consommation :

```http
POST /validatessotoken/{serviceToken}
```

Body :

```json
{
  "Token": "{singleSignOnToken}",
  "GenerateMemberToken": false,
  "ReturnMemberDetails": false
}
```

Le SSO token est single-use si `GenerateMemberToken=true`. Non prioritaire pour la v1 Parigo sauf besoin d'integration externe.

## Management token

Endpoint :

```http
POST /getmanagementtoken/{serviceToken}
```

Ce token donne acces a des operations admin, par exemple :

```http
POST /updatemembergroup/{managementToken}/{MemberGroupID}
```

Il ne doit jamais etre accessible au navigateur. Si Parigo a besoin d'un back-office custom, ces appels doivent passer par des routes serveur avec controle d'acces strict.

## Stockage recommande

| Secret/token | Stockage | Exposition navigateur |
|---|---|---|
| `client_id` | env serveur | Jamais |
| `client_secret` | env serveur | Jamais |
| `AccessKey` | env serveur | Jamais |
| Access token | cache serveur | Jamais |
| Service token | cache serveur | Jamais |
| Guest member token | session serveur/cookie httpOnly court | Eviter |
| Member token | cookie `httpOnly`, `Secure`, `SameSite=Lax` | Non lisible JS |
| Persistent token | cookie `httpOnly`, `Secure`, duree longue | Non lisible JS |
| Management token | memoire serveur uniquement | Jamais |

## Strategie de renouvellement

Pseudo-code :

```ts
async function getServiceToken() {
  if (cachedServiceToken && cachedServiceToken.expiresAt > Date.now() + 5 * 60_000) {
    return cachedServiceToken.value;
  }

  const accessToken = await getAccessToken();
  cachedServiceToken = await requestServiceToken(accessToken);
  return cachedServiceToken.value;
}
```

En cas d'erreur Harvest code `5 Invalid Token` :

1. purger le service token ;
2. demander un nouveau service token ;
3. rejouer une seule fois la requete ;
4. si l'erreur persiste, retourner une erreur applicative propre.

En cas d'erreur code `21 Access Token Expired` :

1. purger l'access token ;
2. refaire `Get Authorised` ;
3. refaire `Get Service Token` si necessaire ;
4. rejouer une seule fois.

## Points a confirmer avec Harvest

- Prefixe exact du header `Authorization`.
- Duree de vie typique des access tokens et service tokens.
- Possibilite d'avoir des credentials staging/test separes.
- Politique de rotation client secret / access key.
- CORS : meme si Parigo doit passer par un proxy serveur, savoir si Harvest autorise des appels navigateur peut aider au debug.
- Nombre de guest member tokens autorises / cache recommande par region.
- Liste des permissions rattachees aux credentials Parigo.
