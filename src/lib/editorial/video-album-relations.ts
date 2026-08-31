/**
 * Relations éditoriales vérifiées entre une vidéo YouTube et un album Parigo
 * présent dans Harvest. Les codes sont stables et restent lisibles lors des
 * audits, contrairement aux titres qui peuvent évoluer.
 */
export const VIDEO_ALBUM_RELATIONS = {
  EOEhBfWEgFw: "PGO0001",
  m3khGsiRDoU: "PGO0007",
  anT5ocBumDk: "PGO0039",
  E3O5PfylPxs: "PGO0044",
  OL5vveNVmkA: "PGO0049",
  wrO96WV69aY: "PGO0050",
  "lsXj6hGHM-Q": "PGO0051",
  YuTFkZ04C3c: "PGO0052",
  QmTmM4YUxO4: "PGO0053",
  I3G64U_dj0s: "PGO0054",
  dr6hxcsjjbk: "PGO0055",
  l3iFO626BFw: "PGO0056",
  // Hold Me Closer — Dj Hertz feat. Rebecca Meyer
  LLzCnoushi0: "PGO0043",
  // Une Première Fois — JB Hanak feat. Zoé Wolf
  EPnfDdfOx94: "PGO0042",
  // Klang Brutt — Modulhater
  "FbuyBO-115s": "PGO0025",
  // Blackout — 9 O'Clock
  "6uWDbe6IhEg": "PGO0027",
  // Baïkal — Vegomatic feat. Macha
  GjkpUarLgIs: "PGO0002",
  // Don't Give Up Now — Montlery
  XmsEYm9_8MM: "PGO0009",
  // 3 Bikinis — Vegomatic
  FNoeX3pfJdc: "PGO0009",
  // Quelque Chose — Vegomatic
  "GMa-HQwGp-M": "PGO0001",
  // Madala — Arat Kilo & Mamani Keïta
  YwoM5ozETlw: "PGO0030",
  // 9 O'Clock — DMC DJ 2014 World Team Champion
  "v0-tsDTGjnE": "PGO0027",
  // My Inspiration — Myles Sanko
  IUaSPUiykTo: "PGO0006",
} as const satisfies Record<string, string>;

export function getVideoAlbumCode(youtubeId: string): string | undefined {
  return VIDEO_ALBUM_RELATIONS[youtubeId as keyof typeof VIDEO_ALBUM_RELATIONS];
}
