# Harvest — demande de localisation des catégories et styles

**Subject: French localization contract and missing translations for Categories and Styles**

Hi Harvest team,

We consume the French Categories and Styles taxonomies through the Public API.

For `GET /getcategories/{token}/hasactivetrackonly?languagecode=fr`, the canonical English value remains in `Name`, while the French value is returned in `LanguageItems[].Value`. For example, category attribute `b71182fbd44d6ef6` returns `Name: "Sad"` and a French `LanguageItems` entry with `Value: "Triste"`.

Could you please:

1. Confirm that `LanguageItems` is the official localization source and that `Name` is expected to remain canonical.
2. Confirm the supported language-code format. Lowercase `fr` returns French items, while `fr-FR` currently returns empty localization data.
3. Guarantee that category/style IDs and hierarchy remain stable across languages.
4. Complete the missing French content. Our current audit finds 342/531 category nodes with a French value, but only 1/161 styles.
5. Add French values for the untranslated root categories, particularly `Moods`, `Period`, `Genre` and `Instruments`, even when the French spelling is identical.
6. Confirm the intended fallback when a translation is absent and whether publishing an Admin translation requires a cache refresh or propagation delay.
7. Document or correct the current `LanguageItems[].Type` value `CategoryAtttribute`, which contains three “t” characters.
8. Provide a bulk translation coverage report or export and, if available, a revision timestamp or ETag so clients can detect taxonomy updates.

Expected acceptance fixture:

- Stable ID: `b71182fbd44d6ef6`
- Canonical name: `Sad`
- French localized name: `Triste`
- Same parent and hierarchy in EN and FR

Observed French coverage on 14 August 2026:

| Taxonomy | French values | Total |
| --- | ---: | ---: |
| Genre | 38 | 191 |
| Moods | 148 | 149 |
| Music For | 61 | 69 |
| Period | 20 | 22 |
| Instruments | 30 | 55 |
| Area | 45 | 45 |
| All category nodes | 342 | 531 |
| Styles | 1 | 161 |

Thanks,

Parigo Music
