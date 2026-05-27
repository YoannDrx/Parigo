# AGENTS.md

Ce fichier fournit des instructions à Codex pour ce projet.

---

## grepai - OBLIGATOIRE

**Tu DOIS utiliser les commandes CLI grepai pour TOUTE recherche de code.**

- ❌ INTERDIT : Grep, Glob, grep, find, rg, outils MCP grepai
- ✅ OBLIGATOIRE : `grepai search "query"` via Bash

Voir `~/.Codex/AGENTS.md` pour les instructions complètes.

---

## A propos du projet

**Parigo** - Application audio avec lecteur et waveform.

## Commandes de développement

```bash
pnpm dev          # Serveur de développement
pnpm build        # Compilation production
pnpm start        # Serveur production
pnpm lint         # ESLint
```

### Base de données

```bash
pnpm db:generate  # Générer Prisma client
pnpm db:migrate   # Créer une migration
pnpm db:push      # Push le schema
pnpm db:seed      # Seeder la base
pnpm db:studio    # Ouvrir Prisma Studio
```

---

## Architecture

### Stack technique

- **Framework** : Next.js 16 avec App Router
- **Langage** : TypeScript
- **Styling** : TailwindCSS v4
- **Base de données** : PostgreSQL avec Prisma
- **Authentification** : Better Auth
- **Audio** : Howler.js + WaveSurfer.js
- **Animations** : Framer Motion
- **Package Manager** : pnpm

### Structure du projet

```
app/           # Pages Next.js App Router
prisma/        # Schema et migrations
scripts/       # Scripts utilitaires (seed, reset)
```

## Imported Claude Cowork project instructions
