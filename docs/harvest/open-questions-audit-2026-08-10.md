# Audit final des réponses et écarts Harvest

Date : **10 août 2026**.

Périmètre vérifié : fils d’e-mails Harvest dans Gmail, documentation Public API archivée, implémentation BFF, appels live, mutations réversibles, interface locale authentifiée, Preview Vercel, messages reçus et DNS public.

## Conclusion exécutive

Le précédent diagnostic contenait une erreur dans le script de test des tags : il cherchait `Tracks` alors que cet endpoint live renvoie `tracks`. Le BFF Parigo est déjà insensible à la casse et n’était pas affecté. Après correction et nouveau test contrôlé :

- les associations de tags fonctionnent dans les deux sens; seul `ReturnTagCount=1` reste faux côté Harvest;
- la hiérarchie des playlists est complète et notre fusion BFF est la bonne adaptation;
- la relance de recherche sauvegardée fonctionne avec l’URL canonique Parigo;
- la personnalisation HTML/CSS et le CTA sont reportés et retirés des demandes actives;
- le point « contient / commence par / égal à » n’a pas reçu de réponse : Roland avait répondu à la recherche multilingue, pas aux opérateurs de titre;
- l’historique de communications n’est pas amputé par notre BFF, mais le contrat Harvest est limité et n’inclut pas le partage pourtant reçu dans Gmail;
- `via harvestmedia.net` vient d’un défaut d’alignement du domaine d’envoi SendGrid, pas du template;
- le contact utilise bien Harvest de bout en bout, mais reste bloqué par `Code=4` côté fournisseur.

Le registre actionnable est [gaps-and-requests.md](./gaps-and-requests.md) et le mail prêt à envoyer est [email-draft-peter-2026-08-10.md](./email-draft-peter-2026-08-10.md).

## 1. Les cinq anciens écarts non bloquants

### Tags et compteurs — défaut Harvest circonscrit

Appels live après correction du test :

| Source | Résultat |
| --- | --- |
| `getmembertags?ReturnTagCount=1` | trois tags, `TrackCount=0` pour chacun |
| `getmembertagtracks` | respectivement 1, 4 et 1 piste |
| UI `/account/tags` | les deux tags publics affichent 4 et 1 et leurs pistes sont visibles |
| mutation temporaire | `addtomembertags` sans erreur; association visible immédiatement par `getmembertagsbytrack` **et** `getmembertagtracks`; `TrackCount` reste 0; tag supprimé ensuite |

Responsabilité : **Harvest** pour le compteur agrégé. La relation, notre parsing et l’UI fonctionnent. Le BFF contourne déjà le défaut en appelant le détail de chaque tag, au prix d’un N+1 réseau. Il faut demander uniquement si `ReturnTagCount=1` peut être corrigé; il ne faut plus parler d’association non persistée ni de délai de 30 secondes.

### Recherche sauvegardée — solution Parigo suffisante

`searchmembersavesearches` renvoie un `SearchParameters` de forme réponse/historique (`PreviousSearchTermBundles`, `resultview`, clés en casse hétérogène), pas un body `cloudsearch` documenté prêt à être renvoyé tel quel.

Parigo enregistre volontairement l’URL applicative canonique dans `Description` sous `PARIGO_URL:`. Test navigateur authentifié : le bouton **Relancer** de la recherche `Horreur` avait pour `href` `/search?q=Horreur&view=tracks&type=main` et a navigué exactement vers cette URL. Les filtres, la vue et le type sont donc reproductibles dans notre propre produit.

Responsabilité : **Parigo**, déjà traitée. Un replay Harvest natif ne serait utile que pour importer des recherches créées par un autre client. Ce n’est pas nécessaire au lancement et la question est retirée du mail.

### Opérateurs de titre — question Harvest réellement sans réponse

Le BFF utilise `St_Keyword.Fields=TrackDisplayTitle`, donc les faux positifs ne viennent pas d’une recherche agrégée sur les commentaires ou mots-clés.

Pour `piano` :

- `ExactPhrase=false, Wildcard=false` : 1 478 résultats;
- `ExactPhrase=false, Wildcard=true` : 1 489;
- `ExactPhrase=true, Wildcard=false` : 1 478;
- `ExactPhrase=true, Wildcard=true` : 1 478.

Les résultats incluent `Piano Minuet`, `Silent Film Piano_Main`, `The Parting Piano`, `Winter Piano`, etc. Les cinq premiers résultats API sont bien visibles dans l’UI. Ces drapeaux règlent l’expression et l’extension lexicale, mais ne donnent pas un préfixe de champ ni une égalité stricte de champ.

Dans son message du 4 août, Peter a écrit que Roland avait répondu « above ». Le message de Roland du 31 juillet répond uniquement que Harvest n’offre pas de recherche multilingue et propose les keyword groups pour les synonymes. Il ne répond pas aux trois opérateurs de titre. La question doit donc être reposée, avec cette distinction factuelle.

