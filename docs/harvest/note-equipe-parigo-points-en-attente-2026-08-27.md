# Brouillon pour l’équipe Parigo — points Harvest encore en attente

Date de préparation : **27 août 2026**  
Public visé : direction et équipe Parigo, sans prérequis technique.

## Version courte à envoyer par e-mail

**Objet : Points Harvest à débloquer avant la mise en production du nouveau site**

Bonjour à tous,

Nous avons terminé un contrôle complet du nouveau site Parigo et de sa liaison
avec Harvest. Le catalogue, la lecture audio et la recherche fonctionnent. Nous
avons aussi corrigé ou contourné plusieurs limites de Harvest de notre côté.

Il reste néanmoins quelques questions auxquelles Harvest n’a pas encore répondu,
malgré une première relance. Les plus importantes sont les suivantes :

1. **Traductions des albums** : certaines traductions françaises sont bien
   enregistrées dans l’administration Harvest, mais ne sont pas transmises au
   site. L’album *The Projectionist* en est un exemple très clair : la version
   française du site affiche encore le texte anglais.
2. **E-mails envoyés aux utilisateurs** : nous ne savons toujours pas comment
   Harvest choisit la langue d’un e-mail. Le back-office permet bien de choisir
   `EN` ou `FR` sur un membre, avec `EN` par défaut, mais l’écriture de cette
   valeur depuis l’API du site n’est pas documentée. Sur 26 familles d’e-mails
   visibles et 34 variantes, seules six variantes sont françaises. Il faut
   également confirmer que tous les liens d’inscription et de mot de passe
   renverront bien vers le site final, en HTTPS.
3. **Formulaire de contact** : Harvest refuse actuellement les messages envoyés
   par le formulaire du site. Parigo affiche donc l’adresse
   `info@parigomusic.com` en solution de secours, mais ce fonctionnement doit
   être corrigé avant le lancement. C’est le principal blocage restant.
4. **Labels et playlists** : les traductions disponibles fonctionnent sur le
   site. Nous devons simplement faire confirmer à Harvest la règle officielle
   de lecture. Quatre noms de playlists et la grande majorité des descriptions
   de playlists sont absents des données : ils sont classés comme contenu à
   compléter, pas comme défaut API démontré.
5. **Fonctions de compte** : certains compteurs et l’historique des e-mails sont
   incomplets côté Harvest. Le site compense lorsqu’il le peut, mais Harvest doit
   confirmer le fonctionnement officiel.
6. **Similarité musicale** : l’intégration AIMS est terminée et les quatre modes
   fonctionnent — piste, description, fichier et lien YouTube. Il ne reste
   aucun développement dépendant directement d’AIMS. La disponibilité et
   l’ajout continu des nouveaux masters seront simplement surveillés côté
   Harvest. Les sujets commerciaux sont suivis directement par Parigo avec
   AIMS.

Ces sujets ne signifient pas que tout le site est bloqué. La majorité du site
fonctionne et plusieurs écarts ont un contournement. En revanche, nous avons
besoin d’une réponse écrite de Harvest, point par point, pour sécuriser la mise
en production et éviter qu’un comportement non documenté change après le
lancement.

Je joins un parcours de démonstration très simple avec des exemples précis et
des liens reproductibles. Si possible, un appui de la direction auprès de
Harvest, avec une demande de date de réponse ferme, nous aiderait à clôturer la
recette dans les temps.

Merci,

Yoann

---

## Version très courte pour Slack ou WhatsApp

Nous avons terminé l’audit Harvest du nouveau site. Le catalogue principal
fonctionne, mais Harvest doit encore répondre sur trois sujets prioritaires :
la traduction française de certains albums n’arrive pas jusqu’au site, le
formulaire de contact est refusé, et la langue/les liens des e-mails de compte
ne sont pas suffisamment documentés. Les labels, playlists, tags et recherches
fonctionnent grâce à des compensations ajoutées côté Parigo, mais nous devons
faire confirmer que ces contournements resteront valables. L’intégration AIMS
est terminée et la similarité fonctionne dans ses quatre modes. Un appui de la
direction pour obtenir une réponse écrite et datée de Harvest serait très utile
avant la mise en production.

## Ce que nous demandons à la direction Parigo

- Appuyer la relance auprès de Harvest, idéalement en mettant le responsable du
  compte ou le décideur commercial en copie.
- Demander une réponse **point par point**, même si la réponse est simplement
  « non supporté ».
- Demander une date de correction ou de confirmation compatible avec le
  calendrier de mise en production.
- Distinguer les sujets bloquants des améliorations : un callback de compte
  incorrect est bloquant ; une traduction manquante avec repli anglais ne l’est
  pas.

## Message que la direction peut ajouter à la relance Harvest

> Bonjour,
>
> Je me permets d’appuyer la demande de Yoann. La mise en production du nouveau
> site Parigo approche et nous avons besoin de clôturer rapidement les derniers
> points dépendant de Harvest. Pourriez-vous nous répondre point par point et
> nous indiquer, lorsque nécessaire, une date de correction ou la solution
> officiellement recommandée ? Plusieurs sujets sont déjà compensés côté Parigo,
> mais nous devons sécuriser les parcours de compte, les e-mails et les contenus
> bilingues avant le lancement.
>
> Merci beaucoup pour votre aide et pour un retour dans les meilleurs délais,
> Parigo visant une mise en production la semaine prochaine.

## À ne pas présenter comme des problèmes encore ouverts

- L’authentification de l’adresse d’envoi `info@parigomusic.com` est corrigée.
- Les catégories et styles sont désormais entièrement traduits.
- L’intégration AIMS à travers Harvest est terminée et ses quatre modes ont été
  testés avec succès.
- Le mode de similarité par lien fonctionne, notamment avec le lien YouTube
  Music utilisé pendant la recette.
