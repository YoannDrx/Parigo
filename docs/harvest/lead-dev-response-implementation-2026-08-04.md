# Réponse Harvest du 4 août 2026 — audit et mise en œuvre

## Résultat exécutif

Les réponses de Peter Gray ont conduit à six correctifs de contrat et à trois retraits de fonctionnalités non fiables. Les contrats newsletter et notes privées sont maintenant conformes et vérifiés contre l'API live. Le body du reset de mot de passe est corrigé, mais Harvest répond encore `Failed` avec `Required route not found` sur le compte Parigo; l'UI ne prétend donc plus qu'un e-mail a été envoyé. Le nouveau contrat de partage est implémenté, mais le compte Harvest Parigo n'a pas non plus la route de partage requise : l'API répond `Error.Code=3` avec `No route configuration found`. Le partage est protégé par un feature flag serveur, désactivé par défaut, et absent de l'UI actuelle.

Les favoris d'album, l'archivage de playlist et le statut de téléchargement groupé ne sont plus exposés. Cette décision évite respectivement la suppression involontaire de favoris piste, la création d'archives impossibles à retrouver et l'acceptation d'identifiants de jobs dont Parigo ne maîtrise pas la provenance.

Une investigation complémentaire a comparé l'ancien site FLEX, la nouvelle application en local, le déploiement Vercel et l'API Harvest directe. Elle démontre que le domaine appelant n'est pas la cause des deux erreurs de route : les en-têtes simulant local, Preview et `www.parigomusic.com` donnent les mêmes refus. L'ancien coordinateur FLEX continue en revanche de générer ses propres liens avec succès. Cela prouve que les deux parcours et leurs accès effectifs diffèrent; cela ne permet pas encore d'affirmer si la configuration manquante est attachée au compte, à l'Access Key, au service Public API ou au coordinateur FLEX. Ce périmètre exact doit être confirmé par Harvest.

## Décisions par réponse Harvest

| Sujet | Réponse Harvest confirmée | État Parigo avant | Décision mise en œuvre | Vérification |
| --- | --- | --- | --- | --- |
| Suggestions de playlist | `SeedDetermination` doit être `Random`; la fonctionnalité dépend d'un fournisseur AIMS/Cyanite/Harmix configuré | Seed `Created_Desc`; bouton toujours visible | Seed `Random`; capacité dérivée de `SearchSimilarInfo`; bouton et panneau absents si la liste est vide | `getserviceinfo` live renvoie une liste vide; UI desktop/mobile sans bouton |
| Notes privées | Création : `trackid`, `tagname`; modification : `tagid`, `trackid`, `tagname` | Casse mixte et absence de `trackid` à l'update | Payloads canoniques exacts | Cycle live create → update → delete, avec relecture après chaque mutation et nettoyage |
| Newsletter | La source relue est `Member.SubscribeNewsletter`; les écritures utilisent `Subscribe` | Lecture de `Subscribe`, donc faux `false`; risque d'écrasement lors d'une mise à jour de profil | Schéma enrichi, priorité à `SubscribeNewsletter`, retrait de `Subscribe` des mises à jour générales; consentement modifié uniquement par `membersubscribe` | Mise à jour de profil sans changement du consentement; bascule newsletter puis restauration live |
| Mot de passe oublié | Body canonique : `{ Username: "", Email }` | `ExternalResetToken` vide envoyé en plus | Champ legacy supprimé; échec amont journalisé; l'UI distingue une route Harvest non configurée sans révéler l'existence d'un compte | Harvest répond encore `Failed — Required route not found`; aucun envoi ne doit être annoncé |
| Partage de playlist | Plus de `getinvitedmembertoken`; `getsharemusicurl` reçoit `Users[]` avec type membre ou invité | Ancien parcours à deux appels et payload `ToMemberToken` | Nouveau payload; validation de l'e-mail pour choisir `MemberAccount` ou `GuestMemberAccount`; partage `Sync` uniquement | Payload live accepté syntaxiquement mais refusé fonctionnellement : `No route configuration found`; feature flag désactivé |
| Favoris d'album | Harvest ne conserve que des favoris piste et ne peut pas distinguer leur provenance | Album reconstruit par regroupement; retrait de toutes ses pistes | Suppression du type album dans le store, les routes, les cartes, le détail album et la page Favoris | Page live limitée aux pistes; aucune action album; ancienne route en 404 |
| Archivage de playlist | Aucun endpoint ne liste les archives; Harvest recommande de retirer la fonctionnalité | Route BFF callable malgré l'absence d'UI de restauration | Route et fonction serveur supprimées | Ancienne route en 404 |
| Téléchargements groupés | `getmusicdownloadinfo` ne sert que lorsque Harvest redirige ses e-mails vers le site et fournit un `DownloadID`/`DownloadGroupID`; ce réglage est global et affecterait FLEX | Route acceptant un identifiant fourni par le client sans provenance vérifiable | Route et builder supprimés; segment `status` réservé pour éviter qu'il soit capturé comme `[token]` | Ancienne route en 404; téléchargement direct par token conservé |
| Compteurs de tags | Pas de correction annoncée | Comptages recalculés par lecture détaillée | Contournement conservé | Aucun changement |
| Recherches sauvegardées | Pas de contrat de replay fourni | URL Parigo stockée dans `Description` | Contournement conservé | Aucun changement |
| Dossiers de playlists | Pas de réponse corrective fournie | Fusion de deux réponses Harvest | Contournement conservé | Aucun changement |
| Contact | `sendcontactusemail` existe, mais ne fournit ni stockage ni interface d'administration | Formulaire Parigo/Resend opérationnel | Pas de migration : le système interne reste plus observable et maîtrisable | Aucun changement |
| E-mails Harvest | Les templates sont modifiables dans Harvest Admin via support | Templates hors dépôt Parigo | Action organisationnelle à mener avec `support@harvest.music` | Hors code |
| CMS | Web Content expose du contenu simple; Harvest Flex utilisait Sanity pour un vrai CMS | Contenu éditorial versionné localement | Ne pas considérer Public API Web Content comme remplacement d'un CMS éditorial structuré | Hors code |

