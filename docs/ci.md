# CI, Previews et promotion Vercel

Le workflow `.github/workflows/ci.yml` est l’unique pipeline de déploiement du projet. Les déploiements Git automatiques de Vercel sont désactivés dans `vercel.json` afin qu’un même commit ne soit jamais construit à la fois par l’intégration Git Vercel et par GitHub Actions.

## Matrice des contrôles

| Déclencheur | Qualité statique | Build Preview | Navigateur | Lighthouse | Promotion |
| --- | --- | --- | --- | --- | --- |
| PR prête | complet | nouveau | smoke + SEO | non | non |
| Merge PR vers `main` | hérité de la PR protégée | Preview PR réutilisée si l’arbre Git est identique, sinon nouveau build | complet + SEO | oui | oui |
| Push direct sur `main` | complet | nouveau | complet + SEO | oui | oui |
| Manuel sur `main` | complet | nouveau | complet + SEO | oui | oui |
| PR brouillon | non | non | non | non | non |

La qualité complète comprend le lint, le typecheck, Vitest, l’audit des dépendances de production et les contrats d’assets publics. Le build contrôle aussi les budgets de sortie Next.js.

## Réutilisation sûre après une PR

Une exécution `push` n’hérite des contrôles statiques que si l’API GitHub confirme une PR fusionnée vers `main` dont le `merge_commit_sha` est exactement le commit reçu. Toute réponse absente, ambiguë ou indisponible déclenche la suite complète.

La Preview PR est marquée avec le hash de son arbre Git. Après le merge, elle n’est réutilisée que si ce hash correspond exactement à l’arbre de `main`. Un artefact absent provoque automatiquement un nouveau build. Playwright complet, SEO et Lighthouse s’exécutent toujours sur l’artefact choisi avant sa promotion.

## Contrôles volontairement non dupliqués

- Lighthouse s’exécute une fois avant promotion sur l’artefact exact qui deviendra la production.
- Après promotion, le healthcheck et les contrats SEO vérifient l’alias public ; un second Lighthouse du même artefact n’apporterait pas de couverture supplémentaire.
- Une PR exécute un smoke navigateur rapide. La suite desktop et mobile complète s’exécute une fois avant chaque promotion.

## Garde-fous de consommation

- Les exécutions précédentes d’une même PR sont annulées par la concurrence GitHub Actions.
- Les PR brouillon n’allouent ni runner navigateur ni Preview Vercel.
- Chaque job a un timeout explicite.
- Les rapports Playwright et Lighthouse ne sont conservés qu’en cas d’échec.
- `harvest-nightly.yml` reste séparé, planifié et strictement en lecture seule.
