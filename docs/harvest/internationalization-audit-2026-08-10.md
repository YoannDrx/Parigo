# Audit Harvest FR/EN — albums, labels, membres et e-mails

Date de vérification : **10 août 2026**.

## Conclusion

- **Labels : exploitable aujourd’hui.** `getlibrary` expose les descriptions localisées dans `LanguageItems`; Parigo les sélectionne déjà selon la langue de l’URL.
- **Albums : bloqué par le contrat Public API.** Harvest Admin stocke bien une description française, mais `getalbum` ne la renvoie pas. Le site ne peut donc pas afficher le français sans nouvelle donnée exposée par Harvest.
- **E-mails : infrastructure multilingue présente mais contrat de sélection incomplet.** L’Admin gère les langues et les variantes de templates. En revanche, la manière dont chaque endpoint sélectionne sa variante n’est pas documentée, les comptes Parigo restent en `LanguageCode=EN`, et plusieurs templates nécessaires n’ont aucune variante française.

## 1. Albums

### Cas demandé : PGO0001

Fiche Admin : `collectionid=3d401caa45dd4a4e`.

| Source | Résultat |
| --- | --- |
| Harvest Admin | Onglets EN et FR présents. EN = `French Indie Rock Experience`; FR vide. |
| `getalbum` | `Detail` anglais uniquement ; aucun `LanguageItems`. |
| `getalbum?...&languagecode=fr` | Réponse strictement identique ; ce paramètre n’est pas documenté pour cet endpoint. |

Ce cas seul ne permettrait pas de distinguer une absence de traduction d’une absence d’exposition API. Un second album déjà traduit a donc été utilisé.

### Cas probant : PGO0031

Identifiant Public API : `750a3d73a7f4dae6`.

| Source | Résultat |
| --- | --- |
| Harvest Admin | Description anglaise présente ; description française complète présente ; indicateur FR au vert. |
| Liste `getalbums` | `Detail` anglais uniquement. |
| Détail `getalbum` | `Detail` anglais uniquement ; aucun `LanguageItems`; aucune autre propriété de description. |
| Détail avec `languagecode=fr` | Même valeur anglaise, mêmes clés. |
| Page locale `/albums/750a3d73a7f4dae6` | UI française mais description anglaise. |
| Page locale `/en/albums/750a3d73a7f4dae6` | UI anglaise et description anglaise. |

La date `LastUpdated` renvoyée par l’API correspond bien à la modification du 5 août : la réponse n’est pas simplement un ancien cache. La traduction est stockée, mais omise du payload public.

### État du code Parigo

Le code est déjà préparé pour un futur contrat localisé :

- `mapAlbumDescriptions` cherche un `LanguageItems` dont le type contient `description` et normalise FR/EN ;
- `resolveAlbumDescription` applique le fallback langue courante → anglais → ancien champ ;
- la page album utilise cette résolution pour le texte visible, la meta description et le JSON-LD.

Il n’y a donc pas de correctif fiable à inventer côté Parigo : traduire à la volée ou dupliquer la donnée localement créerait une seconde source de vérité. La bonne correction est l’exposition de la traduction par Harvest.

## 2. Labels / Libraries

### Contrat live

Au 10 août, `getlibraries` renvoie 103 Libraries. Une Library, **Musica.it**, possède une traduction française live :

```json
{
  "Type": "LibraryDescription",
  "LanguageCode_ISO639_1": "FR",
  "Value": "…"
}
```

`getlibrary` renvoie le même `LanguageItems`. Le test navigateur local confirme :

- `/labels/9d330c152c37bca0` affiche la description française et une meta description française ;
- `/en/labels/9d330c152c37bca0` affiche `Detail` en anglais et une meta description anglaise.

Le mécanisme Parigo est donc fonctionnel de bout en bout : Admin/API → mapper → route FR/EN → UI et SEO.

### État de la Library Parigo

La fiche Admin de la Library Parigo contient :

- une description anglaise de 174 caractères ;
- un onglet FR disponible mais vide ;
- les contrôles d’upload de logo.

`getlibrary` ne renvoie logiquement aucun `LanguageItems` pour Parigo tant que la valeur FR n’est pas saisie. L’action est une saisie de contenu Parigo, pas un changement API.

## 3. Templates d’e-mail

### Capacités visibles dans Harvest Admin

L’Admin affiche 26 types de templates. Chaque variante peut définir :

- l’app (`All Apps`, `FLEX API`, `INTERNAL API`) ;
- la région ;
- la langue (`All Languages`, `English`, `French`) ;
- l’expéditeur et le BCC ;
- le sujet ;
- le corps dans un éditeur riche avec mode **Source HTML**, styles et merge fields ;
- l’utilisation du template global du compte ;
- des pièces jointes administratives selon le template.

Le corps du reset français est bien stocké en HTML et utilise notamment `[firstname]`, `[surname]`, `[username]`, `[accountname]` et `[resetlink]`. Cela confirme qu’une personnalisation HTML poussée est possible ; pour les e-mails, le CSS devra néanmoins privilégier les styles inline et les constructions compatibles avec les clients de messagerie.

### Couverture linguistique actuelle

Il n’existe aucun template explicitement marqué `English`; les variantes `All Languages` jouent actuellement le rôle de fallback par défaut.

Six types possèdent une variante `French` :

1. Reset Password ;
2. Thank you for registering ;
3. Member Approved ;
4. Member Denied ;
5. Share Playlist Email ;
6. Share to Member.

Les types importants suivants n’ont qu’une variante générique :

- Verify Email Address ;
- Contact Us (API/Custom) ;
- Member to Member Direct Playlist Delivery ;
- Share Track/Album/Playlist ;
- Download Request confirmation, Download et Group Download.

