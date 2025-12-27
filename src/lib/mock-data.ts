import type { Album, Track, Playlist, Label } from "@/types";

// Genres et moods disponibles
export const GENRES = [
  "Electronic",
  "Cinematic",
  "Pop",
  "Rock",
  "Jazz",
  "Classical",
  "Hip-Hop",
  "Ambient",
  "World",
  "Folk",
  "R&B",
  "Reggae",
];

export const MOODS = [
  "Uplifting",
  "Dark",
  "Peaceful",
  "Energetic",
  "Melancholic",
  "Epic",
  "Romantic",
  "Mysterious",
  "Playful",
  "Tense",
  "Hopeful",
  "Dramatic",
];

export const INSTRUMENTS = [
  "Piano",
  "Guitar",
  "Strings",
  "Drums",
  "Synth",
  "Bass",
  "Brass",
  "Woodwinds",
  "Percussion",
  "Vocals",
];

// Helper pour générer des IDs uniques
const generateId = () => Math.random().toString(36).substring(2, 9);

// Génération de pistes mockées
const generateTracks = (albumId: string, count: number): Track[] => {
  const trackTitles = [
    "Rising Sun",
    "Midnight Dreams",
    "City Lights",
    "Ocean Waves",
    "Mountain Peak",
    "Desert Storm",
    "Forest Walk",
    "Electric Pulse",
    "Gentle Rain",
    "Starlight",
    "Neon Nights",
    "Golden Hour",
    "Velvet Touch",
    "Crystal Clear",
    "Wild Spirit",
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: generateId(),
    title: trackTitles[i % trackTitles.length] + (i >= trackTitles.length ? ` ${Math.floor(i / trackTitles.length) + 1}` : ""),
    duration: Math.floor(Math.random() * 180) + 60, // 1-4 minutes
    bpm: Math.floor(Math.random() * 80) + 80, // 80-160 BPM
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    albumId,
    genres: [GENRES[Math.floor(Math.random() * GENRES.length)]],
    moods: [MOODS[Math.floor(Math.random() * MOODS.length)]],
    instruments: [
      INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)],
      INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)],
    ],
    isVocal: Math.random() > 0.7,
  }));
};

