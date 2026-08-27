# Analyse des fils Harvest et AIMS

Date de lecture : **27 août 2026**.

Fils Gmail relus :

- `Parigo/Harvest API` : 24 messages, du 18 mai au 18 août 2026 ;
- `AIMS Agreement Draft` : 10 messages, du 20 mai au 20 août 2026.

Aucun message n’a été envoyé ou modifié pendant cette analyse. Les clés, tokens
et liens confidentiels présents dans les échanges ne sont pas reproduits ici.

## Conclusion

La relance principale doit être adressée à **Harvest**. AIMS a répondu à la
question d’architecture et a fourni à Harvest les éléments nécessaires à la
configuration. Les quatre modes de similarité fonctionnent désormais à travers
la Public API Harvest.

La réponse au fil **AIMS** peut donc être positive et très courte : remercier
l’équipe et confirmer que l’intégration est terminée et que les quatre modes
fonctionnent. Il ne reste aucun développement dépendant directement d’AIMS.
Les éventuels sujets futurs de disponibilité, de limites ou d’indexation
continue relèvent d’abord de Harvest. Les sujets commerciaux sont traités
directement par l’équipe Parigo avec AIMS et ne relèvent pas de Yoann.

## Ce que Harvest a effectivement répondu

### Réponses du 4 août

Peter a répondu en ligne à une première série de questions :

- les suggestions de playlists utilisent le fournisseur IA configuré et des
  pistes semences ;
- les commentaires privés nécessitaient certaines propriétés en minuscules ;
- `SubscribeNewsletter` est un indicateur exportable, pas un outil d’envoi de
  newsletter ;
- la documentation du reset mélangeait un ancien contrat avec le contrat
  actuel ;
- la nouvelle structure `Users[]` remplace l’ancien pré-appel de partage ;
- les favoris album et playlist ne sont pas des objets de premier rang ;
- les playlists archivées ne peuvent pas être relistées ;
- le téléchargement standard navigateur est le parcours recommandé.

Ces sujets sont résolus, compensés ou volontairement exclus du site. Ils ne
doivent pas alourdir la prochaine relance.

### Réponses du 10 août

Peter a confirmé que :

- les routes manquantes provenaient d’une configuration non rattachée à la
  nouvelle clé API et qu’il les avait ajoutées ;
- le domaine et les routes sont configurés côté Harvest, par clé API, sans
  modifier la configuration FLEX ;
- le partage et la collaboration sont disponibles dans la Public API ;
- `sendcontactusemail` ne prend pas de pièce jointe et attend cinq champs ;
- l’historique des formulaires de contact n’est pas stocké dans l’Admin.

Ces réponses ont permis d’avancer, mais elles ne répondent pas aux précisions
posées le 11 août sur plusieurs domaines, le HTTPS direct, l’erreur `Code=4`,
la langue des e-mails et l’historique membre.

## Questions du 11 août restées sans réponse complète

| Sujet | Question posée | Réponse postérieure trouvée | État actuel | Destinataire |
| --- | --- | --- | --- | --- |
| Domaines et callbacks | Une clé peut-elle accepter localhost, Preview et production, ou une base URL autorisée par requête ? Les liens peuvent-ils être générés directement en HTTPS ? | Aucune. Le message du 10 août confirme seulement un domaine et des routes par clé. | Le partage fonctionne, mais Harvest renvoie encore une URL HTTP que Parigo convertit en HTTPS. Le callback reset doit être contrôlé dans l’e-mail reçu. | Harvest |
| Contact | Pourquoi le payload officiel sans pièce jointe renvoie-t-il HTTP 200 puis `Code=4` ? | Aucune après le signalement du 11 août. | Erreur reproduite directement et dans le formulaire ; BFF 502, aucun e-mail et expéditeur vide sur Contact Us (API/Custom). Blocage de lancement malgré l’adresse de secours. | Harvest |
| Album bilingue | Pourquoi `PGO0031`, traduit en Admin, reste-t-il anglais dans `getalbum` ? | Aucune. | Écart Harvest confirmé ; fallback anglais côté Parigo. | Harvest |
| Langue membre et e-mails | Quel champ définit la langue et comment Harvest choisit-il le modèle pour vérification, reset, partage, contact et téléchargement ? | Aucune. | L’Admin expose `Language=EN/FR` avec `EN` par défaut, mais l’écriture Public API n’est pas documentée. Sur 26 types/34 variantes, six seulement sont françaises. | Harvest |
| Compteurs de tags | Comment obtenir un `TrackCount` fiable avec `ReturnTagCount` ? | Aucune. | L’option n’ajoute aucun champ de compteur ; les détails contiennent 1, 4 et 1 pistes. La mutation temporaire a confirmé l’écart et a été nettoyée. | Harvest |
| Titre exact | Quels payloads donnent « contient », « commence par » et « égal » avec `ExactPhrase`/`Wildcard` ? | Aucune. | Les titres complets sont bien retrouvés, mais les drapeaux ne définissent pas trois opérateurs de champ distincts pour un terme simple. Parigo normalise et post-filtre. | Harvest |
| Historique membre | Quels e-mails alimentent `gethistorybycommunications` et les partages doivent-ils apparaître ? | Aucune. La réponse précédente concernait seulement les formulaires de contact dans l’Admin. | Les resets apparaissent, les partages reçus non ; aucun corps ni identifiant de modèle. | Harvest |
| Identité d’envoi | Authentifier le domaine Parigo et supprimer « via harvestmedia.net ». | Pas de réponse textuelle identifiée. | Résolu opérationnellement : SPF, DKIM et DMARC alignés, sans « via ». | Ne pas relancer |
| Right Holder | Valider les merge fields, capacités, séparateurs, étapes et périmètre mains/alternates/stems avant le batch à 100 €. | Aucune réponse détaillée. Roland avait seulement décrit le workflow général le 3 août. | Ne pas activer les modèles ; demander un essai réversible sur un album. | Harvest |

