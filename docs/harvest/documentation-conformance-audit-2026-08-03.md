# Audit de conformité de la documentation Harvest Media API

Date de la campagne : 3 août 2026

Documentation contrôlée : collection publique `latest`, collection `1fdbc3d4-864c-498a-ae3e-ae52d2c5b256`, published ID `SVYouLCf`
URL : <https://developer.harvestmedia.net/api/collections/8325040/SVYouLCf?segregateAuth=true&versionTag=latest>

## Conclusion

La documentation est globalement exploitable, mais elle contient plusieurs erreurs certaines et reproductibles. Les deux écarts les plus importants concernent les commentaires privés de piste : le casing documenté de `TrackID` est rejeté à la création, et l'identifiant documenté à la modification désigne la mauvaise entité. La collection contient aussi un exemple de requête JSON invalide, onze exemples de réponse JSON invalides, plusieurs variables ou identifiants erronés dans les URLs et plusieurs zones où un HTTP 200 ne prouve pas que l'opération a réussi.

Les contrats principaux de catalogue, recherche, autocomplete, playlists, tags, recherches sauvegardées, historique et cue sheets ont par ailleurs été validés. Plusieurs anciennes suspicions ne doivent plus être remontées à Harvest : les payloads documentés de playlists fonctionnent aujourd'hui, tout comme le payload documenté de validation de téléchargement et le payload `track` de génération de cue sheet.

## Périmètre réellement couvert

La collection `latest` contient :

| Famille | Entrées HTTP | Accès disponible pendant l'audit |
| --- | ---: | --- |
| Public API | 189 | Oui : service, guest et membre de test |
| Export API | 17 | Non : aucun Export Access/Session Token |
| Import API | 36 | Non : aucun Import Access/Session Token ; opérations catalogue destructives |
| Agent API | 15 | Non : aucun Integration/Agent Token |
| **Total** | **257** |  |

La collection contient également 22 pages `INFO`, soit 279 entrées au total.

La couverture a été réalisée à trois niveaux :

1. contrôle statique des 257 entrées HTTP : méthode, URL, variables, corps principal, exemples de requête, exemples de réponse et validité JSON ;
2. 59 contrôles directs en lecture ou sans effet métier dans la Public API, dont les exemples JSON publiés pour le catalogue et les deux formes de `getfeaturedplaylistandtracks` ;
3. mutations membre réversibles : création, modification, association, réordonnancement, archivage/restauration et suppression, avec relecture de persistance et nettoyage.

Les APIs Export, Import et Agent ont été auditées statiquement mais ne peuvent pas être présentées comme testées en live avec une clé Public API. Les opérations irréversibles ou externes — suppression de compte, import/suppression de catalogue, paiement, e-mail réel, envoi Disco et consommation supplémentaire d'un quota de téléchargement — n'ont pas été exécutées.

## Double contrôle exhaustif documentation ↔ code Parigo

Une seconde passe a comparé la collection officielle non seulement aux tests, mais à chaque appel de production présent dans `src/lib/harvest` et `src/app/api`.

| Mesure | Total |
| --- | ---: |
| Contrats HTTP documentés contrôlés | 257 |
| Clés d'endpoint documentées réellement appelées par le produit | 88 |
| Variantes documentaires correspondant à ces appels | 89 |
| Variantes POST comparées, méthode et body compris | 49 |
| Variantes GET comparées, chemin et query compris | 40 |
| Appels de production sans équivalent documentaire | 0 |

Les 89 variantes viennent de 88 clés uniques parce que `getinvitedmembertoken` est publié deux fois dans la collection. Les endpoints partagés ont été séparés par usage : Parigo utilise par exemple la variante `MemberProfileImage` de `getpresigneduploadurl`, mais pas les variantes EDL, audio-similarity ou playlist-image.

La matrice exhaustive se trouve dans `code-documentation-conformance-matrix-2026-08-03.csv`. Elle contient, pour chacune des 257 lignes officielles : famille, section, méthode, URL, champs du body officiel, statut d'implémentation, fichier et ligne du code Parigo, payload/query réellement envoyé, niveau de conformité et preuve live ou raison de non-exécution.

### Résultat côté code Parigo

Les deux divergences de commentaires issues de la documentation ont été corrigées dans Parigo :

