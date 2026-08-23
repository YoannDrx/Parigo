# AGENTS.md

Ce fichier fournit des instructions à Codex pour ce projet.

---

## A propos du projet

**Parigo** - Application audio avec lecteur et waveform.

## Commandes de développement

```bash
pnpm dev          # Serveur de développement
pnpm build        # Compilation production
pnpm start        # Serveur production
pnpm lint         # ESLint
pnpm test         # Tests unitaires et contrats locaux
pnpm test:e2e     # Parcours Playwright desktop et mobile
pnpm test:harvest # Contrats Harvest live (avec HARVEST_LIVE_TESTS=1)
```

---

## Architecture

### Stack technique

- **Framework** : Next.js 16 avec App Router
- **Langage** : TypeScript
- **Styling** : TailwindCSS v4
- **Données** : Public API Harvest via un BFF Next.js, sans base de données
- **Authentification** : comptes Harvest et cookie de session chiffré côté serveur
- **Audio** : WaveSurfer.js et APIs audio natives du navigateur
- **Animations** : Framer Motion
- **Package Manager** : pnpm

### Structure du projet

```
src/app/          # Pages et routes BFF Next.js App Router
src/lib/harvest/  # Client serveur, normalisation, sessions et domaine Harvest
docs/harvest/     # Audit, inventaire et smoke tests de l’API
```

## Imported Claude Cowork project instructions

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
