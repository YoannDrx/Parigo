# 03 - Public API Harvest : cartographie des endpoints

La Public API contient 195 entrees dans la collection Postman officielle. Elle couvre le front public, le catalogue, la recherche, les membres, les playlists, les downloads, le contenu editorial, l'e-commerce et quelques actions admin limitees.

Notation :

- `{serviceToken}` : token de service obtenu via `GET /getservicetoken`.
- `{memberToken}` : token membre connecte ou guest member token.
- `{managementToken}` : token admin, a isoler cote serveur.
- Les endpoints sont notes sans la base URL `{HM_ServiceAPI_URL}`.

## Priorite pour Parigo v1

| Priorite | Endpoints |
|---|---|
| Critique | `getserviceinfo`, `getregionbyip`, `getguestmembertoken`, `getmember`, `cloudsearch`, `autocomplete`, `gettracks`, `getalbumtracks`, `getlibraries`, `getmusicdownload` |
| Important | playlists membres, favoris, saved searches, shares, right holders, cuesheets |
| A evaluer | AIMS/Cyanite/Harmix, Disco, e-commerce/licensing, member groups |
| Back-office uniquement | management token, member group update, Import/Export/Agent API |

## Getting Started

| Methode | Nom | Endpoint |
|---|---|---|
| INFO | Implementation Guide - Getting Started | `-` |
| POST | Get Authorised | `{HM_ServiceAPI_AuthUrl}` |
| GET | Get Service Token | `/getservicetoken` |
| GET | Validate Service Token | `/getservicetokeninfo/{serviceToken}` |
| GET | Expire Service Token | `/expiretoken/{serviceToken}` |

## Service Information

| Methode | Nom | Endpoint |
|---|---|---|
| INFO | Implementation Guide - Waveform | `-` |
| INFO | Implementation Guide - Tracking Usage & Asset URLs | `-` |
| GET | Get Service Info (Service Asset URLs and File Formats) | `/getserviceinfo/{serviceToken}` |
| GET | Get Service Attributes | `/getserviceattribute/{serviceToken}/{attributeTypeCode}` |
| POST | Get Short URL | `/getshorturl/{serviceToken}` |

`getserviceinfo` est un endpoint de demarrage essentiel : il retourne les URL patterns des images, streams, downloads, waveforms et les formats de fichiers. La doc indique aussi des attributs comme `isdefaultdownload="true"` et `isdefaultdownloadfortype="true"`.

## Regions, Countries, Guest

| Methode | Nom | Endpoint |
|---|---|---|
| GET | Get Regions | `/getregions/{serviceToken}` |
| GET | Get Region | `/getregion/{serviceToken}/{RegionID}` |
| GET | Get Regions By IP | `/getregionbyip/{serviceToken}?ip={IP}` |
| GET | Get Countries | `/getcountries/{serviceToken}` |
| GET | Authenticate Guest Member | `/getguestmembertoken/{serviceToken}/{RegionID}` |

Ces endpoints determinent le contexte regional et les droits d'acces catalogue pour les visiteurs anonymes.

## Catalogue : libraries, styles, albums, tracks

