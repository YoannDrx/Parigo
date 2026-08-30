import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Footer, Header } from "@/components/layout";
import { AlbumCard } from "@/components/features/AlbumCard";
import { ConsentAwareYouTubeEmbed } from "@/components/media/ConsentAwareYouTubeEmbed";
import { JsonLd } from "@/components/seo/JsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { getEditorialVideo } from "@/lib/editorial/videos";
import { emptyCanonicalComposerSummaries } from "@/lib/composers/profiles";
import { getCachedAlbumDiscovery } from "@/lib/harvest/catalog-cache";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { ContextualBackLink } from "@/components/navigation/ContextualBackLink";
import { logEvent } from "@/lib/logger";

interface ClipPageProps {
  params: Promise<{ slug: string }>;
}

async function loadClip(slug: string) {
  const clip = await getEditorialVideo(slug);
  if (!clip) notFound();
  return clip;
}

export async function generateMetadata({ params }: ClipPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const clip = await loadClip(slug);
  const title = clip.title[locale];
  return buildMetadata({
    locale,
    path: `/clips/${slug}`,
    title,
    description: locale === "fr" ? `Découvrez le clip ${title}.` : `Watch ${title}.`,
    image: clip.cover,
  });
}

export default async function ClipPage({ params }: ClipPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const clip = await loadClip(slug);
  const relatedTalents = emptyCanonicalComposerSummaries().filter((profile) => clip.composerSlugs.includes(profile.slug));
  const relatedAlbum = clip.relatedAlbumCode
    ? await getCachedAlbumDiscovery({ label: PARIGO_LABEL_ID, limit: 100, sort: "recent" })
      .then((result) => result.items.find((album) => album.code === clip.relatedAlbumCode))
      .catch(() => undefined)
    : undefined;
  if (clip.relatedAlbumCode && !relatedAlbum) {
    logEvent({
      level: "warn",
      message: "editorial_video_album_relation_unresolved",
      route: "clips-detail",
      requestId: crypto.randomUUID(),
      code: "UNRESOLVED_RELATION",
      sampleIds: [clip.youtubeId, clip.relatedAlbumCode].filter((value): value is string => Boolean(value)),
    });
  }
  const title = clip.title[locale];
  const titleSize = title.length > 105
    ? "text-[clamp(1.4rem,7cqi,2.25rem)] leading-[1] tracking-[-.035em]"
    : title.length > 68
      ? "text-[clamp(1.6rem,7.8cqi,2.7rem)] leading-[.97] tracking-[-.045em]"
      : "text-[clamp(1.9rem,8.5cqi,3.25rem)] leading-[.94] tracking-[-.05em]";
  const summary = locale === "fr" ? `Découvrez le clip ${title}.` : `Watch ${title}.`;
  const structuredData = clip.youtubeId ? {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description: summary,
    thumbnailUrl: absoluteUrl(clip.cover),
    embedUrl: `https://www.youtube-nocookie.com/embed/${clip.youtubeId}`,
    contentUrl: `https://www.youtube.com/watch?v=${clip.youtubeId}`,
  } : undefined;

  return (
    <div className="page-shell min-h-screen">
      {structuredData && <JsonLd data={structuredData} />}
      <BreadcrumbJsonLd locale={locale} items={[
        { name: "Clips", path: "/clips" },
        { name: title, path: `/clips/${slug}` },
      ]} />
      <Header />
      <main className="px-[var(--space-page-gutter)] pb-[var(--space-section-y-large)] pt-[var(--space-contextual-back-page-top)] md:pt-[var(--space-page-top)]">
        <div className="mx-auto max-w-[1440px]">
          <ContextualBackLink href={localizedPath(locale, "/clips")} className="font-semibold hover:text-[var(--signal-strong)]">
            <ArrowLeft size={16} />
            {locale === "fr" ? "Retour" : "Back"}
          </ContextualBackLink>
          <div className="editorial-detail-hero relative mt-[var(--space-contextual-back-gap)] grid items-start gap-[var(--space-grid-x)] overflow-hidden md:mt-[var(--space-block-gap)] lg:grid-cols-12">
            <div className="overflow-hidden rounded-[1.15rem] border border-white/14 bg-[#090c09] p-2 shadow-[0_28px_90px_rgba(0,0,0,.2)] md:p-3 lg:col-span-8">
              <div className="overflow-hidden rounded-[.7rem]">
                <ConsentAwareYouTubeEmbed
                  clip={{
                    slug: clip.slug,
                    youtubeId: clip.youtubeId,
                    title: clip.title,
                    cover: clip.cover,
                    href: localizedPath(locale, `/clips/${clip.slug}`),
                  }}
                />
              </div>
            </div>
            <aside data-testid="clip-detail-panel" className="flex min-w-0 flex-col self-start overflow-hidden rounded-[1.15rem] border border-[var(--line)] bg-[var(--surface)] p-6 [container-type:inline-size] lg:col-span-4 lg:p-8">
              <SignedTitle
                data-testid="clip-detail-title"
                lang={locale}
                className={`max-w-full min-w-0 break-words font-semibold hyphens-auto text-wrap-balance [overflow-wrap:anywhere] [&_.parigo-signed-title__tail]:max-w-full [&_.parigo-signed-title__tail]:whitespace-normal ${titleSize}`}
              >
                {title}
              </SignedTitle>
              <div className="grid gap-3 pt-8">
                {clip.youtubeId && (
                  <a href={`https://www.youtube.com/watch?v=${clip.youtubeId}`} target="_blank" rel="noreferrer" className="parigo-button group flex min-h-12 items-center justify-between border border-[var(--line-strong)] bg-transparent px-4 text-sm font-semibold transition hover:border-[var(--signal-strong)] hover:bg-[color-mix(in_srgb,var(--signal)_7%,var(--surface))] hover:text-[var(--signal-strong)] focus-visible:border-[var(--signal-strong)]">
                    <span>{locale === "fr" ? "Voir sur YouTube" : "Watch on YouTube"}</span>
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            </aside>
          </div>

          {(relatedTalents.length > 0 || relatedAlbum) && (
            <section data-testid="clip-relations" className="mt-[var(--detail-section-gap)]">
              <div className="grid gap-[var(--detail-section-gap)]">
                {relatedTalents.length > 0 && (
                  <div data-testid="clip-talents-section">
                    <SignedTitle as="h2" className="mb-[var(--space-heading-content)] [font-size:clamp(1.9rem,4vw,3.5rem)] leading-[.94]">
                      {locale === "fr" ? (relatedTalents.length > 1 ? "Talents" : "Talent") : (relatedTalents.length > 1 ? "Talent" : "Talent")}
                    </SignedTitle>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {relatedTalents.map((profile) => {
                        const portrait = profile.detailImage?.src ?? profile.image;
                        return (
                          <Link key={profile.slug} href={localizedPath(locale, `/talents/${profile.slug}`)} className="parigo-panel group grid min-h-24 grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 border border-[var(--line)] bg-[var(--surface)] p-3 transition hover:border-[var(--signal)]">
                            <span className="relative aspect-square overflow-hidden bg-[var(--surface-soft)]">
                              <Image src={portrait} alt="" fill sizes="80px" className="object-cover" />
                            </span>
                            <span className="min-w-0">
                              <span className="eyebrow text-[var(--signal-strong)]">{profile.kind === "group" ? (locale === "fr" ? "Collectif" : "Collective") : (locale === "fr" ? "Compositeur" : "Composer")}</span>
                              <span className="mt-2 block text-xl font-semibold leading-tight tracking-[-.035em]">{profile.name}</span>
                            </span>
                            <ArrowUpRight size={17} className="mr-2 text-[var(--text-muted)] transition group-hover:text-[var(--signal-strong)]" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
                {relatedAlbum && (
                  <div
                    data-testid="clip-album-section"
                    className="max-w-sm"
                  >
                    <SignedTitle as="h2" className="mb-[var(--space-heading-content)] [font-size:clamp(1.9rem,4vw,3.5rem)] leading-[.94]">{locale === "fr" ? "Album associé" : "Related album"}</SignedTitle>
                    <AlbumCard album={relatedAlbum} headingLevel={3} />
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
