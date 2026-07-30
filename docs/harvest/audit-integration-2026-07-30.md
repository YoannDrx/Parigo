# Audit de l'intégration Harvest - contrats, BFF et évolutions d'API

Audit arrêté le 30 juillet 2026 à partir de la documentation officielle Harvest `latest`, des 61 routes API Parigo (88 handlers), de tests directs et BFF, et de parcours Chromium desktop `1440 x 900` et mobile `390 x 844` sur le compte Anthlogan.

Les tokens, cookies, mots de passe, URLs signées et données personnelles sont expurgés. Aucune suppression de compte n'a été appelée. Toutes les ressources temporaires identifiables ont été supprimées et le profil, l'abonnement, l'image et les favoris initiaux ont été restaurés.

## 1. Conclusion exécutive

La configuration Harvest de Parigo n'est pas globalement en lecture seule. Les écritures membre principales fonctionnent déjà : favoris, playlists, shortlist, recherches sauvegardées, tags, profil et image. Les cue sheets et les téléchargements unitaires fonctionnent également.

La nouvelle photographie documentaire compte **257 endpoints HTTP** :

| Famille | Endpoints classés | Exécution |
|---|---:|---|
| Public API | 189 | statique, BFF, direct et UI selon le périmètre Parigo |
| Export API | 17 | statique, credentials dédiés absents |
| Import API | 36 | statique, hors mutations membre |
| Agent API | 15 | statique, credentials dédiés absents |

Les 88 handlers BFF sont inventoriés dans `bff-handler-inventory.csv`. Les 257 contrats sont classés dans `endpoint-classification.csv`. La preuve détaillée UI, BFF et directe reste dans `runtime-route-matrix.csv`.

Le BFF doit être conservé. Il est nécessaire pour protéger les secrets, renouveler les tokens, chiffrer la session, appliquer le same-origin, normaliser les erreurs et vérifier la persistance. En revanche, cinq logiques devraient idéalement être portées ou complétées par Harvest :

- un favori Album de première classe ;
- des compteurs de tags fiables ;
- une relance canonique des recherches sauvegardées ;
- une liste de playlists contenant directement leur dossier ;
- la traduction et les opérateurs de correspondance du moteur de recherche.

<!-- PAGEBREAK -->

## 2. Protocole de vérification

Chaque mutation réversible a suivi la chaîne :

```text
clic UI
→ route BFF
→ payload Harvest
→ réponse HTTP et Error.Code
→ relecture Harvest
→ relecture BFF
→ page Account
→ reload
→ reconnexion
→ nettoyage
```

Les succès ne sont jamais déduits du seul HTTP 200. Les endpoints Harvest retournant une erreur fonctionnelle dans une réponse HTTP 200 sont classés selon `Error.Code`.

Les retests du 30 juillet ont notamment établi :

| Parcours | Preuve finale |
|---|---|
| Favori piste | visible dans Account après reload et reconnexion, puis retiré |
| Shortlist vers playlist | 3 IDs et ordre exacts, desktop et mobile, puis playlist supprimée |
| Tag vers piste | piste visible dans `/account/tags?tag=...` après reload et reconnexion |
| Recherche sauvegardée | ressource visible après reconnexion, puis supprimée |
| Profil | champ modifié, relu et restauré |
| Image | upload neutre, lecture, suppression et retour à l'état initial |
| Cue sheet | `FullUrl` renvoyée pour une et plusieurs pistes |
| Historique | événement `Sample` lu via `HistoryItems.TrackID`, `DeliveryDate` et `UTCOffset` |
| Dossiers et duplication | création, déplacement, copie et nettoyage vérifiés |
| Ayants droit | objets structurés visibles dans le panneau piste |

Un premier appel UI de recherche dans une playlist a répondu 503. Le même contrat a ensuite répondu 200 en direct, via le BFF et par saisie réelle dans l'UI. Cet incident transitoire n'est donc pas présenté comme une anomalie Harvest reproductible.

## 3. Ce qui fonctionne et ne nécessite pas de demande Harvest