| Methode | Nom | Endpoint |
|---|---|---|
| GET | Get Labels/Libraries | `/getlibraries/{memberToken}` |
| GET | Get Labels/Libraries (Include Inactive) | `/getlibraries/{memberToken}/includeinactive` |
| GET | Get Label/Library | `/getlibrary/{memberToken}/{LibraryID}?returnCodes={returnCodes}` |
| GET | Get Style Groups | `/getstylegroups/{memberToken}` |
| GET | Get Styles | `/getstyles/{memberToken}?groupID={GroupID}&allowEmptyStyle=false` |
| GET | Get Styles By Language Code | `/getstyles/{memberToken}/{LanguageCode}?groupID={GroupID}` |
| GET | Get Albums By Label/Library | `/getalbums/{memberToken}/{LibraryID}` |
| GET | Get Albums By Label/Library (Include Inactive) | `/getalbums/{memberToken}/{LibraryID}/includeinactive` |
| POST | Get Albums By Style | `/getalbumsbystyles/{memberToken}` |
| POST | Get Albums By Album | `/getalbumsbyids/{memberToken}` |
| GET | Get Featured Albums | `/getfeaturedalbums/{memberToken}/{Top}?returntrackcount={returnTrackCount}&mainonly={mainOnly}&sort={sortorder}` |
| GET | Get Latest Albums | `/getlatestalbums/{memberToken}/{Top}` |
| GET | Get Album | `/getalbum/{memberToken}/{AlbumID}?returnLibraryCodes={returnLibraryCodes}` |
| GET | Get Album Tracks | `/getalbumtracks/{memberToken}/{AlbumID}/mainonly?skip={skip}&limit={limit}` |
| GET | Get Album Tracks (Include Inactive) | `/getalbumtracks/{memberToken}/{AlbumID}/includeinactive?skip={skip}&limit={limit}` |
| POST | Get Tracks | `/gettracks/{memberToken}` |
| POST | Get Top Tracks | `/gettoptracks/{memberToken}` |
| GET | Get Categories | `/getcategories/{memberToken}/hasactivetrackonly?languagecode={LanguageCode}` |
| GET | Get Rightholders By Track | `/getrightholders/{memberToken}/{TrackID}` |

Notes :

- Les endpoints catalogue utilisent `{memberToken}`, pas `{serviceToken}`.
- `getalbumtracks` expose une pagination `skip`/`limit`.
- `mainonly` sert a exclure les versions alternatives. Il faut tester l'impact sur le catalogue Parigo : main, underscore, commercial cuts, stems.
- `gettracks` est le endpoint de resolution par IDs ; il sera utile apres search, historiques, playlists, likes.

## Featured playlists, shared playlists, cuesheets

| Methode | Nom | Endpoint |
|---|---|---|
| GET | Get Featured Playlist Categories | `/getfeaturedplaylistcategories/{memberToken}?returnplaylistcount={bool}&skip={skip}&limit={limit}&sort={sort}` |
| GET | Get Featured Playlist Categories & Playlists | `/getfeaturedplaylistcategoriesandplaylists/{memberToken}?returnplaylistcount={bool}&returntrackcount={bool}&returnrootobjectsonly={bool}&playlistcategoryid={id}&skip={skip}&limit={limit}&sort={sort}` |
| GET | Get Featured Playlists | `/getfeaturedplaylistsplaylistonly/{memberToken}?showtrackcount={bool}&skip={skip}&limit={limit}&languagecode={code}&style={StyleID}` |
| POST | Get Featured Playlist | `/getfeaturedplaylistandtracks/{memberToken}/{PlaylistID}` |
| POST | Search Featured Playlist Tracks | `/searchfeaturedplaylisttracks/{memberToken}/{FeaturedPlaylistID}` |
| GET | Get Shared Playlist | `/getsharedplaylistwithmembertoken/{memberToken}/{PlaylistID}?Skip={skip}&Limit={limit}` |
| POST | Get Generated Cuesheet | `/getcuesheet/{memberToken}?filename={Filename}` |

## Search et predictive search

| Methode | Nom | Endpoint |
|---|---|---|
| INFO | Implementation Guide Search | `-` |
| POST | Search | `/cloudsearch/{memberToken}` |
| POST | Predictive Search | `/autocomplete/{memberToken}` |

Structure generale `cloudsearch` :

```json
{
  "SaveSearchHistory": "false",
  "SearchFilters": {
    "SearchType": "Normal",
    "IncludeInactive": "false",
    "MainOnly": "true",
    "SearchTermBundle": {},
    "PreviousSearchTermBundles": [],
    "ResultView": {
      "View": "Track",
      "Sort_Predefined": "ReleaseDate_Desc",
      "Skip": "0",
      "Limit": "20"
    }
  }
}
```

Search term bundles vus dans FLEX :

| Bundle | Usage |
|---|---|
| `St_Keyword_Aggregated` | Recherche texte multi-champs |
| `St_Keyword` | Recherche texte ciblee par champs |
| `St_Library` | Filtre labels/libraries par IDs |
| `St_Album` | Filtre albums par IDs |
| `St_Track` | Filtre tracks par IDs |
| `St_Playlist` | Filtre playlists |
| `St_Style`, `St_StyleGroup` | Genres/moods/instruments |
| `St_Category` | Categories |
| `St_BPM` | Plage BPM |
| `St_Duration` | Plage duree |
| `St_ReleaseDate` | Date/annee de release |
| `St_Rightholder` | Ayant-droit |
| `St_Audio` | Similarity search |

