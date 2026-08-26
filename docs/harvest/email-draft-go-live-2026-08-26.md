# Brouillon — relance Harvest avant mise en production

**Objet : Parigo — derniers points à confirmer avant mise en production**

Hi Peter, Roland and team,

I hope you are well. We are approaching the Parigo production launch and
have completed another Admin/Public API review. Thank you again for the
recent fixes: email authentication is now aligned, the French taxonomy is
complete, and the AIMS mains delivery has started.

Could you please help us confirm the remaining points below?

1. **Localised catalogue content**
   - Album `PGO0031` has complete EN and FR descriptions in Admin, but
     `getalbum` returns the same English `Detail` for `languagecode=en`,
     `fr` and `fr-FR`, with no `LanguageItems`.
   - For libraries, `getlibraries` exposes FR `LanguageItems`, while
     `getlibrary?languagecode=en/fr` switches `Detail` and omits
     `LanguageItems`. Which behaviour is the supported contract?
   - Featured-playlist translations are present on the detail endpoint but
     absent from the list endpoint. We also found identical duplicate FR
     descriptions on 53 of 64 playlists and four Brand playlists without a
     French name. Is the detail endpoint the authoritative source, and could
     these records be cleaned up?

2. **Member emails and routes**
   - Which documented field or endpoint sets the member communication
     language, and how is the template selected for verification, reset,
     sharing, contact and download emails? Only six of the 26 visible email
     types currently have a French variant.
   - Could you confirm the recommended Preview-to-production callback setup,
     and that verification/reset/share URLs will be generated directly in
     HTTPS?
   - `sendcontactusemail` still returns HTTP 200 with `Code=4 — Internal
     Operation Error` using the documented five-field payload. Could you
     please check the Contact Us (API/Custom) configuration?

3. **Remaining contract questions**
   - `ReturnTagCount` still returns zero while the tag detail endpoints
     contain tracks.
   - `ExactPhrase`/`Wildcard` still do not provide distinct exact,
     starts-with and contains title matching.
   - `gethistorybycommunications` currently exposes seven reset entries with
     headers/status only. Which member-generated emails are expected to appear
     there, including playlist shares, and is message-body access supported?
   - Could you confirm the Right Holder overwrite-template rules and the
     proposed one-album test before the approved bulk update?

4. **AIMS**
   Track and prompt searches are now working through Harvest, and our recent
   mains sample is indexed, and track, prompt, synthetic upload and our
   YouTube Music URL fixture each return 30 results. Could you confirm that the
   back-catalogue delivery is complete, the production scope is mains only,
   and the production quotas/commercial and privacy requirements for these
   four enabled modes?

On our side, we are handling the library/playlist mapping, duplicate removal
and deterministic French-to-English fallback. A reply when convenient within
our launch schedule would help us close the final acceptance checklist.

Many thanks,

Yoann
