import { videoTypeLabels, type EditorialVideo } from "@/lib/editorial/video-types";
import type { Locale } from "@/i18n/messages";
import { localizedPath } from "@/lib/locale";
import { ParigoVideoCard } from "./ParigoVideoCard";

export function ClipCard({
  clip,
  locale,
  headingLevel = "h2",
}: {
  clip: EditorialVideo;
  locale: Locale;
  headingLevel?: "h2" | "h3";
}) {
  const title = clip.title[locale];
  const href = localizedPath(locale, `/clips/${clip.slug}`);
  const mobileMeta = clip.publishedAt ? String(new Date(clip.publishedAt).getUTCFullYear()) : undefined;
  return (
    <ParigoVideoCard
      clip={{
        slug: clip.slug,
        youtubeId: clip.youtubeId,
        title: clip.title,
        cover: clip.cover,
        href,
      }}
      href={href}
      image={clip.cover}
      title={title}
      eyebrow={videoTypeLabels[clip.videoType][locale]}
      detail={clip.channelTitle || clip.subtitle?.[locale]}
      mobileMeta={mobileMeta}
      headingLevel={headingLevel}
    />
  );
}
