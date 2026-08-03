# Audit Harvest — source de vérité du catalogue public

Date : 1er août 2026
Périmètre : catalogue, Search, compositeurs, albums, clips, synchronisations, BFF et `/admin/matching`.

## Décision appliquée

- Harvest est l'unique source de vérité des albums, pistes, crédits compositeur, artistes, éditeurs, labels, playlists musicales et données membre.
- Les playlists YouTube administrées par Parigo sont les seules sources des inventaires **Clips** et **Synchronisations**.
- Aucune relation musicale provenant du Portfolio Caroline, du Google Sheet, du registre matching ou du contenu éditorial local ne peut être publiée.
- `/admin/matching` compare ces anciennes informations à l'état courant de Harvest. Il prépare une correction humaine dans le CMS ; il ne corrige pas le site public et n'écrit pas dans Harvest.
- Une donnée source absente reste absente. Une panne n'est jamais remplacée par une ancienne liste locale présentée comme valide.

## Où se trouve le compositeur dans Harvest ?

Dans le contrat public observé, le compositeur est porté par la **piste** : le champ `Composer` de chaque résultat Track contient un ou plusieurs libellés textuels. L'album ne porte pas de relation structurée Album–Contributor.

La relation affichable est donc :

```text
Album Harvest
  └─ pistes Harvest
       └─ Composer: libellés bruts
```

Conséquences :

1. les compositeurs d'un album sont l'union exacte des crédits de ses pistes ;
2. un compositeur ne doit jamais être ajouté directement à un album par un fichier Parigo ;
3. les variantes comme `Nom`, `Nom (SACEM)` ou une faute d'encodage restent distinctes jusqu'à correction dans le CMS ;
4. l'endpoint `/getrightholders/{token}/{trackId}` fournit des ayants droit structurés **pour une piste**, mais ne remplace pas aujourd'hui un annuaire global Contributor ;
5. le champ artiste est distinct du champ compositeur et ne doit pas servir de repli.

## État live constaté

- Catalogue global : environ 189 804 pistes principales au moment de l'audit.
- Label Parigo : 55 albums et 173 libellés exacts de compositeur observés sur ses pistes.
- Le service Cloud Search accepte une recherche sur `TrackComposer`.
- Le contrat annonce un facet compositeur, mais les appels live testés renvoient `Facets: {}` pour celui-ci.
- L'autocomplétion d'ayants droit n'est pas exhaustive : elle ne renvoie par exemple aucun résultat pour `Minimatic`, alors que `Minimatic (NS)` crédite 24 pistes.

Il serait donc faux de précharger le filtre Search avec les 173 crédits Parigo : Search interroge tout le catalogue Harvest. Il serait également faux d'utiliser l'autocomplétion d'ayants droit comme annuaire exhaustif.

## Flux publics après nettoyage

| Surface | Source | Traitement autorisé | Ce qui a été retiré |
| --- | --- | --- | --- |
| Search — filtre Compositeurs | Cloud Search global, champ `TrackComposer` | Recherche distante par sous-chaîne, puis filtre exact avec le libellé sélectionné | Liste limitée aux profils/au label Parigo et résolution vers des slugs locaux |
| `/compositeurs` | Toutes les pistes du label Parigo | Agrégation par **chaîne exacte**, ID d'URL technique déterministe, comptes de pistes/albums | Profils, photos, biographies, genres, alias et relations locales |
| Détail compositeur | Crédits exacts des pistes Parigo | Chargement des albums Harvest auxquels ces pistes appartiennent | Exclusions locales, discographie Portfolio, clips locaux |
| Détail album | Album et pistes Harvest | Union dédoublonnée des chaînes `Composer` des pistes | Relation manuelle Minimatic–PGO0050 et résolution vers une identité locale |
| Détail piste | Piste Harvest | Affichage de chaque chaîne `Composer` exacte | Substitution par un profil Parigo |
| Clips | Playlist YouTube configurée | Mapping identifiant, ordre, titre, description, miniature, chaîne et date ; classification visuelle du titre | Fiches Portfolio, overrides locaux, crédits clip et relations album |
| Synchronisations | Playlist YouTube configurée | Même mapping technique | Sept études de cas locales et repli local en cas de panne |
| Sitemap | Harvest + playlists YouTube live | URLs issues des identifiants réellement chargés | Slugs de profils et vidéos historiques |

### Limite contrôlée du filtre Search