### Catégorie de playlist — composition BFF correcte

Test live :

- `getmemberplaylistsnotracks` retourne 5 playlists et aucune clé `PlaylistCategoryID`;
- `getmemberplaylistcategoriesandplaylists` contient les mêmes 5 identifiants, dont 2 sous le dossier `test`;
- aucune playlist plate n’est absente de la hiérarchie;
- le BFF fusionne par ID et l’UI affiche 3 playlists sans dossier, 2 dans `test`;
- chaque sélecteur « Déplacer dans » affiche la valeur attendue.

Responsabilité : **Parigo**, déjà traitée. La hiérarchie est l’endpoint complet prévu pour ce besoin; la fusion avec la liste plate conserve les métadonnées les plus riches. L’absence du champ dans la vue plate est une caractéristique de contrat, pas un dysfonctionnement visible. La question est retirée du mail.

### CTA HTML/CSS — chantier reporté

Le support a confirmé les capacités et le test live a été restauré à l’état initial. Par décision produit, aucun travail ni aucune demande supplémentaire n’est nécessaire maintenant. Le sujet `[link]`/URL brute sort du registre actif.

## 2. Domaines de reset et partage

### Ce qui est prouvé

- Harvest génère actuellement `http://www.parigomusic.com/change-password/{token}` et les routes de partage sur la même origine.
- Un token reçu fonctionne quand seule l’origine est remplacée par `http://127.0.0.1:3000` ou la Preview Vercel.
- État public du 10 août avec token factice :
  - `http://www.parigomusic.com/change-password/...` redirige en 308 vers HTTPS;
  - `https://parigo-ten.vercel.app/change-password/...` redirige vers l’ancien écran `/reset-password?token=...`;
  - `/engage-playlist/...` répond 200 sur la Preview;
  - `/shared-playlistcategory/...` répond encore 404 sur la Preview, car les derniers changements ne sont pas déployés.

### Recommandation

Le domaine de production ayant déjà validé le comportement fonctionnel, ce point n’est plus un risque de lancement. Il reste toutefois utile pour la vitesse de développement. FLEX envoie une base URL dynamique dans chaque appel à `/sendResetToken`; un test avec `link: http://localhost:3000` a bien produit un e-mail local dont le token a été validé puis consommé par la nouvelle application.

Peter a confirmé une configuration serveur par clé pour la Public API, mais n’a pas répondu explicitement sur un paramètre par requête. La question précise est donc légitime : existe-t-il un équivalent optionnel au `link` FLEX? Si non, le plan de repli est simple et suffisant : `parigo-ten.vercel.app` temporairement, puis `www.parigomusic.com` au basculement. Localhost reste un confort de développeur, pas une exigence de production.

### Pourquoi HTTPS direct est nécessaire

Une redirection HTTP → HTTPS ne protège pas nécessairement la première requête si le navigateur ne connaît pas encore la politique HSTS du domaine. Or le token sensible se trouve dans le chemin. Les recommandations OWASP pour le reset exigent une URL HTTPS; MDN documente que la première requête HTTP peut être interceptée avant redirection. Harvest doit donc générer directement les quatre URLs en `https://`, même si Vercel ou le prestataire final redirige ensuite HTTP.

## 3. Formulaire de contact Harvest

Chemin réel vérifié :

`ContactForm` → `POST /api/contact` → validation anti-abus et contexte → `sendHarvestContactEmail` → `POST /sendcontactusemail/{serviceToken}`.

Le payload contient exactement `Name`, `Email`, `PhoneNumber`, `Subject`, `Message`. La pièce jointe et l’ancienne solution d’envoi ont été retirées.

Test navigateur : formulaire rempli, consentement coché et envoi réel. Résultat visible : `502 CONTACT_PROVIDER_ERROR` et message de repli vers `info@parigomusic.com`. Appel direct : HTTP 200 Harvest, puis `Error.Code=4 — Internal Operation Error`. Aucun e-mail reçu. Le BFF ne masque donc pas un succès et l’UI est cohérente; le blocage est côté configuration Harvest.

## 4. Communications du compte

Le contrat documenté et la réponse live de `gethistorybycommunications` contiennent exactement :

`Type`, `From`, `To`, `Subject`, `Date`, `Status`.

Le mapper Parigo expose les six champs (`id` local de secours en plus). Aucun `Body`, `Message`, `Content`, `TemplateID` ou endpoint source n’existe dans la réponse brute. Le BFF ne retire donc aucune information.

Le nouvel appel live affiche toujours cinq messages `Parigo Music - FRA - Reset Password`, type `Email`, statut `Sent`. En revanche, les e-mails de partage reçus sur la même adresse — y compris `You have received a Playlist from "Yoann"` — n’apparaissent pas.

