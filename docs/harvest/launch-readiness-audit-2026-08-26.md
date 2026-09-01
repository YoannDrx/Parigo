# Harvest/AIMS — matrice d’audit et préparation du lancement

Date initiale : **26 août 2026** — dernière consolidation :
**2 septembre 2026**, fuseau `Europe/Paris`.

Statuts : `résolu`, `compensable par Parigo`, `blocage Harvest`,
`contenu à compléter`, `non applicable`.

## Matrice consolidée

| ID | Question d’origine | Peter / Harvest a confirmé | Preuve et retest du 1er septembre | Reste à faire par Harvest | Compensation Parigo | Statut et impact lancement |
| --- | --- | --- | --- | --- | --- | --- |
| MAIL-01 | Pourquoi `sendcontactusemail` échoue-t-il avec le payload documenté ? | Un management user doit recevoir le formulaire ; Peter demande la boîte cible. | `info@parigomusic.com` est la cible et `Parigo Music Notifications` existe. Parigo a corrigé le Sender vide du modèle en sélectionnant cet utilisateur, puis a retesté : HTTP 200, `Code=4`, aucun e-mail. Aucun réglage de destinataire Contact n’est visible ; la documentation « primary email » et le management user décrit par Peter restent à réconcilier. Harvest est désormais le seul fournisseur configuré côté Parigo. | Associer le destinataire côté serveur ou documenter le contrôle Admin ; vérifier clé/end-point ; confirmer destinataire, From et Reply-To. | Sender corrigé ; aucun fournisseur de repli. | Point Harvest à fermer pour rendre le formulaire utilisable ; la préparation du lancement continue. |
| CFG-01 | Une clé peut-elle servir localhost, Preview et production ? Les callbacks peuvent-ils être générés en HTTPS ? | Une clé = un domaine. FLEX et Parigo pointent vers `www.parigomusic.com`. Peter a passé toutes les routes en HTTPS. | Le retest réel de partage appelle `getsharemusicurl` puis `sendsharemusiclinkemail` : URL `https://www.parigomusic.com/engage-playlist/{token}`, envoi réussi et fixture supprimée. Le reset complet avait déjà réussi ; `sendpasswordresetemail` renvoie HTTP 200 au nouveau contrôle. | Aucun nouveau domaine ni clé demandé. | Locales gérées par `/fr` et `/en`; normalisation HTTPS conservée comme défense en profondeur. | `résolu`. |
| I18N-MEMBER | Comment écrire la langue du membre et comment les e-mails choisissent-ils leur variante ? | La région découle de `Country` et détermine la langue. L’ancien `LanguageCode` non documenté ne fonctionne pas comme attendu ; Harvest investigue. | `getregions` live renvoie une seule région `Global`, 245 pays dont FR ; `getregion/e361bcb57f53f791` renvoie `LanguageCode=EN`. L’Admin permettrait une région France/FR, mais celle-ci gouverne aussi labels/catalogues, approbations, téléchargements et licence. Les six templates FR sont `All regions + French`. Pour un membre `Country=FR`, `updatemember` avec `LanguageCode: FR` répond 200 sans erreur, mais trois relectures ne renvoient toujours aucun champ langue ; l’état initial a été resoumis. | Fournir propriété exacte, valeurs, endpoints Register/Update et champ de relecture. Si le champ n’existe plus, confirmer l’alternative région, ainsi que la migration des membres `Country=FR` déjà dans Global. | Ne pas modifier les régions avant confirmation : la langue Parigo dépend du choix `/fr` ou `/en`, pas uniquement du pays. | `blocage Harvest` sur le contrat, non bloquant pour lancer si les parcours restent utilisables. |
| I18N-ALBUM | Comment obtenir la description FR de PGO0031 ? | Peter constate une incohérence d’approche et demande les contrats concernés. | `getalbum/750a3d73a7f4dae6` avec `en`, `fr` ou `fr-FR` retourne le même `Detail` anglais, sans `LanguageItems`. | Corriger ou documenter le contrat officiel. | Fallback anglais, sans donnée traduite codée localement. | `blocage Harvest`, mais non bloquant grâce au fallback. |
| I18N-LABEL | Quelle forme de traduction est officielle entre liste et détail ? | Peter demande la liste des endpoints avant de répondre. | `getlibraries` expose le FR de Musica.it dans `LanguageItems`; `getlibrary/9d330c152c37bca0?languagecode=en|fr` remplace `Detail` et omet `LanguageItems`. | Documenter ce contrat, les codes et le fallback. | Double lecture EN/FR, fusion et déduplication. | `compensable par Parigo`, non bloquant. |
| CONTENT-LABEL | Le label Parigo possède-t-il une description FR ? | Non demandé à Harvest. | Description EN présente, champ FR vide dans l’Admin. | Aucun correctif API attendu. | Fallback anglais. | `contenu à compléter`, non bloquant. |
| I18N-PLAYLIST | Quelle source utiliser pour les noms et descriptions localisés ? | Peter demande la liste des endpoints avant de répondre. | La liste EN/FR contient 64 playlists et **zéro** `LanguageItems`. Les 64 détails contiennent 60 noms FR, 2 descriptions FR, 2 groupes de doublons exacts, aucun conflit. Quatre noms FR manquent : Brand – New Media, Lifestyle, DIY et Corporate. | Confirmer que le détail est la source officielle et documenter la différence liste/détail. | Fusion détail+liste, déduplication, fallback anglais. | `compensable par Parigo`; traductions absentes = `contenu à compléter`, non bloquant. |
| I18N-CATEGORIES | Les catégories FR sont-elles complètes ? | Ancienne demande devenue obsolète. | 532/532 ; `Sad → Triste`. | Rien. | Mapping existant inchangé. | `résolu`. |
| I18N-STYLES | Les styles FR sont-ils complets ? | Ancienne demande devenue obsolète. | 161/161 ; `Abstract → Abstrait`. | Rien. | Mapping existant inchangé. | `résolu`. |
| I18N-TRACKS | Un contrat de traduction des pistes existe-t-il ? | Aucun contrat officiel identifié. | PGO0031 : 81 pistes `mainonly`, 216 uniques `includeinactive`; aucun `LanguageItems` ni variation de titre EN/FR. | Rien pour le lancement. | Titres et crédits canoniques. | `non applicable`. |
| I18N-RH | Les biographies d’ayants droit sont-elles localisables ? | Roland a documenté l’édition des Right Holders, sans biographie multilingue. | Admin sans onglet EN/FR ; API limitée aux crédits, société, IPI et parts. | Rien pour le lancement. | Crédits canoniques. | `non applicable`. |
| SEARCH-I18N | L’ancienne recherche bilingue Parigo peut-elle être restaurée ? | Peter ne retrouve pas cette configuration ; les groupes actuels datent de 2023/2024. Il demande la template historique. | Inventaire Admin en lecture seule : neuf groupes de décennies et sept autres (`Atmospheres`, `Balkan`, `Blues`, `brazil`, `Hip Hop`, `Soundtrack`, `Symphonic`). Seul Brésil est bilingue, aucun `sad/triste`. Groupes on/off, `reggae sad` reste 53 et `reggae triste` 2. `brésil` passe de 0 à 851, mais `brazil` de 1 109 à 851. Les abréviations de décennies sont très bruyantes : `1910` 137 → 41 561 via `10s`; `1950` 2 206 → 23 465. Deux groupes n’ont qu’un terme ; `Blues` mélange des sous-genres. Les taxonomies live fournissent 303 couples EN/FR distincts. | Documenter import/export, sémantique, réindexation et rollback. Nettoyer les groupes historiques puis piloter un lot bilingue réduit. | Export préalable ; retrait des termes courts ambigus ; candidats depuis les IDs de taxonomie ; comparaisons groupes on/off dans les deux langues. | `blocage Harvest` sur l’écart historique, non bloquant pour le lancement. |
| TAG-01 | `ReturnTagCount` peut-il donner le nombre de pistes par tag ? | Non. `TotalTagsCount` est uniquement le nombre total de tags. | Trois tags ; détails à 1, 5 et 1 pistes ; aucune différence avec `ReturnTagCount=1`. | Aucune demande supplémentaire. | Une lecture `getmembertagtracks` par tag, concurrence limitée. | `résolu` comme limitation acceptée, non bloquant. |
| SEARCH-POS | Comment obtenir commence par, contient, finit par et égal sur un champ titre ? | `ExactPhrase` règle l’ordre des mots ; `Wildcard=true` produit seulement un suffixe `query*`, pas `*query*` ni `*query`. | Sur `TrackDisplayTitle`, « Piano » donne 1 480/1 491/1 480/1 480 résultats et le même début de classement. Sur `AlbumDisplayTitle`, « Music » donne 80/82/80/80. Les positions restent mélangées ; les titres complets donnent chacun un résultat strict. | Fournir l’opérateur/payload officiel ou deviser une évolution séparée pour commence/contient/finit/égal sur `TrackDisplayTitle` et `AlbumDisplayTitle`. | Post-filtrage local possible seulement sur les résultats déjà renvoyés. | `compensable par Parigo`, non bloquant. |
| SEARCH-RANK | Peut-on pondérer officiellement les titres et supprimer la double voie de recherche ? | Oui via un `RankExpression` spécifique à Parigo, avec intervention Harvest et possible coût initial. Il classe les résultats déjà trouvés. | Le payload courant utilise le classement Harvest par défaut. Sur la première page agrégée, `crime` n’a que 4/30 titres littéraux visibles et `piano` 2/30 ; l’album exact `MUSIC ON HOLD` est absent des 30 premiers. La double voie Parigo corrige l’ordre, mais coûte 2 `cloudsearch` par recherche, puis `gettracks` pour les pistes. L’autocomplétion chaude utilise au minimum 1 `autocomplete`, 4 `cloudsearch` et 2 lectures de détail. Mesures live locales : recherche 1,51–2,33 s ; autocomplétion 2,56–4,75 s. | Deviser deux profils Track/Album utilisables par `cloudsearch` et l’autocomplétion : titre exact dominant, titre/phrase ensuite, métadonnées éditoriales après, récence faible. Fournir formule, champs, scores/debug, avant/après, coût, délai, rollback et réindexation. | Shadow pilot obligatoire. Si couverture/facettes/pagination restent stables, une expression validée pourrait réduire la recherche à un seul `cloudsearch`, sans supprimer le BFF ni l’enrichissement. | `compensable par Parigo`, non bloquant mais utile pour pertinence et performance. |
| COMM-01 | Pourquoi un partage reçu manque-t-il à `gethistorybycommunications` ? | Tout événement envoyant un e-mail au membre devrait apparaître ; Peter demande l’endpoint manquant. | Nouveau partage réel réussi via `sendsharemusiclinkemail`, puis lecture immédiate côté destinataire : HTTP 200, 10 resets seulement, sans le nouveau partage. Le partage reçu le 10 août manque aussi. Champs `Type/From/To/Subject/Date/Status`. | Reproduire le couple send côté expéditeur/read côté destinataire et expliquer l’absence. | UI fidèle au contrat exposé. | `compensable par Parigo`, anomalie non bloquante. |
| RH-01 | Valider templates, capacités, séparateurs et batch Right Holder. | Point omis par Peter. | Aucun template activé ni batch lancé. Le front normalise temporairement Composer/Publisher/Artist, mais la donnée source reste à nettoyer. | Après lancement : valider template, mains/alternates/stems, réindexation, rollback et pilote réversible sur un album. | Nettoyage d’affichage uniquement. | `blocage Harvest`, explicitement hors chemin critique du lancement. |
| MAIL-AUTH | Authentifier `info@parigomusic.com` sans « via Harvest ». | Jarrod Collett a piloté le setup Amazon SES du 11 au 13 août et créé le management user dédié. | Trois DKIM, MX/SPF du MAIL FROM et DMARC validés ; SMTP basculé ; Gmail affiche SPF/DKIM/DMARC alignés sans « via ». | Rien. | Rien. | `résolu`. |
| AIMS | L’intégration et les quatre modes fonctionnent-ils ? | Architecture Public API Harvest et livraison mains confirmées. | Track, prompt, upload WAV synthétique et URL, dont le lien YouTube Music fourni, renvoient chacun 30 résultats ; 30/30 pistes récentes couvertes ; 43/43 tests ciblés ; uniquement `/api/similarity/*`. | Surveillance opérationnelle de l’indexation et disponibilité. | Flags permettent de fermer la similarité sans affecter le catalogue. | `résolu`, intégration terminée. |

