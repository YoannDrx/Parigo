# 05 - Documentation FLEX : analyse technique

## Nature de la documentation FLEX

Le portail <https://flex.developer.harvestmedia.net/> est une collection Postman intitulee `FLEX`. Ce n'est pas une documentation du code source FLEX et elle ne donne pas acces aux composants front proprietaires. Elle documente plutot les appels API necessaires pour reproduire les ecrans et comportements FLEX.

La collection contient 335 entrees classees par page ou zone fonctionnelle.

| Groupe FLEX | Entrees | Lecture technique |
|---|---:|---|
| Knowledge | 1 | Notes sur l'usage des tokens |
| CMS | 18 | Auth integration API, lookups, listes admin |
| Initial Load | 4 | Boot front : auth, service token, region, guest |
| Sitewide Panels | 9 | Panels reutilisables albums/tracks/playlists/collections |
| Sitewide Actions | 27 | Add to playlist/likes/tags, downloads, cuesheets, share, similarity |
| Home Page | 3 | Collections + contact forms |
| Registration Page | 3 | Countries + signup member |
| Login Page | 4 | Login, forgot password, reset |
| Member Welcome Page | 7 | Recent playlists/plays, random tracks, member hub |
| Member Profile Page | 3 | Get/update member, password change |
| Member All Play History Page | 2 | Play history + track details |
| Member All Download History Page | 2 | Download history + track details |
| Member All Playlists Page | 31 | Arbre folders/playlists, CRUD, share/collaboration, track operations |
| Member All Searches Page | 5 | Saved searches |
| Member All Tags Page | 8 | Tags + tracks by tag |
| Member All Likes Page | 4 | Likes/favourites |
| Search Page | 59 | Recherche complete, facets, predictive, similar search AIMS/Cyanite |
| Search Page - SFX Only | 3 | Recherche contrainte `LibraryType=SoundEffects` |
| Search Music Page - Music Only | 3 | Recherche contrainte `LibraryType=Music` |
| Track Info Page | 2 | Track details + similar tracks |
| All Labels Page | 2 | Labels via cloudsearch |
| Label Page | 2 | Label + latest albums |
| All Albums Page | 6 | Dropdowns + albums filtres |
| Album Page | 5 | Album, tracks, related albums |
| All Playlists Page | 5 | Categories, playlists, Disco |
| Playlist Page | 5 | Playlist, tracks, copy, related playlists |
| All Collections Page | 2 | Collections |
| Collection Page | 2 | Albums/playlists in collection |
| Shared Playlist Page | 4 | Share URL, shared playlist, download, accept |
| Shared Playlist Page By ID | 1 | ID -> token share |
| Right Holders | 1 | Liste paginee right holders |
| Ecom | 99 | Subscriptions, licensing, carts, rates, invoices, payment/update flows |
| Spotlight Page | 3 | Spotlight playlists/tracks |

## Ce que FLEX confirme

FLEX confirme que la Public API est suffisamment riche pour reconstruire beaucoup de comportements :

- recherche principale via `cloudsearch` ;
- predictive search via `autocomplete` ;
- panels homepage/sitewide via `cloudsearch` ;
- pages labels/albums/playlists/collections via `cloudsearch` ou endpoints dedies ;
- member account, playlists, likes, tags, saved searches, histories ;
- downloads et cuesheets ;
- shared playlists ;
- AIMS/Cyanite similar search ;
- e-commerce/licensing avance.

La consequence importante : une grande partie de FLEX n'est pas magique. C'est une orchestration de payloads `cloudsearch` et d'endpoints Public API.

## Ce que FLEX revele en plus

En comparant les templates d'endpoints FLEX avec la Public API Harvest generique, on trouve 36 templates visibles dans FLEX mais absents de la collection Harvest Public API principale.