## Architecture de capacité retenue

La page de détail d'une playlist reçoit maintenant deux capacités serveur :

- `playlistSuggestions` vaut `true` seulement si `SearchSimilarInfo` contient un fournisseur;
- `playlistSharing` vaut `true` seulement si `HARVEST_PLAYLIST_SHARING_ENABLED=1`.

Le flag de partage doit rester à `0` tant que Harvest n'a pas configuré et validé la route de partage du compte Parigo. La route POST applique la même garde que l'UI : masquer le bouton ne constitue pas la seule protection.

## Vérification du rôle du domaine et coexistence FLEX

### Reset de mot de passe

- Le formulaire public FLEX de `www.parigomusic.com` transmet au coordinateur FLEX `{ email, link: "https://www.parigomusic.com" }` et répond `Email sent`.
- Le bundle FLEX confirme que cette base n'est pas codée en dur : le payload utilise exactement `link: location.protocol + "//" + location.host`, donc l'origine courante du navigateur.
- L'e-mail a bien été reçu dans la boîte membre de test. Son lien historique suit la forme `https://www.parigomusic.com/change-password/{token}`.
- Un test supplémentaire a conservé la requête FLEX réelle en ne remplaçant que `link` par `http://localhost:3100`. Le coordinateur a répondu HTTP 200 / `Email sent`; un nouvel e-mail est arrivé avec l'URL exacte `http://localhost:3100/change-password/{token}`.
- Ce token a été ouvert dans Chromium depuis le lien localhost : redirection vers `/reset-password?token={token}`, formulaire valide, soumission réussie, affichage de `Mot de passe modifié — se connecter`, puis authentification réussie avec le mot de passe initial. Une seconde ouverture du token affiche bien le lien invalide ou expiré. Le mot de passe du compte est donc resté inchangé et le token a été consommé.
- Le même endpoint Harvest direct `sendpasswordresetemail`, avec le body canonique fourni par Peter, a été appelé quatre fois : sans origine navigateur, avec `localhost`, avec `parigo-ten.vercel.app` et avec `www.parigomusic.com`. Les quatre réponses sont identiques : `Required route not found`.
- Le déploiement du nouveau BFF sous `www.parigomusic.com` ne peut donc pas, à lui seul, corriger l'envoi direct.
- Pour préserver les e-mails déjà émis lors de la migration, Parigo accepte maintenant aussi `/change-password/{token}` et le redirige vers le parcours `/reset-password?token={token}`.
- Le vrai token reçu via FLEX a été validé sur l'API locale et sur Vercel Preview : HTTP 200 sur les deux origines. Chromium a affiché un formulaire valide sur le site FLEX actuel, l'alias local `/change-password/{token}` et la Preview `/reset-password?token={token}`.
- Un cycle complet et réversible a ensuite été exécuté dans Chromium via l'alias local : soumission d'un mot de passe temporaire, réponse POST 200 et affichage de `Mot de passe modifié — se connecter`. L'ancien mot de passe a alors été refusé en 401 et le temporaire accepté en 200.
- Une seconde demande a été déclenchée depuis l'interface FLEX de production. Le deuxième e-mail est arrivé dans Gmail, son token a été consommé depuis l'interface locale pour restaurer le mot de passe initial, puis l'état final a été contrôlé : mot de passe initial accepté en 200, temporaire refusé en 401 et les deux tokens consommés répondent désormais `Failed — Invalid token`.
- Le token reset est donc portable entre origines pour sa validation **et pour sa consommation**. Le rattachement de `www.parigomusic.com` à Vercel n'est pas un prérequis technique au fonctionnement local ou Preview; il servira à faire arriver le lien reçu sur la nouvelle application une fois le DNS basculé.
- À l'inverse, l'envoi Public API direct reste indisponible. Le body canonique a été rejoué sans `Origin`, avec local, Preview et production : quatre HTTP 200 contenant `Failed — Required route not found`, et aucun nouvel e-mail dans Gmail. Le domaine navigateur ne débloque donc pas cette route.

