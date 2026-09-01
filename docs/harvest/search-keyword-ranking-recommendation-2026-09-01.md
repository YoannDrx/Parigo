# Recherche Parigo — recommandation keyword groups et Rank Expression

Dernier contrôle live : **1er septembre 2026**.

## Conclusion

Les deux mécanismes répondent à des besoins différents :

- les **keyword groups** étendent la couverture sémantique et bilingue ;
- la **Rank Expression** ordonne les résultats déjà trouvés.

Une Rank Expression Parigo est pertinente si Harvest peut reproduire la
priorité actuelle donnée aux titres dans une seule recherche agrégée. Elle
pourrait supprimer une voie `cloudsearch`, mais elle ne supprimera ni le BFF,
ni l’enrichissement des pistes, ni les filtres, ni les contrôles de preuve.

## Comportement actuel vérifié

### Recherche validée par l’utilisateur

Le navigateur appelle une seule fois `GET /api/search` lorsqu’une recherche est
validée. Le BFF exécute ensuite :

1. un `POST /cloudsearch` limité au titre, sans keyword groups ;
2. un `POST /cloudsearch` agrégé, avec keyword groups, en excluant les titres
   déjà couverts pour garder deux voies disjointes ;
3. pour les pistes, un `POST /gettracks` afin de récupérer les détails et les
   versions.

Les deux premiers appels partent en parallèle. Ils ne doublent donc pas
mécaniquement le temps réseau, mais ils doublent la charge CloudSearch et le
coût fournisseur. Des pages profondes peuvent demander des lots titre
supplémentaires.

### Autocomplétion pendant la saisie

Après deux caractères et 250 ms sans nouvelle frappe, le navigateur appelle
`GET /api/autocomplete`. Avec les caches déjà chauds, le BFF utilise au minimum :

- un `POST /autocomplete` Harvest ;
- deux `cloudsearch` Track, titre puis agrégé ;
- deux `cloudsearch` Album, titre puis agrégé ;
- un `gettracks` et un `getalbumsbyids` pour vérifier les résultats.

Cela représente au minimum sept lectures Harvest par saisie stabilisée. Une
recherche de paroles peut s’ajouter ; le chargement à froid des filtres ajoute
également des lectures catégories, styles, labels et facettes.

Mesures locales contre l’API live, caches chauds :

| Requête | `/api/search` pistes | `/api/autocomplete` |
| --- | ---: | ---: |
| `piano` | 2,33 s | 4,75 s |
| `crime` | 1,85 s | 2,65 s |
| `reggae sad` | 1,51 s | 2,56 s |

Ces mesures sont des temps bout en bout observés, pas un engagement de
performance Harvest.

## Pourquoi le ranking Harvest par défaut ne suffit pas

Les contrôles ont comparé un seul `cloudsearch` agrégé avec la double voie
actuelle :

- `crime` : seulement 4 titres visiblement littéraux dans les 30 premiers du
  classement par défaut ;
- `piano` : seulement 2 sur 30 ;
- album `MUSIC ON HOLD` : l’album au titre strictement égal est absent des 30
  premiers avec le classement agrégé par défaut, puis premier avec la double
  voie Parigo ;
- `reggae sad` : aucune correspondance titre ; la seconde voie ne change pas la
  première page et constitue surtout un coût supplémentaire.

Le besoin de priorité titre est donc démontré. Le bon objectif n’est pas
d’ajouter une préférence esthétique, mais d’obtenir ce classement avec un seul
appel agrégé.

Le contrôle Admin confirme que la recherche agrégée active actuellement : titre
et description de piste, genre, compositeur, mots-clés, titre et mots-clés
d’album, library, catégorie, description d’album, mood et music-for. Sont
notamment désactivés : paroles, code album, instrumentation, artiste, publisher,
version, style album et titre alternatif. Le premier pilote de ranking doit donc
rester sur les champs actifs. Activer le code album ou un autre champ constitue
une décision séparée susceptible d’exiger le « full account sync » annoncé par
l’Admin.

## Rank Expression recommandée

Les valeurs ci-dessous expriment une hiérarchie métier. Harvest doit confirmer
les primitives réellement disponibles et fournir la syntaxe finale.

### Profil Track

| Signal | Poids métier proposé |
| --- | ---: |
| Égalité stricte `TrackDisplayTitle` | +100 |
| Phrase complète dans `TrackDisplayTitle` | +70 |
| Tous les termes présents dans `TrackDisplayTitle` | +50 |
| `TrackKeywords`, mood, music-for, catégorie ou genre | +25 |
| Description de piste | +15 |
| `AlbumDisplayTitle` | +12 |
| `AlbumKeywords` ou `AlbumDescription` | +8 |
| Compositeur ou library | +5 |
| Sortie depuis 30 jours | +5 maximum |
| Sortie entre 31 et 90 jours | +2 maximum |

