import type { Metadata } from "next";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { AlbumCard } from "@/components/features/AlbumCard";
import { ClipCard } from "@/components/editorial/ClipCard";
import { Footer, Header } from "@/components/layout";
import { SignedTitle } from "@/components/ui/SignedTitle";
import {
  emptyCanonicalComposerSummaries,
  getCanonicalComposerProfile,
  getCanonicalComposerProfileByLegacySlug,
  type CanonicalComposerSummary,
} from "@/lib/composers/profiles";
import { compareAlbumsNewestFirst } from "@/lib/harvest/album-sort";
import { getCachedAlbum } from "@/lib/harvest/catalog-cache";
import { getParigoHarvestComposerInventory, resolveCanonicalComposerSlug } from "@/lib/harvest/composer-inventory";
import { getEditorialVideosForComposer } from "@/lib/editorial/videos";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { ContextualBackLink } from "@/components/navigation/ContextualBackLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";

interface ComposerPageProps {
  params: Promise<{ slug: string }>;
}

async function loadProfile(slug: string): Promise<{ profile: CanonicalComposerSummary; redirectSlug?: string }> {
  const direct = getCanonicalComposerProfile(slug);
  if (direct) {
    const profile = await getParigoHarvestComposerInventory()
      .then((inventory) => inventory.profiles.find((item) => item.slug === slug))
      .catch(() => undefined);
    return {
      profile: profile ?? emptyCanonicalComposerSummaries().find((item) => item.slug === slug)!,
    };
  }

  const localLegacy = getCanonicalComposerProfileByLegacySlug(slug);
  const redirectSlug = localLegacy?.slug ?? await resolveCanonicalComposerSlug(slug).catch(() => undefined);
  if (!redirectSlug) notFound();
  const profile = await loadProfile(redirectSlug);
  return { profile: profile.profile, redirectSlug };
}

function Bio({ value }: { value: string }) {
  return value.split(/\n{2,}/).map((paragraph, index) => (
    <p key={`${index}-${paragraph.slice(0, 20)}`} className="mt-5 first:mt-0">{paragraph.replace(/\n+/g, " ")}</p>
  ));
}

export async function generateMetadata({ params }: ComposerPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const { profile } = await loadProfile(slug);
  const bio = profile.bio[locale];
  return buildMetadata({
    locale,
    path: `/talents/${profile.slug}`,
    title: profile.name,
    description: bio?.slice(0, 190) ?? (locale === "fr"
      ? `Profil et discographie de ${profile.name}.`
      : `Profile and discography for ${profile.name}.`),
    image: profile.imageStatus === "portrait" ? profile.detailImage?.src ?? profile.image : undefined,
  });
}

