/**
 * Script to fetch tracks from Spotify for all albums with Spotify URLs
 * Run with: pnpm tsx scripts/spotify/fetch-tracks.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  extractSpotifyAlbumId,
  getSpotifyAlbumTracks,
  generateWaveformData,
  type SpotifyTrack,
} from "../../src/lib/spotify/client";

const prisma = new PrismaClient();

// Slugify function
function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchTracksForAlbum(
  albumId: string,
  albumSlug: string,
  spotifyAlbumId: string
): Promise<number> {
  try {
    console.log(`  Fetching tracks for album: ${albumSlug} (${spotifyAlbumId})`);

    const spotifyTracks = await getSpotifyAlbumTracks(spotifyAlbumId);
    let created = 0;

    for (const spotifyTrack of spotifyTracks) {
      const trackSlug = `${albumSlug}-${slugify(spotifyTrack.name)}`;

      // Check if track already exists
      const existingTrack = await prisma.track.findFirst({
        where: {
          OR: [
            { spotifyId: spotifyTrack.id },
            { slug: trackSlug },
          ],
        },
      });

      if (existingTrack) {
        continue;
      }

      // Generate waveform data
      const waveform = generateWaveformData(
        spotifyTrack.duration_ms / 1000,
        spotifyTrack.id.charCodeAt(0) + spotifyTrack.track_number
      );

      // Create track
      await prisma.track.create({
        data: {
          slug: trackSlug,
          title: spotifyTrack.name,
          albumId: albumId,
          duration: Math.round(spotifyTrack.duration_ms / 1000),
          trackNumber: spotifyTrack.track_number,
          spotifyId: spotifyTrack.id,
          previewUrl: spotifyTrack.preview_url,
          isrc: spotifyTrack.external_ids?.isrc,
          waveform: waveform,
          isActive: true,
          order: spotifyTrack.track_number,
        },
      });

      created++;
    }

    return created;
  } catch (error) {
    console.error(`  Error fetching tracks for ${albumSlug}:`, error);
    return 0;
  }
}

async function main() {
  console.log("🎵 Fetching tracks from Spotify...\n");

  // Check for Spotify credentials
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error("❌ Spotify credentials not configured!");
    console.error("   Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env");
    process.exit(1);
  }

  // Get all albums with Spotify URLs
  const albums = await prisma.album.findMany({
    where: {
      spotifyUrl: { not: null },
      isActive: true,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      spotifyUrl: true,
      spotifyId: true,
      _count: {
        select: { tracks: true },
      },
    },
  });

  console.log(`Found ${albums.length} albums with Spotify URLs\n`);

  let totalCreated = 0;
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const album of albums) {
    // Skip albums that already have tracks
    if (album._count.tracks > 0) {
      console.log(`⏭️  Skipping ${album.title} (already has ${album._count.tracks} tracks)`);
      skipped++;
      continue;
    }

    // Extract Spotify album ID
    const spotifyAlbumId = album.spotifyId || extractSpotifyAlbumId(album.spotifyUrl!);

    if (!spotifyAlbumId) {
      console.log(`⚠️  Could not extract Spotify ID from: ${album.spotifyUrl}`);
      errors++;
      continue;
    }

    // Update album with spotifyId if not set
    if (!album.spotifyId) {
      await prisma.album.update({
        where: { id: album.id },
        data: { spotifyId: spotifyAlbumId },
      });
    }

    const created = await fetchTracksForAlbum(album.id, album.slug, spotifyAlbumId);
    totalCreated += created;
    processed++;

    console.log(`✅ ${album.title}: ${created} tracks created`);

    // Rate limiting - Spotify allows 180 requests per minute
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary:");
  console.log(`   Albums processed: ${processed}`);
  console.log(`   Albums skipped: ${skipped}`);
  console.log(`   Albums with errors: ${errors}`);
  console.log(`   Total tracks created: ${totalCreated}`);

  // Get final stats
  const trackCount = await prisma.track.count();
  console.log(`\n📈 Total tracks in database: ${trackCount}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
