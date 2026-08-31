# Labels Harvest — contrat CMS et assets

## Source de vérité

Les pages `/labels` et `/labels/[id]` consomment les Libraries Harvest. Parigo
normalise les valeurs, calcule les compteurs de catalogue et remplace localement
les logos inexploitables par un monogramme. Aucune base de données de labels
n'est maintenue dans l'application.

## Traductions vérifiées

Vérification du **26 août 2026** : le contrat diffère entre liste et détail.
`getlibraries` expose les descriptions localisées sous la forme :

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

`getlibrary` omet actuellement `LanguageItems`, mais
`?languagecode=en`/`fr` renvoie la langue correspondante directement dans
`Detail`. Parigo assemble donc la fiche à partir de deux lectures et applique
le fallback langue demandée → anglais → `Detail`/`Profile`.

Fixture live : **Musica.it**, ID `9d330c152c37bca0`. Le label Parigo possède
une description anglaise mais son champ français est vide : il s’agit d’une
action de contenu, pas d’un défaut API.

## Spécification de l’image de label

La direction artistique retenue le 31 août 2026 est une image carrée plein
cadre, avec le nom du label déjà composé dans le visuel et un fond coloré propre
à chaque label. La liste et le détail affichent donc le même asset sans canevas
ni carte intermédiaire.

- ratio obligatoire : 1:1 ;
- dimensions identiques pour tous les masters, minimum conseillé 1600 × 1600 px ;
- couleurs sRGB ;
- nom lisible jusque dans une tuile mobile d’environ 140 px ;
- zone de sécurité : 8 % autour du nom et des éléments essentiels ;
- poids conseillé : moins de 2 Mo ;
- JPEG haute qualité, PNG ou WebP selon ce que le back-office Harvest confirme accepter.

L’URL publique auditée contient une transformation 200 × 200, mais le CDN
Harvest sait servir le même master jusqu’à 800 × 800 pour le détail. Cette
transformation ne doit donc pas être interprétée comme la taille du fichier
source uploadé.

## Questions restantes pour Harvest

1. Le CMS permet-il de créer une Library en brouillon, la prévisualiser puis la publier ?
2. Les champs `Name`, `Detail` et `Profile` sont-ils tous localisables ?
3. Les codes ISO acceptés et la règle de fallback sont-ils documentés ?
4. Quelle API ou quel webhook permet d'invalider le cache après publication ?
5. Quels formats, dimensions, poids et traitements sont appliqués aux images de labels ?
6. Pourquoi `LibraryLogoUrl` reste-t-il renseigné lorsqu’aucun asset exploitable n’est disponible ?
7. La création et la mise à jour sont-elles accessibles à l'Integration API ou uniquement au CMS ?
