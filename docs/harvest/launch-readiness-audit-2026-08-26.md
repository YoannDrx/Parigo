# Harvest/AIMS — matrice d’audit et préparation du lancement

Date : **26 août 2026** — fuseau `Europe/Paris`.

Statuts autorisés : `résolu`, `compensable par Parigo`, `blocage Harvest`,
`contenu à compléter`, `non applicable`.

| ID | Question ou exigence | Dernière réponse explicite | Test et preuve au 26 août | Statut | Propriétaire | Impact lancement |
| --- | --- | --- | --- | --- | --- | --- |
| CFG-01 | Base URL par requête, plusieurs domaines et HTTPS direct | 10 août : Peter confirme une configuration domaine/routes par clé. Aucune réponse aux précisions du 11 août. | Le partage live retourne encore `http://www.parigomusic.com/engage-playlist/[token]` en amont. Parigo valide l’hôte et réécrit uniquement ce protocole en HTTPS avant affichage et envoi ; copie, livraison et collaboration passent. Reset accepté, contenu du message non inspectable depuis la boîte connectée. | compensable par Parigo | Parigo + Harvest | Non bloquant pour le partage grâce à la normalisation ; callback reset à confirmer visuellement. |
| MAIL-01 | `sendcontactusemail` | 10 août : payload cinq champs, sans pièces jointes. Pas de réponse au `Code=4` signalé le 11 août. | Appel direct et formulaire : HTTP 200 + `Code=4`, BFF 502, aucun e-mail. Fallback visible vers `info@parigomusic.com`. | blocage Harvest | Harvest | Non bloquant grâce au fallback. |
| I18N-ALBUM | Description FR des albums | Aucune réponse à la question du 11 août. | Admin `PGO0031` : EN+FR. `getalbum/750a3d73a7f4dae6` en `en`, `fr`, `fr-FR` : même anglais, aucun `LanguageItems`. | blocage Harvest | Harvest | Fallback anglais accepté. |
| I18N-LABEL | Description FR/EN des labels | Le contrat initial mentionnait `LanguageItems`; aucune réponse sur l’incohérence actuelle. | `Musica.it` (`9d330c152c37bca0`) : `getlibraries` contient FR dans `LanguageItems`; `getlibrary?languagecode=en/fr` commute `Detail` et omet `LanguageItems`. | compensable par Parigo | Parigo + Harvest | Double lecture EN/FR implémentée. |
| CONTENT-LABEL | Description FR du label Parigo | Non demandé à Harvest. | Admin Parigo : EN présent, FR vide. | contenu à compléter | Parigo | Fallback anglais ; non bloquant. |
| I18N-PLAYLIST | Traductions des playlists | Nouveau constat, aucune réponse vendor. | 64 détails contrôlés : 64 descriptions FR, 60 noms FR, 53 doublons identiques, aucun conflit observé. Les listes EN/FR omettent les traductions. | compensable par Parigo | Parigo + Harvest | Mapping détail/déduplication implémentés. |
| I18N-CATEGORIES | Couverture catégories FR | Ancienne demande de complétion devenue obsolète. | Audit live : 532/532 ; `Sad → Triste`. | résolu | Harvest | Aucun. |
| I18N-STYLES | Couverture styles FR | Ancienne demande de complétion devenue obsolète. | Audit live : 161/161 ; `Abstract → Abstrait`. | résolu | Harvest | Aucun. |
| I18N-TRACKS | Traductions de pistes | Aucun contrat localisé identifié. | 81 pistes de `PGO0031` : `LanguageItems=[]`. Track Manager temporairement en traitement lors de l’inspection. | non applicable | Harvest | Les titres/crédits canoniques suffisent au lancement. |
| I18N-RH | Biographies de compositeurs/ayants droit | Roland a documenté l’édition des Right Holders, pas de biographie localisée. | Admin : un champ Description caché mais aucun onglet EN/FR. API : crédits, société, IPI, parts ; pas de description ni `LanguageItems`. | non applicable | Parigo | Les crédits structurés suffisent. |
| I18N-MAIL | Langue membre et sélection des templates | Aucune réponse aux questions du 11 août. | 26 types/34 variantes ; six FR : Reset Password, Thank you for registering, Member Approved, Member Denied, Share Playlist Email, Share to Member. | blocage Harvest | Harvest | La langue seule ne bloque pas ; les liens doivent être valides. |
| MAIL-AUTH | Alignement expéditeur | Résolu opérationnellement après le mail du 11 août. | `info@parigomusic.com`, SPF/DKIM/DMARC alignés, aucune mention Gmail « via ». | résolu | Harvest + Parigo | Aucun. |
| TAG-01 | `ReturnTagCount` réel | Aucune réponse au mail du 11 août. | Avec et sans option : HTTP 200, mêmes 3 tags, aucun champ de compteur. Fixture temporaire : association persistée à 1 piste, compteur rapporté 0, puis nettoyage réussi. | compensable par Parigo | Harvest | Requêtes supplémentaires, non bloquant. |
| SEARCH-01 | Correspondances titre exactes | La réponse de Roland portait sur le multilingue, pas les opérateurs. Aucune réponse au mail du 11 août. | Les quatre combinaisons `ExactPhrase`/`Wildcard` ne séparent pas les trois modes. | compensable par Parigo | Harvest | Post-filtrage et pagination actifs. |
| COMM-01 | Périmètre de `gethistorybycommunications` | Peter a précisé l’absence d’archive des formulaires de contact ; aucune réponse sur l’historique membre. | Sept resets présents ; seulement Type/From/To/Subject/Date/Status, sans corps. | compensable par Parigo | Harvest | UI fidèle au contrat disponible. |
| RH-01 | Templates Right Holder et batch à 100 € | 3 août : Roland explique l’édition et propose le batch. Aucune réponse aux validations détaillées du 11 août. | Templates d’écrasement désactivés et vides ; aucune mutation effectuée. | blocage Harvest | Harvest + Parigo | Non bloquant pour le site ; bloque uniquement le nettoyage global. |
| AIMS-ARCH | Mode d’intégration AIMS | 14 août : Matt confirme toutes les fonctions via Harvest, sans intégration séparée. 16 août : Peter décrit la configuration ID-à-ID. | Code Parigo n’utilise que la Public API Harvest. | résolu | Harvest + AIMS | Aucun. |
| AIMS-INDEX | Livraison et indexation | 19 août : mains only confirmé ; clé remise à Harvest. 20 août : Peter confirme le début de livraison. | Track et prompt : 30 résultats chacun ; upload WAV synthétique : 30 ; 10/10 masters récents indexés, latence moyenne 2,46 s. | résolu | Harvest + AIMS | Couverture échantillon validée. |
| AIMS-PUBLIC | Ouverture publique des quatre modes | Pas de confirmation finale coûts/DPA/quotas ; prompt annoncé `Allow=false` malgré un contrat exécutable. | Routes neutres `/api/similarity/*`; track, prompt, upload et URL renvoient 30 pistes. Le fixture réel `music.youtube.com/watch?v=ZbZSe6N_BXs` passe. Un 503 URL transitoire a été observé sous charge, suivi de quatre succès URL isolés. Les quatre capacités sont exposées. | résolu | Harvest + Parigo | Non bloquant techniquement ; surveiller les 503 et conserver les flags d’arrêt serveur. |

