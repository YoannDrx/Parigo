# Rapport technique AIMS API pour Parigo

Compte-rendu lisible en Markdown de l exploration de la documentation AIMS Similarity Search, avec focus sur une future barre de recherche IA dans Parigo.

## Sources

| Source | Valeur |
| --- | --- |
| Documentation publique | https://docs.aimsapi.com/ |
| Base API | https://api.aimsapi.com/v1/ |
| Collection Postman | e25a9929-95ab-4b8d-a6c9-bd9fa1d120a1 |
| Published ID | S17qTprj |
| Version tag | latest |
| Publication indiquee par Postman | 2021-03-11T12:00:16.000Z |
| Extraction | 20 mai 2026 |


## Synthese

AIMS expose une API de similarite musicale et de recherche augmentee. Pour Parigo, le coeur probable de la future barre IA est `POST /v1/search`, soit en mode Prompt Search, soit en mode Unified Search si cet addon est actif. La meme route couvre aussi des seeds URL, pistes internes, prompts et video selon les modules actives.

La documentation distingue un socle de recherche similaire et gestion de catalogue, puis un bloc `Paid addons` qui contient les fonctions les plus interessantes pour une barre IA: Prompt Search, Unified Search, autocomplete, highlights, selection de segment, ignore vocals, priorisation BPM, video search, projects/playlists/spaces.

AIMS demande explicitement de les contacter avant d integrer les `Paid addons`: le contrat peut ne pas tout inclure et certaines fonctions peuvent encore evoluer.

| Metrique | Valeur |
| --- | --- |
| Sections extraites | 90 |
| Requetes Postman documentees | 182 |
| Routes methode + chemin uniques | 110 |
| GET / POST / DELETE | 39 / 134 / 9 |


## Capacites principales pour Parigo


### Barre de recherche IA

| Besoin Parigo | Capacite AIMS |
| --- | --- |
| Recherche texte naturelle | `Prompt Search` ou `Unified Search` via `/v1/search`. |
| Barre unique texte + URL + ID | `Unified Search` avec `query` couvre prompt, URL, full-text, tags, keywords, album code, numeric/range et ID interne. |
| Suggestions pendant la saisie | `/v1/autocomplete` pour metadata, `/v1/prompt-suggestions` pour prompts. |
| Resultats exploitables UI | Retourne `query_id`, `did_you_mean`, `totals`, `tracks` et, en `detailed`, beaucoup de metadata catalogue. |
| Amelioration par usage | `/v1/feedback/conversion` consomme le `query_id` et les actions utilisateur. |
| Controle editorial | Filtres imbriques AND/OR sur metadata; valeurs de facettes via `/v1/tracks/values/[metadata_field]`. |


### Socle de recherche similaire

| Fonction | Details |
| --- | --- |
| Similarite par ID | `POST /v1/search` avec `seeds[].type="track"` et `value=id_client`. Options: segment, pagination, `detailed`, filtres, highlights, ignore same album/versions, BPM. |
| Similarite multi-IDs | `POST /v1/query/by-ids` avec `track_ids` et `input_id_type=client\|system`; jusqu a 100 IDs selon la doc. |
| Similarite par upload audio | `POST /v1/query/by-file` en multipart; MP3, WAV, AIF/AIFF; limite 120 MB; retourne `query_id` et hash reutilisable via header `X-Hash`. |
| Requete par hash audio | `POST /v1/query/by-file-hash` evite de reteleverser un fichier deja utilise. |
| Similarite par URL tierce | `POST /v1/search` avec `seeds[].type="url"`; YouTube, Vimeo, SoundCloud, Spotify, Apple Music, TikTok. |
| Audio de ressource liee | `POST /v1/download/by-url` retourne un MP3 pour pre-ecoute/selection de segment; ressource max 15 minutes. |
| Similarite par URL de fichier | `POST /v1/search` avec `seeds[].type="file-url"`; URL publique accessible en GET, MP3/WAV, extension presente, limite 120 MB. |


### Addons utiles

