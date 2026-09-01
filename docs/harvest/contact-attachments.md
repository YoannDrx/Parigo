# Formulaire de contact

## Choix actuellement implémenté

Le formulaire `/contact` envoie un payload JSON à la route BFF `/api/contact`.
Le serveur valide les champs texte et le contexte éventuel d’une piste, puis
appelle exclusivement `sendcontactusemail`. Aucun enregistrement n’est créé
dans une base de données Parigo et aucune pièce jointe n’est acceptée.

## Limites Harvest constatées

`sendcontactusemail` couvre le message texte, mais aucun contrat de stockage de
brief ou de téléversement de pièce jointe n’a été identifié.

Questions à adresser à Harvest :

1. Existe-t-il un endpoint non documenté pour créer une demande de contact ou
   un brief ?
2. Accepte-t-il les fichiers en multipart ou via une URL signée ?
3. Quelles sont ses limites de formats, poids, antivirus et rétention ?
4. Retourne-t-il un identifiant de dossier et un statut consultable ?
5. Peut-il notifier l'équipe et déclencher un webhook de suivi ?
6. Dans quelles régions les documents sont-ils stockés et quel contrat RGPD
   encadre leur suppression ?

Si Harvest fournit ultérieurement ce contrat, le BFF pourra continuer à
protéger les secrets et relayer le fichier sans exposer de jeton au navigateur.
Il n’existe aucun fournisseur de repli.
