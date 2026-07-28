# Audit et contrat de recherche Harvest — 28 juillet 2026

## Conclusion

La recherche historique de Parigo utilisait `St_Keyword_Aggregated`. Ce terme agrège tous les champs textuels activés dans HM Admin et explique les faux positifs : un résultat peut être classé pour `crime` parce que le mot figure dans ses mots-clés ou son commentaire, même si son titre ne contient pas `crime`.

Le contrat public de Parigo est désormais différent :

- une recherche de pistes porte uniquement sur `TrackDisplayTitle` ;
- une recherche d’albums porte uniquement sur `AlbumDisplayTitle` ;
- la chaîne est une sous-chaîne : `crime` correspond à un titre contenant `crime`, et `crim` peut aussi correspondre à `crimson` ;
- les filtres Harvest s’ajoutent à cette contrainte sans filtrage tardif dans le navigateur ;
- les synonymes Harvest restent désactivés tant que leur configuration ne peut pas être inspectée.

## Mesures live avant la refonte

Les appels ont été effectués avec le compte et la région Harvest du projet. Les totaux décrivent le catalogue au moment de l’audit et ne constituent pas des assertions figées.

| Requête | Vue | Recherche agrégée historique | Recherche native limitée au titre |
| --- | --- | ---: | ---: |
| `crime` | pistes | 8 620 | 166 |
| `crime` | albums | 919 | 47 |
| `crim` | pistes | 9 221 | 259 |
| `crim` | albums | — | 60 |
| `wedding` | pistes | 1 212 | 160 |
| `mariage` | pistes | 0 | 0 |

La recherche agrégée avec `ExactPhrase: true` renvoyait encore 8 602 pistes pour `crime` : l’expression devenait exacte, mais sa portée restait l’ensemble des métadonnées. Sur l’ancien site public, la piste `Search The Vault` apparaissait ainsi pour `crime` alors que seul son commentaire ou ses mots-clés contenait le terme.

Le test `crim` limité au titre renvoie des titres commençant par `Criminal…`, `Crime…` et `Crimson…`. Il valide que le besoin utilisateur relève du wildcard dans un champ précis, et non d’une égalité avec le titre complet.

## Payload Harvest retenu

Pour une piste :

```json
{
  "St_Keyword": {
    "Fields": "TrackDisplayTitle",
    "ExactPhrase": false,
    "Wildcard": true,
    "DisableKeywordGroup": true,
    "OrOperation": false,
    "Keywords": "crime",
    "Negative": false
  }
}
```

Pour un album, seul `Fields` devient `AlbumDisplayTitle`. `OrOperation: false` impose la présence de tous les mots d’une saisie multi-mots. `Wildcard: true` autorise les extensions comme `crim` → `crimson`. `DisableKeywordGroup: true` empêche qu’un groupe de synonymes non audité réintroduise des correspondances éloignées.

La documentation publique Harvest distingue :

