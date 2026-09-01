# Analyse des fils Harvest et AIMS

Date de lecture initiale : **27 août 2026** — mise à jour après la réponse de
Peter et les retests du **1er septembre 2026**.

Fils Gmail relus :

- `Parigo/Harvest API` : 24 messages, du 18 mai au 18 août 2026 ;
- `AIMS Agreement Draft` : 10 messages, du 20 mai au 20 août 2026.

Aucun message n’a été envoyé à Harvest ou AIMS pendant cette analyse. Des
e-mails de recette identifiables ont été déclenchés vers les comptes Parigo de
test pour le contact, le partage et le reset. Les clés, tokens et liens
confidentiels présents dans les échanges ne sont pas reproduits ici.

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

Ces réponses ont permis d’avancer. Peter a complété le 1er septembre les sujets
domaines/HTTPS, région et langue, tags, opérateurs de recherche, RankExpression
et historique. Le contact, l’écriture explicite de la langue, les contrats de
localisation et l’historique des partages restent à corriger ou investiguer.

## Questions du 11 août après la réponse de Peter du 1er septembre

| Sujet | Réponse de Peter | État démontré le 1er septembre | Suite |
| --- | --- | --- | --- |
| Domaines et callbacks | Une clé correspond à un domaine ; FLEX et Parigo pointent sur `www.parigomusic.com`; routes passées en HTTPS. | Le partage réel renvoie désormais `https://www.parigomusic.com/engage-playlist/{token}`. Le reset est fonctionnel de bout en bout et le nouvel appel d’envoi répond 200. | Sujet résolu ; aucun nouveau domaine ni nouvelle clé demandés. |
| Contact | Un management user doit recevoir les messages ; Peter demande la boîte cible. | `Parigo Music Notifications` existe déjà sur `info@parigomusic.com`. Le Sender du modèle, seul réglage directement corrigeable, a été associé à cet utilisateur. Le retest reste en `Code=4`. Aucun réglage de destinataire Contact n’est visible et la documentation « primary email » ne décrit pas le même mécanisme que Peter. | Peter doit associer le destinataire côté serveur ou documenter le contrôle exact, vérifier clé/end-point et confirmer destinataire/From/Reply-To. Blocage de lancement. |
| Album bilingue | Peter demande la liste complète des contrats concernés avant de répondre. | `PGO0031` reste anglais pour `en`, `fr`, `fr-FR`, sans `LanguageItems`. | Transmettre les cinq contrats localisés ; fallback anglais en attendant. |
| Langue membre et e-mails | Région via `Country`; ancien `LanguageCode` non documenté ne fonctionne pas comme attendu ; investigation ouverte. | `getregions` renvoie seulement Global (245 pays dont FR) et `getregion` confirme `LanguageCode=EN`. Une région France/FR est techniquement créable, mais piloterait aussi catalogue, approbation, téléchargements et licence, tout en imposant la langue par pays plutôt que par locale Parigo. `updatemember` avec `LanguageCode: FR` répond 200 mais la valeur reste absente de `getmember`. | Obtenir le contrat explicite Register/Update. S’il n’existe plus, faire confirmer l’alternative région et la migration des membres existants avant toute modification Admin. |
| Compteurs de tags | Aucun compteur de pistes par tag ; `TotalTagsCount` compte les tags. | Trois tags à 1, 5 et 1 pistes ; aucun compteur dans la liste. | Limitation acceptée, demande fermée ; détails lus par tag. |
| Recherche positionnelle | `ExactPhrase` règle l’ordre des mots ; `Wildcard` ajoute uniquement un suffixe. RankExpression personnalisable avec possible coût. | Track « Piano » : 1 480/1 491/1 480/1 480. Album « Music » : 80/82/80/80. Les positions restent mélangées ; les titres complets donnent bien un résultat strict. | Demander un devis séparant les opérateurs sur `TrackDisplayTitle`/`AlbumDisplayTitle` du pilote de classement Track/Album. |
| Historique membre | Tout e-mail reçu devrait apparaître ; Peter demande l’endpoint source précis. | Nouveau partage réel réussi par `sendsharemusiclinkemail`, puis relecture immédiate : dix entrées, toutes des resets. Le nouveau partage et celui reçu le 10 août manquent. | Fournir endpoint/payload et demander la reproduction du couple send/read. |
| Identité d’envoi | Jarrod Collett a piloté la migration Amazon SES et créé l’utilisateur Admin dédié. | SPF, DKIM et DMARC alignés, sans « via ». | Résolu, ne pas relancer. |
| Right Holder | Point omis dans la réponse de Peter. | Aucune mutation globale ; nettoyage d’affichage temporaire seulement. | Reporter après lancement et exiger un pilote réversible sur un album. |

## Nouveaux constats à ajouter à Harvest

Ces sujets n’étaient pas formulés ainsi dans le message du 11 août :

- **Labels** : `getlibraries` expose les traductions dans `LanguageItems`, tandis
  que `getlibrary?languagecode=en/fr` place directement la langue demandée dans
  `Detail` et omet `LanguageItems`. Parigo appelle le détail deux fois ; Harvest
  doit confirmer que ce contrat est stable.
- **Playlists éditoriales** : le dernier retest trouve zéro `LanguageItems`
  dans les 64 objets de liste EN et FR. Les traductions sont disponibles sur le
  détail : 60 noms FR, 4 noms manquants et seulement 2 descriptions FR. Deux
  groupes sont des doublons exacts, sans conflit. La demande pertinente est de
  confirmer le détail comme source officielle ; les absences sont classées
  comme contenu à compléter, pas comme bug API.
- **Recherche multilingue** : la réponse précédente indiquait l’absence de
  recherche multilingue native et l’usage possible des keyword groups. Après
  présentation de cette réponse à l’équipe Parigo, Guillaume maintient qu’une
  configuration bilingue avait déjà fonctionné sur le compte, notamment pour
  faire correspondre `triste` et `sad`. Il se souvient également que Lucas,
  alors chez Parigo, avait transmis une template de traduction à Harvest lors
  du paramétrage initial. La nouvelle demande doit reconnaître la réponse reçue,
  laisser ouverte la possibilité d’une ancienne terminologie ou configuration,
  puis demander le format d’import attendu et le besoin éventuel de
  réindexation. La template n’a pas été retrouvée dans la boîte accessible ;
  elle doit être recherchée auprès de Guillaume, Caroline ou Lucas sans être
  reconstituée de mémoire.

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
