import type {
  SearchFilterGroup,
  SearchFilterGroupKey,
  SearchFilterItem,
  SearchIntent,
  QueryResolution,
} from "@/types";

/** @deprecated Historical local parser kept only for regression tests and URL audits. */
export interface SearchIntentResolution {
  original: string;
  categoryIds: string[];
  criteria: Array<{ id: string; group: SearchFilterGroupKey; name: string }>;
  bpmRange?: [number, number];
  translation?: QueryResolution;
  supported: boolean;
  source: "parigo-taxonomy";
}

const dictionaries = {
  genres: {
    cinematic: ["cinématique", "cinematic", "cinema", "film", "bande annonce", "trailer", "orchestral", "documentary"],
    electronic: ["électronique", "electronic", "electronica", "electro", "synthé", "synth", "digital"],
    ambient: ["ambient", "atmosphérique", "atmospheric", "texture", "planant", "floating"],
    jazz: ["jazz", "swing", "bebop"],
    "hip-hop": ["hip hop", "rap", "urbain", "urban"],
    rock: ["rock", "guitares", "guitars", "indie"],
    pop: ["pop", "radio", "catchy"],
    techno: ["techno"],
    house: ["house", "deep house"],
    funk: ["funk", "groove", "groovy"],
    soul: ["soul", "motown"],
    blues: ["blues"],
    folk: ["folk", "acoustique", "acoustic"],
    classical: ["classique", "classical"],
    rnb: ["r&b", "rnb"],
    reggae: ["reggae", "dub"],
    "afro-beat": ["afro beat", "afrobeat"],
    country: ["country", "western"],
    latin: ["latin", "latino", "latine"],
    world: ["world", "musique du monde", "global"],
  },
  moods: {
    uplifting: ["positif", "positive", "solaire", "sunny", "bright", "lumineux", "optimiste", "optimistic", "uplifting"],
    dark: ["sombre", "dark", "noir", "inquiétant", "ominous"],
    energetic: ["énergique", "energetic", "dynamique", "dynamic", "sport", "rapide", "powerful", "qui tabasse", "percutant", "percutante", "punchy", "hard-hitting"],
    peaceful: ["calme", "calm", "doux", "soft", "paisible", "peaceful", "relaxant", "apaisant", "intimate"],
    melancholic: ["mélancolique", "melancholic", "triste", "sad", "nostalgique", "nostalgic", "émotion", "emotional"],
    tense: ["tension", "tense", "tendu", "suspense", "thriller", "urgence", "urgent"],
    epic: ["épique", "épiques", "epic", "grandiose", "grandioses", "héroïque", "héroïques", "heroic", "puissant", "puissante"],
    playful: ["ludique", "playful", "fun", "drôle", "funny", "enfantin"],
  },
  instruments: {
    piano: ["piano", "pianistique"],
    guitar: ["guitare", "guitar"],
    strings: ["cordes", "strings", "violon", "violin", "orchestre", "orchestra"],
    drums: ["batterie", "drums"],
    synth: ["synthé", "synth", "synthétiseur"],
    percussion: ["percussions", "percussion"],
  },
  musicFor: {
    wedding: ["mariage", "noces", "wedding", "marriage"],
    "horror-film": ["film d'horreur", "film d horreur", "horreur", "horror film", "horror movie", "horror", "scary movie"],
  },
} as const;

const displayLabels: Record<"fr" | "en", Record<string, string>> = {
  fr: {
    cinematic: "Cinématique", electronic: "Électronique", ambient: "Ambient", jazz: "Jazz", techno: "Techno",
    house: "House", funk: "Funk", soul: "Soul", blues: "Blues", folk: "Folk", classical: "Classique",
    "hip-hop": "Hip-hop", rock: "Rock", pop: "Pop", rnb: "R&B", reggae: "Reggae", "afro-beat": "Afrobeat",
    country: "Country", latin: "Latin", world: "World", uplifting: "Solaire", dark: "Sombre",
    energetic: "Énergique", peaceful: "Calme", melancholic: "Mélancolique", tense: "Tension",
    epic: "Épique", playful: "Ludique", piano: "Piano", guitar: "Guitare", strings: "Cordes",
    drums: "Batterie", synth: "Synthé", percussion: "Percussions",
    wedding: "Mariage", "horror-film": "Film d’horreur",
  },
  en: {
    cinematic: "Cinematic", electronic: "Electronic", ambient: "Ambient", jazz: "Jazz", techno: "Techno",
    house: "House", funk: "Funk", soul: "Soul", blues: "Blues", folk: "Folk", classical: "Classical",
    "hip-hop": "Hip-hop", rock: "Rock", pop: "Pop", rnb: "R&B", reggae: "Reggae", "afro-beat": "Afrobeat",
    country: "Country", latin: "Latin", world: "World", uplifting: "Uplifting", dark: "Dark",
    energetic: "Energetic", peaceful: "Peaceful", melancholic: "Melancholic", tense: "Tense",
    epic: "Epic", playful: "Playful", piano: "Piano", guitar: "Guitar", strings: "Strings",
    drums: "Drums", synth: "Synth", percussion: "Percussion",
    wedding: "Wedding", "horror-film": "Horror film",
  },
};

