# Affectation des photos Parigo

Dernière mise à jour : 28 août 2026.

Ce tableau décrit les usages éditoriaux actifs du site. La page **Moods Photo**, qui sert de catalogue et d’archive de validation, n’est pas comptée comme un usage éditorial.

| Photo | Page ou parcours actif | Rôle dans l’interface | Réutilisation |
|---|---|---|---|
| **R01V1** | Home, section « Qui sommes-nous ? » | Image institutionnelle de la section About de l’accueil | Une page, deux cadrages art-directés desktop/mobile |
| **R02V1 retravaillée** | Login | Visuel du panneau de connexion | Un parcours ; reste visible lorsque l’utilisateur rebascule vers Login depuis Register |
| **R03V1** | Contact | Façade dans le split screen, à côté du formulaire | Une page, deux cadrages desktop/mobile |
| **R09V1** | Aucune page éditoriale active | Ancien visuel de création de compte, remplacé par R15V1 | **Inutilisée sur le site**, conservée en master HD et dans Moods Photo |
| **R11V1** | Forgot Password | Visuel de récupération d’accès | Une page |
| **R13V2** | Reset Password et Change Password | R13V1 retravaillée avec la pochette officielle Hexahedre affinée et le vrai cadre Parigo | **Partagée par deux URLs**, qui utilisent la même expérience sécurisée |
| **R14V3** | À propos | Image principale du récit institutionnel | Une page |
| **R15V1** | Créer un compte / Register | Visuel du panneau d’inscription | Une page, deux cadrages portrait/paysage |
| **R15V2** | Aucune page éditoriale active | Ancien visuel Reset/Change, remplacé par R13V2 | **Inutilisée sur le site**, conservée en master HD et dans Moods Photo |

## Routes concernées

- Home : `/`
- Login : `/login`
- Créer un compte : `/register`
- Forgot Password : `/forgot-password`
- Reset Password : `/reset-password?token=…` et `/reset-password/[token]`
- Change Password : `/change-password/[token]`
- Contact : `/contact`
- À propos : `/about`

## Dérivés Web

Les masters HD restent intacts dans `~/Downloads/Parigo-HD-a-recropper-2026-08-27/`. Les versions AVIF optimisées utilisées par le site se trouvent dans `public/images/editorial/parigo-selected/`.
