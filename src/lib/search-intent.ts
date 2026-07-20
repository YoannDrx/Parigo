import type { SearchIntent } from "@/types";

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
    energetic: ["énergique", "energetic", "dynamique", "dynamic", "sport", "rapide", "powerful"],
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

function normalize(value: string) {
  return value.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  const explicitBpm = normalized.match(/(\d{2,3})\s*(?:a|à|-|to|and)\s*(\d{2,3})\s*bpm/);
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
  if (intent.freeText) params.set("q", intent.freeText);
  intent.genres.forEach((value) => params.append("genre", value));
  intent.moods.forEach((value) => params.append("mood", value));
  intent.instruments.forEach((value) => params.append("instrument", value));
  if (intent.bpmRange) {
    params.set("minBpm", String(intent.bpmRange[0]));
    params.set("maxBpm", String(intent.bpmRange[1]));
  }
  if (intent.isVocal !== null) params.set("vocal", String(intent.isVocal));
  return params;
}
