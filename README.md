# Parigo

Site catalogue et lecteur audio de Parigo Music. Harvest est l’unique source de vérité des albums, pistes, crédits bruts, ayants droit et discographies publiques. L’annuaire `/talents` est limité à un registre éditorial contrôlé de 62 noms publics ; ses bios, portraits sources et rendus WebP sont tous versionnés directement dans ce dépôt, tandis que toutes ses relations musicales restent calculées depuis les pistes Harvest. Les inventaires Clips et Synchronisations proviennent exclusivement des playlists YouTube officielles. Le navigateur appelle uniquement les routes et composants Next.js du projet ; les identifiants et jetons Harvest restent côté serveur. Le projet n’utilise ni base PostgreSQL, ni Prisma, ni couche d’authentification locale.

## Installation

Le projet utilise Node.js 24 LTS et pnpm 9.15.0.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Le projet utilise volontairement un seul fichier local `.env`. Il ne faut pas
créer de `.env.local`, `.env.development`, `.env.production` ou de variante
Sentry : toutes les valeurs locales sont regroupées dans `.env`, qui reste
ignoré par Git. `.env.example` est l’inventaire versionné sans secrets.

Variables obligatoires pour le catalogue public :

- `HARVEST_CLIENT_ID`
- `HARVEST_CLIENT_SECRET`
- `HARVEST_ACCESS_KEY`

Pour activer les comptes Parigo, ajouter `HARVEST_SESSION_SECRET`, un secret indépendant généré par exemple avec `openssl rand -base64 48`. Son absence désactive uniquement la surface membre ; elle ne fait pas tomber le catalogue public.

Le formulaire de contact utilise l’endpoint Harvest `sendcontactusemail`. Harvest transmet
la demande à l’administrateur du compte et en adresse une copie à l’expéditeur. Cet endpoint
ne prenant pas en charge les pièces jointes, le formulaire accepte uniquement les champs
texte et le contexte éventuel d’une piste. `NEXT_PUBLIC_SITE_URL` doit toujours désigner le domaine
public réellement accessible. Tant que le domaine Parigo n’est pas raccordé,
la valeur de référence est `https://parigo-ten.vercel.app`.

`HARVEST_AUTH_URL`, `HARVEST_SERVICE_URL` et `HARVEST_AUTH_GRANT_TYPE` ont des valeurs officielles par défaut. `HARVEST_DEFAULT_REGION_ID` est facultatif : la région globale du service est découverte automatiquement. Les anciens alias `HM_ServiceAPI_*` ne sont plus pris en charge.

La recherche publique utilise par défaut le profil Harvest éditorial explicite (`HARVEST_SEARCH_FIELD_PROFILE=editorial`) : titres, descriptifs, mots-clés, ambiances, usages, instruments, genres et métadonnées d’album. `HARVEST_SEARCH_FIELD_PROFILE=title` constitue le rollback immédiat vers la recherche limitée aux titres. Les paroles, compositeurs, labels et champs techniques ne sont pas inclus dans le profil éditorial.

La traduction générique des recherches françaises sans résultat utilise DeepL côté serveur. Ajouter `DEEPL_AUTH_KEY` pour l’activer ; une clé API Free (`:fx`) sélectionne automatiquement `https://api-free.deepl.com`, sinon l’endpoint Pro est utilisé. `DEEPL_API_URL` permet uniquement de remplacer explicitement cet endpoint. DeepL n’est jamais appelé pendant la saisie : après la soumission d’une recherche Catalogue sans résultat, la page propose une alternative que l’utilisateur doit accepter. Elle n’est ni injectée dans l’autocomplétion ni appliquée silencieusement. Après acceptation, la traduction remplace le texte du champ et devient la nouvelle requête littérale. Sans clé, la recherche Harvest continue de fonctionner sans suggestion traduite.

