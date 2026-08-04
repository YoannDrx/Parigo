# Nettoyage des compositeurs Harvest — 3 août 2026

Ce dossier contient le point de restauration et les décisions préparées avant toute mutation dans le back-office Harvest.

## Fichiers

- `2026-08-03-before.json` : export de rollback des 55 albums et 1 819 pistes/versions Parigo, limité aux identifiants, titres, versions, champs Composer/Artist/Publisher et ayants droit structurés.
- `2026-08-03-before.sha256` : empreinte SHA-256 de l’export précédent.
- `composer-values.csv` : une ligne par valeur Composer exacte, y compris la valeur vide.
- `track-decisions.csv` : décision proposée piste par piste et version par version.
- `pilot.csv` : lot pilote à valider avant la première sauvegarde Harvest.
- `pilot-execution-2026-08-04.json` : journal du lot pilote, avec le point de reprise et les validations Harvest rencontrées.
- `manifest.json` : métriques, empreinte, composition du pilote et état des exports.

Les valeurs `needs-review` ne doivent jamais être appliquées automatiquement. Elles restent inchangées tant qu’un ayant droit structuré, le Portfolio ou Parigo ne permet pas de les confirmer.

L’export du registre global des Right Holders reste volontairement séparé. Il devra être effectué dans Harvest avant toute fusion ou suppression de fiche, avec sa portée complète hors label Parigo. Le nettoyage du texte Composer des pistes ne modifie pas les sociétés, IPI, capacités ou parts.

## Reproduction

Avec l’application locale démarrée et connectée à Harvest :

```bash
pnpm export:harvest:composer-cleanup
```

La commande échoue si le filtre label retourne un album hors Parigo ou si l’index des 55 albums est incomplet.

Après application des lots et réindexation Cloud Search, lancer le contrat strict :

```bash
pnpm test:harvest:composers:clean
```

Ce mode échoue si un suffixe `(NS)`/`(SACEM)`, `208`, `Flore Morchin`, un crédit Minimatic manquant sur PGO0050, une relation collective hors périmètre ou un écart Cloud Search subsiste.
