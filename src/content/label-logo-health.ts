/**
 * The catalogue currently returns a LibraryLogoUrl for every library,
 * including asset endpoints that answer with an empty HTML response or a 404.
 * This versioned allow-list comes from the live provider audit. Unknown IDs deliberately use the local
 * monogram until the audit is refreshed, avoiding dozens of failed image
 * requests on the labels page.
 */
const VERIFIED_LABEL_LOGO_IDS = new Set([
  "f32fba09aa44c7ee",
  "0f9769346759ee5a",
  "c3e0e169602f837c",
  "748b8fb470390591",
  "17d5316824b2432b",
  "356d10124345e046",
  "aa03f16539674cd5",
  "abd39666439212fa",
  "645732ba70dae88e",
  "28be6a313c6cac3a",
  "547126b7481097e3",
  "1cdf163c3b25d8ac",
  "2804f603159a9e60",
  "8350b35f4228c77e",
  "b9d701733704e2d7",
  "2fdaa2f7aea0f27f",
  "b2dbc1b0575bd071",
  "d689c4b8ac9adbe0",
  "68502c1b89e01630",
  "469373fece931ab4",
  "2c56b0438e276cf2",
  "c83299f11ea093b4",
]);

export function verifiedLabelLogo(id: string, url: string): string | null {
  return id && url && VERIFIED_LABEL_LOGO_IDS.has(id) ? url : null;
}