| Addon | Ce que cela permet |
| --- | --- |
| Prompt Search | Recherche musicale par langage naturel: phrases, briefs synchro, descriptions de scene. |
| Unified Search | Barre unique query pour tags, full-text, keywords, album code, nombres/ranges, IDs internes, prompt, URL. |
| Autocomplete | Suggestions metadata et prompt pendant la saisie. |
| Highlights | Segments de similarite a mettre en evidence dans les resultats. |
| Segment Tool | Recherche sur un extrait choisi; offset/limit ou time_offset/time_limit, maximum 60 s. |
| Ignore vocals | suppress_vocals=true pour privilegier l instrumental. |
| Prioritise BPM | prioritise_bpm=true et bpm_range pour rapprocher le BPM du seed. |
| Search by tag | Recherche de pistes et collections par tag, avec filtres. |
| Playlist Generator | Playlists single-seed, multi-seed ou transition, longueur max documentee 1000. |
| Video Search | Upload video MOV/MPEG/MP4/AVI, recherche par hash video ou lien YouTube. |
| Similar Albums / Artists | Detail par ID/key et recherche de collections similaires. |
| Smart Projects | CRUD projets, ajout/retrait de pistes, suggestions dans projet. |
| Playlists | CRUD playlists, suggestions, similarite de playlists, playlist plugging. |
| Custom Tags | Tags propres au compte, pistes definissant un tag, suggestions basees sur tag. |
| Spaces | Workspaces generes par prompt, suggestions/refinement/creation de collections. |
| Grouping | Groupes dans projets/playlists et recommendations par group_id. |


## Authentification et securite

| Sujet | Implication |
| --- | --- |
| Authentification serveur | `Authorization: apiSecret` sur les requetes qui exigent une authentification. |
| Token temporaire front | `GET /v1/token/generate` retourne un token one-shot valable 1 heure UTC, a passer en `X-Token` et non en `Authorization`. |
| Perimetre token temporaire | Uniquement les endpoints de requetes AIMS et Feedback selon la documentation; pas les endpoints de gestion catalogue. |
| Headers frequents | `Content-Type`, `X-Requested-With: XMLHttpRequest`, `Authorization`; certains endpoints Unified/Autocomplete utilisent aussi `X-User-Id`. |
| Regle Parigo | `apiSecret` ne doit jamais etre expose dans le navigateur; preferer un proxy Next.js serveur, sauf choix explicite de flux direct avec token temporaire. |

Le flux recommande pour Parigo est un proxy serveur Next.js: le navigateur appelle Parigo, Parigo appelle AIMS avec le secret, puis renvoie un modele de resultat normalise. Le token temporaire one-shot peut etre utile si l on veut laisser le navigateur appeler directement certains endpoints de recherche/feedback, mais il ne remplace pas la protection du secret pour les operations catalogue.

## Modele de requete et resultats

Les recherches modernes convergent vers `/v1/search`. Le corps peut etre base sur `seeds` ou `query` selon le module. Les seeds documentes incluent `track`, `url`, `file-url`, `prompt` et `video`.

| Parametre | Usage |
| --- | --- |
| page / page_size | Pagination. Les schemas indiquent souvent page min 1 et page_size max 1000; certaines anciennes sections multi-ID/fichier indiquent 10000, a confirmer. |
| detailed | Retourne plus de metadata de piste ou collection. |
| filter | Filtre imbrique avec `logic` et `conditions`. |
| highlights | Demande les segments de similarite dans les resultats si l addon est actif. |
| offset / limit | Selection de segment pour seeds JSON; segment max 60 s. |
| time_offset / time_limit | Equivalent multipart/hash pour fichiers; segment max 60 s. |
| query_id | Identifiant de recherche retourne par AIMS et requis pour feedback. |

La FAQ precise que les resultats sont tries par similarite decroissante, mais qu aucun score de similarite numerique n est fourni.

## Endpoints majeurs

L inventaire complet des 182 requetes est dans [endpoint-inventory.csv](./endpoint-inventory.csv). La table ci-dessous resume les surfaces importantes pour l integration.