| Domaine | Endpoints principaux | Résultat |
|---|---|---|
| Authentification | OAuth, service token, guest/member token, persistent login | fonctionnel |
| Catalogue | albums, tracks, alternates, labels, catégories, assets | fonctionnel |
| Recherche | `cloudsearch`, autocomplete, facets, pagination | fonctionnel en anglais |
| Favoris piste | `addtofavourites/Track`, `getfavourites`, `removefavouritestrack` | fonctionnel |
| Playlists | création, update, ajout/retrait, ordre, copie, duplication | fonctionnel |
| Shortlist | local anonyme puis transaction playlist | fonctionnel desktop/mobile |
| Recherches sauvegardées | création, liste, renommage, suppression | fonctionnel |
| Tags | CRUD, tags par piste, relation piste-tag | fonctionnel |
| Profil | lecture, update, presigned upload et suppression image | fonctionnel |
| Historique | lecture et dates à partir des événements | fonctionnel |
| Téléchargement unitaire | validation, fichier et historique | fonctionnel |
| Cue sheet | une ou plusieurs pistes | fonctionnel |
| Dossiers playlist | CRUD et déplacement | fonctionnel |
| Communications | historique membre | HTTP 200, liste vide sur Anthlogan |
| Ayants droit | `getrightholders` | fonctionnel |

Les dates de téléchargement erronées étaient un défaut Parigo : le mapper utilisait une date de métadonnée de piste. Il utilise désormais l'événement de téléchargement et son offset. Aucun changement Harvest n'est demandé pour ce correctif.

<!-- PAGEBREAK -->

## 4. Les huit points à adresser à Roland

### 4.1 Suggestions de playlist

| Élément | Constat |
|---|---|
| Endpoint | `suggestmemberplaylisttracks` |
| Documentation | intégration IA active requise ; AIMS, Cyanite ou Harmix ; seeds configurables |
| Payload Parigo | `Skip`, `Limit`, `MainOnly`, `SeedDetermination`, `SeedLimit`, `SeedMin` |
| Live | HTTP 200, `Error.Code=3`, fonction non activée |
| Attribution | contrat Parigo conforme ; capacité optionnelle non disponible |

La documentation explique déjà les seeds : sélection aléatoire, ordre de création ascendant ou descendant, limite dépendant du fournisseur, pagination par `ParentSearchHistoryID`. La question utile est donc de savoir quel fournisseur et quelle configuration sont disponibles pour Parigo, quels résultats concrets ils produisent et si l'équipe Parigo a déjà reçu une présentation.

### 4.2 Notes privées et commentaires

| Élément | Constat |
|---|---|
| Endpoint | `addtrackmembercomment` |
| Documentation `latest` | description fonctionnelle, mais body publié vide |
| Payload Parigo | `TrackID`, `TagName` |
| Live | HTTP 200, `Error.Code=2`, `Cannot add a tag when trackid is empty` |
| Persistance | aucune note créée |

Le mail précédent disait à tort que `TrackID` et `TagName` venaient d'un exemple officiel. La version `latest` consultée ne publie aucun body. Il faut demander les bodies canoniques de création et de modification, ainsi que l'identifiant attendu par `updatetrackmembercomment`. Parigo ne doit pas inventer de wrapper.

### 4.3 Abonnement membre

`membersubscribe` est documenté comme la gestion du subscriber flag, et le guide Harvest le rattache aux communications marketing futures.

Deux variantes ont été testées et restaurées :

```text
membersubscribe + Subscribe
→ HTTP 200
→ getmember.Subscribe inchangé

updatemember + MemberAccount.Subscribe
→ HTTP 200
→ getmember.Subscribe inchangé
```

Le BFF répond 502 afin de ne pas annoncer un faux succès. Harvest doit confirmer la source de vérité, la liste réellement alimentée, le consentement, le désabonnement, la segmentation et les outils d'envoi.

### 4.4 Reset password

Le builder Parigo actuel envoie `Username`, `Email` et `ExternalResetToken`. La documentation mentionne aussi `ResetLink` et `ResetTokenExpiryHours` : le builder devra être complété.

Un essai direct unique avec ces cinq champs a néanmoins renvoyé :

```text
HTTP 200
Code = Failed
Error = Required route not found
```

Le token n'a pas été consommé et aucun changement de mot de passe n'a été effectué. Il faut confirmer le format de `ResetLink` et la route, le domaine ou le template à configurer côté service.

### 4.5 Partage de playlist

Le flux documenté a été respecté :

```text
getinvitedmembertoken
→ recipient token reçu
→ getsharemusicurl
→ FromMemberToken, ToMemberToken, ObjectIdentifier,
  ObjectType=Playlist, ShareType=Sync, quatre flags Allow*
```

