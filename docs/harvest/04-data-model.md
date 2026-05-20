# 04 - Modele de donnees expose par Harvest

Cette page decrit le modele conceptuel deduit de la documentation officielle. Elle ne remplace pas un schema Harvest : il faut demander a Harvest un mapping d'entites et des exemples de payloads Parigo reels.

## Vue d'ensemble

Harvest fonctionne comme une plateforme SaaS catalogue + assets + membres. Parigo ne devrait pas avoir d'acces direct base de donnees ; l'acces se fera via API.

```text
Account / Service
  -> Regions / Countries / Web Content / Asset URL patterns
  -> Libraries / Labels
    -> Albums
      -> Tracks
        -> Versions / Assets / Styles / Categories / Right holders
  -> Featured playlist categories
    -> Featured playlists
      -> Tracks
  -> Members / Guest members
    -> Playlists / Favourites / Tags / Comments / Searches / History / Downloads
  -> E-commerce
    -> Rates / Invoices / Invoice documents
```

## Account / Service

Le compte Harvest Parigo est le conteneur racine. `getserviceinfo` retourne les informations de service necessaires pour :

- construire les URLs d'artworks ;
- construire les URLs de streaming samples ;
- construire les URLs de waveform image ou datapoints ;
- construire les URLs de direct download ;
- connaitre les formats de fichiers disponibles ;
- connaitre les formats par defaut de download.

`getserviceattribute/{serviceToken}/{attributeTypeCode}` expose des attributs de service. Il faut demander a Harvest la liste des `attributeTypeCode` disponibles pour Parigo.

## Regions / countries

Harvest utilise les regions pour :

- detection GeoIP ;
- disponibilite de contenu ;
- langue par defaut ;
- contraintes de licensing ;
- guest member token ;
- contexte de web content.

Entites visibles :

| Entite | Endpoint |
|---|---|
| Region list | `getregions/{serviceToken}` |
| Region detail | `getregion/{serviceToken}/{RegionID}` |
| Region by IP | `getregionbyip/{serviceToken}?ip={IP}` |
| Countries | `getcountries/{serviceToken}` |

La documentation dit que tous les membres doivent etre assignes a une region.

## Libraries / Labels

Harvest emploie "Label" et "Library" de facon proche. Le glossaire indique : "Labels: a label or library of albums associated to one or multiple publishers."

Pour Parigo, il faut clarifier :

- si Parigo est une seule library ou plusieurs libraries ;
- si des sous-labels existent ;
- si les libraries ont des codes exportables ;
- si certaines libraries sont masquees par region ;
- si `includeinactive` doit etre accessible au nouveau site ou seulement au back-office.

Endpoints :

- `getlibraries/{memberToken}`
- `getlibraries/{memberToken}/includeinactive`
- `getlibrary/{memberToken}/{LibraryID}`

## Albums

Un album est une collection de tracks et d'assets. Les styles sont decrits comme une hierarchie album-level. Cela veut dire que beaucoup de taxonomies peuvent etre portees par l'album, meme si le moteur de recherche permet aussi de filtrer les tracks.

Endpoints :

- `getalbums/{memberToken}/{LibraryID}`
- `getalbumsbystyles/{memberToken}`
- `getalbumsbyids/{memberToken}`
- `getfeaturedalbums/{memberToken}/{Top}`
- `getlatestalbums/{memberToken}/{Top}`
- `getalbum/{memberToken}/{AlbumID}`
- `getalbumtracks/{memberToken}/{AlbumID}/mainonly`

Champs a valider dans les payloads :

- ID stable ;
- code album/CD ;
- display title ;
- description ;
- release date/year ;
- artwork URLs ;
- library association ;
- style/category association ;
- track count ;
- active/inactive ;
- sort/order.

## Tracks

Le track est l'unite centrale de recherche, d'ecoute, de download, de playlist et de licensing. Le glossaire indique qu'un track est un asset audio attache a un album.

Endpoints :

- `gettracks/{memberToken}` pour resolution par IDs ;
- `gettoptracks/{memberToken}` ;
- `getalbumtracks/{memberToken}/{AlbumID}/mainonly` ;
- `cloudsearch/{memberToken}`.

Champs probables a valider :

- `TrackID` stable ;
- display title / alternate title ;
- code ;
- album ID ;
- duration ;
- BPM ;
- lyrics ;
- keywords ;
- instrumentation ;
- mood ;
- music for ;
- release date ;
- main/alternate/version type ;
- stems availability ;
- asset URLs / streaming URL ;
- artwork heredite de l'album ;
- right holders ;
- categories/styles.

## Versions, mains, alternates, stems

La documentation mentionne :

- `MainOnly` ;
- `AlternateOnly` ;
- `NearestAlternate` ;
- `HasStems` ;
- download type `stems` ;
- versions dans les bundles de download.

Pour Parigo, c'est un point tres sensible car les echanges indiquent des besoins autour de :

- main versions ;
- underscores ;
- commercial/short versions ;
- stems.

A clarifier avec Harvest :

