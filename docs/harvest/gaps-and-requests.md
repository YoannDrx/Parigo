# Harvest — écarts et demandes encore actifs

Dernière vérification : **2 septembre 2026**. Ce registre tient compte de la
réponse de Peter du 1er septembre, des contrôles Harvest Admin et des retests
Public API effectués le même jour. La matrice historique complète se trouve
dans [`launch-readiness-audit-2026-08-26.md`](./launch-readiness-audit-2026-08-26.md).

## À confirmer avant la mise en production

| ID | Peter a confirmé | Retest du 1er septembre | Reste à faire par Harvest | Compensation Parigo | Impact lancement |
| --- | --- | --- | --- | --- | --- |
| MAIL-01 | `sendcontactusemail` exige qu’un management user Harvest soit le destinataire. Peter demande l’adresse de la boîte visée. | La boîte visée est `info@parigomusic.com`. L’utilisateur actif `Parigo Music Notifications` existe déjà. Le Sender vide de `Contact Us (API/Custom)` a été corrigé dans l’Admin en sélectionnant cet utilisateur. Le retest immédiat du payload officiel renvoie toujours HTTP 200 puis `Error.Code=4 — Internal Operation Error`; aucun message n’arrive. L’Admin n’expose aucun réglage de destinataire Contact et la documentation parle de l’« adresse principale », actuellement distincte dans Global Settings. Le code Parigo utilise désormais Harvest comme fournisseur unique. | Associer côté serveur l’utilisateur existant au destinataire, ou indiquer le contrôle Admin exact ; contrôler la clé ; reproduire le payload et confirmer destinataire, From et Reply-To. | Sender corrigé par Parigo ; aucun fournisseur de repli. | Point Harvest à fermer pour rendre le formulaire utilisable ; la préparation du lancement continue. |
| CFG-01 | Une clé correspond à un seul domaine. Les clés FLEX et Parigo pointent actuellement vers `www.parigomusic.com`. Peter a passé toutes les routes en HTTPS. | Le besoin multi-domaines concernait uniquement localhost, Vercel Preview et production. Le retest réel crée une playlist temporaire, appelle `getsharemusicurl`, puis `sendsharemusiclinkemail` : l’URL est désormais `https://www.parigomusic.com/engage-playlist/{token}` et la fixture est supprimée. Le reset complet avait déjà réussi ; `sendpasswordresetemail` renvoie encore HTTP 200. | Aucun changement de clé ou de domaine demandé. | Les routes `/fr` et `/en` sont gérées par Parigo ; la défense en profondeur qui normalise le protocole peut rester sans masquer l’état du fournisseur. | **Résolu** ; aucun problème fonctionnel de reset n’est rouvert. |
| I18N-MEMBER | La région est choisie à partir de `Country`, puis détermine la langue. L’ancien champ non documenté `LanguageCode` ne s’est pas comporté comme attendu chez Peter ; Harvest investigue. | Retest live du 2 septembre : `getregions` renvoie seulement `Global`, avec 245 pays dont FR ; `getregion/e361bcb57f53f791` renvoie `LanguageCode=EN`. L’Admin permet de créer une région et d’y affecter la France, mais une région porte aussi les labels/catalogues, approbations, téléchargements et paramètres de licence. Les six variantes FR existantes sont toutes `All regions + French`. Sur un membre de test `Country=FR`, `updatemember` avec `LanguageCode: "FR"` répond 200 mais la valeur reste absente de `getmember` après trois relectures ; l’état initial a été resoumis. | Documenter propriété, valeurs, endpoints Register/Update et champ de relecture. Si le champ n’est plus supporté, confirmer qu’une région France/FR est l’alternative prévue et préciser le sort des membres FR déjà dans Global. Confirmer ensuite la résolution des modèles, notamment sans membre identifiable. | Ne pas changer les régions avant confirmation : Parigo doit suivre la langue choisie (`/fr` ou `/en`), pas seulement le pays. Refaire les scénarios compte/e-mail après correction. | Non bloquant si les liens fonctionnent, mais nécessaire à la sélection fiable des modèles FR. |
| I18N-ALBUM | Peter reconnaît une incohérence de stratégie de localisation et demande la liste exacte des contrats utilisés. | `getalbum/750a3d73a7f4dae6` renvoie la même description anglaise pour `en`, `fr` et `fr-FR`, sans `LanguageItems`, alors que la description française de PGO0031 existe. | Exposer la description localisée ou documenter la forme et le paramètre officiels. | Fallback anglais ; aucune copie locale de la traduction. | Non bloquant avec fallback, mais écart Harvest confirmé. |
| I18N-LABEL | Peter demande les endpoints concernés avant de confirmer le contrat. | `getlibraries` expose le FR de Musica.it dans `LanguageItems`. `getlibrary/9d330c152c37bca0?languagecode=en|fr` commute correctement `Detail` mais omet `LanguageItems`. | Confirmer et documenter la stabilité de ces deux formes, les codes de langue et le fallback. | Double lecture du détail EN/FR, fusion, déduplication et fallback. | Compensé côté Parigo. |
| I18N-PLAYLIST | Peter demande les endpoints concernés avant de confirmer le contrat. | `getfeaturedplaylistsplaylistonly` retourne 64 playlists en EN et FR, mais aucun `LanguageItems` dans la liste. Sur les 64 détails, 60 ont un nom FR, 2 une description FR, 2 groupes sont des doublons exacts et aucun conflit n’est observé. Quatre noms FR manquent : Brand – New Media, Lifestyle, DIY et Corporate. | Confirmer que le détail est la source officielle des `LanguageItems` et documenter la forme liste/détail. Les traductions absentes restent du contenu à compléter, pas un bug API démontré. | Fusion liste+détail, déduplication et fallback FR → EN → canonique. | Compensé ; contenu manquant non bloquant. |
| SEARCH-I18N | Peter ne retrouve pas d’ancienne configuration multilingue ; les keyword groups actuels datent de 2023/2024. Il demande le fichier de traduction historique. | Les 16 groupes ont été inventoriés en lecture seule : neuf décennies 1910–1990, `Atmospheres`, `Balkan`, `Blues`, `brazil`, `Hip Hop`, `Soundtrack` et `Symphonic`. Seul `brazil / brésil / bresil` est bilingue ; aucun `sad / triste`. Groupes on/off, `reggae sad` reste à 53 et `reggae triste` à 2. Brésil fonctionne (`brésil` : 0 → 851), mais `brazil` passe de 1 109 à 851. Les formes courtes de décennies sont très bruyantes : `1910` passe de 137 à 41 561 à cause notamment de `10s`, avec des `No. 10` en tête ; `1950` passe de 2 206 à 23 465. `Atmospheres` et `Soundtrack` n’ont aucune alternative ; `Blues` réunit quatre sous-genres non équivalents. Les taxonomies live contiennent 303 couples EN/FR distincts. | Documenter format d’import/export, sémantique union/substitution, réindexation et rollback. Nettoyer d’abord les groupes existants, puis lancer un petit lot (`sad/triste`, moods/usages prioritaires), pas un import global. | Export préalable, retrait des abréviations ambiguës, candidats générés depuis les IDs stables catégories/styles, comparaison EN/FR groupes on/off avant généralisation. | Non bloquant pour le site ; comportement bilingue métier non satisfait et groupes historiques à assainir. |
| SEARCH-POS | Peter confirme que `ExactPhrase` gère l’ordre des mots et que `Wildcard=true` ajoute seulement un suffixe (`pop*`). | `POST /cloudsearch` restreint à `TrackDisplayTitle` avec « Piano » donne 1 480/1 491/1 480/1 480 résultats selon les quatre combinaisons, avec le même début de classement. Restreint à `AlbumDisplayTitle`, « Music » donne 80/82/80/80 et mélange également commence/contient/finit. Les titres complets `Piano Minuet` et `MUSIC ON HOLD` donnent chacun un résultat strict. | Fournir les payloads officiels ou deviser séparément commence/contient/finit/égal sur `TrackDisplayTitle` et `AlbumDisplayTitle`, avec coût, réindexation et rollback. | Le contrôle local peut reconnaître ces positions après retour, mais ne peut pas rendre découvrables des résultats absents. | Non bloquant. |
| SEARCH-RANK | Peter confirme qu’un `RankExpression` propre à Parigo nécessite son intervention et peut entraîner un coût initial. | Le classement Harvest par défaut masque les titres littéraux : sur la première page agrégée, `crime` n’a que 4 titres visibles correspondants sur 30, `piano` 2/30, et l’album exact `MUSIC ON HOLD` est absent des 30 premiers. La double voie Parigo les remet en tête. Un envoi final utilise actuellement 2 `cloudsearch` parallèles puis `gettracks` pour les pistes ; l’autocomplétion chaude utilise au minimum 1 `autocomplete`, 4 `cloudsearch` et 2 lectures de détail. Mesures locales live : recherche finale 1,51–2,33 s et autocomplétion 2,56–4,75 s sur trois fixtures. | Proposer et deviser deux profils Track/Album utilisables aussi par l’autocomplétion, avec titre exact dominant, métadonnées éditoriales ensuite et récence comme faible départage. Fournir syntaxe, champs, scores/debug, avant/après, coût, délai, rollback et réindexation. | Conserver la double voie tant qu’un shadow test ne prouve pas qu’un seul `cloudsearch` garde la couverture, les facettes, la pagination et la qualité. Une expression validée pourrait supprimer une voie CloudSearch, mais pas le BFF ni l’enrichissement. | Non bloquant, mais pertinent pour qualité et performance. |
| COMM-01 | Les e-mails reçus par le membre devraient apparaître dans `gethistorybycommunications`. Peter demande l’endpoint source exact qui manque. | Nouveau partage réel envoyé avec succès par `sendsharemusiclinkemail`, puis lecture immédiate côté destinataire : HTTP 200, 10 entrées, toutes des resets ; le nouveau partage manque. Le partage reçu le 10 août manque aussi. Champs : `Type`, `From`, `To`, `Subject`, `Date`, `Status`. | Reproduire `sendsharemusiclinkemail` côté expéditeur puis `gethistorybycommunications` côté destinataire et expliquer l’absence. | L’UI expose fidèlement les six champs disponibles. | Non bloquant ; anomalie Harvest à investiguer. |

