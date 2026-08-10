# Audit Harvest — ayants droit, champs libres et templates

Date de l'audit : 10 août 2026

Périmètre : compte Parigo, Harvest Admin, Public API et BFF Parigo

Statut : audit et test réversible terminés ; aucun e-mail envoyé ; aucun traitement en masse déclenché

## Conclusion exécutive

Le BO confirme que le champ de piste **Right Holder Text**, sous-titré
**Author(s)/Composer(s)/Arranger(s)** et porté par `txtComposer`, correspond au champ
libre `Composer` renvoyé par l'API. Ce champ sert à l'affichage, à la recherche et
potentiellement aux conventions de nommage de fichiers. Il ne doit pas être utilisé
comme identité canonique d'un ayant droit.

L'identité, le rôle, l'IPI, la société, les territoires et les quotes-parts sont
portés séparément par le registre et les tableaux structurés **Right Holders**. Pour
le rapprochement entre talents, pistes et albums, la stratégie la plus fiable reste
donc hybride : identifiants structurés en priorité, texte normalisé uniquement en
repli, et règles métier explicites pour les collectifs.

Les trois templates d'import/ingestion actuellement visibles dans Global Settings
— Composer, Publisher et Artist — sont **désactivés et vides**. Les suffixes
`(NS)`, `(SACEM)` et `(BMI)` présents dans le catalogue ne proviennent donc pas d'un
template personnalisé Parigo actuellement actif. Harvest doit encore confirmer si,
quand ces templates sont désactivés, un template interne par défaut ou un ancien
workflow d'import ajoute automatiquement la société.

## 1. Cartographie vérifiée

| Donnée | Emplacement BO | Donnée API observée | Usage recommandé |
|---|---|---|---|
| Texte auteurs/compositeurs/arrangeurs | Track > General > Right Holder Text (`txtComposer`) | `Composer` | Affichage et repli de compatibilité uniquement |
| Texte éditeur | Track > General > Publisher (`txtPublisher`) | `Publisher` | Affichage ; dérivé si le registre éditeur est complet |
| Texte artiste | Track > General > Artist (`txtArtist`) | `Artist` / `Artists` selon la route | Affichage ; dérivé si le registre artiste est complet |
| Identifiants d'ayants droit | Track > Right Holders | `RightHolderIDs` dans CloudSearch | Clé primaire du matching talent/piste |
| Détails d'ayants droit | Right Holders et tableaux de la piste | `RightHolders` / endpoint `getrightholders` | Identité, rôle, IPI, société, parts et contrôle |
| Métadonnées d'album | Album Manager > Album | Routes album | Titre, code, descriptions, date, styles, tags, pochette et distribution |
| Métadonnées de piste | Track Manager > Track | Routes piste et CloudSearch | Titre, version, durée, code, descriptions, mots-clés, musicalité et audio |
| Bios et portraits publics des talents | Hors Harvest, dépôt Parigo | Registre éditorial local | Contenu éditorial contrôlé, non dérivé des ayants droit |
| Attributs/codes avancés | Field Settings | Attributs/codes API | Métadonnées additionnelles ; pas une identité de compositeur |

### Différence entre lecture directe et index de recherche

La route de détail `gettracks` utilisée pendant le test a renvoyé le texte
`Composer` actualisé, mais aucun `rightHolderIds`. CloudSearch a renvoyé le texte
indexé et les identifiants structurés. L'endpoint des ayants droit a fourni les
détails complets.

Conséquence pour Parigo :

- utiliser `RightHolderIDs` lorsqu'ils sont présents dans CloudSearch ;
- interroger les ayants droit structurés lorsqu'un détail ou une validation est
  nécessaire ;
- utiliser le champ `Composer` normalisé seulement lorsque la donnée structurée
  n'est pas disponible ;
- ne jamais déduire un rôle, un IPI ou une société depuis le seul texte libre.

## 2. État réel des templates Harvest

### Rightholder Templates

Dans **Global Settings > Rightholder Templates**, les capacités disponibles sont :

- Author ;
- Composer ;
- Composer/Author ;
- Arranger.

Le texte du template principal est vide et `Max Writer` vaut `0`. Les champs de
fusion proposés comprennent le prénom, le deuxième prénom, le nom, l'IPI, la
société et plusieurs séparateurs. La note du BO indique que ce template peut aussi
affecter les noms des fichiers téléchargés et des stems lorsque des champs de fusion
Right Holder sont utilisés.

### Rightholder Ingestion & Import Overwrite Templates

L'état observé est le suivant :

| Template | Activation | Contenu |
|---|---:|---|
| Composer | désactivé | vide |
| Publisher | désactivé | vide |
| Artist | désactivé | vide |

La note du BO précise que ces templates écrasent ou alimentent les champs libres
Composer, Publisher et Artist lors de l'ingestion ou de l'import. Les champs de
fusion Composer incluent notamment les noms, l'éditeur, l'IPI, la société et les
quotes-parts.

Ce constat invalide l'hypothèse d'un template Parigo actif qui ajouterait aujourd'hui
la société. Il reste trois causes possibles à faire départager par Roland :

