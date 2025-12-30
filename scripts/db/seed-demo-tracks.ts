import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Sample audio files available
const SAMPLE_AUDIO = [
  "/audio/sample-1.mp3",
  "/audio/sample-2.mp3",
  "/audio/sample-3.mp3",
  "/audio/sample-4.mp3",
  "/audio/sample-5.mp3",
  "/audio/sample-6.mp3",
];

// Demo track durations (in seconds) - approximate durations for the samples
const SAMPLE_DURATIONS = [45, 60, 52, 48, 55, 50];

// Demo waveform data (normalized values 0-1)
function generateWaveform(): number[] {
  const points = 100;
  const waveform: number[] = [];
  for (let i = 0; i < points; i++) {
    // Generate realistic-looking waveform with peaks and valleys
    const base = 0.3 + Math.random() * 0.4;
    const variation = Math.sin(i * 0.1) * 0.2;
    waveform.push(Math.max(0.1, Math.min(1, base + variation)));
  }
  return waveform;
}

// Musical keys
const MUSICAL_KEYS = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm",
];

// Track title templates by genre
const TRACK_TITLES: Record<string, string[]> = {
  electronic: [
    "Digital Pulse", "Neon Dreams", "Circuit Flow", "Synthwave", "Binary Code",
    "Electric Mind", "Data Stream", "Voltage", "Frequency", "Amplitude",
  ],
  cinematic: [
    "Epic Rising", "Heroic Journey", "The Awakening", "Destiny Calls", "Final Stand",
    "Victory March", "Into the Unknown", "The Legend", "Dawn of Hope", "Eternal Glory",
  ],
  pop: [
    "Summer Vibes", "Feel Good", "Dancing Tonight", "Happy Days", "Sunshine",
    "Good Times", "Party Mode", "High Energy", "Joy Ride", "Celebration",
  ],
  rock: [
    "Thunder Road", "Rebel Heart", "Electric Storm", "Breaking Free", "Wild Spirit",
    "Power Surge", "Rock Anthem", "Fire Within", "Unstoppable", "Revolution",
  ],
  jazz: [
    "Midnight Blues", "Smooth Groove", "Jazz Café", "Swing Time", "Cool Breeze",
    "Night in Paris", "Blue Notes", "Soulful", "Impromptu", "Velvet Touch",
  ],
  classical: [
    "Adagio", "Allegro Vivace", "Nocturne", "Prelude", "Sonata",
    "Symphony", "Concerto", "Minuet", "Waltz", "Serenade",
  ],
  ambient: [
    "Floating", "Dreamscape", "Ethereal", "Calm Waters", "Serenity",
    "Peaceful Mind", "Horizon", "Twilight", "Zen Garden", "Silent Dawn",
  ],
  world: [
    "Global Rhythm", "World Beat", "Cultural Fusion", "Tribal Dance", "Desert Wind",
    "Ocean Spirit", "Mountain Echo", "Village Festival", "Sacred Journey", "Earth Song",
  ],
  default: [
    "Track One", "The Beginning", "Main Theme", "Interlude", "Crescendo",
    "The Journey", "Reflection", "Momentum", "Resolution", "Finale",
  ],
};