export default async function ComposerPage({ params }: ComposerPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const { profile, redirectSlug } = await loadProfile(slug);
  if (redirectSlug) permanentRedirect(localizedPath(locale, `/talents/${redirectSlug}`));

  const [albumResults, clips] = await Promise.all([
    Promise.allSettled(profile.albumIds.map((albumId) => getCachedAlbum(albumId))),
    getEditorialVideosForComposer(profile.slug),
  ]);
  const albums = albumResults
    .flatMap((result) => result.status === "fulfilled" ? [result.value.album] : [])
    .sort(compareAlbumsNewestFirst);
  const unavailableAlbumCount = albumResults.filter((result) => result.status === "rejected").length;
  const bio = profile.bio[locale];
  const detailImage = profile.detailImage ?? { src: profile.image, width: 720, height: 720 };
  return (
    <div className="page-shell min-h-screen">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": profile.kind === "group" ? "MusicGroup" : "Person",
        name: profile.name,
        description: bio,
        image: profile.imageStatus === "portrait" ? absoluteUrl(detailImage.src) : undefined,
        url: absoluteUrl(localizedPath(locale, `/talents/${profile.slug}`)),
      }} />
      <BreadcrumbJsonLd locale={locale} items={[
        { name: locale === "fr" ? "Talents" : "Talents", path: "/talents" },
        { name: profile.name, path: `/talents/${profile.slug}` },
      ]} />
      <Header />
      <main className="pb-[var(--space-page-end)] pt-[var(--space-contextual-back-page-top)]">
        <section className="editorial-detail-hero relative mx-auto max-w-[1240px] px-[var(--space-page-gutter)]">
          <ContextualBackLink href={localizedPath(locale, "/talents")} className="mb-[var(--space-contextual-back-gap)] hover:text-[var(--foreground)]">
            <ArrowLeft size={16} />
            {locale === "fr" ? "Retour" : "Back"}
          </ContextualBackLink>
          <article className="composer-detail-hero parigo-panel overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-6 md:p-8 lg:p-10">
            <div className="flow-root">
              <figure className="parigo-frame relative mb-7 aspect-square w-full max-w-[28rem] overflow-hidden border border-[var(--line)] bg-[var(--surface-soft)] md:float-left md:mb-6 md:mr-10 md:w-[min(42%,28rem)] lg:mr-14">
                <Image
                  data-testid="composer-detail-image"
                  src={detailImage.src}
                  alt={profile.imageStatus === "portrait" ? profile.name : ""}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 28rem"
                  style={{
                    objectPosition: profile.cardCrop?.objectPosition,
                    transform: profile.slug === "2080" ? "scale(1.018)" : profile.cardCrop?.scale ? `scale(${profile.cardCrop.scale})` : undefined,
                    transformOrigin: profile.slug === "2080" ? "bottom left" : profile.cardCrop?.objectPosition,
                  }}
                  className={profile.slug === "2080" ? "origin-bottom-left scale-[1.018] object-cover" : profile.cardCrop?.fit === "contain" ? "object-contain" : "object-cover"}
                />
              </figure>
              <SignedTitle className="mb-6 max-w-full [overflow-wrap:anywhere] font-[var(--font-editorial)] text-[clamp(2.6rem,6vw,5.75rem)] leading-[.9] tracking-[-.055em] md:mb-7">{profile.name}</SignedTitle>
              {bio ? (
                <div data-testid="composer-biography" lang={locale} className="min-w-0 w-full hyphens-auto text-justify text-base leading-8 text-[var(--text-muted)] md:text-lg">
                  <Bio value={bio} />
                </div>
              ) : null}
            </div>
          </article>
        </section>

        {profile.albumIds.length > 0 ? <section data-testid="composer-albums-section" className="mt-[var(--detail-section-gap)]">
          <div className="mx-auto max-w-[1240px] px-[var(--space-page-gutter)]">
            <div className="mb-[var(--space-heading-content)]">
              <SignedTitle as="h2" className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">
                {locale === "fr"
                  ? albums.length === 1 ? "Album Parigo" : "Albums Parigo"
                  : albums.length === 1 ? "Parigo album" : "Parigo albums"}
              </SignedTitle>
            </div>
            {albums.length > 0 ? (
              <div className="grid grid-cols-1 gap-[var(--space-grid-x)] sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
              </div>
            ) : (
              <p className="bg-[var(--surface-soft)] px-5 py-14 text-[var(--text-muted)]">
                {locale === "fr" ? "Aucune discographie n’est actuellement disponible pour ce profil." : "No discography is currently available for this profile."}
              </p>
            )}
            {unavailableAlbumCount > 0 && <p role="alert" className="mt-6 border-l-2 border-[var(--danger)] pl-4 text-sm text-[var(--danger)]">
              {locale === "fr"
                ? unavailableAlbumCount === 1 ? "Un album est momentanément indisponible." : "Certains albums sont momentanément indisponibles."
                : unavailableAlbumCount === 1 ? "One album is temporarily unavailable." : "Some albums are temporarily unavailable."}
            </p>}
          </div>
        </section> : null}

        {clips.length > 0 ? (
          <section data-testid="composer-clips-section" className="mt-[var(--detail-section-gap)]">
            <div className="mx-auto max-w-[1240px] px-[var(--space-page-gutter)]">
              <div className="mb-[var(--space-heading-content)]">
                <SignedTitle as="h2" className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">
                  {locale === "fr"
                    ? clips.length === 1 ? "Clip" : "Clips"
                    : clips.length === 1 ? "Video" : "Videos"}
                </SignedTitle>
              </div>
              <div className="grid gap-[var(--space-grid-x)] md:grid-cols-2">
                {clips.map((clip) => (
                  <ClipCard key={clip.slug} clip={clip} locale={locale} headingLevel="h3" />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
