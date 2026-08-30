# Partage et fermeture de compte Harvest — 30 août 2026

## Partage de musique

Le partage Parigo s’appuie sur trois opérations distinctes :

1. `POST /getshorturl/{serviceToken}` crée une URL courte `https://hrvst.co/...` pour un lien public Parigo.
2. `POST /getsharemusicurl/{serviceToken}` crée un partage de playlist et ses permissions.
3. `POST /sendsharemusiclinkemail/{memberToken}` demande à Harvest l’envoi de l’e-mail associé.

Une création de lien réussie ne prouve pas que l’e-mail a été livré. De même, un `Code=OK` de l’opération d’envoi ne garantit pas que le contenu rendu par le template est correct. Les tests live précédents ont reçu un e-mail dont le corps contenait littéralement `[downloadlink]`, avec ou sans sélection du template par région. L’interface Parigo affiche donc toujours le lien copiable et dit « envoi demandé » tant qu’Harvest ne fournit pas de confirmation de livraison exploitable.

Questions à transmettre à Harvest après autorisation distincte :

- corriger le remplacement du placeholder `[downloadlink]` ;
- préciser si un identifiant de message, un statut de livraison ou un webhook est disponible ;
- confirmer le comportement du template global et des variantes régionales ;
- confirmer si `getshorturl` impose une durée de vie ou une politique d’invalidation.

## Fermeture de compte

La route Parigo ne laisse plus le choix entre archivage et suppression physique. Elle envoie systématiquement :

```json
{
  "Password": "<mot-de-passe-fourni>",
  "ArchiveOnly": true
}
```

Après succès, la session Parigo est supprimée et l’utilisateur ne peut plus accéder au compte. Cette stratégie est un soft delete : elle protège contre les effets de bord encore inconnus d’un hard delete Harvest sur les playlists, historiques, partages et relations de catalogue.

Le texte public ne promet pas une destruction physique immédiate des données. Il explique que l’accès est définitivement fermé et que certaines données peuvent être conservées par le prestataire lorsque la continuité du catalogue, la preuve d’une opération ou une obligation légale l’exige. Une demande d’effacement complémentaire reste possible auprès de PARIGO.

Aucun compte réel ou compte de test partagé ne doit être utilisé pour valider cette opération. Un test live nécessitera un compte jetable dédié et une autorisation explicite au moment de l’action.
