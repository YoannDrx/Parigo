# Registre des écarts et demandes Harvest

Ce document centralise les capacités absentes, ambiguës ou défaillantes rencontrées par Parigo. Il complète l’inventaire technique de l’API et sert de base au futur échange avec Harvest. Chaque observation doit être datée, reproductible et accompagnée du contournement temporaire utilisé par Parigo.

## Contexte

- Harvest reste la source runtime des albums, pistes, fichiers audio, pochettes et crédits bruts.
- Parigo va prochainement accéder au CMS Harvest afin d’enrichir le catalogue.
- Les profils éditoriaux, alias validés et relations vidéo sont temporairement versionnés dans Parigo.
- Le but est de migrer progressivement ces relations vers Harvest si le CMS et l’API savent les stocker et les exposer avec des identifiants stables.

## Registre

| ID | Capacité | Observation au 25/07/2026 | Impact | Contournement Parigo | Demande Harvest | Statut |
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

## Règle de maintenance

Tout nouveau manque Harvest découvert pendant le développement doit créer ou mettre à jour une entrée de ce registre dans le même changement de code. Une limitation amont ne doit jamais être transformée silencieusement en donnée vide ou en relation supposée.
