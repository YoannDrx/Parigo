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
- **Audio** : Howler.js + WaveSurfer.js
- **Animations** : Framer Motion
- **Package Manager** : pnpm

### Structure du projet

```
src/app/          # Pages et routes BFF Next.js App Router
src/lib/harvest/  # Client serveur, normalisation, sessions et domaine Harvest
docs/harvest/     # Audit, inventaire et smoke tests de l’API
```

## Imported Claude Cowork project instructions