1. `addtrackmembercomment` envoie désormais `{ trackid, TagName }`, puis relit les commentaires de la piste pour identifier la nouvelle ressource ; le BFF a répondu HTTP 201 et la persistance a été confirmée ;
2. `updatetrackmembercomment` envoie désormais `{ TagID, TagName }`, puis confirme le nouveau texte par relecture ; le BFF a répondu HTTP 200 ;
3. `removetrackmembercomment` relit également la piste jusqu'à confirmer l'absence de la note ; le cycle création, modification et suppression a été exécuté et nettoyé.

La divergence de suppression de compte est également corrigée : `/api/user/delete` exige maintenant le mot de passe actuel, propose explicitement archivage ou suppression définitive, puis appelle `POST /removememberverifypassword/{MemberToken}` avec `{ Password, ArchiveOnly }`. Le contrat est couvert localement, mais l'appel live n'a volontairement pas été exécuté afin de ne pas archiver ou supprimer le compte de test.

Trois adaptations supplémentaires sont compatibles en live mais doivent rester visibles dans l'intégration :

- `getfeaturedplaylistandtracks` est bien appelé en POST, mais avec `{}` plutôt qu'avec les six options de l'exemple ; les deux formes ont été rejouées et renvoient HTTP 200 avec la playlist et ses pistes ;
- `updatemembersavesearch` ajoute `ID` dans le body bien que l'identifiant figure déjà dans l'URL et que l'exemple officiel n'annonce pas ce champ ; la modification persiste correctement ;
- `updatemember` envoie `Website`, absent de l'exemple JSON publié ; la mise à jour et la restauration du profil ont été confirmées.

Les autres payloads utilisés par Parigo correspondent au contrat publié ou à un sous-ensemble de champs optionnels accepté en live. Cela inclut notamment OAuth, login/persistent login, `gettracks`, Cloud Search, autocomplete, création/mise à jour de playlists et dossiers, ajout/retrait/réordonnancement des pistes, favoris, tags, recherches sauvegardées, historique, validation/téléchargement et cue sheets.

### Limite de la formule « tous les endpoints testés »

L'exhaustivité est certaine pour le contrôle statique et pour la comparaison code/documentation : les 257 contrats et tous les appels de production sont présents dans la matrice. Elle ne signifie pas que 257 opérations ont été mutées en production. Les 68 contrats Export/Import/Agent nécessitent d'autres credentials ; des flows Public API exigent un token ou module absent ; l'inscription, la vérification, la suppression de compte et les e-mails ont des effets externes ou irréversibles. Ces lignes sont explicitement marquées `not-implemented`, `non exécuté` ou `non exécutable` au lieu d'être présentées comme des succès.

## Erreurs certaines dans la documentation

### D-001 — `addtrackmembercomment` : `TrackID` a le mauvais casing

L'exemple JSON officiel publie :

```json
{
  "TrackID": "<track-id>",
  "TagName": "first tag"
}
```

Résultat live : HTTP 200 avec `Error.Code=2`, `Cannot add a tag when trackid is empty.`

Matrice testée :

| Corps | Résultat |
| --- | --- |
| `TrackID` + `TagName` | rejet fonctionnel : `trackid is empty` |
| `trackId` + `tagName` | rejet fonctionnel : `trackid is empty` |
| `trackid` + `tagname` | succès, commentaire relu puis supprimé |
| `trackid` + `TagName` | succès, commentaire relu puis supprimé |

Le champ de création est donc case-sensitive et doit être documenté `trackid`. `TagName`, `tagName` et `tagname` ont été acceptés pendant la campagne, mais il serait préférable de publier une seule forme canonique.

### D-002 — `updatetrackmembercomment` : `TrackID` est le mauvais identifiant

L'exemple JSON de modification publie :

```json
{
  "TrackID": "<comment-id>",
  "TagName": "first comment (updated)"
}
```

La valeur montrée est en réalité l'identifiant du commentaire/tag, pas l'identifiant de la piste. La version XML du même exemple utilise correctement `tagid`.

| Corps | Résultat |
| --- | --- |
| `TrackID` + `TagName` | HTTP 400, aucune modification |
| `trackid` + `tagname` | HTTP 400, aucune modification |
| `tagid` + `tagname` | succès et persistance confirmée |
| `TagID` + `TagName` | succès et persistance confirmée |

Le contrat JSON canonique doit donc publier `TagID` ou `tagid`, et expliquer qu'il s'agit de l'ID renvoyé par la création ou la lecture des commentaires.

### D-003 — `getmembertoken` : exemple de réponse invalide et noms de propriétés faux

L'exemple de réponse JSON officiel :