### Profil Album

| Signal | Poids métier proposé |
| --- | ---: |
| Égalité stricte `AlbumDisplayTitle` | +100 |
| Référence catalogue exacte, si ce champ est activé et réindexé | +80 |
| Phrase complète dans `AlbumDisplayTitle` | +70 |
| Tous les termes présents dans `AlbumDisplayTitle` | +50 |
| `AlbumKeywords` | +25 |
| `AlbumDescription` | +15 |
| Titre d’une piste de l’album | +10 |
| Métadonnées éditoriales des pistes | +6 |
| Sortie depuis 30 jours | +5 maximum |
| Sortie entre 31 et 90 jours | +2 maximum |

Le bonus de récence doit rester un départage. Dans l’exemple indicatif de
Peter, `+10` pour une nouveauté et `+5` pour un match de titre donneraient trop
d’importance à la date. Une nouveauté faiblement liée ne doit pas dépasser un
ancien morceau qui répond précisément à la requête.

Deux expressions séparées sont préférables : un utilisateur qui cherche des
pistes ne formule pas la même intention que celui qui cherche des albums.

### Conditions d’adoption

Avant de retirer la double voie, le pilote doit prouver sur un corpus commun :

- conservation du nombre total de résultats et de la couverture keyword group ;
- titre strict en premier ;
- titres littéraux avant les métadonnées secondaires ;
- facettes et pagination stables ;
- fonctionnement identique dans `cloudsearch` et dans le ranking de
  l’autocomplétion ;
- scores ou explication suffisante pour diagnostiquer un ordre inattendu ;
- rollback immédiat et besoin de réindexation documenté.

Les opérateurs commence par, contient, finit par et égal restent un devis
séparé. Une Rank Expression ne rend pas recherchable une correspondance que
l’index n’a pas trouvée.

## Keyword groups : résultat du contrôle live

Le compte contient 16 groupes actifs. L’inventaire complet observé est :

| Groupe primaire | Alternatives | Recommandation |
| --- | --- | --- |
| `1910` | `1910s`, `10s` | Retirer `10s`, trop ambigu ; ajouter ensuite `années 1910`/`annees 1910`. |
| `1920` | `1920s`, `20s`, `Twenties` | Retirer `20s`; ajouter les variantes françaises non ambiguës. |
| `1930` | `1930s`, `Thirties`, `30s` | Retirer `30s`; ajouter les variantes françaises non ambiguës. |
| `1940` | `1940s`, `40s`, `Fourties` | Retirer `40s`; corriger `Fourties` en ajoutant `Forties`; ajouter le français. |
| `1950` | `1950s`, `Fifties`, `50s` | Retirer `50s`; ajouter le français. |
| `1960` | `1960s`, `Sixties`, `60s` | Retirer `60s`; ajouter le français. |
| `1970` | `1970s`, `70s`, `seventies`, `1970’s`, `70’s` | Supprimer les apostrophes et évaluer `70s`; ajouter le français. |
| `1980` | `1980s`, `80s`, `eighties` | Évaluer puis probablement retirer `80s`; ajouter le français. |
| `1990` | `1990s`, `90s`, `nineties` | Évaluer puis probablement retirer `90s`; ajouter le français. |
| `Atmospheres` | aucune | Groupe sans expansion : supprimer ou définir des équivalents éditoriaux validés. |
| `Balkan` | `Balkans` | Redondant avec la tolérance plurielle actuelle ; ajouter `balkanique` seulement si validé. |
| `Blues` | `Blues Rock`, `Delta Blues`, `Boogie-Woogie` | Ce sont des sous-genres, pas des synonymes stricts ; scinder ou assumer explicitement un groupe hiérarchique. |
| `brazil` | `brésil`, `bresil` | Seul groupe bilingue actuel ; utile, mais comportement asymétrique à faire expliquer. |
| `Hip Hop` | `Hip-Hop`, `HipHop` | Groupe de variantes orthographiques utile ; ajouter seulement les variantes réellement recherchées. |
| `Soundtrack` | aucune | Groupe sans expansion : supprimer ou ajouter `bande originale`/`musique de film` après validation. |
| `Symphonic` | `Symophonic` | La faute tolérée est utile ; ajouter `symphonique`, sans retirer forcément la faute historique. |

Les réglages observés sont :

- `Search Without Keyword Groups` désactivé ;
- `Search Using Wildcard` activé ;
- `Synonym Wildcard` désactivé.

