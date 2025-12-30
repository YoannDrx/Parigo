# Parigo - Roadmap de Développement

## Statut Global
- [x] Sprint 1 - Foundation ✅
- [x] Sprint 2 - API + Data ✅
- [ ] Sprint 3 - Auth + User
- [ ] Sprint 4 - Pages
- [ ] Sprint 5 - Admin
- [ ] Sprint 6 - Features avancées

---

## Sprint 1 - Foundation ✅ COMPLETED

### Setup Backend
- [x] Setup NeonDB via CLI (projet: cold-star-94191393)
- [x] Installer dépendances (Prisma, Better Auth, Zod, React Query, Vercel Blob)
- [x] Créer schéma Prisma complet (26 tables)
- [x] Créer client Prisma singleton
- [x] Première migration

### Migration des Données
- [x] Copier seed-data de portfolio-caro vers parigo
- [x] Script de seed principal
- [x] Seed initial avec genres, moods, instruments
- [x] Import artistes (69)
- [x] Import labels (5)
- [x] Import albums (30)

---

## Sprint 2 - API + Data ✅ COMPLETED

### Intégration Spotify
- [x] Configuration API Spotify
- [x] Client Spotify (lib/spotify/client.ts)
- [x] Script fetch tracks depuis albums Spotify (scripts/spotify/fetch-tracks.ts)
- [ ] Exécuter fetch tracks (nécessite SPOTIFY_CLIENT_ID et SPOTIFY_CLIENT_SECRET)
- [ ] Génération waveforms

### API Routes Publiques ✅
- [x] GET /api/albums
- [x] GET /api/albums/[id]
- [x] GET /api/tracks (avec filtres avancés: query, genres, moods, instruments, bpm, duration, isVocal)
- [ ] GET /api/tracks/[id]
- [x] GET /api/search
- [x] GET /api/artists
- [x] GET /api/labels
- [x] GET /api/playlists
- [x] GET /api/genres
- [x] GET /api/moods
- [x] GET /api/instruments

### Client API & Hooks React Query ✅
- [x] Client API (lib/api-client.ts)
- [x] Hooks React Query (hooks/use-api.ts)
- [x] QueryProvider (components/providers/QueryProvider.tsx)

### Migration Frontend ✅
- [x] Remplacer mock-data par appels API
- [x] Mettre à jour page d'accueil (page.tsx)
- [x] Mettre à jour page albums (albums/page.tsx)
- [x] Mettre à jour page album détail (albums/[id]/page.tsx)
- [x] Mettre à jour page search (search/page.tsx)
- [x] Supprimer dépendance mock-data dans MiniPlayer

---

## Sprint 3 - Auth + User

### Authentification
- [ ] Configuration Better Auth
- [ ] API route auth/[...all]
- [ ] Middleware protection routes
- [ ] Page login
- [ ] Page register
- [ ] Page forgot-password
- [ ] Composant UserMenu

### Features User
- [ ] Store favoris (Zustand)
- [ ] API favoris (tracks, albums, playlists)
- [ ] Composant FavoriteButton
- [ ] Page account
- [ ] Page favorites

### Playlists Personnelles
- [ ] API user playlists
- [ ] Modal création playlist
- [ ] Modal ajout à playlist
- [ ] Page mes playlists

---

## Sprint 4 - Pages

### Pages Labels
- [ ] Page liste labels (/labels)
- [ ] Page détail label (/labels/[id])
- [ ] Composant LabelCard

### Pages Artists
- [ ] Page liste artistes (/artists)
- [ ] Page détail artiste (/artists/[id])
- [ ] Composant ArtistCard
- [ ] Composant ArtistLinks

### Pages Playlists
- [ ] Page liste playlists (/playlists)
- [ ] Page détail playlist (/playlists/[id])

### Historique
- [ ] API historique écoute
- [ ] Intégration dans player-store
- [ ] Page historique

---

## Sprint 5 - Admin

### Layout Admin
- [ ] Layout admin avec sidebar
- [ ] Dashboard avec stats
- [ ] Protection route admin

### CRUD Albums
- [ ] Page liste albums
- [ ] Formulaire album
- [ ] Page création
- [ ] Page édition

### CRUD Tracks
- [ ] Page liste tracks
- [ ] Formulaire track
- [ ] Page édition

### CRUD Artists/Labels
- [ ] Pages artists admin
- [ ] Pages labels admin
- [ ] Formulaires

### Gestion Users
- [ ] Page liste users
- [ ] Modification rôles

---

## Sprint 6 - Features avancées

### Licences & Téléchargement
- [ ] Page licences (info)
- [ ] Modal téléchargement
- [ ] API download
- [ ] Génération preview watermarké
- [ ] Page mes téléchargements

### Améliorations Player
- [ ] Mode repeat (off, track, queue)
- [ ] Mode shuffle
- [ ] Panel queue
- [ ] Drag & drop queue
- [ ] Bouton like dans player

### Polish
- [ ] Tests E2E
- [ ] Optimisation performances
- [ ] SEO
- [ ] Analytics

---

## Notes Techniques

### Variables d'environnement requises
```env
DATABASE_URL=
DIRECT_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
BLOB_READ_WRITE_TOKEN=
```

### Commandes utiles
```bash
# Database
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma studio
pnpm tsx scripts/db/seed.ts

# Spotify tracks import
pnpm tsx scripts/spotify/fetch-tracks.ts

# Dev
pnpm dev
pnpm build
pnpm lint
```
