# CLAUDE.md

---

## ⚡ AUTO-START mgrep (à faire automatiquement)

**Dès que tu commences à travailler sur ce projet, lance cette commande en background :**

```bash
mgrep watch --store "parigo" &
```

> Lance cette commande UNE SEULE FOIS au début de la session. Ne la relance pas à chaque question.

---


Ce fichier fournit des instructions à Claude Code pour ce projet.

---

## mgrep - Assistant de recherche de code

**mgrep est l'outil principal pour explorer ce codebase.** Il retourne une réponse en langage naturel + les sources pertinentes.

### Store : `parigo`

### Lancer le watch (à faire à chaque ouverture du projet)

```bash
cd ~/Projets/parigo
mgrep watch --store "parigo"
```

> Garde ce terminal ouvert : il surveille les modifications en temps réel.

### Commande de recherche

```bash
mgrep "ta question en langage naturel" --store "parigo" -a -m <nombre>
```

### Paramètres

| Paramètre | Description |
|-----------|-------------|
| `--store "parigo"` | **Obligatoire** - le store indexé du projet |
| `-a` | Active la réponse en langage naturel |
| `-m <n>` | Nombre de résultats (minimum 10) |

### Ajuster `-m` selon la complexité

| Type de requête | `-m` recommandé |
|-----------------|-----------------|
| Question simple (1-2 fichiers) | 10 |
| Question moyenne (flow, feature) | 20-30 |
| Question complexe (debug, architecture) | 30-50 |

### Stratégie pour requêtes complexes

Lance plusieurs mgrep en parallèle plutôt qu'une seule requête surchargée :

```bash
mgrep "comment fonctionne le lecteur audio" --store "parigo" -a -m 20
mgrep "comment est généré le waveform" --store "parigo" -a -m 20
mgrep "comment fonctionne l'authentification" --store "parigo" -a -m 20
```

### Règles

- **OBLIGATOIRE** : Utilise mgrep pour TOUTE recherche de code. N'utilise JAMAIS grep, Grep tool, ou Glob.
- **Langage naturel** : Parle à mgrep comme à un collègue
  - ❌ `"audio player waveform howler"` (mots-clés)
  - ✅ `"Comment fonctionne le lecteur audio avec Howler.js ?"` (question naturelle)

---

## Subagents (Task tool)

**Les subagents n'héritent PAS des instructions de ce fichier.**

Quand tu lances un subagent, copie-colle cette section mgrep dans le prompt du subagent.

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

Quand tu lances un subagent, copie-colle les instructions mgrep dans son prompt.
