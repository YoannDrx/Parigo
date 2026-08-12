# Recherche Parigo v2 — contrat implémenté

## Modes

- `keyword` est le seul fournisseur actif et utilise Harvest Cloud Search.
- `ai` est réservé à AIMS. Le BFF le refuse avec `FEATURE_UNAVAILABLE` tant que `aiPromptSearchAvailable` vaut `false`.
- Les anciens paramètres `brief`, `resolve`, `keyword` et `translate` sont acceptés puis canonicalisés. `brief` devient un mot-clé littéral et n’active jamais le parseur d’intention historique.

## Profil Harvest

`HARVEST_SEARCH_FIELD_PROFILE=editorial` utilise une allowlist sans groupes de synonymes :

- piste : `TrackDisplayTitle`, `TrackComment`, `TrackKeywords`, `TrackMood`, `TrackMusicFor`, `TrackInstrumentation`, `TrackGenre`, `AlbumDisplayTitle`, `AlbumKeywords`, `AlbumDescription` ;
- album : les trois champs album précédents et les mêmes métadonnées éditoriales des pistes.

`TrackLyrics`, `TrackDescription`, `TrackCategories`, `TrackComposer` et `LibraryName` ne doivent jamais apparaître dans ce profil. Le profil `title` reste disponible comme rollback serveur.

Pour les requêtes comportant plusieurs mots, le BFF conserve le texte et l’URL d’origine mais sérialise les termes avec le délimiteur virgule attendu par Harvest. `OrOperation: false` applique ainsi un ET entre les mots dans l’ensemble des champs autorisés.

Les formats de référence catalogue (`PRTM 0212`, `KAPL008`, etc.) utilisent uniquement l’index titre/référence historique de Harvest. Ce chemin ciblé ne réintroduit pas les champs techniques dans le profil éditorial général et ne passe jamais par DeepL.

## Traduction

- `translation=offer`, valeur par défaut : requête littérale, puis suggestion DeepL seulement après zéro résultat ;
- `translation=apply` : relance explicite avec la traduction ;
- `translation=off` : aucune traduction.

Dans l’interface, accepter une suggestion remplace `q` par sa valeur anglaise, passe la nouvelle requête littérale en `translation=off`, redonne le focus au champ et rouvre l’autocomplétion. `translation=apply` reste accepté par le BFF pour la compatibilité des anciennes URL et les appels directs.

Sur l’accueil, la suggestion est recherchée seulement après une réponse d’autocomplétion vide et une courte stabilisation de la saisie. Le client appelle alors `/api/search` avec `limit=1`, `translation=offer` et `probe=1`. Le mode `probe` conserve le contrat de recherche réel, mais interdit l’enregistrement dans l’historique membre. Il est annulé dès que la saisie change et ne doit jamais remplacer automatiquement le texte du champ.

Les nombres et identifiants de catalogue ne sont jamais envoyés à DeepL. Les filtres ne sont jamais traduits.

## Filtres et suggestions

Les styles utilisent `St_Style` en inclusion/exclusion. Leurs compteurs sont des occurrences indexées et non un nombre d’albums distincts. L’autocomplétion retourne des groupes piste, album, mot-clé, compositeur et label ; les paroles et playlists en sont exclues.

L’interface utilise un bloc de recherche unique sur l’accueil et la page de résultats :

- le mode « Mots-clés » est actif par défaut ; « Brief IA — AIMS bientôt » est sélectionnable depuis l’icône de la barre pour prévisualiser l’interface, mais son envoi reste réellement désactivé ;
- la barre de l’accueil est universelle ; le périmètre Pistes/Albums appartient à la toolbar de la page de résultats et ne contraint pas l’autocomplétion ;
- les playlists sont exposées comme un groupe d’autocomplétion distinct ;
- les paroles restent hors du profil éditorial et ne sont interrogées que dans une recherche isolée, limitée et conditionnelle ;
- les suggestions s’ouvrent dans un panneau pleine largeur sous la saisie, avec résultats musicaux prioritaires, mots-clés et filtres dédiés ;
- les pistes réutilisent la pochette de leur album et les albums leur propre pochette, construites depuis le gabarit d’asset Harvest commun sans hydratation par résultat ;
- le panneau conserve un ordre et une limite stables pour la navigation clavier, puis propose une action explicite vers tous les résultats.

## Préparation AIMS

Le mapping réservé est défini sans appel fournisseur : labels → `label_name`, genre → `genres`, instruments → `instruments`, moods → `moods`, musique pour → `music_for`, BPM → `bpm`, durée → `duration`, styles → `tags`. Période, zone et compositeur sont explicitement non mappés tant qu’AIMS ne les a pas confirmés.

Le contrat inactif normalise `id_client`, conserve `query_id`, distingue total approximatif et suggestions `did_you_mean`, restaure strictement l’ordre AIMS après hydratation Harvest et remonte les identifiants absents comme désynchronisation d’index. Les erreurs prévues séparent prompt incompris, indisponibilité, timeout et index incohérent. Aucun appel AIMS n’est implémenté ou activable dans cette livraison.
