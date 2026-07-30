# Formulaire de contact et pièces jointes

## Choix actuellement implémenté

Le formulaire `/contact` envoie un `multipart/form-data` à la route BFF
`/api/contact`. Le serveur valide les champs et la pièce jointe, puis transmet
le message à `info@parigomusic.com` via Resend. Aucun enregistrement n'est créé
dans une base de données Parigo.

Formats acceptés : PDF, JPEG, PNG, WebP, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT
et RTF. La limite applicative est de 3 Mo par document. Le serveur contrôle le
nom, l'extension, le type MIME et la signature binaire lorsque le format le
permet. La pièce jointe est envoyée uniquement à l'équipe ; l'accusé visiteur
confirme son nom sans la joindre à nouveau.

## Limites Harvest constatées

La documentation et l'inventaire d'API Harvest audités ne fournissent pas de
ressource générique de contact, de stockage de briefs ou de téléversement de
pièces jointes pour ce parcours. Harvest gère le catalogue et les comptes, mais
ne peut donc pas être considéré aujourd'hui comme la source de vérité du
formulaire de contact.

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
La solution Resend actuelle reste le repli opérationnel sans base de données.
