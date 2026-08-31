# Audit des images de labels Harvest

Audit live effectué le 31 août 2026 à 19:35 sur 108 labels uniques (108 lignes renvoyées par `getlibraries`).

## Résumé

- **66 labels ont une image exploitable** (HTTP 2xx, type MIME image et fichier décodable).
- **42 labels n’ont pas d’image exploitable**.
- **66 images sont carrées** à 1 % près.
- **0 images sont exploitables mais non carrées**.
- Harvest peut renseigner `LibraryLogoUrl` même lorsque l’asset répond en erreur : l’URL seule n’est pas une preuve de présence.


L’application conserve uniquement les ressources validées ci-dessous et utilise un monogramme local pour les autres. Pour rafraîchir cet inventaire après une livraison du back-office :

```bash
pnpm audit:harvest:label-images
```

Le détail complet, y compris les URLs d’assets expurgées de leurs jetons et les statuts HTTP, est disponible dans `docs/harvest/label-logo-audit.csv`.

## Labels avec une image (66)

| Label | ID Harvest | Dimensions | État |
|---|---|---:|---|
| 101 Music | `89645e4521bb7966` | 200 × 200 | OK |
| 101 Music Compilations | `f32fba09aa44c7ee` | 200 × 200 | OK |
| 1VU Music | `b3c4ddca9db054a7` | 200 × 200 | OK |
| 411 Artist Series | `df3de81e5d66af90` | 200 × 200 | OK |
| 411 Trailers + Sound Design | `a749af2eace70da4` | 200 × 200 | OK |
| 411 Underscore | `e966d94c651a84ce` | 200 × 200 | OK |
| 5 Alarm Music | `65a4e7d72ce69912` | 200 × 200 | OK |
| 7StyleMusic | `0f9769346759ee5a` | 200 × 200 | OK |
| Aardvark Music | `f04b18c7f0dc6435` | 200 × 200 | OK |
| AllMusicGallery | `4d4333b4cdd4cd6d` | 200 × 200 | OK |
| Alternative Reality | `8937b4fe8d9ec7f7` | 200 × 200 | OK |
| Amplitude Music Group | `c3e0e169602f837c` | 200 × 200 | OK |
| Annihilation Powered By Pitch Hammer | `e2a67cc33b71216d` | 200 × 200 | OK |
| Beat Xplosion | `71c7227f15580361` | 200 × 200 | OK |
| BeatChamber Records | `748b8fb470390591` | 200 × 200 | OK |
| Beta Rhythm Farm | `4cacdffc284d5742` | 200 × 200 | OK |
| Big Screen Music | `f4df85b9b479ca70` | 200 × 200 | OK |
| Blazed Out Music | `17d5316824b2432b` | 200 × 200 | OK |
| BoostTV | `fa24bebee2409643` | 200 × 200 | OK |
| Candy Flip | `c7bbbebd4f6e31eb` | 200 × 200 | OK |
| Cinemasounds Trailer Music | `bd3d71ed0e783249` | 200 × 200 | OK |
| Counter Music | `45247efbd3cb9486` | 200 × 200 | OK |
| Cre8v Media | `0e06111b303a8d16` | 200 × 200 | OK |
| CUE | `1226831895f3f0b3` | 200 × 200 | OK |
| Cue Source | `79e074ebd8cbc207` | 200 × 200 | OK |
| Dennis Music | `70da6d55dd5a85d8` | 200 × 200 | OK |
| Ear Parade | `8b062f2ad953807d` | 200 × 200 | OK |
| EGG Music | `356d10124345e046` | 200 × 200 | OK |
| Epic | `ee00b9c563465efd` | 200 × 200 | OK |
| Epic Score | `f88a7358b187dcfe` | 200 × 200 | OK |
| Fantasy Classical Series | `7d6e816903e6e5ad` | 200 × 200 | OK |
| Fantasy Documentary Series | `77ecf7bd7d628cbb` | 200 × 200 | OK |
| Fantasy Easy Listening Series | `1393b140d9262752` | 200 × 200 | OK |
| Fantasy FFX Sound Design | `694a3ed3315898df` | 200 × 200 | OK |
| Fantasy Film Series | `4cad6eefb3ed78b7` | 200 × 200 | OK |
| Fantasy Production Music Series | `83247e997cf81b63` | 200 × 200 | OK |
| Final Cue Music Library | `aa03f16539674cd5` | 200 × 200 | OK |
| Flava Of The Month | `d56c8eba3e618b47` | 200 × 200 | OK |
| Frameworks Music | `ebf1e65b0bc641a6` | 200 × 200 | OK |
| Frontier Trailer Music | `df81403166bca107` | 200 × 200 | OK |
| Fundamental Music | `f52e77743275c40a` | 200 × 200 | OK |
| Goods & Cargo | `6ca78b98823a7b88` | 200 × 200 | OK |
| Gourd Music | `52c535cd302c0e98` | 200 × 200 | OK |
| Green Zebra Music | `abd39666439212fa` | 200 × 200 | OK |
| Hella Good Mix | `7dda948c6e86c3fd` | 200 × 200 | OK |
| Hella Good Records | `759f51844237c829` | 200 × 200 | OK |
| InStyle Records | `645732ba70dae88e` | 200 × 200 | OK |
| JAMM | `fc7cd334044f496c` | 200 × 200 | OK |
| Kaplunk Production Music | `28be6a313c6cac3a` | 200 × 200 | OK |
| Level 77 Music - Vault Label | `99134c14706f6c40` | 200 × 200 | OK |
| Level 77 Music - Vive Music | `06f34d2b62642473` | 200 × 200 | OK |
| Minds And Music | `547126b7481097e3` | 200 × 200 | OK |
| Motus Music | `1cdf163c3b25d8ac` | 200 × 200 | OK |
| MUSIC FOR SPORT | `2804f603159a9e60` | 200 × 200 | OK |
| Never the End Music Group | `3f2f3a17c1130704` | 200 × 200 | OK |
| Noise Candy Music | `8350b35f4228c77e` | 200 × 200 | OK |
| Parigo | `b9d701733704e2d7` | 200 × 200 | OK |
| Pitch Hammer Music | `2fdaa2f7aea0f27f` | 200 × 200 | OK |
| Primetime Tracks | `b2dbc1b0575bd071` | 200 × 200 | OK |
| Scorebuzz Music Library | `d689c4b8ac9adbe0` | 200 × 200 | OK |
| Strange Fruit | `68502c1b89e01630` | 200 × 200 | OK |
| Studio Rev Club Series | `7ae4dc297a54b7ea` | 200 × 200 | OK |
| Superfly Audio | `469373fece931ab4` | 200 × 200 | OK |
| Tonic Music + Creative | `2c56b0438e276cf2` | 200 × 200 | OK |
| Trailer Trash Music | `c83299f11ea093b4` | 200 × 200 | OK |
| Zone Music | `95f52ce24a2ca7e1` | 200 × 200 | OK |