Vues de resultats vues dans FLEX : `Track`, `Album`, `Library`, `Playlist`, `Style`, `RightHolder`.

Facets vues dans FLEX : `Facet_Library`, `Facet_Album`, `Facet_Style`, `Facet_Category`, `Facet_BPM`, `Facet_Duration`, `Facet_Composer`, `Facet_ReleaseYear`.

## Search Similar : AIMS, Cyanite, Harmix

Tous les providers utilisent `cloudsearch` pour les resultats et des endpoints auxiliaires pour upload/ingestion.

| Provider | Mode | Endpoint(s) |
|---|---|---|
| AIMS | TrackID | `POST /cloudsearch/{memberToken}` avec `St_Audio.Audio[].TrackID` |
| AIMS | Upload audio | `getpresigneduploadurl` -> `confirmpresignedupload` -> `cloudsearch` |
| AIMS | URL | `getexternalaudiobyurl` -> `cloudsearch` |
| AIMS | Prompt | `cloudsearch` avec `St_Audio.Audio[].Prompt` |
| Cyanite | TrackID | `cloudsearch` |
| Cyanite | Upload audio | `getpresigneduploadurl` -> `confirmpresignedupload` -> `getexternalaudiostatus` -> `cloudsearch` |
| Cyanite | URL | `getexternalaudiostatus` -> `cloudsearch` |
| Cyanite | Free text | `cloudsearch` |
| Harmix | TrackID | `cloudsearch` |
| Harmix | Upload audio | `getpresigneduploadurl` -> `confirmpresignedupload` -> `cloudsearch` |
| Harmix | URL | `getexternalaudiobyurl` -> `cloudsearch` |
| Harmix | Prompt | `cloudsearch` |

Exemple AIMS/Harmix par prompt :

```json
{
  "SearchFilters": {
    "SearchTermBundle": {
      "St_Audio": {
        "Audio": [{ "Prompt": "jazzy" }],
        "Start": "",
        "Duration": ""
      }
    },
    "ResultView": {
      "Sort_Predefined": "EvokeRanking",
      "Evoke_IncludeSeed": false,
      "Evoke_PrioritizeBPM": false,
      "Evoke_SuppressVocals": false,
      "Limit": "10"
    }
  }
}
```

## Member Management

| Methode | Nom | Endpoint |
|---|---|---|
| INFO | Implementation Guide Members | `-` |
| POST | Register Member | `/registermember/{serviceToken}` |
| POST | Validate Username | `/validateusername/{serviceToken}` |
| POST | Validate Email | `/validatememberemail/{serviceToken}` |
| POST | Send Verify Member Link Email | `/sendmemberverifylinkemail/{serviceToken}` |
| GET | Validate Verify Member Token | `/validateverifymembertoken/{serviceToken}/{VerifyMemberToken}` |
| POST | Verify Member | `/verifymember/{serviceToken}` |
| POST | Authenticate Member & Generate Persistent Member Token | `/getmembertoken/{serviceToken}` |
| GET | Validate Member Token | `/getservicetokeninfo/{memberToken}` |
| GET | Expire Member Token | `/expiretoken/{memberToken}` |
| POST | Validate Persistent Member Token | `/validatepersistentlogintoken/{serviceToken}` |
| POST | Expire Persistent Member Token | `/expirepersistentlogintoken/{serviceToken}` |
| GET | Get Single Sign-on Token | `/getssotoken/{memberToken}` |
| POST | Validate Single Sign-on Token | `/validatessotoken/{serviceToken}` |
| GET | Get Member Details | `/getmember/{memberToken}` |
| POST | Get Member Details (Invited) | `/getinvitedmembertoken/{serviceToken}` |
| POST | Update Member Details | `/updatemember/{memberToken}` |
| POST | Get Member Image Upload URL | `/getpresigneduploadurl/{memberToken}` |
| POST | Confirm Member Image Upload Complete | `/confirmpresignedupload/{memberToken}` |
| POST | Remove Member Image | `/removeassignedupload/{memberToken}` |
| GET | Remove Member | `/removemember/{memberToken}` |
| POST | Send Reset Password Email | `/sendpasswordresetemail/{serviceToken}` |
| GET | Validate Reset Password Token | `/validatepasswordresettoken/{serviceToken}/{ResetToken}` |
| POST | Update Member Password (Reset) | `/updatepasswordusingtoken/{serviceToken}` |
| POST | Subscribe Member | `/membersubscribe/{memberToken}` |