function normalize(value: string) {
  return value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeFilterLabel(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flattenFilterItems(items: SearchFilterItem[]): SearchFilterItem[] {
  return items.flatMap((item) => [item, ...flattenFilterItems(item.children ?? [])]);
}

export function findSearchFilterId(
  groups: SearchFilterGroup[],
  groupKey: SearchFilterGroupKey,
  value: string,
): string | undefined {
  const group = groups.find((candidate) => candidate.key === groupKey);
  if (!group) return undefined;
  const target = normalizeFilterLabel(value);
  const items = flattenFilterItems(group.items);
  const exact = items.find((item) => normalizeFilterLabel(item.name) === target);
  if (exact) return exact.id;
  return items.find((item) => {
    const candidate = normalizeFilterLabel(item.name);
    return candidate.startsWith(`${target} `) || target.startsWith(`${candidate} `);
  })?.id;
}

function findSearchFilterItem(
  groups: SearchFilterGroup[],
  groupKey: SearchFilterGroupKey,
  value: string,
): SearchFilterItem | undefined {
  const id = findSearchFilterId(groups, groupKey, value);
  if (!id) return undefined;
  const group = groups.find((candidate) => candidate.key === groupKey);
  return group ? flattenFilterItems(group.items).find((item) => item.id === id) : undefined;
}

function intentRequests(intent: SearchIntent): Array<[SearchFilterGroupKey, string]> {
  return [
    ...intent.genres.map((value): [SearchFilterGroupKey, string] => ["genre", value]),
    ...intent.moods.map((value): [SearchFilterGroupKey, string] => ["moods", value]),
    ...intent.instruments.map((value): [SearchFilterGroupKey, string] => ["instruments", value]),
    ...intent.musicFor.map((value): [SearchFilterGroupKey, string] => ["musicFor", value]),
  ];
}

function candidatesFor(group: SearchFilterGroupKey, value: string): Array<[SearchFilterGroupKey, string]> {
  if (group === "genre" && value === "cinematic") return [["moods", "cinematic"], ["genre", "film"]];
  if (group === "moods" && value === "tense") return [["moods", "tension"], ["moods", "suspense"]];
  if (group === "musicFor" && value === "horror-film") return [["musicFor", "horror film"], ["musicFor", "horror"]];
  return [[group, value]];
}

function mergeIntent(left: SearchIntent, right?: SearchIntent): SearchIntent {
  if (!right) return left;
  const unique = (values: string[]) => [...new Set(values)];
  return {
    ...left,
    genres: unique([...left.genres, ...right.genres]),
    moods: unique([...left.moods, ...right.moods]),
    instruments: unique([...left.instruments, ...right.instruments]),
    musicFor: unique([...left.musicFor, ...right.musicFor]),
    bpmRange: left.bpmRange ?? right.bpmRange,
    isVocal: left.isVocal ?? right.isVocal,
  };
}

export function resolveIntentCategoryIds(intent: SearchIntent, groups: SearchFilterGroup[]): string[] {
  return [...new Set(intentRequests(intent).flatMap(([group, value]) => {
    const id = candidatesFor(group, value)
      .map(([candidateGroup, candidateValue]) => findSearchFilterId(groups, candidateGroup, candidateValue))
      .find(Boolean);
    return id ? [id] : [];
  }))];
}

export function resolveSearchBrief(
  raw: string,
  groups: SearchFilterGroup[],
  translated?: { effective: string; original: string; source: "machine-translation" },
): SearchIntentResolution {
  const intent = mergeIntent(parseSearchIntent(raw), translated ? parseSearchIntent(translated.effective) : undefined);
  const criteria = intentRequests(intent).flatMap(([group, value]) => {
    for (const [candidateGroup, candidateValue] of candidatesFor(group, value)) {
      const item = findSearchFilterItem(groups, candidateGroup, candidateValue);
      if (item) return [{ id: item.id, group: candidateGroup, name: item.name }];
    }
    return [];
  }).filter((criterion, index, values) => values.findIndex((candidate) => candidate.id === criterion.id) === index);
  const categoryIds = criteria.map((criterion) => criterion.id);
  return {
    original: raw.trim(),
    categoryIds,
    criteria,
    ...(intent.bpmRange ? { bpmRange: intent.bpmRange } : {}),
    ...(translated ? { translation: translated } : {}),
    supported: Boolean(categoryIds.length || intent.bpmRange),
    source: "parigo-taxonomy",
  };
}

export function canonicalizeCategoryValues(values: string[], groups: SearchFilterGroup[]): string[] {
  const categoryGroups = groups.filter((group) => group.key !== "labels");
  const itemsByOpaqueId = new Map(categoryGroups.flatMap((group) => flattenFilterItems(group.items)).map((item) => [item.id.replace(/^ATT_/i, "").split("_")[0], item]));
  const seenMeanings = new Set<string>();
  const canonical: string[] = [];

  for (const value of values) {
    const negative = value.startsWith("-");
    const opaqueId = value.replace(/^-/, "").replace(/^ATT_/i, "").split("_")[0];
    const item = itemsByOpaqueId.get(opaqueId);
    if (!item) continue;
    const meaning = normalizeFilterLabel(item.name);
    if (seenMeanings.has(meaning)) continue;
    seenMeanings.add(meaning);
    canonical.push(`${negative ? "-" : ""}ATT_${opaqueId}`);
  }

  return canonical.sort((a, b) => a.replace(/^-/, "").localeCompare(b.replace(/^-/, "")) || a.localeCompare(b));
}

export function hasAppliedStructuredIntent(intent: SearchIntent): boolean {
  return Boolean(intent.genres.length || intent.moods.length || intent.instruments.length || intent.musicFor.length || intent.bpmRange);
}

export function searchIntentChips(intent: SearchIntent, locale: "fr" | "en"): Array<{ key: string; label: string }> {
  const labels = displayLabels[locale];
  return [
    ...intent.genres.map((value) => ({ key: `genre:${value}`, label: labels[value] ?? value })),
    ...intent.moods.map((value) => ({ key: `mood:${value}`, label: labels[value] ?? value })),
    ...intent.instruments.map((value) => ({ key: `instrument:${value}`, label: labels[value] ?? value })),
    ...intent.musicFor.map((value) => ({ key: `musicFor:${value}`, label: labels[value] ?? value })),
    ...(intent.bpmRange ? [{ key: "bpm", label: `${intent.bpmRange[0]}–${intent.bpmRange[1]} BPM` }] : []),
  ];
}

function matches(input: string, terms: readonly string[]) {
  const normalizedInput = normalizeFilterLabel(input);
  return terms.some((term) => {
    const normalizedTerm = normalizeFilterLabel(term);
    return normalizedTerm ? new RegExp(`(?:^| )${escaped(normalizedTerm)}(?:$| )`).test(normalizedInput) : false;
  });
}

export function parseSearchIntent(raw: string): SearchIntent {
  const normalized = normalize(raw);
  const genres = Object.entries(dictionaries.genres)
    .filter(([, terms]) => matches(normalized, terms))
    .map(([slug]) => slug);
  const moods = Object.entries(dictionaries.moods)
    .filter(([, terms]) => matches(normalized, terms))
    .map(([slug]) => slug);
  const instruments = Object.entries(dictionaries.instruments)
    .filter(([, terms]) => matches(normalized, terms))
    .map(([slug]) => slug);
  const musicFor = Object.entries(dictionaries.musicFor)
    .filter(([, terms]) => matches(normalized, terms))
    .map(([slug]) => slug);

  let bpmRange: [number, number] | null = null;
  const explicitBpm = normalized.match(/(\d{2,3})\s*(?:a|à|et|-|–|to|and)\s*(\d{2,3})\s*bpm/);
  if (explicitBpm) bpmRange = [Number(explicitBpm[1]), Number(explicitBpm[2])];
  else if (/\b(lent|lente|slow|posé|pose)\b/.test(normalized)) bpmRange = [55, 90];
  else if (/\b(medium|modéré|modere)\b/.test(normalized)) bpmRange = [90, 120];
  else if (/\b(rapide|fast|nerveux)\b/.test(normalized)) bpmRange = [120, 180];

  let isVocal: boolean | null = null;
  if (/\b(instrumental|sans voix|sans chant|no vocals|no vocal|without vocals|without voice)\b/.test(normalized)) isVocal = false;
  else if (/\b(vocal|vocals|voice|voix|chant|chante|sung)\b/.test(normalized)) isVocal = true;

  return { raw: raw.trim(), freeText: raw.trim(), genres, moods, instruments, musicFor, bpmRange, isVocal };
}

export function intentToSearchParams(intent: SearchIntent) {
  const params = new URLSearchParams();
  if (intent.raw) params.set("brief", intent.raw);
  if (hasAppliedStructuredIntent(intent)) params.set("resolve", "1");
  params.set("view", "tracks");
  params.set("type", "main");
  return params;
}
