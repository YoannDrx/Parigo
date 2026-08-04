# E-mails après vérification approfondie du 4 août 2026

## Peter Gray et Roland Hélène

**Subject: Re: Parigo / Harvest API**

Hi Peter, hi Roland,

Thanks again for the quick and detailed replies — they have been very helpful. We have now implemented and tested the changes on our side.

- Random playlist seeds, lower-case private-note fields and `SubscribeNewsletter` are now implemented and working in our tests.
- We have removed album favourites and playlist archiving from the new site, as recommended.
- We will keep the standard browser download flow and will not request the account-level website-link option while FLEX is live.
- We will keep our existing workarounds for the smaller API gaps and contact Support separately about the email templates.

Roland, thank you for explaining the Right Holder/template workflow and the proposed €100 bulk update. We are discussing this internally with the Parigo team on Friday and will come back to you once we have decided how we would like to proceed.

There are three points where we still need some guidance:

1. **Password reset**
   We now send exactly the username/email body you provided, but the Public API still returns `Required route not found` from local, Vercel Preview and the production origin. We also inspected the current FLEX flow and confirmed that it sends both the email and a dynamic base URL (`link: location.protocol + "//" + location.host`) to `/sendResetToken`. We tested that same FLEX request with `link: http://localhost:3100`: the email was delivered with a localhost `/change-password/{token}` URL, and the token was successfully validated and consumed in the local application.
   Is there a supported Public API equivalent for supplying the reset callback/base URL per request, or for configuring the allowed URLs for localhost, Vercel Preview and production? If this is configured server-side, can those environments coexist without changing the current FLEX production flow?

2. **Playlist sharing**
   We implemented the new `Users[]` contract and tested both guest and member shares, including with the production origin. Both still return `Code=3 — No route configuration found`. FLEX can create and display a share, but it does so through the FLEX coordinator rather than the Public API reader used by the new application.
   Could the equivalent website-sharing configuration be made available to the new Public API integration without affecting FLEX? We would also appreciate your recommendation for keeping existing FLEX share links working when the production domain moves to the new site.

3. **Contact form email and attachments**
   Thanks for confirming that `sendcontactusemail` is available. We currently use Resend for the contact form, but we would prefer to use the Harvest endpoint if it supports our requirements. We have not tested it yet because Parigo would like users to be able to attach a file to the contact form.
   Does this endpoint support file attachments? If so, could you confirm the expected request format, permitted file types and maximum size, and whether the attachment is included in both the admin email and the copy sent to the sender?

We also tested `sendsharemusiclinkemail`: Harvest returns `Code=OK` and the email arrives, but `[downloadlink]` remains in the email instead of the supplied URL. This happens with the regional-template option both enabled and disabled. We will raise this with Support, but wanted to mention it as it may be related to the share/template configuration.

The intended HTTPS routes on the new site are:

- `https://www.parigomusic.com/change-password/{token}` (the new app also supports `/reset-password/{token}`)
- `https://www.parigomusic.com/engage-playlist/{token}`

Before any account-level setting is changed, could you please coordinate it with us? Our priority is to enable the new integration while keeping the current FLEX production site unaffected.

Thanks,

Yoann

## Support Harvest

**Subject: Parigo Music — email template access and unresolved playlist link placeholder**

Hi Harvest Support,

Peter Gray recommended that we contact you regarding the Harvest Admin email templates for Parigo Music.

We would like your help with two points:

1. Please confirm how we can access and update the global template and the individual templates for Parigo Music, so that password-reset and playlist-sharing emails can follow the Parigo branding and use HTTPS assets.
2. We found a reproducible issue with the playlist-sharing email. `sendsharemusiclinkemail` returns `Code=OK` and the email is delivered, but the body contains the literal text `[downloadlink]` rather than the URL supplied in the `Link` field. We reproduced this with `SelectEmailTemplateByMemberRegion` set to both `true` and `false`. The custom message is inserted correctly, but no clickable playlist link is present.

Could you confirm the canonical link placeholder, correct the applicable template/configuration, and help us run a test email containing a working HTTPS link?

For context, the intended public route is:

`https://www.parigomusic.com/engage-playlist/{token}`

Thanks,

Yoann Andrieux
Parigo Music
