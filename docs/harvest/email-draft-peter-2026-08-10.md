# Brouillon de mail à Peter, Roland et au support

**Subject: Re: Parigo / Harvest API — final configuration and API questions**

Hi Peter, Roland and team,

Thanks again for your quick and helpful replies. We have now validated password reset, playlist/folder sharing, copy, collaboration and direct delivery through both the API and the Parigo UI.

After a final end-to-end review, these are the remaining points:

1. **Routes and test domain** — reset/share links work with the production domain, so we are reassured for launch. For development, can the Public API accept an optional allow-listed base URL per request, as FLEX does with `link`, for `http://localhost:3000`, `https://parigo-ten.vercel.app` and production? If not, could the new API key use the Vercel domain temporarily, then switch to `www.parigomusic.com` at launch? Please also generate the four Preview/production routes directly in HTTPS.

2. **Contact email** — `sendcontactusemail`, using the confirmed five-field payload and no attachment, returns HTTP 200 then `Code=4 — Internal Operation Error` both directly and through the real form; no email arrives. Could you check the template, sender, recipient and API-key configuration?

3. **Localisation** — label descriptions work correctly through `getlibrary.LanguageItems`. However, `PGO0031` has FR/EN descriptions in Admin while `getalbum` returns only English, even with `languagecode=fr`; can albums expose the same localised structure? Our test members return `LanguageCode=EN/en`, but that field is not documented in the `registermember` or `updatemember` request. Which endpoint/field sets the member’s communication language, and how do verification, reset, sharing, contact and download endpoints select their template? Only six types currently have a French variant; should we add the missing FR variants and keep `All` as fallback?

4. **Tag counts** — tag writes and both relation endpoints work. Only `getmembertags?ReturnTagCount=1` remains incorrect: it reports `0` while the detailed responses contain 1, 4 and 1 tracks. We currently make one detail request per tag. Should `ReturnTagCount` return the real count?

5. **Title matching** — the four `ExactPhrase` / `Wildcard` combinations on `TrackDisplayTitle` do not produce distinct contains, starts-with and exact-title modes. Roland’s earlier reply covered multilingual search and keyword groups, not these operators. Are the three modes supported, and with which payloads?

6. **Communication history** — `gethistorybycommunications` contains five resets but none of the playlist-share emails received by the same member; our BFF exposes every returned field. Which member emails are logged, and is there a richer member/account history with the event, template and body? We also received administrator registration and subscription notifications whose exact names are not among the 26 configurable types; are these system templates managed elsewhere?

7. **Sender identity** — could transactional emails use `Parigo Music <info@parigomusic.com>` instead of Guillaume’s address? Gmail adds `via harvestmedia.net` because Harvest/SendGrid is authenticated, but the visible `parigomusic.com` From domain is not. Can you authenticate it in the Harvest SendGrid account and send us the exact DKIM/return-path DNS records?

Roland, following our internal review, we would like to proceed with the Right Holder/template workflow you recommended. A live audit of the 1,844 Parigo tracks currently returned by Cloud Search found 2,375 composer-credit occurrences ending in a society suffix (1,393 `SACEM`, 981 `NS` and 1 `BMI`), as well as 39 names stored in more than one display format. The API data indicates that `Composer` is the track-level free-text display value, while the identity, IPI, society and role remain available separately through `RightHolderIDs` / `RightHolders`; could you please confirm that this corresponds to the Admin “Right Holder Text” field? Could you also confirm whether the current Right Holder template includes a society merge field that automatically produces `(NS)` / `(SACEM)` during ingestion? Our preferred approach would be to validate and merge the master Right Holder records first, configure a clean name-only display template, and then ask Support to run the proposed €100 bulk refresh. We have already identified three likely duplicate record pairs — Liqid, Drixxxé and Jean-Pierre Ménager — with matching names and IPIs; we would include these in a small validation file before any account-wide update.

Thanks,

Yoann
