# CLAUDE.md

---

## ⚡ AUTO-START grepai (à faire automatiquement)

**Dès que tu commences à travailler sur ce projet, lance cette commande en background :**

```bash
~/.local/bin/grepai watch &
```

> Lance cette commande UNE SEULE FOIS au début de la session. Ne la relance pas à chaque question.

---


Ce fichier fournit des instructions à Claude Code pour ce projet.

---

## grepai - Recherche sémantique de code (100% local et gratuit)

**grepai est l'outil principal pour explorer ce codebase.** Il utilise des embeddings locaux (Ollama) pour la recherche sémantique.


### Lancer le watch (à faire à chaque ouverture du projet)

```bash
cd ~/Projets/parigo
~/.local/bin/grepai watch
```

> Garde ce terminal ouvert : il surveille les modifications en temps réel.

### Commande de recherche

```bash
~/.local/bin/grepai search "ta question en langage naturel"
```

### Paramètres

| Paramètre | Description |
|-----------|-------------|

### Ajuster `-m` selon la complexité

| Type de requête | `-m` recommandé |
|-----------------|-----------------|
| Question simple (1-2 fichiers) | 10 |
| Question moyenne (flow, feature) | 20-30 |
| Question complexe (debug, architecture) | 30-50 |

### Stratégie pour requêtes complexes

Lance plusieurs grepai en parallèle plutôt qu'une seule requête surchargée :

```bash
~/.local/bin/grepai search "comment fonctionne le lecteur audio"
~/.local/bin/grepai search "comment est généré le waveform"
~/.local/bin/grepai search "comment fonctionne l'authentification"
```

### Règles

- **OBLIGATOIRE** : Utilise grepai pour TOUTE recherche de code. N'utilise JAMAIS grep, Grep tool, ou Glob.
- **Langage naturel** : Parle à grepai comme à un collègue
  - ❌ `"audio player waveform howler"` (mots-clés)
  - ✅ `"Comment fonctionne le lecteur audio avec Howler.js ?"` (question naturelle)

---

## Subagents (Task tool)

**Les subagents n'héritent PAS des instructions de ce fichier.**

Quand tu lances un subagent, copie-colle cette section grepai dans le prompt du subagent.

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

---

## Subagents

**Les subagents n'héritent PAS des instructions de ce fichier.**

Quand tu lances un subagent, copie-colle les instructions grepai dans son prompt.
