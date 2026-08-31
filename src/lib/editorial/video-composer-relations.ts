/**
 * Relations éditoriales validées manuellement entre les vidéos de la playlist
 * YouTube Clips et les profils compositeurs canoniques de Parigo.
 *
 * Les identifiants YouTube sont stables même lorsque le titre d'une vidéo
 * change. Les valeurs correspondent exclusivement aux slugs du registre
 * `composer-profiles.generated.json`.
 */
export const VIDEO_COMPOSER_RELATIONS = {
  "I3G64U_dj0s": ["ugly-mac-beer", "yann-kornowicz"],
  QmTmM4YUxO4: ["dj-hertz", "scherazade-aissahine"],
  l3iFO626BFw: ["modulhater"],
  "lsXj6hGHM-Q": ["bonetrips", "tcheep", "chicho-cortez"],
  "10LSc8MjTmM": ["cyril-laurent", "jb-hanak"],
  wrO96WV69aY: ["minimatic"],
  dr6hxcsjjbk: ["xavier-sibre", "fabien-girard"],
  OL5vveNVmkA: [
    "sebastien-blanchon-n-zeng",
    "drixxxe",
    "flore",
    "madben",
    "arandel",
    "arom",
    "the-architect",
  ],
  E3O5PfylPxs: ["ugly-mac-beer", "yann-kornowicz"],
  anT5ocBumDk: ["daniel-amozig", "yann-kornowicz"],
  YuTFkZ04C3c: ["laurent-dury"],
  NDDGIB9_0qo: ["sebastien-blanchon-n-zeng", "charlotte-savary"],
  "6JYSP7NekGo": ["sebastien-blanchon-n-zeng", "charlotte-savary"],
  EOEhBfWEgFw: ["thierry-los"],
  LLzCnoushi0: ["dj-hertz"],
  m3khGsiRDoU: ["ugly-mac-beer", "f-stokes"],
  EPnfDdfOx94: ["jb-hanak"],
  "FbuyBO-115s": ["modulhater"],
  "6uWDbe6IhEg": ["dj-hertz", "victor-baillet", "vincent-bouhelier"],
  GjkpUarLgIs: ["thierry-los"],
  XmsEYm9_8MM: ["thierry-los"],
  FNoeX3pfJdc: ["thierry-los"],
  "GMa-HQwGp-M": ["thierry-los"],
  YwoM5ozETlw: ["arat-kilo", "fabien-girard"],
  "v0-tsDTGjnE": ["dj-hertz", "victor-baillet", "vincent-bouhelier"],
  IUaSPUiykTo: ["thierry-los"],
  "5Vkxju8EVHM": ["thierry-los"],
  JQ0rhYbtHsE: ["thierry-los"],
  uULmwjGRf3I: ["thierry-los"],
} as const satisfies Record<string, readonly string[]>;

export function getVideoComposerSlugs(youtubeId: string): string[] {
  const composerSlugs = VIDEO_COMPOSER_RELATIONS[youtubeId as keyof typeof VIDEO_COMPOSER_RELATIONS];
  return composerSlugs ? [...composerSlugs] : [];
}
