# Vérification de la réponse Harvest du 10 août 2026

## Résultat

Les capacités de partage décrites par Peter sont maintenant intégrées dans le BFF et dans l’interface Parigo. Les tests live utilisent deux comptes Harvest distincts et les mutations temporaires ont été nettoyées.

| Parcours | API live | Navigateur local | Vercel actuel | Observation |
| --- | --- | --- | --- | --- |
| Reset password | HTTP 200, e-mail reçu | Token validé, formulaire affiché | Token validé, formulaire affiché | L’e-mail pointe vers `http://www.parigomusic.com/change-password/{token}`. |
| Lien de playlist | Création, lecture et e-mail validés | Playlist et état vide affichés correctement | Ancien écran « indisponible » | Le correctif de mapping n’est pas encore déployé sur Vercel. |
| Copie | `AsCopy` matérialise une nouvelle playlist | Actions et confirmation couvertes | À retester après déploiement | La copie temporaire a été supprimée. |
| Collaboration | `AsCollaboration` matérialise une playlist synchronisée | Actions couvertes | À retester après déploiement | La suppression de la source retire la collaboration temporaire. |
| Livraison directe | Playlist ajoutée sans approbation et sans e-mail | Mode présent dans l’UI | À retester après déploiement | Contrat `Sync` + `AllowCollaboration=true`. |
| Dossier partagé | URL et e-mail créés, contenu lu | Route et contenu du dossier affichés | 404 sur le déploiement actuel | La nouvelle route doit être déployée. |
| Contact | HTTP 200 transport, `Code=4` fonctionnel | Envoi réel : BFF 502 et message de repli visibles | Non déployé | Le formulaire appelle bien Harvest; aucun e-mail reçu. |

## Écarts de contrat corrigés côté Parigo

- `getsharemusicurl` place `Status` et `Url` dans `ShareMusic[]`, et non à la racine.
- `getsharemusic` renvoie une playlist seule directement dans `ReferredPlaylistObject`, alors qu’un dossier contient `ReferredPlaylistObject.Playlists[]`.
- Les routes publiques de token sont expurgées des logs, analytics et événements d’erreur.
- Une playlist partagée sans piste reste un partage valide et affiche maintenant un état vide explicite.

## Configuration Harvest encore nécessaire

1. Les URLs générées et celles reçues par e-mail sont en `http://`. Les quatre routes doivent être en `https://`.
2. Une seule origine active suffit : demander temporairement `parigo-ten.vercel.app` après déploiement, puis `www.parigomusic.com` au basculement. Localhost a déjà été validé par substitution manuelle et n’a pas besoin d’être configuré chez Harvest.
3. `sendcontactusemail` doit être réparé/configuré : le payload minimal confirmé renvoie `Code=4`.
4. Le domaine From `parigomusic.com` doit être authentifié dans le SendGrid de Harvest pour supprimer `via harvestmedia.net`; Harvest doit fournir les CNAME exacts.

## Commandes de preuve

```bash
pnpm test:harvest:sharing
pnpm test
pnpm test:e2e
pnpm build
```

Le smoke test live de partage requiert aussi `HARVEST_SHARING_MUTATION_TESTS=1`. Il crée uniquement des playlists temporaires, exerce les trois modes, le reset, puis nettoie les deux comptes.
