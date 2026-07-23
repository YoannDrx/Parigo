import type { SearchFilterGroup, SearchFilterGroupKey, SearchFilterItem, SearchIntent } from "@/types";

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
    epic: ["épique", "epic", "grandiose", "héroïque", "heroic", "puissant"],
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
  },
  en: {
    cinematic: "Cinematic", electronic: "Electronic", ambient: "Ambient", jazz: "Jazz", techno: "Techno",
    house: "House", funk: "Funk", soul: "Soul", blues: "Blues", folk: "Folk", classical: "Classical",
    "hip-hop": "Hip-hop", rock: "Rock", pop: "Pop", rnb: "R&B", reggae: "Reggae", "afro-beat": "Afrobeat",
    country: "Country", latin: "Latin", world: "World", uplifting: "Uplifting", dark: "Dark",
    energetic: "Energetic", peaceful: "Peaceful", melancholic: "Melancholic", tense: "Tense",
    epic: "Epic", playful: "Playful", piano: "Piano", guitar: "Guitar", strings: "Strings",
    drums: "Drums", synth: "Synth", percussion: "Percussion",
  },
};

function normalize(value: string) {
  return value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeFilterLabel(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
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

export function resolveIntentCategoryIds(intent: SearchIntent, groups: SearchFilterGroup[]): string[] {
  const requested: Array<[SearchFilterGroupKey, string]> = [
    ...intent.genres.map((value): [SearchFilterGroupKey, string] => ["genre", value]),
    ...intent.moods.map((value): [SearchFilterGroupKey, string] => ["moods", value]),
    ...intent.instruments.map((value): [SearchFilterGroupKey, string] => ["instruments", value]),
  ];
  return [...new Set(requested.flatMap(([group, value]) => {
    const id = findSearchFilterId(groups, group, value);
    return id ? [id] : [];
  }))];
}

export function canonicalizeCategoryValues(values: string[], groups: SearchFilterGroup[]): string[] {
  const categoryGroups = groups.filter((group) => group.key !== "labels" && group.key !== "styles");
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
  return Boolean(intent.genres.length || intent.moods.length || intent.instruments.length || intent.bpmRange);
}

export function searchIntentChips(intent: SearchIntent, locale: "fr" | "en"): Array<{ key: string; label: string }> {
  const labels = displayLabels[locale];
  return [
    ...intent.genres.map((value) => ({ key: `genre:${value}`, label: labels[value] ?? value })),
    ...intent.moods.map((value) => ({ key: `mood:${value}`, label: labels[value] ?? value })),
    ...intent.instruments.map((value) => ({ key: `instrument:${value}`, label: labels[value] ?? value })),
    ...(intent.bpmRange ? [{ key: "bpm", label: `${intent.bpmRange[0]}–${intent.bpmRange[1]} BPM` }] : []),
  ];
}

function matches(input: string, terms: readonly string[]) {
  return terms.some((term) => input.includes(normalize(term)));
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

  let bpmRange: [number, number] | null = null;
  const explicitBpm = normalized.match(/(\d{2,3})\s*(?:a|à|et|-|–|to|and)\s*(\d{2,3})\s*bpm/);
  if (explicitBpm) bpmRange = [Number(explicitBpm[1]), Number(explicitBpm[2])];
  else if (/\b(lent|lente|slow|posé|pose)\b/.test(normalized)) bpmRange = [55, 90];
  else if (/\b(medium|modéré|modere)\b/.test(normalized)) bpmRange = [90, 120];
  else if (/\b(rapide|fast|nerveux)\b/.test(normalized)) bpmRange = [120, 180];

  let isVocal: boolean | null = null;
  if (/\b(instrumental|sans voix|sans chant|no vocals|no vocal|without vocals|without voice)\b/.test(normalized)) isVocal = false;
  else if (/\b(vocal|vocals|voice|voix|chant|chante|sung)\b/.test(normalized)) isVocal = true;

  return { raw: raw.trim(), freeText: raw.trim(), genres, moods, instruments, bpmRange, isVocal };
}

export function intentToSearchParams(intent: SearchIntent) {
  const params = new URLSearchParams();
  if (intent.raw) params.set("brief", intent.raw);
  if (hasAppliedStructuredIntent(intent)) params.set("resolve", "1");
  else if (intent.freeText) params.set("q", intent.freeText);
  params.set("view", "tracks");
  params.set("type", "main");
  return params;
}