1. un template Harvest interne utilisé par défaut lorsque le template client est
   désactivé ;
2. un format d'import ou un traitement d'ingestion qui compose lui-même le texte ;
3. une donnée libre déjà présente dans les fichiers sources ou héritée d'un ancien
   paramétrage.

### Import et ingestion

L'interface **Advanced Import** accepte des fichiers `.csv` et `.txt`, puis propose
une étape de validation/import. Aucun modèle téléchargeable ni fichier historique
exploitable n'était visible pendant l'audit. L'**Ingestion Manager** n'a pas permis
de retrouver le fichier source ou le template évoqué par l'équipe Parigo dans les
enregistrements visibles. Aucun fichier n'a été chargé et aucune ingestion n'a été
déclenchée.

La page **Field Settings** gère les groupes d'attributs et de codes avancés des
albums, pistes, labels et membres. Elle ne pilote pas les champs principaux
Composer/Right Holder Text ni les templates d'ayants droit.

## 3. Test réversible effectué dans le BO

### Piste témoin

- Album : `PGO0056` — *Acid Body Music*
- Piste : *All The Arps*
- Track ID : `d61fac27d92967dbdce0e34f80eeefb4`
- Valeur d'origine : `Modulhater (SACEM)`

Ayants droit structurés observés avant le test :

- Modulhater — Composer — IPI `891096015` — SACEM — performance 100 % ;
- PARIGO — Original Publisher — IPI `461629743` — SACEM — performance 100 %,
  mécanique 100 %.

Le BO signale par ailleurs une quote-part mécanique écrivain à 0 %. Ce point ne doit
pas être corrigé automatiquement : il nécessite une validation métier des droits.

### Manipulation

Seul le champ libre `txtComposer` a été temporairement remplacé par un marqueur de
test daté, puis enregistré. Aucun ayant droit structuré, IPI, rôle, société ou
pourcentage n'a été modifié.

### Propagation observée

| Heure UTC | Vérification | Résultat |
|---|---|---|
| 19:58:28 | détail `gettracks` | marqueur déjà visible |
| 19:58:43 à 20:00:32 | 8 lectures CloudSearch | ancienne valeur toujours visible |
| pendant tout le test | ayants droit structurés | strictement inchangés |
| 20:01:45, après restauration | détail, CloudSearch et ayants droit | valeur d'origine et structures restaurées |

Le champ direct a donc été actualisé immédiatement, mais l'index CloudSearch n'a pas
été mis à jour dans la fenêtre d'environ deux minutes demandée. Ce test ne permet
pas de mesurer le délai complet de réindexation. Roland doit confirmer le mécanisme
de déclenchement, le délai habituel et l'existence éventuelle d'une réindexation
Support après un bulk refresh.

La piste contient de nouveau exactement `Modulhater (SACEM)` dans le BO et dans les
lectures API finales. Aucun marqueur de test ne subsiste.

## 4. Audit du registre et portée des identifiants

La fiche **Right Holders** de Liqid illustre la bonne granularité :

| Nom | Capacité | IPI affiché | Société | Nombre de relations |
|---|---|---:|---|---:|
| Liqid | Composer | `00543003202` | SACEM | 0 |
| Liqid | Composer | `543003202` | SACEM | 59 |
| Liqid | Author | `543003202` | SACEM | 2 |

Les IDs distincts Composer et Author ont un intérêt : Harvest représente les
capacités séparément. Ils ne doivent pas être fusionnés. En revanche, les deux
fiches Composer semblent être un doublon potentiel pour la même personne et le même
IPI normalisé ; la fiche sans relation peut être candidate à fusion ou suppression,
mais seulement après export et validation dans Harvest.

La règle de dédoublonnage ne doit donc pas être « même personne = même fiche ». La
clé d'audit doit combiner au minimum :

`personne canonique + capacité + IPI normalisé + société`,

avec contrôle du nombre de pistes, des territoires et des quotes-parts. Les cas
Drixxxé et Jean-Pierre Ménager doivent être vérifiés selon cette même règle avant
d'être qualifiés de doublons. Aucun ID ne doit être fusionné entre deux capacités.

## 5. Modèle de données recommandé

### Source de vérité

Le tableau structuré des ayants droit doit être la source de vérité pour :

- l'identité canonique ;
- la capacité — auteur, compositeur, compositeur/auteur, arrangeur ou éditeur ;
- l'IPI et la société de gestion ;
- les territoires et quotes-parts ;
- les relations piste ↔ ayant droit ;
- le rapprochement des talents et de leurs albums.

### Données dérivées

Les champs libres Composer, Publisher et Artist doivent être considérés comme des
projections lisibles et compatibles avec l'existant. Ils sont utiles à l'affichage,
à certaines recherches, aux exports et éventuellement aux noms de fichiers, mais ne
doivent pas décider seuls qu'une personne a participé à un album.

### Matching hybride dans Parigo

Ordre recommandé :

1. correspondance par ID d'ayant droit Harvest validé pour le talent ;
2. vérification du rôle structuré lorsqu'il est disponible ;
3. repli par alias de crédit libre normalisé si aucun ID exploitable n'est renvoyé ;
4. règles d'album explicites pour les collectifs et les homonymes.

