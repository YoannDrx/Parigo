# Audit et préparation du nettoyage des compositeurs Harvest

Ce dossier contient les snapshots historiques et les diagnostics préparés avant toute correction manuelle dans le back-office Harvest. La commande d’export et l’admin Parigo sont strictement en lecture seule : aucune route de mutation Harvest n’est appelée.

## Fichiers

- `2026-08-03-before.json` : export de rollback des 55 albums et 1 819 pistes/versions Parigo, limité aux identifiants, titres, versions, champs Composer/Artist/Publisher et ayants droit structurés.
- `2026-08-03-before.sha256` : empreinte SHA-256 de l’export précédent.
- `composer-values.csv` : une ligne par valeur Composer exacte, y compris la valeur vide.
- `track-decisions.csv` : décision proposée piste par piste et version par version.
- `pilot.csv` : lot pilote à valider avant la première sauvegarde Harvest.
- `pilot-execution-2026-08-04.json` : journal du lot pilote, avec le point de reprise et les validations Harvest rencontrées.
- `manifest.json` : métriques, empreinte, composition du pilote et état des exports.
- `audit-AAAA-MM-JJ.json` : modèle exhaustif `profil → album → œuvre principale → variantes`, incluant les contributeurs hors des 57 profils.
- `audit-AAAA-MM-JJ.csv` : une ligne opérationnelle par piste, version ou stem, avec Composer actuel/attendu, `Artist` séparé, ayants droit, anomalies et statut.
- `summary-AAAA-MM-JJ.json` : résumé daté des 57 profils publics.
- `track-decisions-AAAA-MM-JJ.csv`, `composer-values-AAAA-MM-JJ.csv`, `pilot-AAAA-MM-JJ.csv` et `manifest-AAAA-MM-JJ.json` : diagnostics opérationnels de l’exécution courante. Les fichiers génériques sans date restent le témoignage historique du premier audit et ne sont plus écrasés.

Les valeurs `needs-review` ne doivent jamais être appliquées automatiquement. Elles restent inchangées tant qu’un ayant droit structuré, le Portfolio ou Parigo ne permet pas de les confirmer.

L’export du registre global des Right Holders reste volontairement séparé. Il devra être effectué dans Harvest avant toute fusion ou suppression de fiche, avec sa portée complète hors label Parigo. Le nettoyage du texte Composer des pistes ne modifie pas les sociétés, IPI, capacités ou parts.

## Reproduction

Avec l’application locale démarrée et connectée à Harvest :

```bash
pnpm export:harvest:composer-cleanup
```

La commande relit l’inventaire courant (56 albums lors du réaudit du 5 août 2026), parcourt les alternatives et stems exposés par le BFF, et échoue si le filtre label retourne un album hors Parigo ou si l’index est incomplet. Les fichiers historiques du 3 août ne servent jamais de vérité courante.

Le seul champ destiné à une correction manuelle est `Right Holder Text → Author(s)/Composer(s)/Arranger(s)`. `Artist(s)`, `Publisher(s)`, les sociétés, IPI, capacités, parts et ayants droit structurés restent intacts.

Après application des lots et réindexation Cloud Search, lancer le contrat strict :

```bash
pnpm test:harvest:composers:clean
```

Ce mode échoue si un suffixe `(NS)`/`(SACEM)`, `208`, `Flore Morchin`, un crédit Minimatic manquant sur PGO0050, une relation collective hors périmètre ou un écart Cloud Search subsiste.
