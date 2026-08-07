import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { Footer, Header } from "@/components/layout";
import { ConsentAwareYouTubeEmbed } from "@/components/media/ConsentAwareYouTubeEmbed";
import { JsonLd } from "@/components/seo/JsonLd";
import { getEditorialVideo } from "@/lib/editorial/videos";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { ContextualBackLink } from "@/components/navigation/ContextualBackLink";

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
  const title = clip.title[locale];
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
      <Header />
      <main className="px-4 pb-24 pt-28 md:px-8 md:pb-36 md:pt-32">
        <div className="mx-auto max-w-[1440px]">
          <ContextualBackLink href={localizedPath(locale, "/clips")} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--signal-strong)]">
            <ArrowLeft size={16} />
            {locale === "fr" ? "Retour" : "Back"}
          </ContextualBackLink>
          <div className="editorial-detail-hero relative mt-9 grid gap-7 overflow-hidden pb-8 lg:grid-cols-12 lg:items-start">
            <div className="overflow-hidden rounded-[1.15rem] border border-white/14 bg-[#090c09] p-2 shadow-[0_28px_90px_rgba(0,0,0,.2)] md:p-3 lg:col-span-8">
              <div className="flex items-center justify-between border-b border-white/12 px-3 py-2.5 text-white/46">
                <span className="font-mono text-[.54rem] uppercase tracking-[.14em]">Parigo screening room</span>
                <span className="font-mono text-[.54rem]">16:9</span>
              </div>
              <div className="overflow-hidden rounded-b-[.7rem]">
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
            <aside data-testid="clip-detail-panel" className="flex min-h-full min-w-0 flex-col rounded-[1.15rem] border border-[var(--line)] bg-[var(--surface)] p-6 lg:col-span-4 lg:p-8">
              <SignedTitle
                data-testid="clip-detail-title"
                className="max-w-full [overflow-wrap:anywhere] text-[clamp(2.25rem,9vw,4.5rem)] font-semibold leading-[.9] tracking-[-.06em] sm:text-[clamp(2.75rem,7vw,5rem)] lg:text-[clamp(2.2rem,3.65vw,4.35rem)] [&_.parigo-signed-title__tail]:max-w-full [&_.parigo-signed-title__tail]:whitespace-normal [&_.parigo-signed-title__tail]:[overflow-wrap:anywhere]"
              >
                {title}
              </SignedTitle>
              <div className="mt-auto grid gap-3 pt-8">
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
