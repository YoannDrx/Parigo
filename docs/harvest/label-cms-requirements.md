# Labels Harvest — contrat CMS et assets

## Source de vérité

Les pages `/labels` et `/labels/[id]` consomment les Libraries Harvest. Parigo
normalise les valeurs, calcule les compteurs de catalogue et remplace localement
les logos inexploitables par un monogramme. Aucune base de données de labels
n'est maintenue dans l'application.

## Traductions vérifiées

Le détail `getlibrary` expose les descriptions localisées sous la forme :

```json
{
  "LanguageItems": [
    {
      "LanguageCode_ISO639_1": "FR",
      "Type": "LibraryDescription",
      "Value": "…",
      "Default": false
    }
  ]
}
```

Le site sélectionne `FR` ou `EN` selon la locale, puis utilise `Detail` ou
`Profile` comme repli lorsque la traduction demandée est absente.

## Spécification de logo à transmettre aux labels

- master préféré : SVG transparent, textes vectorisés, couleurs sRGB ;
- fallback : PNG transparent 2:1 de 2000 × 1000 px ;
- minimum raster : 1600 × 800 px ;
- zone de sécurité : 10 % autour du signe ;
- poids conseillé : moins de 2 Mo ;
- aucun blanc artificiel autour du logo ;
- éviter le JPEG, qui ne conserve pas la transparence.

Un logo carré doit être centré dans un canevas transparent 2:1. Harvest doit
confirmer l'acceptation et la sécurisation des SVG avant leur utilisation.

## Questions restantes pour Harvest

1. Le CMS permet-il de créer une Library en brouillon, la prévisualiser puis la publier ?
2. Les champs `Name`, `Detail` et `Profile` sont-ils tous localisables ?
3. Les codes ISO acceptés et la règle de fallback sont-ils documentés ?
4. Quelle API ou quel webhook permet d'invalider le cache après publication ?
5. Quels formats, dimensions, poids et traitements sont appliqués aux logos ?
6. Pourquoi une majorité des `LibraryLogoUrl` auditées ne renvoient-elles pas un asset exploitable ?
7. La création et la mise à jour sont-elles accessibles à l'Integration API ou uniquement au CMS ?