## Nouveaux constats à ajouter à Harvest

Ces sujets n’étaient pas formulés ainsi dans le message du 11 août :

- **Labels** : `getlibraries` expose les traductions dans `LanguageItems`, tandis
  que `getlibrary?languagecode=en/fr` place directement la langue demandée dans
  `Detail` et omet `LanguageItems`. Parigo appelle le détail deux fois ; Harvest
  doit confirmer que ce contrat est stable.
- **Playlists éditoriales** : la liste comme le détail contiennent les
  `LanguageItems` disponibles. Sur 64 playlists, 60 noms FR sont présents, 4
  manquent et seules 2 descriptions FR existent. Deux playlists seulement ont
  des lignes de description FR dupliquées, sans valeur conflictuelle. La
  demande pertinente est de confirmer `LanguageItems` comme source officielle ;
  les absences sont classées comme contenu à compléter, pas comme bug API.
- **Recherche multilingue** : la réponse précédente indiquait l’absence de
  recherche multilingue native et l’usage possible des keyword groups. Après
  présentation de cette réponse à l’équipe Parigo, Guillaume maintient qu’une
  configuration bilingue avait déjà fonctionné sur le compte, notamment pour
  faire correspondre `triste` et `sad`. Il se souvient également que Lucas,
  alors chez Parigo, avait transmis une template de traduction à Harvest lors
  du paramétrage initial. La nouvelle demande doit reconnaître la réponse reçue,
  laisser ouverte la possibilité d’une ancienne terminologie ou configuration,
  puis demander la vérification des archives et la restauration éventuelle du
  mapping, des groupes ou des règles concernés.

## Chronologie AIMS et statut des réponses

| Date | Échange | Conclusion |
| --- | --- | --- |
| 11 août | Caroline demande si le mois d’essai peut être utilisé sur le nouveau site en développement. | Einar propose un essai au lancement ou dans l’application AIMS, mais ne confirme pas explicitement si le mois d’essai a démarré avec l’activation actuelle. |
| 11 août | Yoann demande si l’intégration doit passer uniquement par Harvest. | Matt vérifie auprès de Harvest. |
| 14 août | Matt confirme que toutes les fonctions AIMS sont accessibles via la Public API Harvest, sans intégration directe. | Résolu. |
| 16 août | Peter explique qu’une configuration Harvest↔AIMS avec correspondance d’identifiants est nécessaire. | Résolu. |
| 18 août | Parigo confirme une livraison **mains only**. | Résolu. |
| 19 août | AIMS remet la clé de configuration à Harvest. | Résolu ; donnée confidentielle non reproduite. |
| 20 août | Peter confirme que la livraison des mains a commencé. | Démarrage confirmé par e-mail. |
| 26-27 août | Audits live Parigo : track, prompt, upload et URL renvoient 30 résultats ; 10/10 masters puis 30/30 pistes récentes sont indexés ; 43/43 tests ciblés passent. | Intégration API terminée et fonctionnelle. |

## Suivi éventuel après intégration AIMS

### Surveillance Harvest

- livraison continue des nouveaux mains ;
- erreurs, timeouts, limites et concurrence de la Public API ;
- disponibilité du service et première analyse d’une piste absente de l’index.

Ces éléments sont des sujets opérationnels à surveiller, pas du travail restant
dans l’intégration AIMS et pas des demandes à ajouter au fil AIMS actuel.

### AIMS directement

- qualité ou pertinence des recommandations une fois l’appel Harvest validé ;
- conseils de réglage métier ou revue qualitative du catalogue.

Les questions commerciales ou relatives à la période d’essai sont suivies
directement par l’équipe Parigo et ne doivent pas être ajoutées au message
technique de Yoann.

### Sujet partagé Harvest + AIMS

- une incohérence durable entre les identifiants Harvest livrés et les éléments
  indexés par AIMS ;
- une question de couverture que Harvest confirme avoir livrée mais qu’AIMS ne
  retrouve pas ;
- une clarification de responsabilités ou de support qui n’est pas couverte par
  les accords existants.

Un échec URL isolé n’est pas à remonter pour le moment : le même lien YouTube
Music et trois autres variantes ont ensuite fonctionné. Il faut l’escalader
seulement si le problème devient reproductible avec l’heure, le lien, le statut
HTTP et l’identifiant de requête.
