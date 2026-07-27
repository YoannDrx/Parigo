import type { EditorialReviewState, VideoType } from "./contracts";

export interface PlaylistVideoOverride {
  localSlug?: string;
  duplicateOf?: string;
  title?: { fr: string; en: string };
  videoType?: VideoType;
  composerSlugs?: string[];
  reviewState?: EditorialReviewState;
  composerRelationSource?: "portfolio-caro" | "harvest" | "manual";
}

// Explicitly reviewed exceptions from the official playlist. They remain local
// until the Harvest CMS can expose video entities and structured relations.
export const playlistVideoOverrides: Record<string, PlaylistVideoOverride> = {
  l3iFO626BFw: {
    localSlug: "acid-body-music-2",
    videoType: "teaser",
  },
  m3khGsiRDoU: {
    duplicateOf: "ny-parigo-2",
  },
  EPnfDdfOx94: {
    title: { fr: "Une Première Fois", en: "Une Première Fois" },
  },
};