## Points non bloquants fermés ou reportés

| ID | Conclusion du 1er septembre | Suite |
| --- | --- | --- |
| TAG-01 | Peter confirme que `TotalTagsCount` compte seulement les tags et qu’aucun compteur de pistes par tag n’est disponible. Le retest trouve trois tags contenant 1, 5 et 1 pistes ; `ReturnTagCount=1` ne change pas les objets. | Demande fermée. Parigo conserve une lecture `getmembertagtracks` par tag, avec concurrence limitée. |
| RH-01 | Peter n’a pas répondu à ce point. La normalisation d’affichage temporaire ne nettoie pas la donnée source. | Après lancement : valider les templates Composer/Publisher/Artist, les séparateurs, mains/alternates/stems, réindexation et rollback, puis lancer un essai réversible sur un album. |
| AIMS | Les recherches track, prompt, upload et URL fonctionnent via Harvest ; les capacités et les routes `/api/similarity/*` sont validées. Le 1er septembre, 43/43 tests ciblés repassent et `/api/similarity/capabilities` annonce les quatre modes activés. | Intégration résolue. Indexation continue et disponibilité = surveillance Harvest, sans nouvelle demande AIMS. |
| TAXONOMIES | 532/532 catégories et 161/161 styles sont localisés ; `Sad → Triste` et `Abstract → Abstrait` sont corrects. | Résolu et exclu de la relance. |
| MAIL-AUTH | Jarrod Collett a piloté la migration vers Amazon SES du 11 au 13 août : trois DKIM, MX/SPF du MAIL FROM `amazonses.parigomusic.com` et DMARC. SPF/DKIM/DMARC sont alignés et Gmail n’affiche plus « via harvestmedia.net ». | Résolu et exclu de la relance. |