// Albums mockés
export const mockAlbums: Album[] = [
  {
    id: "album-1",
    title: "Cinematic Horizons",
    label: "Epic Score",
    cover: "https://picsum.photos/seed/album1/400/400",
    description: "Epic orchestral compositions for film and television.",
    genres: ["Cinematic", "Classical"],
    moods: ["Epic", "Dramatic"],
    releaseDate: "2024-01-15",
    trackCount: 12,
    tracks: generateTracks("album-1", 12),
  },
  {
    id: "album-2",
    title: "Electronic Dreams",
    label: "Parigo",
    cover: "https://picsum.photos/seed/album2/400/400",
    description: "Modern electronic soundscapes for creative projects.",
    genres: ["Electronic", "Ambient"],
    moods: ["Mysterious", "Peaceful"],
    releaseDate: "2024-02-20",
    trackCount: 10,
    tracks: generateTracks("album-2", 10),
  },
  {
    id: "album-3",
    title: "Urban Beats",
    label: "Hella Good Records",
    cover: "https://picsum.photos/seed/album3/400/400",
    description: "Fresh hip-hop and urban grooves.",
    genres: ["Hip-Hop", "R&B"],
    moods: ["Energetic", "Playful"],
    releaseDate: "2024-03-10",
    trackCount: 15,
    tracks: generateTracks("album-3", 15),
  },
  {
    id: "album-4",
    title: "Acoustic Sessions",
    label: "5 Alarm Music",
    cover: "https://picsum.photos/seed/album4/400/400",
    description: "Warm acoustic tracks with organic feel.",
    genres: ["Folk", "Pop"],
    moods: ["Peaceful", "Romantic"],
    releaseDate: "2024-03-25",
    trackCount: 8,
    tracks: generateTracks("album-4", 8),
  },
  {
    id: "album-5",
    title: "Dark Tensions",
    label: "Epic Score",
    cover: "https://picsum.photos/seed/album5/400/400",
    description: "Suspenseful and dark compositions for thrillers.",
    genres: ["Cinematic", "Electronic"],
    moods: ["Dark", "Tense"],
    releaseDate: "2024-04-05",
    trackCount: 11,
    tracks: generateTracks("album-5", 11),
  },
  {
    id: "album-6",
    title: "World Fusion",
    label: "Parigo",
    cover: "https://picsum.photos/seed/album6/400/400",
    description: "Global sounds and cultural rhythms.",
    genres: ["World", "Jazz"],
    moods: ["Uplifting", "Playful"],
    releaseDate: "2024-04-18",
    trackCount: 9,
    tracks: generateTracks("album-6", 9),
  },
  {
    id: "album-7",
    title: "Rock Anthems",
    label: "101 Music",
    cover: "https://picsum.photos/seed/album7/400/400",
    description: "Powerful rock tracks for sports and action.",
    genres: ["Rock", "Pop"],
    moods: ["Energetic", "Epic"],
    releaseDate: "2024-05-01",
    trackCount: 10,
    tracks: generateTracks("album-7", 10),
  },
  {
    id: "album-8",
    title: "Chill Vibes",
    label: "Hella Good Records",
    cover: "https://picsum.photos/seed/album8/400/400",
    description: "Relaxing downtempo for lifestyle content.",
    genres: ["Electronic", "Ambient"],
    moods: ["Peaceful", "Melancholic"],
    releaseDate: "2024-05-15",
    trackCount: 12,
    tracks: generateTracks("album-8", 12),
  },
  {
    id: "album-9",
    title: "Jazz Nights",
    label: "Parigo",
    cover: "https://picsum.photos/seed/album9/400/400",
    description: "Smooth jazz for sophisticated atmospheres.",
    genres: ["Jazz", "R&B"],
    moods: ["Romantic", "Mysterious"],
    releaseDate: "2024-06-01",
    trackCount: 8,
    tracks: generateTracks("album-9", 8),
  },
  {
    id: "album-10",
    title: "Epic Trailers",
    label: "Epic Score",
    cover: "https://picsum.photos/seed/album10/400/400",
    description: "Massive trailer music for blockbuster impact.",
    genres: ["Cinematic", "Electronic"],
    moods: ["Epic", "Dramatic"],
    releaseDate: "2024-06-20",
    trackCount: 10,
    tracks: generateTracks("album-10", 10),
  },
  {
    id: "album-11",
    title: "Summer Pop",
    label: "5 Alarm Music",
    cover: "https://picsum.photos/seed/album11/400/400",
    description: "Bright and catchy pop for commercials.",
    genres: ["Pop", "Electronic"],
    moods: ["Uplifting", "Playful"],
    releaseDate: "2024-07-01",
    trackCount: 14,
    tracks: generateTracks("album-11", 14),
  },
  {
    id: "album-12",
    title: "Minimal Textures",
    label: "Parigo",
    cover: "https://picsum.photos/seed/album12/400/400",
    description: "Subtle electronic textures for documentary.",
    genres: ["Electronic", "Ambient"],
    moods: ["Peaceful", "Mysterious"],
    releaseDate: "2024-07-15",
    trackCount: 10,
    tracks: generateTracks("album-12", 10),
  },
];

