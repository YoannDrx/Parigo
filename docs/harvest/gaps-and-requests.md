# Registre des écarts et demandes Harvest

Ce document centralise les capacités absentes, ambiguës ou défaillantes rencontrées par Parigo. Il complète l’inventaire technique de l’API et sert de base au futur échange avec Harvest. Chaque observation doit être datée, reproductible et accompagnée du contournement temporaire utilisé par Parigo.

## Contexte

- Harvest reste la source runtime des albums, pistes, fichiers audio, pochettes et crédits bruts.
- Parigo va prochainement accéder au CMS Harvest afin d’enrichir le catalogue.
- Les profils éditoriaux, alias validés et relations vidéo sont temporairement versionnés dans Parigo.
- Le but est de migrer progressivement ces relations vers Harvest si le CMS et l’API savent les stocker et les exposer avec des identifiants stables.

## Registre

| ID | Capacité | Observation consolidée au 29/07/2026 | Impact | Contournement Parigo | Demande Harvest | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| H-001 | Répertoire compositeurs | Aucun endpoint public complet de profils compositeurs avec identifiant, photo, bio, liens et alias n’a été identifié. | Impossible de produire des pages éditoriales uniquement depuis Harvest. | Profils migrés de Portfolio Caro. | Confirmer l’existence d’une entité Contributor/Composer et d’un endpoint de liste/détail. | À confirmer |
| H-002 | Crédits album | Les crédits exploitables sont portés par les pistes, pas directement et structurellement par l’album. | Chaque album candidat doit être chargé pour valider un compositeur. | Recherche album puis validation des pistes. | Exposer des contributeurs agrégés sur l’album avec identifiant et rôle. | À confirmer |
| H-003 | Normalisation des crédits | Les champs `Composer` sont des chaînes présentant casse, diacritiques, suffixes de société et noms de scène variables. | Les relations par nom sont fragiles. | Alias explicites et comparaison exacte après normalisation conservatrice. | Retourner un identifiant stable, un nom canonique, les alias et la société de gestion séparément. | Ouvert |
| H-004 | Entité vidéo | Aucun endpoint vidéo/clip structuré n’a été identifié dans l’inventaire fourni. | YouTube et Parigo portent l’inventaire audiovisuel. | Playlist YouTube plus manifeste éditorial. | Confirmer ou ajouter une entité Video/EditorialAsset. | À confirmer |
| H-005 | Relations vidéo | Aucune relation vidéo → album, piste ou contributeur n’est exposée. | Les crédits de clips doivent être validés localement. | Relations explicites avec provenance et statut. | Ajouter des relations par identifiants vers albums, pistes et contributeurs. | À confirmer |
| H-006 | Recherche compositeur | `cloudsearch` renvoie des albums candidats pour un nom, mais le résultat seul ne prouve pas le crédit. | Risque de faux positifs. | Seconde validation sur les pistes de chaque album. | Fournir un filtre par identifiant de contributeur et documenter sa sémantique. | Ouvert |
| H-007 | CMS et champs personnalisés | Les capacités exactes du futur CMS Parigo et leur exposition Public API/Import API sont inconnues. | Risque de saisir des données non récupérables par le site. | Aucun champ CMS n’est supposé avant validation. | Préciser les entités, champs, relations, permissions et endpoints disponibles. | À qualifier lors de l’accès CMS |
| H-008 | Ayants droit | Le smoke test live du 25/07/2026 a renvoyé trois ayants droit sur une piste testée. La stabilité, l’exhaustivité et le batch restent à valider. | Coût réseau et impossibilité de bâtir un répertoire fiable sans garanties. | Smoke test facultatif, aucune dépendance publique. | Confirmer stabilité des ID, pagination, rôles/capacités et appel batch. | Partiellement vérifié |
| H-009 | Encodage | Des variantes comportant des caractères mal encodés ont été observées dans les crédits. | Noms erronés et échec du rapprochement. | Signalement dans l’audit, aucune correction floue. | Corriger les valeurs sources et préciser l’encodage garanti. | Ouvert |
| H-010 | Synchronisation des mises à jour | Aucun webhook ou contrat `updatedAt` global n’est utilisé pour ces relations. | Le cache peut conserver une ancienne version après édition CMS. | Cache court et audits manuels. | Proposer webhook, flux de changements ou timestamp fiable pour invalider les caches. | À confirmer |
| H-011 | Traduction et synonymes de recherche | `TranslateKeyword: "fr"` ne traduit pas `mariage` vers l’anglais sur le catalogue live. La Public API documente les groupes de mots-clés, mais aucun endpoint public d’inventaire ou d’administration de ces groupes n’a été identifié. | Les utilisateurs francophones peuvent obtenir zéro résultat pour un concept pourtant indexé en anglais ; activer les groupes sans audit risquerait aussi d’élargir une recherche stricte. | Recherche limitée au titre avec groupes désactivés, puis traduction générique français → anglais par DeepL dans le BFF après zéro résultat littéral. | Documenter `TranslateKeyword`, exposer les groupes/synonymes configurés et garantir leur portée par champ, ou fournir une recherche multilingue officielle. | Ouvert |
| H-012 | Notes privées de piste | Le 29/07/2026, `addtrackmembercomment` appelé avec les champs officiels `TrackID` et `TagName` renvoie HTTP 200, `Error.Code=2`, « trackid is empty ». | Création, modification et suppression de notes non validables. | Aucun commentaire local simulé ; l’UI présente un échec fonctionnel. | Confirmer le body canonique, le wrapper éventuel et les prérequis de compte. | Reproductible |
| H-013 | Retrait d’un album favori | Le 30/07/2026, `addtofavourites/.../Album/...` a ajouté les 12 pistes de l’album et `getfavourites` n’a renvoyé aucun objet Album. Seul le retrait piste par piste est documenté. | L’intention « album favori » est perdue et une piste favorite individuellement devient indiscernable d’une piste héritée de l’album. | Adaptateur temporaire par regroupement et retrait piste par piste. | Exposer un favori Album de première classe, sa provenance et son endpoint canonique de retrait. | Reproductible |
| H-014 | Recherche par similarité | La documentation décrit plusieurs fournisseurs, tandis que `SearchSimilarInfo` est vide sur le service live. | Impossible de proposer une recherche par prompt, URL, fichier ou piste sans supposer une configuration. | Aucune simulation locale. | Confirmer les moteurs disponibles, la configuration, les formats, limites et coûts éventuels. | À qualifier |
| H-015 | Abonnement et e-mails membre | `membersubscribe` et `updatemember` avec `Subscribe` répondent HTTP 200 sans modifier la valeur relue. `sendpasswordresetemail`, complété avec `ResetLink` et `ResetTokenExpiryHours`, répond `Required route not found`. | L’état marketing et le reset ne sont pas confirmables de bout en bout. | Le BFF refuse le faux succès ; le formulaire de contact reste porté par la solution technique interne Parigo. | Confirmer la source de vérité de l’abonnement, le fonctionnement de la liste marketing et le format/configuration de route du reset. | Reproductible |
| H-016 | Partage de playlist | Un recipient token est obtenu, puis `getsharemusicurl` appelé avec le contrat inventorié renvoie `Error.Code=2` sans URL. | Le partage avancé de playlist ne peut pas être finalisé. | Aucun lien de partage Harvest n’est annoncé comme créé. | Confirmer le contrat canonique, les prérequis du destinataire et les éventuelles conditions du service. | Reproductible |
| H-017 | Liste des playlists archivées | `archiveplaylist` et `restorearchiveplaylist` fonctionnent avec un ID connu, mais aucun des 257 endpoints `latest` ne liste les archives ou n’ajoute un filtre `includeArchived`. | Une restauration fiable après reload ou sur un autre appareil est impossible. | Fonction non exposée dans l’UI ; aucun ID n’est stocké localement comme source de vérité. | Ajouter ou documenter une liste paginée des archives avec ID, dates et statut. | Documentation insuffisante |
| H-018 | Identifiants de téléchargements groupés | `getmusicdownloadinfo` exige `DownloadID` ou `DownloadGroupID`, mais aucun autre endpoint ou exemple de réponse `latest` n’expose la provenance de ces identifiants. Le téléchargement unitaire renvoie des `DownloadTokens`. | Le polling des albums, playlists et dossiers ne peut pas être initialisé. | Route BFF prête uniquement lorsqu’un ID externe est fourni. | Documenter l’endpoint initiateur et le champ d’ID pour Album, Playlist et Playlist Category. | Documentation insuffisante |
| H-019 | Compteurs des tags | Avec `ReturnTagCount=1`, deux tags ont annoncé `TrackCount=0` alors que `getmembertagtracks` renvoyait respectivement 4 et 1 pistes. | La page Account doit exécuter une lecture supplémentaire par tag. | Le BFF calcule les comptes par lots de six appels. | Fiabiliser `TrackCount` ou fournir un endpoint batch de comptes. | Reproductible |
| H-020 | Relance des recherches sauvegardées | `searchmembersavesearches` renvoie des `SearchParameters` contenant mot-clé, filtre label et IDs d’historique, mais aucun contrat de replay depuis `SavedSearch.ID` ou ces paramètres n’est documenté. | Parigo ne peut pas déléguer la relance exacte à Harvest. | L’URL Parigo est stockée dans `Description` avec le préfixe `PARIGO_URL:`. | Documenter une relance canonique ou retourner une URL/commande de recherche stable. | Documentation insuffisante |
| H-021 | Liste de playlists et dossiers | `getmemberplaylistsnotracks` renvoie les playlists sans `PlaylistCategoryID`; `getmemberplaylistcategoriesandplaylists` fournit la hiérarchie. | Deux lectures et une fusion par ID sont nécessaires pour afficher une liste complète et son dossier. | Fusion minimale dans le BFF. | Ajouter l’ID de catégorie à la liste plate ou fournir un endpoint unique complet. | Reproductible |

