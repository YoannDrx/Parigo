# Audit ciblé de l'intégration Harvest - synthèse pour Roland

Audit mis à jour le 29 juillet 2026 à partir de la documentation officielle Harvest `latest`, de tests directs, des 61 routes API Parigo (88 handlers) et de parcours navigateur desktop et mobile sur le compte Anthlogan. Les secrets, cookies, tokens et URLs signées sont expurgés.

## 1. Résumé exécutif

Le socle Harvest utilisé par Parigo fonctionne. La configuration actuelle autorise déjà les principales écritures membre. Elle ne peut donc pas être qualifiée globalement de "lecture seule".

| Domaine | Résultat live |
|---|---|
| Catalogue, recherche, assets | fonctionnel |
| Favoris de pistes | ajout, relecture Account, retrait |
| Playlists | création, modification, copie, duplication, suppression, pistes et ordre |
| Shortlist | conversion en playlist et ordre vérifiés |
| Recherches sauvegardées | création, relance, renommage et suppression |
| Tags personnels | CRUD et relation piste-tag visibles dans Account |
| Profil et image | modification, upload, suppression et restauration |
| Historique et téléchargements | lecture et dates corrigées |
| Cue sheets | URL générée avec le body officiel |
| Dossiers de playlists | CRUD et déplacement d'une playlist |
| Recherche dans une playlist | recherche Harvest paginée avec total |
| Ayants droit | données structurées renvoyées |
| Communications | endpoint fonctionnel, aucune entrée pour le compte de test |

Les nouveaux parcours ont été vérifiés par clic réel sur desktop `1440 x 900` et mobile `390 x 844`. Les ressources temporaires ont été relues puis supprimées. Le compte, le profil et les recherches préexistantes ont été restaurés. Aucune suppression de compte n'a été appelée.

Les points à adresser à Harvest sont désormais limités aux contrats, mécanismes ou capacités qui restent non conclusifs après correction de Parigo.

## 2. Corrections et extensions réalisées côté Parigo

Ces sujets ne doivent pas être présentés comme des anomalies Harvest.

| Sujet | Correction ou extension | Preuve |
|---|---|---|
| Date des téléchargements | jointure `HistoryItems.TrackID -> Tracks.ID`, usage de `DeliveryDate + UTCOffset` | un download du 29/07 n'est plus affiché au 20/07 |
| Tags d'une piste | `getmembertagsbytrack`, cases cochées, ajout/retrait vérifié | piste visible dans Account après reload et reconnexion |
| Recherche sauvegardée | parsing des enveloppes, timeout dédié, renommage via `updatemembersavesearch` | HTTP 200, nouveau nom visible puis état initial restauré |
| Dossiers de playlists | catégories Harvest, déplacement vérifié dans `PlaylistObjects` | création, renommage, déplacement et nettoyage HTTP 200 |
| Duplication | `duplicatememberplaylist`, comparaison des pistes et de l'ordre | nouvelle playlist distante identifiée puis supprimée |
| Recherche dans une playlist | `searchmemberplaylisttracks`, `Fields` séparés par virgule, `Custom_ASC` | HTTP 200, total et piste visibles dans l'UI |
| Ayants droit | `getrightholders` et rendu société, part, rôle, IPI | 2 ayants droit en direct, 5 sur la piste testée dans l'UI |
| Communications | `gethistorybycommunications` derrière la session membre | HTTP 200, liste vide sur Anthlogan |
| Erreurs et persistance | plus de succès fondé uniquement sur HTTP 200 | relecture distante avant confirmation UI |

Le BFF reste nécessaire pour les secrets, les tokens, la session, le same-origin, les erreurs, les caches et la preuve de persistance. Il ne recrée pas une base métier locale et Harvest reste la source de vérité.

## 3. Points restant à clarifier avec Harvest

### A. Suggestions de playlist

| Élément | Résultat |
|---|---|
| Endpoint | `suggestmemberplaylisttracks` |
| Requête | champs de seed et pagination documentés |
| Réponse | HTTP 200, `Error.Code=3` |
| Message | fonctionnalité non activée pour le compte |

Ce refus est clair. La question n'est pas seulement de savoir si la fonction peut être activée, mais de comprendre son fonctionnement réel: source des seeds, moteur de recommandation, critères, réglages, stabilité et bénéfice attendu dans l'expérience Parigo. Il faut également savoir si Parigo a déjà été briefé sur ce module.

### B. Notes privées et commentaires

La requête suit l'exemple officiel:

```json
{
  "TrackID": "<TRACK_ID>",
  "TagName": "Texte de la note"
}
```

Résultat direct et BFF:

```text
HTTP 200
Error.Code = 2
Description = Cannot add a tag when trackid is empty.
```

Aucune note n'est créée. Il faut confirmer le body canonique, son éventuel wrapper et les prérequis du compte avant de modifier Parigo.

### C. Abonnement membre et mailing list

`membersubscribe` accepte le body officiel et renvoie un accusé positif. La valeur relue dans `getmember.Subscribe` ne change toutefois pas. La documentation ne permet pas d'établir:

