# Guide de démonstration — points Harvest encore en attente

Date : **27 août 2026**  
Preview vérifiée : [https://parigo-ten.vercel.app](https://parigo-ten.vercel.app)  
Administration Harvest : [https://admin.harvestmedia.net/dashboard.aspx](https://admin.harvestmedia.net/dashboard.aspx)

Ce guide permet de présenter les constats à une personne non technique. Les
tests sont classés selon trois niveaux :

- **visible** : le problème se voit directement sur le site ;
- **compensé** : le site fonctionne parce que Parigo contourne une incohérence
  de Harvest ;
- **preuve d’audit** : le sujet ne peut pas être montré honnêtement sur le site
  public et doit être présenté avec le résultat du contrôle technique.

## Préparation de la démonstration

Prévoir environ **20 minutes** et ouvrir à l’avance :

1. une fenêtre avec le site Parigo ;
2. une fenêtre connectée à l’administration Harvest ;
3. si possible, un compte Parigo de test et sa boîte e-mail de test ;
4. le présent document pour suivre les étapes.

Ne pas utiliser de véritable adresse client, ne pas modifier de contenu Harvest
et ne pas activer de modèle Right Holder pendant la démonstration. Pour les
captures, masquer les adresses e-mail, identifiants et éventuels jetons.

## Parcours recommandé en réunion

### 1. Album français absent — démonstration la plus importante

**Ce que l’on veut montrer**  
La traduction française existe dans Harvest, mais Harvest envoie encore le
texte anglais au site.

**Liens**

- [The Projectionist — page française](https://parigo-ten.vercel.app/albums/750a3d73a7f4dae6)
- [The Projectionist — page anglaise](https://parigo-ten.vercel.app/en/albums/750a3d73a7f4dae6)
- [Administration Harvest](https://admin.harvestmedia.net/dashboard.aspx)

**Étapes**

1. Ouvrir la page française et descendre jusqu’à la description de l’album.
2. Ouvrir la page anglaise dans un deuxième onglet.
3. Placer les deux pages côte à côte : l’interface change de langue, mais la
   description de l’album reste la même et reste en anglais.
4. Dans Harvest Admin, rechercher l’album avec la référence `PGO0031` ou le
   titre `The Projectionist`.
5. Ouvrir successivement les champs ou onglets **English** et **French** : les
   deux descriptions sont bien renseignées dans Harvest.

**Phrase simple à dire**

> Le texte français existe bien dans Harvest. Le site le demande, mais Harvest
> ne le transmet pas. Nous affichons donc l’anglais pour éviter une page vide.

**Capture conseillée**  
Une image avec les deux pages publiques côte à côte, puis une image du champ
français rempli dans Harvest. Ce triptyque constitue la preuve la plus claire.

**Attente envers Harvest**  
Transmettre la description française de l’album ou indiquer l’endpoint officiel
qui permet de la récupérer.

### 2. Label Musica.it — fonctionne grâce à une compensation Parigo

**Ce que l’on veut montrer**  
Les deux langues fonctionnent sur le site, mais Parigo doit demander deux fois
la fiche à Harvest, car la traduction n’est pas renvoyée de façon cohérente.

**Liens**

- [Musica.it — page française](https://parigo-ten.vercel.app/labels/9d330c152c37bca0)
- [Musica.it — page anglaise](https://parigo-ten.vercel.app/en/labels/9d330c152c37bca0)

**Étapes**

1. Ouvrir les deux liens côte à côte.
2. Comparer les descriptions : la page française contient le texte français et
   la page anglaise le texte anglais.
3. Expliquer que ce résultat est obtenu par une compensation Parigo : pour une
   fiche label, le site demande séparément la version française et la version
   anglaise à Harvest.

**Phrase simple à dire**

> Ici le résultat est bon pour l’utilisateur, mais seulement parce que nous
> avons ajouté un contournement. Nous demandons à Harvest de confirmer que cette
> méthode est officielle et ne changera pas sans préavis.

**Attente envers Harvest**  
Confirmer la règle officielle pour récupérer les traductions des labels.

### 3. Playlists — traduction présente seulement dans le détail

**Liens principaux**

- [Discovery – Travel — page française](https://parigo-ten.vercel.app/playlists/a408d52f57e8de96)
- [Discovery – Travel — page anglaise](https://parigo-ten.vercel.app/en/playlists/a408d52f57e8de96)

**Étapes**

1. Ouvrir les deux pages côte à côte.
2. Vérifier le titre : `Découverte - Voyage` en français et
   `Discovery - Travel` en anglais.
3. Comparer également les descriptions.
4. Expliquer que Harvest ne fournit pas ces traductions dans la liste générale
   des playlists. Parigo doit ouvrir le détail de chaque playlist pour les
   retrouver et les fusionner.

**Quatre exemples dont le nom français manque dans Harvest**

- [Brand - New Media](https://parigo-ten.vercel.app/playlists/c9f1509fc51e6da8)
- [Brand - Lifestyle](https://parigo-ten.vercel.app/playlists/61e38fcec7cf58a8)
- [Brand - DIY](https://parigo-ten.vercel.app/playlists/33366bfdd37dc6e4)
- [Brand - Corporate](https://parigo-ten.vercel.app/playlists/22b6c3499f843b2d)

Sur les pages françaises ci-dessus, le nom reste en anglais. C’est volontaire :
aucun nom français validé n’existe dans Harvest, donc Parigo utilise l’anglais
plutôt que d’inventer une traduction.

**Phrase simple à dire**

> Le site sait afficher les traductions, mais Harvest les cache dans le détail
> de chaque playlist. Nous avons compensé ce fonctionnement et gardons l’anglais
> quand un nom français manque.

**Chiffres à rappeler**

- 64 playlists contrôlées ;
- 60 noms français présents ;
- quatre noms français manquants ;
- 53 descriptions françaises répétées à l’identique dans les données Harvest.

**Attente envers Harvest**  
Confirmer que le détail est la source officielle, puis nettoyer les doublons et
compléter les quatre noms manquants.

### 4. Description française du label Parigo — action interne, pas bug Harvest

**Liens**

- [Label Parigo — page française](https://parigo-ten.vercel.app/labels/b9d701733704e2d7)
- [Label Parigo — page anglaise](https://parigo-ten.vercel.app/en/labels/b9d701733704e2d7)

**Étapes**

1. Comparer les deux pages.
2. Constater que la page française utilise encore le texte anglais.
3. Dans Harvest Admin, ouvrir le label Parigo : le champ anglais est rempli et
   le champ français est vide.

**Phrase simple à dire**

> Ce point est à traiter par Parigo : Harvest ne peut pas transmettre une
> traduction qui n’a pas encore été saisie. Il faut faire valider puis renseigner
> notre texte français.

### 5. Modèles d’e-mails français incomplets

**Niveau de preuve : administration Harvest**

**Étapes**

1. Ouvrir [Harvest Admin](https://admin.harvestmedia.net/dashboard.aspx).
2. Aller dans la rubrique **Email Templates**.
3. Montrer que l’administration contient 26 types d’e-mails et 34 variantes.
4. Filtrer ou repérer les variantes marquées **French**.
5. Montrer que seules six familles ont une variante française :
   `Reset Password`, `Thank you for registering`, `Member Approved`,
   `Member Denied`, `Share Playlist Email` et `Share to Member`.
6. Ouvrir par exemple `Verify Email Address`, `Download` ou
   `Contact Us (API/Custom)` : aucune variante française n’est configurée.

**Phrase simple à dire**

> Harvest ne nous a pas expliqué comment la langue d’un utilisateur choisit le
> bon modèle. Et la majorité des e-mails n’a aujourd’hui aucune version
> française explicite.

**Ce que ce test ne prouve pas**  
L’absence d’une variante française ne prouve pas que le parcours est inutilisable :
Harvest peut utiliser le modèle général. La question ouverte est la langue
réellement choisie et la validité des liens contenus dans chaque message.

**Attente envers Harvest**  
Documenter la règle de langue et indiquer les variantes françaises à créer.

### 6. Formulaire de contact refusé par Harvest

**Lien**  
[Formulaire de contact Parigo](https://parigo-ten.vercel.app/contact)

**Précaution**  
Utiliser uniquement une adresse e-mail de test. Dans le message, écrire par
exemple : `TEST RECETTE PARIGO — ne pas traiter`.

**Étapes**

1. Remplir les champs obligatoires avec des données de test.
2. Attendre quelques secondes avant de valider, pour ne pas déclencher la
   protection antispam du formulaire.
3. Envoyer le message.
4. Constater le message d’erreur et la solution de secours proposant
   `info@parigomusic.com`.

**Résultat de l’audit technique**  
Harvest reçoit bien la demande, mais répond avec son erreur interne `Code=4`.
Le site ne masque pas cette erreur et propose une autre façon de contacter
Parigo.

**Phrase simple à dire**

> Le formulaire du site arrive bien jusqu’à Harvest, mais Harvest refuse
> l’opération. Notre solution de secours évite de perdre complètement le contact,
> mais ce n’est pas le fonctionnement final souhaité.

**Attente envers Harvest**  
Corriger la configuration du modèle `Contact Us (API/Custom)`, son destinataire
ou les droits associés au compte Parigo.

### 7. Liens d’inscription et de mot de passe — contrôle avec compte de test

**Liens**

- [Mot de passe oublié — français](https://parigo-ten.vercel.app/forgot-password)
- [Mot de passe oublié — anglais](https://parigo-ten.vercel.app/en/forgot-password)

**Étapes**

1. Utiliser uniquement l’adresse d’un compte de recette.
2. Demander un seul e-mail de réinitialisation.
3. Ouvrir le message reçu et survoler le bouton sans cliquer.
4. Vérifier que le lien commence par `https://parigo-ten.vercel.app/` pendant la
   recette, puis par le domaine Parigo final au moment du lancement.
5. Vérifier que le message reçu correspond bien à la langue attendue.
6. Cliquer sur le lien et confirmer qu’il revient sur une page Parigo, jamais sur
   une adresse HTTP ni sur un domaine interne Harvest.

**Si aucun e-mail n’arrive**  
Ne pas répéter la demande en boucle. Noter l’heure, l’adresse de test utilisée et
faire une capture de l’écran de confirmation : l’absence de message devient
elle-même un point de recette à transmettre à Harvest.

**Attente envers Harvest**  
Confirmer la procédure de passage Preview → production et la génération directe
de tous les liens en HTTPS.

### 8. Historique des communications incomplet

**Lien après connexion avec le compte de test**  
[Compte > Communications](https://parigo-ten.vercel.app/account/communications)

**Étapes**

1. Se connecter avec le compte de recette.
2. Ouvrir la page Communications.
3. Montrer les entrées de réinitialisation de mot de passe visibles dans la
   liste — sept lors du dernier audit.
4. Dans la boîte e-mail de test, ouvrir un e-mail de partage de playlist reçu.
5. Revenir à la page Communications et constater que ce partage n’apparaît pas.
6. Montrer également que l’historique contient le sujet, l’expéditeur, le
   destinataire, la date et le statut, mais pas le corps du message.

**Phrase simple à dire**

> L’historique Harvest n’est pas un journal complet des e-mails : il contient
> les resets, mais pas les partages reçus, et il ne permet pas de relire le
> contenu du message.

**Attente envers Harvest**  
Indiquer précisément quels e-mails sont enregistrés et s’il existe un historique
administrateur plus complet.

### 9. Compteurs de tags — défaut masqué par Parigo

**Lien après connexion**  
[Compte > Tags](https://parigo-ten.vercel.app/account/tags)

**Ce que l’on peut montrer**  
Les nombres affichés sur le site sont corrects, car Parigo recompte les pistes
tag par tag.

**Preuve de l’audit à présenter**

- Harvest annonce zéro piste pour trois tags de test ;
- les détails de ces mêmes tags contiennent respectivement 1, 4 et 1 pistes ;
- Parigo doit donc ouvrir chaque tag séparément pour calculer le vrai total.

**Phrase simple à dire**

> Le visiteur ne voit pas le problème parce que nous le corrigeons. En revanche,
> cette correction multiplie les demandes envoyées à Harvest et pourrait ralentir
> un compte contenant beaucoup de tags.

**Attente envers Harvest**  
Corriger le compteur global ou fournir une façon de récupérer tous les comptes
en une seule fois.

### 10. Recherche exacte par titre — défaut masqué par Parigo

**Liens de démonstration**

- [Recherche « Piano Minuet »](https://parigo-ten.vercel.app/search?q=Piano%20Minuet&view=tracks)
- [Recherche plus large « Piano »](https://parigo-ten.vercel.app/search?q=Piano&view=tracks)

**Étapes**

1. Ouvrir la recherche `Piano Minuet` et repérer la piste portant exactement ce
   titre.
2. Ouvrir ensuite la recherche `Piano`, beaucoup plus large.
3. Expliquer que le site sait placer les titres pertinents en premier parce que
   Parigo lance plusieurs recherches puis vérifie les titres reçus.

**Preuve de l’audit**  
Les quatre réglages Harvest censés différencier une expression exacte et une
recherche partielle ont renvoyé des comportements presque identiques. Sur le
fixture technique, les totaux observés étaient 1 478, 1 489, 1 478 et 1 478.

**Phrase simple à dire**

> La recherche paraît correcte parce que nous retraitons les réponses. Nous
> demandons à Harvest soit le réglage officiel d’une recherche exacte, soit la
> confirmation que cette fonction n’existe pas.

### 11. Right Holders — ne rien modifier pendant la démonstration

**Niveau de preuve : administration Harvest uniquement**

**Étapes**

1. Dans Harvest Admin, ouvrir la rubrique **Right Holders**.
2. Montrer un exemple de personne avec son nom, son rôle, sa société de gestion,
   son IPI et ses parts.
3. Ouvrir la configuration des modèles de réécriture des champs
   auteur/compositeur/éditeur.
4. Constater que les trois modèles sont désactivés et vides.
5. Ne cliquer ni sur **Save**, ni sur **Enable**, ni sur une action globale.

**Phrase simple à dire**

> Harvest nous a proposé une opération globale facturée 100 €, mais n’a pas
> répondu sur le périmètre exact ni sur le format qui sera écrit. Nous demandons
> d’abord un essai sur un seul album, réversible, avant toute modification du
> catalogue.

**Attente envers Harvest**  
Confirmer le modèle, les types de pistes concernés et la possibilité de valider
un album test avant le traitement global.

### 12. Similarité musicale — montrer que la fonction marche

**Lien**  
[Recherche par lien](https://parigo-ten.vercel.app/search?mode=ai&source=url)

**Lien musical de test**  
[YouTube Music — fixture de recette](https://music.youtube.com/watch?v=ZbZSe6N_BXs)

**Étapes**

1. Ouvrir le mode de recherche par lien.
2. Coller l’URL YouTube Music ci-dessus.
3. Lancer l’analyse.
4. Vérifier que la page propose une liste de pistes similaires — 30 lors du
   dernier contrôle.

**Phrase simple à dire**

> La fonction marche. Notre question pour Harvest n’est plus technique : nous
> attendons la confirmation écrite des quotas, des coûts, de la couverture du
> catalogue et des règles de confidentialité avant de considérer le service
> comme définitivement sécurisé pour la production.

**À ne pas dire**  
Ne pas présenter le mode URL comme défaillant. Un seul échec temporaire a été
observé sous forte charge, puis le même lien et plusieurs autres liens ont
fonctionné.

## Ordre de priorité à montrer au directeur

1. **Album français absent** : preuve visuelle immédiate et incontestable.
2. **Formulaire de contact** : parcours public actuellement en erreur.
3. **E-mails et callbacks** : risque direct sur les comptes au lancement.
4. **Labels et playlists** : fonctionnement correct, mais dépendant de
   contournements Parigo.
5. **Historique, tags et recherche** : limites masquées par le site, avec un coût
   de complexité et de performance.
6. **Right Holders et AIMS** : confirmations de périmètre, de coût et de
   responsabilité avant opérations définitives.

## Captures à joindre à une relance

Limiter la relance à cinq preuves lisibles :

1. `PGO0031` : champ FR rempli dans Harvest + page FR encore en anglais ;
2. formulaire de contact : message d’erreur et fallback vers
   `info@parigomusic.com` ;
3. liste des modèles d’e-mail montrant seulement six variantes françaises ;
4. historique Communications montrant les resets mais pas le partage reçu ;
5. une page récapitulative des compensations Parigo : labels, playlists, tags et
   recherche exacte.

Ne joindre ni clé d’API, ni token, ni adresse d’un client réel, ni capture
contenant des données personnelles.

