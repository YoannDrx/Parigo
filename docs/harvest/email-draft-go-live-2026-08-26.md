# Brouillon — réponse technique Harvest avant mise en production

Dernier contrôle : **27 août 2026**. Ne pas envoyer sans relecture humaine.
Ce document est archivé : Peter y a répondu le 1er septembre. La réponse
actualisée est dans
[`email-reply-peter-2026-09-01.txt`](./email-reply-peter-2026-09-01.txt).
Version sans Markdown prête pour Gmail :
[`email-harvest-gmail-ready-2026-08-27.txt`](./email-harvest-gmail-ready-2026-08-27.txt).

**Objet : Parigo — derniers points techniques avant mise en production**

Hi all,

We are now in the home straight — hopefully this really is the final stretch!
The Parigo development is complete, and we are targeting production launch
next week. After rerunning the Public API checks, these are the last technical
points we need to resolve or confirm.

1. **Contact form — blocking**

   `POST /sendcontactusemail/{token}`, using the documented `Name`, `Email`,
   `PhoneNumber`, `Subject` and `Message` payload, returns HTTP 200 followed by
   `Code=4 — Internal Operation Error`. No email arrives, so our BFF returns
   502.

   Could you please check this endpoint’s configuration for the Parigo key and
   confirm when the same payload succeeds? This is our remaining launch
   blocker.

2. **Domains, callbacks and HTTPS**

   As domains and routes are configured per API key, can one key allow several
   base URLs, as FLEX could supply the relevant URL with the request? If the
   Public API does not support that mechanism, what is the supported
   equivalent?

   Can verification, password-reset and share links also be generated directly
   with HTTPS? `getsharemusicurl` still returns
   `http://www.parigomusic.com/engage-playlist/...`; Parigo currently validates
   the domain and upgrades the protocol.

3. **Member and email language**

   `getmember` returns `LanguageCode`, but this field is not documented as
   writable in `registermember` or `updatemember`. Which field or endpoint
   should we use to persist EN or FR?

   How do `sendmemberverifylinkemail`, `sendpasswordresetemail`, the sharing
   endpoints, `sendcontactusemail` and download flows then select the template
   language?

4. **Localised catalogue responses**

   `getalbum/750a3d73a7f4dae6` with `languagecode=en`, `fr` or `fr-FR` always
   returns the same English `Detail` and no `LanguageItems`. Which endpoint or
   parameter should return the French description for `PGO0031 / The
   Projectionist`?

   For labels, `getlibraries` exposes translations in `LanguageItems`, while
   `getlibrary?languagecode=en/fr` places the requested language directly in
   `Detail` and omits `LanguageItems`. Could you confirm that this difference
   in response shape is the intended contract?

   For featured playlists, `languagecode=en/fr` does not replace the canonical
   fields returned by `getfeaturedplaylistsplaylistonly`; the available
   translations are exposed in `LanguageItems` on both list and detail
   responses. Could you confirm that `LanguageItems` is the official source to
   use?

5. **Search and remaining Public API contracts**

   **Multilingual search — Guillaume, I’m tagging you on this point.** I
   understood Roland’s reply that Harvest does not currently provide native
   multilingual search and recommends keyword groups. Guillaume nevertheless
   recalls that bilingual behaviour had previously been configured for Parigo
   and that Lucas, who was working at Parigo at the time, sent Harvest a
   translation template during the original setup.

   This may have been a mapping or an older keyword-group configuration. Could
   you please check the account’s archives or historical configuration and let
   us know whether that mechanism still exists? The expected test case is
   simple: `reggae triste` should interpret `triste` like `sad` and return the
   corresponding results. Guillaume, please add or correct any historical
   context as needed.

   `getmembertags?...&ReturnTagCount=1` adds no count field, although the three
   tag-detail responses contain 1, 4 and 1 tracks. Is there an aggregate or
   batch endpoint for these counts?

   On `TrackDisplayTitle`, the four `ExactPhrase`/`Wildcard` combinations do not
   produce three distinct “contains”, “starts with” and “equals” behaviours.
   Which payloads should be used? Can `RankExpression` officially prioritise
   the title and, if so, with which syntax?

   `gethistorybycommunications` contains password-reset emails but not the
   playlist-share email received by the same test member. Which events feed
   this history? Is there a richer response exposing the event type, content or
   template identifier?

6. **Right Holders — after launch**

   We temporarily normalise the Composer, Publisher and Artist display values
   in the front end. The source data still needs to be cleaned in Harvest. We
   will return to this work after launch, with a reversible one-album pilot
   before any account-wide operation.

The AIMS integration through Harvest is complete: track, prompt, file and URL
searches all work in our tests.

Everything else is ready on our side. Parigo is targeting production launch
next week, so any help closing the critical points above quickly would be
greatly appreciated.

Many thanks for your help :)

Yoann