- si cet endpoint alimente une mailing list Harvest;
- quelle liste ou configuration est ciblée;
- quel champ ou endpoint constitue la source de vérité;
- comment sont gérés consentement, désabonnement, segmentation et historique.

Parigo pourrait être intéressé par cette capacité, mais a besoin d'une présentation fonctionnelle et technique avant de décider de l'utiliser.

### D. Reset password et partage

`sendpasswordresetemail` a été appelé une fois avec les champs documentés et renvoie `Failed`.

Pour le partage, `getinvitedmembertoken` renvoie bien un token destinataire, puis `getsharemusicurl` répond `Error.Code=2` sans URL avec le body documenté.

Il faut confirmer les paramètres de service, les prérequis du destinataire, les templates et le contrat actuel de ces deux flux.

### E. Favori d'album

La documentation présente `addtofavourites/{memberToken}/Album/{id}`, mais aucun retrait canonique d'un album favori n'est identifié.

Parigo ajoute actuellement les pistes une par une puis reconstruit l'album. Cette adaptation:

- multiplie les mutations;
- confond potentiellement une piste favorite et un album favori;
- rend le retrait non canonique.

Question: Harvest permet-il d'ajouter, relire et retirer directement un album favori comme une ressource distincte?

### F. Archive de playlist

`archiveplaylist` et `restorearchiveplaylist` fonctionnent lorsque l'ID est connu:

```text
archive HTTP 200
playlist absente de la liste active
restore HTTP 200
playlist de nouveau visible
```

Aucun endpoint ou filtre documenté n'a été trouvé pour lister les playlists archivées. Parigo n'expose donc pas encore cette fonction dans l'UI: après un reload ou sur un autre appareil, il ne disposerait plus d'une liste fiable des IDs à restaurer.

Question: quel endpoint canonique permet de lister les archives?

### G. Suivi des téléchargements groupés

`getmusicdownloadinfo` exige exactement un `DownloadID` ou un `DownloadGroupID`. Le téléchargement unitaire observé renvoie des `DownloadTokens`, et l'historique ne contient aucun de ces deux identifiants.

Le BFF accepte désormais un identifiant de job documenté, mais l'UI ne peut pas démarrer un polling tant que la provenance de cet identifiant n'est pas établie pour les téléchargements d'album, de playlist ou de dossier.

Question: quelle réponse fournit l'ID à transmettre à `getmusicdownloadinfo` pour chacun de ces trois cas?

## 4. Recherche et services produit

### Recherche multilingue

Test direct avec `TranslateKeyword: "fr"`:

| Requête | Recherche titre | Recherche agrégée |
|---|---:|---:|
| `mariage` | 0 | 0 |
| `wedding` | 160 | 1 212 |

Parigo utilise actuellement une résolution interne de secours. Il serait préférable que la traduction, les synonymes et l'autocomplete multilingue soient portés par le moteur Harvest afin de conserver des totaux, facets et pages cohérents.

### Contient, commence par, titre exact

Les combinaisons documentées de `ExactPhrase` et `Wildcard` ne démontrent pas un préfixe strict ni une égalité de titre. Parigo ne filtre pas les résultats après pagination, car cela fausserait les totaux et les facets.

Question: existe-t-il des opérateurs serveur explicites pour:

- le titre contient la saisie;
- le titre commence par la saisie;
- le titre est égal à toute la saisie?

### Similarité AIMS

La documentation décrit AIMS, CYANITE et HARMIX. Le service live ne renvoie pas de configuration `SearchSimilarInfo`. Le sujet AIMS est en cours côté Parigo: une demande a été transmise et Parigo attend un retour sur ses conditions.

Nous souhaitons surtout comprendre le mécanisme de chaque moteur, les données utilisées, les réglages possibles et la valeur produit réelle avant d'envisager son usage.

### Contact et e-mails Harvest

Parigo utilise sa solution technique interne pour le formulaire de contact. Aucun endpoint générique Harvest de contact n'est identifié.

Questions:

- Harvest propose-t-il un service transactionnel générique pouvant recevoir les champs du formulaire, la piste concernée et un `reply-to`?
- Quels e-mails sont gérés par Harvest: vérification, reset, approbation, partage, abonnement ou newsletter, suppression?
- Les templates HTML et texte peuvent-ils être redessinés avec la charte Parigo?
- Quel workflow permet prévisualisation, validation, langues, sender domain et mise en production?

## 5. Pourquoi distinguer Public API, management, CMS et Import

Cette question sert à éviter de demander la mauvaise permission ou de développer une fonction sur la mauvaise famille d'API.

| Famille | Besoin Parigo concerné |
|---|---|
| Public API membre | favoris, playlists, tags, recherches, profil, historique |
| Management | administration des membres, groupes, quotas ou droits si applicable |
| CMS | contenus éditoriaux, profils compositeurs, crédits et vidéos |
| Import/workspace | création et modification du catalogue et de ses assets |

Nous ne supposons pas qu'un utilisateur admin Public API donne accès au CMS. Harvest doit seulement confirmer les frontières et les credentials appropriés pour cadrer les futurs besoins éditoriaux.

