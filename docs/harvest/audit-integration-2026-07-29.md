# Audit ciblé de l’intégration Harvest — synthèse pour Roland

Audit mis à jour le 29 juillet 2026 à partir de la documentation officielle Harvest `latest`, des réponses live du compte Anthlogan, des routes Parigo et des parcours navigateur desktop/mobile. Les secrets, tokens, cookies et URLs signées sont expurgés.

## 1. Résumé exécutif

Le socle Harvest utilisé par Parigo fonctionne. Les credentials actuels autorisent déjà les principales écritures membre :

- favoris de pistes ;
- playlists : création, modification, copie, suppression, ajout/retrait/réordre de pistes ;
- conversion d’une shortlist en playlist ;
- recherches sauvegardées ;
- tags et relations tag–track ;
- profil et image ;
- cue sheets ;
- téléchargement et historique associé.

Plusieurs écarts initialement attribués à Harvest étaient des défauts Parigo. Ils ont été corrigés et ne doivent pas être remontés à Roland :

| Sujet corrigé côté Parigo | Résultat vérifié |
|---|---|
| Contrats playlist | création et contenu persistés, ordre exact |
| Tags | piste visible dans Account après reload et reconnexion |
| Saved search | création relue sans retry, relance et suppression |
| Cue sheet | `FullUrl` obtenu avec le body officiel |
| Historique d’écoute | événement créé par le stream membre |
| Historique download | `HistoryItems.DeliveryDate` utilisé ; 29/07 affiché |
| Libellé download | « Téléchargement », plus de faux « Preview » |
| Vérification membre | mutation cross-origin bloquée |
| Erreurs playlist | message amont utile, sans supposer un manque de droits |

Il reste cinq comportements à clarifier avec Harvest :

| Sujet | Observation | Qualification prudente |
|---|---|---|
| Suggestions playlist | `Error.Code=3`, message « functionality is not enabled » | configuration/capacité du compte |
| Notes privées | payload officiel, `Error.Code=2`, « trackid is empty » | contrat, prérequis ou anomalie endpoint |
| Abonnement | accusé positif mais `getmember` inchangé | source de vérité ou configuration newsletter |
| Reset password | code fonctionnel `Failed` | configuration du service d’e-mail |
| Partage playlist | invited token obtenu puis `getsharemusicurl` code 2 | contrat ou prérequis du partage |

Une lacune documentaire séparée subsiste pour les albums favoris : l’ajout `Type=Album` est documenté, mais aucun retrait canonique d’un album favori n’est présenté.

La demande à Harvest ne doit pas demander d’activation immédiate. Elle doit d’abord demander confirmation de la disponibilité, des prérequis et, lorsqu’il s’agit d’une option commerciale, des conditions et du coût. Caroline pourra alors être mise dans la boucle avant toute décision.

## 2. Correction de la date des téléchargements

### Réponse Harvest live

Pour le téléchargement « In The Open » :

```text
HistoryItems[].TrackID       daf9…9497
HistoryItems[].DeliveryDate  2026-07-29T22:17:27.66
HistoryItems[].UTCOffset     10
HistoryItems[].ItemType      Download
Tracks[].LastUpdated         2026-07-20 22:24:27
```

