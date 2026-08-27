# Harvest — écarts et demandes encore actifs

Dernière vérification : **27 août 2026**. La matrice complète, y compris les
points résolus et les preuves, se trouve dans
[`launch-readiness-audit-2026-08-26.md`](./launch-readiness-audit-2026-08-26.md).

## À confirmer avant la mise en production

| ID | Constat live | Compensation Parigo | Demande Harvest | Impact lancement |
| --- | --- | --- | --- | --- |
| CFG-01 | Les routes sont configurées par clé. Harvest n’a pas répondu à la question du 11 août sur une base URL autorisée par requête ou plusieurs domaines, ni confirmé le HTTPS direct pour toutes les URLs. | Les routes locales sont implémentées. Preview puis production peuvent être configurées successivement. | Confirmer la procédure Preview → production et générer directement les URLs HTTPS. | Bloquant seulement si vérification/reset/partage ne reviennent pas sur le bon domaine de production. |
| MAIL-01 | `sendcontactusemail` avec le payload officiel renvoie HTTP 200 puis `Code=4`. Le BFF renvoie 502 et aucun e-mail n’arrive. Dans l’Admin, le modèle Contact Us (API/Custom) n’a pas d’expéditeur sélectionné. | Le formulaire propose `info@parigomusic.com` comme secours d’urgence, mais ce n’est pas le parcours de production accepté. | Corriger le template, l’expéditeur, le destinataire ou les droits de la clé, puis fournir un test réussi avec le même payload. | **Blocage de lancement** tant que le formulaire ne transmet pas le message. |
| I18N-01 | `PGO0031` contient EN et FR dans l’Admin, mais `getalbum` renvoie l’anglais pour `en`, `fr` et `fr-FR`, sans `LanguageItems`. | Fallback anglais ; le mapper acceptera automatiquement un futur contrat localisé. | Exposer la description d’album localisée ou documenter l’endpoint officiel. | Non bloquant avec fallback anglais, mais écart éditorial visible. |
| I18N-02 | `getlibraries` expose des `LanguageItems`, alors que `getlibrary` renvoie la langue demandée directement dans `Detail` et omet désormais `LanguageItems`. | Parigo lit la liste et appelle le détail en `en` et `fr`. | Confirmer le contrat officiel, les codes acceptés et la stabilité de ce comportement. | Compensé côté Parigo. |
| I18N-03 | La liste et le détail exposent des `LanguageItems` sur 60 des 64 playlists. Il y a 60 noms FR, seulement 2 descriptions FR, 2 cas de doublons exacts et 4 noms FR manquants. Les paramètres `languagecode=en/fr` ne remplacent pas les champs canoniques de la liste. | Parigo lit `LanguageItems`, déduplique et applique FR → EN → canonique. | Confirmer que `LanguageItems` est la source officielle. Traiter les 62 descriptions et 4 noms absents comme du contenu à compléter, sauf si Harvest confirme qu’ils devraient être exposés autrement. | Compensé ; contenu manquant non bloquant. |
| I18N-04 | L’Admin expose bien un champ membre `Language` avec `EN`/`FR` et `EN` par défaut. Il contient 26 types d’e-mails, 34 variantes et seulement six variantes FR. `LanguageCode` n’est toutefois pas documenté en écriture dans `registermember`/`updatemember`, et la sélection de modèle reste inconnue. | Le site ne tente pas d’écrire un champ non documenté ; `All` reste le fallback. | Documenter le champ/endpoint membre, les valeurs, la règle de sélection pour chaque parcours et confirmer les variantes FR à créer. | Bloquant uniquement si un parcours de compte produit un lien invalide ; la langue seule ne bloque pas. |

## AIMS — intégration résolue et surveillance Harvest

- Harvest et AIMS ont confirmé l’usage exclusif de la Public API Harvest.
- Parigo a choisi une livraison **mains only** ; la clé AIMS a été transmise à
  Harvest et la livraison a été vérifiée par les contrôles d’indexation.
- Les recherches live par piste et prompt renvoient chacune 30 résultats ;
  les 10 masters Parigo contrôlés sont indexés et un second échantillon de 30
  pistes récentes est couvert à 30/30.