## Liste des contrats localisés transmise à Harvest

```text
GET /getalbum/{guestToken}/{albumId}
GET /getlibraries/{guestToken}
GET /getlibrary/{guestToken}/{libraryId}?languagecode=en|fr
GET /getfeaturedplaylistsplaylistonly/{guestToken}?languagecode=en|fr
POST /getfeaturedplaylistandtracks/{guestToken}/{playlistId}
```

Besoin : descriptions d’album et de label, ainsi que noms et descriptions de
featured playlists, en EN et FR. Le contrat préféré conserve des champs
canoniques stables et expose les traductions complètes dans `LanguageItems` avec
des types documentés (`AlbumDescription`, `LibraryDescription`,
`FeaturedPlaylistName`, `FeaturedPlaylistDescription`). Un remplacement direct
selon `languagecode` reste acceptable s’il est documenté et stable.

## Critères de clôture du contact

Le contact reste non fonctionnel jusqu’à ce que le payload officiel :

1. réussisse sans `Error.Code` ;
2. soit reçu dans `info@parigomusic.com` avec nom, adresse, sujet et message ;
3. expose un expéditeur et un `Reply-To` exploitables, sans doublon ;
4. produise une réponse 201 du BFF Parigo.

Harvest est déjà l’unique fournisseur dans le code. Le contrat public et le
mapping d’un échec Harvest vers `502 CONTACT_PROVIDER_ERROR` restent inchangés.

## Règle de maintenance

Un sujet ne quitte ce registre qu’après réponse explicite et retest concordant.
Toute mutation Admin ou tout envoi de test est limité, réversible, identifié et
consigné. Aucun e-mail fournisseur n’est envoyé sans validation humaine.