Résultat : HTTP 200, `Error.Code=2`, aucune URL. L'e-mail n'a pas été envoyé et la playlist d'audit a été supprimée.

Le payload correspond aux champs publiés. Il faut confirmer les prérequis du destinataire et l'éventuelle configuration du website share path ou du service.

### 4.6 Favori d'album

Le comportement est désormais observé et non supposé :

```text
addtofavourites/{memberToken}/Album/{albumId}
→ HTTP 200 Code=OK
→ 12 tracks ajoutées à getfavourites
→ aucune collection Albums
```

Après le test, seules les 12 pistes nouvellement ajoutées ont été retirées et le snapshot initial a été retrouvé exactement.

Harvest traite donc l'ajout Album comme un ajout en masse de pistes. Parigo reconstruit ensuite les albums par regroupement. Cette solution perd la provenance : une piste favorite individuellement est indiscernable d'une piste héritée d'un album. La bonne évolution est une ressource favorite typée, avec lecture et retrait directs.

### 4.7 Archives de playlists

`archiveplaylist` et `restorearchiveplaylist` répondent 200. L'archive disparaît de la liste active puis revient après restauration.

Parmi les 257 endpoints `latest`, aucun endpoint de liste des archives ni filtre `includeArchived` n'a été identifié. Sans liste distante, Parigo ne peut pas proposer une restauration fiable après reload ou sur un autre appareil. L'UI d'archive reste donc volontairement non exposée.

### 4.8 Téléchargements groupés

`getmusicdownloadinfo` exige exactement :

- `DownloadID` pour Album ou Playlist ;
- `DownloadGroupID` pour Playlist Category.

Aucun autre endpoint ni exemple de réponse dans les 257 contrats ne fournit ces IDs. Le téléchargement unitaire observé renvoie des `DownloadTokens`, et l'historique n'expose ni `DownloadID` ni `DownloadGroupID`.

La route BFF de polling est prête, mais il manque le contrat initiateur. Harvest doit indiquer quelle réponse fournit l'identifiant pour chacun des trois types.

<!-- PAGEBREAK -->

## 5. Trois évolutions d'API supplémentaires

### 5.1 Compteurs de tags

Avec `ReturnTagCount=1`, les deux tags du compte ont renvoyé `TrackCount=0`. Les lectures par `getmembertagtracks` contenaient respectivement 4 et 1 pistes.

Le BFF effectue donc une lecture supplémentaire par tag, en lots de six, uniquement pour produire le bon compteur dans Account. Cette logique devrait disparaître au profit :

- d'un `TrackCount` fiable ;
- ou d'un endpoint batch de comptes par `TagID`.

### 5.2 Relance des recherches sauvegardées

Une recherche filtrée a été sauvegardée puis relue. `SearchParameters` contenait :

- le mot-clé ;
- l'ID du label sélectionné ;
- le `SearchHistoryID` ;
- le `ParentSearchHistoryID` et la configuration de résultat.

Harvest conserve donc la matière du contrat. En revanche, aucun endpoint ou mécanisme documenté ne permet de relancer de façon canonique une `SavedSearch` depuis son ID ou ses paramètres.

Parigo stocke actuellement l'URL applicative dans `Description` avec `PARIGO_URL:`. Ce contournement fonctionne, mais la logique de replay devrait appartenir à Harvest. La demande est de documenter un endpoint de relance ou de retourner une commande/URL stable.

### 5.3 Playlists et dossiers

Observation live :

| Endpoint | Donnée obtenue |
|---|---|
| `getmemberplaylistsnotracks` | 5 playlists, aucun champ catégorie |
| `getmemberplaylistcategoriesandplaylists` | hiérarchie, catégories et 2 playlists imbriquées |

Le BFF fusionne les deux réponses par ID pour afficher une playlist avec son dossier. C'est une adaptation minimale, mais un `PlaylistCategoryID` dans la liste plate, ou une liste unique complète, supprimerait un appel et une jointure.

<!-- PAGEBREAK -->

## 6. Recherche et logique produit

### Multilingue

Test direct `cloudsearch` avec `TranslateKeyword: "fr"` :

| Requête | Titre | Agrégée |
|---|---:|---:|
| `mariage` | 0 | 0 |
| `wedding` | 171 | 1 231 |

Parigo possède une résolution interne de taxonomie et un secours de traduction. Ce mécanisme ne peut pas garantir l'autocomplete, les synonymes, les facets et les totaux du moteur Harvest. Une capacité multilingue native reste préférable.

