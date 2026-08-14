# Recherche Parigo v2 — contrat implémenté

## Modes

- `keyword` est le seul fournisseur actif et utilise Harvest Cloud Search.
- `ai` est réservé à AIMS. Le BFF le refuse avec `FEATURE_UNAVAILABLE` tant que `aiPromptSearchAvailable` vaut `false`.
- La loupe correspond à une recherche Catalogue unifiée. Aucun sélecteur de champ n’est exposé : les contrats spécialisés alimentent des sections explicites du panneau.
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

Une correspondance exacte avec un nom canonique ou un `LanguageItems` localisé est résolue comme filtre structuré. Une requête entièrement expliquée par la taxonomie ne déclenche pas DeepL. La suggestion issue de la barre peut expliciter une traduction officielle, par exemple `triste` propose `Ambiance · Triste (Sad)`, mais la valeur persistante du filtre reste `Sad`. Le fallback générique reste couvert par une requête soumise sans résultat comme `coucher de soleil`.

Dans l’interface, accepter une suggestion remplace `q` par sa valeur anglaise, passe la nouvelle requête littérale en `translation=off`, redonne le focus au champ et rouvre l’autocomplétion. `translation=apply` reste accepté par le BFF pour la compatibilité des anciennes URL et les appels directs.

DeepL n’est jamais appelé pendant la saisie ni affiché dans le panneau d’autocomplétion. Sur l’accueil, l’utilisateur soumet d’abord sa requête et arrive sur la page de recherche. Si la recherche Catalogue confirmée ne retourne aucun résultat, le bandeau de page propose alors l’alternative anglaise. Tant que cette proposition est visible, le panneau est suspendu afin qu’il ne puisse pas recouvrir l’action. Les nombres et références catalogue ne passent jamais par DeepL.

Les nombres et identifiants de catalogue ne sont jamais envoyés à DeepL. DeepL ne crée jamais de filtre structuré.

## Filtres et suggestions

Les styles utilisent `St_Style` en inclusion/exclusion. Leurs compteurs sont des occurrences indexées et non un nombre d’albums distincts. L’autocomplétion retourne des groupes piste, album, mot-clé, compositeur et label ; les paroles et playlists en sont exclues.

L’interface utilise un bloc de recherche unique sur l’accueil et la page de résultats :

- la loupe Catalogue est active par défaut et le placeholder indique discrètement que les mots-clés anglais sont recommandés ; le seul autre mode est « Brief IA — AIMS bientôt », visible mais désactivé ;
- la barre de l’accueil est universelle ; le périmètre Pistes/Albums appartient à la toolbar de la page de résultats et ne contraint pas l’autocomplétion ;
- les titres littéraux sont regroupés en premier, avec des sous-sections Pistes, Albums et Playlists ; les filtres trouvés viennent ensuite, puis les groupes Pistes, Albums, Playlists, les raffinements et enfin les paroles ;
- les playlists sont exposées comme une section distincte ; les références restent détectées par le chemin historique de Harvest et sont affichées dans les métadonnées compactes des résultats concernés ;
- les suggestions s’ouvrent dans un panneau pleine largeur sous la saisie, avec un seul défilement vertical et des sections empilées pour les pistes, albums, playlists, paroles, mots-clés et filtres ;
- les métadonnées de correspondance restent calculées pour le classement et les contrôles de contrat, mais ne sont plus répétées sous forme de badges dans le panneau ou la liste principale ; le titre, l’album et la section visible portent déjà cette information ;
- sélectionner un filtre retire uniquement l’expression exacte reconnue du texte littéral. Ainsi `reggae triste` + `Ambiance · Triste (Sad)` conserve `q=reggae` et applique l’identifiant de catégorie `Sad` ; retirer ensuite le filtre ne restaure pas automatiquement le mot consommé ;
- si tous les termes ont été transformés en filtres, la recherche reste lançable sans paramètre `q` et le panneau conserve les filtres sélectionnés visibles ;
- les intitulés des groupes et sections suivent la langue de l’interface, mais toutes les valeurs de taxonomie et leurs chips restent en anglais canonique, ambiances comprises. Les traductions françaises officielles restent recherchables dans la barre et dans le champ d’affinage de chaque groupe, sans modifier l’affichage permanent ;
- les pistes réutilisent la pochette de leur album et les albums leur propre pochette, construites depuis le gabarit d’asset Harvest commun sans hydratation par résultat ;
- la saisie seule n’actualise plus silencieusement la liste complète : Entrée ou le bouton de soumission confirme `q`, tandis que l’autocomplétion reste disponible pendant la frappe ;
- le panneau conserve un ordre et une limite stables pour la navigation clavier, puis propose une action explicite vers tous les résultats.

Les groupes Pistes et Albums et `/api/search` utilisent désormais la même orchestration déterministe. Une première voie interroge le champ titre, vérifie localement que chaque mot est réellement présent dans le titre visible, puis une seconde voie éditoriale exclut les candidats du premier index. Les titres vérifiés précèdent donc toujours les correspondances de description, mots-clés, catégories ou métadonnées d’album. Les deux voies sont disjointes côté Harvest : pour `crime`, le live renvoie 174 candidats titre et 8 937 résultats éditoriaux restants, soit le total initial inchangé de 9 111.

Sur la première page, les deux requêtes partent en parallèle : la latence correspond au maximum des deux appels et non à leur somme. Un appel Harvest unique ne permettrait ce contrat que si `RankExpression` supportait une pondération documentée des champs ; ce n’est pas le cas du contrat public vérifié. Pour les pages profondes, le BFF parcourt l’index candidat par lots de 100 lorsque c’est nécessaire afin de conserver une pagination stable malgré les faux positifs de l’opérateur `Wildcard`. Les candidats non littéraux mais expliqués par une autre métadonnée sont replacés après tous les vrais titres. Le panneau n’affiche qu’un extrait de ce même ordre ; les groupes Filtres, Playlists, Affiner avec, Compositeurs et Labels restent issus de leurs contrats spécialisés.

Une suggestion du groupe « Dans les paroles » encode la piste, l’onglet `lyrics` et le terme reconnu dans son lien. Cette recherche reste techniquement isolée, limitée et conditionnelle, mais l’utilisateur la retrouve dans le même panneau Catalogue. La page album ouvre directement la preuve, surligne toutes les occurrences exactes normalisées, place le focus sur la première et annonce leur nombre. Si le fournisseur a attribué la piste sans que le texte hydraté permette de retrouver exactement l’expression, l’onglet reste ouvert mais l’interface annonce l’anomalie au lieu d’inventer une occurrence.

Le sélecteur de langue conserve toute la query string et la canonicalisation client respecte `/en/search`, de sorte que texte, filtres, vue, tri et pagination survivent au changement de langue.

## Préparation AIMS

Le mapping réservé est défini sans appel fournisseur : labels → `label_name`, genre → `genres`, instruments → `instruments`, moods → `moods`, musique pour → `music_for`, BPM → `bpm`, durée → `duration`, styles → `tags`. Période, zone et compositeur sont explicitement non mappés tant qu’AIMS ne les a pas confirmés.

Le contrat inactif normalise `id_client`, conserve `query_id`, distingue total approximatif et suggestions `did_you_mean`, restaure strictement l’ordre AIMS après hydratation Harvest et remonte les identifiants absents comme désynchronisation d’index. Les erreurs prévues séparent prompt incompris, indisponibilité, timeout et index incohérent. Aucun appel AIMS n’est implémenté ou activable dans cette livraison.
