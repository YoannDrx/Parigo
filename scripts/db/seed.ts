import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// Types for seed data
interface SeedArtist {
  id: number;
  slug: string;
  name: string;
  image?: string;
  links?: Array<{
    platform: string;
    url: string;
    label?: string;
    order: number;
  }>;
  order: number;
  isActive: boolean;
}

interface SeedLabel {
  id: number;
  slug: string;
  website?: string;
  description?: string;
}

interface SeedWork {
  slug: string;
  titleFr: string;
  titleEn?: string;
  descriptionFr?: string;
  descriptionEn?: string;
  category: string;
  coverImage?: string;
  releaseDate?: string;
  genre?: string;
  spotifyUrl?: string;
  externalUrl?: string;
  artists?: Array<{
    slug: string;
    name: string;
    role?: string;
  }>;
  isActive: boolean;
  order: number;
}

// Predefined genres for music library
const GENRES = [
  { name: "Electronic", slug: "electronic", color: "#00f5d4" },
  { name: "Cinematic", slug: "cinematic", color: "#9b5de5" },
  { name: "Pop", slug: "pop", color: "#f15bb5" },
  { name: "Rock", slug: "rock", color: "#ff6b6b" },
  { name: "Jazz", slug: "jazz", color: "#ffd93d" },
  { name: "Classical", slug: "classical", color: "#6bcb77" },
  { name: "Hip-Hop", slug: "hip-hop", color: "#4d96ff" },
  { name: "Ambient", slug: "ambient", color: "#7eb5d9" },
  { name: "World", slug: "world", color: "#ff9671" },
  { name: "Folk", slug: "folk", color: "#8b5a2b" },
  { name: "R&B", slug: "rnb", color: "#c77dff" },
  { name: "Reggae", slug: "reggae", color: "#2ec4b6" },
  { name: "Afro Beat", slug: "afro-beat", color: "#fca311" },
  { name: "Techno", slug: "techno", color: "#7209b7" },
  { name: "House", slug: "house", color: "#3a0ca3" },
  { name: "Funk", slug: "funk", color: "#f72585" },
  { name: "Soul", slug: "soul", color: "#b5838d" },
  { name: "Blues", slug: "blues", color: "#264653" },
  { name: "Country", slug: "country", color: "#e9c46a" },
  { name: "Latin", slug: "latin", color: "#e76f51" },
];

// Predefined moods
const MOODS = [
  { name: "Uplifting", slug: "uplifting", color: "#ffd60a" },
  { name: "Dark", slug: "dark", color: "#1b1b1b" },
  { name: "Peaceful", slug: "peaceful", color: "#90e0ef" },
  { name: "Energetic", slug: "energetic", color: "#ff5400" },
  { name: "Melancholic", slug: "melancholic", color: "#6c757d" },
  { name: "Epic", slug: "epic", color: "#7b2cbf" },
  { name: "Romantic", slug: "romantic", color: "#ff758f" },
  { name: "Mysterious", slug: "mysterious", color: "#3d405b" },
  { name: "Playful", slug: "playful", color: "#06d6a0" },
  { name: "Tense", slug: "tense", color: "#d62828" },
  { name: "Hopeful", slug: "hopeful", color: "#f4a261" },
  { name: "Dramatic", slug: "dramatic", color: "#540b0e" },
];

// Predefined instruments
const INSTRUMENTS = [
  { name: "Piano", slug: "piano", icon: "piano" },
  { name: "Guitar", slug: "guitar", icon: "guitar" },
  { name: "Strings", slug: "strings", icon: "music" },
  { name: "Drums", slug: "drums", icon: "drum" },
  { name: "Synth", slug: "synth", icon: "waves" },
  { name: "Bass", slug: "bass", icon: "audio-lines" },
  { name: "Brass", slug: "brass", icon: "music-2" },
  { name: "Woodwinds", slug: "woodwinds", icon: "wind" },
  { name: "Percussion", slug: "percussion", icon: "drum" },
  { name: "Vocals", slug: "vocals", icon: "mic" },
];

// Load JSON files
function loadJSON<T>(filename: string): T[] {
  const filePath = path.join(process.cwd(), "seed-data", filename);
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data) as T[];
}