## Contrat cible souhaité

### Contributeur

- identifiant immuable ;
- nom d’affichage et nom civil ;
- alias et noms de scène ;
- rôles structurés ;
- sociétés de gestion séparées ;
- photo, biographie et liens éditoriaux si le CMS le permet ;
- `updatedAt`.

### Vidéo

- identifiant immuable et identifiant YouTube ;
- type : clip officiel, teaser, making-of, live, performance, archive ou autre ;
- titre, description, miniature, ordre et statut de publication ;
- relations par identifiant vers contributeurs, pistes et albums ;
- provenance et date de mise à jour.

## Questions prêtes à envoyer

1. Le CMS permet-il de créer ou enrichir des profils de contributeurs avec des identifiants stables et des alias ?
2. Ces profils et leurs relations aux pistes/albums sont-ils exposés par la Public API ?
3. Les identifiants de `getrightholders` sont-ils stables, exhaustifs et requêtables en batch ?
4. Peut-on filtrer `cloudsearch` par identifiant de contributeur plutôt que par texte ?
5. Le CMS possède-t-il une entité vidéo ou contenu éditorial avec identifiant YouTube ?
6. Peut-on relier une vidéo à plusieurs contributeurs, pistes et albums ?
7. Les champs personnalisés du CMS sont-ils lisibles par `getwebcontent`, la Public API ou l’Export API ?
8. L’Import API peut-elle créer et maintenir ces entités et relations ?
9. Existe-t-il un webhook ou un flux de changements permettant d’invalider le cache Parigo ?
10. Harvest peut-il corriger les erreurs d’encodage et séparer les sociétés de gestion des noms ?
11. Comment `TranslateKeyword` et les groupes de mots-clés sont-ils configurés, inspectés et limités à un champ comme `TrackDisplayTitle` ou `AlbumDisplayTitle` ?

## Règle de maintenance

Tout nouveau manque Harvest découvert pendant le développement doit créer ou mettre à jour une entrée de ce registre dans le même changement de code. Une limitation amont ne doit jamais être transformée silencieusement en donnée vide ou en relation supposée.
