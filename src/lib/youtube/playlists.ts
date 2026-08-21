export interface YouTubePlaylistVideo {
  youtubeId: string;
  title: string;
  description?: string;
  channelTitle?: string;
  thumbnail: string;
  publishedAt?: string;
  position: number;
}

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

interface YouTubeVideoResponse {
  items?: Array<{
    id?: string;
    snippet?: { publishedAt?: string };
  }>;
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

function thumbnail(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

async function fetchVideoPublicationDates(apiKey: string, youtubeIds: string[]): Promise<Map<string, string>> {
  const publishedAtById = new Map<string, string>();
  for (let offset = 0; offset < youtubeIds.length; offset += 50) {
    const params = new URLSearchParams({
      part: "snippet",
      id: youtubeIds.slice(offset, offset + 50).join(","),
      key: apiKey,
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`YouTube video details request failed with ${response.status}`);
    const payload = await response.json() as YouTubeVideoResponse;
    for (const video of payload.items ?? []) {
      if (video.id && video.snippet?.publishedAt) publishedAtById.set(video.id, video.snippet.publishedAt);
    }
  }
  return publishedAtById;
}

async function fetchWithApiKey(apiKey: string, playlistId: string): Promise<YouTubePlaylistVideo[]> {
  const items: YouTubePlaylistVideo[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      maxResults: "50",
      playlistId,
      key: apiKey,
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`YouTube playlist request failed with ${response.status}`);
    const payload = await response.json() as YouTubePlaylistResponse;
    for (const item of payload.items ?? []) {
      const snippet = item.snippet;
      const youtubeId = item.contentDetails?.videoId || snippet?.resourceId?.videoId;
      const title = snippet?.title?.trim() ?? "";
      if (!youtubeId || !title || /^(private|deleted) video$/i.test(title)) continue;
      const thumbnails = snippet?.thumbnails;
      items.push({
        youtubeId,
        title,
        description: snippet?.description?.trim() || undefined,
        channelTitle: snippet?.videoOwnerChannelTitle?.trim() || undefined,
        thumbnail: thumbnails?.maxres?.url
          || thumbnails?.standard?.url
          || thumbnails?.high?.url
          || thumbnails?.medium?.url
          || thumbnail(youtubeId),
        position: snippet?.position ?? items.length,
      });
    }
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);
  const publicationDates = await fetchVideoPublicationDates(apiKey, items.map((item) => item.youtubeId));
  return items.map((item) => ({ ...item, publishedAt: publicationDates.get(item.youtubeId) }));
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

async function fetchPublicPlaylist(playlistId: string): Promise<YouTubePlaylistVideo[]> {
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
  const unique = new Map<string, YouTubePlaylistVideo>();
  renderers.forEach((renderer, index) => {
    if (!renderer.videoId || unique.has(renderer.videoId)) return;
    const title = text(renderer.title).trim();
    if (!title || /^(private|deleted) video$/i.test(title)) return;
    const displayedIndex = Number(text(renderer.index)) || index + 1;
    unique.set(renderer.videoId, {
      youtubeId: renderer.videoId,
      title,
      channelTitle: text(renderer.shortBylineText).trim() || undefined,
      thumbnail: thumbnail(renderer.videoId),
      position: displayedIndex - 1,
    });
  });
  lockups.forEach((lockup, index) => {
    const youtubeId = lockup.contentId;
    if (!youtubeId || unique.has(youtubeId) || !/VIDEO/i.test(lockup.contentType ?? "")) return;
    const metadata = lockup.metadata?.lockupMetadataViewModel;
    const title = metadata?.title?.content?.trim() ?? "";
    if (!title || /^(private|deleted) video$/i.test(title)) return;
    const channelTitle = metadata?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content;
    const sources = lockup.contentImage?.thumbnailViewModel?.image?.sources ?? [];
    const image = [...sources].sort((left, right) => (right.width ?? 0) - (left.width ?? 0))[0]?.url;
    unique.set(youtubeId, {
      youtubeId,
      title,
      channelTitle: channelTitle?.trim() || undefined,
      thumbnail: image || thumbnail(youtubeId),
      position: index,
    });
  });
  if (!unique.size) throw new Error("YouTube public playlist contained no usable videos");
  return [...unique.values()].sort((left, right) => left.position - right.position);
}

export async function fetchYouTubePlaylist(playlistId: string): Promise<YouTubePlaylistVideo[]> {
  const items = process.env.YOUTUBE_API_KEY
    ? await fetchWithApiKey(process.env.YOUTUBE_API_KEY, playlistId)
    : await fetchPublicPlaylist(playlistId);
  if (!items.length) throw new Error("YouTube playlist contained no usable videos");
  return items;
}
