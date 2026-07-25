import type { EditorialReviewState, VideoType } from "./contracts";

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
  source: "portfolio-caro" | "youtube" | "harvest";
  reviewState: EditorialReviewState;
  composerRelationSource?: "portfolio-caro" | "harvest" | "manual";
  albumRelationSource?: "portfolio-caro" | "harvest" | "manual";
  channelTitle?: string;
  publishedAt?: string;
  order: number;
  published: boolean;
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
  other: { fr: "Autre", en: "Other" },
};
