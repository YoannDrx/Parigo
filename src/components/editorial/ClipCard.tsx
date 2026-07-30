import type { ComposerProfile } from "@/lib/editorial/contracts";
import { videoTypeLabels, type EditorialVideo } from "@/lib/editorial/video-types";
import type { Locale } from "@/i18n/messages";
import { localizedPath } from "@/lib/locale";
import { ParigoVideoCard } from "./ParigoVideoCard";

export function ClipCard({
  clip,
  composers,
  locale,
}: {
  clip: EditorialVideo;
  composers: Array<Pick<ComposerProfile, "slug" | "name">>;
  locale: Locale;
}) {
  const title = clip.title[locale];
  const href = localizedPath(locale, `/clips/${clip.slug}`);
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
      detail={composers.length > 0
        ? composers.map((profile) => profile.name).join(" · ")
        : clip.channelTitle || clip.subtitle?.[locale]}
    />
  );
}