### Contient, commence par et titre exact

Les combinaisons documentées de `ExactPhrase` et `Wildcard` ont été testées sur `TrackDisplayTitle`.

Pour `Piano`, les résultats incluent le mot au début et au milieu ; `ExactPhrase` ne transforme pas cette recherche en égalité de titre. `Wildcard` modifie le total, mais ne démontre pas un opérateur de préfixe strict.

Parigo ne doit pas filtrer après pagination, car les totaux et facets deviendraient faux. Les opérateurs non couverts doivent rester une demande moteur :

- contains ;
- starts-with ;
- full-title equality.

### Similarité

Les fournisseurs AIMS, Cyanite et Harmix sont documentés, mais `SearchSimilarInfo` est vide sur le service live. Le sujet AIMS est déjà en cours côté Parigo : une demande a été faite et l'équipe attend un retour sur ses conditions.

La prochaine étape est de comprendre la valeur respective des moteurs : données utilisées, seeds, stabilité, réglages, pagination, transparence et bénéfice utilisateur.

## 7. Répartition cible de la logique

| Logique | Cible recommandée | Justification |
|---|---|---|
| Secrets, OAuth, AccessKey et tokens | BFF | sécurité |
| Cookie membre, refresh, same-origin | BFF | sécurité et session |
| Validation, erreurs, no-store | BFF | contrat HTTP Parigo |
| Relecture après mutation | BFF | éviter les faux succès |
| Mapping des dates avec UTCOffset | BFF | présentation cohérente Europe/Paris |
| Shortlist anonyme, player, layout | navigateur | état d'interface local |
| Favori Album typé | Harvest | identité et provenance métier |
| Compteurs de tags | Harvest | agrégat de la source de vérité |
| Replay de recherche sauvegardée | Harvest | contrat de recherche |
| Dossier d'une playlist dans la liste | Harvest | relation métier existante |
| Traduction, synonymes et opérateurs | Harvest | cohérence index, facets et pagination |
| Historique `HistoryItems` vers `Tracks` | BFF | jointure fournie dans la même réponse |
| URL audio/artwork depuis templates | BFF | tokens et région |

La suppression du BFF n'est pas viable avec le flux d'authentification documenté. Sa simplification consiste à supprimer les reconstructions métier dès que Harvest fournit un contrat canonique, pas à exposer les tokens au navigateur.

<!-- PAGEBREAK -->

## 8. Risques et points de vigilance

- Certains endpoints de mutation utilisent `GET` : aucun retry automatique ne doit être appliqué.
- Les réponses HTTP 200 peuvent contenir `Error.Code` : le BFF doit conserver ce code.
- Les créations ne disposent pas d'idempotency key documentée : ne jamais rejouer un POST après un timeout de relecture.
- Les données membre doivent rester `no-store`.
- Les URLs d'assets et de presigned upload ne doivent pas être journalisées.
- La session chiffrée contient des tokens Harvest : sa rotation et sa durée doivent rester contrôlées.
- L'album favori actuel peut supprimer une piste qui avait été favorite individuellement.
- Le calcul des compteurs de tags multiplie les requêtes et consomme inutilement le rate limit.
- La page Communications expose potentiellement des données sensibles ; elle doit rester limitée au membre connecté.
- Public API, Management, CMS, Import et Agent utilisent des responsabilités et credentials distincts.

## 9. cURL minimaux reproductibles

### Commentaire de piste

La documentation `latest` ne publie pas de body. Voici le body actuellement envoyé par Parigo :

```bash
curl -X POST \
  '<HARVEST_SERVICE_URL>/addtrackmembercomment/<HARVEST_MEMBER_TOKEN>' \
  -H 'Authorization: <HARVEST_OAUTH_ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data '{"TrackID":"track_example","TagName":"Note privée de test"}'
```

Réponse : HTTP 200, `Error.Code=2`, `trackid is empty`.

### Suggestions

```bash
curl -X POST \
  '<HARVEST_SERVICE_URL>/suggestmemberplaylisttracks/<HARVEST_MEMBER_TOKEN>/playlist_example' \
  -H 'Authorization: <HARVEST_OAUTH_ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data '{"Skip":0,"Limit":5,"MainOnly":true,"SeedDetermination":"Created_Desc","SeedLimit":5,"SeedMin":""}'
```