| Capacite | Methode | Route | Usage |
| --- | --- | --- | --- |
| Generate one-off temporary token | GET | /v1/token/generate | Token front one-shot, valable 1 heure UTC, header X-Token ensuite. |
| Feedback conversion | POST | /v1/feedback/conversion | Remontee play, download, like/dislike, add to project, etc. via query_id. |
| Search similar by ID / URL / file URL / prompt / video | POST | /v1/search | Route centrale de recherche; seeds ou query selon module active. |
| Search by multiple IDs | POST | /v1/query/by-ids | Jusqu a 100 IDs; input_id_type client ou system. |
| Search by audio file | POST | /v1/query/by-file | Multipart; MP3, WAV, AIF/AIFF; 120 MB max; retourne query_id et hash reutilisable. |
| Search by audio file hash | POST | /v1/query/by-file-hash | Reuse d un fichier deja envoye. |
| Download linked resource audio | POST | /v1/download/by-url | Retourne le MP3 d une URL tierce pour ecoute/selection de segment; ressource max 15 min. |
| Track metadata by system/client ID | GET | /v1/tracks/system/{id} / /v1/tracks/client/{id_client} | Lire statut de traitement et metadata. |
| Add track | POST | /v1/tracks | Ajout catalogue AIMS; traitement asynchrone; webhook optionnel. |
| Update track metadata | POST | /v1/tracks/system/{id} / /v1/tracks/client/{id_client} | Mise a jour partielle des champs metadata. |
| Delete track | DELETE | /v1/tracks/system/{id} / /v1/tracks/client/{id_client} | Suppression necessaire quand une piste disparait du catalogue Parigo. |
| Autocomplete metadata | POST | /v1/autocomplete | Suggestions sur query. |
| Prompt suggestions | POST | /v1/prompt-suggestions | Suggestions de prompts. |
| Possible filter values | GET | /v1/tracks/values/[metadata_field] | Valeurs facettes pour tags, artists, composers, genres, instruments, moods, music_for, album_keywords. |
| Projects / playlists / custom tags / spaces | GET/POST/DELETE | /v1/project*, /v1/playlist*, /v1/custom-tag*, /v1/spaces* | CRUD, ajout de pistes, suggestions, similarite de collections et workflows editoriaux. |


## Filtrage

Le filtrage est disponible sur les recherches principales et beaucoup d addons: ID, multi-IDs, fichier, URL, file URL, prompt, tag, playlist generator, projects, playlists, albums, artists, video, custom tags. La structure accepte des conditions imbriquees avec logique `and` ou `or`.

### Champs filtrables

| Champ | Type |
| --- | --- |
| `id` | integer |
| `track_name` | string |
| `id_client` | string |
| `duration` | integer |
| `tags` | text |
| `processed_at` | string |
| `release_year` | integer |
| `filepath` | string |
| `track_number` | string |
| `track_code` | string |
| `track_description` | string |
| `version` | boolean |
| `version_tag` | string |
| `version_name` | string |
| `master_track_number` | string |
| `master_track_id` | string |
| `isrc` | string |
| `label_name` | string |
| `label_code` | string |
| `label_lc_name` | string |
| `album_number` | string |
| `album_code` | string |
| `album_name` | string |
| `album_description` | string |
| `tempo` | string |
| `bpm` | integer |
| `music_key` | string |
| `music_meter` | string |
| `lyrics` | text |
| `lyrics_language` | string |
| `artists` | text |
| `composers` | text |
| `publisher` | text |
| `genres` | text |
| `subgenres` | text |
| `instruments` | text |
| `moods` | text |
| `music_for` | text |
| `decades` | text |
| `vocals` | text |
| `album_keywords` | text |
| `cuesheet_info` | text |
| `active` | boolean |
| `licensable` | boolean |
| `restricted` | boolean |
| `explicit` | boolean |
| `profane` | boolean |
| `commercial` | boolean |
| `territories` | text |
| `categories` | text |
| `looped` | boolean |
| `pro_affilated` | boolean |
| `content_id_registered` | boolean |
| `released_at` | string |
| `visibility` | text |
| `artist_ids` | text |


### Operateurs

| Operateur | Sens | Types supportes | Note |
| --- | --- | --- | --- |
| `eq` | is equal to | integer, string, text, boolean |  |
| `neq` | is not equal to | integer, string, text, boolean |  |
| `gt` | is greater than | integer |  |
| `gte` | is greater than or equal | integer |  |
| `gten` | is greater than or equal or NULL | integer |  |
| `lt` | is lower than | integer |  |
| `lte` | is lower than or equal | integer |  |
| `begins` | begins with | string, text |  |
| `contains` | contains | string, text |  |
| `not-contains` | does not contain | string, text |  |
| `ends` | ends with | string, text |  |
| `null` | is null | integer, string, text, boolean | use null as value |
| `not-null` | is not null | integer, string, text, boolean | use null as value |
| `empty` | is empty | string, text | use null as value |
| `not-empty` | is not empty | string, text | use null as value |
| `in` | is contained in | string, text | separate more values by , (comma) and use them as an array ["foo", "bar"] |