| Endpoint FLEX absent de la doc Harvest generique | Usage |
|---|---|
| `POST /searchrates/{token}` | Lookup rates CMS |
| `POST /searchsubscriptionplans/{token}` | Lookup subscription plans CMS |
| `POST /sendcontactusemail/{token}` | Contact form home |
| `POST /sendcustomcontactusemail/{memberToken}` | Contact form custom |
| `POST /getsimilartracks/{memberToken}` | Similarity basee tags |
| `GET /getrelatedplaylists/{memberToken}/{PlaylistID}` | Related playlists |
| `GET /getrightholders/{memberToken}?skip=...` | Liste globale right holders, pas seulement par track |
| `POST /getsharemusicurlbyid/{serviceToken}` | Swap share ID -> share token |
| `GET /getsubscriptionplans/{token}` | Plans subscription |
| `POST /validatecoupon/{token}` | Coupon subscription |
| `POST /validatepromocode/{token}` | Promo code checkout |
| `POST /updateinvoice/{memberToken}` | Update invoice |
| `POST /previewinvoice/{serviceToken}` | Preview invoice guest checkout |
| `GET /GetPricingGroups/{memberToken}` | Pricing groups |
| `GET /GetAutomaticDiscounts/{serviceToken}` | Automatic discounts |
| `GET /getdiscounts/{serviceToken}` | Discounts |
| `POST /getratesbytags/{memberToken}` | Rates by tags |
| `POST /SetMemberSession/{memberToken}/{SessionGuidID}` | Cart/session selections |
| `GET /GetMemberSession/{memberToken}` | Read cart/session selections |
| `GET /VoidMemberSession/{memberToken}/{SessionGuidID}` | Clear cart/session |
| `POST /sendecomcustomformemail/{memberToken}` | Custom ecom form |
| `POST /updatepaymentmethod/{memberToken}` | Payment method update |
| `GET /cancelmembersubscription/{memberToken}` | Cancel subscription |
| `GET /getmembergroupmembers/{memberToken}` | Subscription users |
| `POST /invitemembersubscription/{memberToken}` | Invite subscription user |
| `POST /updatesubscriptionmemberinvitation/{memberToken}` | Update invitation |
| `POST /removesubscriptionmember/{memberToken}` | Remove subscription user |
| `GET /addcheckoutsession/{memberToken}` | Checkout session, local in collection |

Conclusion : il faut demander a Harvest si ces endpoints sont officiellement disponibles au developpeur externe Parigo. Sinon, il y a une asymetrie FLEX vs front custom.

## Initial Load FLEX

FLEX demarre avec :

1. `POST Get Authorised`
2. `GET /getservicetoken`
3. `GET /getregionbyip/{serviceToken}?ip={IPAddress}`
4. `GET /getguestmembertoken/{serviceToken}/{regionid}`

Cela valide l'hypothese d'architecture Parigo : meme pour un visiteur anonyme, le front doit obtenir un guest member token avant les appels catalogue/recherche.

## Recherche FLEX

FLEX utilise tres intensivement `POST /cloudsearch/{memberToken}`.

### Core search

Scenarios documentes :

- default search ;
- custom search ;
- keyword ;
- label ;
- duration ;
- category ;
- category with tracks only ;
- BPM ;
- release year/date ;
- playlist ID ;
- view by album ;
- album expanded ;
- album by style group ;
- view by playlist ;
- playlist multilingual ;
- view by collection ;
- collection multilingual ;
- collection ID ;
- right holder ID ;
- multiple terms by album ;
- multiple terms by track expanding album.

### Facets

FLEX note explicitement d'utiliser les facets pour charger les panneaux :

- BPM ;
- duration ;
- label/library ;
- mood/instrument/category selon mapping ;
- album ;
- style ;
- composer ;
- release year.

### Search SFX/music only

FLEX a deux variantes :

```json
{ "LibraryType": "SoundEffects" }
```

et :

```json
{ "LibraryType": "Music" }
```

Si Parigo n'a pas de SFX, on peut ignorer. Si Parigo veut filtrer music/SFX plus tard, le mecanisme existe.

## Predictive search FLEX

Endpoint :

```http
POST /autocomplete/{memberToken}
```

Payload type :

```json
{
  "Keyword": "happy",
  "Wildcard": true,
  "ReturnTracks": true,
  "ReturnTracks_MainOnly": true,
  "ReturnTracks_Fields": "DisplayTitle,Keywords,Instrumentation,MusicFor,Mood",
  "ReturnTracks_Limit": 1,
  "ReturnAlbums": true,
  "ReturnAlbums_Fields": "CdCode,DisplayTitle,Description,Keywords",
  "ReturnAlbums_Limit": 1,
  "ReturnLyrics": true,
  "ReturnFeaturedPlaylists": true,
  "ReturnLibraries": false,
  "ReturnStyles": false,
  "ReturnCategoryAttributes": false,
  "ReturnRightHolders": false,
  "ReturnKeywords": false
}
```