## Reproduction technique à transmettre à Peter

### Contact

```text
POST /sendcontactusemail/{serviceToken}
```

```json
{
  "Name": "Parigo API audit",
  "Email": "<adresse de test>",
  "PhoneNumber": "",
  "Subject": "Parigo contact endpoint retest <timestamp>",
  "Message": "Automated Parigo audit message after Harvest support configuration review."
}
```

Résultat : HTTP 200, `Error.Code=4`, `Error.Description=Internal Operation
Error`, aucun message dans `info@parigomusic.com`.

### Contrats localisés

```text
GET /getalbum/{guestToken}/{albumId}
GET /getlibraries/{guestToken}
GET /getlibrary/{guestToken}/{libraryId}?languagecode=en|fr
GET /getfeaturedplaylistsplaylistonly/{guestToken}?languagecode=en|fr
POST /getfeaturedplaylistandtracks/{guestToken}/{playlistId}
```

Contrat préféré : champs canoniques stables et traductions dans
`LanguageItems`, avec types documentés `AlbumDescription`,
`LibraryDescription`, `FeaturedPlaylistName` et
`FeaturedPlaylistDescription`. Le remplacement direct par `languagecode` reste
acceptable s’il est documenté et invariant pour le contrat concerné.

### Historique du partage reçu