Le filtre attend au moins deux caractères, envoie une requête `TrackComposer` au catalogue global et agrège les libellés bruts des pistes retournées. La collecte inspecte au maximum 500 pistes par saisie pour protéger le BFF. Si davantage de pistes correspondent, l'interface affiche « précisez le nom » au lieu de présenter la liste comme exhaustive.

Une sélection transmet ensuite le libellé exact à la recherche principale avec `ExactPhrase: true`. Par exemple, sélectionner `Minimatic (NS)` ne devient ni `Minimatic`, ni un slug, ni un profil local.

Ce mécanisme est le compromis fiable tant que Harvest ne renvoie pas un facet Contributor global exploitable. La cible préférable reste un endpoint Harvest dédié avec identifiant, pagination et nombre d'utilisations.

## Audit précis des transformations BFF

### 1. Adaptations purement techniques — à conserver

| Transformation | Code principal | Pourquoi elle est saine |
| --- | --- | --- |
| Jetons service, invité et membre | `src/lib/harvest/client.ts` | Cache et secrets restent côté serveur ; aucune donnée métier n'est créée. |
| Validation des réponses | `src/lib/harvest/contracts.ts` | Les formes externes sont contrôlées avant exposition. |
| Mapping vers des DTO sérialisables | `src/lib/harvest/catalog.ts` | Renomme les champs, convertit listes/nombres/dates et retire les secrets. |
| URLs audio, images et waveform | `src/lib/harvest/assets.ts` | Applique les templates d'assets fournis par Harvest. Les SVG de remplacement sont des placeholders visuels, pas des métadonnées. |
| Pagination, limites et cache | catalogue et inventaires | Contrôle la charge sans changer les objets source. |
| ID d'URL d'un crédit brut | `composer-credits.ts` | Hash déterministe de la chaîne exacte ; le nom source reste inchangé. |
| Normalisation de saisie | filtre Search | Accents et ponctuation facilitent la recherche, mais les options et le filtre final restent les chaînes brutes. Les suffixes SACEM/NS/BMI ne sont pas supprimés. |
| Séparation main/alternate | mapper Track | Utilise `Version`, `MainTrackID` et `IsAlternate` fournis par Harvest ; les versions sont chargées par ID. |

### 2. Transformations de présentation — acceptables si elles restent visibles

| Transformation | Effet | Règle |
| --- | --- | --- |
| `albumIdentity` | Retire du titre affiché un code PGO déjà fourni séparément | Conserver le code et l'identifiant Harvest ; ne jamais utiliser le titre nettoyé pour créer une relation. |
| `slugify(Artist)` | Produit une clé de rendu pour la liste d'artistes | Ne pas interpréter ce slug comme un identifiant Contributor. |
| Classification des titres YouTube | Classe en clip, teaser, live, etc. | Présentation calculée seulement ; aucune relation musicale n'en découle. |
| Traduction DeepL d'une requête sans résultat | Relance Search avec une requête traduite | L'UI doit exposer la requête effectivement appliquée ; la traduction n'est jamais enregistrée comme donnée Harvest. |
| Parsing d'un brief | Traduit des mots du brief en IDs de catégories Harvest | Les résultats viennent de Harvest et les filtres appliqués sont affichés. Le dictionnaire Parigo reste une aide de requête, pas une taxonomie publiée. |

### 3. Créations ou masquages de sémantique corrigés

| Ancien comportement | Risque | Correction appliquée |
| --- | --- | --- |
| `Artist || Composer` dans les crédits artiste | Confusion de rôles | `Artist` uniquement ; `Composer` reste dans son champ dédié. |
| `LibraryName || "Parigo"` | Attribution d'un label absent | Chaîne absente conservée ; le composant peut montrer un placeholder visuel séparé. |
| Vocal déduit des paroles ou de `Version` | Fausse donnée métier | `isVocal: null` tant que Harvest ne fournit pas la propriété. |
| Genres remplacés par styles ou mots-clés | Fusion de taxonomies | `genres`, `styles`, `keywords`, `moods` restent distincts. |
| Featured vide remplacé par les derniers albums | Décision éditoriale inventée | Un résultat Featured vide reste vide. |
| « Albums similaires » = albums du même label | Relation de similarité fictive | Le bloc n'est plus alimenté ; `similar: []`. |
| Échecs secondaires convertis en `[]` ou `0` | Panne masquée comme absence | Les erreurs remontent au loader et peuvent produire un état indisponible/partiel. |
| Clips locaux ajoutés/fusionnés à YouTube | Inventaire hybride | Playlist YouTube seule ; une panne ne déclenche aucun repli local. |
| Synchros locales fusionnées ou utilisées en repli | Inventaire hybride | Playlist YouTube seule. |
| Alias locaux vers un profil public | Identité créée hors Harvest | Pages et liens publics fondés sur la chaîne Harvest exacte. |
| Relations locales album/clip/compositeur | Crédits non attestés | Retirées des pages publiques ; conservées comme preuves dans l'admin. |
| Titre manquant remplacé par `Untitled` dans le mapper | Valeur métier inventée | Valeur source absente conservée ; le texte de remplacement appartient à l'UI. |

