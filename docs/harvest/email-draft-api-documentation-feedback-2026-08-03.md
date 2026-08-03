Subject: Harvest Public API — documentation feedback and reproducible syntax issues

Hi Roland, hi Peter,

Thank you, Roland, for the introduction, and nice to meet you, Peter.

As requested, I have now consolidated the documentation feedback and rerun the relevant contracts against the live Parigo service. Overall, the integration remains in very good shape. The main catalogue, search, autocomplete and member playlist flows are working, including the documented playlist payloads, download validation and cue-sheet generation.

I did, however, confirm a small number of reproducible documentation and syntax issues that may be useful to your API team:

1. `addtrackmembercomment`

The JSON example currently uses:

```json
{
  "TrackID": "<track-id>",
  "TagName": "Comment"
}
```

On the live service this returns HTTP 200 with `Error.Code=2` and `Cannot add a tag when trackid is empty.` The same request succeeds and persists when the track property is sent as lowercase `trackid`. I tested `TrackID`, `trackId` and `trackid` separately and removed the test comments afterwards.

2. `updatetrackmembercomment`

The JSON example uses `TrackID`, but the value shown is actually the comment/tag ID. `TrackID` and `trackid` both fail for an update; `TagID` and `tagid` both succeed and persist. The XML example already uses `tagid`, so the JSON example appears to need the same correction.

3. `getmembertoken` response example

The published JSON contains a trailing comma. It also shows the member token under `Token` and the persistent token under `PersistentLoginToken.Value`. The live response uses `MemberToken` and `PersistentLoginToken.Token`.

4. `gettoptracks` request example

The JSON contains an inline `//` comment after `TrackType`, which makes the example invalid JSON. After removing the comment, the documented payload works correctly.

5. Invalid JSON response examples

I found eleven response examples marked as JSON that do not parse: one `getserviceinfo` example with a missing closing brace, nine AIMS/Cyanite/Harmix similarity examples with a trailing comma, and the `getmembertoken` example mentioned above.

6. `getcuesheet` response examples

The sample URL is written as `https://{cuesheetdomainpath}}/afile.csv`, with one extra closing brace. The live endpoint returns a valid URL.

7. Hard-coded IDs and small URL/text typos

The main collection requests contain hard-coded IDs for `updatemembertag` and the three playlist schedule endpoints, where `{TagID}` or `{PlaylistID}` would be clearer. I also found `EnageAccessToken` in the sharing URLs, `PlaylistCatgory` in the category-sharing description, and a Public API Disco entry that uses `HM_IntegrationAPI_URL`.

8. `ReturnTagCount`

`getmembertags` documents this option, although it is missing from the main URL. With `1`, `true` and `True`, the two live tags returned no `TrackCount`, while their detail calls returned totals of 4 and 1 tracks. Could you confirm the supported syntax, or whether the count now requires one `getmembertagtracks` call per tag?

9. Token-type labels

Several request tables describe a `ServiceToken` while their URL requires a `MemberToken`, including Album Tracks (Include Inactive), Get Featured Playlist, Update Member Details and Remove Member Playlist Schedule. Get Web Content has the opposite inconsistency: the table says `MemberToken`, while the URL uses the service token.

10. POST examples without executable JSON

The collection has no executable JSON body for eleven POST operations. In Public API this affects the Profile copy of `getinvitedmembertoken`, `removememberverifypassword`, `updatememberplaylistshare`, `gettoptracks` and `getexternalsharestatushistory`. The remaining cases are in Export (`getalbumsbyworkspacestatus`, `getmusicdownload`, `setalbumtag`, `removealbumtag`, `bulkupserttrackcategories`) and Agent (`removelibrarytag`). Some only provide XML; others have an empty or invalid JSON example.

11. Password-reset contract

The `sendpasswordresetemail` description refers to `ResetLink` and `ResetTokenExpiryHours`, while the executable JSON example contains `Username`, `Email` and `ExternalResetToken`. Sending the example shape is accepted at transport level but the Parigo service returns `Required route not found`; sending the fields named in the description produces the same result. It would be helpful to publish one canonical JSON body and the required route/domain/template configuration.

I also retained a separate list of contract gaps that may be configuration-dependent rather than documentation errors: subscription calls acknowledging success without changing the value read back, the source of `DownloadID`/`DownloadGroupID`, listing archived playlists, replaying saved searches, and retrieving a playlist's folder ID from the flat playlist response.

For clarity, I retested a few items that had looked suspicious earlier but are now confirmed to be correct: the lowercase `requestaddupdateplaylist` wrapper and playlist update fields, add/remove/reorder playlist-track payloads, the documented download-validation payload, the `track` cue-sheet body and the persistent-login validation payload all work on the live service.

The audit covered all 257 documented HTTP entries statically. I executed the Public API contracts that were safe or reversible with the credentials available to Parigo, including persistence checks and cleanup. I did not run Import, Export or Agent operations because those require separate credentials and include catalogue-changing workflows; nor did I trigger account deletion, payment, real email delivery or additional download quota consumption.

I can send the complete endpoint inventory, the detailed audit, and redacted request/response evidence. If useful, I can also format the confirmed items above as a compact CSV or as suggested edits against the Postman collection.

Best,

Yoann
