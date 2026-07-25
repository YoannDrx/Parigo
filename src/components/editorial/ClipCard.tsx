import type { ComposerProfile } from "@/lib/editorial/contracts";
import { videoTypeLabels, type EditorialVideo } from "@/lib/editorial/video-types";
import type { Locale } from "@/i18n/messages";
import { localizedPath } from "@/lib/locale";
import { ParigoVideoCard } from "./ParigoVideoCard";

export function ClipCard({
  clip,
  composers,
  locale,
  index,
}: {
  clip: EditorialVideo;
  composers: Array<Pick<ComposerProfile, "slug" | "name">>;
  locale: Locale;
  index: number;
}) {
  const title = clip.title[locale];
  return (
    <ParigoVideoCard
      href={localizedPath(locale, `/clips/${clip.slug}`)}
      image={clip.cover}
      title={title}
      eyebrow={videoTypeLabels[clip.videoType][locale]}
      detail={composers.length > 0
        ? composers.map((profile) => profile.name).join(" · ")
        : clip.channelTitle || clip.subtitle?.[locale]}
      index={index}
    />
  );
}
