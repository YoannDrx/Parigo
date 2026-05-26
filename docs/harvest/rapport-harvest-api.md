# Rapport technique Harvest Media API pour Parigo

Compte-rendu lisible en Markdown de l exploration complete de la documentation Harvest Media API publique, restructure comme le dossier AIMS: rapport Markdown, HTML imprimable, PDF et inventaire CSV des endpoints.

## Sources

| Source | Valeur |
| --- | --- |
| Documentation publique | https://developer.harvestmedia.net/ |
| Collection Postman | 1fdbc3d4-864c-498a-ae3e-ae52d2c5b256 |
| Published ID | SVYouLCf |
| Version tag | latest |
| Version Documenter | 8.11.2 |
| Publication indiquee par Postman | 2020-06-29T04:04:49.000Z |
| Extraction | 26 mai 2026 |

La cle Postman fournie dans la conversation n a pas ete stockee ni utilisee: la collection publique expose deja la documentation necessaire.

## Synthese

Harvest Media API couvre quatre familles techniques: `Public API`, `Export API`, `Import API` et `Agent API / Integration API`. Pour Parigo, la Public API est le socle naturel d un front custom: catalogue, recherche, autocomplete, membres, playlists, downloads, assets, partage, historiques, tags, commentaires et e-commerce.

Le flux d integration n est pas un REST public direct. Il repose sur un access token OAuth, un service token, puis des member tokens ou guest member tokens regionalises. Les secrets, access tokens, service tokens et access keys doivent rester cote serveur.

| Metrique | Valeur |
| --- | --- |
| Entrees documentees | 277 |
| Endpoints HTTP | 255 |
| Pages INFO / guides | 22 |
| Routes HTTP methode + chemin uniques | 222 |
| GET / POST / DELETE | 112 / 140 / 3 |

## APIs couvertes

| API | Role | Entrees |
| --- | --- | --- |
| Public API | Recherche front/catalogue, metadata, assets, members, playlists, downloads, sharing, history, tagging, comments, saved searches, e-commerce et quelques fonctions admin. | 196 |
| Export API | Livraison de contenu vers clients, reseaux et tiers; acces workspace, metadata, audio/downloads, tags et categories. | 22 |
| Import API | Ingestion de contenu: labels/libraries, albums, tracks, stems, assets, publication/unpublication dans un workspace. | 38 |
| Agent API / Integration API | Flux workspace/agent pour recuperer bibliotheques, albums, tracks, downloads management user et tags. | 17 |
| Additional Information | Glossaire, codes fonctionnels, rate limits et health endpoint. | 4 |

## Flux d authentification

| Etape | Endpoint | Ce que Parigo doit faire |
| --- | --- | --- |
| 1. Access token | `POST {HM_ServiceAPI_AuthUrl}` | Envoyer `grant_type=client_credentials`, `client_id`, `client_secret`; conserver la reponse cote serveur. |
| 2. Service token | `GET {HM_ServiceAPI_URL}/getservicetoken` | Appeler avec `Authorization` et `AccessKey`; cache serveur avec expiration. |
| 3. Service info | `GET /getserviceinfo/{serviceToken}` | Lire les URLs asset/download/stream et les formats disponibles. |
| 4. Region | `GET /getregionbyip` ou `/getregions` | Determiner la region catalogue ou proposer un choix. |
| 5. Guest/member token | `GET /getguestmembertoken` ou `POST /getmembertoken` | Obtenir le token utilise par la recherche et les actions front. |
| 6. Appels metier | `/cloudsearch`, `/autocomplete`, `/gettracks`, playlists, downloads | Toutes les operations front passent par un token membre ou guest selon le contexte. |

## Capacites principales pour Parigo

### Recherche et barre IA

| Besoin | Capacite Harvest |
| --- | --- |
| Recherche catalogue | `POST /cloudsearch/{memberToken}` interroge tracks, albums, libraries, styles, categories, rightholders, duration, BPM et recherche dans les resultats. |
| Autocomplete | `POST /autocomplete/{memberToken}` suggere des termes sur tracks, albums, labels/libraries, styles, categories, rightholders, lyrics, keywords et featured playlists. |
| Similarite par piste | AIMS, Cyanite et Harmix documentent une recherche par TrackID via `cloudsearch` avec `SearchFilters.SearchTermBundle.St_Audio`. |
| Similarite par upload audio | Flux presigned upload: `getpresigneduploadurl`, PUT fichier vers l URL signee, `confirmpresignedupload`, puis `cloudsearch`. |
| Similarite par URL | AIMS et Harmix utilisent `getexternalaudiobyurl` puis `cloudsearch`; Cyanite ajoute un suivi de statut `getexternalaudiostatus`. |
| Prompt / free text | AIMS et Harmix documentent une recherche `Prompt`; Cyanite documente une variante `Free Text`. Activation contractuelle a confirmer. |
| Options IA | Les exemples mentionnent `Evoke_IncludeSeed`, `Evoke_PrioritizeBPM`, `Evoke_SuppressVocals`, `Start`, `Duration`, `Skip`, `Limit`. |

### Catalogue, assets et tracking

| Bloc | Possibilites |
| --- | --- |
| Service info | Expose les Asset URLs et formats: stream, artwork, waveform, thumbnails, download URL, direct download selon configuration. |
| Metadata | Lire libraries, styles, albums, album tracks, top tracks, categories, rightholders, playlists edito, shared playlist et cuesheets. |
| Assets | Harvest demande d utiliser les URLs fournies par service/member info pour conserver le tracking d usage. |
| Downloads | Validation, generation de download, suivi d un download, stems et formats; certains downloads sont immediats, d autres passent par file/email. |
| Region | Catalogue et guest token dependent de la region; prevoir un cache par region et une detection IP cote serveur. |

### Comptes, activite et e-commerce

| Bloc | Possibilites |
| --- | --- |
| Membres | Register, validation username/email, verification, login, persistent login, SSO, profil, image, suppression, reset password, subscribe. |
| Member groups | Regions, productions, production categories/playlists, approbations et recherche dans les playlists de production. |
| Playlists membre | CRUD categories/playlists, image upload, reorder, archive/restore, duplicate, copy featured playlist, publish, tracks, shares, schedules et Disco. |
| Activite | Favourites, sharing, accept share, audition history, download history, communication history, tags, comments, saved searches. |
| E-commerce | Rates, special rates, invoice create/get/search/void/pay et download de document invoice. |
| Admin limite | Management token et update member group. |

## Architecture recommandee

| Couche | Regle |
| --- | --- |
| Navigateur Parigo | Ne jamais exposer `client_secret`, `AccessKey`, access token, service token ou management token. |
| Next.js serveur | Centraliser auth Harvest, cache token, region, guest/member token, retries et normalisation. |
| Recherche | Frontend -> route Parigo -> `cloudsearch` / `autocomplete`; garder le mapping de resultats cote Parigo. |
| Assets | Relayer ou signer selon les Asset URLs renvoyees par Harvest; tester TTL/cache et tracking. |
| Downloads | Toujours valider les droits via Harvest avant d exposer un lien/ticket de download. |
| IA/similarite | Feature flag par provider, monitoring latence/couts, fallback recherche metadata si provider indisponible. |

## Endpoints majeurs

L inventaire exhaustif est dans [endpoint-inventory.csv](./endpoint-inventory.csv). La table ci-dessous isole les endpoints a connaitre en premier pour cadrer Parigo.

| Endpoint | Methode | Route | Usage |
| --- | --- | --- | --- |
| Get Authorised | POST | {HM_ServiceAPI_AuthUrl} | OAuth client_credentials vers access_token. |
| Get Service Token | GET | {HM_ServiceAPI_URL}/getservicetoken | Service token Harvest, a conserver cote serveur. |
| Get Service Info | GET | {HM_ServiceAPI_URL}/getserviceinfo/{serviceToken} | URLs assets, formats, endpoints download/stream et infos search similar. |
| Get Region By IP | GET | {HM_ServiceAPI_URL}/getregionbyip/{serviceToken} | Regionalisation catalogue par IP. |
| Authenticate Guest Member | GET | {HM_ServiceAPI_URL}/getguestmembertoken/{serviceToken}/{RegionID} | Member token visiteur pour recherche/front. |
| Cloud Search | POST | {HM_ServiceAPI_URL}/cloudsearch/{memberToken} | Recherche principale metadata, filtres, resultats et similarite IA. |
| Predictive Search | POST | {HM_ServiceAPI_URL}/autocomplete/{memberToken} | Suggestions de recherche. |
| Get Tracks | POST | {HM_ServiceAPI_URL}/gettracks/{memberToken} | Recuperation metadata pistes et enrichissements. |
| Get Music Download | POST | {HM_ServiceAPI_URL}/getmusicdownload/{memberToken} | Demande de download et tokens/liens de telechargement. |
| Register Member | POST | {HM_ServiceAPI_URL}/registermember/{serviceToken} | Creation de compte membre. |
| Authenticate Member | POST | {HM_ServiceAPI_URL}/getmembertoken/{serviceToken} | Login membre et persistent login optionnel. |
| Export Get Access Token | GET | {HM_ExportAPI_URL}/getaccesstoken/{key} | Ouverture d un flux Export API. |
| Import Create Track | POST | {HM_ImportAPI_URL}/track/{sessionToken}/insert | Ingestion track dans le workspace. |
| Agent Get Management User Download | POST | {HM_IntegrationAPI_URL}/getmanagementuserdownload/{token} | Download workspace via management user. |

