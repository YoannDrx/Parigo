import type { Locale } from "./messages";

const frenchTerms: Record<string, string> = {
  electronic: "Électronique",
  cinematic: "Cinématique",
  pop: "Pop",
  rock: "Rock",
  jazz: "Jazz",
  classical: "Classique",
  "hip-hop": "Hip-hop",
  ambient: "Ambient",
  world: "Musiques du monde",
  folk: "Folk",
  rnb: "R&B",
  "r&b": "R&B",
  reggae: "Reggae",
  "afro-beat": "Afrobeat",
  techno: "Techno",
  house: "House",
  funk: "Funk",
  soul: "Soul",
  blues: "Blues",
  country: "Country",
  latin: "Latino",
  uplifting: "Positif",
  dark: "Sombre",
  peaceful: "Apaisé",
  energetic: "Énergique",
  melancholic: "Mélancolique",
  epic: "Épique",
  romantic: "Romantique",
  mysterious: "Mystérieux",
  playful: "Ludique",
  tense: "Tendu",
  hopeful: "Porteur d’espoir",
  dramatic: "Dramatique",
  piano: "Piano",
  guitar: "Guitare",
  strings: "Cordes",
  drums: "Batterie",
  synth: "Synthé",
  bass: "Basse",
  brass: "Cuivres",
  woodwinds: "Bois",
  percussion: "Percussions",
  vocals: "Voix",
};

function termKey(value: string) {
  return value
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

export function localizeCatalogTerm(value: string, locale: Locale) {
  if (locale === "en") return value;
  return frenchTerms[termKey(value)] ?? value;
}
