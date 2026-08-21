# Inventaire des modales et surfaces superposées

Cet inventaire distingue les cartes modales centrées des surfaces directionnelles ou ancrées. Toutes utilisent `role="dialog"` lorsque leur sémantique l’exige, mais leur mouvement ne doit pas être identique : une modale apparaît depuis le centre, tandis qu’un drawer, une sheet ou un popover doit conserver la direction de son point d’origine.

## Modales centrées — animation commune

L’animation est centralisée dans `src/hooks/use-parigo-modal-motion.ts`. Elle reprend le principe de `Modal2` : le backdrop se déploie horizontalement puis verticalement, avant l’apparition de la carte par mise à l’échelle et fondu. La fermeture inverse cette séquence. `prefers-reduced-motion` supprime les transformations et les délais.

| Famille | Implémentation | Emplacements | Statut |
|---|---|---|---|
| Authentification | `src/components/features/AuthModal.tsx` | Connexion et inscription ouvertes depuis le header, le footer ou une action membre protégée | Animation commune |
| Dialogues de compte | `src/components/ui/ParigoDialog.tsx` | Renommer/supprimer un tag, renommer/supprimer une playlist, supprimer une note privée | Animation commune |
| Création de playlist | `src/app/account/playlists/page.tsx` | Création de la première playlist ou d’une nouvelle playlist | Animation commune |
| Confidentialité | `src/components/privacy/CookiePreferencesModal.tsx` | Préférences détaillées de cookies, chargées uniquement à la première ouverture | Animation commune |

## Surfaces directionnelles — mouvement conservé

Ces composants ne reçoivent pas l’animation de carte centrée, car leur mouvement actuel communique leur ancrage spatial.

| Famille | Implémentation | Emplacements | Mouvement conservé |
|---|---|---|---|
| Bottom sheet de filtres | `src/components/ui/MobileFilterSheet.tsx` | Recherche et catalogue Albums sur mobile | Montée depuis le bas |
| Drawer de shortlist | `src/components/features/ShortlistDrawer.tsx` | Sélection de travail globale | Glissement depuis la droite |
| Menu principal | `src/components/layout/Header.tsx` | Navigation globale responsive | Déploiement sous le header |
| Détails de piste | `src/components/features/TrackRow.tsx` | Informations et notes d’une piste sur mobile | Sheet liée à la ligne |
| Actions de piste | `src/components/features/TrackRow.tsx` | Menu compact d’actions | Popover lié au déclencheur |
| Ajout à une playlist ou un tag | `src/components/ui/AnchoredPopover.tsx` | `AddToPlaylistButton` et `AddTagButton` | Popover ancré au bouton |
| Facettes catalogue | `src/components/catalog/CatalogFacetDropdown.tsx` | Filtres des index catalogue | Panneau ancré au champ |
| Menu utilisateur | `src/components/features/UserMenu.tsx` | Compte dans le header desktop | Panneau ancré au compte |

## Éléments exclus

- Le bandeau de consentement initial est une notification persistante, pas une modale.
- Le mini-player et le lecteur vidéo persistant sont des contrôles média, pas des dialogues.
- Les tooltips et contenus de consentement intégrés aux vidéos ne bloquent pas la page et ne relèvent pas de cette animation.
- Aucun `window.alert`, `window.confirm`, `window.prompt` ou élément HTML `<dialog>` natif n’est utilisé dans `src/`.