- contient une virgule finale invalide dans `PersistentLoginToken` ;
- publie le token membre sous `Token`, alors que le live renvoie `MemberToken` ;
- publie `PersistentLoginToken.Value`, alors que le live renvoie `PersistentLoginToken.Token`.

Le live renvoie, avec le payload officiel et `ReturnMemberDetails: false`, les clés top-level `MemberToken`, `PersistentLoginToken` et `MemberAccount`.

### D-004 — `gettoptracks` : l'exemple de requête n'est pas du JSON

L'exemple contient un commentaire JavaScript après `TrackType` :

```json
"TrackType": "MainOnly", // MainOnly, AlternateOnly, MainAndAlternate
```

Ce corps ne peut pas être parsé comme JSON. Après retrait du commentaire, le payload documenté renvoie HTTP 200 et dix pistes sur la donnée de test. Le commentaire doit être déplacé dans la description.

### D-005 — Onze exemples de réponse annoncés JSON ne sont pas valides

| Surface | Nombre | Erreur |
| --- | ---: | --- |
| `getserviceinfo` | 1 | accolade finale manquante |
| Similarité AIMS/Cyanite/Harmix | 9 | virgule finale après le tableau des segments |
| `getmembertoken` | 1 | virgule finale dans `PersistentLoginToken` |

Ces erreurs empêchent la copie directe dans un validateur, un fixture de test ou une génération de types.

### D-006 — `getcuesheet` : URL d'exemple mal formée

Les six réponses JSON/XML montrent `https://{cuesheetdomainpath}}/afile.csv`, avec une accolade fermante en trop. Le live renvoie une URL valide.

### D-007 — IDs codés en dur dans quatre URLs principales

La requête principale de la collection utilise un ID littéral au lieu d'une variable pour :

- `updatemembertag/.../12340397b5f68cf0` ;
- `getmemberplaylistschedule/.../33da591b784f4330` ;
- `updatememberplaylistschedule/.../699cd3bbe22ff336` ;
- `deletememberplaylistschedule/.../33da591b784f4330`.

Ces segments doivent être remplacés par `{TagID}` ou `{PlaylistID}`. L'endpoint de lecture d'un schedule fonctionne avec un vrai PlaylistID ; l'absence de schedule est correctement signalée par `Error.Code=2`.

### D-008 — Variables et texte de partage incohérents

- Les URLs `getsharemusic` et `acceptsharemusic` utilisent `HM_ServiceAPI_EnageAccessToken`, probablement pour `EngageAccessToken`.
- La description de partage de catégorie publie `PlaylistCatgory`, tandis que l'exemple JSON utilise `PlaylistCategory`.
- `Share Member Playlist to Disco` est classé sous Public API mais utilise `HM_IntegrationAPI_URL`.

Il faut harmoniser le nom de la variable, corriger l'orthographe et préciser explicitement que le partage Disco dépend de l'Integration API et de credentials distincts.

### D-009 — Types de token contradictoires dans les descriptions

Plusieurs pages décrivent un `ServiceToken` alors que l'URL exige un `MemberToken`, notamment :

- `Get Album Tracks (Include Inactive)` ;
- `Get Featured Playlist` ;
- `Update Member Details` ;
- `Remove Member Playlist Schedule`.

À l'inverse, `Get Web Content` décrit un `MemberToken` alors que l'URL utilise le service token. Les appels live confirment que les URLs, et non ces libellés de tableau, correspondent au type de token attendu sur les parcours testés.

### D-010 — `ReturnTagCount` est documenté mais n'est pas observable

`getmembertags` décrit `ReturnTagCount`, mais la variable est absente de l'URL principale. Testé avec `1`, `true` et `True`, le live ne renvoie aucun `TrackCount` sur les deux tags du compte. Les lectures de détail renvoient pourtant respectivement `TotalTracks=4` et `TotalTracks=1`.

La documentation doit soit fournir la syntaxe effective, soit retirer ce paramètre et indiquer qu'un appel `getmembertagtracks` est nécessaire par tag.

### D-011 — Plusieurs opérations POST n'ont pas d'exemple JSON exécutable

En dehors des deux endpoints OAuth normalement documentés en form-urlencoded, les opérations suivantes n'ont pas d'exemple JSON exploitable dans la collection :