- [`St_Keyword_Aggregated`](https://developer.harvestmedia.net/) : agrégation des champs textuels configurés dans HM Admin ;
- `St_Keyword` : recherche personnalisée avec choix explicite des champs ;
- [`Exact Phrase`](https://support.harvest.music/hc/en-us/articles/360025876392-Search-for-Exact-Phrase) : recherche d’une expression exacte, sans restriction automatique au titre ;
- [`Advanced Search`](https://support.harvest.music/hc/en-us/articles/360025875612-Advanced-Search-Lyrics-Styles-etc) : combinaison de mots-clés, genres, styles, catégories, paroles, artistes, compositeurs et éditeurs.

Les champs textuels documentés comprennent notamment `TrackDisplayTitle`, `TrackComment`, `TrackComposer`, `TrackKeywords`, `TrackLyrics`, `TrackMood`, `TrackMusicFor`, `AlbumDisplayTitle`, `AlbumKeywords`, `AlbumDescription`, `LibraryName`, `CategoryAttributeName` et `StyleName`.

## Traduction

`TranslateKeyword: "fr"` n’a traduit ni `mariage` ni ses variantes lors des appels live. Le paramètre n’est pas décrit dans la documentation publique consultée, et aucun endpoint public permettant de lister les groupes de mots-clés ou synonymes configurés n’a été trouvé.

Parigo applique donc un fallback de traduction côté BFF :

1. exécuter la recherche littérale limitée au titre ;
2. si son total est zéro, demander à DeepL une traduction avec détection automatique de la langue ;
3. continuer uniquement si la langue détectée est le français et si la traduction anglaise diffère du texte original ;
4. relancer la requête avec la traduction, sans modifier les filtres, la vue, le tri ou la pagination ;
5. retourner `queryResolution` pour expliquer la transformation dans l’interface.

La traduction n’est plus limitée à un lexique ou à des exemples connus. Des requêtes comme `mariage romantique`, `forêt sombre`, `course poursuite` ou `coucher de soleil` suivent toutes le même contrat générique. Les réponses sont mises en cache pendant 24 heures, l’appel est interrompu après trois secondes et une indisponibilité de DeepL ne fait jamais échouer la recherche Harvest.

`DEEPL_AUTH_KEY` reste strictement côté serveur. Une clé API Free sélectionne automatiquement l’endpoint Free officiel ; une clé Pro utilise l’endpoint Pro. Sans clé, seul le premier passage littéral est effectué.

Une implémentation React uniquement côté navigateur a été écartée. Elle exposerait le fournisseur ou sa clé, ne bénéficierait pas aux consommateurs directs du BFF et rendrait les URLs ou caches moins cohérents.

## Recherche par titre et recherche par intention

Les deux modes ne sont pas deux niveaux de précision d’un même moteur.

- **Par titre** cherche le texte saisi dans le titre du type sélectionné. Les résultats se mettent à jour directement dans la liste ou la grille, sans fenêtre d’autocomplétion.
- **Par intention** transforme une phrase en filtres structurés Harvest : genre, humeur, instrumentation, usage `Music For` et BPM. `mariage`, `noces`, `wedding` et `marriage` correspondent ici à `Music For > Events > Wedding`.

Le résolveur d’intention est un parseur bilingue déterministe, pas un moteur sémantique ou un modèle d’IA. Une intention sans critère reconnu n’est plus envoyée en recherche agrégée : l’interface demande de reformuler ou de passer en mode titre. La présence vocale détectée n’est pas affichée comme filtre appliqué tant qu’aucun filtre Harvest effectif ne lui correspond.

## Filtres disponibles

L’interface publique combine actuellement :

- labels en inclusion ;
- Genre, Moods, Music For, Period, Instruments et Area en inclusion/exclusion ;
- BPM et durée ;
- versions principales ou toutes les versions pour les pistes ;
- tri pertinence, date croissante/décroissante et titre A–Z/Z–A.

Harvest expose aussi des recherches par style, playlist, album, piste, ayant droit, date de sortie et plusieurs champs textuels spécialisés. Ces capacités ne sont pas ajoutées automatiquement à l’interface : elles doivent répondre à un besoin produit et disposer d’un contrat vérifiable.

## Contrats de validation

Les tests ne figent pas les totaux du catalogue. Ils vérifient les invariants :

- chaque résultat de `crime` contient `crime` dans son titre ;
- `crim` ne renvoie pas moins de pistes que `crime` et expose un titre contenant `crimson` ;
- le traducteur accepte des requêtes françaises arbitraires et ignore les langues autres que le français ;
- les résultats traduits contiennent la requête anglaise effective renvoyée dans `queryResolution` ;
- la désactivation du fallback produit une recherche littérale sans métadonnée de résolution ;
- aucune fenêtre d’autocomplétion n’est ouverte pendant la saisie ;
- les pistes sont toujours une liste et les albums toujours une grille.
