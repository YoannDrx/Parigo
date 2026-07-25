import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { clips, normalizeHarvestCredit, publishedComposerProfiles } from "../src/lib/editorial/contracts";
import { playlistVideoOverrides } from "../src/lib/editorial/video-overrides";
import { classifyVideoTitle } from "../src/lib/editorial/video-classification";
import { fetchYouTubePlaylist } from "../src/lib/youtube/playlists";

const PARIGO_LABEL_ID = "b9d701733704e2d7";
const CLIPS_PLAYLIST_ID = "PLIqrBBZKnwyWMkXainshLgavNlTmx9AhG";

interface ApiAlbum {
  id: string;
  code?: string;
  title: string;
  tracks?: Array<{ composers?: string[] }>;
}

interface SourceArtist {
  slug: string;
  name: string;
}

interface AuditRow {
  category: "Vidéo" | "Album" | "Compositeur";
  item: string;
  reference: string;
  missing: string;
  knownRelations: string;
  questionForCaroline: string;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function mapConcurrent<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index]);
    }
  }));
  return results;
}

function csv(value: string): string {
  return `"${value.replaceAll("\"", "\"\"").replace(/\s+/g, " ").trim()}"`;
}

async function main() {
  const baseUrl = process.env.EDITORIAL_AUDIT_BASE_URL || "http://127.0.0.1:3000";
  const playlistId = process.env.YOUTUBE_CLIPS_PLAYLIST_ID || CLIPS_PLAYLIST_ID;
  const portfolioRoot = process.env.PORTFOLIO_CARO_ROOT
    ? path.resolve(process.env.PORTFOLIO_CARO_ROOT)
    : path.resolve(process.cwd(), "../portfolio-caro");

  const [albumIndex, playlist, sourceArtists] = await Promise.all([
    getJson<{ data: { albums: ApiAlbum[] } }>(
      `${baseUrl}/api/albums?label=${PARIGO_LABEL_ID}&limit=100&sort=recent`,
    ),
    fetchYouTubePlaylist(playlistId),
    readFile(path.join(portfolioRoot, "seed-data/artists.json"), "utf8")
      .then((value) => JSON.parse(value) as SourceArtist[]),
  ]);
  const albums = await mapConcurrent(albumIndex.data.albums, 6, async (album) => (
    getJson<{ data: { album: ApiAlbum } }>(`${baseUrl}/api/albums/${album.id}`)
      .then((payload) => payload.data.album)
  ));

  const aliases = new Map(
    publishedComposerProfiles.flatMap((profile) => (
      profile.harvestAliases.map((alias) => [normalizeHarvestCredit(alias), profile] as const)
    )),
  );
  const composerAlbumCodes = new Map<string, Set<string>>();
  const albumRows: AuditRow[] = [];
  for (const album of albums) {
    const credits = [...new Set(album.tracks?.flatMap((track) => track.composers ?? []) ?? [])];
    const relatedProfiles = [...new Map(
      credits
        .map((credit) => aliases.get(normalizeHarvestCredit(credit)))
        .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile))
        .map((profile) => [profile.slug, profile]),
    ).values()];
    relatedProfiles.forEach((profile) => {
      const codes = composerAlbumCodes.get(profile.slug) ?? new Set<string>();
      codes.add(album.code || album.title);
      composerAlbumCodes.set(profile.slug, codes);
    });
    if (!relatedProfiles.length) {
      albumRows.push({
        category: "Album",
        item: `${album.code || "Sans code"} — ${album.title}`,
        reference: `${baseUrl}/albums/${album.id}`,
        missing: "Profil(s) compositeur(s) relié(s)",
        knownRelations: credits.length ? `Crédits Harvest : ${credits.join(" · ")}` : "Aucun crédit compositeur renvoyé",
        questionForCaroline: "Quels compositeurs de cet album devons-nous relier à un profil existant ou créer comme nouveau profil ?",
      });
    }
  }

  const localByYoutubeId = new Map(clips.filter((clip) => clip.youtubeId).map((clip) => [clip.youtubeId!, clip]));
  const localBySlug = new Map(clips.map((clip) => [clip.slug, clip]));
  const composerVideos = new Map<string, Set<string>>();
  const videoRows: AuditRow[] = [];
  for (const video of playlist) {
    const override = playlistVideoOverrides[video.youtubeId];
    if (override?.duplicateOf) continue;
    const local = localByYoutubeId.get(video.youtubeId)
      || (override?.localSlug ? localBySlug.get(override.localSlug) : undefined);
    const composerSlugs = override?.composerSlugs || local?.composerSlugs || [];
    const albumCode = local?.relatedAlbumCode;
    composerSlugs.forEach((slug) => {
      const videos = composerVideos.get(slug) ?? new Set<string>();
      videos.add(video.title);
      composerVideos.set(slug, videos);
    });
    const missing = [
      !composerSlugs.length ? "compositeur(s)" : "",
      !albumCode ? "album Parigo ou confirmation « aucun album »" : "",
    ].filter(Boolean);
    if (missing.length) {
      const composerNames = composerSlugs
        .map((slug) => publishedComposerProfiles.find((profile) => profile.slug === slug)?.name || slug);
      videoRows.push({
        category: "Vidéo",
        item: video.title,
        reference: `https://www.youtube.com/watch?v=${video.youtubeId}`,
        missing: missing.join(" + "),
        knownRelations: [
          composerNames.length ? `Compositeur(s) : ${composerNames.join(", ")}` : "",
          albumCode ? `Album : ${albumCode}` : "",
          `Type proposé : ${override?.videoType || local?.videoType || classifyVideoTitle(video.title)}`,
        ].filter(Boolean).join(" | "),
        questionForCaroline: "Qui doit être crédité pour cette vidéo et à quel album PGO faut-il la relier ? Si aucun album ne correspond, merci d’indiquer « aucun album ».",
      });
    }
  }

  const publishedSlugs = new Set(publishedComposerProfiles.map((profile) => profile.slug));
  const unpublishedCandidates = sourceArtists.filter((artist) => !publishedSlugs.has(artist.slug));
  const composerRows: AuditRow[] = [];
  for (const profile of publishedComposerProfiles) {
    const albumCodes = [...(composerAlbumCodes.get(profile.slug) ?? [])];
    const videoTitles = [...(composerVideos.get(profile.slug) ?? [])];
    if (!albumCodes.length && !videoTitles.length) {
      composerRows.push({
        category: "Compositeur",
        item: profile.name,
        reference: `${baseUrl}/compositeurs/${profile.slug}`,
        missing: "Album et vidéo",
        knownRelations: profile.harvestAliases.length
          ? `Alias Harvest actuel : ${profile.harvestAliases.join(", ")}`
          : "Aucun alias Harvest validé",
        questionForCaroline: "À quel album PGO ou à quelle vidéo ce profil doit-il être relié ? S’il ne doit pas être publié, merci de l’indiquer.",
      });
    }
  }
  for (const artist of unpublishedCandidates) {
    composerRows.push({
      category: "Compositeur",
      item: artist.name,
      reference: `Profil historique : ${artist.slug}`,
      missing: "Relation vérifiée permettant la publication",
      knownRelations: "Profil retrouvé dans l’ancien portfolio, non publié actuellement sur Parigo",
      questionForCaroline: "Ce profil a-t-il participé à un album PGO ou à une vidéo de la playlist ? Si oui, lesquels ?",
    });
  }

  const rows = [...videoRows, ...albumRows, ...composerRows];
  const summary = {
    auditedAt: new Date().toISOString(),
    playlistItems: playlist.length,
    canonicalVideos: playlist.length - Object.values(playlistVideoOverrides).filter((item) => item.duplicateOf).length,
    albums: albums.length,
    publishedComposers: publishedComposerProfiles.length,
    videosWithIncompleteRelations: videoRows.length,
    albumsWithoutPublishedComposerProfile: albumRows.length,
    publishedComposerOrphans: composerRows.length - unpublishedCandidates.length,
    historicalComposerCandidates: unpublishedCandidates.length,
    totalQuestions: rows.length,
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (process.env.WRITE_EDITORIAL_ORPHANS === "1") {
    const target = path.join(process.cwd(), "docs/editorial");
    await mkdir(target, { recursive: true });
    await writeFile(path.join(target, "orphan-relations.json"), `${JSON.stringify({ summary, rows }, null, 2)}\n`);
    const header = ["Catégorie", "Élément", "Référence", "Ce qui manque", "Relations connues", "Question pour Caroline"];
    const csvRows = [header, ...rows.map((row) => [
      row.category,
      row.item,
      row.reference,
      row.missing,
      row.knownRelations,
      row.questionForCaroline,
    ])];
    await writeFile(
      path.join(target, "caroline-matching.csv"),
      `\uFEFF${csvRows.map((row) => row.map(csv).join(";")).join("\n")}\n`,
    );
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