Les valeurs de facettes peuvent etre recuperees via `GET /v1/tracks/values/[metadata_field]` pour `tags`, `artists`, `composers`, `genres`, `instruments`, `moods`, `music_for` et `album_keywords`. La liste est rafraichie quotidiennement selon la documentation.

## Gestion catalogue et synchronisation

AIMS doit etre synchronise avec le catalogue Parigo pour que les pistes soient cherchables. Le champ cle cote client est `id_client`: il sert a faire le lien entre les resultats AIMS et la base Parigo.

| Operation | Endpoint / point d attention |
| --- | --- |
| Ajouter une piste | `POST /v1/tracks` multipart avec audio et metadata; MP3, WAV, AIF/AIFF, limite 120 MB. La piste est traitee de facon asynchrone. |
| Ajouter par URL publique | La doc indique qu une URL publique peut etre envoyee en JSON au lieu d un multipart pour le champ `track`; a tester avec le compte Parigo. |
| Webhook de traitement | `hook_url` optionnel; pas d auth, timeout 5 s, payload JSON succes/echec, reponse ignoree par AIMS. |
| Status polling | Lire `processed_at` et `process_input_error` via les endpoints get track. |
| Mettre a jour metadata | `POST /v1/tracks/system/{id}` ou `/client/{id_client}`; seuls les champs envoyes sont modifies. |
| Changer audio | La doc demande de supprimer puis recreer la piste avec le meme ID si le fichier audio change. |
| Supprimer | `DELETE /v1/tracks/system/{id}` ou `/client/{id_client}`; necessaire pour eviter que des pistes supprimees reapparaissent en resultats. |
| Lister / compter | `GET /v1/tracks` avec page/page_size, `GET /v1/tracks/length`; page_size max documente 1000 pour listing. |


### Metadata documentees

AIMS indique que les champs requis peuvent etre ajustes par compte. Le fichier PDF contient la meme table; elle est aussi reprise ici pour lecture directe.

| Champ | Requis par defaut | Type |
| --- | --- | --- |
| `track` | yes | file |
| `id_client` | yes | string |
| `track_name` | yes | string |
| `release_year` | yes | int |
| `track_number` | yes | string |
| `track_code` | no | string |
| `track_description` | no | string |
| `filepath` | yes | string |
| `version` | no | bool |
| `version_tag` | yes | string |
| `version_name` | no | string |
| `master_track_number` | no | string |
| `isrc` | no | string |
| `label_name` | yes | string |
| `label_code` | yes | string |
| `label_lc_name` | no | string |
| `album_number` | yes | string |
| `album_code` | no | string |
| `album_name` | yes | string |
| `album_description` | no | string |
| `album_keywords` | no | array |
| `tempo` | no | string |
| `bpm` | no | int |
| `music_key` | no | string |
| `music_meter` | no | string |
| `lyrics` | no | string |
| `lyrics_language` | no | string |
| `artists` | no | array |
| `composers` | no | array |
| `publisher` | no | string |
| `genres` | yes | array |
| `instruments` | yes | array |
| `moods` | yes | array |
| `music_for` | yes | array |
| `album_keywords` | no | array |
| `active` | no | bool |
| `licensable` | no | bool |
| `restricted` | no | bool |
| `commercial` | no | bool |
| `hook_url` | no | string |
| `territories` | no | array |
| `decades` | no | array |
| `vocals` | no | array |
| `sync_history` | no | bool |
| `recognisable` | no | bool |
| `jam_sync` | no | bool |
| `hit` | no | bool |
| `top` | no | bool |
| `publishing_partner_us` | no | array |
| `publishing_partner` | no | array |
| `share` | no | float |
| `owner` | no | array |
| `external_id` | no | string |
| `categories` | no | array |
| `looped` | no | bool |
| `pro_affiliated` | no | bool |
| `content_id_registered` | no | bool |
| `released_at` | no | string |
| `visibility` | no | array |
| `custom_data` | no | array |
| `artist_ids` | no | array |
| `image` | no | file, string |
| `master_track_id` | no | string |
| `cuesheet_info` | no | string |
| `explicit` | no | bool |
| `profane` | no | bool |
| `subgenres` | no | array |
| `filenames` | no | array |
| `title` | no | string |
| `key` | no | string |
| `contact` | no | string |
| `description` | no | string |
| `keywords` | no | array |
| `track_ids` | no | array |
| `featuring` | no | array |
| `socials` | no | array |
| `listener_territories` | no | array |
| `monthly_listeners` | no | int |
| `first_release_year` | no | int |
| `last_release_year` | no | int |
| `followers` | no | int |
| `popularity` | no | int |
| `on_tour` | no | bool |