## Décision de lancement

Sont bloquants : compte ou token inutilisable en production, callback erroné,
régression recherche/lecteur/téléchargement, ou exposition de données
incorrectes. Les traductions absentes avec fallback anglais, le formulaire de
contact avec fallback public et une indisponibilité AIMS ponctuelle ne bloquent
pas le catalogue principal.

## Validation technique locale

- `pnpm lint` : réussi ;
- `pnpm typecheck` : réussi ;
- `pnpm test` : 70 fichiers et 334 tests réussis ;
- `pnpm build` : compilation Next.js 16.3.1 réussie ;
- Playwright complet desktop/mobile : 332 scénarios réussis et 32 ignorés
  conditionnellement ; les deux échecs restants correspondaient au même test
  obsolète qui attendait encore la désactivation de la similarité. Après mise à
  jour, ce scénario passe sur desktop et mobile ;
- contrats Harvest live et taxonomie live : réussis ;
- similarité live : track, prompt, upload WAV synthétique et URL YouTube Music
  réussis avec 30 résultats chacun.

Au moment de cette validation, GitHub Status signale un incident critique
Actions (`major_outage`) lié au basculement d’un primaire de base de données,
ainsi qu’une dégradation Pages. Les résultats CI observés pendant cette fenêtre
ne doivent pas être utilisés comme signal de régression ; relancer les jobs après
résolution de l’incident.

## Sources contrôlées

- fil Gmail `Parigo/Harvest API`, notamment les messages des 10, 11, 14 et
  16 août ;
- fil Gmail `AIMS Agreement Draft`, notamment les confirmations des 14, 19
  et 20 août ;
- Harvest Admin et Public API live ;
- GitHub Status et son API publique ;
- BFF, tests unitaires, smoke tests et pages Next.js Parigo.

Aucune valeur de clé, aucun token et aucune donnée de connexion n’est conservé
dans cette matrice.