## Public API - Auth, service, regions, contenu, e-commerce, admin

| Section | Endpoint | Methode | Route | Inputs principaux |
| --- | --- | --- | --- | --- |
| Public API > Getting Started | Get Authorised | `POST` | `{HM_ServiceAPI_AuthUrl}` | grant_type, client_id, client_secret |
| Public API > Getting Started | Get Service Token | `GET` | `{HM_ServiceAPI_URL}/getservicetoken` |  |
| Public API > Getting Started | Validate Service Token | `GET` | `{HM_ServiceAPI_URL}/getservicetokeninfo/{HM_ServiceAPI_Token}` |  |
| Public API > Getting Started | Expire Service Token | `GET` | `{HM_ServiceAPI_URL}/expiretoken/{HM_ServiceAPI_Token}` |  |
| Public API > Service Information | Get Service Info (Service Asset URLs and File Formats) | `GET` | `{HM_ServiceAPI_URL}/getserviceinfo/{HM_ServiceAPI_Token}` |  |
| Public API > Service Information | Get Service Attributes | `GET` | `{HM_ServiceAPI_URL}/getserviceattribute/{HM_ServiceAPI_Token}/{attributeTypeCode}` |  |
| Public API > Service Information | Get Short URL | `POST` | `{HM_ServiceAPI_URL}/getshorturl/{HM_ServiceAPI_Token}` |  |
| Public API > Regions & Countries | Get Regions | `GET` | `{HM_ServiceAPI_URL}/getregions/{HM_ServiceAPI_Token}` |  |
| Public API > Regions & Countries | Get Region | `GET` | `{HM_ServiceAPI_URL}/getregion/{HM_ServiceAPI_Token}/{RegionID}` |  |
| Public API > Regions & Countries | Get Regions By IP | `GET` | `{HM_ServiceAPI_URL}/getregionbyip/{HM_ServiceAPI_Token}?ip={IP}` |  |
| Public API > Regions & Countries | Get Countries | `GET` | `{HM_ServiceAPI_URL}/getcountries/{HM_ServiceAPI_Token}` |  |
| Public API > Guest Management | Authenticate Guest Member | `GET` | `{HM_ServiceAPI_URL}/getguestmembertoken/{HM_ServiceAPI_Token}/{Region_ID}` |  |
| Public API > Content Management | Get Web Content | `GET` | `{HM_ServiceAPI_URL}/getwebcontent/{HM_ServiceAPI_Token}/{Code}/{RegionID}` |  |
| Public API > Content Management | Get Web Content Children | `GET` | `{HM_ServiceAPI_URL}/getchildwebcontent/{HM_ServiceAPI_Token}/{ParentCode}/{RegionID}` |  |
| Public API > Ecommerce > Rates | Get Rates | `GET` | `{HM_ServiceAPI_URL}/getrates/{HM_ServiceAPI_Token}/{Style}/{CurrencyCode}` |  |
| Public API > Ecommerce > Rates | Get Special Rate | `GET` | `{HM_ServiceAPI_URL}/getspecialratebycode/{HM_ServiceAPI_Token}/{SpecialRateCode}/{CurrencyCode}` |  |
| Public API > Ecommerce > Invoices | Create Invoice | `POST` | `{HM_ServiceAPI_URL}/addinvoice/{HM_ServiceAPI_MemberToken}` | invoice, invoice.invoicelineitems, invoice.invoicelineitems[].quantity, invoice.invoicelineitems[].amount, invoice.invoicelineitems[].amounttax, invoice.invoicelineitems[].description, invoice.invoicelineitems[].discountid, invoice.invoicelineitems[].discount, invoice.invoicelineitems[].invoiceitemreferences, invoice.invoicelineitems[].invoiceitemreferences[].referenceid, ... (+19) |
| Public API > Ecommerce > Invoices | Get Invoice | `POST` | `{HM_ServiceAPI_URL}/getinvoice/{HM_ServiceAPI_MemberToken}` | invoiceid, returntracks, returnrates, returndiscounts |
| Public API > Ecommerce > Invoices | Void Invoice | `POST` | `{HM_ServiceAPI_URL}/voidinvoice/{HM_ServiceAPI_MemberToken}` | invoiceid, reason |
| Public API > Ecommerce > Invoices | Search Invoice | `POST` | `{HM_ServiceAPI_URL}/searchinvoices/{HM_ServiceAPI_MemberToken}` | fromamount, fromdate, toamount, todate, limit, skip |
| Public API > Ecommerce > Invoices | Pay Invoice | `POST` | `{HM_ServiceAPI_URL}/payinvoice/{HM_ServiceAPI_MemberToken}` | invoicepayment, invoicepayment.invoiceid, invoicepayment.amount, invoicepayment.contactname, invoicepayment.date, invoicepayment.paymenttype, invoicepayment.paymentreferencenumber, invoicepayment.paymentstatus, sendemail, bccemail |
| Public API > Ecommerce > Invoices | Get Invoice Document | `GET` | `{HM_ServiceAPI_URL}/getinvoicedownloadurl/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_InvoiceID}` |  |
| Public API > Admin Management > Authentication | Authenticate Management Token | `POST` | `{HM_ServiceAPI_URL}/getmanagementtoken/{HM_ServiceAPI_Token}` |  |
| Public API > Admin Management > Member Groups | Update Member Group Details | `POST` | `{HM_ServiceAPI_URL}/updatemembergroup/{HM_ServiceAPI_ManagementToken}/{MemberGroupID}` |  |

## Public API - Catalogue et metadata

| Section | Endpoint | Methode | Route | Inputs principaux |
| --- | --- | --- | --- | --- |
| Public API > Accessing Metadata > Libraries | Get Labels/Libraries | `GET` | `{HM_ServiceAPI_URL}/getlibraries/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Accessing Metadata > Libraries | Get Labels/Libraries (Include Inactive) | `GET` | `{HM_ServiceAPI_URL}/getlibraries/{HM_ServiceAPI_MemberToken}/includeinactive` |  |
| Public API > Accessing Metadata > Libraries | Get Label/Library | `GET` | `{HM_ServiceAPI_URL}/getlibrary/{HM_ServiceAPI_MemberToken}/{LibraryID}?returnCodes={returnCodes}` |  |
| Public API > Accessing Metadata > Styles | Get Style Groups | `GET` | `{HM_ServiceAPI_URL}/getstylegroups/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Accessing Metadata > Styles | Get Styles | `GET` | `{HM_ServiceAPI_URL}/getstyles/{HM_ServiceAPI_MemberToken}?groupID={GroupID}&allowEmptyStyle=false` |  |
| Public API > Accessing Metadata > Styles | Get Styles By Language Code | `GET` | `{HM_ServiceAPI_URL}/getstyles/{HM_ServiceAPI_MemberToken}/{LanguageCode}?groupID={GroupID}` |  |
| Public API > Accessing Metadata > Albums | Get Albums By Label/Library | `GET` | `{HM_ServiceAPI_URL}/getalbums/{HM_ServiceAPI_MemberToken}/{LibraryID}` |  |
| Public API > Accessing Metadata > Albums | Get Albums By Label/Library (Include Inactive) | `GET` | `{HM_ServiceAPI_URL}/getalbums/{HM_ServiceAPI_MemberToken}/{LibraryID}/includeinactive` |  |
| Public API > Accessing Metadata > Albums | Get Albums By Style | `POST` | `{HM_ServiceAPI_URL}/getalbumsbystyles/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Accessing Metadata > Albums | Get Albums By Album | `POST` | `{HM_ServiceAPI_URL}/getalbumsbyids/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Accessing Metadata > Albums | Get Featured Albums | `GET` | `{HM_ServiceAPI_URL}/getfeaturedalbums/{HM_ServiceAPI_MemberToken}/{Top}?returntrackcount={returnTrackCount}&mainonly={mainOnly}&sort={sortorder}` |  |
| Public API > Accessing Metadata > Albums | Get Latest Albums | `GET` | `{HM_ServiceAPI_URL}/getlatestalbums/{HM_ServiceAPI_MemberToken}/{Top}` |  |
| Public API > Accessing Metadata > Albums | Get Album | `GET` | `{HM_ServiceAPI_URL}/getalbum/{HM_ServiceAPI_MemberToken}/{AlbumID}?returnLibraryCodes={returnLibraryCodes}` |  |
| Public API > Accessing Metadata > Albums | Get Album Tracks | `GET` | `{HM_ServiceAPI_URL}/getalbumtracks/{HM_ServiceAPI_MemberToken}/{AlbumID}/mainonly?skip={skip}&limit={limit}` |  |
| Public API > Accessing Metadata > Albums | Get Album Tracks (Include Inactive) | `GET` | `{HM_ServiceAPI_URL}/getalbumtracks/{HM_ServiceAPI_MemberToken}/{AlbumID}/includeinactive?skip={skip}&limit={limit}` |  |
| Public API > Accessing Metadata > Tracks | Get Tracks | `POST` | `{HM_ServiceAPI_URL}/gettracks/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Accessing Metadata > Tracks | Get Top Tracks | `POST` | `{HM_ServiceAPI_URL}/gettoptracks/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Accessing Metadata > Categories | Get Categories | `GET` | `{HM_ServiceAPI_URL}/getcategories/{HM_ServiceAPI_MemberToken}/hasactivetrackonly?languagecode={LanguageCode}` |  |
| Public API > Accessing Metadata > Right Holders | Get Rightholders By Track | `GET` | `{HM_ServiceAPI_URL}/getrightholders/{HM_ServiceAPI_MemberToken}/{TrackID}` |  |
| Public API > Accessing Metadata > Featured Playlist Categories & Playlists > Playlist Categories | Get Featured Playlist Categories | `GET` | `{HM_ServiceAPI_URL}/getfeaturedplaylistcategories/{HM_ServiceAPI_MemberToken}?returnplaylistcount={HM_ServiceAPI_ShowCounts}&skip={HM_ServiceAPI_Skip}&limit={HM_ServiceAPI_Limit}&sort={HM_ServiceAPI_PlaylistSortOrder}` |  |
| Public API > Accessing Metadata > Featured Playlist Categories & Playlists > Playlist Categories | Get Featured Playlist Categories & Playlists | `GET` | `{HM_ServiceAPI_URL}/getfeaturedplaylistcategoriesandplaylists/{HM_ServiceAPI_MemberToken}?returnplaylistcount={HM_ServiceAPI_ShowCounts}&returntrackcount={HM_ServiceAPI_ShowCounts}&returnrootobjectsonly={HM_ServiceAPI_ShowCounts}&playlistcategoryid={HM_ServiceAPI_NewMemberPlaylistCategoryID}&skip={HM_ServiceAPI_Skip}&limit={HM_ServiceAPI_Limit}&sort={HM_ServiceAPI_PlaylistSortOrder}` |  |
| Public API > Accessing Metadata > Featured Playlist Categories & Playlists > Playlists | Get Featured Playlists | `GET` | `{HM_ServiceAPI_URL}/getfeaturedplaylistsplaylistonly/{HM_ServiceAPI_MemberToken}?showtrackcount={ShowTrackCount}&skip={Skip}&limit={Limit}&languagecode={LanguageCode}&style={StyleID}` |  |
| Public API > Accessing Metadata > Featured Playlist Categories & Playlists > Playlists | Get Featured Playlist | `POST` | `{HM_ServiceAPI_URL}/getfeaturedplaylistandtracks/{HM_ServiceAPI_MemberToken}/{PlaylistID}` |  |
| Public API > Accessing Metadata > Featured Playlist Categories & Playlists > Playlists | Search Featured Playlist Tracks | `POST` | `{HM_ServiceAPI_URL}/searchfeaturedplaylisttracks/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_FeaturedPlaylistID}` | Keyword, Fields, ReturnTrackCount, Skip, Limit, OrderBy |
| Public API > Accessing Metadata > Shared Playlists | Get Shared Playlist | `GET` | `{HM_ServiceAPI_URL}/getsharedplaylistwithmembertoken/{HM_ServiceAPI_MemberToken}/{PlaylistID}?Skip={Skip}&Limit={Limit}` |  |
| Public API > Accessing Metadata > Cuesheets | Get Generated Cuesheet | `POST` | `{HM_ServiceAPI_URL}/getcuesheet/{HM_ServiceAPI_MemberToken}?filename={Filename}` |  |