### Partage de playlist

- Sur une même playlist temporaire, le contrat Public API direct `Users[]` a été testé en version invité et membre, sans `Origin`, avec local, Preview et production. Les huit combinaisons renvoient exactement `Error.Code=3 — No route configuration found`, sans URL.
- Le parcours FLEX historique à deux étapes crée au contraire un lien avec succès. La forme observée est actuellement `http://www.parigomusic.com/engage-playlist/{token}` : Harvest doit la migrer en HTTPS.
- Le token legacy a été ouvert dans Chromium sur l'ancien site FLEX, en local et sur Vercel Preview. FLEX affiche la playlist; les deux nouvelles surfaces affichent `Playlist partagée indisponible`.
- L'inspection réseau explique cette différence : FLEX lit le partage via le coordinateur privé `flex-coordinator-api-prod.../user-playlists/load-shared/{playlistId}`, avec ses propres en-têtes d'autorisation et de région. La nouvelle application utilise l'endpoint Public API documenté `/getsharemusic/{memberToken}/{accessToken}`. Le token FLEX essayé avec un guest token Public API, le token invité historique et le token membre expéditeur est refusé en HTTP 400 dans les trois cas.
- Le lecteur direct Parigo ne doit donc pas être déclaré rétrocompatible avec les anciens tokens FLEX. Il faut demander à Harvest un contrat Public API de lecture réellement compatible, ou une stratégie de migration/proxy des liens existants avant la bascule du domaine. Il ne serait pas prudent de brancher la nouvelle application sur l'API privée du coordinateur FLEX sans engagement de stabilité de Harvest.
- Le formulaire de partage activé temporairement par feature flag a été contrôlé en Chromium desktop et mobile : bouton, panneau, permissions et absence de débordement sont cohérents. Quand la route manque, l'erreur amont anglaise est actuellement visible dans le panneau. Le flag restant désactivé par défaut, cette surface n'est pas exposée en production; avant activation, l'erreur devra être remappée en français et en message utilisateur.
- `sendsharemusiclinkemail` a également été testé avec une URL FLEX valide et la boîte membre comme destinataire. Harvest répond `Code=OK` et l'e-mail est bien reçu. Cependant, dans les deux variantes `SelectEmailTemplateByMemberRegion=true` et `false`, le message contient littéralement `[downloadlink]` et aucun lien cliquable. Le message personnalisé est injecté, mais pas le lien. L'envoi de partage est donc inutilisable même indépendamment de la création d'URL, et le template ou le placeholder doit être corrigé par Harvest/support.
- Toutes les playlists temporaires créées pour ces comparaisons ont été supprimées et leur absence a été relue.

## Effets fonctionnels et risques éliminés

1. Une simple sauvegarde de profil ne peut plus désabonner silencieusement un membre.
2. Une piste favorite individuellement ne peut plus être supprimée par le retrait synthétique de son album.
3. Un utilisateur ne peut plus archiver une playlist qu'il serait ensuite incapable de retrouver.
4. Un identifiant arbitraire ne peut plus être soumis comme job de téléchargement groupé.
5. Les fonctionnalités AIMS et partage indisponibles ne produisent plus de boutons morts dans l'interface.
6. Le contrat de partage reste prêt à être activé sans réécriture quand Harvest aura configuré la route manquante.

## Vérifications réalisées

### Local

- 40 fichiers Vitest, 194 tests : succès.
- TypeScript `tsc --noEmit` : succès.
- ESLint : succès sans erreur.
- Build Next.js 16 production : succès; 78 pages générées et routes supprimées absentes du manifeste.

### Navigateur