### 4. Transformations encore calculées, à surveiller

| Point | État | Recommandation |
| --- | --- | --- |
| Valeurs numériques absentes transformées en `0` par certains contrats (`TrackCount`, durée, compteurs) | Ambiguïté possible entre zéro réel et inconnu | Faire évoluer progressivement les DTO vers `number | null` et afficher « non renseigné ». |
| `isFeatured` des playlists fixé à `true` | Présentation locale, pas vérité Harvest | Retirer le champ ou le renommer `isDisplayedAsFeatured`. |
| Catégories/genres/ambiances calculés pour certaines présentations de playlists | Dérivés de pistes Harvest | Exposer `derivedFromTracks: true` dans le DTO si ces champs deviennent visibles comme métadonnées. |
| Logos de labels issus d'une allow-list locale | Asset de marque local | Acceptable comme illustration ; ne doit jamais décider de l'existence d'un label. |
| Conversions de dates avec fuseau supposé | Normalisation technique potentiellement ambiguë | Demander à Harvest un contrat ISO avec fuseau et tester les cas limites. |
| Filtre compositeur global limité à 500 pistes correspondantes | Résultat d'options possiblement incomplet sur les requêtes larges | Demander un facet/endpoint Contributor paginé ; conserver l'avertissement visible. |

## Architecture cible Harvest

Le contrat durable devrait fournir :

- un identifiant Contributor immuable ;
- nom public, nom civil et alias structurés ;
- rôle, société de gestion et IPI dans des champs séparés ;
- relations Contributor–Track par identifiant ;
- endpoint global liste/détail, pagination, recherche et `updatedAt` ;
- filtre Cloud Search par Contributor ID ;
- champs éditoriaux (photo, biographie, liens) dans Harvest si Parigo veut continuer à publier de vrais profils.

Tant que cette entité n'existe pas, le mode strict retenu est : **173 libellés bruts Harvest et uniquement leur discographie Harvest**. Les doublons et erreurs sont volontairement visibles, car leur correction doit se faire dans le CMS.

## Rôle opérationnel de `/admin/matching`

L'admin doit répondre à trois questions distinctes :

1. **Harvest aujourd'hui** : quelle chaîne est réellement présente sur quelle piste et donc sur quel album ?
2. **Delta historique** : que suggèrent le Portfolio, le Sheet ou le registre qui n'existe pas dans Harvest ?
3. **Action CMS** : faut-il corriger un crédit, rattacher une piste, créer/normaliser un Contributor, ou classer l'ancienne information comme fausse ?

Les actions recommandées doivent être orientées source :

- `harvest-cms-create-contributor` ;
- `harvest-cms-fix-credit` ;
- `harvest-cms-add-alias` ;
- `harvest-cms-link-track` ;
- `youtube-add-video` ;
- `youtube-fix-metadata` ;
- `no-action-history-wrong`.

Après la correction humaine, le dashboard relit Harvest/YouTube et ferme le delta lorsqu'il a réellement disparu. Un export de revue ne doit pas régénérer une relation publique concurrente.

## Garde-fous ajoutés

- test d'architecture empêchant les pages publiques catalogue/vidéo d'importer les sources historiques ;
- tests unitaires des IDs exacts, variantes et suffixes de société ;
- test du mode `TrackComposer` partiel pour le catalogue global ;
- parcours E2E du filtre distant et de la valeur exacte dans l'URL ;
- aucun fallback local sur les inventaires Clips et Synchronisations ;
- aucune relation album–clip–compositeur issue de l'admin sur le site public.

## Critère de fin

La source unique est respectée lorsque supprimer les profils, alias et relations historiques du dépôt ne change aucune donnée musicale publique, et supprimer les inventaires vidéo locaux ne change aucune page Clips/Synchronisations. Toute correction métier doit alors être faite dans Harvest ou dans la playlist YouTube, puis seulement constatée par le BFF.
