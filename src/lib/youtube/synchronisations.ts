import "server-only";

import { unstable_cache } from "next/cache";
import { SYNCHRONISATIONS, type Synchronisation } from "@/content/synchronisations";
import { logEvent } from "@/lib/logger";

const DEFAULT_PLAYLIST_ID = "PLIqrBBZKnwyVwPEP4ghAVEGs8UiPlfgXQ";

interface YouTubeText {
  simpleText?: string;
  runs?: Array<{ text?: string }>;
}

interface YouTubePlaylistItem {
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    position?: number;
    videoOwnerChannelTitle?: string;
    resourceId?: { videoId?: string };
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: { videoId?: string };
}

interface YouTubePlaylistResponse {
  nextPageToken?: string;
  items?: YouTubePlaylistItem[];
}

interface PlaylistVideoRenderer {
  videoId?: string;
  title?: YouTubeText;
  shortBylineText?: YouTubeText;
  index?: YouTubeText;
}

interface LockupViewModel {
  contentId?: string;
  contentType?: string;
  contentImage?: {
    thumbnailViewModel?: {
      image?: { sources?: Array<{ url?: string; width?: number }> };
    };
  };
  metadata?: {
    lockupMetadataViewModel?: {
      title?: { content?: string };
      metadata?: {
        contentMetadataViewModel?: {
          metadataRows?: Array<{
            metadataParts?: Array<{ text?: { content?: string } }>;
          }>;
        };
      };
    };
  };
}

function text(value?: YouTubeText): string {
  return value?.simpleText || value?.runs?.map((run) => run.text ?? "").join("") || "";
}

function mapVideo(input: {
  videoId: string;
  title: string;
  description?: string;
  client?: string;
  publishedAt?: string;
  position?: number;
  image?: string;
}): Synchronisation {
  const editorial = SYNCHRONISATIONS.find((item) => item.youtubeId === input.videoId);
  const publishedAt = input.publishedAt;
  const year = publishedAt ? new Date(publishedAt).getUTCFullYear() : undefined;
  if (editorial) {
    return { ...editorial, image: input.image || editorial.image, publishedAt, position: input.position, year, source: "youtube" };
  }
  const description = input.description?.replace(/\s+/g, " ").trim();
  return {
    slug: input.videoId,
    title: input.title.replace(/\s+/g, " ").trim() || "Synchronisation Parigo",
    client: input.client || "Parigo Music",
    image: input.image || `https://i.ytimg.com/vi/${input.videoId}/hqdefault.jpg`,
    youtubeId: input.videoId,
    descriptionFr: description || "Une synchronisation issue de la sélection audiovisuelle Parigo Music.",
    descriptionEn: description || "A synchronisation from Parigo Music’s audiovisual selection.",
    publishedAt,
    position: input.position,
    year,
    source: "youtube",
  };
}

async function fetchWithApiKey(apiKey: string, playlistId: string): Promise<Synchronisation[]> {
  const items: Synchronisation[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ part: "snippet,contentDetails", maxResults: "50", playlistId, key: apiKey });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`YouTube playlist request failed with ${response.status}`);
    const payload = await response.json() as YouTubePlaylistResponse;
    for (const item of payload.items ?? []) {
      const snippet = item.snippet;
      const videoId = item.contentDetails?.videoId || snippet?.resourceId?.videoId;
      const title = snippet?.title?.trim() ?? "";
      if (!videoId || !title || /^(private|deleted) video$/i.test(title)) continue;
      const thumbnails = snippet?.thumbnails;
      const image = thumbnails?.maxres?.url || thumbnails?.standard?.url || thumbnails?.high?.url || thumbnails?.medium?.url;
      items.push(mapVideo({ videoId, title, description: snippet?.description, client: snippet?.videoOwnerChannelTitle, publishedAt: snippet?.publishedAt, position: snippet?.position, image }));
    }
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);
  return items;
}

function collectPlaylistVideos(value: unknown, target: PlaylistVideoRenderer[], lockups: LockupViewModel[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectPlaylistVideos(item, target, lockups));
    return;
  }
  const record = value as Record<string, unknown>;
  const renderer = record.playlistVideoRenderer;
  if (renderer && typeof renderer === "object") target.push(renderer as PlaylistVideoRenderer);
  const lockup = record.lockupViewModel;
  if (lockup && typeof lockup === "object") lockups.push(lockup as LockupViewModel);
  Object.values(record).forEach((item) => collectPlaylistVideos(item, target, lockups));
}

async function fetchPublicPlaylist(playlistId: string): Promise<Synchronisation[]> {
  const response = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}&hl=fr`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ParigoMusic/1.0)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`YouTube public playlist failed with ${response.status}`);
  const html = await response.text();
  const match = html.match(/(?:var ytInitialData = |window\["ytInitialData"\] = )(\{[\s\S]+?\});<\/script>/);
  if (!match?.[1]) throw new Error("YouTube public playlist data was not found");
  const renderers: PlaylistVideoRenderer[] = [];
  const lockups: LockupViewModel[] = [];
  collectPlaylistVideos(JSON.parse(match[1]) as unknown, renderers, lockups);
  const unique = new Map<string, Synchronisation>();
  renderers.forEach((renderer, index) => {
    if (!renderer.videoId || unique.has(renderer.videoId)) return;
    const title = text(renderer.title);
    if (!title || /^(private|deleted) video$/i.test(title)) return;
    const displayedIndex = Number(text(renderer.index)) || index + 1;
    unique.set(renderer.videoId, mapVideo({ videoId: renderer.videoId, title, client: text(renderer.shortBylineText) || "Parigo Music", position: displayedIndex - 1 }));
  });
  lockups.forEach((lockup, index) => {
    const videoId = lockup.contentId;
    if (!videoId || unique.has(videoId) || !/VIDEO/i.test(lockup.contentType ?? "")) return;
    const metadata = lockup.metadata?.lockupMetadataViewModel;
    const title = metadata?.title?.content?.trim() ?? "";
    if (!title || /^(private|deleted) video$/i.test(title)) return;
    const client = metadata?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content;
    const imageSources = lockup.contentImage?.thumbnailViewModel?.image?.sources ?? [];
    const image = [...imageSources].sort((left, right) => (right.width ?? 0) - (left.width ?? 0))[0]?.url;
    unique.set(videoId, mapVideo({ videoId, title, client: client || "Parigo Music", image, position: index }));
  });
  if (!unique.size) throw new Error("YouTube public playlist contained no usable videos");
  return [...unique.values()].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
}

async function loadSynchronisations(): Promise<Synchronisation[]> {
  const playlistId = process.env.YOUTUBE_SYNCHRONISATIONS_PLAYLIST_ID || DEFAULT_PLAYLIST_ID;
  try {
    const items = process.env.YOUTUBE_API_KEY
      ? await fetchWithApiKey(process.env.YOUTUBE_API_KEY, playlistId)
      : await fetchPublicPlaylist(playlistId);
    if (items.length) return items;
  } catch (error) {
    logEvent({
      level: "warn",
      message: "youtube_playlist_unavailable",
      route: "youtube-playlist",
      code: error instanceof Error ? error.name : "UNKNOWN",
      requestId: crypto.randomUUID(),
    });
  }
  return SYNCHRONISATIONS;
}

export const getSynchronisations = unstable_cache(
  loadSynchronisations,
  ["youtube-synchronisations-v2"],
  { revalidate: 86400, tags: ["youtube", "synchronisations"] },
);

export async function getSynchronisation(slug: string): Promise<Synchronisation | undefined> {
  return (await getSynchronisations()).find((item) => item.slug === slug || item.youtubeId === slug);
}
