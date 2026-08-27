# Guide de démonstration — points Harvest encore en attente

Date : **27 août 2026**  
Preview vérifiée : [https://parigo-ten.vercel.app](https://parigo-ten.vercel.app)  
Administration Harvest : [https://admin.harvestmedia.net/dashboard.aspx](https://admin.harvestmedia.net/dashboard.aspx)

Les preuves Public API et site ont été retestées le 27 août. Les constats
visuels Admin ont été inspectés le 26 août ; la session Admin ayant expiré lors
du second contrôle, refaire une lecture visuelle de `PGO0031` et des modèles
d’e-mail juste avant la démonstration, sans enregistrer de modification.

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

### 3. Playlists — noms traduits et contenu éditorial incomplet

**Liens principaux**

- [Discovery – Travel — page française](https://parigo-ten.vercel.app/playlists/a408d52f57e8de96)
- [Discovery – Travel — page anglaise](https://parigo-ten.vercel.app/en/playlists/a408d52f57e8de96)

**Étapes**

1. Ouvrir les deux pages côte à côte.
2. Vérifier le titre : `Découverte - Voyage` en français et
   `Discovery - Travel` en anglais.
3. Constater que les textes sous les titres sont des métadonnées génériques du
   site : `Discovery - Travel` ne possède actuellement aucune description
   éditoriale, ni anglaise ni française, dans la Public API.
4. Expliquer que la liste et le détail Harvest contiennent tous deux les
   `LanguageItems` disponibles. Le paramètre `languagecode`, lui, ne remplace
   pas les champs canoniques de la liste. Parigo lit donc explicitement
   `LanguageItems` et applique un fallback anglais.

**Quatre exemples dont le nom français manque dans Harvest**

- [Brand - New Media](https://parigo-ten.vercel.app/playlists/c9f1509fc51e6da8)
- [Brand - Lifestyle](https://parigo-ten.vercel.app/playlists/61e38fcec7cf58a8)
- [Brand - DIY](https://parigo-ten.vercel.app/playlists/33366bfdd37dc6e4)
- [Brand - Corporate](https://parigo-ten.vercel.app/playlists/22b6c3499f843b2d)

Sur les pages françaises ci-dessus, le nom reste en anglais. C’est volontaire :
aucun nom français validé n’existe dans Harvest, donc Parigo utilise l’anglais
plutôt que d’inventer une traduction.

**Phrase simple à dire**

> Le site sait afficher les noms traduits présents dans Harvest. Quand une
> traduction ou une description éditoriale manque, nous gardons l’anglais ou
> un texte générique sans inventer de contenu.

**Chiffres à rappeler**

- 64 playlists contrôlées ;
- 60 noms français présents ;
- quatre noms français manquants ;
- seulement deux descriptions françaises présentes ;
- deux playlists contiennent des lignes FR dupliquées à l’identique, sans
  conflit de valeur.

**Attente envers Harvest**  
Confirmer que `LanguageItems` est la source officielle. Les 62 descriptions et
les quatre noms absents doivent être traités comme du contenu à compléter, sauf
si Harvest indique un autre endpoint officiel.

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
2. Aller dans **Members**, ouvrir le formulaire **Add Member** sans rien
   enregistrer, puis montrer le champ `Language` : `English (EN)` et
   `French (FR)`, avec `EN` sélectionné par défaut.
3. Aller ensuite dans la rubrique **Email Templates**.
4. Montrer que l’administration contient 26 types d’e-mails et 34 variantes.
5. Filtrer ou repérer les variantes marquées **French**.
6. Montrer que seules six familles ont une variante française :
   `Reset Password`, `Thank you for registering`, `Member Approved`,
   `Member Denied`, `Share Playlist Email` et `Share to Member`.
7. Ouvrir par exemple `Verify Email Address`, `Download` ou
   `Contact Us (API/Custom)` : aucune variante française n’est configurée.

**Phrase simple à dire**

> Harvest sait enregistrer EN ou FR dans le back-office, mais ne nous a pas
> expliqué comment le site doit écrire cette valeur par l’API ni comment elle
> choisit le bon modèle. La majorité des e-mails n’a aujourd’hui aucune version
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
> l’opération. L’adresse de secours reste disponible en urgence, mais le
> formulaire doit fonctionner avant la mise en production : c’est aujourd’hui
> un blocage de lancement.

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
Les titres complets `Piano Minuet`, `Café Paris`, `Train D'Amour` et
`L'Amour Sur Les Faubourgs (Instr)` sont correctement retrouvés. En revanche,
pour le terme simple `piano`, les quatre réglages renvoient 1 480, 1 491,
1 480 et 1 480 résultats : ils ne constituent pas des modes de champ distincts
« contient / commence par / égal ». L’apostrophe typographique `’` n’est pas
assimilée à l’apostrophe droite `'`, que Parigo normalise donc avant recherche.

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

> L’intégration AIMS est terminée. Les quatre modes — piste, description,
> fichier et URL — fonctionnent dans nos tests. La disponibilité et
> l’indexation des nouveaux masters seront simplement surveillées côté Harvest ;
> il ne reste aucun développement dépendant directement d’AIMS.

**À ne pas dire**  
Ne pas présenter le mode URL comme défaillant. Un seul échec temporaire a été
observé sous forte charge, puis le même lien et plusieurs autres liens ont
fonctionné.

## Ordre de priorité à montrer au directeur

1. **Album français absent** : preuve visuelle immédiate et incontestable.
2. **Formulaire de contact** : parcours public actuellement en erreur.
3. **E-mails et callbacks** : risque direct sur les comptes au lancement.
4. **Labels et playlists** : fonctionnement correct ; contrat à faire confirmer
   et contenus manquants à distinguer des défauts API.
5. **Historique, tags et recherche** : limites masquées par le site, avec un coût
   de complexité et de performance.
6. **Right Holders** : confirmations de périmètre, de coût et de responsabilité
   avant toute opération définitive. AIMS est résolu et ne fait plus partie des
   points à débloquer.

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
