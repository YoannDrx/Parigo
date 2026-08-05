import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, AudioLines, Disc3 } from "lucide-react";
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
import { composerRoleLabel } from "@/lib/composers/presentation";

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
        <section className="editorial-detail-hero relative mx-auto max-w-[1500px] px-4 pb-12 pt-8 sm:px-6 lg:px-8 md:pb-20">
          <Link href={localizedPath(locale, "/compositeurs")} className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]">
            <ArrowLeft size={16} />
            {locale === "fr" ? "Tous les compositeurs" : "All composers"}
          </Link>
          <div className="composer-detail-hero parigo-panel grid gap-7 overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] p-3 shadow-[var(--shadow-sm)] sm:p-5 md:grid-cols-[minmax(17rem,.78fr)_minmax(0,1fr)] md:gap-10 lg:p-8">
            <div className="parigo-frame relative aspect-square min-w-0 overflow-hidden border border-[var(--line)] bg-[var(--surface-soft)]">
              <Image
                src={profile.image}
                alt={profile.imageStatus === "portrait" ? profile.name : ""}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 38vw"
                className="object-cover transition-transform duration-700 hover:scale-[1.02]"
              />
            </div>
            <div className="flex min-w-0 flex-col justify-end px-2 pb-2 pt-3 md:px-0 md:pb-4 md:pt-8">
              <div className="flex w-fit items-center gap-3 text-[var(--signal-strong)]">
                <span aria-hidden="true" className="h-px w-7 bg-current" />
                <p className="font-mono text-[.58rem] font-medium uppercase tracking-[.17em]">
                  {composerRoleLabel(profile, locale)}
                </p>
                <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 border border-current" />
              </div>
              <SignedTitle className="mt-5 max-w-full [overflow-wrap:anywhere] font-[var(--font-editorial)] text-[clamp(3.5rem,9vw,7.8rem)] leading-[.86] tracking-[-.06em]">{profile.name}</SignedTitle>
              <div className="mt-9 max-w-xl border-y border-[var(--line)] py-5">
                <p className="font-mono text-[.56rem] font-medium uppercase tracking-[.16em] text-[var(--text-muted)]">
                  Tracks &amp; albums
                </p>
                <dl className="mt-4 grid grid-cols-2">
                  <div className="group/stat min-w-0 pr-4 sm:pr-8">
                    <dt className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <AudioLines aria-hidden="true" size={15} strokeWidth={1.7} className="text-[var(--signal-strong)] transition-transform duration-300 group-hover/stat:scale-x-110 motion-reduce:transition-none" />
                      Tracks
                    </dt>
                    <dd className="mt-2 flex min-w-0 items-baseline gap-2">
                      <span className="font-[var(--font-editorial)] text-[clamp(2.5rem,5vw,4.25rem)] leading-none tracking-[-.06em] transition-transform duration-300 group-hover/stat:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none">{profile.trackCount}</span>
                      <span className="truncate font-mono text-[.52rem] uppercase tracking-[.1em] text-[var(--text-muted)]">
                        {locale === "fr" ? "au catalogue" : "in catalogue"}
                      </span>
                    </dd>
                    <span aria-hidden="true" className="mt-3 block h-px w-10 bg-[var(--signal-strong)] transition-[width] duration-300 group-hover/stat:w-16 motion-reduce:transition-none" />
                  </div>
                  <div className="group/stat min-w-0 border-l border-[var(--line)] pl-4 sm:pl-8">
                    <dt className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <Disc3 aria-hidden="true" size={15} strokeWidth={1.7} className="text-[var(--signal-strong)] transition-transform duration-500 group-hover/stat:rotate-45 motion-reduce:transform-none motion-reduce:transition-none" />
                      Albums
                    </dt>
                    <dd className="mt-2 flex min-w-0 items-baseline gap-2">
                      <span className="font-[var(--font-editorial)] text-[clamp(2.5rem,5vw,4.25rem)] leading-none tracking-[-.06em] transition-transform duration-300 group-hover/stat:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none">{profile.albumIds.length}</span>
                      <span className="truncate font-mono text-[.52rem] uppercase tracking-[.1em] text-[var(--text-muted)]">
                        Parigo
                      </span>
                    </dd>
                    <span aria-hidden="true" className="mt-3 block h-px w-10 bg-[var(--signal-strong)] transition-[width] duration-300 group-hover/stat:w-16 motion-reduce:transition-none" />
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {bio && <section>
          <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 lg:px-8 md:py-16">
            <div className="parigo-panel grid gap-8 border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] md:p-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
              <SignedTitle as="h2" className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">{locale === "fr" ? "Biographie" : "Biography"}</SignedTitle>
              <div className="max-w-3xl text-base leading-8 text-[var(--text-muted)] md:text-lg"><Bio value={bio} /></div>
            </div>
          </div>
        </section>}

        <section>
          <div className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 md:py-24">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
              <SignedTitle as="h2" className="font-[var(--font-editorial)] text-5xl tracking-[-.05em]">{locale === "fr" ? "Albums Parigo" : "Parigo albums"}</SignedTitle>
              <p className="font-mono text-[.62rem] uppercase tracking-[.12em] text-[var(--text-muted)]">{albums.length} album{albums.length > 1 ? "s" : ""}</p>
            </div>
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