La doc Members liste de nombreux champs possibles : `firstname`, `lastname`, `email`, `company`, `address1`, `country`, `phone`, `production`, `username`, `password`, `termsaccept`, `subscribe`, `fileformat`, `searchformat`, `searchsort`, `sampleenabled`, `downloadenabled`, `downloadlimit`, etc. Il faut mapper ces champs avec les formulaires Parigo existants.

## Member Groups

| Methode | Nom | Endpoint |
|---|---|---|
| GET | Validate Verify Member Group Approval Token | `/validatemembergroupmemberapprovaltoken/{serviceToken}/{VerifyMemberGroupApprovalToken}` |
| POST | Verify Member Group Approval | `/verifymembergroupmemberapproval/{serviceToken}` |
| GET | Get Member Group Regions | `/getmembergroupregions/{memberToken}/{MemberGroupID}` |
| POST | Update Member Group Region | `/updatemembergroupregion/{memberToken}/{MemberGroupID}` |
| GET | Get Member Group Productions | `/getmembergroupproductions/{memberToken}/{MemberGroupID}?sort={Sort}` |
| GET | Get Member Group Production Categories | `/getmembergroupproductioncategories/{memberToken}/{MemberGroupID}/{MemberGroupProductionID}?returnplaylistcount={bool}&skip={skip}&limit={limit}&sort={sort}` |
| GET | Get Member Group Production Categories & Playlists | `/getmembergroupproductioncategoriesandplaylists/{memberToken}/{MemberGroupID}/{MemberGroupProductionID}?returnplaylistcount={bool}&returntrackcount={bool}&returnrootobjectsonly={bool}&productioncategoryid={id}&skip={skip}&limit={limit}&sort={sort}` |
| GET | Get Member Group Production Playlist & Tracks | `/getmembergroupproductionplaylistandtracks/{memberToken}/{MemberGroupID}/{MemberGroupProductionID}/{FeaturedPlaylistID}?returntracks={bool}&includeinactive={bool}&languagecode={code}&skip={skip}&limit={limit}&sort={sort}` |
| POST | Search Member Group Production Playlist Tracks | `/searchmembergroupproductionplaylisttracks/{memberToken}/{MemberGroupID}/{MemberGroupProductionID}/{FeaturedPlaylistID}` |

## Member Activity : playlists

| Domaine | Endpoints principaux |
|---|---|
| Folders/categories | `addmemberplaylistcategory`, `updatememberplaylistcategory`, `getmemberplaylistcategories`, `getmemberplaylistcategoriesandplaylists`, `searchmemberplaylistcategoriesandplaylists`, `reordermemberplaylistcategory`, `removememberplaylistcategory` |
| Playlists | `addmemberplaylist`, `updateplaylist`, `highlightplaylists`, `autosaveplaylists`, `getmemberplaylistsnotracks`, `getmemberplaylists`, `getmemberplaylist`, `reorderplaylists`, `removeplaylist`, `archiveplaylist`, `restorearchiveplaylist`, `duplicatememberplaylist`, `copytomemberplaylist`, `publishmemberplaylist` |
| Playlist tracks | `searchmemberplaylisttracks`, `filtermemberplaylisttracks`, `addtomemberplaylists`, `addtrackstoautosaveplaylists`, `reordermemberplaylisttracks`, `removeplaylisttracks`, `suggestmemberplaylisttracks` |
| Shares | `getmemberplaylistshares`, `updatememberplaylistshare`, `removememberplaylistshare` |
| Search history | `getmemberplaylistsearches` |
| Schedule | `getmemberplaylistschedule`, `updatememberplaylistschedule`, `deletememberplaylistschedule`, `getmemberplaylistschedulerun` |
| Disco | `sendtodisco`, `getaccountserviceactivityhistory` |