La [documentation officielle](https://developer.harvestmedia.net/?version=latest#556814fb-e389-4693-9e0c-aba3fefdd9bb) sépare bien :

- `History.Tracks` : métadonnées de piste ;
- `History.HistoryItems` : événements de téléchargement ;
- `DeliveryDate` et `UTCOffset` : date et offset de l’événement.

### Défaut et correction

Parigo parcourait `Tracks` et utilisait `LastUpdated`, soit la date de mise à jour du catalogue. Le BFF produisait donc `20/07/2026`.

Le mapper joint maintenant chaque `HistoryItem.TrackID` à `Tracks.ID`, utilise `DeliveryDate + UTCOffset`, conserve les téléchargements répétés d’une même piste et reprend `TotalHistoryItems` pour la pagination.

| Piste | Date Harvest | Ancien affichage | Nouvel affichage |
|---|---|---|---|
| In The Open | 29/07/2026, UTCOffset 10 | 20/07/2026 | 29/07/2026 |
| Closure | 29/07/2026, UTCOffset 10 | 20/07/2026 | 29/07/2026 |
| Piano Minuet | 29/07/2026, UTCOffset 10 | 11/12/2025 | 29/07/2026 |

Conclusion : aucun correctif Harvest ni échange avec Roland n’est nécessaire pour ce sujet.

## 3. Anomalies ou contrats restant à clarifier

### A. Suggestions de playlist

| Élément | Résultat |
|---|---|
| Endpoint | `suggestmemberplaylisttracks` |
| Contrat | champs de seed et pagination documentés |
| HTTP | 200 |
| Réponse | `Error.Code=3` |
| Message | fonctionnalité non activée pour le compte |

Question : Harvest peut-il confirmer que cette capacité n’est pas disponible sur notre configuration actuelle ? S’il s’agit d’un module optionnel, quelles sont ses conditions et son tarif ?

### B. Notes privées / commentaires

Requête conforme à l’exemple officiel :

```json
{
  "TrackID": "<TRACK_ID>",
  "TagName": "Texte de la note"
}
```

Résultat direct et BFF :

```text
HTTP 200
Error.Code = 2
Description = Cannot add a tag when trackid is empty.
```

Aucune note n’est créée. `updatetrackmembercomment` et `removetrackmembercomment` ne peuvent donc pas être validés.

Question : l’exemple reste-t-il le contrat actuel ? Un champ, un wrapper, un type de compte ou une configuration préalable manque-t-il ?

### C. Abonnement et reset password

`membersubscribe` accepte le body officiel et renvoie un accusé positif, mais la valeur relue dans `getmember` ne change pas. Il n’est pas établi que `getmember.Subscribe` soit la source de vérité de cet endpoint.

`sendpasswordresetemail` a été appelé une seule fois avec `Username`, `Email` et `ExternalResetToken`. La réponse fonctionnelle est `Failed` et aucun envoi n’a été confirmé.

Questions :

- quel endpoint ou champ permet de vérifier l’état réel de l’abonnement ?
- une newsletter ou liste de diffusion doit-elle être configurée au préalable ?
- quels paramètres de service sont requis pour les e-mails de reset : domaine, lien, expiration, template ?
- ces services font-ils partie de la configuration actuelle ou d’une option distincte ?

### D. Partage de playlist

`getinvitedmembertoken` renvoie un token temporaire. L’appel suivant à `getsharemusicurl`, avec les tokens sender/recipient et le body documenté, renvoie `Error.Code=2` et aucune URL.

Question : quel est le contrat canonique et quels sont les prérequis du compte, du destinataire et du type de playlist ? Si le partage avancé est une option, merci d’en préciser les conditions.

### E. Album favori

La documentation présente :

- `addtofavourites/{memberToken}/Album/{id}` ;
- `removefavouritestrack/{memberToken}/{trackId}`.

Aucun endpoint canonique de retrait d’un album favori n’est identifié. Parigo reconstruit actuellement les albums depuis les tracks favorites, ce qui peut confondre « une piste de cet album est favorite » avec « l’album est favori ».

Question : comment distinguer et retirer proprement un favori de type Album ?

## 4. Recherche et capacités produit à confirmer

### Recherche multilingue

Test direct `cloudsearch` avec `TranslateKeyword: "fr"` :

| Requête | Recherche titre | Recherche agrégée |
|---|---:|---:|
| `mariage` | 0 | 0 |
| `wedding` | 160 | 1 212 |

Parigo utilise temporairement une résolution interne lorsque la recherche française ne retourne rien. La question à Harvest porte sur la disponibilité d’une recherche multilingue ou de groupes de synonymes administrables, et sur son éventuel modèle commercial.

### Contient, commence par, titre exact

Les combinaisons testées de `ExactPhrase` et `Wildcard` continuent à renvoyer des titres où « Piano » apparaît au début, au milieu ou à la fin. Elles ne démontrent ni un préfixe strict ni une égalité complète.

Parigo ne filtre pas après pagination, car cela fausserait les totaux et les facets. Nous demandons si des opérateurs serveur explicites existent.

### Recherche par similarité

La documentation décrit AIMS, CYANITE et HARMIX pour la similarité par piste, prompt, URL ou fichier. Le service live renvoie actuellement `SearchSimilarInfo` vide et `/api/health` indique `searchSimilar=false`.

Parigo n’implémente donc pas ces workflows aujourd’hui. À confirmer :

- quels moteurs sont disponibles pour le service Parigo ;
- si une activation/configuration est nécessaire ;
- les formats, limites et coûts éventuels.

### E-mails et formulaire de contact

Parigo utilise aujourd’hui sa solution technique interne pour le formulaire de contact. Aucun endpoint Harvest générique de contact n’est identifié.

Questions :

- Harvest propose-t-il un service transactionnel générique pour un formulaire de contact ?
- quels e-mails sont gérés par Harvest : vérification, reset, approbation, partage, newsletter, suppression ?
- les templates peuvent-ils être personnalisés avec la charte Parigo ?
- quel est le workflow de prévisualisation, de mise en production et le coût éventuel d’un redesign ?

## 5. Fonctionnalités Harvest que Parigo peut encore exploiter

Ces éléments sont documentés et ne constituent pas des anomalies Harvest. Ils forment une feuille de route produit.

### Priorité recommandée

| Fonctionnalité | Endpoint documenté | Apport | Action |
|---|---|---|---|
| Tags déjà appliqués à une piste | `getmembertagsbytrack` | cocher/décocher correctement dans Search | implémentable côté Parigo |
| Renommer une recherche sauvegardée | `updatemembersavesearch` | gestion complète dans Account | implémentable côté Parigo |
| Dossiers de playlists | `addmemberplaylistcategory`, `getmemberplaylistcategoriesandplaylists` | organiser de gros volumes | décision UX puis implémentation |
| Archiver/restaurer | `archiveplaylist`, `restorearchiveplaylist` | alternative à la suppression définitive | implémentable côté Parigo |
| Dupliquer une playlist membre | `duplicatememberplaylist` | versions de travail | implémentable côté Parigo |
| Recherche dans une playlist | `searchmemberplaylisttracks` | recherche serveur avec totaux/pagination | préférable au filtrage local à grande échelle |
| Suivi des downloads groupés | `getmusicdownloadinfo` | état Prepared/Processing et fichiers multiples | nécessaire pour album/playlist |
| Historique des communications | `gethistorybycommunications` | statut des e-mails Harvest | utile si exposé avec garanties de confidentialité |
| Détail des ayants droit | `getrightholders` | sociétés, parts, IPI et rôles structurés | utile pour licensing |

### Conditionnel

| Fonctionnalité | Pourquoi attendre |
|---|---|
| Gestion des partages existants | dépend de la création de partage : list/update/remove |
| Publication et planning de playlists | relève plutôt d’un rôle éditorial/CMS |
| Top tracks par ayant droit | nécessite de définir la valeur produit et la sémantique des métriques |
| Short URLs Harvest | le domaine `hrvst.co` n’est pas nécessairement cohérent avec la marque Parigo |
| Ecommerce et facturation | aucun besoin produit actuel confirmé |
| SSO et management | rôles et architecture à cadrer séparément |

### Capacités éditoriales/CMS à qualifier

- profils compositeurs avec identifiants stables, alias et biographies ;
- crédits album structurés ;
- entité vidéo et relations vers pistes, albums et contributeurs ;
- champs personnalisés exposés à la Public API ;
- webhook ou flux de changements pour invalider les caches ;
- correction des problèmes d’encodage de certains crédits.

Ces besoins ne doivent pas être confondus avec les mutations membre de la Public API.

## 6. BFF : conclusion

Le BFF reste nécessaire pour les secrets, les tokens, la session, le same-origin, les erreurs et la preuve de persistance.

Il ne doit pas :

- inventer une date à partir des métadonnées de piste ;
- reconstruire une capacité métier lorsque Harvest expose un endpoint ;
- filtrer après pagination ;
- considérer un HTTP 200 comme une preuve de mutation ;
- présenter une erreur générique comme un manque de droits.

Les corrections de cet audit respectent cette limite : Harvest reste la source de vérité.

<!-- PAGEBREAK -->

## 7. cURL minimaux des points reproductibles

### Notes

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

Réponse : HTTP 200, `Error.Code=3`, fonctionnalité non activée.

### Abonnement

```bash
curl -X POST \
  '<HARVEST_SERVICE_URL>/membersubscribe/<HARVEST_MEMBER_TOKEN>' \
  -H 'Authorization: <HARVEST_OAUTH_ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data '{"Email":"member@example.invalid","FirstName":"Test","LastName":"Member","Subscribe":true}'
```

Réponse positive ; méthode de vérification de l’état à confirmer.

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

## 8. Message prêt à envoyer à Roland

**Objet : Parigo × Harvest — quelques points de clarification après notre audit**

Bonjour Roland,

Merci encore pour ton accompagnement. Nous avons terminé une nouvelle passe complète sur l’intégration Harvest et corrigé de notre côté les écarts qui relevaient de notre implémentation. Les parcours principaux fonctionnent désormais : catalogue, recherche, favoris, playlists, shortlist, recherches sauvegardées, tags, historique, cue sheets et téléchargements.

Il nous reste quelques points ciblés pour lesquels nous aimerions surtout confirmer le contrat ou la configuration attendue :

1. `suggestmemberplaylisttracks` nous indique que la fonctionnalité n’est pas activée pour le compte. Peux-tu nous confirmer la configuration actuelle ?
2. `addtrackmembercomment` reçoit `TrackID` et `TagName` comme dans l’exemple officiel, mais répond que `trackid` est vide. Le contrat ou un prérequis a-t-il évolué ?
3. `membersubscribe` renvoie un accusé positif, mais nous ne savons pas quel endpoint ou champ relire pour confirmer l’état réel.
4. `sendpasswordresetemail` renvoie `Failed`. Y a-t-il une configuration de domaine, lien ou template à prévoir ?
5. `getsharemusicurl` est appelé après obtention du recipient token, avec le body documenté, mais répond `Error.Code=2`. Peux-tu nous confirmer les prérequis de ce flux ?
6. Pour les albums favoris, quel est le mécanisme canonique permettant de distinguer puis retirer un favori de type Album ?

Nous ne souhaitons rien activer à ce stade sans d’abord comprendre ce qui est inclus dans notre configuration. Si certains de ces sujets correspondent à des modules ou services optionnels, pourrais-tu nous indiquer les conditions et le coût ? Je pourrai alors mettre Caroline de Parigo dans la boucle avant toute décision.

Nous aimerions aussi savoir si Harvest propose :

- une recherche multilingue ou des synonymes administrables — par exemple `mariage` vers `wedding` ;
- des opérateurs serveur explicites « contient », « commence par » et « titre exact » ;
- un moteur de similarité disponible pour notre service parmi AIMS, CYANITE ou HARMIX ;
- un service générique d’e-mail pour le formulaire de contact. Nous utilisons aujourd’hui notre solution technique interne ;
- la personnalisation complète des e-mails Harvest — vérification, reset, approbation, partage, newsletter, suppression — avec la charte Parigo.

Là encore, si certaines de ces capacités sont optionnelles, nous sommes preneurs des modalités et d’une estimation afin d’en discuter avec Caroline.

Enfin, peux-tu nous préciser la différence entre membre Public API, management user, utilisateur CMS et utilisateur Import/workspace ? Pour la suite éditoriale, nous aimerions notamment comprendre si le CMS peut porter des profils compositeurs, des crédits structurés, des vidéos et leurs relations, ainsi qu’un mécanisme de notification des mises à jour.

Nous pouvons bien sûr te transmettre les cURL expurgés et les réponses reproductibles des points ci-dessus.

Merci,

Yoann
