# Design system Parigo

## Rythme responsive

Les limites de pages et de sections utilisent les variables sémantiques de `src/app/globals.css`. Les valeurs fixes restent réservées aux composants locaux (cartes, champs et boutons).

| Token | Mobile `< 768 px` | Desktop `≥ 768 px` | Usage |
| --- | ---: | ---: | --- |
| `--space-page-gutter` | `1rem` | `2rem` | Gouttière d’une surface publique |
| `--space-page-top` | `7rem` | `9rem` | Header vers le début d’un héros |
| `--space-page-hero-bottom` | `2rem` | `5rem` | Cadre du héros vers son séparateur |
| `--space-divider-content` | `1.5rem` | `4rem` | Séparateur vers le premier contenu |
| `--space-section-y` | `2rem` | `6rem` | Section standard |
| `--space-section-y-large` | `3rem` | `8rem` | Section Home ou éditoriale ample |
| `--space-heading-content` | `1.5rem` | `3rem` | Titre vers grille, rail ou contenu |
| `--space-block-gap` | `1.5rem` | `3.5rem` | Deux blocs d’une même section |
| `--space-grid-x` | `1rem` | `1.5rem` | Colonnes et grilles de cartes superposées |
| `--space-grid-y` | `1.5rem` | `3rem` | Lignes de cartes avec légende extérieure |
| `--space-page-end` | `1.5rem` | `6rem` | Dernier contenu vers le footer |
| `--space-footer-top` | `2rem` | `4rem` | Séparateur du footer vers le logo |
| `--space-account-flow` | `1.5rem` | `2rem` | Rythme vertical de l’espace compte |

## Règles

- Une frontière n’a qu’un responsable : le héros possède l’espace avant son séparateur et la section suivante possède l’espace après celui-ci.
- Le premier enfant d’une section ne rajoute pas de marge structurelle au `padding` de son parent.
- Dans une fiche détail, la section suivante porte l’écart : le bloc précédent ne cumule pas son propre padding inférieur.
- Le dernier bloc du `main` porte `--space-page-end`; le footer ne rajoute aucune marge extérieure avant son séparateur.
- Quand le lecteur fixe est monté, sa réserve appartient exclusivement au bas interne du footer. Elle ne doit jamais être ajoutée au `main`, à une liste ou à une section de contenu.
- Sur mobile, une frontière standard de même surface ne dépasse pas `2rem`; une section éditoriale ample peut utiliser `3rem`. La dernière carte ou piste reste à `1.5rem` du footer.
- Les grilles de médias avec texte superposé utilisent `--space-grid-x` dans les deux axes. Les catalogues avec légende sous la pochette utilisent `--space-grid-x` horizontalement et `--space-grid-y` verticalement.
- Sous `768 px`, les sections standard restent compactes. À partir de `768 px`, la même hiérarchie respire davantage sans modifier les largeurs maximales.
- La compacité ne réduit jamais une cible interactive sous `44 × 44 px`.
- Les surfaces publiques et l’espace compte consomment ces règles. Les routes d’authentification restent explicitement hors périmètre.