- Public API : `getinvitedmembertoken` dans la section Profile, `removememberverifypassword`, `updatememberplaylistshare`, ainsi que `gettoptracks` et `getexternalsharestatushistory` dont les exemples sont invalides ;
- Export API : `getalbumsbyworkspacestatus`, `getmusicdownload`, `setalbumtag`, `removealbumtag`, `bulkupserttrackcategories` ;
- Agent API : `removelibrarytag`.

Certaines disposent d'un exemple XML, mais la collection devrait fournir un contrat JSON pour rester cohérente avec le reste de l'API publique et permettre une intégration TypeScript sans déduire la forme à partir du XML.

## Contrats incomplets ou comportements à clarifier

Ces points sont reproductibles, mais ne doivent pas tous être qualifiés de bug documentaire tant que Harvest n'a pas confirmé la configuration du service Parigo.

### C-001 — HTTP 200 ne signifie pas succès fonctionnel

Plusieurs endpoints renvoient HTTP 200 avec un échec dans le JSON :

- `addtrackmembercomment` : `Error.Code=2` ;
- `suggestmemberplaylisttracks` : `Error.Code=3`, fonctionnalité non activée ;
- lecture d'un schedule absent : `Error.Code=2`.

La page des codes fonctionnels existe, mais la documentation de chaque endpoint devrait rappeler que le client doit lire `Error`/`error` même après HTTP 200.

### C-002 — Abonnement membre : succès sans changement d'état

`membersubscribe`, avec le payload officiel, renvoie HTTP 200 et `Code`, mais la valeur `Subscribe` relue par `getmember` ne change pas. Le retour à la valeur initiale est confirmé, mais le passage à la valeur opposée ne persiste pas. Il faut documenter la vraie source de vérité, la liste alimentée et les prérequis de configuration.

### C-003 — Reset password : description et exemple ne décrivent pas le même contrat

Le texte mentionne `ResetLink` et `ResetTokenExpiryHours`. L'exemple JSON ne contient aucun de ces champs et publie à la place `ExternalResetToken`. Avec `ResetLink` et `ResetTokenExpiryHours`, le service Parigo répond `Required route not found`.

À clarifier : body canonique, format exact de route, domaine autorisé, template nécessaire et comportement de `ExternalResetToken`.

### C-004 — Favori d'album sans ressource Album

`addtofavourites/.../Album/...` ajoute les pistes de l'album. `getfavourites` ne renvoie ensuite aucun objet Album et la documentation ne fournit qu'un retrait de piste. Il devient impossible de distinguer une piste favorite individuellement d'une piste héritée du favori album.

### C-005 — Téléchargements groupés : origine des identifiants absente

`getmusicdownloadinfo` exige `DownloadID` ou `DownloadGroupID`, mais aucun endpoint documenté ne montre clairement quel appel initie un album, une playlist ou un dossier et renvoie cet identifiant. L'historique du compte de test ne fournit aucun des deux, donc le polling ne peut pas être amorcé.

### C-006 — Archives de playlists sans endpoint de liste

`archiveplaylist` et `restorearchiveplaylist` fonctionnent et leur persistance a été confirmée. Aucun endpoint des 257 contrats ne permet cependant de lister les archives ou d'ajouter `includeArchived` à une liste.

### C-007 — Recherches sauvegardées sans contrat de replay

La création, la modification et la lecture fonctionnent. `searchmembersavesearches` renvoie `SearchParameters`, mais aucun endpoint ne documente une relance canonique depuis l'ID ou les paramètres sauvegardés.

### C-008 — Liste plate des playlists sans dossier

`getmemberplaylistsnotracks` ne renvoie aucun `PlaylistCategoryID`. La hiérarchie nécessite un second appel et une fusion. La documentation devrait soit annoncer cette limitation, soit exposer l'ID de dossier dans la liste plate.

### C-009 — Recherche multilingue

`TranslateKeyword: "fr"` ne transforme pas `mariage` en `wedding` :

| Recherche | Portée | Résultat live |
| --- | --- | ---: |
| `mariage` | titre | 0 |
| `mariage` | agrégée | 0 |
| `wedding` | titre | 171 |
| `wedding` | agrégée | 1 231 |

Roland a confirmé que Harvest ne fournit pas de recherche multilingue et que les clients doivent utiliser les keyword groups. La documentation doit donc expliquer précisément la sémantique de `TranslateKeyword`, pour éviter de l'interpréter comme une traduction native.

### C-010 — Similarité documentée mais capacité absente du service