Points fonctionnels :

- Suppression folder : parametres `keepChildren` et `giveShareCopy`.
- Partage/collaboration : endpoints de shares et delivery.
- Disco : playlists > 100 tracks non supportees ; formats MP3/AIFF/WAV ; envoi asynchrone avec email final.

## Member Activity : downloads, favourites, shares, history, tags, comments, saved searches

| Domaine | Endpoints principaux |
|---|---|
| Downloads | `validatemusicdownloadrequest`, `getmusicdownload`, `getmusicdownloadinfo` |
| Favourites | `addtofavourites`, `getfavourites`, `removefavouritestrack`, `removeallfavouritestracks` |
| Sharing | `getinvitedmembertoken`, `getsharemusicurl`, `sendsharemusiclinkemail`, `deliversharemusic`, `getsharemusic`, `acceptsharemusic` |
| History | `gethistorybymembertoken`, `getdownloadhistorybymembertoken`, `gethistorybycommunications` |
| Tags | `addmembertag`, `updatemembertag`, `addtomembertags`, `getmembertags`, `getmembertagtracks`, `getmembertagsbytrack`, `removetrackmembertag`, `removemembertag`, `removemembertags` |
| Comments | `addtrackmembercomment`, `updatetrackmembercomment`, `gettrackmembercomments`, `removetrackmembercomment` |
| Saved searches | `addmembersavesearch`, `updatemembersavesearch`, `searchmembersavesearches`, `removemembersavedsearchterm`, `removemembersavedsearch`, `removeallmembersavedsearch` |

Download notes officielles :

- Immediate streaming formats : MP3 128 kbps/44.1 kHz et MP3 96 kbps/44.1 kHz.
- Immediate downloads : MP3 320 kbps, MP3 128 kbps, MP3 96 kbps ; WAV/AIFF immediate si presents au repository.
- Les autres formats peuvent etre transcodes dynamiquement et livres par email, typiquement 5-15 minutes.
- Stems : download possible uniquement en package ZIP de stems ; pas de stem individuel ; pas de main track + stems dans le meme package.

## Content Management

| Methode | Nom | Endpoint |
|---|---|---|
| GET | Get Web Content | `/getwebcontent/{serviceToken}/{Code}/{RegionID}` |
| GET | Get Web Content Children | `/getchildwebcontent/{serviceToken}/{ParentCode}/{RegionID}` |

Ces endpoints peuvent alimenter des pages editoriales gerees dans Harvest, mais il faut verifier si Parigo veut conserver ce CMS ou gerer le contenu dans Next.js.

## E-commerce Public API

| Methode | Nom | Endpoint |
|---|---|---|
| GET | Get Rates | `/getrates/{serviceToken}/{Style}/{CurrencyCode}` |
| GET | Get Special Rate | `/getspecialratebycode/{serviceToken}/{SpecialRateCode}/{CurrencyCode}` |
| INFO | Implementation Guide - Ecommerce | `-` |
| POST | Create Invoice | `/addinvoice/{memberToken}` |
| POST | Get Invoice | `/getinvoice/{memberToken}` |
| POST | Void Invoice | `/voidinvoice/{memberToken}` |
| POST | Search Invoice | `/searchinvoices/{memberToken}` |
| POST | Pay Invoice | `/payinvoice/{memberToken}` |
| GET | Get Invoice Document | `/getinvoicedownloadurl/{memberToken}/{InvoiceID}` |

La doc precise que Harvest gere rates/invoices/PDF/email, mais ne prend pas le paiement : le payment gateway doit etre gere hors Harvest, puis `payinvoice` met l'invoice a l'etat paid.

## Admin Management

| Methode | Nom | Endpoint |
|---|---|---|
| POST | Authenticate Management Token | `/getmanagementtoken/{serviceToken}` |
| POST | Update Member Group Details | `/updatemembergroup/{managementToken}/{MemberGroupID}` |

Acces strictement serveur/back-office.
