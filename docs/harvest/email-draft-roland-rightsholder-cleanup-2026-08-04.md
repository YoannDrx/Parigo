# Réponse à Roland — nettoyage Right Holders

**Subject: Re: Parigo / Harvest — Right Holders data cleanup**

Hi Roland,

Thanks, this is very helpful and clarifies the distinction between the structured Right Holder records and the free-text fields displayed on tracks.

We have already started a controlled cleanup in Harvest Admin, working album by album on the track-level Composer free-text field, including alternate versions and stems. We keep a before snapshot and verify each saved value after the Harvest postback. We have deliberately not changed the structured Right Holder records or the global Right Holder templates at this stage, and a small number of ambiguous credits are still being reviewed.

For the long-term workflow, option 1 — cleaning the Right Holder records and then using templates — seems preferable to re-exporting and reingesting each label. It should give us a cleaner source of truth and standardise future ingestions.

Before we configure the template and request the €100 bulk update, could you please confirm:

- whether the update can be limited to Parigo labels/tracks, or whether it applies account-wide;
- whether we can regenerate only the Composer display field, or whether all Right Holder-derived free-text fields would be overwritten;
- how manually curated exceptions, alternate versions and stems are handled;
- whether Support can first run a preview or a pilot on one album/label, and whether a rollback is available if the output is not as expected.

Our proposed sequence would be to finalise the canonical Right Holder mapping, export the existing Right Holder registry as a backup, correct or merge the relevant records, configure the template, validate it on a limited pilot, and only then submit the Support ticket for the full update.

The €100 cost is fine in principle once the scope and pilot have been validated. In the meantime, please do not run an account-wide update, as we want to make sure it does not overwrite the track-level cleanup already completed or affect the current FLEX catalogue unexpectedly.

Thanks,

Yoann
