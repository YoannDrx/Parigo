export type VideoType =
  | "official-video"
  | "teaser"
  | "making-of"
  | "live"
  | "performance"
  | "award"
  | "announcement"
  | "archive";

export type EditorialReviewState = "verified" | "needs-review" | "rejected";

export const CLIPS_PLAYLIST_ID = "PLOmwWioa-7rw";
export const CLIPS_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${CLIPS_PLAYLIST_ID}`;

export interface EditorialVideo {
  slug: string;
  title: { fr: string; en: string };
  subtitle?: { fr?: string; en?: string };
  description?: { fr?: string; en?: string };
  cover: string;
  youtubeId?: string;
  composerSlugs: string[];
  relatedAlbumCode?: string;
  videoType: VideoType;
  source: "local-editorial" | "youtube" | "harvest";
  reviewState: EditorialReviewState;
  composerRelationSource?: "local-editorial" | "harvest" | "manual";
  albumRelationSource?: "local-editorial" | "harvest" | "manual";
  channelTitle?: string;
  publishedAt?: string;
  order: number;
  published: boolean;
}

export interface ClipPlaybackDescriptor {
  slug: string;
  youtubeId?: string;
  title: { fr: string; en: string };
  cover: string;
  href: string;
}

export const videoTypeLabels: Record<VideoType, { fr: string; en: string }> = {
  "official-video": { fr: "Clip officiel", en: "Official video" },
  teaser: { fr: "Teaser", en: "Teaser" },
  "making-of": { fr: "Making-of", en: "Behind the scenes" },
  live: { fr: "Live", en: "Live" },
  performance: { fr: "Performance", en: "Performance" },
  award: { fr: "Prix & nominations", en: "Awards & nominations" },
  announcement: { fr: "Actualité", en: "News" },
  archive: { fr: "Archive", en: "Archive" },
};