La documentation expose AIMS, Cyanite et Harmix. `getserviceinfo` renvoie toutefois `SearchSimilarInfo: []` pour Parigo, et `suggestmemberplaylisttracks` confirme que la fonctionnalité n'est pas activée. Ce n'est pas une erreur de documentation générale, mais chaque workflow devrait préciser le mécanisme de découverte de capacité, les prérequis et les réponses attendues quand le fournisseur est absent.

### C-011 — Champs live mal orthographiés ou temporels ambigus

- La hiérarchie de playlists renvoie `LasPublishDate`, alors que les autres réponses et exemples utilisent `LastPublishDate`.
- Les dates membre sont souvent sans suffixe de fuseau, avec un `UTCOffset` séparé. Le contrat devrait préciser si l'offset s'applique à chaque date et s'il est exprimé en heures.

## Points contrôlés et conformes

Les appels suivants ont été exécutés avec succès pendant cette campagne :

- OAuth, service token, validation de token, service info, régions, région par IP, pays et guest token ;
- bibliothèques actives/inactives, bibliothèque, groupes de styles, styles ;
- albums par bibliothèque, IDs et styles, featured/latest, détail et pistes ;
- `gettracks`, `gettoptracks` après retrait du commentaire JSON, catégories et ayants droit ;
- catégories/playlists featured, détail, recherche interne ;
- autocomplete ;
- login membre, validation du member token et validation du persistent token avec le payload officiel ;
- profil, catégories de playlists, listes et détail de playlists, shares et historique de recherche de playlist ;
- favoris, historiques d'écoute/téléchargement/communication ;
- tags, pistes de tag, tags par piste et commentaires en lecture ;
- création, modification et suppression d'un commentaire privé, avec relecture de persistance et nettoyage ;
- recherches sauvegardées ;
- création/mise à jour/suppression de tag ;
- création/mise à jour/suppression de recherche sauvegardée ;
- création/mise à jour/copie/déplacement/archivage/restauration/suppression de playlist et de dossier ;
- ajout, déduplication, retrait et réordonnancement de pistes ;
- validation de téléchargement avec `Identifier`, `DownloadType`, `Format`, `TrimStartSecs`, `TrimEndSecs`, `IncludeVersionCheck` ;
- génération de cue sheet avec `{ "track": ["<id>"] }`.

Le dernier run direct compte 59 contrôles, zéro erreur de transport et un seul échec fonctionnel attendu : la lecture du schedule d'une playlist qui n'en possède pas. Les lectures volumineuses qui avaient expiré ponctuellement dans un run antérieur ont toutes répondu HTTP 200 lors de cette passe finale.

## Anciennes suspicions à ne plus présenter comme bugs Harvest

| Sujet | État actuel |
| --- | --- |
| Création de playlist | le wrapper documenté `requestaddupdateplaylist` en minuscules persiste correctement |
| Mise à jour de playlist | les propriétés documentées en minuscules persistent correctement |
| Ajout/retrait/réordonnancement de pistes | payloads documentés validés et relus |
| Copie de playlist featured | payload officiel validé et copie nettoyée |
| Validation de téléchargement | payload officiel validé ; l'ancien payload Parigo était incorrect |
| Cue sheet | le body officiel `track` fonctionne pour une ou plusieurs pistes |
| Persistent login | le body officiel `Token`, `RenewExpiry`, `GenerateMemberToken`, `ReturnMemberDetails` fonctionne |

## Preuves et reproductibilité

- Inventaire complet des 279 entrées : [`endpoint-inventory.csv`](./endpoint-inventory.csv)
- Classification exhaustive par endpoint et famille : [`endpoint-classification.csv`](./endpoint-classification.csv)
- Dernier run de lecture directe : [`last-public-read-run.json`](./last-public-read-run.json)
- Dernier run de capacités réversibles : [`last-capability-run.json`](./last-capability-run.json)
- Harnais de lecture : [`smoke-tests/public-read-conformance-audit.ts`](./smoke-tests/public-read-conformance-audit.ts)
- Diagnostics directs membre : [`smoke-tests/member-direct-diagnostics.ts`](./smoke-tests/member-direct-diagnostics.ts)
- Audit d'intégration antérieur : [`audit-integration-2026-07-30.md`](./audit-integration-2026-07-30.md)

Toutes les ressources de test créées par la dernière campagne de capacités ont été nettoyées. Aucun compte n'a été supprimé, aucun catalogue n'a été modifié, aucun paiement n'a été déclenché et aucun second téléchargement n'a consommé de quota.
