# Harvest — écarts et demandes encore actifs

Dernière vérification : **26 août 2026**. La matrice complète, y compris les
points résolus et les preuves, se trouve dans
[`launch-readiness-audit-2026-08-26.md`](./launch-readiness-audit-2026-08-26.md).

## À confirmer avant la mise en production

| ID | Constat live | Compensation Parigo | Demande Harvest | Impact lancement |
| --- | --- | --- | --- | --- |
| CFG-01 | Les routes sont configurées par clé. Harvest n’a pas répondu à la question du 11 août sur une base URL autorisée par requête ou plusieurs domaines, ni confirmé le HTTPS direct pour toutes les URLs. | Les routes locales sont implémentées. Preview puis production peuvent être configurées successivement. | Confirmer la procédure Preview → production et générer directement les URLs HTTPS. | Bloquant seulement si vérification/reset/partage ne reviennent pas sur le bon domaine de production. |
| MAIL-01 | `sendcontactusemail` avec le payload officiel renvoie HTTP 200 puis `Code=4`. Aucun e-mail n’arrive. | Le formulaire conserve le message et propose `info@parigomusic.com`. | Corriger le template Contact Us (API/Custom), l’expéditeur, le destinataire ou les droits de la clé, puis fournir un test réussi. | Non bloquant avec le fallback de contact. |
| I18N-01 | `PGO0031` contient EN et FR dans l’Admin, mais `getalbum` renvoie l’anglais pour `en`, `fr` et `fr-FR`, sans `LanguageItems`. | Fallback anglais ; le mapper acceptera automatiquement un futur contrat localisé. | Exposer la description d’album localisée ou documenter l’endpoint officiel. | Non bloquant avec fallback anglais, mais écart éditorial visible. |
| I18N-02 | `getlibraries` expose des `LanguageItems`, alors que `getlibrary` renvoie la langue demandée directement dans `Detail` et omet désormais `LanguageItems`. | Parigo lit la liste et appelle le détail en `en` et `fr`. | Confirmer le contrat officiel, les codes acceptés et la stabilité de ce comportement. | Compensé côté Parigo. |
| I18N-03 | La liste des 64 playlists omet les traductions. Le détail les expose ; 53 playlists ont une description FR dupliquée à l’identique et quatre playlists Brand n’ont pas de nom FR. | Parigo lit le détail, déduplique et applique FR → EN → canonique. | Confirmer que le détail est la source officielle et nettoyer les doublons/noms manquants. | Compensé ; les quatre noms utilisent l’anglais. |
| I18N-04 | Seulement six des 26 types de modèles ont une variante française. `LanguageCode` n’est pas documenté en écriture et la sélection de modèle reste inconnue. | Le site ne tente pas d’écrire un champ non documenté ; `All` reste le fallback. | Documenter le champ/endpoint membre, les valeurs, la règle de sélection et confirmer les variantes FR à créer. | Bloquant uniquement si un parcours de compte produit un lien invalide ; la langue seule ne bloque pas. |

## AIMS — conditions d’ouverture publique

- Harvest et AIMS ont confirmé l’usage exclusif de la Public API Harvest.
- Parigo a choisi une livraison **mains only** ; la clé AIMS a été transmise à
  Harvest et Peter a confirmé le début de livraison le 20 août.
- Les recherches live par piste et prompt renvoient chacune 30 résultats ;
  les 10 derniers masters contrôlés sont indexés.
- Les routes publiques sont `/api/similarity/*`. Track, prompt, upload WAV
  synthétique et URL YouTube Music ont chacun renvoyé 30 pistes. Les quatre
  modes restent contrôlables par flags serveur.
- Harvest doit encore confirmer par écrit le statut commercial du prompt
  (`Allow=false` malgré un fonctionnement réel), les coûts/quota/concurrence,
  la couverture et le délai d’indexation, ainsi que la rétention, les régions,
  les sous-traitants et le DPA pour les prompts, fichiers et liens.

Un 503 URL transitoire a été observé sous la charge de la suite E2E, puis le
même lien et trois autres essais URL ont réussi. Une indisponibilité AIMS ne
bloque pas le catalogue principal ; les flags permettent de fermer un mode si
les erreurs deviennent persistantes.

## Non bloquants mais encore ouverts

| ID | Constat | Contournement actuel | Demande Harvest |
| --- | --- | --- | --- |
| TAG-01 | `ReturnTagCount=1/true/True` renvoie `TrackCount=0` alors que les détails contiennent 1, 4 et 1 pistes. | Une lecture `getmembertagtracks` par tag. | Corriger l’agrégat ou documenter un endpoint batch. |
| SEARCH-01 | `ExactPhrase` et `Wildcard` ne produisent pas de modes contient/commence par/égal distincts. | Parigo vérifie les titres candidats et pagine par lots. | Fournir les payloads exacts ou confirmer l’absence de ces opérateurs. |
| SEARCH-02 | `RankExpression` ne permet pas de pondérer officiellement les champs pour placer les titres en premier. | Deux voies disjointes titre puis éditorial. | Documenter les poids de champs ou confirmer leur indisponibilité. |
| COMM-01 | L’historique du membre contient les resets mais pas les partages reçus ; aucun corps/template/source n’est exposé. | L’UI restitue exactement les six champs disponibles. | Documenter les événements journalisés et l’éventuel historique administrateur. |
| RH-01 | Les questions du 11 août sur les templates d’écrasement Right Holder, les capacités couvertes, les séparateurs et le batch mains/alternates/stems n’ont pas reçu de réponse. | Les crédits structurés restent la source de vérité ; aucune mutation globale n’est lancée. | Confirmer le template et faire un essai sur un album avant le batch à 100 €. |

## Résolus et exclus de la relance

- **Authentification e-mail** : `info@parigomusic.com`, SPF, DKIM et DMARC
  sont alignés ; Gmail n’affiche plus « via harvestmedia.net ».
- **Taxonomies** : 532/532 catégories et 161/161 styles ont une valeur FR ;
  `Sad → Triste` et `Abstract → Abstrait` sont validés.
- **AIMS architecture** : aucune intégration AIMS directe n’est nécessaire.
- **Playlist folders, recherches sauvegardées et HTML/CSS des e-mails** :
  adaptations ou décisions produit déjà documentées.

## Règle de maintenance

Un sujet ne quitte ce registre qu’après réponse explicite ou retest concluant.
La matrice de lancement conserve l’historique des sujets résolus.
