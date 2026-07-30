import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";
import { AlbumCard } from "@/components/features/AlbumCard";
import { ClipCard } from "@/components/editorial/ClipCard";
import { Footer, Header } from "@/components/layout";
import { JsonLd } from "@/components/seo/JsonLd";
import { getComposerProfile } from "@/lib/editorial/contracts";
import { composerRoleLabel } from "@/lib/editorial/composer-role";
import { getEditorialVideos } from "@/lib/editorial/videos";
import { getComposerAlbums } from "@/lib/harvest/composers";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { SignedTitle } from "@/components/ui/SignedTitle";

interface ComposerPageProps {
  params: Promise<{ slug: string }>;
}

function loadProfile(slug: string) {
  const profile = getComposerProfile(slug);
  if (!profile) notFound();
  return profile;
}

export async function generateMetadata({ params }: ComposerPageProps): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const profile = loadProfile(slug);
  const bio = profile.bio[locale] || profile.bio.fr || profile.bio.en;
  return buildMetadata({
    locale,
    path: `/compositeurs/${slug}`,
    title: profile.name,
    description: bio || (locale === "fr"
      ? `Découvrez les sorties Parigo de ${profile.name}.`
      : `Discover ${profile.name}’s Parigo releases.`),
    image: profile.image,
  });
}

export default async function ComposerPage({ params }: ComposerPageProps) {
  const [{ slug }, locale] = await Promise.all([params, getRequestLocale()]);
  const profile = loadProfile(slug);
  const [discography, profileClips] = await Promise.all([
    getComposerAlbums(profile),
    getEditorialVideos().then((videos) => videos.filter((video) => video.composerSlugs.includes(profile.slug))),
  ]);
  const bio = profile.bio[locale] || profile.bio.fr || profile.bio.en;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": profile.kind === "group" ? "MusicGroup" : "Person",
    name: profile.name,
    url: absoluteUrl(localizedPath(locale, `/compositeurs/${profile.slug}`)),
    image: absoluteUrl(profile.image),
    description: bio,
    sameAs: profile.links.map((link) => link.url),
  };

  return (
    <div className="page-shell min-h-screen">
      <JsonLd data={structuredData} />
      <Header />
      <main className="pt-[70px]">
        <section className="editorial-detail-hero editorial-detail-hero--composer relative mx-auto max-w-[1500px] overflow-hidden px-4 pb-16 pt-8 after:hidden sm:px-6 lg:px-8 md:pb-24">
          <Link
            href={localizedPath(locale, "/compositeurs")}
            className="mb-10 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft size={16} />
            {locale === "fr" ? "Tous les compositeurs" : "All composers"}
          </Link>
          <div className="grid gap-10 md:grid-cols-12 md:gap-14">
            <div className="relative aspect-[4/5] max-w-xl overflow-hidden border border-[var(--line)] md:col-span-5">
              <Image src={profile.image} alt={profile.name} fill priority sizes="(max-width: 768px) 100vw, 42vw" className="object-cover" />
            </div>
            <div className="self-center md:col-span-6 md:col-start-7">
              <SignedTitle className="font-[var(--font-editorial)] text-6xl leading-[.9] tracking-[-.055em] md:text-8xl">{profile.name}</SignedTitle>
              <p className="mt-5 font-mono text-[.62rem] uppercase tracking-[.13em] text-[var(--signal-strong)]">
                {composerRoleLabel(profile, locale)}
              </p>
              {bio && <div className="mt-8 space-y-4 whitespace-pre-line text-base leading-7 text-[var(--text-muted)]">{bio}</div>}
              {profile.links.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {profile.links.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-[var(--line-strong)] px-4 text-sm font-semibold hover:bg-[var(--surface-soft)]">
                      {link.label || link.platform}
                      <ArrowUpRight size={15} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--line)]">
          <div className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 md:py-24">
            <SignedTitle as="h2" className="mb-10 font-[var(--font-editorial)] text-5xl tracking-[-.05em]">
              {locale === "fr" ? "Albums Parigo" : "Parigo albums"}
            </SignedTitle>
            {discography.state === "ready" ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                {discography.albums.map((album) => <AlbumCard key={album.id} album={album} />)}
              </div>
            ) : (
              <p className="border-y border-[var(--line)] py-14 text-[var(--text-muted)]">
                {discography.state === "unavailable"
                  ? (locale === "fr" ? "Discographie momentanément indisponible." : "Discography temporarily unavailable.")
                  : (locale === "fr" ? "Aucun album Parigo vérifié pour ce profil." : "No verified Parigo album for this profile.")}
              </p>
            )}
          </div>
        </section>

        {profileClips.length > 0 && (
          <section className="border-t border-[var(--line)]">
            <div className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8 md:py-24">
              <SignedTitle as="h2" className="mb-10 font-[var(--font-editorial)] text-5xl tracking-[-.05em]">Clips</SignedTitle>
              <div className="grid gap-5 md:grid-cols-2">
                {profileClips.map((clip) => (
                  <ClipCard
                    key={clip.slug}
                    clip={clip}
                    composers={clip.composerSlugs.map(getComposerProfile).filter((item): item is NonNullable<typeof item> => Boolean(item))}
                    locale={locale}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