- Les routes publiques sont `/api/similarity/*`. Track, prompt, upload WAV
  synthétique et URL YouTube Music ont chacun renvoyé 30 pistes ; les quatre
  capacités sont annoncées et activées par le BFF.
- L’intégration API AIMS est terminée. Il ne reste aucun développement dépendant
  directement d’AIMS et aucune demande AIMS ne doit être ajoutée à la relance
  technique.
- L’indexation continue, les limites de requêtes et la disponibilité du service
  restent des sujets de surveillance opérationnelle côté Harvest. Les questions
  commerciales et contractuelles restent gérées directement par Parigo avec
  AIMS.

Un 503 URL transitoire a été observé sous la charge de la suite E2E, puis le
même lien et trois autres essais URL ont réussi. Une indisponibilité AIMS ne
bloque pas le catalogue principal ; les flags permettent de fermer un mode si
les erreurs deviennent persistantes.

## Non bloquants mais encore ouverts

| ID | Constat | Contournement actuel | Demande Harvest |
| --- | --- | --- | --- |
| TAG-01 | `ReturnTagCount=1` n’ajoute actuellement aucun champ de compteur, alors que les détails contiennent 1, 4 et 1 pistes. Une fixture temporaire liée à une piste a confirmé le même comportement avant d’être supprimée. | Une lecture `getmembertagtracks` par tag. | Corriger l’agrégat ou documenter un endpoint batch. |
| SEARCH-01 | `ExactPhrase` et `Wildcard` ne produisent pas de modes contient/commence par/égal distincts. | Parigo vérifie les titres candidats et pagine par lots. | Fournir les payloads exacts ou confirmer l’absence de ces opérateurs. |
| SEARCH-02 | `RankExpression` ne permet pas de pondérer officiellement les champs pour placer les titres en premier. | Deux voies disjointes titre puis éditorial. | Documenter les poids de champs ou confirmer leur indisponibilité. |
| SEARCH-03 | Harvest a répondu ne pas proposer de recherche multilingue native et recommande les keyword groups. Guillaume indique cependant qu’un comportement bilingue avait déjà été configuré pour Parigo, par exemple `reggae triste` interprété comme `reggae sad`, et se souvient que Lucas, alors chez Parigo, avait transmis une template de traduction à Harvest lors du paramétrage initial. | Le front reconnaît les traductions officielles de taxonomie, dont `Triste → Sad`, mais cette compensation ne couvre pas nativement la recherche, l’autocomplétion et les facettes. | Vérifier l’historique et les archives du compte, identifier si cette template correspondait à un mapping ou à des keyword groups, puis confirmer si le comportement peut être restauré dans la configuration actuelle. |
| COMM-01 | L’historique du membre contient les resets mais pas les partages reçus ; aucun corps/template/source n’est exposé. | L’UI restitue exactement les six champs disponibles. | Documenter les événements journalisés et l’éventuel historique administrateur. |
| RH-01 | Les questions du 11 août sur les templates d’écrasement Right Holder, les capacités couvertes, les séparateurs et le batch mains/alternates/stems n’ont pas reçu de réponse. | Le front normalise temporairement l’affichage, mais les crédits structurés Harvest restent la source de vérité ; aucune mutation globale n’est lancée. | Après le lancement, nettoyer les données dans Harvest Admin, confirmer le template et faire un essai sur un album avant le batch à 100 €. |

## Résolus et exclus de la relance

- **Authentification e-mail** : `info@parigomusic.com`, SPF, DKIM et DMARC
  sont alignés ; Gmail n’affiche plus « via harvestmedia.net ».
- **Taxonomies** : 532/532 catégories et 161/161 styles ont une valeur FR ;
  `Sad → Triste` est exposé dans `LanguageItems`, tandis que l’endpoint styles
  localise directement `Abstract → Abstrait` dans `Name`.
- **AIMS** : architecture, quatre modes de recherche et couverture des
  échantillons contrôlés validés ; aucune intégration directe n’est nécessaire.
- **Playlist folders, recherches sauvegardées et HTML/CSS des e-mails** :
  adaptations ou décisions produit déjà documentées.

## Règle de maintenance

Un sujet ne quitte ce registre qu’après réponse explicite ou retest concluant.
La matrice de lancement conserve l’historique des sujets résolus.