Le back-office contient 26 types/34 variantes, mais cet inventaire ne doit pas être confondu avec l’historique membre. Les notifications d’inscription et d’abonnement reçues par Guillaume sont des messages administrateur et ne sont donc pas attendues dans l’historique du membre connecté. Le partage adressé au membre, lui, constitue bien l’écart probant. Voir [email-inventory-and-communications-2026-08-10.md](./email-inventory-and-communications-2026-08-10.md).

Il faut demander :

1. quels endpoints alimentent cet historique;
2. si partage, contact, vérification et téléchargement peuvent y figurer;
3. s’il existe un historique global administrateur ou un contrat plus riche pour le corps, le template et le type d’événement.

## 5. Pourquoi Gmail affiche « via harvestmedia.net »

En-têtes réels du reset et du partage :

- `From: Parigo Music - France <Guillaume.albeck@parigomusic.com>`; cette identité est également configurée sur la majorité des variantes du back-office;
- Return-Path sous `sendgrid.harvestmedia.net`;
- SPF valide pour `sendgrid.harvestmedia.net`;
- DKIM valide pour `harvestmedia.net` et `sendgrid.info`;
- aucune signature DKIM `d=parigomusic.com`.

Gmail voit donc une adresse visible Parigo, mais un domaine d’envoi authentifié Harvest, et ajoute la mention `via`. Le From peut et doit être standardisé en `Parigo Music <info@parigomusic.com>`, mais ce changement seul ne supprimera pas `via`.

Le DNS public de `parigomusic.com` contient actuellement un SPF pour l’IP historique, Mailjet et OVH, mais aucun `_dmarc` ni CNAME SendGrid visible aux sélecteurs usuels testés. La bonne séquence est :

1. Harvest authentifie `parigomusic.com` dans le compte/subuser SendGrid qui envoie ces messages;
2. Harvest fournit les CNAME exacts générés pour DKIM et le return-path;
3. Parigo les publie dans son DNS sans remplacer arbitrairement le SPF existant;
4. Harvest valide le domaine;
5. un nouvel e-mail est contrôlé pour l’alignement DKIM/SPF avec le domaine From;
6. DMARC est ajouté progressivement après validation de tous les expéditeurs Parigo.

L’authentification de domaine SendGrid est précisément la fonction prévue pour retirer `via`/`sent on behalf of` et améliorer l’alignement et la délivrabilité.

## 6. État final des demandes

À envoyer à Harvest :

1. base URL optionnelle par requête si disponible; sinon Preview temporaire puis domaine final, avec quatre URLs publiques directement en HTTPS;
2. réparation/configuration de `sendcontactusemail`;
3. descriptions d’album localisées et contrat de langue des membres/e-mails;
4. correction du seul `ReturnTagCount`;
5. payloads des trois opérateurs de titre, ou confirmation d’absence;
6. portée et richesse de l’historique de communications;
7. expéditeur `Parigo Music <info@parigomusic.com>`, authentification SendGrid de `parigomusic.com` et enregistrements DNS exacts.

À ne plus envoyer : replay de recherche sauvegardée, catégorie de playlist plate, CTA HTML/CSS et association de tag prétendument non persistée. Localhost n’est demandé que comme option de confort si une base URL par requête existe, pas comme prérequis de production.

## 7. Relecture de l’ensemble des échanges Harvest

### Encore ouverts techniquement

- base URL Public API par requête, ou procédure Preview → production;
- `sendcontactusemail` en `Code=4`;
- descriptions d’album localisées;
- écriture de la langue membre et sélection des templates;
- compteur agrégé des tags;
- opérateurs stricts de titre;
- portée et détail de l’historique de communications;
- identité d’expéditeur et authentification du domaine Parigo.

### Répondus, implémentés ou volontairement acceptés

- notes privées et casse du payload;
- `SubscribeNewsletter` comme simple donnée exportable;
- payloads reset, partage, livraison directe, collaboration, acceptation en copie/collaboration;
- favoris album/playlist limités aux pistes et archivage non listable : fonctions retirées;
- téléchargement standard via `getmusicdownload`; option de liens site écartée pendant FLEX;
- absence de recherche multilingue native : keyword groups possibles, traduction BFF conservée;
- recherche sauvegardée et catégories de playlists : adaptations Parigo validées;
- contact sans pièce jointe;
- personnalisation HTML/CSS : capacité confirmée, chantier reporté;
- Right Holders : workflow expliqué, décision interne sur le batch à 100 €.

### Hors du mail technique actuel

- AIMS : architecture générale expliquée, mais essai, indexation et coûts restent à décider commercialement;
- refonte des templates graphiques : volontairement reportée;
- nettoyage Right Holders : retour à Roland après la discussion interne.