## Feedback et apprentissage d usage

Chaque recherche AIMS renvoie un `query_id`. L endpoint `POST /v1/feedback/conversion` permet d envoyer les conversions associees a une piste resultat.

Types de feedback documentes: `track_download`, `track_similar`, `track_add_to_project`, `track_like`, `track_dislike`, `track_play`, `album_download`, `track_is_similar`, `track_is_not_similar`.

Pour Parigo, il faut conserver `query_id` au niveau de la session de resultats et l envoyer avec l ID client de la piste lorsque l utilisateur lit, sauvegarde, telecharge ou affine une recherche.

## Collections, projets, playlists, tags, spaces

Au-dela de la barre de recherche, AIMS documente une couche de collections utiles pour des workflows editoriaux:

- `Similar Albums` et `Similar Artists`: detail par key/ID, recherche similaire, filtres.
- `Smart Projects`: CRUD projets, ajout de pistes internes/URL/file URL/fichier, suggestions dans projet, filtres.
- `Playlists`: CRUD, ajout/retrait de pistes, suggestions, playlists similaires, playlist plugging pour trouver les playlists ou placer une piste.
- `Custom tags`: tags propres au compte AIMS, pistes definissant le tag, recommendations basees sur le tag.
- `Spaces`: generation de workspaces par prompt, collections suggerees, refinement de collections, creation de collections dans un space.
- `Grouping`: recupere des groupes dans projets/playlists et permet des recommendations par groupe.

## Roadmap d integration Parigo proposee

| Etape | Travail recommande |
| --- | --- |
| MVP barre IA | Confirmer Unified Search ou Prompt Search dans le contrat. Pour une barre unique texte/URL, Unified Search est le meilleur candidat. |
| Proxy serveur | Route serveur Parigo: recoit la saisie, ajoute Authorization, appelle AIMS, normalise les pistes, conserve query_id. |
| Detection input | Si Unified Search est actif, envoyer query tel quel. Sinon router URL vers seed url, prompt vers seed prompt, ID vers seed track. |
| Autocomplete | Brancher /v1/autocomplete et/ou /v1/prompt-suggestions avec debounce et feature flag. |
| Feedback | Envoyer POST /v1/feedback/conversion sur play, download, like/dislike, add_to_project, relance similarite. |
| Synchronisation catalogue | Mapper chaque piste Parigo vers id_client; add/update/delete cote AIMS lors des changements catalogue. |
| Uploads utilisateur | Prevoir multipart, progression, limite 120 MB, formats acceptes et reuse du hash. |
| Filtres | Reutiliser les facettes Parigo compatibles: genres, instruments, moods, music_for, duration, BPM, label, album, territories. |


## Points a clarifier avec AIMS

| Sujet | Question / risque |
| --- | --- |
| Addons et contrat | Confirmer Unified Search, Prompt Search, Autocomplete, Highlights, Segment Tool, Ignore vocals, Prioritise BPM, Video Search, Spaces, Projects/Playlists. |
| Credentials | Demander apiSecret, compte Playground/staging, production, eventuel X-User-Id, politique de rotation, IP/CORS si necessaire. |
| Metadata template | Les champs requis sont des defaults; AIMS indique qu ils peuvent etre ajustes par compte. |
| IDs | Choisir l ID stable Parigo a envoyer comme id_client; valeur unique et courte. |
| Volumetrie | La doc mentionne erreurs 429 a 300 req/min et FUP, mais il faut demander SLA, latence, quotas reels et batch/import initial. |
| Schemas d exemples | Certains exemples varient entre value, link, track ou track_id; valider les schemas contractuels avec le compte AIMS. |
| URLs tierces | Spotify et Apple Music sont limites a des previews; YouTube/TikTok/Vimeo peuvent echouer selon droits, geoblocage, prive/protege. |
| Segments | Ne pas envoyer offset/limit sans connaitre la duree; les segments hors bornes retournent des erreurs 4xx. |