- Playwright Chromium desktop 1440×900 et mobile 390×844.
- Huit parcours ciblés : favoris piste, suggestions activées, capacités désactivées, partage synchronisé mocké et reset indisponible; 8/8 succès sur les deux viewports.
- Revalidation finale ciblée des correctifs reset/partage : 8/8 scénarios Playwright réussis (4 scénarios × desktop/mobile), couvrant partage activé mocké, capacités masquées, indisponibilité du reset et alias FLEX `change-password`.
- Inspection visuelle supplémentaire avec une vraie session Harvest : page Favoris sans onglet album; page playlist sans partage ni suggestion lorsque les capacités sont absentes; actions restantes et mise en page cohérentes sur desktop et mobile.
- Comparaison réelle d'un lien de partage FLEX : succès visuel sur le site FLEX; indisponibilité cohérente mais non rétrocompatible sur local et Vercel Preview.
- Validation et consommation réelles de deux tokens reset FLEX depuis local, avec changement puis restauration du mot de passe et vérification des authentifications avant/après.
- Validation supplémentaire du callback dynamique FLEX : envoi réel avec `link: http://localhost:3100`, réception du lien local dans Gmail, consommation dans Chromium, état de succès contrôlé visuellement, authentification finale réussie et non-réutilisabilité du token vérifiée.
- Une campagne Playwright globale a aussi été lancée : 41 scénarios ont réussi avant interruption, un scénario catalogue album indépendant a expiré après 120 secondes et un scénario réservé au mobile a été ignoré sur desktop. Cette campagne n'est donc pas comptée comme une suite globale réussie; le timeout album devra être diagnostiqué séparément si l'objectif est de certifier les 262 tests E2E du dépôt.

### API Harvest live

- Profil relu avec `SubscribeNewsletter`.
- Mise à jour du prénom à valeur identique : abonnement inchangé.
- Abonnement basculé, relu, puis restauré à sa valeur initiale.
- Trois resets FLEX complets reçus dans Gmail et consommés, dont un généré explicitement avec une base localhost; mot de passe initial restauré et validé en état final.
- Reset Public API demandé avec le body corrigé sur quatre origines : HTTP 200 mais erreur logique Harvest `Failed — Required route not found`; zéro e-mail supplémentaire reçu.
- Playlist temporaire créée avec une piste puis supprimée.
- Note privée temporaire créée, modifiée, relue et supprimée.
- Nouveau partage invité et membre exécuté sur quatre origines sans envoi d'e-mail : huit refus identiques `No route configuration found`.
- Partage historique FLEX créé et lu avec succès sur FLEX; incompatibilité confirmée avec le lecteur Public API de la nouvelle application.
- Deux e-mails de partage réellement reçus après `Code=OK`, mais tous deux dépourvus de lien à cause du placeholder littéral `[downloadlink]`.
- Vérification finale : aucune playlist temporaire préfixée `Codex Harvest contract` ou `Codex deep` restante.

## Actions externes restantes

1. Demander à Harvest d'identifier le périmètre exact de la configuration manquante pour `getsharemusicurl` (compte, Access Key, service Public API ou coordinateur), puis de configurer une route HTTPS `https://www.parigomusic.com/engage-playlist/{token}`. Demander en même temps le contrat Public API de lecture ou la stratégie de migration des tokens FLEX, puisque FLEX utilise actuellement son API privée `user-playlists/load-shared`. Refaire ensuite un cycle invité et membre avant de passer `HARVEST_PLAYLIST_SHARING_ENABLED=1`.
2. Demander à Harvest l'équivalent Public API supporté du champ FLEX `link`, qui permet de choisir dynamiquement la base du lien de reset. Si cette valeur ne peut pas être fournie par requête, demander l'activation de `sendpasswordresetemail` et la configuration simultanée des URL autorisées pour localhost, Vercel Preview et production. La cible peut être `/change-password/{token}` ou `/reset-password/{token}` car la nouvelle application accepte désormais les deux. Confirmer explicitement que ces environnements peuvent coexister sans altérer FLEX, puis refaire une demande Public API et vérifier Gmail; l'envoi FLEX vers localhost ainsi que la validation et la consommation locales sont déjà certifiés.
3. Contacter le support Harvest pour obtenir l'accès aux templates et signaler le défaut reproductible de l'e-mail de partage : `Code=OK`, e-mail reçu, mais `[downloadlink]` non remplacé avec `SelectEmailTemplateByMemberRegion` à `true` comme à `false`. Demander le placeholder canonique, la correction du template et un test d'envoi contenant un lien HTTPS réellement cliquable.
4. Ne pas activer le retour des téléchargements par e-mail vers le site tant que l'impact sur FLEX et le parcours complet `DownloadID`/`DownloadGroupID` ne sont pas validés conjointement.
5. Ne réactiver les suggestions que lorsque `SearchSimilarInfo` publie réellement un fournisseur et qu'un test de pertinence a été conduit.
