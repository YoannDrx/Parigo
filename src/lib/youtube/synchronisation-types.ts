export interface Synchronisation {
  slug: string;
  title: string;
  client: string;
  image: string;
  youtubeId: string;
  descriptionFr: string;
  descriptionEn: string;
  publishedAt?: string;
  position?: number;
  year?: number;
  source: "youtube";
}

export const SYNCHRONISATIONS_PLAYLIST_URL = "https://www.youtube.com/playlist?list=PLIqrBBZKnwyVwPEP4ghAVEGs8UiPlfgXQ";

export function youtubeEmbedUrl(youtubeId: string) {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`;
}
