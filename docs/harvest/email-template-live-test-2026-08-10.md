# Test live d’un template e-mail Harvest

Date : **10 août 2026**.

## Résultat

Un prototype Parigo a été appliqué temporairement au template réellement utilisé par `sendsharemusiclinkemail`, envoyé via l’API, contrôlé dans Gmail puis retiré. Le template d’origine est de nouveau actif.

## Sécurisation et restauration

Avant l’édition, les champs du template ont été relevés : identifiant, sujet, corps HTML, expéditeur, utilisation du template global, statut, app, région, langue et BCC.

Deux templates ont été distingués :

- **Share Playlist Email** — ID `9c7af4d1634fd146` — n’a pas été sélectionné par l’endpoint Public API testé;
- **Share Track/Album/Playlist** — ID `adc744bc70bf3abb` — est celui dont le sujet et le corps correspondaient exactement aux e-mails reçus.

Après le test, **Share Track/Album/Playlist** a été restauré avec :

- sujet d’origine `You have received a [contenttype] from "[senderfirstname]"`;
- merge fields d’origine `[contenttype]`, `[senderfirstname]`, `[sendersurname]`, `[link]` et `[message]`;
- même expéditeur, même template global, même statut, mêmes app/région/langue et même BCC;
- corps sémantiquement identique, l’éditeur CKEditor ayant uniquement normalisé des espaces et lignes vides.

Le template **Share Playlist Email**, ouvert lors du premier essai, a lui aussi été restauré sans changement fonctionnel.

## Prototype contrôlé dans Gmail

Le corps temporaire utilisait :

- fond sombre `#111211`;
- accent Parigo `#D1E653`;
- zones crème;
- rayons de 28 px et mise en page par tableaux compatible e-mail;
- styles entièrement inline;
- logo HTTPS `https://parigo-ten.vercel.app/images/parigo-logo-email.png`;
- badge, titre, zone de lien, message de l’expéditeur et footer sobre.

Le message reçu a conservé la mise en page, les couleurs, les coins arrondis et le logo. Le `From` était celui configuré dans Harvest et le `Reply-To` correspondait à l’adresse de l’expéditeur du partage.

## Contrat `[link]` découvert

Harvest ne remplace pas `[link]` par une chaîne URL. Il injecte un élément HTML complet de la forme :

```html
<a href="https://…">https://…</a>
```

Une première version qui plaçait `[link]` dans l’attribut `href` créait donc un ancrage imbriqué invalide. La version validée place `[link]` seul à l’intérieur d’une zone CTA stylée. Le lien est alors correct, mais son libellé visible reste l’URL brute.

Question à poser au support : existe-t-il un merge field contenant seulement l’URL, ou une syntaxe permettant de personnaliser le libellé du bouton ?

## Limite du template global actuel

Le corps moderne reste enveloppé dans le template global Harvest historique. Celui-ci contient encore :

- une table fixe d’environ 600 px et un cadre ancien;
- un ancien grand logo chargé en HTTP;
- une feuille Font Awesome externe;
- des icônes sociales en HTTP et au moins un lien social obsolète;
- un footer `PARIGO MUSIC` redondant.

Le résultat démontre que la nouvelle direction artistique est réalisable, mais la mise en production doit refondre d’abord le template global, puis harmoniser les templates individuels. Les images devront toutes être servies en HTTPS et les styles critiques rester inline.

## Portée exacte du support

La réponse du ticket `#68617` et le test live confirment :

- HTML et CSS inline dans le global et les templates individuels;
- images externes HTTPS et mise en page responsive possibles;
- corps individuel injecté via `[body]` dans le global;
- pas de preview/staging Harvest : modification live et déclenchement réel nécessaires;
- pas de `Reply-To` personnalisé ni de fallback texte brut configurable.

Le fichier [email-template-share-prototype.html](./email-template-share-prototype.html) conserve une base de prototype hors de l’Admin. Il n’est pas déployé et ne contient aucun secret.