La loupe lance une recherche Catalogue unifiée et majoritairement anglaise : titres de pistes, albums et playlists, références, métadonnées éditoriales, filtres structurés et, de façon isolée, paroles. L’utilisateur n’a pas à choisir le champ avant de chercher ; le panneau explique et ordonne les correspondances par sections, avec les titres littéraux en premier. Le panneau et la page complète partagent le même classement : une voie de titres vérifiés précède une voie éditoriale qui exclut ces candidats, les deux appels Harvest de la première page étant lancés en parallèle. Entrée confirme toujours le texte et la liste complète n’est plus modifiée pendant la simple saisie.

Le mode public « Similarité IA » utilise AIMS exclusivement à travers la Public API Harvest, sans exposer ces fournisseurs dans l’interface ou le contrat navigateur. Il prend en charge une à dix pistes du catalogue, un brief, un fichier MP3/WAV envoyé directement vers l’URL présignée Harvest et les liens YouTube, Spotify, Vimeo, SoundCloud, Apple Music ou TikTok. Les routes publiques `/api/similarity/*` ne renvoient jamais de jeton Harvest et n’acceptent les ressources temporaires qu’au moyen de références chiffrées. Tous les modes sont fermés par défaut : `AIMS_CONTRACT_VERIFIED=1` puis le flag du mode concerné sont nécessaires. Le prompt exige en plus `AIMS_PROMPT_CAPABILITY_OVERRIDE=1` tant que Harvest l’annonce comme indisponible. Les fichiers et liens exigent `AIMS_REFERENCE_TOKEN_SECRET`; le format, la taille et la durée des fichiers sont contrôlés dans le navigateur avant tout envoi, tandis que la page Confidentialité centralise l’information sur les prestataires techniques.

## Commandes

```bash
pnpm dev
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm email:dev
HARVEST_LIVE_TESTS=1 pnpm test:harvest
HARVEST_AIMS_LIVE_TESTS=1 pnpm test:harvest:aims
HARVEST_AIMS_INDEX_AUDIT=1 pnpm audit:harvest:aims-index
HARVEST_MEMBER_MUTATION_TESTS=1 pnpm test:harvest:member
HARVEST_SHARING_MUTATION_TESTS=1 pnpm test:harvest:sharing
pnpm audit:youtube:clips
pnpm audit:harvest:gaps
```

La suite Harvest live standard est strictement en lecture. La suite membre exige `HARVEST_TEST_MEMBER_EMAIL` et `HARVEST_TEST_MEMBER_PASSWORD`; les collaborations utilisent en plus `HARVEST_TEST_RECIPIENT_EMAIL` et `HARVEST_TEST_RECIPIENT_PASSWORD`. Ces suites ne s’exécutent jamais en CI standard et nettoient les ressources qu’elles créent. L’inscription et le reset par e-mail nécessitent une boîte Gmail de test réauthentifiée et restent une validation Preview explicite.

## Architecture

- `src/lib/harvest/` : OAuth, service/guest/member tokens, client résilient, mappers, recherche, assets, session chiffrée et activités membre.
- `src/lib/composers/` : registre public canonique, alias civils/scéniques et relations collectives limitées à leurs albums validés.
- `src/lib/editorial/` : classification et présentation des vidéos YouTube ; les profils/relations historiques ne servent qu’à l’audit admin.
- `src/lib/youtube/` : inventaires vidéo officiels issus des playlists YouTube, sans repli vers un catalogue local.
- `src/app/api/` : BFF public de Parigo ; aucun secret Harvest n’est envoyé au navigateur.
- `src/app/` : catalogue, recherche, playlists, comptes et pages institutionnelles.
- `docs/harvest/` : rapport d’audit, inventaire d’endpoints, registre des écarts et smoke tests live.

Les données membre sont servies avec `Cache-Control: no-store`. Le catalogue et les référentiels utilisent des caches courts côté BFF. Les URLs audio Harvest restent directes afin de préserver les requêtes Range, le suivi d’audition et les droits du service.
