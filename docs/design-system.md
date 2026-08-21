# Design system Parigo

## Rythme responsive

Les limites de pages et de sections utilisent les variables sémantiques de `src/app/globals.css`. Les valeurs fixes restent réservées aux composants locaux (cartes, champs et boutons).

| Token | Mobile `< 768 px` | Desktop `≥ 768 px` | Usage |
| --- | ---: | ---: | --- |
| `--space-page-gutter` | `1rem` | `2rem` | Gouttière d’une surface publique |
| `--space-page-top` | `7rem` | `9rem` | Header vers le début d’un héros |
| `--space-page-hero-bottom` | `2rem` | `5rem` | Cadre du héros vers son séparateur |
| `--space-divider-content` | `1.5rem` | `4rem` | Séparateur vers le premier contenu |
| `--space-section-y` | `3rem` | `6rem` | Section standard |
| `--space-section-y-large` | `4rem` | `8rem` | Section Home ou éditoriale ample |
| `--space-heading-content` | `2rem` | `3rem` | Titre vers grille, rail ou contenu |
| `--space-block-gap` | `2rem` | `3.5rem` | Deux blocs d’une même section |
| `--space-grid-x` | `1rem` | `1.5rem` | Colonnes et grilles de cartes superposées |
| `--space-grid-y` | `2rem` | `3rem` | Lignes de cartes avec légende extérieure |

## Règles

- Une frontière n’a qu’un responsable : le héros possède l’espace avant son séparateur et la section suivante possède l’espace après celui-ci.
- Le premier enfant d’une section ne rajoute pas de marge structurelle au `padding` de son parent.
- Les grilles de médias avec texte superposé utilisent `--space-grid-x` dans les deux axes. Les catalogues avec légende sous la pochette utilisent `--space-grid-x` horizontalement et `--space-grid-y` verticalement.
- Sous `768 px`, les sections standard restent compactes. À partir de `768 px`, la même hiérarchie respire davantage sans modifier les largeurs maximales.
- La compacité ne réduit jamais une cible interactive sous `44 × 44 px`.
- Les pages de compte et d’authentification ont leur propre shell et ne consomment pas automatiquement ces règles publiques.