function getTrackTitle(genreSlug: string, index: number): string {
  const titles = TRACK_TITLES[genreSlug] || TRACK_TITLES.default;
  return titles[index % titles.length];
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function seedDemoTracks() {
  console.log("🎵 Creating demo tracks for all albums...\n");

  // Get all albums with their genres
  const albums = await prisma.album.findMany({
    where: { isActive: true },
    include: {
      genres: {
        include: { genre: true },
      },
      artists: {
        include: { artist: true },
      },
    },
    orderBy: { order: "asc" },
  });

  console.log(`📀 Found ${albums.length} albums\n`);

  // Get all genres and moods for linking
  const genres = await prisma.genre.findMany();
  const moods = await prisma.mood.findMany();
  const instruments = await prisma.instrument.findMany();

  let totalTracks = 0;

  for (const album of albums) {
    // Determine number of tracks (5-10 per album)
    const trackCount = 5 + Math.floor(Math.random() * 6);

    // Get primary genre for track naming
    const primaryGenreSlug = album.genres[0]?.genre.slug || "default";

    console.log(`  📀 ${album.title}: Creating ${trackCount} tracks...`);

    for (let i = 0; i < trackCount; i++) {
      const trackNumber = i + 1;
      const title = getTrackTitle(primaryGenreSlug, i);
      const slug = `${album.slug}-${slugify(title)}-${trackNumber}`;

      // Select sample audio (cycle through available samples)
      const sampleIndex = i % SAMPLE_AUDIO.length;
      const audioUrl = SAMPLE_AUDIO[sampleIndex];
      const duration = SAMPLE_DURATIONS[sampleIndex] + Math.floor(Math.random() * 30);

      // Random BPM (80-160)
      const bpm = 80 + Math.floor(Math.random() * 80);

      // Random key
      const key = MUSICAL_KEYS[Math.floor(Math.random() * MUSICAL_KEYS.length)];

      // Random vocal (20% chance)
      const isVocal = Math.random() < 0.2;

      // Generate waveform
      const waveform = generateWaveform();

      try {
        // Create or update the track
        const track = await prisma.track.upsert({
          where: { slug },
          update: {
            previewUrl: audioUrl,
            duration,
            bpm,
            key,
            isVocal,
            waveform,
          },
          create: {
            title,
            slug,
            albumId: album.id,
            previewUrl: audioUrl,
            duration,
            bpm,
            key,
            isVocal,
            waveform,
            trackNumber,
            order: i,
            isActive: true,
          },
        });

        // Link track to album's genres
        for (const albumGenre of album.genres) {
          await prisma.trackGenre.upsert({
            where: {
              trackId_genreId: {
                trackId: track.id,
                genreId: albumGenre.genreId,
              },
            },
            update: {},
            create: {
              trackId: track.id,
              genreId: albumGenre.genreId,
            },
          });
        }

        // Link to 1-3 random moods
        const moodCount = 1 + Math.floor(Math.random() * 3);
        const shuffledMoods = [...moods].sort(() => Math.random() - 0.5);
        for (let m = 0; m < moodCount && m < shuffledMoods.length; m++) {
          await prisma.trackMood.upsert({
            where: {
              trackId_moodId: {
                trackId: track.id,
                moodId: shuffledMoods[m].id,
              },
            },
            update: {},
            create: {
              trackId: track.id,
              moodId: shuffledMoods[m].id,
            },
          });
        }

        // Link to 1-3 random instruments
        const instrumentCount = 1 + Math.floor(Math.random() * 3);
        const shuffledInstruments = [...instruments].sort(() => Math.random() - 0.5);
        for (let inst = 0; inst < instrumentCount && inst < shuffledInstruments.length; inst++) {
          await prisma.trackInstrument.upsert({
            where: {
              trackId_instrumentId: {
                trackId: track.id,
                instrumentId: shuffledInstruments[inst].id,
              },
            },
            update: {},
            create: {
              trackId: track.id,
              instrumentId: shuffledInstruments[inst].id,
            },
          });
        }

        // Link track to album artists
        for (const albumArtist of album.artists) {
          await prisma.trackArtist.upsert({
            where: {
              trackId_artistId: {
                trackId: track.id,
                artistId: albumArtist.artistId,
              },
            },
            update: {},
            create: {
              trackId: track.id,
              artistId: albumArtist.artistId,
              role: albumArtist.role,
              order: albumArtist.order,
            },
          });
        }

        totalTracks++;
      } catch (error) {
        console.error(`    ❌ Error creating track ${title}:`, error);
      }
    }
  }

  console.log(`\n✅ Created ${totalTracks} demo tracks across ${albums.length} albums`);

  // Print stats
  const trackCount = await prisma.track.count();
  const trackGenreCount = await prisma.trackGenre.count();
  const trackMoodCount = await prisma.trackMood.count();

  console.log("\n📊 Final Stats:");
  console.log(`   Total tracks: ${trackCount}`);
  console.log(`   Track-Genre links: ${trackGenreCount}`);
  console.log(`   Track-Mood links: ${trackMoodCount}`);
}

async function main() {
  try {
    await seedDemoTracks();
  } catch (error) {
    console.error("❌ Error seeding demo tracks:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