Réponse : HTTP 200, `Error.Code=3`, intégration IA non activée.

### Reset

```bash
curl -X POST \
  '<HARVEST_SERVICE_URL>/sendpasswordresetemail/<HARVEST_SERVICE_TOKEN>' \
  -H 'Authorization: <HARVEST_OAUTH_ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data '{
    "Username":"",
    "Email":"member@example.test",
    "ExternalResetToken":"",
    "ResetLink":"https://example.test/reset-password/",
    "ResetTokenExpiryHours":24
  }'
```

Réponse : HTTP 200, `Code=Failed`, `Required route not found`.

### Partage

```bash
curl -X POST \
  '<HARVEST_SERVICE_URL>/getsharemusicurl/<HARVEST_SERVICE_TOKEN>' \
  -H 'Authorization: <HARVEST_OAUTH_ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data '{
    "FromMemberToken":"<SENDER_MEMBER_TOKEN>",
    "ToMemberToken":"<RECIPIENT_MEMBER_TOKEN>",
    "ObjectIdentifier":"playlist_example",
    "ObjectType":"Playlist",
    "ShareType":"Sync",
    "AllowDownload":false,
    "AllowFollow":false,
    "AllowSave":true,
    "AllowShare":false
  }'
```

Réponse : HTTP 200, `Error.Code=2`, aucune URL.

