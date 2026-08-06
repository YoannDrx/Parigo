import type { Metadata } from "next";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import { AlbumCard } from "@/components/features/AlbumCard";
import { Footer, Header } from "@/components/layout";
import { SignedTitle } from "@/components/ui/SignedTitle";
import {
  emptyCanonicalComposerSummaries,
  getCanonicalComposerProfile,
  getCanonicalComposerProfileByLegacySlug,
  type CanonicalComposerSummary,
} from "@/lib/composers/profiles";
import { getCachedAlbum } from "@/lib/harvest/catalog-cache";
import { getParigoHarvestComposerInventory, resolveCanonicalComposerSlug } from "@/lib/harvest/composer-inventory";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";
import { buildMetadata } from "@/lib/seo";
import { ContextualBackLink } from "@/components/navigation/ContextualBackLink";

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
    path: `/compositeurs/${profile.slug}`,
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
  if (redirectSlug) permanentRedirect(localizedPath(locale, `/compositeurs/${redirectSlug}`));

  const albumResults = await Promise.allSettled(profile.albumIds.map((albumId) => getCachedAlbum(albumId)));
  const albums = albumResults.flatMap((result) => result.status === "fulfilled" ? [result.value.album] : []);
  const hasUnavailableAlbums = albumResults.some((result) => result.status === "rejected");
  const bio = profile.bio[locale];
  const detailImage = profile.detailImage ?? { src: profile.image, width: 720, height: 720 };

  return (
    <div className="page-shell min-h-screen">
      <Header />
      <main className="pt-[70px]">
        <section className="editorial-detail-hero relative mx-auto max-w-[1240px] px-4 pb-10 pt-8 sm:px-6 lg:px-8 md:pb-14">
          <ContextualBackLink href={localizedPath(locale, "/compositeurs")} className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] md:mb-9">
            <ArrowLeft size={16} />
            {locale === "fr" ? "Tous les compositeurs" : "All composers"}
          </ContextualBackLink>
          <article className="composer-detail-hero parigo-panel overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] sm:p-6 md:p-8 lg:p-10">
            <div className="grid items-center gap-7 md:grid-cols-[minmax(13rem,28rem)_minmax(0,1fr)] md:gap-10 lg:gap-14">
              <div className="parigo-frame w-full max-w-[28rem] overflow-hidden border border-[var(--line)] bg-[var(--surface-soft)]">
                <Image
                  data-testid="composer-detail-image"
                  src={detailImage.src}
                  alt={profile.imageStatus === "portrait" ? profile.name : ""}
                  width={detailImage.width}
                  height={detailImage.height}
                  priority
                  sizes="(max-width: 768px) 100vw, 28rem"
                  className="h-auto w-full object-contain"
                />
              </div>
              <div className="min-w-0 pb-1 md:pb-4">
                <SignedTitle className="max-w-full [overflow-wrap:anywhere] font-[var(--font-editorial)] text-[clamp(3.25rem,8vw,7rem)] leading-[.88] tracking-[-.06em]">{profile.name}</SignedTitle>
              </div>
            </div>
            {bio ? (
              <div className="mt-8 border-t border-[var(--line)] pt-8 md:mt-10 md:pt-10">
                <div data-testid="composer-biography" className="min-w-0 w-full text-base leading-8 text-[var(--text-muted)] md:text-lg">
                  <Bio value={bio} />
                </div>
              </div>
            ) : null}
          </article>
        </section>

        <section>
          <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 lg:px-8 md:py-16">
            <div className="mb-8 border-b border-[var(--line)] pb-5 md:mb-10">
              <SignedTitle as="h2" className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">{locale === "fr" ? "Albums Parigo" : "Parigo albums"}</SignedTitle>
            </div>
            {albums.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
              </div>
            ) : (
              <p className="border-y border-[var(--line)] py-14 text-[var(--text-muted)]">
                {locale === "fr" ? "Aucune discographie n’est actuellement disponible pour ce profil." : "No discography is currently available for this profile."}
              </p>
            )}
            {hasUnavailableAlbums && <p role="alert" className="mt-6 border-l-2 border-[var(--danger)] pl-4 text-sm text-[var(--danger)]">
              {locale === "fr" ? "Certains albums sont momentanément indisponibles." : "Some albums are temporarily unavailable."}
            </p>}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