```text
POST /sendsharemusiclinkemail/{senderMemberToken}
```

```json
{
  "FromEmail": "<membre expéditeur>",
  "ToEmail": "<membre destinataire>",
  "Message": "<message de test>",
  "Link": "<URL de partage>",
  "ContentType": "Playlist",
  "ContentTitle": "<titre>",
  "SelectEmailTemplateByMemberRegion": false
}
```

Puis, avec le token du destinataire :

```text
POST /gethistorybycommunications/{recipientMemberToken}
```

```json
{
  "Skip": 0,
  "Limit": 100,
  "Sort": "Created_Desc",
  "StartDate": "",
  "EndDate": ""
}
```

## Décision de lancement

Le seul parcours encore non fonctionnel actuellement reproduit est le contact
Harvest. Il sera fermé uniquement après réception dans `info@parigomusic.com`, validation
du Sender et du `Reply-To`, absence de doublon et réponse 201 du BFF. Le reset
de mot de passe n’est pas rouvert : token, changement, connexion et consommation
unique ont déjà réussi ; seul le HTTPS des nouveaux liens reste à contrôler.

Harvest est déjà l’unique fournisseur dans le code : l’ancien fournisseur, ses
variables et ses modèles locaux ont été retirés. Le succès HTTP 201 et le
mapping d’un échec Harvest vers `502 CONTACT_PROVIDER_ERROR` sont conservés.

## Validations techniques

### 27 août

- lint, typecheck, tests unitaires et build réussis ;
- 43/43 tests AIMS ciblés ;
- track, prompt, upload et URL : 30 résultats chacun.

### 1er septembre

- audit de localisation live réussi ;
- audit des gaps live non mutatif réussi ;
- contrat de recherche live réussi ;
- 6 fichiers et 43/43 tests AIMS ciblés réussis de nouveau ;
- `/api/similarity/capabilities` annonce track, prompt, upload et URL comme
  disponibles et activés ;
- Sender du modèle Contact corrigé de manière réversible vers `Parigo Music Notifications` ;
- retest contact réel (`Code=4` persistant), partage réel HTTPS et historique destinataire contrôlés ;
- test `LanguageCode` réversible exécuté, valeur ignorée et profil initial resoumis ;
- audit positionnel Track/Album exécuté sur les quatre combinaisons.

Les réponses brutes versionnées ou citées sont expurgées de toute clé, token,
mot de passe et adresse de compte de test non nécessaire à la reproduction.