## Pieges documentes

- Avec certains frameworks front, ne pas forcer manuellement `Content-Type: multipart/form-data` lors d un upload: laisser le client poser la boundary.
- Comparer les resultats Parigo avec les memes appels dans Postman/Insomnia en fin d integration.
- Ne pas fournir de segment hors duree piste; sans segment explicite AIMS utilise un comportement par defaut autour de 30-60 secondes selon le media.

## Codes d erreur documentes

AIMS renvoie les exceptions dans un objet JSON avec `code`, `message` et parfois `payload`. Les 4xx sont generalement corrigeables cote client; les 5xx demandent une resolution cote AIMS ou dependance externe.

| Code | HTTP | Message | Description |
| --- | --- | --- | --- |
| `1001` | 503 | This functionality is currently not available. Please try again later! | Signals an internal error that resulted in a denial of service. |
| `2001` | 422 | The track is already in the index! | Returned when a duplicate track is added to the index. |
| `2101` | 500 | Source audio file not found! | Returned when a source audio file is missing (corrupted upload). |
| `2102` | 500 | Source audio file failed to upload! | Returned when a source audio file doesn't exist (empty upload). |
| `3001` | 422 | No resource identifier can be found in the url! | Returned when there is no identificator in the link (e.g. https://www.youtube.com/). |
| `3002` | 422 | The requested media is too long! | Returned when the requested resource media is longer than 15 minutes. |
| `3003` | 422 | The link is not a valid url! | The string value supplied as an URL is not a valid URL. |
| `3004` | 422 | The linked resource is not a track but a playlist, album, or similar! | The URL doesn't point to a track but to a playlist, set, album, user or other resource. |
| `3005` | 422 | The server hosting the linked resource returned 404: Not Found! | The requested resource can not found on the source platform (e.g. YouTube). |
| `3006` | 422 | The server hosting the linked resource reported the resource is unavailable! | The requested resource is not available on the source platform. |
| `3007` | 422 | This resource is blocked in your country on copyright grounds! | The requested resource has been blocked by the source platform on copyright grounds. |
| `3008` | 422 | This video has been removed by the uploader! | The requested resource has been removed from the source platform. |
| `3009` | 422 | The uploader has not made this video available in your country! | The requested resource is blocked from downloading by the uploader. |
| `3010` | 422 | This video is private or protected by a password! | The requested resource can not be retrieved because it is protected by a password/private. |
| `3011` | 422 | There is no audio data for the linked resource! Please check that time_offset and time_limit parameters are within the length of the linked resource. | The requested resource is probably shorter than the requested offset and limit. |
| `3012` | 422 | The identifier for this video is invalid! | The identifier of YouTube video is not valid (e.g. a part is missing). |
| `3013` | 422 | This live stream recording is not available! | YouTube reports the requested video belongs to a live stream that has ended and is no longer available. |
| `3014` | 422 | There's no preview URL for the requested track. | Spotify doesn't guarantee there will be a preview for all tracks. |
| `3015` | 422 | This video has not been rated! | Vimeo doesn't allow public access to unrated videos. |
| `3101` | 502 | The resource can not be downloaded at the moment! | Returned when a requested linked media can't be downloaded (possible encoding issue, 3rd party server hosting the media is down, ...). |
| `3501` | 422 | Resource type can not be determined! Host is not supported. | Returned when the hosting service for linked media is not recognized or supported (e.g. https://metube.id). |
| `3601` | 502 | Requested resource is unavailable. | Returned when a requested linked media is not available (location-blocked or not allowed to download by the uploader). |
| `3801` | 502 | Downloader service is unavailable! | Signals an error in downloader service that resulted in a denial of service. |
| `4102` | 422 | Time offset must be lesser than the duration! | Returned when the offset parameter is set to a value higher than the duration of the media. |
| `4103` | 422 | Time limit must be equal or lesser than the duration! | Returned when the limit parameter is set to a value higher than the duration of the media. |
| `4104` | 422 | The uploaded file is corrupted! | The file is not a valid readable audio file (e.g. corrupted streams, invalid headers). |
| `5001` | 404 | Track has not been found! | Returned when a non-existent track has been requested. |
| `5101` | 422 | Track has not been processed yet! | Returned when a non yet processed track has been requested. |
| `5201` | 404 | Tag has not been found! | Returned when a non-existent tag has been requested. |
| `5401` | 422 | Invalid combination of operator and field type! | Returned when a filtering operator is not supported for requested field. |
| `5402` | 422 | Invalid filtering field requested! | Returned when a non-existent or not supported field has been requested for filtering. |
| `5403` | 422 | Filter structure is not valid! Please check that your request contains valid JSON/FormData. | Returned when a syntactically invalid filtering request has been submitted. |
| `5501` | 404 | Collection has not been found! | Returned when you request a non-existing album, artist, custom tag, project or playlist. |
| `5502` | 404 | Collection is not yet processed! Please try again later. | Returned if you attempt search or suggest with an album, custom tag, playlist or project that is not yet processed. |
| `5601` | 404 | No track with specified hash found! | Returned if you attempt to use a non-existing hash for a previously performed file search. |
| `5701` | 501 | This type of search is not supported on your account! | Your account doesn't have the functionality enabled. Please contact us. |
| `6001` | 422 | Invalid request received! | Returned when a request is not valid (e.g. no audio file supplied for search by audio file; more information is to be found in the payload). |
| `6002` | 422 | No file supplied in the request! Please include the contents of the file. | The request doesn't contain a file. |
| `6003` | 422 | Request is malformed. This is usually caused by missing mutlipart boundary. If you're using Angular or Ember, make sure to leave the http client to set correct content-type header. | Request is malformed. Probably due to a binary file being sent as a string due to missing multipart boundary. |
| `6004` | 422 | The BPM-prioritising functionality is not enabled on your account! | BPM-prioritisation needs to be enabled before it can be used. Please contact us. |
| `6005` | 422 | Internal search only supports time_offset and time_limit parameters on accounts with highlights functionality enabled! | If you don't use highlights, internal search with offset is not supported. Please contact us. |
| `6006` | 422 | Failed to ignore tracks from the same album, because the original track does not have an album code! | Ignoring search results from the same album is only supported for tracks that have album codes. |
| `6007` | 422 | Failed to ignore other versions of the original track, because it does not have an album code! | Ignoring other versions of the seed track in the search results is only supported if the seed track has an album code, and track number (version) or master track number (main track). |
| `6008` | 422 | Failed to ignore other versions of the original track, because it does not have a master track number! | Ignoring other versions of the seed track in the search results is only supported if the seed track has an album code, and track number (version) or master track number (main track). |
| `6009` | 422 | Failed to ignore other versions of the original track, because it does not have a track number! | Ignoring other versions of the seed track in the search results is only supported if the seed track has an album code, and track number (version) or master track number (main track). |
| `6101` | 429 | Too many requests! | Returned when more than 300 requests are made within a minute. |
| `6102` | 429 | FUP limit reached! | Returned when more than the reserved amount of requests is made. |
| `6201` | 405 | Method not allowed! | Returned if you attempt to call en endpoint using an unsupported HTTP method. |


## Couverture par famille

| Famille | Nombre de requetes documentees |
| --- | --- |
| Authentication | 1 |
| Feedback | 1 |
| AIMS queries | 13 |
| Get track metadata | 2 |
| Managing tracks | 7 |
| Paid addons > Prompt Search | 1 |
| Paid addons > Unified Search | 11 |
| Paid addons > Video Search | 4 |
| Paid addons > Spaces | 15 |
| Paid addons > Search by tag | 9 |
| Paid addons > Playlist Generator | 6 |
| Paid addons > Highlights | 5 |
| Paid addons > Segment Tool | 5 |
| Paid addons > Ignore vocals | 2 |
| Paid addons > Prioritise BPM | 3 |
| Paid addons > Similar Albums | 6 |
| Paid addons > Similar Artists | 7 |
| Paid addons > Smart Projects | 21 |
| Paid addons > Playlists | 33 |
| Paid addons > Custom tags | 20 |
| Paid addons > Grouping | 10 |