## Public API - Recherche et similarite

| Section | Endpoint | Methode | Route | Inputs principaux |
| --- | --- | --- | --- | --- |
| Public API > Searching Metadata > Search | Search | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Searching Metadata > Search | Predictive Search | `POST` | `{HM_ServiceAPI_URL}/autocomplete/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Searching Metadata > Search Similar > AIMS > Similarity (By TrackID) | Search Similar Tracks (By TrackID) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` | SearchFilters, SearchFilters.SearchTermBundle, SearchFilters.SearchTermBundle.St_Audio, SearchFilters.SearchTermBundle.St_Audio.Audio, SearchFilters.SearchTermBundle.St_Audio.Audio[].TrackID, SearchFilters.SearchTermBundle.St_Audio.Start, SearchFilters.SearchTermBundle.St_Audio.Duration, SearchFilters.ResultView, SearchFilters.ResultView.Sort_Predefined, SearchFilters.ResultView.Evoke_IncludeSeed, ... (+3) |
| Public API > Searching Metadata > Search Similar > AIMS > Similarity (By Audio File Upload) | Get Audio File Upload URL | `POST` | `{HM_ServiceAPI_URL}/getpresigneduploadurl/{HM_ServiceAPI_MemberToken}` | AssetType, FileName, ContentType, ExpiresInSeconds, ObjectId |
| Public API > Searching Metadata > Search Similar > AIMS > Similarity (By Audio File Upload) | Confirm Audio File Upload Complete | `POST` | `{HM_ServiceAPI_URL}/confirmpresignedupload/{HM_ServiceAPI_MemberToken}` | AssetType, FileName, ReturnWaveformDatapoints, ReturnWaveformDatapointsUrl, ObjectId |
| Public API > Searching Metadata > Search Similar > AIMS > Similarity (By Audio File Upload) | Search Similar Tracks (By Audio File Upload) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` | SearchFilters, SearchFilters.SearchTermBundle, SearchFilters.SearchTermBundle.St_Audio, SearchFilters.SearchTermBundle.St_Audio.Audio, SearchFilters.SearchTermBundle.St_Audio.Audio[].Url, SearchFilters.SearchTermBundle.St_Audio.Audio[].Type, SearchFilters.SearchTermBundle.St_Audio.Audio[].Start, SearchFilters.SearchTermBundle.St_Audio.Audio[].Duration, SearchFilters.ResultView, SearchFilters.ResultView.Sort_Predefined, ... (+4) |
| Public API > Searching Metadata > Search Similar > AIMS > Similarity (By URL) | Get External Audio File | `POST` | `{HM_ServiceAPI_URL}/getexternalaudiobyurl/{HM_ServiceAPI_MemberToken}` | Url, Type, ReturnWaveformDataPoints, ReturnWaveformDataPointsUrl |
| Public API > Searching Metadata > Search Similar > AIMS > Similarity (By URL) | Search Similar Tracks (By URL) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` | SearchFilters, SearchFilters.SearchTermBundle, SearchFilters.SearchTermBundle.St_Audio, SearchFilters.SearchTermBundle.St_Audio.Audio, SearchFilters.SearchTermBundle.St_Audio.Audio[].Url, SearchFilters.SearchTermBundle.St_Audio.Audio[].Type, SearchFilters.SearchTermBundle.St_Audio.Audio[].Start, SearchFilters.SearchTermBundle.St_Audio.Audio[].Duration, SearchFilters.ResultView, SearchFilters.ResultView.Sort_Predefined, ... (+4) |
| Public API > Searching Metadata > Search Similar > AIMS > Similarity (By Prompt) | Search Similar Tracks (By Prompt) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Searching Metadata > Search Similar > CYANITE > Similarity (By TrackID) | Search Similar Tracks (By TrackID) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Searching Metadata > Search Similar > CYANITE > Similarity (By Uploaded Audio File) | Get Audio File Upload URL | `POST` | `{HM_ServiceAPI_URL}/getpresigneduploadurl/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Searching Metadata > Search Similar > CYANITE > Similarity (By Uploaded Audio File) | Confirm Audio File Upload Complete | `POST` | `{HM_ServiceAPI_URL}/confirmpresignedupload/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Searching Metadata > Search Similar > CYANITE > Similarity (By Uploaded Audio File) | Get External Audio File Ingestion Status | `POST` | `{HM_ServiceAPI_URL}/getexternalaudiostatus/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Searching Metadata > Search Similar > CYANITE > Similarity (By Uploaded Audio File) | Search Similar Tracks (By Audio File Upload) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Searching Metadata > Search Similar > CYANITE > Similarity (By URL) | Get External Audio File Ingestion Status | `POST` | `{HM_ServiceAPI_URL}/getexternalaudiostatus/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Searching Metadata > Search Similar > CYANITE > Similarity (By URL) | Search Similar Tracks (By URL) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Searching Metadata > Search Similar > CYANITE > Similarity (By Free Text) | Search Similar Tracks (By Free Text) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Searching Metadata > Search Similar > HARMIX > Similarity (By Track ID) | Search Similar Tracks (By TrackID) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` | SearchFilters, SearchFilters.SearchTermBundle, SearchFilters.SearchTermBundle.St_Audio, SearchFilters.SearchTermBundle.St_Audio.Audio, SearchFilters.SearchTermBundle.St_Audio.Audio[].TrackID, SearchFilters.SearchTermBundle.St_Audio.Start, SearchFilters.SearchTermBundle.St_Audio.Duration, SearchFilters.ResultView, SearchFilters.ResultView.Sort_Predefined, SearchFilters.ResultView.Evoke_IncludeSeed, ... (+4) |
| Public API > Searching Metadata > Search Similar > HARMIX > Similarity (By Audio File Upload) | Get Audio File Upload URL | `POST` | `{HM_ServiceAPI_URL}/getpresigneduploadurl/{HM_ServiceAPI_MemberToken}` | AssetType, FileName, ContentType, ExpiresInSeconds, ObjectId |
| Public API > Searching Metadata > Search Similar > HARMIX > Similarity (By Audio File Upload) | Confirm Audio File Upload Complete | `POST` | `{HM_ServiceAPI_URL}/confirmpresignedupload/{HM_ServiceAPI_MemberToken}` | AssetType, FileName, ReturnWaveformDatapoints, ReturnWaveformDatapointsUrl, ObjectId |
| Public API > Searching Metadata > Search Similar > HARMIX > Similarity (By Audio File Upload) | Search Similar Tracks (By Audio File Upload) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` | SearchFilters, SearchFilters.SearchTermBundle, SearchFilters.SearchTermBundle.St_Audio, SearchFilters.SearchTermBundle.St_Audio.Audio, SearchFilters.SearchTermBundle.St_Audio.Audio[].Url, SearchFilters.SearchTermBundle.St_Audio.Audio[].Type, SearchFilters.SearchTermBundle.St_Audio.Audio[].Start, SearchFilters.SearchTermBundle.St_Audio.Audio[].Duration, SearchFilters.ResultView, SearchFilters.ResultView.Sort_Predefined, ... (+5) |
| Public API > Searching Metadata > Search Similar > HARMIX > Similarity (By URL) | Get External Audio File | `POST` | `{HM_ServiceAPI_URL}/getexternalaudiobyurl/{HM_ServiceAPI_MemberToken}` | Url, Type, ReturnWaveformDataPoints, ReturnWaveformDataPointsUrl |
| Public API > Searching Metadata > Search Similar > HARMIX > Similarity (By URL) | Search Similar Tracks (By URL) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` | SearchFilters, SearchFilters.SearchTermBundle, SearchFilters.SearchTermBundle.St_Audio, SearchFilters.SearchTermBundle.St_Audio.Audio, SearchFilters.SearchTermBundle.St_Audio.Audio[].Url, SearchFilters.SearchTermBundle.St_Audio.Audio[].Type, SearchFilters.SearchTermBundle.St_Audio.Audio[].Start, SearchFilters.SearchTermBundle.St_Audio.Audio[].Duration, SearchFilters.ResultView, SearchFilters.ResultView.Sort_Predefined, ... (+4) |
| Public API > Searching Metadata > Search Similar > HARMIX > Similarity (By Prompt) | Search Similar Tracks (By Prompt) | `POST` | `{HM_ServiceAPI_URL}/cloudsearch/{HM_ServiceAPI_MemberToken}` | SearchFilters, SearchFilters.SearchTermBundle, SearchFilters.SearchTermBundle.St_Audio, SearchFilters.SearchTermBundle.St_Audio.Audio, SearchFilters.SearchTermBundle.St_Audio.Audio[].Prompt, SearchFilters.SearchTermBundle.St_Audio.Start, SearchFilters.SearchTermBundle.St_Audio.Duration, SearchFilters.ResultView, SearchFilters.ResultView.Sort_Predefined, SearchFilters.ResultView.Evoke_IncludeSeed, ... (+4) |

## Public API - Member management

| Section | Endpoint | Methode | Route | Inputs principaux |
| --- | --- | --- | --- | --- |
| Public API > Member Management > Registration | Register Member | `POST` | `{HM_ServiceAPI_URL}/registermember/{HM_ServiceAPI_Token}` |  |
| Public API > Member Management > Registration | Validate Username | `POST` | `{HM_ServiceAPI_URL}/validateusername/{HM_ServiceAPI_Token}` |  |
| Public API > Member Management > Registration | Validate Email | `POST` | `{HM_ServiceAPI_URL}/validatememberemail/{HM_ServiceAPI_Token}` |  |
| Public API > Member Management > Verification | Send Verify Member Link Email | `POST` | `{HM_ServiceAPI_URL}/sendmemberverifylinkemail/{HM_ServiceAPI_Token}` |  |
| Public API > Member Management > Verification | Validate Verify Member Token | `GET` | `{HM_ServiceAPI_URL}/validateverifymembertoken/{HM_ServiceAPI_Token}/{VerifyMemberToken}` |  |
| Public API > Member Management > Verification | Verify Member | `POST` | `{HM_ServiceAPI_URL}/verifymember/{HM_ServiceAPI_Token}` |  |
| Public API > Member Management > Authentication | Authenticate Member & Generate Persistent Member Token | `POST` | `{HM_ServiceAPI_URL}/getmembertoken/{HM_ServiceAPI_Token}` | UserName, Password, PersistentLogin, ReturnMemberDetails |
| Public API > Member Management > Authentication | Validate Member Token | `GET` | `{HM_ServiceAPI_URL}/getservicetokeninfo/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Management > Authentication | Expire Member Token | `GET` | `{HM_ServiceAPI_URL}/expiretoken/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Management > Authentication | Validate Persistent Member Token | `POST` | `{HM_ServiceAPI_URL}/validatepersistentlogintoken/{HM_ServiceAPI_Token}` |  |
| Public API > Member Management > Authentication | Expire Persistent Member Token | `POST` | `{HM_ServiceAPI_URL}/expirepersistentlogintoken/{HM_ServiceAPI_Token}` |  |
| Public API > Member Management > Single Sign-on | Get Single Sign-on Token | `GET` | `{HM_ServiceAPI_URL}/getssotoken/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Management > Single Sign-on | Validate Single Sign-on Token | `POST` | `{HM_ServiceAPI_URL}/validatessotoken/{HM_ServiceAPI_Token}` | Token, GenerateMemberToken, ReturnMemberDetails |
| Public API > Member Management > Profile | Get Member Details | `GET` | `{HM_ServiceAPI_URL}/getmember/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Management > Profile | Get Member Details (Invited) | `POST` | `{HM_ServiceAPI_URL}/getinvitedmembertoken/{HM_ServiceAPI_Token}` |  |
| Public API > Member Management > Profile | Update Member Details | `POST` | `{HM_ServiceAPI_URL}/updatemember/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Management > Profile | Get Member Image Upload URL | `POST` | `{HM_ServiceAPI_URL}/getpresigneduploadurl/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Management > Profile | Confirm Member Image Upload Complete | `POST` | `{HM_ServiceAPI_URL}/confirmpresignedupload/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Management > Profile | Remove Member Image | `POST` | `{HM_ServiceAPI_URL}/removeassignedupload/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Management > Profile | Remove Member | `GET` | `{HM_ServiceAPI_URL}/removemember/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Management > Reset Password | Send Reset Password Email | `POST` | `{HM_ServiceAPI_URL}/sendpasswordresetemail/{HM_ServiceAPI_Token}` |  |
| Public API > Member Management > Reset Password | Validate Reset Password Token | `GET` | `{HM_ServiceAPI_URL}/validatepasswordresettoken/{HM_ServiceAPI_Token}/{ResetToken}` |  |
| Public API > Member Management > Reset Password | Update Member Password (Reset) | `POST` | `{HM_ServiceAPI_URL}/updatepasswordusingtoken/{HM_ServiceAPI_Token}` |  |
| Public API > Member Management > Subscribe | Subscribe Member | `POST` | `{HM_ServiceAPI_URL}/membersubscribe/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Management > Member Groups | Validate Verify Member Group Approval Token | `GET` | `{HM_ServiceAPI_URL}/validatemembergroupmemberapprovaltoken/{HM_ServiceAPI_Token}/{VerifyMemberGroupApprovalToken}` |  |
| Public API > Member Management > Member Groups | Verify Member Group Approval | `POST` | `{HM_ServiceAPI_URL}/verifymembergroupmemberapproval/{HM_ServiceAPI_Token}` | Token |
| Public API > Member Management > Member Groups | Get Member Group Regions | `GET` | `{HM_ServiceAPI_URL}/getmembergroupregions/{HM_ServiceAPI_MemberToken}/{MemberGroupID}` |  |
| Public API > Member Management > Member Groups | Update Member Group Region | `POST` | `{HM_ServiceAPI_URL}/updatemembergroupregion/{HM_ServiceAPI_MemberToken}/{MemberGroupID}` |  |
| Public API > Member Management > Member Groups | Get Member Group Productions | `GET` | `{HM_ServiceAPI_URL}/getmembergroupproductions/{HM_ServiceAPI_MemberToken}/{MemberGroupID}?sort={Sort}` |  |
| Public API > Member Management > Member Groups | Get Member Group Production Categories | `GET` | `{HM_ServiceAPI_URL}/getmembergroupproductioncategories/{HM_ServiceAPI_MemberToken}/{MemberGroupID}/{MemberGroupProductionID}?returnplaylistcount={ReturnPlaylistCount}&skip={Skip}&limit={Limit}&sort={Sort}` |  |
| Public API > Member Management > Member Groups | Get Member Group Production Categories & Playlists | `GET` | `{HM_ServiceAPI_URL}/getmembergroupproductioncategoriesandplaylists/{HM_ServiceAPI_MemberToken}/{MemberGroupID}/{MemberGroupProductionID}?returnplaylistcount={ReturnPlaylistCount}&returntrackcount={ReturnTrackCount}&returnrootobjectsonly={ReturnRootObjectsOnly}&productioncategoryid={ProductionCategoryID}&skip={Skip}&limit={Limit}&sort={Sort}` |  |
| Public API > Member Management > Member Groups | Get Member Group Production Playlist & Tracks | `GET` | `{HM_ServiceAPI_URL}/getmembergroupproductionplaylistandtracks/{HM_ServiceAPI_MemberToken}/{MemberGroupID}/{MemberGroupProductionID}/{FeaturedPlaylistID}?returntracks={ReturnTracks}&includeinactive={IncludeInactive}&languagecode={LanguageCode}&skip={Skip}&limit={Limit}&sort={Sort}` |  |
| Public API > Member Management > Member Groups | Search Member Group Production Playlist Tracks | `POST` | `{HM_ServiceAPI_URL}/searchmembergroupproductionplaylisttracks/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_MemberGroupID}/{HM_ServiceAPI_MemberGroupProductionID}/{HM_ServiceAPI_FeaturedPlaylistID}` |  |

## Public API - Member activity

| Section | Endpoint | Methode | Route | Inputs principaux |
| --- | --- | --- | --- | --- |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Categories | Create Member Playlist Category | `POST` | `{HM_ServiceAPI_URL}/addmemberplaylistcategory/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Categories | Update Member Playlist Category | `POST` | `{HM_ServiceAPI_URL}/updatememberplaylistcategory/{HM_ServiceAPI_MemberToken}/{PlaylistCategoryID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Categories | Get Member Playlist Categories | `GET` | `{HM_ServiceAPI_URL}/getmemberplaylistcategories/{HM_ServiceAPI_MemberToken}?returnplaylistcount={ReturnPlaylistCount}&skip={Skip}&limit={Limit}&sort={Sort}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Categories | Get Member Playlist Categories & Playlists | `GET` | `{HM_ServiceAPI_URL}/getmemberplaylistcategoriesandplaylists/{HM_ServiceAPI_MemberToken}?returnplaylistcount={ReturnPlaylistCount}&returntrackcount={ReturnTrackCount}&returnrootobjectsonly={RootObjectsOnly}&returnautosaveonly={AutoSaveOnly}&returnfirstautosave={FirstAutoSaveOnly}&returnhighlightonly={ReturnHighlightOnly}&playlistcategoryid={PlaylistCategoryID}&skip={Skip}&limit={Limit}&sort={Sort}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Categories | Search Member Playlist Categories & Playlists | `POST` | `{HM_ServiceAPI_URL}/searchmemberplaylistcategoriesandplaylists/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Categories | Reorder Member Playlist Category | `GET` | `{HM_ServiceAPI_URL}/reordermemberplaylistcategory/{HM_ServiceAPI_MemberToken}/{PlaylistCategoryID}?OrderID={OrderID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Categories | Remove Member Playlist Category | `GET` | `{HM_ServiceAPI_URL}/removememberplaylistcategory/{HM_ServiceAPI_MemberToken}/{PlaylistCategoryID}?keepChildren={keepChildren}&giveShareCopy={giveShareCopy}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Create Member Playlist | `POST` | `{HM_ServiceAPI_URL}/addmemberplaylist/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Update Member Playlist | `POST` | `{HM_ServiceAPI_URL}/updateplaylist/{HM_ServiceAPI_MemberToken}/{PlaylistID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Highlight Member Playlists | `POST` | `{HM_ServiceAPI_URL}/highlightplaylists/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | AutoSave Member Playlists | `POST` | `{HM_ServiceAPI_URL}/autosaveplaylists/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Get Member Playlist Image Upload URL | `POST` | `{HM_ServiceAPI_URL}/getpresigneduploadurl/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Confirm Member Playlist Image Upload Complete | `POST` | `{HM_ServiceAPI_URL}/confirmpresignedupload/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Remove Member Playlist Image | `POST` | `{HM_ServiceAPI_URL}/removeassignedupload/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Get Member Playlists | `GET` | `{HM_ServiceAPI_URL}/getmemberplaylistsnotracks/{HM_ServiceAPI_MemberToken}?Skip={Skip}&Limit={Limit}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Get Member Playlists (Include Tracks) | `GET` | `{HM_ServiceAPI_URL}/getmemberplaylists/{HM_ServiceAPI_MemberToken}?Skip={Skip}&Limit={Limit}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Get Member Playlist | `GET` | `{HM_ServiceAPI_URL}/getmemberplaylist/{HM_ServiceAPI_MemberToken}/{PlaylistID}?returntracks=true&returnpublishlocations=false` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Reorder Member Playlist | `GET` | `{HM_ServiceAPI_URL}/reordermemberplaylist/{HM_ServiceAPI_MemberToken}/{PlaylistID}?movetoplaylistcategoryid={PlaylistCategoryID}&orderid={OrderID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Reorder Multiple Member Playlists | `POST` | `{HM_ServiceAPI_URL}/reorderplaylists/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Remove Member Playlist | `GET` | `{HM_ServiceAPI_URL}/removeplaylist/{HM_ServiceAPI_MemberToken}/{PlaylistID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Archive Member Playlist | `GET` | `{HM_ServiceAPI_URL}/archiveplaylist/{HM_ServiceAPI_MemberToken}/{PlaylistID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Restore Archived Member Playlist | `GET` | `{HM_ServiceAPI_URL}/restorearchiveplaylist/{HM_ServiceAPI_MemberToken}/{PlaylistID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Duplicate Member Playlist | `POST` | `{HM_ServiceAPI_URL}/duplicatememberplaylist/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Copy Featured Playlist to Member Playlist | `POST` | `{HM_ServiceAPI_URL}/copytomemberplaylist/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists | Publish Member Playlist | `POST` | `{HM_ServiceAPI_URL}/publishmemberplaylist/{HM_ServiceAPI_MemberToken}/{PlaylistID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Tracks | Search Member Playlist Tracks | `POST` | `{HM_ServiceAPI_URL}/searchmemberplaylisttracks/{HM_ServiceAPI_MemberToken}/{PlaylistID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Tracks | Compare Member Playlist Tracks | `POST` | `{HM_ServiceAPI_URL}/filtermemberplaylisttracks/{HM_ServiceAPI_MemberToken}/{PlaylistID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Tracks | Add to Member Playlists | `POST` | `{HM_ServiceAPI_URL}/addtomemberplaylists/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Tracks | Add Multiple Tracks to AutoSave Member Playlists | `POST` | `{HM_ServiceAPI_URL}/addtrackstoautosaveplaylists/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Tracks | Reorder Multiple Tracks in Member Playlist | `POST` | `{HM_ServiceAPI_URL}/reordermemberplaylisttracks/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Tracks | Remove Multiple Tracks from Member Playlist | `POST` | `{HM_ServiceAPI_URL}/removeplaylisttracks/{HM_ServiceAPI_MemberToken}/{PlaylistID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Tracks | Suggest Member Playlist Tracks | `POST` | `{HM_ServiceAPI_URL}/suggestmemberplaylisttracks/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_NewMemberPlaylistID}` | Skip, Limit, MainOnly, SeedDetermination, SeedLimit, SeedMin |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Shares | Get Member Playlist Shares | `GET` | `{HM_ServiceAPI_URL}/getmemberplaylistshares/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_NewMemberPlaylistID}?skip={HM_ServiceAPI_Skip}&limit={HM_ServiceAPI_Limit}&sort={HM_ServiceAPI_PlaylistSortOrder}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Shares | Update Member Playlist Share | `POST` | `{HM_ServiceAPI_URL}/updatememberplaylistshare/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_MemberPlaylistShareID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Shares | Remove Member Playlist Share | `GET` | `{HM_ServiceAPI_URL}/removememberplaylistshare/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_MemberPlaylistShareID}?giveShareCopy={giveShareCopy}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Search History | Get Member Playlist Search History | `GET` | `{HM_ServiceAPI_URL}/getmemberplaylistsearches/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_NewMemberPlaylistID}?skip={HM_ServiceAPI_Skip}&limit={HM_ServiceAPI_Limit}&sort={HM_ServiceAPI_PlaylistSortOrder}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Schedule | Get Member Playlist Schedule | `GET` | `{HM_ServiceAPI_URL}/getmemberplaylistschedule/{HM_ServiceAPI_MemberToken}/33da591b784f4330` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Schedule | Update Member Playlist Schedule | `POST` | `{HM_ServiceAPI_URL}/updatememberplaylistschedule/{HM_ServiceAPI_MemberToken}/699cd3bbe22ff336` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Schedule | Remove Member Playlist Schedule | `GET` | `{HM_ServiceAPI_URL}/deletememberplaylistschedule/{HM_ServiceAPI_MemberToken}/33da591b784f4330` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlist Schedule | Get Member Playlist Schedule Runs | `GET` | `{HM_ServiceAPI_URL}/getmemberplaylistschedulerun/{HM_ServiceAPI_MemberToken}/{PlaylistID}?skip={HM_ServiceAPI_Skip}&limit={HM_ServiceAPI_Limit}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists & Disco | Send Member Playlist To Disco | `GET` | `{HM_ServiceAPI_URL}/sendtodisco/{HM_ServiceAPI_MemberToken}/{PlaylistID}?fileformatid={FileFormatID}` |  |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists & Disco | Share Member Playlist to Disco | `POST` | `{HM_IntegrationAPI_URL}/sharetodisco/{HM_ServiceAPI_MemberToken}` | PlaylistID, FileFormatID, RecipientInboxURL, Note |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists & Disco | Get Member Playlist Disco Send History | `POST` | `{HM_ServiceAPI_URL}/getexternalsharestatushistory/{HM_ServiceAPI_MemberToken}` | RelationType, RelationID, Skip, Limit, Sort |
| Public API > Member Activity > Downloads | Validate Music Download | `POST` | `{HM_ServiceAPI_URL}/validatemusicdownloadrequest/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Downloads | Get Music Download | `POST` | `{HM_ServiceAPI_URL}/getmusicdownload/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Downloads | Get Music Download Info | `POST` | `{HM_ServiceAPI_URL}/getmusicdownloadinfo/{HM_ServiceAPI_Token}` |  |
| Public API > Member Activity > Favourites | Add Track/Album to Member Favourites | `GET` | `{HM_ServiceAPI_URL}/addtofavourites/{HM_ServiceAPI_MemberToken}/{Type}/{ID}` |  |
| Public API > Member Activity > Favourites | Get Member Favourites | `GET` | `{HM_ServiceAPI_URL}/getfavourites/{HM_ServiceAPI_MemberToken}?Skip={Skip}&Limit={Limit}&Sort=Created_Desc` |  |
| Public API > Member Activity > Favourites | Remove Track from Member Favourites | `GET` | `{HM_ServiceAPI_URL}/removefavouritestrack/{HM_ServiceAPI_MemberToken}/{TrackID}` |  |
| Public API > Member Activity > Favourites | Remove All Tracks from Member Favourites | `GET` | `{HM_ServiceAPI_URL}/removeallfavouritestracks/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Sharing | Authenticate Temporary Member | `POST` | `{HM_ServiceAPI_URL}/getinvitedmembertoken/{HM_ServiceAPI_Token}` |  |
| Public API > Member Activity > Sharing | Get Playlist Category Share URL | `POST` | `{HM_ServiceAPI_URL}/getsharemusicurl/{HM_ServiceAPI_Token}` |  |
| Public API > Member Activity > Sharing | Get Playlist Share URL | `POST` | `{HM_ServiceAPI_URL}/getsharemusicurl/{HM_ServiceAPI_Token}` |  |
| Public API > Member Activity > Sharing | Send Share Music Email | `POST` | `{HM_ServiceAPI_URL}/sendsharemusiclinkemail/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Sharing | Deliver Share Music | `POST` | `{HM_ServiceAPI_URL}/deliversharemusic/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Sharing | Get Playlist Folder & Playlist Share | `GET` | `{HM_ServiceAPI_URL}/getsharemusic/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_EnageAccessToken}` |  |
| Public API > Member Activity > Sharing | Accept Shared Music | `GET` | `{HM_ServiceAPI_URL}/acceptsharemusic/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_EnageAccessToken}?acceptType={acceptType}` |  |
| Public API > Member Activity > History | Get Member Audition History | `GET` | `{HM_ServiceAPI_URL}/gethistorybymembertoken/{HM_ServiceAPI_MemberToken}?startdate={startDate}&enddate={endDate}&skip={Skip}&limit={Limit}` |  |
| Public API > Member Activity > History | Get Member Download History | `GET` | `{HM_ServiceAPI_URL}/getdownloadhistorybymembertoken/{HM_ServiceAPI_MemberToken}?startdate={startDate}&enddate={endDate}&skip={Skip}&limit={Limit}` |  |
| Public API > Member Activity > History | Get Member Communication History | `POST` | `{HM_ServiceAPI_URL}/gethistorybycommunications/{HM_ServiceAPI_MemberToken}` | Skip, Limit, Sort, StartDate, EndDate |
| Public API > Member Activity > Tagging | Create Member Tag | `POST` | `{HM_ServiceAPI_URL}/addmembertag/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Tagging | Update Member Tag | `POST` | `{HM_ServiceAPI_URL}/updatemembertag/{HM_ServiceAPI_MemberToken}/12340397b5f68cf0` |  |
| Public API > Member Activity > Tagging | Add to Member Tags | `POST` | `{HM_ServiceAPI_URL}/addtomembertags/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Tagging | Get Member Tags | `GET` | `{HM_ServiceAPI_URL}/getmembertags/{HM_ServiceAPI_MemberToken}?Skip={Skip}&Limit={Limit}&Sort={Sort}` |  |
| Public API > Member Activity > Tagging | Get Member Tag Tracks | `GET` | `{HM_ServiceAPI_URL}/getmembertagtracks/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_NewMemberTagID}?Skip={Skip}&Limit={limit}&Sort={Sort}` |  |
| Public API > Member Activity > Tagging | Get Member Tags By Track | `GET` | `{HM_ServiceAPI_URL}/getmembertagsbytrack/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_TrackID}` |  |
| Public API > Member Activity > Tagging | Remove Track Tag | `GET` | `{HM_ServiceAPI_URL}/removetrackmembertag/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_NewMemberTagID}/{HM_ServiceAPI_TrackID}` |  |
| Public API > Member Activity > Tagging | Remove Tag | `GET` | `{HM_ServiceAPI_URL}/removemembertag/{HM_ServiceAPI_MemberToken}/{HM_ServiceAPI_NewMemberTagID}` |  |
| Public API > Member Activity > Tagging | Remove All Tags | `GET` | `{HM_ServiceAPI_URL}/removemembertags/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Comments | Create & Assign Member Comment to Track | `POST` | `{HM_ServiceAPI_URL}/addtrackmembercomment/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Comments | Update Member Comment | `POST` | `{HM_ServiceAPI_URL}/updatetrackmembercomment/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Comments | Get Member Comments By Track | `GET` | `{HM_ServiceAPI_URL}/gettrackmembercomments/{HM_ServiceAPI_MemberToken}/{TrackID}?includeadmin={IncludeAdmin}` |  |
| Public API > Member Activity > Comments | Remove Comment | `GET` | `{HM_ServiceAPI_URL}/removetrackmembercomment/{HM_ServiceAPI_MemberToken}/{TagID}` |  |
| Public API > Member Activity > Searches | Create Member Saved Search | `POST` | `{HM_ServiceAPI_URL}/addmembersavesearch/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Searches | Update Member Saved Search | `POST` | `{HM_ServiceAPI_URL}/updatemembersavesearch/{HM_ServiceAPI_MemberToken}/{SearchHistoryID}` |  |
| Public API > Member Activity > Searches | Search Member Saved Searches | `POST` | `{HM_ServiceAPI_URL}/searchmembersavesearches/{HM_ServiceAPI_MemberToken}` |  |
| Public API > Member Activity > Searches | Remove Member Saved Search Term | `GET` | `{HM_ServiceAPI_URL}/removemembersavedsearchterm/{HM_ServiceAPI_MemberToken}/{SearchHistoryID}/{SearchTermID}` |  |
| Public API > Member Activity > Searches | Remove Member Saved Search | `GET` | `{HM_ServiceAPI_URL}/removemembersavedsearch/{HM_ServiceAPI_MemberToken}/{SearchHistoryID}` |  |
| Public API > Member Activity > Searches | Remove All Member Saved Searches | `GET` | `{HM_ServiceAPI_URL}/removeallmembersavedsearch/{HM_ServiceAPI_MemberToken}` |  |

## Export API

L Export API est orientee livraison de contenu et workspace. Elle n est pas necessaire au MVP d une barre de recherche front, sauf si Parigo doit synchroniser ou fournir des exports a des tiers.

| Section | Endpoint | Methode | Route | Inputs principaux |
| --- | --- | --- | --- | --- |
| Export API > Getting Started | Get Access Token | `GET` | `{HM_ExportAPI_URL}/getaccesstoken/{HM_ExportAPI_Key}` |  |
| Export API > Getting Started | Get Access Info (Download formats & URL) | `GET` | `{HM_ExportAPI_URL}/getaccessinfo/{HM_ExportAPI_AccessToken}` |  |
| Export API > Getting Started | Get Access Accounts | `GET` | `{HM_ExportAPI_URL}/getaccessaccounts/{HM_ExportAPI_AccessToken}` |  |
| Export API > Getting Started | Get Session Token | `GET` | `{HM_ExportAPI_URL}/getsessiontoken/{HM_ExportAPI_AccessToken}/{Username}/{Password}?accessaccountid=430f25d8e56cfadf` |  |
| Export API > Getting Started | Expire Session Token | `GET` | `{HM_ExportAPI_URL}/expiretoken/{HM_ExportAPI_SessionToken}` |  |
| Export API > Getting Started | Validate Access Token | `GET` | `{HM_ExportAPI_URL}/validateaccesstoken/{HM_ExportAPI_AccessToken}` |  |
| Export API > Getting Started | Validate Session Token | `GET` | `{HM_ExportAPI_URL}/validatesessiontoken/{HM_ExportAPI_AccessToken}` |  |
| Export API > Getting Started | Expire Access Token | `GET` | `{HM_ExportAPI_URL}/expireaccesstoken/{HM_ExportAPI_AccessToken}` |  |
| Export API > Working within the Workspace | Get Labels/Libraries | `GET` | `{HM_ExportAPI_URL}/getlibraries/{HM_ExportAPI_SessionToken}` |  |
| Export API > Working within the Workspace | Get Labels/Libraries All States | `GET` | `{HM_ExportAPI_URL}/getlibrariesallstates/{HM_ExportAPI_SessionToken}` |  |
| Export API > Working within the Workspace | Get Albums By Workspace Status | `POST` | `{HM_ExportAPI_URL}/getalbumsbyworkspacestatus/{HM_ExportAPI_SessionToken}` |  |
| Export API > Working within the Workspace | Get Workspace Items By Album | `GET` | `{HM_ExportAPI_URL}/getworkspacealbumitems/{HM_ExportAPI_SessionToken}/{AlbumID}/{Format}` |  |
| Export API > Working within the Workspace | Get Workspace Items By Track | `GET` | `{HM_ExportAPI_URL}/getworkspacetrackitems/{HM_ExportAPI_SessionToken}/{TrackID}/{Format}` |  |
| Export API > Working within the Workspace | Get Workspace Download | `POST` | `{HM_ExportAPI_URL}/getmusicdownload/{HM_ExportAPI_SessionToken}` |  |
| Export API > Working within the Workspace | Set Album Tag | `POST` | `{HM_ExportAPI_URL}/setalbumtag/{HM_ExportAPI_SessionToken}` |  |
| Export API > Working within the Workspace | Remove Album Tag | `POST` | `{HM_ExportAPI_URL}/removealbumtag/{HM_ExportAPI_SessionToken}` |  |
| Export API > Working within the Workspace | Upsert Track Categories | `POST` | `{HM_ExportAPI_URL}/bulkupserttrackcategories/{HM_ExportAPI_SessionToken}` |  |

## Import API

L Import API couvre l ingestion workspace: labels/libraries, albums, tracks, stems, assets, publication et unpublication. Elle devient pertinente si Parigo doit pousser ou maintenir un catalogue dans Harvest.

| Section | Endpoint | Methode | Route | Inputs principaux |
| --- | --- | --- | --- | --- |
| Import API > Getting Started | Get Access Token | `GET` | `{HM_ImportAPI_URL}/getaccesstoken` |  |
| Import API > Getting Started | Get Session Token | `GET` | `{HM_ImportAPI_URL}/getsessiontoken/{HM_ImportAPI_AccessToken}/{Username}/{Password}` |  |
| Import API > Getting Started | Expire Session Token | `GET` | `{HM_ImportAPI_URL}/expiretoken/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Labels/Libraries | Get Labels/Libraries | `GET` | `{HM_ImportAPI_URL}/getlibraries/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Labels/Libraries | Create Label/Library | `POST` | `{HM_ImportAPI_URL}/library/{HM_ImportAPI_SessionToken}/insert` |  |
| Import API > Working within the Workspace > Labels/Libraries | Update Label/Library | `POST` | `{HM_ImportAPI_URL}/library/{HM_ImportAPI_SessionToken}/update` |  |
| Import API > Working within the Workspace > Albums | Get Albums By Workspace State | `POST` | `{HM_ImportAPI_URL}/getalbumsbyworkspacestate/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Albums | Create Album | `POST` | `{HM_ImportAPI_URL}/album/{HM_ImportAPI_SessionToken}/insert` |  |
| Import API > Working within the Workspace > Albums | Update Album | `POST` | `{HM_ImportAPI_URL}/album/{HM_ImportAPI_SessionToken}/update` |  |
| Import API > Working within the Workspace > Albums | Remove Album | `DELETE` | `{HM_ImportAPI_URL}/album/{HM_ImportAPI_SessionToken}/{AlbumIdentity}` |  |
| Import API > Working within the Workspace > Albums | Get Album Asset Upload URL | `POST` | `{HM_ImportAPI_URL}/getpresigneduploadurl/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Albums | Confirm Album Asset Upload Complete | `POST` | `{HM_ImportAPI_URL}/confirmpresignedupload/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Albums | Set External Album Asset (URL) | `POST` | `{HM_ImportAPI_URL}/setasseturl/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Albums | Set External Album Asset (Amazon S3) | `POST` | `{HM_ImportAPI_URL}/setexternals3asset/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Tracks | Get Attribute Types | `GET` | `{HM_ImportAPI_URL}/getattributetypes/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Tracks | Get Tracks By Workspace Album & State | `POST` | `{HM_ImportAPI_URL}/getalbumtracksbyworkspacestate/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Tracks | Create Track | `POST` | `{HM_ImportAPI_URL}/track/{HM_ImportAPI_SessionToken}/insert` |  |
| Import API > Working within the Workspace > Tracks | Update Track | `POST` | `{HM_ImportAPI_URL}/track/{HM_ImportAPI_SessionToken}/update` |  |
| Import API > Working within the Workspace > Tracks | Remove Track | `DELETE` | `{HM_ImportAPI_URL}/track/{HM_ImportAPI_SessionToken}/{TrackIdentity}` |  |
| Import API > Working within the Workspace > Tracks | Move Tracks On Import Album | `POST` | `{HM_ImportAPI_URL}/track/{HM_ImportAPI_SessionToken}/move` |  |
| Import API > Working within the Workspace > Tracks | Get Track Asset Upload URL | `POST` | `{HM_ImportAPI_URL}/getpresigneduploadurl/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Tracks | Confirm Track Asset Upload Complete | `POST` | `{HM_ImportAPI_URL}/confirmpresignedupload/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Tracks | Set External Track Asset (URL) | `POST` | `{HM_ImportAPI_URL}/setasseturl/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Tracks | Set External Track Asset (Amazon S3) | `POST` | `{HM_ImportAPI_URL}/setexternals3asset/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Stems | Get Stems By Workspace Track & State | `POST` | `{HM_ImportAPI_URL}/gettrackstemsbyworkspacestate/{HM_ImportAPI_SessionToken}` | TrackIdentity |
| Import API > Working within the Workspace > Stems | Create Stem | `POST` | `{HM_ImportAPI_URL}/stem/{HM_ImportAPI_SessionToken}/insert` | Stems, Stems[].TrackIdentity, Stems[].Version |
| Import API > Working within the Workspace > Stems | Update Stem | `POST` | `{HM_ImportAPI_URL}/stem/{HM_ImportAPI_SessionToken}/update` | Stems, Stems[].TrackIdentity, Stems[].StemIdentity, Stems[].Version |
| Import API > Working within the Workspace > Stems | Remove Stem | `DELETE` | `{HM_ImportAPI_URL}/stem/{HM_ImportAPI_SessionToken}/{HM_ImportAPI_TempID}` |  |
| Import API > Working within the Workspace > Stems | Get Stem Asset Upload URL | `POST` | `{HM_ImportAPI_URL}/getpresigneduploadurl/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Stems | Confirm Stem Asset Upload Complete | `POST` | `{HM_ImportAPI_URL}/confirmpresignedupload/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Stems | Set External Stem Asset (URL) | `POST` | `{HM_ImportAPI_URL}/setasseturl/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Stems | Set External Stem Asset (Amazon S3) | `POST` | `{HM_ImportAPI_URL}/setexternals3asset/{HM_ImportAPI_SessionToken}` |  |
| Import API > Working within the Workspace > Publishing | Publish Album & Tracks | `GET` | `{HM_ImportAPI_URL}/album/{HM_ImportAPI_SessionToken}/{AlbumIdentity}/publish` |  |
| Import API > Working within the Workspace > Publishing | Publish Track On Imported Album | `GET` | `{HM_ImportAPI_URL}/track/{HM_ImportAPI_SessionToken}/{TrackIdentity}/publish` |  |
| Import API > Working within the Workspace > Publishing | Unpublish Track On Imported Album | `GET` | `{HM_ImportAPI_URL}/track/{HM_ImportAPI_SessionToken}/{HM_ImportAPI_TrackID}/unpublish` |  |
| Import API > Working within the Workspace > Publishing | Publish Stem On Imported Track | `GET` | `{HM_ImportAPI_URL}/stem/{HM_ImportAPI_SessionToken}/{HM_ImportAPI_StemID}/publish` |  |

## Agent API / Integration API

L Agent API reprend une logique d auth proche Public API mais cible les usages workspace, management user download, tags de libraries/albums et recuperation de contenu.

| Section | Endpoint | Methode | Route | Inputs principaux |
| --- | --- | --- | --- | --- |
| Agent API > Getting Started | Get Authorised | `POST` | `{HM_IntegrationAPI_AuthUrl}` | grant_type, client_id, client_secret |
| Agent API > Getting Started | Get Service Token | `GET` | `{HM_IntegrationAPI_URL}/getservicetoken` |  |
| Agent API > Getting Started | Get Service Token Info | `GET` | `{HM_IntegrationAPI_URL}/getservicetokeninfo/{HM_IntegrationAPI_Token}` |  |
| Agent API > Getting Started | Get Service Info (Download formats & URL) | `GET` | `{HM_IntegrationAPI_URL}/getserviceinfo/{HM_IntegrationAPI_Token}` |  |
| Agent API > Getting Started | Expire Service Token | `GET` | `{HM_IntegrationAPI_URL}/expiretoken/{HM_IntegrationAPI_Token}` |  |
| Agent API > Working within the Workspace | Get Labels/Libraries | `GET` | `{HM_IntegrationAPI_URL}/getlibraries/{HM_IntegrationAPI_Token}` |  |
| Agent API > Working within the Workspace | Get Labels/Libraries By Tag | `POST` | `{HM_IntegrationAPI_URL}/getlibrariesbytag/{HM_IntegrationAPI_Token}` | ContainsTags, NotContainsTags |
| Agent API > Working within the Workspace | Get Albums by Workspace Status | `POST` | `{HM_IntegrationAPI_URL}/getalbumsbyworkspacestatus/{HM_IntegrationAPI_Token}` |  |
| Agent API > Working within the Workspace | Get Tracks By Workspace Album | `GET` | `{HM_IntegrationAPI_URL}/getworkspacealbumtracks/{HM_IntegrationAPI_Token}/{AlbumID}/{Format}` |  |
| Agent API > Working within the Workspace | Get Tracks | `POST` | `{HM_IntegrationAPI_URL}/gettracks/{HM_IntegrationAPI_Token}` |  |
| Agent API > Working within the Workspace | Get Management User Token | `GET` | `{HM_IntegrationAPI_URL}/getmanagementusertoken/{HM_IntegrationAPI_Token}/{username}/{password}` |  |
| Agent API > Working within the Workspace | Get Management User Download | `POST` | `{HM_IntegrationAPI_URL}/getmanagementuserdownload/{HM_IntegrationAPI_Token}` |  |
| Agent API > Working within the Workspace | Set Album Tag | `POST` | `{HM_IntegrationAPI_URL}/setalbumtag/{HM_IntegrationAPI_Token}` |  |
| Agent API > Working within the Workspace | Remove Album Tag | `POST` | `{HM_IntegrationAPI_URL}/removealbumtag/{HM_IntegrationAPI_Token}` |  |
| Agent API > Working within the Workspace | Set Library Tag | `POST` | `{HM_IntegrationAPI_URL}/setlibrarytag/{HM_IntegrationAPI_Token}` | libraryid, tag |
| Agent API > Working within the Workspace | Remove Library Tag | `POST` | `{HM_IntegrationAPI_URL}/removelibrarytag/{HM_IntegrationAPI_Token}` |  |

## Pages guides / INFO parcourues

| Section | Page guide |
| --- | --- |
| Public API > Getting Started | Implementation Guide - Getting Started |
| Public API > Service Information | Implementation Guide - Waveform |
| Public API > Service Information | Implementation Guide - Tracking Usage & Asset URLs |
| Public API > Searching Metadata > Search | Implementation Guide Search |
| Public API > Searching Metadata > Search Similar > Overview | Implementation Guide |
| Public API > Member Management > Registration | Implementation Guide Members |
| Public API > Member Activity > Playlist Categories & Playlists > Playlists & Disco | Implementation Guide |
| Public API > Member Activity > Downloads | Implementation Guide Download Formats |
| Public API > Member Activity > Downloads | Implementation Guide - Stems |
| Public API > Ecommerce > Invoices | Implementation Guide - Ecommerce |
| Export API > Getting Started | Implementation Guide - Getting Started |
| Export API > Process Steps | Album Workflows |
| Export API > Process Steps | Track Workflows |
| Export API > Process Steps | Download INFO |
| Export API > Process Steps | Metadata INFO |
| Import API > Getting Started | Implementation Guide - Getting Started |
| Import API > Process Steps | Primary Workflows |
| Agent API > Process Steps | Primary Workflows |
| Additional Information | Glossary |
| Additional Information | API Response Codes |
| Additional Information | API Rate Limiting |
| Additional Information | API Health Status |

## Rate limits et health

| API | Rate limit |
| --- | --- |
| Public API | 3600 requests per 5 minutes per IP address |
| Export API | 300 requests per 5 minutes per IP address |
| Import API | 200 requests per 5 minutes per IP address |
| Integration/Agent API | 300 requests per 5 minutes per IP address |

Health endpoint documente: `https://service.harvest.music/health`. Les metriques couvrent notamment Search, GeoIP, Data, Cache, Asset et Download avec un score Apdex.