Le template **Contact Us (API/Custom)** est actif, utilise le template global et contient bien un sujet et un corps avec merge fields. Son champ d’expéditeur n’a cependant aucune valeur sélectionnée. Ce signal mérite d’être contrôlé par Harvest avec la configuration du destinataire ; il ne suffit pas, à lui seul, à prouver la cause du `Code=4`, car d’autres templates fonctionnels peuvent aussi s’appuyer sur une valeur par défaut de compte.

La page contient précisément **26 types et 34 variantes**. La majorité des variantes nommées utilisent encore `Parigo Music - France <Guillaume.albeck@parigomusic.com>`; la variante française du reset et les deux templates de contact ont un expéditeur vide. L’inventaire détaillé et sa comparaison à l’historique membre sont consignés dans [email-inventory-and-communications-2026-08-10.md](./email-inventory-and-communications-2026-08-10.md).

### Comptes membre et sélection de langue

Les deux comptes de test renvoient :

- `Country=FR` ;
- la même région Global ;
- `LanguageCode=EN` ou `en`.

Le schéma Parigo actuel ne conserve pas `LanguageCode`, l’interface Compte ne permet pas de le modifier et les requêtes `registermember` / `updatemember` ne l’envoient pas. La documentation publique inclut bien `LanguageCode` dans les **réponses**, mais pas dans les champs documentés des **requêtes**. Il ne faut donc pas ajouter ce champ au hasard avant confirmation.

### Endpoints réellement utilisés par Parigo

| Parcours | Endpoint / comportement | Signal de langue disponible aujourd’hui | Risque |
| --- | --- | --- | --- |
| Vérification d’adresse | `sendmemberverifylinkemail` après une inscription avec `NoMemberEmail=true` | Aucun champ langue dans le body ; template uniquement générique | Impossible de garantir FR |
| Reset | `sendpasswordresetemail` avec `Username` / `Email` | Aucun champ langue ; Harvest peut potentiellement lire le membre | Algorithme non documenté |
| Partage | `sendsharemusiclinkemail` | `SelectEmailTemplateByMemberRegion`, actuellement `false` | Sens exact du flag et compte de référence inconnus |
| Contact | `sendcontactusemail` avec cinq champs texte | Aucun membre ni champ langue ; template uniquement générique | Impossible de choisir FR/EN avec le contrat connu |
| Livraison directe | `deliversharemusic` avec `NotifyUser=false` | Aucun e-mail demandé par Parigo | Aucun impact actuel |
| Téléchargement | `getmusicdownload`, `ForceEmail=false` | Harvest peut basculer vers e-mail si le lot l’exige | Templates de téléchargement uniquement génériques |
| Approbation / refus | Changement de statut dans Harvest | Le membre possède `LanguageCode` | Dépend de la sélection interne Harvest |

## 4. Architecture cible recommandée

1. **Le contenu catalogue suit la langue de l’URL du site.** Albums et labels doivent exposer FR/EN dans leurs payloads ; Parigo garde le fallback vers l’anglais si une traduction manque.
2. **Le compte Harvest conserve une langue de communication.** À l’inscription, Parigo envoie la locale courante si Harvest confirme le champ d’écriture. Le profil permet ensuite de la modifier explicitement.
3. **Le sélecteur du site et la langue du compte sont synchronisés pour les membres connectés**, mais sans bloquer la navigation si l’écriture Harvest échoue. Cette synchronisation doit être décidée après clarification du contrat `LanguageCode`.
4. **Les e-mails sans membre identifiable** — notamment le contact — doivent accepter une langue dans la requête ou disposer d’un autre mécanisme officiel. Sinon, un seul template bilingue reste la seule solution Harvest fiable.
5. **Les templates utilisent une variante explicite FR et une variante explicite EN** lorsque Harvest confirme la règle de résolution ; `All Languages` reste le fallback de sécurité.

## 5. Plan d’implémentation après réponse de Peter

### Lot A — contrat Harvest

- obtenir `LanguageItems` sur `getalbum` ou le paramètre/endpoint officiel équivalent ;
- confirmer les valeurs acceptées et l’écriture de `MemberAccount.LanguageCode` ;
- documenter la résolution des templates pour reset, vérification, partage, contact et téléchargement ;
- déterminer si le contact peut recevoir une langue explicite.

### Lot B — code Parigo

- étendre `HarvestMemberSchema` et `MemberProfile` avec une langue normalisée ;
- initialiser la langue à l’inscription depuis la locale FR/EN ;
- permettre sa modification dans les réglages du compte et, si retenu, la synchroniser au changement de langue du site ;
- activer le mode régional du partage uniquement selon la recommandation Harvest ;
- conserver les fallbacks actuels album/label et ajouter des fixtures correspondant au contrat final d’album.

### Lot C — données et templates

- saisir la description française de la Library Parigo ;
- compléter progressivement les traductions d’albums ;
- créer les variantes FR et EN des templates réellement utilisés ;
- construire le template HTML global Parigo et tester son rendu dans Gmail et sur mobile ;
- faire réparer le template Contact API avant la migration du formulaire.

### Recette attendue

- album traduit : contenu, metadata et JSON-LD différents sur FR et EN ;
- label Parigo : description FR sur `/labels/...`, anglaise sur `/en/labels/...` ;
- compte FR et compte EN : vérification, reset et partage reçus dans la bonne langue ;
- contact FR/EN : variante correcte ou fallback bilingue explicitement accepté ;
- aucune régression sur les tokens, les liens HTTPS et les parcours FLEX historiques.