// Playlists mockées
export const mockPlaylists: Playlist[] = [
  {
    id: "playlist-1",
    title: "Épique & Cinématique",
    description: "Les meilleures pistes pour vos projets de grande envergure.",
    cover: "https://picsum.photos/seed/playlist1/400/400",
    category: "Cinematic",
    trackIds: mockAlbums[0].tracks.slice(0, 5).map(t => t.id),
  },
  {
    id: "playlist-2",
    title: "Ambiances Relaxantes",
    description: "Sons apaisants pour documentaires et lifestyle.",
    cover: "https://picsum.photos/seed/playlist2/400/400",
    category: "Ambient",
    trackIds: mockAlbums[7].tracks.slice(0, 6).map(t => t.id),
  },
  {
    id: "playlist-3",
    title: "Énergie Positive",
    description: "Pistes dynamiques pour publicités et sports.",
    cover: "https://picsum.photos/seed/playlist3/400/400",
    category: "Upbeat",
    trackIds: mockAlbums[2].tracks.slice(0, 5).map(t => t.id),
  },
  {
    id: "playlist-4",
    title: "Suspense & Thriller",
    description: "Créez la tension parfaite pour vos scènes.",
    cover: "https://picsum.photos/seed/playlist4/400/400",
    category: "Dark",
    trackIds: mockAlbums[4].tracks.slice(0, 6).map(t => t.id),
  },
  {
    id: "playlist-5",
    title: "Pop Commerciale",
    description: "Hits accrocheurs pour spots TV.",
    cover: "https://picsum.photos/seed/playlist5/400/400",
    category: "Commercial",
    trackIds: mockAlbums[10].tracks.slice(0, 5).map(t => t.id),
  },
  {
    id: "playlist-6",
    title: "World & Voyage",
    description: "Sons du monde pour récits de voyage.",
    cover: "https://picsum.photos/seed/playlist6/400/400",
    category: "World",
    trackIds: mockAlbums[5].tracks.slice(0, 5).map(t => t.id),
  },
];

// Labels mockés
export const mockLabels: Label[] = [
  {
    id: "label-1",
    name: "Epic Score",
    logo: "https://picsum.photos/seed/label1/200/200",
    description: "Huge, over-the-top and larger-than-life trailer tracks.",
    albumCount: 45,
  },
  {
    id: "label-2",
    name: "Parigo",
    logo: "https://picsum.photos/seed/label2/200/200",
    description: "Cool, quirky and kitsch sounds from Paris.",
    albumCount: 120,
  },
  {
    id: "label-3",
    name: "Hella Good Records",
    logo: "https://picsum.photos/seed/label3/200/200",
    description: "Independent artists with vocal and instrumental versions.",
    albumCount: 35,
  },
  {
    id: "label-4",
    name: "5 Alarm Music",
    logo: "https://picsum.photos/seed/label4/200/200",
    description: "Diverse catalog for TV, film and advertising.",
    albumCount: 200,
  },
  {
    id: "label-5",
    name: "101 Music",
    logo: "https://picsum.photos/seed/label5/200/200",
    description: "Wide range of styles for every production need.",
    albumCount: 150,
  },
];

// Synchronisations clients mockées
export const mockSyncs = [
  { name: "Netflix", logo: "https://logo.clearbit.com/netflix.com" },
  { name: "HBO", logo: "https://logo.clearbit.com/hbo.com" },
  { name: "Canal+", logo: "https://logo.clearbit.com/canalplus.fr" },
  { name: "TF1", logo: "https://logo.clearbit.com/tf1.fr" },
  { name: "France TV", logo: "https://logo.clearbit.com/france.tv" },
  { name: "M6", logo: "https://logo.clearbit.com/m6.fr" },
];

// Helper pour obtenir toutes les pistes
export function getAllTracks(): Track[] {
  return mockAlbums.flatMap((album) => album.tracks);
}

// Helper pour rechercher
export function searchTracks(query: string): Track[] {
  const lowerQuery = query.toLowerCase();
  return getAllTracks().filter(
    (track) =>
      track.title.toLowerCase().includes(lowerQuery) ||
      track.genres.some((g) => g.toLowerCase().includes(lowerQuery)) ||
      track.moods.some((m) => m.toLowerCase().includes(lowerQuery))
  );
}

// Helper pour obtenir un album par ID
export function getAlbumById(id: string): Album | undefined {
  return mockAlbums.find((album) => album.id === id);
}

// Helper pour obtenir une piste par ID
export function getTrackById(id: string): Track | undefined {
  return getAllTracks().find((track) => track.id === id);
}
