# Harvest — inventaire e-mail et couverture Communications

Vérification du **10 août 2026** : réponse du support `#68617`, Harvest Admin, Gmail, Public API live, BFF et UI Parigo.

## Conclusion

- Le back-office Parigo contient **26 types** et **34 variantes** actives; deux familles optionnelles sont désactivées par leur interrupteur.
- Il n’existe aucune variante explicitement `English`; `All` sert de fallback par défaut.
- Seuls **six types** ont une variante `French`.
- La majorité des variantes utilisent encore `Parigo Music - France <Guillaume.albeck@parigomusic.com>`.
- `gethistorybycommunications` n’est pas l’inventaire des templates et n’est pas un journal global du compte. Sur le membre testé, il ne contient que cinq resets.

## Inventaire réellement visible dans Email Templates

| Groupe | Type | Langues configurées | État particulier |
| --- | --- | --- | --- |
| General | Contact Us (General) | All | expéditeur vide |
| General | Reset Password | All, French | expéditeur Guillaume sur `All`, vide sur `French` |
| General | Contact Us (API/Custom) | All | expéditeur vide; endpoint actuellement en `Code=4` |
| Member | Thank you for registering | All, French | expéditeur Guillaume |
| Member | Member Approved | All, French | expéditeur Guillaume |
| Member | Member Denied | All, French | expéditeur Guillaume |
| Member | Verify Email Address | All | aucune variante FR |
| Member | Verify Member joining Member Group | All | aucune variante FR |
| Share from Search | Member to Member Direct Playlist Delivery | All | aucune variante FR |
| Share from Search | Share Track/Album/Playlist | All | aucune variante FR |
| Share from Search | Share Music | All | aucune variante FR |
| Share from Search | Share Playlist Email | All, French | expéditeur Guillaume |
| Share from Engage | Share to Member | All, French | expéditeur Guillaume |
| Share from Engage | Share to Management User | All | aucune variante FR |
| Download | Download Request confirmation | All | interrupteur désactivé |
| Download | Download | All | aucune variante FR |
| Download | Group Download | All | aucune variante FR |
| Ecommerce | Cuesheet Payment Reciept | All | libellé Harvest orthographié ainsi |
| Ecommerce | Payment Confirmation Receipt and Invoice (PRO3/Amplify) | All | aucune variante FR |
| Ecommerce — Subscriptions | Member Subscription Successful | All | interrupteur désactivé |
| Ecommerce — Subscriptions | Member Subscription Payment Successful | All | aucune variante FR |
| Ecommerce — Subscriptions | Member Subscription Payment Failed | All | aucune variante FR |
| Ecommerce — Subscriptions | Member/Enterprise Subscription Invite to Join | All | aucune variante FR |
| Posts | Text | trois variantes All | n’utilisent pas le template global; expéditeur vide |
| Posts | Share email post from admin user to admin user | All | expéditeur Guillaume |
| Posts | Share email post from admin user to member | All | expéditeur Guillaume |

Le support mentionne aussi les résultats EDL. Aucun type portant ce nom n’est visible sur la page Parigo. Gmail prouve en outre l’existence de notifications `Member Registration for Parigo Music - FRA` et `Member Subscription Notification` envoyées aux administrateurs, sans intitulé équivalent visible parmi les 26 types configurés. Il faut donc distinguer « templates configurables visibles » et « totalité des messages système possibles ».

## Ce qui apparaît réellement dans Account > Communications

| Famille observée | E-mail reçu | Historique membre | Verdict |
| --- | --- | --- | --- |
| Reset Password | oui | oui, cinq entrées | journalisé |
| Share Playlist Email | oui, plusieurs essais dont un partage fonctionnel | non | écart Harvest confirmé |
| Member Registration | notification reçue par les administrateurs puis transférée | non vérifié sur le membre | probablement hors périmètre, car destinataire administrateur |
| Member Subscription Notification | notification reçue par Guillaume puis transférée | non | hors périmètre membre attendu |
| Contact Us (API/Custom) | non, `Code=4` | non | impossible à conclure avant réparation |
| Verify Email Address | aucune réception accessible dans le compte Gmail audité | non démontré | à tester après clarification de langue/routes |
| Download / Group Download | non déclenché volontairement | non démontré | un gros lot peut provoquer un e-mail; test non justifié pour l’audit |

La réponse live contient uniquement `Type`, `From`, `To`, `Subject`, `Date`, `Status`. Elle n’expose ni `Body`, ni `TemplateID`, ni endpoint source. L’UI Parigo restitue exactement ces champs et n’en supprime aucun.

## Demande à Harvest

1. Confirmer les événements qui alimentent l’historique membre et pourquoi le partage reçu n’y figure pas.
2. Confirmer s’il existe un historique global administrateur ou un endpoint détaillé.
3. Donner l’inventaire complet des messages système non visibles dans Email Templates, notamment inscription administrateur, abonnement/newsletter et EDL.
4. Confirmer la règle de sélection linguistique et compléter les variantes FR manquantes avant recette bilingue.
5. Standardiser l’identité visible en `Parigo Music <info@parigomusic.com>` et authentifier le domaine d’envoi.
