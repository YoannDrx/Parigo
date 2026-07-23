import type { Locale } from "@/i18n/messages";

interface LocalizedSelectionContent {
  slug: string;
  title: string;
  description: string;
  introduction: string;
  uses: string;
  advice: string;
}

export interface SeoLandingPage {
  key: string;
  content: Record<Locale, LocalizedSelectionContent>;
  criterion: {
    primary: string;
    aliases: string[];
  };
  related: string[];
}

export const SEO_SELECTIONS: SeoLandingPage[] = [
  {
    key: "cinematic",
    content: {
      fr: { slug: "musique-cinematique", title: "Musique cinématique", description: "Une sélection de musiques cinématiques pour donner de l’ampleur aux films, bandes-annonces, documentaires et récits de marque.", introduction: "Des textures orchestrales aux pulsations hybrides, cette sélection accompagne la montée d’un récit sans dicter l’émotion.", uses: "Films, bandes-annonces, documentaires, campagnes premium et génériques.", advice: "Choisissez d’abord la dynamique du montage, puis l’intensité et la place laissée aux dialogues." },
      en: { slug: "cinematic-music", title: "Cinematic music", description: "A cinematic music selection for films, trailers, documentaries and ambitious brand stories.", introduction: "From orchestral textures to hybrid pulses, these tracks build narrative scale without overpowering the story.", uses: "Films, trailers, documentaries, premium campaigns and title sequences.", advice: "Start with the edit’s dynamics, then refine intensity and the space required for dialogue." },
    },
    criterion: { primary: "cinematic", aliases: ["cinematic", "cinématique", "film"] },
    related: ["epic", "dark"],
  },
  {
    key: "electronic",
    content: {
      fr: { slug: "musique-electronique", title: "Musique électronique", description: "Synthés, rythmiques et textures électroniques pour publicité, mode, technologie et formats contemporains.", introduction: "Une palette électronique précise, du minimalisme analogique aux productions les plus nerveuses.", uses: "Publicité, mode, technologie, sport, habillage et contenus digitaux.", advice: "Faites correspondre le grain sonore à l’univers visuel et surveillez la densité du médium sous les voix." },
      en: { slug: "electronic-music", title: "Electronic music", description: "Synths, beats and electronic textures for advertising, fashion, technology and contemporary content.", introduction: "A focused electronic palette ranging from analogue minimalism to high-energy modern production.", uses: "Advertising, fashion, technology, sport, branding and digital content.", advice: "Match the sonic grain to the visual world and keep the midrange clear beneath voice-over." },
    },
    criterion: { primary: "electronic", aliases: ["electronic", "electronica", "électronique"] },
    related: ["energetic", "dark"],
  },
  {
    key: "piano",
    content: {
      fr: { slug: "musique-au-piano", title: "Musique au piano", description: "Des morceaux au piano, intimes ou amples, pour documentaires, fiction, publicité et récits sensibles.", introduction: "Le piano crée une proximité immédiate : quelques notes suffisent pour installer un point de vue humain.", uses: "Documentaires, portraits, drames, luxe, patrimoine et communication institutionnelle.", advice: "Préférez une interprétation sobre pour le dialogue et une écriture plus développée pour les respirations du récit." },
      en: { slug: "piano-music", title: "Piano music", description: "Intimate and expansive piano music for documentaries, drama, advertising and sensitive storytelling.", introduction: "Piano creates immediate proximity: a few notes can establish a distinctly human point of view.", uses: "Documentaries, portraits, drama, luxury, heritage and institutional films.", advice: "Choose restrained playing beneath dialogue and a broader arrangement for narrative breathing space." },
    },
    criterion: { primary: "piano", aliases: ["piano", "keys"] },
    related: ["calm", "cinematic"],
  },
  {
    key: "epic",
    content: {
      fr: { slug: "musique-epique", title: "Musique épique", description: "Des musiques épiques et puissantes pour bandes-annonces, sport, aventure et campagnes à grand spectacle.", introduction: "Percussions, cuivres et montées orchestrales donnent au montage une trajectoire claire et spectaculaire.", uses: "Bandes-annonces, sport, aventure, lancement de produit et campagnes événementielles.", advice: "Repérez les points de rupture du morceau et alignez-les sur les révélations visuelles plutôt que sur chaque coupe." },
      en: { slug: "epic-music", title: "Epic music", description: "Powerful epic music for trailers, sport, adventure and large-scale campaigns.", introduction: "Percussion, brass and orchestral builds give the edit a clear, spectacular trajectory.", uses: "Trailers, sport, adventure, product launches and event campaigns.", advice: "Map the track’s structural hits to visual reveals instead of accenting every cut." },
    },
    criterion: { primary: "epic", aliases: ["epic", "épique", "trailer"] },
    related: ["cinematic", "energetic"],
  },
  {
    key: "dark",
    content: {
      fr: { slug: "musique-sombre", title: "Musique sombre", description: "Tensions, textures sombres et atmosphères inquiétantes pour thriller, polar, documentaire et suspense.", introduction: "Une sélection où le silence, la matière et la tension comptent autant que la mélodie.", uses: "Thriller, polar, enquête, documentaire, science-fiction et campagnes dramatiques.", advice: "Dosez les basses et les impacts pour préserver l’intelligibilité tout en maintenant une menace continue." },
      en: { slug: "dark-music", title: "Dark music", description: "Dark tension, uneasy textures and suspenseful atmospheres for thrillers, documentaries and drama.", introduction: "A selection where silence, texture and tension matter as much as melody.", uses: "Thrillers, crime, investigations, documentaries, science fiction and dramatic campaigns.", advice: "Control low-end and impacts to preserve intelligibility while sustaining a continuous sense of threat." },
    },
    criterion: { primary: "dark", aliases: ["dark", "sombre", "tension", "suspense"] },
    related: ["cinematic", "electronic"],
  },
  {
    key: "energetic",
    content: {
      fr: { slug: "musique-energique", title: "Musique énergique", description: "Des titres énergiques pour sport, publicité, lifestyle, jeunesse et montages au rythme soutenu.", introduction: "Batteries franches, riffs et pulsations maintiennent l’élan sans sacrifier la lisibilité du message.", uses: "Sport, publicité, automobile, lifestyle, jeunesse et formats sociaux.", advice: "Choisissez un tempo compatible avec la durée des plans et gardez une marge pour les accélérations finales." },
      en: { slug: "energetic-music", title: "Energetic music", description: "Energetic tracks for sport, advertising, lifestyle, youth and fast-paced edits.", introduction: "Direct drums, riffs and pulses sustain momentum without sacrificing message clarity.", uses: "Sport, advertising, automotive, lifestyle, youth and social content.", advice: "Pick a tempo that fits average shot length and leaves room for a final acceleration." },
    },
    criterion: { primary: "energetic", aliases: ["energetic", "énergique", "upbeat", "driving"] },
    related: ["electronic", "epic"],
  },
  {
    key: "calm",
    content: {
      fr: { slug: "musique-calme", title: "Musique calme", description: "Des musiques calmes, chaleureuses et aérées pour bien-être, nature, documentaire et communication apaisée.", introduction: "Des arrangements respirants qui soutiennent l’image avec douceur et laissent de la place aux mots.", uses: "Bien-être, nature, tourisme, documentaire, santé et communication responsable.", advice: "Écoutez les silences et la longueur des résonances : ils déterminent la place réelle laissée au récit." },
      en: { slug: "calm-music", title: "Calm music", description: "Calm, warm and spacious music for wellbeing, nature, documentaries and thoughtful communication.", introduction: "Breathing arrangements that support the image gently and leave room for words.", uses: "Wellbeing, nature, travel, documentaries, healthcare and responsible communication.", advice: "Listen to the silences and decay times: they determine how much space the track truly leaves for story." },
    },
    criterion: { primary: "calm", aliases: ["calm", "relaxed", "gentle", "calme"] },
    related: ["piano", "jazz"],
  },
  {
    key: "jazz",
    content: {
      fr: { slug: "musique-jazz", title: "Musique jazz", description: "Jazz acoustique, grooves modernes et couleurs sophistiquées pour publicité, gastronomie, culture et fiction.", introduction: "Du trio intimiste au groove contemporain, le jazz apporte mouvement, élégance et personnalité.", uses: "Gastronomie, luxe, culture, comédie, fiction urbaine et publicité.", advice: "Déterminez si l’image appelle la spontanéité d’une prise live ou la précision d’un groove produit." },
      en: { slug: "jazz-music", title: "Jazz music", description: "Acoustic jazz, modern grooves and sophisticated colour for advertising, food, culture and drama.", introduction: "From intimate trios to contemporary grooves, jazz brings movement, elegance and personality.", uses: "Food, luxury, culture, comedy, urban drama and advertising.", advice: "Decide whether the image needs the spontaneity of a live take or the precision of a produced groove." },
    },
    criterion: { primary: "jazz", aliases: ["jazz", "swing"] },
    related: ["calm", "piano"],
  },
];

export function selectionBySlug(slug: string, locale: Locale): SeoLandingPage | undefined {
  return SEO_SELECTIONS.find((selection) => selection.content[locale].slug === slug);
}