## Codes de reponse Harvest

Harvest expose des codes fonctionnels en plus des statuts HTTP. Les libelles ci-dessous sont paraphrases pour usage developpeur.

| Code | Sens |
| --- | --- |
| `1` | Donnees envoyees incompletes ou corrompues. |
| `2` | Donnees envoyees incorrectes. |
| `3` | Acces refuse pour l operation demandee. |
| `4` | Erreur interne Harvest. |
| `5` | Service token absent, inconnu ou expire. |
| `6` | Identifiants de connexion invalides. |
| `7` | Membre introuvable. |
| `8` | Playlist inexistante. |
| `9` | Track introuvable. |
| `10` | Album introuvable. |
| `11` | Playlist introuvable. |
| `12` | Downloads desactives pour le membre. |
| `13` | Downloads non autorises pour le membre. |
| `14` | Limite de download atteinte. |
| `15` | Download accepte et ajoute a la file. |
| `16` | Fichier ou ressource introuvable. |
| `17` | Record deja existant. |
| `18` | Membre ou fonctionnalite non active. |
| `19` | Cloud Search non disponible ou mal configure. |
| `20` | Download accepte mais partiellement ajoute a la file. |
| `21` | Access token expire. |
| `22` | Categorie de playlist inexistante. |

## Couverture par famille

