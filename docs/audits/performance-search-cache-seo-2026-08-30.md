# Audit Performance, Recherche, Cache et SEO — 30 août 2026

## Résumé exécutif

La priorité de ce lot est de corriger les régressions visibles sans étendre le périmètre de confiance autour de Harvest. Les gains les plus importants viennent du showreel de la Home, de la suppression des règles CSS d’équerres obsolètes et de la résolution des références de catalogue dans l’autocomplete. Les chantiers de cache plus larges restent conditionnés par une confirmation écrite de Harvest.

## Baseline mesurée avant correction

| Surface | Performance mobile | LCP | TBT | Transfert initial |
| --- | ---: | ---: | ---: | ---: |
| Home | 71/100 | 4,5 s | 370 ms | ~9,3 Mio |
| Search (`?q=PGO`) | 93/100 | 3,2 s | 10 ms | ~456 Kio |

- Bundle non compressé Home : environ 900 Kio.
- Bundle non compressé Search : environ 848 Kio.
- Showreel source : 61 679 184 octets, dont environ 6,1 Mio demandés pendant la mesure initiale.
- CSS source : 162 605 octets (159,0 Kio), au-dessus du budget CI de 157 Kio.
- Le score SEO réduit d’une Search filtrée est attendu : ces variantes exposent volontairement `noindex, follow`.

## Mesure de contrôle après correction

La configuration Lighthouse CI a été rejouée localement sur le build de production, en trois passages mobiles par route :

| Surface | Scores Performance | LCP | TBT | CLS | Résultat des budgets bloquants |
| --- | --- | --- | --- | --- | --- |
| Home | 82, 73, 73 | 4,67 s, 7,83 s, 7,83 s | 12–20 ms | 0 | LCP encore en échec ; TBT et CLS conformes |
| Albums | 81, 81, 86 | sous le seuil de 4,5 s | conforme | conforme | Conforme |
| Détail Album | 86, 88, 88 | sous le seuil de 4,5 s | conforme | conforme | Conforme |

Le test navigateur confirme parallèlement qu’aucun MP4 du showreel n’est demandé au chargement initial. Le reliquat Home ne doit pas être masqué : même si son meilleur passage progresse jusqu’à 82/100 et que la vidéo n’est plus sur le chemin initial, son LCP simulé reste 170 ms au-dessus du budget dans le meilleur échantillon et demeure un P0 de suivi. Les audits Lighthouse de la CI sont volontairement réservés à `main`; la PR exécute les smoke tests et contrats SEO sur Preview.

## Changements inclus

### Performance

- La vidéo showreel ne reçoit plus de source au premier rendu. Un `IntersectionObserver` l’active seulement lorsque la section arrive à moins d’un viewport.
- Le showreel desktop a été réencodé en H.264/AAC, `faststart`, 1440×760 : 30 218 204 octets (~29 Mio).
- Une source mobile 854×450, `faststart`, pèse 12 794 797 octets (~13 Mio).
- L’élément audio persistant utilise `preload="none"`.
- GradFlow est différé jusqu’à l’inactivité du navigateur. Il reste animé sur mobile et desktop lorsque WebGL est disponible ; `saveData` ou un appareil contraint reçoit une animation CSS légère. Seule la préférence explicite de réduction des animations produit un fond statique.
- Règle de non-régression : une optimisation de performance ne doit jamais supprimer toute animation du hero sur mobile.
- Les anciennes règles CSS liées aux angles décoratifs ont été retirées. Le validateur de budget mesure désormais 151,7 Kio, soit plus de 5 Kio sous le budget CI.

### Recherche

- `Prefix`, `Description`, `CDCode` et `LibraryName` sont demandés et conservés lorsqu’Harvest les fournit. L’endpoint live omettant actuellement certains de ces champs, le préfixe du label est aussi inféré de façon contrôlée depuis le `CDCode` des albums rattachés au même label.
- Une référence de label produit une preuve `catalogReference` et un sous-titre explicite (`Réf. PGO`, `Réf. PRTM`, etc.).
- Les recherches par référence utilisent l’index agrégé Harvest ; elles ne sont plus forcées dans le seul champ du titre public.
- Le panneau de suggestions est réactivé dans Search et reçoit les filtres courants (catégories, styles, labels, compositeur, BPM, durée, type et tri).
- Sélectionner un label vide la requête textuelle et applique son identifiant comme filtre. Les albums et pistes gardent leurs liens directs.

### SEO

- Les détails Talent exposent `Person` ou `MusicGroup` selon le type canonique du profil.
- Les pages détail Album, Label, Talent, Playlist, Clip et Synchronisation exposent `BreadcrumbList`.
- Le sitemap Albums n’utilise plus `releaseDate` comme repli de `lastmod`, ce qui évite de publier une date de modification future. En l’absence de date de modification fiable, `lastmod` est omis.
- Les canoniques, `hreflang`, sitemaps paginés, robots et règles `noindex` existantes restent inchangés.

