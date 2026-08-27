# Harvest/AIMS — matrice d’audit et préparation du lancement

Date initiale : **26 août 2026** — double contrôle live : **27 août 2026** —
fuseau `Europe/Paris`.

Statuts autorisés : `résolu`, `compensable par Parigo`, `blocage Harvest`,
`contenu à compléter`, `non applicable`.

| ID | Question ou exigence | Dernière réponse explicite | Test et preuve au 27 août | Statut | Propriétaire | Impact lancement |
| --- | --- | --- | --- | --- | --- | --- |
| CFG-01 | Base URL par requête, plusieurs domaines et HTTPS direct | 10 août : Peter confirme une configuration domaine/routes par clé. Aucune réponse aux précisions du 11 août. | Le partage live retourne encore `http://www.parigomusic.com/engage-playlist/[token]` en amont. Parigo valide l’hôte et réécrit uniquement ce protocole en HTTPS avant affichage et envoi ; copie, livraison et collaboration passent. Reset accepté, contenu du message non inspectable depuis la boîte connectée. | compensable par Parigo | Parigo + Harvest | Non bloquant pour le partage grâce à la normalisation ; callback reset à confirmer visuellement. |
| MAIL-01 | `sendcontactusemail` | 10 août : payload cinq champs, sans pièces jointes. Pas de réponse au `Code=4` signalé le 11 août. | Appel direct et formulaire : HTTP 200 + `Code=4`, BFF 502, aucun e-mail. Le modèle Contact Us (API/Custom) n’a pas d’expéditeur sélectionné. L’adresse publique reste visible comme secours d’urgence. | blocage Harvest | Harvest | **Blocage de lancement** tant que le formulaire ne transmet pas le message. |
| I18N-ALBUM | Description FR des albums | Aucune réponse à la question du 11 août. | Admin `PGO0031` : EN+FR. `getalbum/750a3d73a7f4dae6` en `en`, `fr`, `fr-FR` : même anglais, aucun `LanguageItems`. | blocage Harvest | Harvest | Fallback anglais accepté. |
| I18N-LABEL | Description FR/EN des labels | Le contrat initial mentionnait `LanguageItems`; aucune réponse sur la différence de forme entre liste et détail. | `Musica.it` (`9d330c152c37bca0`) : `getlibraries` contient FR dans `LanguageItems`; `getlibrary?languagecode=en/fr` commute `Detail` et omet `LanguageItems`. Les pages FR/EN affichent les bonnes valeurs. | compensable par Parigo | Parigo + Harvest | Double lecture EN/FR implémentée ; demander seulement confirmation de stabilité. |
| CONTENT-LABEL | Description FR du label Parigo | Non demandé à Harvest. | Admin Parigo : EN présent, FR vide. | contenu à compléter | Parigo | Fallback anglais ; non bloquant. |
| I18N-PLAYLIST | Traductions des playlists | Nouveau constat, aucune réponse vendor. | 64 playlists contrôlées : la liste et le détail exposent des `LanguageItems` sur 60 playlists. Il existe 60 noms FR, seulement 2 descriptions FR, 2 playlists avec des lignes de description FR dupliquées et aucun conflit. Quatre playlists Brand n’ont aucun nom FR. `languagecode=en/fr` ne modifie pas les champs canoniques de la liste. | contenu à compléter | Parigo + Harvest | Mapping `LanguageItems` et fallback anglais implémentés. Les descriptions absentes ne sont pas qualifiées de bug API sans preuve Admin. |
| I18N-CATEGORIES | Couverture catégories FR | Ancienne demande de complétion devenue obsolète. | Audit live : 532/532 ; `Sad → Triste`. | résolu | Harvest | Aucun. |
| I18N-STYLES | Couverture styles FR | Ancienne demande de complétion devenue obsolète. | Audit live : 161/161 ; `Abstract → Abstrait`. | résolu | Harvest | Aucun. |
| I18N-TRACKS | Traductions de pistes | Aucun contrat localisé identifié. | `PGO0031` : 81 pistes `mainonly` et 216 pistes uniques `includeinactive`, en `en` comme en `fr`; aucune ne contient de `LanguageItems` et aucun titre ne change selon la locale. | non applicable | Harvest | Les titres/crédits canoniques suffisent au lancement. |
| I18N-RH | Biographies de compositeurs/ayants droit | Roland a documenté l’édition des Right Holders, pas de biographie localisée. | Admin : un champ Description caché mais aucun onglet EN/FR. API : crédits, société, IPI, parts ; pas de description ni `LanguageItems`. | non applicable | Parigo | Les crédits structurés suffisent. |
| I18N-MAIL | Langue membre et sélection des templates | Aucune réponse aux questions du 11 août. | Admin : langues EN et FR actives ; formulaire membre avec `Language=EN/FR`, `EN` par défaut ; 26 types/34 variantes, dont six FR : Reset Password, Thank you for registering, Member Approved, Member Denied, Share Playlist Email, Share to Member. La Public API ne documente toujours pas l’écriture dans `registermember`/`updatemember`. | blocage Harvest | Harvest | La langue seule ne bloque pas ; les liens doivent être valides. |
| MAIL-AUTH | Alignement expéditeur | Résolu opérationnellement après le mail du 11 août. | `info@parigomusic.com`, SPF/DKIM/DMARC alignés, aucune mention Gmail « via ». | résolu | Harvest + Parigo | Aucun. |
| TAG-01 | `ReturnTagCount` réel | Aucune réponse au mail du 11 août. | Avec et sans option : HTTP 200, mêmes 3 tags et aucun champ de compteur. Le détail contient 1, 4 et 1 pistes. Fixture temporaire : association à 1 piste visible dans les deux sens, toujours aucun compteur, puis suppression réussie. | compensable par Parigo | Harvest | Requêtes supplémentaires, non bloquant. |
| SEARCH-01 | Correspondances titre exactes | La réponse de Roland portait sur le multilingue, pas les opérateurs. Aucune réponse au mail du 11 août. | Les titres complets `Piano Minuet`, `Café Paris`, `Train D'Amour` et `L'Amour Sur Les Faubourgs (Instr)` sont correctement retrouvés avec `ExactPhrase=true`. Pour le terme simple `piano`, les quatre combinaisons ne constituent toutefois pas des opérateurs de champ distincts « contient / commence par / égal ». L’apostrophe typographique n’est pas équivalente à l’apostrophe droite. | compensable par Parigo | Harvest | Normalisation, post-filtrage et pagination actifs. |
| SEARCH-I18N | Recherche bilingue historique | Roland a indiqué que Harvest ne fournit pas de recherche multilingue native et recommande les keyword groups. Après relecture de cette réponse avec l’équipe Parigo, Guillaume maintient qu’un comportement bilingue avait précédemment été configuré sur le compte. | Le front résout les traductions officielles de taxonomie : `reggae triste` peut consommer `triste`, appliquer la catégorie canonique `Sad` et conserver `reggae`. Ce mécanisme ne remplace pas une recherche bilingue native pour tous les mots-clés, l’autocomplétion et les facettes. | compensable par Parigo | Harvest + Parigo | Non bloquant avec la compensation actuelle ; demander à Harvest de vérifier l’ancienne configuration du compte et sa restauration possible. |
| COMM-01 | Périmètre de `gethistorybycommunications` | Peter a précisé l’absence d’archive des formulaires de contact ; aucune réponse sur l’historique membre. | Sept resets présents ; seulement Type/From/To/Subject/Date/Status, sans corps. | compensable par Parigo | Harvest | UI fidèle au contrat disponible. |
| RH-01 | Templates Right Holder et batch à 100 € | 3 août : Roland explique l’édition et propose le batch. Aucune réponse aux validations détaillées du 11 août. | Templates d’écrasement désactivés et vides ; aucune mutation effectuée. Le front normalise temporairement la présentation des valeurs existantes. | blocage Harvest | Harvest + Parigo | Reporté après lancement : la donnée source devra être nettoyée dans Harvest Admin, avec pilote réversible avant traitement global. |
| AIMS-ARCH | Mode d’intégration AIMS | 14 août : Matt confirme toutes les fonctions via Harvest, sans intégration séparée. 16 août : Peter décrit la configuration ID-à-ID. | Code Parigo n’utilise que la Public API Harvest. | résolu | Harvest + AIMS | Aucun. |
| AIMS-INDEX | Livraison et indexation | 19 août : mains only confirmé ; clé remise à Harvest. 20 août : Peter confirme le début de livraison. | Track, prompt, upload WAV synthétique et URL YouTube Music : 30 résultats chacun. Le contrôle du 27 août trouve 30/30 seeds récentes de l’endpoint catalogue indexées, avec une latence moyenne de 1,995 s ; l’échantillon manuel de masters Parigo précédent était également couvert à 10/10. | résolu | Harvest + AIMS | Couverture des échantillons validée. L’indexation continue relève désormais de la surveillance opérationnelle Harvest. |
| AIMS-PUBLIC | Contrat Public API des quatre modes | L’architecture Harvest a été confirmée et le contrat Parigo a été validé par les tests live. | Track, prompt, upload et URL renvoient chacun 30 résultats. Le fixture réel `music.youtube.com/watch?v=ZbZSe6N_BXs` réussit. Les quatre capacités sont annoncées et activées par `/api/similarity/capabilities`, les routes actives utilisent uniquement `/api/similarity/*`, et 43/43 tests unitaires ciblés passent. | résolu | Harvest + Parigo | Intégration terminée. Limites et disponibilité restent de la surveillance Harvest, sans travail AIMS restant. |

## Décision de lancement

Sont bloquants : formulaire de contact qui ne transmet aucun message, compte ou
token inutilisable en production, callback erroné, régression
recherche/lecteur/téléchargement, ou exposition de données incorrectes. Les
traductions absentes avec fallback anglais et une indisponibilité AIMS
ponctuelle ne bloquent pas le catalogue principal.

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
- tests unitaires ciblés AIMS : 6 fichiers et 43 tests réussis le 27 août ;
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