## Labels sans image exploitable (42)

| Label | ID Harvest | Dimensions | État |
|---|---|---:|---|
| Full Clip Music | `74230761212afd35` | — | HTTP 404 |
| Full Clip Music  | `a668fd413d40cfdc` | — | HTTP 404 |
| Ghost Town Artists | `f70b95a0846e3c66` | — | HTTP 404 |
| L'il G'rilla Music | `e872f6cb7f936f15` | — | HTTP 404 |
| Lab Machine | `65c759accc282728` | — | HTTP 404 |
| Lesterbeat Records | `95f9f9eefbe043ff` | — | HTTP 404 |
| Level 77 Music - Prestige Library | `47423edb2c7caa0e` | — | HTTP 404 |
| Lift Music | `bc371530fd7e64c1` | — | HTTP 404 |
| Lift Music Factual | `7f7bc412dde68a3b` | — | HTTP 404 |
| Lift Music Wildcards | `0b4513a11d4b5b52` | — | HTTP 404 |
| MadeByUs Music | `20060062eafa03cc` | — | HTTP 404 |
| Mexican Music Library | `ae4287665c97a468` | — | HTTP 404 |
| Mindframe Media Group | `898ed81239462a64` | — | HTTP 404 |
| Musica.it | `9d330c152c37bca0` | — | HTTP 404 |
| Nelvana  | `b9a7ab2ac6333e36` | — | HTTP 404 |
| New Spin Records / Island Apollo | `8002d124f368735a` | — | HTTP 404 |
| News Source | `d2b13fc97e55618e` | — | HTTP 404 |
| Pantheon Classics | `b2ed47feef89672f` | — | HTTP 404 |
| Playground Hollywood | `a78a2958d39dff66` | — | HTTP 404 |
| Poke | `7ef73e68361d5167` | — | HTTP 404 |
| Private Reserve  | `7daeaecb17dd37c5` | — | HTTP 404 |
| Production Music Online | `5daf8783518eba7e` | — | HTTP 404 |
| Raging Cloud Studios | `b90178792271e104` | — | HTTP 404 |
| Reliable Source Music | `c9685756ad57bbc8` | — | HTTP 404 |
| Ridgeline Music | `200e13f959a63f90` | — | HTTP 404 |
| Rodeo Music Co. | `eb002afc6f579a22` | — | HTTP 404 |
| Roger Mars Music | `147a0bd0911f3f05` | — | HTTP 404 |
| Royal Blood Records  | `7614fa4be7e8e253` | — | HTTP 404 |
| Shadetree Publishing | `7d2254f90dc97c0a` | — | HTTP 404 |
| Sinsuro | `cce0f7c49f76d349` | — | HTTP 404 |
| SonicTremor | `a5ed9c0cf9502027` | — | HTTP 404 |
| SOURCE IN SYNC MUSIC  | `b8e1bd076ebec41d` | — | HTTP 404 |
| Strange Fruit Commercial Breaks | `3b64b94d96aed47b` | — | HTTP 404 |
| Studio Rev Composer Series | `57833cfaa841e17b` | — | HTTP 404 |
| Studio Rev FX Series | `ec4362fb338257d3` | — | HTTP 404 |
| Studio Rev Road Series | `31971e75d27ef7e0` | — | HTTP 404 |
| Superstore | `8f3b8728446e847d` | — | HTTP 404 |
| SyncStories | `4e7f457674245ddf` | — | Type text/html |
| TONA | `9b243d04b610753f` | — | HTTP 404 |
| Zero3 Music | `747156e5cd63952f` | — | HTTP 404 |
| Zone Plus | `342d37f9cbd9d25e` | — | Type text/html |
| Zone Trailers | `600bfcb76bdc57d8` | — | Type text/html |