## Cache Harvest : interprétation et politique proposée

Le message de Harvest est interprété comme une préférence opérationnelle et non comme une interdiction technique démontrée. Un cache peut leur poser problème lorsqu’il rend une disponibilité, un droit, une session ou une URL signée obsolète ; lorsqu’un proxy Parigo masque leur tracking média ; ou lorsqu’une expiration simultanée provoque un pic de requêtes. Harvest doit rester la source de vérité et les médias doivent continuer à utiliser leurs URLs directes et leurs Range requests.

| Donnée | Politique retenue |
| --- | --- |
| Authentification, compte, playlists privées, favoris, historique, téléchargements, contact | `private, no-store` |
| Tokens et URLs membre/signées | Mémoire serveur au plus jusqu’à expiration ; jamais de cache partagé |
| Recherche publique anonyme | TTL 30 s, `stale-while-revalidate` 120 s |
| Autocomplete public | TTL 60 s, `stale-while-revalidate` 300 s |
| Albums et listes publiques | 5 à 10 min |
| Labels, catégories, styles, taxonomies | Environ 1 h |
| Waveforms publiques versionnées | Long uniquement avec identité/version immuable |
| Fichiers médias Harvest | URL Harvest directe ; aucun miroir dans un CDN Parigo |

Questions à confirmer auprès de Harvest avant d’élargir le cache :

1. Quels TTL sont acceptés par type de ressource publique ?
2. Quelles réponses sont explicitement non cachables ?
3. Quelle est la durée de vie des URLs média et des URLs signées ?
4. Existe-t-il une invalidation, un webhook ou une version de ressource exploitable ?
5. Quelles contraintes de tracking interdisent un proxy ou un miroir média ?

Aucun message n’est envoyé à Harvest dans ce lot.

## Configuration Resend

- Le fournisseur de contact est sélectionnable avec `CONTACT_EMAIL_PROVIDER=resend|harvest` et utilise Resend par défaut pour le déploiement courant.
- Les variables d’expéditeur et de destinataire sont présentes dans Vercel pour Preview et Production.
- Le contrôle du 30 août 2026 a toutefois montré que les clés `RESEND_API_KEY` actuellement stockées dans ces deux environnements sont refusées par l’API Resend (`API key is invalid`). La vérification du domaine `yodev.fr` et le test réel d’envoi restent donc bloqués jusqu’au remplacement de cette clé, sans qu’aucun secret soit ajouté au dépôt.

## Partage Harvest et fermeture de compte

- Les liens courts restent créés par `getshorturl` et l’interface attend désormais la réponse avant d’autoriser la copie. Un échec expose clairement l’URL canonique de secours.
- `getsharemusicurl` crée le partage synchronisé et `sendsharemusiclinkemail` demande son envoi. Le code distingue désormais création du lien, demande d’envoi et livraison directe au compte.
- Les essais Harvest précédents ont reproduit un template contenant littéralement `[downloadlink]`. Une réponse `Code=OK` ne doit donc pas être présentée comme une confirmation de livraison correcte tant que ce défaut n’est pas corrigé.
- La fermeture de compte utilise volontairement `ArchiveOnly: true`. L’accès et la session sont supprimés pour l’utilisateur, tandis qu’un archivage fournisseur limite le risque d’effets de bord sur les relations de catalogue. La politique de confidentialité précise les possibilités de conservation et le droit de demander un examen ou un effacement complémentaire.

## Priorités suivantes

### P0 — à suivre dans cette PR

- Confirmer par Lighthouse médian (trois passages) que le MP4 n’est plus demandé au chargement initial et mesurer LCP, INP, CLS, TTFB, transfert et JavaScript exécuté.
- Conserver le budget CSS vert.
- Vérifier l’autocomplete `PGO`, la sélection du label et le résultat filtré sur Preview.

### P1 — prochain chantier ciblé

- Auditer les providers globaux et séparer les composants lourds Home/Search qui restent dans les chunks partagés.
- Généraliser le chargement différé des images sous la ligne de flottaison.
- Mesurer les requêtes Harvest par route, le taux de cache et les erreurs BFF.
- Réévaluer les durées React Query côté client après la réponse de Harvest.

### P2 — architecture différée

- Étudier une migration progressive vers Next Cache Components et une invalidation par tags après validation contractuelle de Harvest.
- Auditer le risque de cache croisé du thème : le layout lit cookies et headers alors que certaines réponses déclarent des directives CDN publiques.
- Ne jamais mélanger réponses sessionnelles et cache partagé.

## Critères de suivi

- Core Web Vitals : LCP, INP, CLS et TTFB.
- Octets transférés avant interaction et avant proximité du showreel.
- JavaScript initial et temps d’exécution du thread principal.
- Nombre de requêtes Harvest, taux de cache/hit, latence p50/p95 et erreurs par endpoint.
- Couverture SEO : canonique, `hreflang`, données structurées valides, sitemaps sans dates futures et absence d’indexation des combinaisons Search.