Référence : [documentation officielle Harvest Media API, version latest](https://developer.harvestmedia.net/api/collections/8325040/SVYouLCf?segregateAuth=true&versionTag=latest).

<!-- PAGEBREAK -->

## 10. Message prêt à envoyer à Roland

**Objet : Parigo x Harvest - points ciblés après validation de l'intégration**

Bonjour Roland,

Merci encore pour ton accompagnement. Nous avons terminé une nouvelle passe de validation de l'intégration et corrigé de notre côté les sujets qui relevaient de Parigo.

Les parcours principaux sont opérationnels : catalogue, recherche, favoris de pistes, playlists et shortlist, recherches sauvegardées, tags, profil, historique, cue sheets et téléchargements. Nous avons également raccordé les tags d'une piste, le renommage des recherches sauvegardées, les dossiers de playlists, la duplication, la recherche dans une playlist, l'historique des communications et les ayants droit structurés.

Il nous reste les points ciblés suivants :

1. `suggestmemberplaylisttracks` répond que l'intégration IA n'est pas activée. La documentation décrit le choix des seeds, la pagination et les fournisseurs AIMS, Cyanite et Harmix. Pourrais-tu nous indiquer quelle configuration est disponible ou envisagée pour Parigo, le type de résultats attendu et les réglages habituellement retenus ? Sais-tu également si l'équipe Parigo a déjà été briefée sur cette fonction ? Avec ces éléments, je pourrai revenir vers elle pour savoir si elle souhaite l'étudier.
2. Pour `addtrackmembercomment`, la documentation `latest` décrit la fonction mais ne publie pas le body. Notre requête avec `TrackID` et `TagName` répond `Cannot add a tag when trackid is empty`. Peux-tu nous transmettre les bodies canoniques de création et de modification, ainsi que l'identifiant attendu par `updatetrackmembercomment` ?
3. Nous comprenons que `membersubscribe` gère le subscriber flag pour de futures communications ou actions marketing. L'appel, ainsi qu'un update de `MemberAccount.Subscribe`, répondent 200 mais la valeur relue ne change pas. Peux-tu nous préciser la source de vérité, la liste alimentée et la façon dont sont gérés consentement, désabonnement, segmentation et envois ? Une mailing list pourrait intéresser Parigo, mais nous avons besoin d'en comprendre le fonctionnement concret.
4. Pour `sendpasswordresetemail`, la documentation mentionne `ResetLink` et `ResetTokenExpiryHours`. Même avec ces champs, nous obtenons `Required route not found`. Quel format de route est attendu et quelle configuration de domaine ou de template doit être réalisée côté service ?
5. Pour le partage, `getinvitedmembertoken` renvoie bien le token destinataire, puis `getsharemusicurl`, appelé avec les champs documentés, répond `Error.Code=2` sans URL. Peux-tu nous confirmer les prérequis du destinataire et l'éventuelle configuration du website share path ou du service ?
6. L'ajout d'un album aux favoris fonctionne, mais Harvest ajoute ses pistes et `getfavourites` ne renvoie pas de ressource Album distincte. Existe-t-il, ou serait-il envisageable d'avoir, un favori Album de première classe avec ajout, lecture et retrait directs ? Cela éviterait de confondre une piste favorite individuellement avec une piste héritée d'un album.
7. `archiveplaylist` et `restorearchiveplaylist` fonctionnent avec un ID connu. Quel endpoint ou filtre permet de lister les playlists archivées afin de proposer une restauration fiable après reload ?
8. `getmusicdownloadinfo` exige un `DownloadID` ou un `DownloadGroupID`, mais nous n'avons trouvé aucun endpoint initiateur qui retourne cet identifiant. Quelle réponse fournit l'ID pour un album, une playlist et un dossier de playlists ?
9. Avec `getmembertags?ReturnTagCount=1`, deux tags renvoient un compteur à 0 alors que leurs lectures détaillées contiennent respectivement 4 et 1 pistes. Est-ce un comportement connu ? Un compteur fiable ou un endpoint batch nous éviterait une lecture par tag.
10. `searchmembersavesearches` renvoie des `SearchParameters` complets, mais nous n'avons pas trouvé de mécanisme documenté pour relancer une recherche depuis son ID. Existe-t-il un endpoint de replay ou un contrat recommandé ? Aujourd'hui, Parigo conserve temporairement son URL dans `Description`.
11. `getmemberplaylistsnotracks` ne renvoie pas le `PlaylistCategoryID`, alors que la hiérarchie le contient. Est-il possible d'obtenir ce champ dans la liste plate, ou existe-t-il une liste unique complète ? Cela nous éviterait de fusionner deux réponses.

Nous aimerions aussi mieux comprendre :

- la recherche multilingue et la possibilité de gérer nativement `mariage` vers `wedding`, autocomplete compris ;
- d'éventuels opérateurs serveur « contient », « commence par » et « titre exact » ;
- le fonctionnement et la valeur respective des moteurs de similarité. Le sujet AIMS est en cours côté Parigo : une demande a été faite et l'équipe attend un retour sur ses conditions ;
- l'existence éventuelle d'un service Harvest pour le formulaire de contact. Nous utilisons aujourd'hui notre solution technique interne ;
- les possibilités de redesign des e-mails gérés par Harvest, notamment vérification, reset, approbation, partage, abonnement ou newsletter et suppression, avec la charte Parigo.

Nous ne demandons pas d'activer de capacité à ce stade. Pour les fonctions optionnelles, l'objectif est d'abord de comprendre leur mécanisme et leur apport réel. Je pourrai ensuite revenir vers l'équipe Parigo et mettre Caroline dans la boucle si elle souhaite approfondir un sujet.

Enfin, pourrais-tu nous confirmer les frontières entre membre Public API, management user, utilisateur CMS et utilisateur Import/workspace ? Cette question sert uniquement à orienter les futurs besoins vers la bonne famille d'API et les bons credentials, notamment pour les contenus éditoriaux, les crédits structurés et les opérations catalogue.

Je peux bien sûr te transmettre les cURL expurgés et les réponses reproductibles si utile.

Merci,

Yoann

## 11. Vérifications exécutées

| Vérification | Résultat |
|---|---|
| Documentation `latest` | 257 endpoints classés |
| BFF statique | 61 fichiers de route, 88 handlers |
| Direct member diagnostics | playlists, suggestions, comments, abonnement, recherche, cue sheets |
| Capabilities audit | tags, saved search, dossiers, duplication, archive, droits, communications |
| Album favorite isolé | ajout 12 tracks, absence d'objet Album, restauration exacte |
| Reset documenté | une tentative, aucun token consommé |
| Share URL | recipient token reçu, aucune URL créée |
| Desktop core UI | favoris, shortlist, playlist, Account, nettoyage |
| Desktop track UI | infos, notes, queue, lecture, history, download visible, cue sheet |
| Desktop Account UI | tag, saved search, profil, image, settings, capabilities |
| Mobile UI | shortlist, favori, playlist, pages Account |
| Fuseaux navigateur | UTC, Europe/Paris, Australia/Sydney |

Limites assumées :

- aucun compte créé, vérifié ou supprimé ;
- aucun second téléchargement consommant un quota ;
- aucun lien de reset consommé ;
- aucun e-mail de partage envoyé après l'échec de création de l'URL ;
- aucun endpoint Management, Import, Export ou Agent exécuté sans credentials dédiés.
