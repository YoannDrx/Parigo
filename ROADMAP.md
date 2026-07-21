# Parigo — état de la migration

Le site repose exclusivement sur la Public API Harvest derrière les routes serveur Next.js. Il ne dépend plus de PostgreSQL, Neon, Prisma, Better Auth, Spotify API ou Vercel Blob.

## Livré

- Client API serveur, tokens, validation runtime, erreurs neutres et cache.
- Session membre JWE chiffrée et comptes Parigo.
- Catalogue public : albums, labels, collections, playlists et pistes.
- Recherche par pertinence, huit familles de filtres, inclusion/exclusion et URLs partageables.
- Lecteur persistant, waveform, favoris, playlists membre, tags, historique et téléchargements.
- Shortlist locale convertible en playlist Parigo.
- Home éditoriale, responsive, accessible et alimentée par le catalogue distant.
- Compatibilité des principales URLs historiques.
- Tests unitaires, E2E desktop/mobile, contrats live en lecture et comparaison de la recherche `piano`.

## Validation de mise en production

- Valider les mutations avec le compte de test dédié et `HARVEST_MEMBER_MUTATION_TESTS=1`.
- Réauthentifier la boîte Gmail de test pour les liens de vérification et de réinitialisation.
- Vérifier en Preview les médias, le tracking d’écoute, les droits et le désabonnement newsletter.
- Après validation Preview, archiver puis décommissionner le projet Neon externe.

Ces opérations externes sont volontairement séparées du développement local afin de ne pas supprimer une ressource avant la validation fonctionnelle.
