import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
      ? `Profil et discographie Harvest de ${profile.name}.`
      : `Profile and Harvest discography for ${profile.name}.`),
    image: profile.imageStatus === "portrait" ? profile.image : undefined,
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

  return (
    <div className="page-shell min-h-screen">
      <Header />
      <main className="pt-[70px]">
        <section className="editorial-detail-hero relative mx-auto max-w-[1500px] overflow-hidden px-4 pb-16 pt-8 sm:px-6 lg:px-8 md:pb-24">
          <Link href={localizedPath(locale, "/compositeurs")} className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">
            <ArrowLeft size={16} />
            {locale === "fr" ? "Tous les compositeurs" : "All composers"}
          </Link>
          <div className="grid gap-8 border-y border-[var(--line-strong)] py-10 md:grid-cols-[minmax(17rem,.72fr)_minmax(0,1fr)] md:gap-12 md:py-16">
            <div className="relative aspect-square overflow-hidden bg-[var(--surface-soft)]">
              <Image
                src={profile.image}
                alt={profile.imageStatus === "portrait" ? profile.name : ""}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 42vw"
                className="object-cover"
              />
            </div>
            <div className="self-end">
              <p className="font-mono text-[.62rem] uppercase tracking-[.14em] text-[var(--signal-strong)]">
                {profile.kind === "group" ? (locale === "fr" ? "Collectif Parigo" : "Parigo collective") : (locale === "fr" ? "Compositeur·rice Parigo" : "Parigo composer")}
              </p>
              <SignedTitle className="mt-5 break-words font-[var(--font-editorial)] text-6xl leading-[.9] tracking-[-.055em] md:text-8xl">{profile.name}</SignedTitle>
              <dl className="mt-10 grid gap-4 text-sm sm:grid-cols-3">
                <div><dt className="text-[var(--text-muted)]">{locale === "fr" ? "Pistes" : "Tracks"}</dt><dd className="mt-1 text-2xl font-semibold">{profile.trackCount}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Albums</dt><dd className="mt-1 text-2xl font-semibold">{profile.albumIds.length}</dd></div>
                <div><dt className="text-[var(--text-muted)]">{locale === "fr" ? "Références" : "References"}</dt><dd className="mt-2 font-mono text-xs">{profile.albumCodes.join(" · ") || "—"}</dd></div>
              </dl>
              {profile.harvestCredits.length > 0 && <p className="mt-8 max-w-3xl text-xs leading-5 text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--foreground)]">{locale === "fr" ? "Crédits Harvest associés :" : "Associated Harvest credits:"}</span>{" "}
                {profile.harvestCredits.map((credit) => credit.name).join(" · ")}
              </p>}
            </div>
          </div>
        </section>

        {bio && <section className="border-t border-[var(--line)]">
          <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-8 md:py-24">
            <SignedTitle as="h2" className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">Biographie</SignedTitle>
            <div className="max-w-4xl text-base leading-8 text-[var(--text-muted)] md:text-lg"><Bio value={bio} /></div>
          </div>
        </section>}

        <section className="border-t border-[var(--line)]">
          <div className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 md:py-24">
            <SignedTitle as="h2" className="mb-10 font-[var(--font-editorial)] text-5xl tracking-[-.05em]">Albums Parigo</SignedTitle>
            {albums.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                {albums.map((album) => <AlbumCard key={album.id} album={album} />)}
              </div>
            ) : (
              <p className="border-y border-[var(--line)] py-14 text-[var(--text-muted)]">
                {locale === "fr" ? "Aucune discographie Harvest n’est actuellement disponible pour ce profil." : "No Harvest discography is currently available for this profile."}
              </p>
            )}
            {hasUnavailableAlbums && <p role="alert" className="mt-6 border-l-2 border-[var(--danger)] pl-4 text-sm text-[var(--danger)]">
              {locale === "fr" ? "Certains albums Harvest sont momentanément indisponibles." : "Some Harvest albums are temporarily unavailable."}
            </p>}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