Les groupes de décennies confirment que les termes courts créent beaucoup de
bruit. `1910` passe de 137 résultats sans groupes à 41 561 avec groupes ; les
premiers résultats contiennent notamment `No. 10` et ne décrivent pas la
période 1910. `1950` passe de 2 206 à 23 465. Le premier nettoyage recommandé
est donc de retirer les formes courtes ambiguës (`10s`, `20s`, etc.) et de les
remplacer par des formulations de période non ambiguës.

Le groupe `brazil / brésil / bresil` démontre que le mécanisme peut fournir une
couverture bilingue :

| Requête | Groupes actifs | Groupes désactivés |
| --- | ---: | ---: |
| `brésil` | 851 | 0 |
| `bresil` | 851 | 0 |
| `brazil` | 851 | 1 109 |

Le dernier résultat impose de la prudence : activer le groupe sur le terme
canonique change fortement le résultat et en réduit le total. Il faut demander
à Harvest si un groupe remplace le terme, applique une intersection particulière
ou désactive une partie du wildcard. Il ne faut pas supposer qu’il ajoute
simplement l’union des synonymes.

Le cas attendu n’est pas configuré :

| Requête | Groupes actifs | Groupes désactivés |
| --- | ---: | ---: |
| `reggae sad` | 53 | 53 |
| `reggae triste` | 2 | 2 |
| `sad` | 8 209 | 8 209 |
| `triste` | 32 | 32 |

## Pilote bilingue recommandé

Les catégories et styles live fournissent 303 couples dont les libellés EN et
FR diffèrent. Ils constituent une meilleure source que des synonymes inventés,
car ils partagent déjà un ID métier stable dans Harvest.

Premier lot proposé, limité à des équivalences directes :

### Moods

- `sad / triste` ;
- `calm / calme` ;
- `dark / sombre` ;
- `dreamy / rêveur / reveur` ;
- `epic / épique / epique` ;
- `happy / heureux` ;
- `joyful / joyeux` ;
- `melancholic / mélancolique / melancolique` ;
- `mysterious / mystérieux / mysterieux` ;
- `peaceful / paisible` ;
- `romantic / romantique` ;
- `scary / effrayant` ;
- `warm / chaleureux`.

### Usages

- `advertising / publicité / publicite` ;
- `documentary / documentaire` ;
- `corporate / institutionnel` ;
- `news / informations` ;
- `war / guerre` ;
- `child / children / enfant / enfants`.

### Instruments et styles

- `classical music / musique classique` ;
- `electronic music / musique électronique / musique electronique` ;
- `brass / cuivres` ;
- `drums / batterie` ;
- `flute / flûte` ;
- `guitar / guitare` ;
- `violin / violon`.

Il ne faut pas fusionner des notions seulement proches : `sad` et
`melancholic`, `happy` et `uplifting`, `dark` et `scary`, `corporate` et
`uplifting` doivent rester des groupes distincts tant que l’équipe éditoriale
n’a pas validé leur équivalence.

## Méthode de déploiement des groupes

1. exporter les 16 groupes actuels avant toute modification ;
2. corriger d’abord les groupes existants les plus bruyants, en particulier les
   abréviations de décennies ;
3. obtenir les recherches les plus fréquentes des derniers mois ;
4. croiser ces requêtes avec les 303 couples de taxonomie ;
5. activer d’abord `sad / triste`, puis 10 à 20 groupes prioritaires ;
6. pour chaque groupe, comparer le terme EN et le terme FR, groupes on/off,
   total, top 30 et recouvrement ;
7. valider la pertinence avec l’équipe Parigo ;
8. déployer les lots suivants seulement après absence de perte sur le terme
   canonique ;
9. conserver un export et une procédure de rollback par lot.

L’inventaire a été réalisé en lecture seule. Aucune modification n’a été faite
dans l’Admin.

## Questions précises à Harvest

- Un keyword group fait-il une union, une substitution ou une autre opération ?
- Pourquoi `brazil` donne-t-il 1 109 résultats sans groupe et 851 avec groupe ?
- Quel est le format d’import/export officiel ?
- L’ajout de groupes exige-t-il une réindexation ?
- Peut-on restaurer ou versionner un lot de groupes ?
- Une expression distincte peut-elle être attachée aux vues Track et Album ?
- La même expression est-elle disponible pour `cloudsearch` et les paramètres
  de ranking de `autocomplete` ?
- Quels champs, fonctions d’égalité/phrase et fonctions de date sont disponibles ?
- Harvest peut-il renvoyer ou journaliser le score final par résultat pendant
  le pilote ?
- Le devis peut-il séparer : ranking Track, ranking Album, et développement des
  quatre opérateurs positionnels sur les deux champs titre ?
