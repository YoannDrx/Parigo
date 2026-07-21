export interface Synchronisation {
  slug: string;
  title: string;
  client: string;
  image: string;
  youtubeId: string;
  descriptionFr: string;
  descriptionEn: string;
}

// Synchronisations are editorial case studies from Parigo's historical site.
// The catalogue provider does not expose a public endpoint for these
// audiovisual placements or their YouTube trailers.
export const SYNCHRONISATIONS: Synchronisation[] = [
  {
    slug: "tokyo-vice",
    title: "Tokyo Vice",
    client: "HBO Max",
    image: "/images/synchros/tokyo-vice-portfolio.jpg",
    youtubeId: "Ke41rOP9Nm8",
    descriptionFr: "Une œuvre du catalogue Parigo choisie pour accompagner l’univers de Tokyo Vice.",
    descriptionEn: "A work from the Parigo catalogue selected for the world of Tokyo Vice.",
  },
  {
    slug: "tapie",
    title: "Tapie",
    client: "Netflix",
    image: "/images/synchros/tapie-photo.jpg",
    youtubeId: "FgWtZznWyno",
    descriptionFr: "Une synchronisation Parigo au service du rythme et de la personnalité de la série Tapie.",
    descriptionEn: "A Parigo synchronisation supporting the pace and personality of the series Tapie.",
  },
  {
    slug: "pinterest",
    title: "Pinterest",
    client: "Campagne internationale",
    image: "/images/synchros/pinterest-una-vez-mas.jpg",
    youtubeId: "x--kTXN1DTY",
    descriptionFr: "Une couleur musicale Parigo retenue pour une campagne Pinterest.",
    descriptionEn: "A Parigo musical colour selected for a Pinterest campaign.",
  },
  {
    slug: "emily-in-paris",
    title: "Emily in Paris",
    client: "Netflix",
    image: "/images/synchros/emily.jpg",
    youtubeId: "Lvq-nel3_HY",
    descriptionFr: "Une œuvre Parigo synchronisée dans l’univers parisien de la série.",
    descriptionEn: "A Parigo work synchronised within the Parisian world of the series.",
  },
  {
    slug: "kleo",
    title: "Kleo",
    client: "Netflix",
    image: "/images/synchros/kleo-klang-brutt.jpg",
    youtubeId: "xxVgORUhQ3E",
    descriptionFr: "Une synchronisation au caractère affirmé pour la série Kleo.",
    descriptionEn: "A bold synchronisation for the series Kleo.",
  },
  {
    slug: "true-lies",
    title: "True Lies",
    client: "CBS",
    image: "/images/synchros/true-lies-una-vez-mas.jpg",
    youtubeId: "ngBH8bsqvV8",
    descriptionFr: "Le catalogue Parigo accompagne une séquence de la série True Lies.",
    descriptionEn: "The Parigo catalogue accompanies a sequence from the series True Lies.",
  },
  {
    slug: "captain-fall",
    title: "Captain Fall",
    client: "Netflix",
    image: "/images/synchros/captain-fall-cover.jpg",
    youtubeId: "KES5ncRZxBA",
    descriptionFr: "Une musique Parigo choisie pour l’univers animé de Captain Fall.",
    descriptionEn: "Parigo music selected for the animated world of Captain Fall.",
  },
];

export const SYNCHRONISATIONS_PLAYLIST_URL = "https://www.youtube.com/playlist?list=PLIqrBBZKnwyVwPEP4ghAVEGs8UiPlfgXQ";

export function getSynchronisation(slug: string) {
  return SYNCHRONISATIONS.find((item) => item.slug === slug);
}

export function youtubeEmbedUrl(youtubeId: string) {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`;
}
