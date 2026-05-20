# 08 - Questions ouvertes a poser a Harvest

Cette liste doit etre envoyee a Harvest avant chiffrage engageant. L'objectif n'est pas de demander "est-ce possible ?", mais d'obtenir des reponses exploitables, testables et opposables.

## Acces et environnements

1. Pouvez-vous fournir un acces staging/test pour Parigo distinct de la production ?
2. Le staging contient-il un tenant Parigo, un clone partiel ou un dataset fictif ?
3. Les credentials staging et production sont-ils separes ?
4. Les base URLs staging/prod sont-elles identiques fonctionnellement ?
5. Existe-t-il un mecanisme de reset des donnees de test ?
6. Peut-on avoir des comptes membres de test avec droits de download, playlists, shares et e-commerce si applicable ?

## Credentials necessaires

Demander explicitement :

- `HM_ServiceAPI_AuthUrl`
- `HM_ServiceAPI_URL`
- `HM_ServiceAPI_Key`
- `HM_ServiceAPI_AuthClientID`
- `HM_ServiceAPI_AuthClientSecret`
- region ID(s) Parigo de test
- compte membre test
- eventuels credentials `HM_IntegrationAPI_*` si endpoints FLEX necessaires
- eventuels credentials Export API si audit portabilite

## Authorization header

Question simple :

```text
Should the Authorization header be sent as "Bearer {access_token}" or as the raw access token value returned by Get Authorised?
```

## Parite FLEX / Public API

Demander :

1. Les endpoints de la documentation FLEX sont-ils tous utilisables par un front custom externe Parigo ?
2. Existe-t-il des endpoints FLEX-only ou internes non accessibles aux integrateurs ?
3. Les endpoints suivants sont-ils officiellement supportes hors FLEX : `getrelatedplaylists`, `getsimilartracks`, `getrightholders` pagine, `getsubscriptionplans`, `getratesbytags`, `previewinvoice`, `updateinvoice`, `validatecoupon`, `validatepromocode`, `SetMemberSession` ?
4. Les payloads `cloudsearch` documentes dans FLEX sont-ils contractuellement supportes ?

## Donnees Parigo

1. Tout le catalogue Parigo est-il stocke dans Harvest ?
2. Les masters audio, previews MP3, artworks, waveforms/datapoints et stems sont-ils tous accessibles via API ?
3. Quels objets sont accessibles : tracks, albums, libraries, collections, playlists, right holders, lyrics, categories, styles, keywords ?
4. Quels objets utilisateurs sont exportables : members, playlists, favourites, tags, comments, saved searches, history, shares, invoices ?
5. Quels champs custom Parigo existent dans Harvest ?
6. Quels identifiants sont stables dans le temps ?
7. Les suppressions sont-elles soft delete ou hard delete ?
8. Les timestamps `createdAt` / `updatedAt` sont-ils exposes ?

## Search

1. Cloud Search est-il active sur le compte Parigo ?
2. Quels champs sont indexes ?
3. Quel est le delai d'indexation apres ajout/modification d'un track ?
4. Quels `SearchTermBundle` sont supportes sur le compte Parigo ?
5. Quels facets sont disponibles ?
6. Quels tris sont disponibles ?
7. Quelle est la limite maximale `Limit` par recherche ?
8. `SaveSearchHistory=true` a-t-il un impact RGPD ou reporting ?

## Similarity / IA

1. AIMS est-il active pour Parigo ?
2. Cyanite est-il active ?
3. Harmix est-il active ?
4. Le catalogue Parigo est-il deja indexe ?
5. L'index inclut-il uniquement les main versions ou aussi alternates/underscores/stems ?
6. Quels couts par requete/upload/ingestion ?
7. Quels formats sont acceptes par provider ?
8. Quels providers supportent YouTube, Spotify, TikTok, Vimeo, Apple Music, SoundCloud ?
9. Les recherches par segment `Start`/`Duration` sont-elles actives ?

## Assets et downloads

1. Quelle est la duree de vie des Asset URLs ?
2. Les URLs sont-elles signees ?
3. Peut-on mettre en cache les artworks ? Les streams ? Les waveforms ?
4. Les waveform datapoints JSON sont-ils preferables aux images generees ?
5. Quels formats de download sont immediats pour Parigo ?
6. Les WAV/AIFF Parigo sont-ils tous presents au repository ?
7. Les stems sont-ils disponibles ? Sous quel format ?
8. Comment suivre un download asynchrone ajoute a la queue ?

## Export / reversibilite

1. Peut-on exporter l'integralite des metadata Parigo ?
2. Peut-on exporter les assets audio et artworks ?
3. L'export inclut-il playlists, members, favourites, tags, comments, histories, invoices ?
4. Formats disponibles : CSV, JSON, XML, ZIP, S3, FTP ?
5. L'export peut-il etre automatise ?
6. Quelles limites de volume et delais ?
7. Quels couts ?
8. Qui est proprietaire des enrichissements metadata faits dans Harvest ?

## Exploitation

1. Existe-t-il un changelog API ?
2. Existe-t-il une politique de versioning/deprecation ?
3. Existe-t-il une collection Postman exportable avec environnements ?
4. Existe-t-il un schema OpenAPI ?
5. Des request IDs/correlation IDs sont-ils retournes ?
6. Quel support technique developpeur est disponible ?
7. Quel SLA pour l'API et les assets ?
8. Les maintenances sont-elles annoncees ?

## Message court a envoyer

```text
Hi Simon,

Thanks for sharing the Harvest and FLEX developer portals. I have reviewed both Postman documentations and can start an initial technical assessment.

To run safe smoke tests without impacting production, could your team please provide:

- staging/test credentials if available;
- HM_ServiceAPI_AuthUrl, HM_ServiceAPI_URL, HM_ServiceAPI_Key, client_id and client_secret;
- confirmation of the expected Authorization header format;
- one test RegionID and one test member account;
- confirmation that the endpoints and request payloads shown in the FLEX documentation are available to an external custom Parigo front-end, or a list of exceptions;
- a technical contact for API questions during the assessment.

For this first phase I only need read/search access and safe test-member actions. No production writes are required.

Best,
Yoann
```