## 6. cURL minimaux des anomalies reproductibles

### Notes

```bash
curl -X POST \
  '<HARVEST_SERVICE_URL>/addtrackmembercomment/<HARVEST_MEMBER_TOKEN>' \
  -H 'Authorization: <HARVEST_OAUTH_ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data '{"TrackID":"track_example","TagName":"Note privée de test"}'
```

Réponse: HTTP 200, `Error.Code=2`, `trackid is empty`.

### Suggestions

```bash
curl -X POST \
  '<HARVEST_SERVICE_URL>/suggestmemberplaylisttracks/<HARVEST_MEMBER_TOKEN>/playlist_example' \
  -H 'Authorization: <HARVEST_OAUTH_ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data '{"Skip":0,"Limit":5,"MainOnly":true,"SeedDetermination":"Created_Desc","SeedLimit":5,"SeedMin":""}'
```

Réponse: HTTP 200, `Error.Code=3`, fonctionnalité non activée.

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

Réponse: HTTP 200, `Error.Code=2`, aucune URL.

Référence: [documentation officielle Harvest Media API, version latest](https://developer.harvestmedia.net/api/collections/8325040/SVYouLCf?segregateAuth=true&versionTag=latest).

<!-- PAGEBREAK -->

## 7. Message prêt à envoyer à Roland

**Objet: Parigo x Harvest - points ciblés après validation de l'intégration**

Bonjour Roland,

Merci encore pour ton accompagnement. Nous avons terminé une nouvelle passe de validation et corrigé de notre côté les sujets qui relevaient de notre implémentation. Les parcours principaux sont désormais opérationnels: catalogue, recherche, favoris de pistes, playlists et shortlist, recherches sauvegardées, tags, historique, cue sheets et téléchargements.

Nous avons aussi raccordé plusieurs fonctions déjà documentées: tags appliqués à une piste, renommage des recherches sauvegardées, dossiers de playlists, duplication, recherche serveur dans une playlist, historique des communications et données structurées des ayants droit.

Il nous reste quelques points ciblés:

1. `suggestmemberplaylisttracks` indique que la fonctionnalité n'est pas activée pour le compte. Pourrais-tu nous expliquer comment elle fonctionne concrètement: moteur utilisé, choix des seeds, réglages et type de résultats? Sais-tu également si Parigo a déjà été briefé sur cette fonction? Avec ces éléments, je pourrai revenir vers l'équipe Parigo pour savoir si elle souhaite l'étudier.
2. `addtrackmembercomment` reçoit `TrackID` et `TagName` comme dans l'exemple officiel, mais répond que `trackid` est vide. Peux-tu nous confirmer le body canonique et les éventuels prérequis?
3. Concernant `membersubscribe`, est-ce bien un mécanisme de mailing list? L'appel est accepté, mais nous ne savons pas où relire l'état ni comment sont gérés la liste, le consentement, le désabonnement et les envois. Parigo pourrait être intéressé, mais la documentation actuelle ne nous permet pas encore d'en comprendre le fonctionnement complet.
4. `sendpasswordresetemail` renvoie `Failed`. Y a-t-il une configuration de domaine, de lien ou de template à prévoir?
5. `getsharemusicurl` est appelé après obtention du recipient token, avec le body documenté, mais répond `Error.Code=2`. Peux-tu nous confirmer les prérequis de ce flux?
6. Est-il possible de gérer un album favori comme une ressource distincte, avec ajout, lecture et retrait directs? Aujourd'hui, Parigo ajoute les pistes une à une puis reconstruit l'album, ce qui fonctionne mais n'est pas optimal.
7. `archiveplaylist` et `restorearchiveplaylist` fonctionnent avec un ID connu. Quel endpoint permet de lister les playlists archivées afin de proposer une restauration fiable après reload?
8. Pour `getmusicdownloadinfo`, où récupère-t-on le `DownloadID` ou `DownloadGroupID` lors d'un téléchargement d'album, de playlist ou de dossier?

Nous aimerions également mieux comprendre:

- la recherche multilingue et la possibilité de gérer nativement `mariage` vers `wedding`, autocomplete compris;
- d'éventuels opérateurs serveur "contient", "commence par" et "titre exact";
- le fonctionnement et la valeur respective des moteurs de similarité. Le sujet AIMS est en cours côté Parigo: une demande a été faite et l'équipe attend un retour sur ses conditions;
- l'existence éventuelle d'un service Harvest pour le formulaire de contact. Nous utilisons aujourd'hui notre solution technique interne;
- les possibilités de redesign des e-mails gérés par Harvest, notamment vérification, reset, approbation, partage, abonnement ou newsletter et suppression, avec la charte Parigo.

Enfin, pourrais-tu nous confirmer les frontières entre membre Public API, management user, utilisateur CMS et utilisateur Import/workspace? L'objectif est simplement d'orienter les futurs besoins vers la bonne famille d'API et les bons credentials, notamment pour les contenus éditoriaux et les crédits structurés.

Nous pouvons te transmettre les cURL expurgés et les réponses reproductibles des trois appels ci-dessus si utile.

Merci,

Yoann
