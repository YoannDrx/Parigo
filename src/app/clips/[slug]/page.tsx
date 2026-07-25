import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Footer, Header } from "@/components/layout";
import { ConsentAwareYouTubeEmbed } from "@/components/media/ConsentAwareYouTubeEmbed";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getComposerProfile,
} from "@/lib/editorial/contracts";
import { getEditorialVideo } from "@/lib/editorial/videos";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { getCachedAlbumDiscovery } from "@/lib/harvest/catalog-cache";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";

interface ClipPageProps {
  params: Promise<{ slug: string }>;
}

async function loadClip(slug: string) {
  const clip = await getEditorialVideo(slug);
  if (!clip) notFound();
  return clip;
}

async function getRelatedAlbum(code?: string) {
  if (!code) return undefined;
  try {
    const result = await getCachedAlbumDiscovery({
      label: PARIGO_LABEL_ID,
      query: code,
      limit: 10,
      sort: "recent",
    });
    return result.items.find((album) => album.code === code);
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: ClipPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const clip = await loadClip(slug);
  return buildMetadata({
    locale,
    path: `/clips/${slug}`,
    title: clip.title[locale],
    description: clip.description?.[locale] || clip.subtitle?.[locale] || (locale === "fr"
      ? `Découvrez le clip ${clip.title.fr}.`
      : `Watch ${clip.title.en}.`),
    image: clip.cover,
  });
}

export default async function ClipPage({ params }: ClipPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const clip = await loadClip(slug);
  const album = await getRelatedAlbum(clip.relatedAlbumCode);
  const composers = clip.composerSlugs
    .map(getComposerProfile)
    .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
  const title = clip.title[locale];
  const subtitle = clip.subtitle?.[locale];
  const description = clip.description?.[locale];
  const structuredData = clip.youtubeId ? {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description: description || subtitle || title,
    thumbnailUrl: absoluteUrl(clip.cover),
    embedUrl: `https://www.youtube-nocookie.com/embed/${clip.youtubeId}`,
    contentUrl: `https://www.youtube.com/watch?v=${clip.youtubeId}`,
  } : undefined;

  return (
    <div className="page-shell min-h-screen">
      {structuredData && <JsonLd data={structuredData} />}
      <Header />
      <main className="px-4 pb-24 pt-28 md:px-8 md:pb-36 md:pt-32">
        <div className="mx-auto max-w-[1440px]">
          <Link href={localizedPath(locale, "/clips")} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--signal-strong)]">
            <ArrowLeft size={16} />
            {locale === "fr" ? "Tous les clips" : "All clips"}
          </Link>
          <div className="mt-9 grid gap-7 lg:grid-cols-12 lg:items-start">
            <div className="overflow-hidden rounded-[1.15rem] border border-white/14 bg-[#090c09] p-2 shadow-[0_28px_90px_rgba(0,0,0,.2)] md:p-3 lg:col-span-8">
              <div className="flex items-center justify-between border-b border-white/12 px-3 py-2.5 text-white/46">
                <span className="font-mono text-[.54rem] uppercase tracking-[.14em]">Parigo screening room</span>
                <span className="font-mono text-[.54rem]">16:9</span>
              </div>
              <div className="overflow-hidden rounded-b-[.7rem]">
                <ConsentAwareYouTubeEmbed title={title} cover={clip.cover} youtubeId={clip.youtubeId} />
              </div>
            </div>
            <aside className="flex min-h-full flex-col rounded-[1.15rem] border border-[var(--line)] bg-[var(--surface)] p-6 lg:col-span-4 lg:p-8">
              <p className="eyebrow text-[var(--signal-strong)]">Parigo / {clip.videoType}</p>
              <h1 className="mt-5 text-[clamp(2.8rem,5.2vw,5.3rem)] font-semibold leading-[.88] tracking-[-.06em]">{title}<span className="text-[var(--signal)]">.</span></h1>
              {subtitle && <p className="mt-5 font-semibold">{subtitle}</p>}
              {description && <p className="mt-6 whitespace-pre-line text-base leading-7 text-[var(--text-muted)]">{description}</p>}
              {clip.source === "youtube" && clip.reviewState === "needs-review" && (
                <p className="mt-6 border-l-2 border-[var(--signal)] pl-4 text-sm leading-6 text-[var(--text-muted)]">
                  {locale === "fr"
                    ? "Vidéo issue de la playlist officielle Parigo. Les crédits éditoriaux seront ajoutés après validation."
                    : "Video from the official Parigo playlist. Editorial credits will be added once verified."}
                </p>
              )}
              {composers.length > 0 && (
                <div className="mt-8 border-t border-[var(--line)] pt-6">
                  <p className="font-mono text-[.56rem] uppercase tracking-[.13em] text-[var(--text-muted)]">
                    {locale === "fr" ? "Compositeurs" : "Composers"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {composers.map((profile) => (
                      <Link key={profile.slug} href={localizedPath(locale, `/compositeurs/${profile.slug}`)} className="border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-soft)]">
                        {profile.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-8 grid gap-3">
                {album && (
                  <Link href={localizedPath(locale, `/albums/${album.id}`)} className="flex min-h-12 items-center justify-between border border-[var(--line-strong)] px-4 text-sm font-semibold">
                    <span>{locale === "fr" ? "Voir l’album" : "View album"} · {album.code}</span>
                    <ArrowUpRight size={15} />
                  </Link>
                )}
                {clip.youtubeId && (
                  <a href={`https://www.youtube.com/watch?v=${clip.youtubeId}`} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between border border-[var(--line-strong)] px-4 text-sm font-semibold">
                    <span>YouTube</span>
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