| Famille | Nombre d entrees |
| --- | --- |
| Public API > Getting Started | 5 |
| Public API > Service Information | 5 |
| Public API > Regions & Countries | 4 |
| Public API > Guest Management | 1 |
| Public API > Accessing Metadata > Libraries | 3 |
| Public API > Accessing Metadata > Styles | 3 |
| Public API > Accessing Metadata > Albums | 9 |
| Public API > Accessing Metadata > Tracks | 2 |
| Public API > Accessing Metadata > Categories | 1 |
| Public API > Accessing Metadata > Right Holders | 1 |
| Public API > Accessing Metadata > Featured Playlist Categories & Playlists | 5 |
| Public API > Accessing Metadata > Shared Playlists | 1 |
| Public API > Accessing Metadata > Cuesheets | 1 |
| Public API > Searching Metadata > Search | 3 |
| Public API > Searching Metadata > Search Similar | 23 |
| Public API > Member Management > Registration | 4 |
| Public API > Member Management > Verification | 3 |
| Public API > Member Management > Authentication | 5 |
| Public API > Member Management > Single Sign-on | 2 |
| Public API > Member Management > Profile | 7 |
| Public API > Member Management > Reset Password | 3 |
| Public API > Member Management > Subscribe | 1 |
| Public API > Member Management > Member Groups | 9 |
| Public API > Member Activity > Playlist Categories & Playlists | 44 |
| Public API > Member Activity > Downloads | 5 |
| Public API > Member Activity > Favourites | 4 |
| Public API > Member Activity > Sharing | 7 |
| Public API > Member Activity > History | 3 |
| Public API > Member Activity > Tagging | 9 |
| Public API > Member Activity > Comments | 4 |
| Public API > Member Activity > Searches | 6 |
| Public API > Content Management | 2 |
| Public API > Ecommerce > Rates | 2 |
| Public API > Ecommerce > Invoices | 7 |
| Public API > Admin Management > Authentication | 1 |
| Public API > Admin Management > Member Groups | 1 |
| Export API > Getting Started | 9 |
| Export API > Process Steps | 4 |
| Export API > Working within the Workspace | 9 |
| Import API > Getting Started | 4 |
| Import API > Process Steps | 1 |
| Import API > Working within the Workspace > Labels/Libraries | 3 |
| Import API > Working within the Workspace > Albums | 8 |
| Import API > Working within the Workspace > Tracks | 10 |
| Import API > Working within the Workspace > Stems | 8 |
| Import API > Working within the Workspace > Publishing | 4 |
| Agent API > Getting Started | 5 |
| Agent API > Process Steps | 1 |
| Agent API > Working within the Workspace | 11 |
| Additional Information | 4 |