Cela permet de construire un autocomplete riche : titres, albums, paroles, playlists, labels, styles, right holders, keywords.

## Similar search FLEX

FLEX documente principalement AIMS et Cyanite :

- by track ;
- by segment ;
- by MP3 upload ;
- by URL ;
- by prompt/free text ;
- get track details apres similar search.

Les options recurrentes :

```json
{
  "Sort_Predefined": "EvokeRanking",
  "Evoke_IncludeSeed": false,
  "Evoke_PrioritizeBPM": false,
  "Evoke_SuppressVocals": false,
  "Limit": "10"
}
```

Le segment est gere par :

```json
{
  "Start": "22",
  "Duration": "52"
}
```

## Pages membres FLEX

FLEX montre un espace membre complet :

- welcome dashboard ;
- recent playlists ;
- recent plays ;
- surprise me / random tracks ;
- member hub via productions/categories/playlists ;
- profile ;
- play history ;
- download history ;
- all playlists avec arbre folders/playlists ;
- saved searches ;
- tags ;
- likes.

Pour Parigo, il faut decider si tout est v1 ou si on priorise :

1. login/profil minimal ;
2. likes/favourites ;
3. playlists simples ;
4. sharing ;
5. downloads ;
6. historique/saved searches/tags en phase ulterieure.

## Playlists FLEX

FLEX documente une experience playlist tres complete :

- tree left panel ;
- search folders/playlists ;
- create/update/reorder/delete folders ;
- create/update/reorder/delete/duplicate playlists ;
- autosave playlists ;
- compare playlist ;
- share modal ;
- collaborate modal ;
- collaboration access modal ;
- right panel playlist details ;
- get/search/reorder/delete tracks.

Points a tester :

- differencier folder vs playlist category ;
- comportement de `keepChildren` a la suppression ;
- droits de collaboration ;
- `giveShareCopy` sur suppression de share ;
- autosave/hot playlist.

## Pages catalogue FLEX

FLEX montre que labels, albums, playlists, collections et spotlight sont souvent charges via `cloudsearch`, pas uniquement via endpoints dedies.

Implication : pour un front custom, il faut privilegier `cloudsearch` pour les pages qui ont besoin de tri, facets, filtres ou vues agregees, et garder les endpoints dedies pour les details simples et resolutions par ID.

## E-commerce FLEX

FLEX contient 99 entrees e-commerce, plus avancees que la Public API generique.

Fonctionnalites visibles :

- subscriptions ;
- member signup/login pour subscription ;
- invoice create/update/pay/void/search ;
- coupon validation ;
- payment method update ;
- active/expired subscriptions ;
- member whitelisting ;
- manage plan users ;
- enterprise payment ;
- upgrade subscription ;
- album/track licensing ;
- single licensing track ;
- multiple licensing tracks ;
- pricing groups ;
- automatic discounts ;
- discounts ;
- rates by tags ;
- custom forms ;
- guest checkout ;
- preview invoice.

Si Parigo n'a pas de licensing en v1, ce bloc peut etre garde hors scope. Si Parigo veut le remplacer aussi, c'est un chantier a part entiere.

## Lecture politique et technique

La doc FLEX est utile pour trois raisons :

1. Elle donne des payloads concrets que la doc Harvest de base ne montre pas toujours.
2. Elle revele la logique UX/API de FLEX page par page.
3. Elle permet de challenger Harvest sur la parite : "ces endpoints et payloads sont-ils disponibles pour un developpeur externe hors FLEX ?"

Question centrale a poser :

```text
Can an external Parigo custom front-end use every endpoint and request shape shown in the FLEX Postman documentation, including e-commerce, related playlists, right holders listing, subscription and pricing endpoints? If not, please identify which endpoints are FLEX-only or require additional enablement.
```

## Recommandation pour Parigo

Utiliser la doc FLEX comme cahier de tests :

- prendre chaque page Parigo cible ;
- identifier le scenario FLEX equivalent ;
- reproduire le payload minimum dans Postman ;
- noter ce qui fonctionne avec les credentials Parigo ;
- isoler les endpoints necessitant activation ou autorisation speciale ;
- estimer le front seulement apres cette verification.