- quels attributs distinguent chaque version ;
- si `mainonly` exclut exactement les versions que Parigo veut exclure ;
- comment recuperer les underscores si necessaire ;
- si les stems sont visibles dans search ou seulement en download ;
- si la recherche IA AIMS/Cyanite/Harmix indexe seulement les mains ou aussi les versions.

## Styles, style groups, categories

Harvest distingue :

- style groups ;
- styles ;
- categories ;
- category attributes visibles dans predictive search.

Endpoints :

- `getstylegroups/{memberToken}`
- `getstyles/{memberToken}`
- `getstyles/{memberToken}/{LanguageCode}`
- `getcategories/{memberToken}/hasactivetrackonly`

Search bundles :

- `St_Style`
- `St_StyleGroup`
- `St_Category`

Question importante : les "moods", "genres", "instruments" de l'UI Parigo sont-ils des styles, des categories, des category attributes ou des keywords ? Cela impacte le mapping des filtres.

## Right holders

Endpoints :

- `getrightholders/{memberToken}/{TrackID}` dans Harvest Public API ;
- `getrightholders/{memberToken}?skip={skip}&limit={limit}&returntrackcount=1&sort=...&capacity=...` visible dans FLEX.

Le glossaire distingue :

- writer ;
- artist ;
- publisher ;
- shares ;
- affiliation / society.

Il faut verifier si Parigo doit afficher :

- compositeur ;
- artiste ;
- editeur ;
- societe de gestion ;
- pourcentages de share ;
- capacite (`writer`, `publisher`, etc.).

## Featured playlists et collections

Harvest expose des featured playlist categories/playlists. FLEX expose aussi des pages "Collections" et "Spotlight" via `cloudsearch`.

Le modele probable :

- playlist category ;
- featured playlist ;
- member playlist ;
- collection ;
- spotlight playlist.

Les collections ne sont pas tres explicites dans la Public API Harvest generique, mais FLEX les recherche via `cloudsearch` avec `View: Collection` ou des filtres associes. Il faut confirmer avec Harvest si "Collections" est un objet officiel accessible au developpeur externe.

## Members

La doc Members liste un objet membre riche :

- identity : first name, last name, username, email ;
- company and address ;
- phone ;
- production/subproduction ;
- country/region ;
- preferences : fileformat, searchformat, searchsort ;
- legal/marketing : termsaccept, subscribe ;
- permissions : sampleenabled, downloadenabled, downloadlimit ;
- member group settings.

Un membre peut avoir :

- playlists/folders ;
- favourites/likes ;
- tags ;
- comments ;
- saved searches ;
- play history ;
- download history ;
- invoices ;
- subscriptions selon configuration.

## Playlists

Deux familles :

| Type | Role |
|---|---|
| Featured playlist | Playlist editoriale geree par Parigo/Harvest |
| Member playlist | Playlist creee par un utilisateur |

Les member playlists supportent :

- folders/categories ;
- reorder ;
- autosave ;
- highlight ;
- duplicate ;
- archive/restore ;
- copy featured playlist to member playlist ;
- publish ;
- shares/collaboration ;
- schedule ;
- Disco export.

Pour la refonte Parigo, c'est un domaine a specifier fonction par fonction, car FLEX contient beaucoup de scenarios.

## Downloads

Types mentionnes :

- track ;
- album ;
- playlist ;
- favourites ;
- workspace ;
- tags ;
- stems.

Le download se fait en deux temps :

1. `validatemusicdownloadrequest/{memberToken}` pour savoir si c'est immediat ou queue/email.
2. `getmusicdownload/{memberToken}` pour obtenir token/lien ou declencher email.

`getmusicdownloadinfo/{serviceToken}` permet de suivre un download ou un groupe de downloads.

## E-commerce / licensing

La Public API expose :

- rates ;
- special rates ;
- invoices ;
- invoice search ;
- invoice payment status ;
- invoice PDF URL.

FLEX expose davantage :

- subscription plans ;
- coupons/promo codes ;
- pricing groups ;
- automatic discounts ;
- rates by tags ;
- member subscription management ;
- payment method update ;
- checkout session ;
- member session cart ;
- preview invoice.

Conclusion : si Parigo veut du licensing/e-commerce comparable FLEX, il faut demander l'acces aux endpoints FLEX complementaires et leur support officiel.

## Donnees non visibles ou insuffisamment documentees

| Donnee | Statut |
|---|---|
| Schema relationnel complet | Non public |
| Webhooks de changement catalogue | Non visible |
| Historique d'audit des modifications catalogue | Non visible |
| Export complet utilisateurs/playlists/favoris/tags/comments | Non explicite |
| Details exacts des payloads Parigo | A obtenir via credentials/test |
| Champs custom Parigo | A obtenir via `getserviceattribute` et payloads reels |

## Implication architecture

Il faut construire un anti-corruption layer cote Next.js :

- types internes Parigo (`Track`, `Album`, `Library`, `Playlist`, `Member`) ;
- mappers Harvest -> Parigo ;
- isolation des noms Harvest (`St_Keyword_Aggregated`, `ResultView`, `Facet_*`) ;
- tests de mapping avec payloads reels ;
- cache par type de donnee et par contexte (service/guest/member).