## Points a clarifier avant implementation

| Sujet | Question / risque |
| --- | --- |
| Credentials et environnements | Demander Auth URL, Service API URL, Integration/Export/Import URLs si utiles, Client ID, Client Secret, AccessKey, regions et comptes test/staging. |
| Scope Parigo | Confirmer si Parigo consomme uniquement Public API, ou aussi Export/Import/Agent pour ingestion/synchronisation. |
| FLEX | FLEX reste une source externe utile pour comparer des scenarios d ecran; ce rapport couvre la collection Harvest API publique. |
| Search similar | Confirmer provider actif, champs exacts, couts, latence, indexation, prompt/free-text et upload file. |
| Assets | Verifier duree de vie des URLs, cache autorise, formats stream/download et tracking usage. |
| Webhooks | Aucun webhook general visible pour Public API; prevoir polling/cache/revalidation sauf confirmation Harvest. |
| Rate limits | Public API 3600/5 min/IP; Export 300/5 min/IP; Import 200/5 min/IP; Agent 300/5 min/IP. Dimensionner SSR/API routes en consequence. |

## Fichiers generes

| Fichier | Role |
| --- | --- |
| `rapport-harvest-api.md` | Rapport lisible dans le repo. |
| `rapport-harvest-api.html` | Version HTML imprimable, source du PDF. |
| `rapport-harvest-api.pdf` | PDF a partager. |
| `endpoint-inventory.csv` | Inventaire machine-readable des 277 entrees documentees. |
