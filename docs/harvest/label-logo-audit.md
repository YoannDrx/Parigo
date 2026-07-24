# Audit des logos de labels Harvest

Audit live effectué le 24 juillet 2026 sur les 99 bibliothèques renvoyées par `getlibraries`.

- Harvest renseigne `LibraryLogoUrl` pour 99 labels sur 99.
- Les volumes d’albums sont bien disponibles via les facettes `LibraryID` de la recherche Albums : 99 labels sur 99 ont au moins un album.
- Seuls 22 endpoints de logo renvoient actuellement une image non vide avec un type MIME `image/*`.
- Les 77 autres endpoints renvoient majoritairement HTTP 404, ou une réponse HTML vide. Une URL présente dans la réponse Harvest ne garantit donc pas qu’un logo a réellement été importé.

Le site ne reconstruit aucune URL. Il conserve uniquement les 22 ressources validées et affiche, pour les autres labels, un monogramme local déterministe. Cela évite 77 requêtes d’image en échec, les espaces vides et les erreurs répétées dans la console.

La liste validée est versionnée dans `src/content/label-logo-health.ts`. Elle doit être rafraîchie après l’ajout ou le remplacement de logos dans Harvest.