// Parse date from DD/MM/YYYY format
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Slugify function
function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedGenres() {
  console.log("🎵 Seeding genres...");
  for (let i = 0; i < GENRES.length; i++) {
    const genre = GENRES[i];
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: {},
      create: {
        name: genre.name,
        slug: genre.slug,
        color: genre.color,
        order: i,
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${GENRES.length} genres`);
}

async function seedMoods() {
  console.log("🎭 Seeding moods...");
  for (let i = 0; i < MOODS.length; i++) {
    const mood = MOODS[i];
    await prisma.mood.upsert({
      where: { slug: mood.slug },
      update: {},
      create: {
        name: mood.name,
        slug: mood.slug,
        color: mood.color,
        order: i,
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${MOODS.length} moods`);
}

async function seedInstruments() {
  console.log("🎸 Seeding instruments...");
  for (let i = 0; i < INSTRUMENTS.length; i++) {
    const instrument = INSTRUMENTS[i];
    await prisma.instrument.upsert({
      where: { slug: instrument.slug },
      update: {},
      create: {
        name: instrument.name,
        slug: instrument.slug,
        icon: instrument.icon,
        order: i,
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${INSTRUMENTS.length} instruments`);
}

async function seedLabels() {
  console.log("🏷️ Seeding labels...");
  const labels = loadJSON<SeedLabel>("labels.json");

  // Add Parigo as main label
  await prisma.label.upsert({
    where: { slug: "parigo" },
    update: {},
    create: {
      name: "Parigo",
      slug: "parigo",
      description:
        "Parigo est une maison d'édition musicale parisienne spécialisée dans la musique de librairie. Notre catalogue comprend plus de 350 000 œuvres couvrant tous les styles et genres musicaux.",
      website: "https://parigo.fr",
      order: 0,
      isActive: true,
    },
  });

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    // Convert slug to proper name
    const name = label.slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    await prisma.label.upsert({
      where: { slug: label.slug },
      update: {},
      create: {
        name: name,
        slug: label.slug,
        description: label.description,
        website: label.website,
        order: i + 1,
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${labels.length + 1} labels`);
}

async function seedArtists() {
  console.log("🎤 Seeding artists...");
  const artists = loadJSON<SeedArtist>("artists.json");

  for (const artist of artists) {
    const createdArtist = await prisma.artist.upsert({
      where: { slug: artist.slug },
      update: {},
      create: {
        name: artist.name,
        slug: artist.slug,
        order: artist.order,
        isActive: artist.isActive,
      },
    });

    // Create artist links
    if (artist.links && artist.links.length > 0) {
      for (const link of artist.links) {
        await prisma.artistLink.upsert({
          where: {
            artistId_url: {
              artistId: createdArtist.id,
              url: link.url,
            },
          },
          update: {},
          create: {
            artistId: createdArtist.id,
            platform: link.platform,
            url: link.url,
            label: link.label,
            order: link.order,
          },
        });
      }
    }
  }
  console.log(`✅ Created ${artists.length} artists`);
}

async function seedAlbums() {
  console.log("💿 Seeding albums...");
  const works = loadJSON<SeedWork>("works.json");

  // Get Parigo label
  const parigoLabel = await prisma.label.findUnique({
    where: { slug: "parigo" },
  });

  // Get all genres for mapping
  const genres = await prisma.genre.findMany();
  const genreMap = new Map(genres.map((g) => [g.slug, g.id]));

  // Get all artists for mapping
  const artists = await prisma.artist.findMany();
  const artistMap = new Map(artists.map((a) => [a.slug, a.id]));

  let created = 0;
  for (const work of works) {
    // Only import music library albums
    if (work.category !== "album-de-librairie-musicale") {
      continue;
    }

    const releaseDate = parseDate(work.releaseDate);

    // Extract Spotify ID from URL
    let spotifyId: string | null = null;
    if (work.spotifyUrl) {
      const match = work.spotifyUrl.match(/album\/([a-zA-Z0-9]+)/);
      if (match) spotifyId = match[1];
    }

    // Create cover Asset if image exists
    let coverId: string | null = null;
    if (work.coverImage) {
      // Convert path from portfolio-caro format to parigo format
      // From: public/images/projets/albums/pgo0025.jpg
      // To: /images/albums/pgo0025.jpg
      const filename = work.coverImage.split("/").pop();
      if (filename) {
        const coverPath = `/images/albums/${filename}`;

        // Check if asset already exists
        let asset = await prisma.asset.findFirst({
          where: { path: coverPath },
        });

        if (!asset) {
          asset = await prisma.asset.create({
            data: {
              path: coverPath,
              type: "IMAGE",
              mimeType: "image/jpeg",
            },
          });
        }
        coverId = asset.id;
      }
    }

    const album = await prisma.album.upsert({
      where: { slug: work.slug },
      update: {
        coverId: coverId,
      },
      create: {
        title: work.titleFr,
        slug: work.slug,
        description: work.descriptionFr || null,
        labelId: parigoLabel?.id,
        coverId: coverId,
        releaseDate: releaseDate,
        year: releaseDate?.getFullYear(),
        spotifyUrl: work.spotifyUrl?.trim() || null,
        spotifyId: spotifyId,
        order: work.order,
        isActive: work.isActive,
        isFeatured: work.order < 10, // First 10 are featured
      },
    });

    // Map genre from work
    if (work.genre) {
      const genreSlug = slugify(work.genre.split("/")[0].trim());
      const genreId = genreMap.get(genreSlug);
      if (genreId) {
        await prisma.albumGenre
          .create({
            data: {
              albumId: album.id,
              genreId: genreId,
            },
          })
          .catch(() => {
            // Ignore duplicate
          });
      }
    }

    // Link artists
    if (work.artists && work.artists.length > 0) {
      for (let i = 0; i < work.artists.length; i++) {
        const workArtist = work.artists[i];
        const artistId = artistMap.get(workArtist.slug);
        if (artistId) {
          await prisma.albumArtist
            .create({
              data: {
                albumId: album.id,
                artistId: artistId,
                role: workArtist.role || "composer",
                order: i,
              },
            })
            .catch(() => {
              // Ignore duplicate
            });
        }
      }
    }

    created++;
  }
  console.log(`✅ Created ${created} albums with covers`);
}

async function seedEditorialPlaylists() {
  console.log("📋 Seeding editorial playlists...");

  const playlists = [
    {
      title: "Épique & Cinématique",
      slug: "epic-cinematic",
      description:
        "Les morceaux les plus épiques et cinématiques de notre catalogue",
      category: "Cinematic",
    },
    {
      title: "Ambiances Relaxantes",
      slug: "relaxing-ambiances",
      description: "Musiques apaisantes pour la détente et la concentration",
      category: "Ambient",
    },
    {
      title: "Énergie Positive",
      slug: "positive-energy",
      description: "Des morceaux dynamiques et joyeux",
      category: "Upbeat",
    },
    {
      title: "Suspense & Thriller",
      slug: "suspense-thriller",
      description: "Tension et mystère pour vos projets dramatiques",
      category: "Dark",
    },
    {
      title: "Pop Commerciale",
      slug: "commercial-pop",
      description: "Sons pop modernes et accrocheurs",
      category: "Commercial",
    },
    {
      title: "World & Voyage",
      slug: "world-voyage",
      description: "Explorez les sonorités du monde",
      category: "World",
    },
  ];

  for (let i = 0; i < playlists.length; i++) {
    const playlist = playlists[i];
    await prisma.playlist.upsert({
      where: { slug: playlist.slug },
      update: {},
      create: {
        title: playlist.title,
        slug: playlist.slug,
        description: playlist.description,
        category: playlist.category,
        isPublic: true,
        isFeatured: true,
        order: i,
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${playlists.length} editorial playlists`);
}

async function main() {
  console.log("🌱 Starting database seed...\n");

  try {
    await seedGenres();
    await seedMoods();
    await seedInstruments();
    await seedLabels();
    await seedArtists();
    await seedAlbums();
    await seedEditorialPlaylists();

    console.log("\n✨ Database seeded successfully!");

    // Print stats
    const stats = await Promise.all([
      prisma.genre.count(),
      prisma.mood.count(),
      prisma.instrument.count(),
      prisma.label.count(),
      prisma.artist.count(),
      prisma.album.count(),
      prisma.playlist.count(),
    ]);

    console.log("\n📊 Database Stats:");
    console.log(`   Genres: ${stats[0]}`);
    console.log(`   Moods: ${stats[1]}`);
    console.log(`   Instruments: ${stats[2]}`);
    console.log(`   Labels: ${stats[3]}`);
    console.log(`   Artists: ${stats[4]}`);
    console.log(`   Albums: ${stats[5]}`);
    console.log(`   Playlists: ${stats[6]}`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