Exemple métier confirmé : `PGO0055` — *The World Wedding March* — doit apparaître
sur la fiche de Fabien Girard, pas sur celle d'Arat Kilo. Un crédit d'un membre ne
doit donc pas automatiquement attribuer tous ses albums au collectif. Les relations
collectives doivent être limitées aux albums explicitement validés.

## 6. Templates cibles recommandés

### Composer

Objectif métier : produire uniquement les noms lisibles des auteurs, compositeurs,
compositeurs/auteurs et arrangeurs, sans société, IPI, quote-part ni éditeur.

Format conceptuel :

`Prénom Deuxième-prénom Nom, Prénom Deuxième-prénom Nom`

Le BO ne fournit pas de prévisualisation suffisante pour garantir ici la chaîne de
tokens exacte ni le comportement des séparateurs entre plusieurs rôles. Roland ou
Support doit valider la syntaxe précise sur un album pilote avant activation.

### Publisher et Artist

Ne pas les activer en même temps par défaut. Ils ne doivent être générés que si les
tables structurées Publisher et Artist sont suffisamment complètes et si leur rendu
a été comparé aux valeurs actuelles. Le besoin prioritaire de la relance concerne le
champ Composer.

### Fichier d'import cible

Le format exact doit être fourni ou confirmé par Harvest. Fonctionnellement, il doit
permettre, pour chaque piste principale, alternate et stem :

- un identifiant stable de piste ou une combinaison album/code/numéro non ambiguë ;
- un ayant droit canonique ;
- une capacité explicite ;
- l'IPI normalisé sans zéro parasite ;
- la société ;
- l'éditeur original si applicable ;
- les territoires ;
- les quotes-parts performance et mécanique ;
- les éventuels rôles Artist/Publisher structurés ;
- les champs libres laissés vides uniquement si Harvest confirme qu'ils seront
  générés de façon déterministe par le template.

Les descriptions, mots-clés, genres, moods, instrumentation et autres métadonnées
musicales ne doivent pas être réimportés dans ce chantier de nettoyage des droits,
sauf si Harvest impose un fichier album/piste complet. Cela réduit le risque
d'écraser des données éditoriales sans rapport avec l'objectif.

## 7. Séquence de nettoyage proposée

1. Obtenir de Harvest un export de sauvegarde du registre Right Holders, des relations
   piste/ayant droit et des trois champs libres actuels.
2. Produire une table canonique avec capacité, IPI normalisé et statut de chaque
   anomalie ; ne jamais fusionner deux rôles différents.
3. Corriger ou fusionner uniquement les doublons validés, avec contrôle des pistes
   liées, territoires et quotes-parts.
4. Faire confirmer par Harvest l'origine automatique des suffixes lorsque les
   templates personnalisés sont désactivés.
5. Configurer un template Composer « noms uniquement » sans activer Publisher et
   Artist.
6. Demander un aperçu ou un pilote Support sur un seul album représentatif incluant
   pistes principales, alternates et stems.
7. Comparer avant/après dans le BO, `gettracks`, CloudSearch, `getrightholders`, les
   exports et les noms de fichiers générés ; attendre la réindexation complète.
8. Valider le rollback et le périmètre exact, puis seulement lancer le bulk refresh
   proposé à 100 €.
9. Conserver ensuite le texte libre comme projection générée, et maintenir les
   structures Right Holder comme source de vérité.

## 8. Questions précises à envoyer à Roland

1. Quand les trois templates d'import/ingestion sont désactivés et vides, Harvest
   applique-t-il un template interne par défaut qui ajoute `(NS)` ou la société ?
2. Le fichier d'import utilisé par l'équipe Parigo contient-il déjà ces suffixes, ou
   sont-ils ajoutés après validation par Harvest ? Pouvez-vous fournir le modèle
   exact et un exemple du résultat calculé ?
3. Quel template exact faut-il saisir pour obtenir uniquement les noms, pour les
   capacités Author, Composer, Composer/Author et Arranger, avec plusieurs personnes ?
4. Le bulk refresh peut-il cibler seulement Composer et un album/label pilote avant
   le compte entier ? Inclut-il les alternates et stems ?
5. Le traitement peut-il modifier les noms des fichiers ou téléchargements existants,
   et lesquels ?
6. Quel export de sauvegarde, aperçu et mécanisme de rollback sont disponibles ?
7. Quelle est la règle de réindexation CloudSearch et son délai habituel après une
   modification unitaire et après le traitement Support ?
8. Pour les fiches distinctes d'une même personne, confirmez-vous qu'il faut conserver
   un enregistrement par capacité et ne fusionner que les doublons de même capacité ?

## 9. Décision recommandée

Accepter l'option 1 de Roland, mais comme une migration contrôlée et non comme un
simple nettoyage de texte : registre structuré d'abord, template Composer dérivé
ensuite, pilote limité, vérification de l'index et des fichiers, puis traitement en
masse. Le front/BFF Parigo doit continuer à tolérer les anciens textes pendant la
transition grâce au matching hybride, sans devenir la source de vérité des droits.
