"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowRight, ArrowUpRight, Facebook, Instagram, Linkedin, Play, RotateCcw, Youtube } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AISearch } from "@/components/features/AISearch";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Synchronisation } from "@/lib/youtube/synchronisation-types";
import { fetchAlbums } from "@/lib/api-client";
import { DeferredOrganicHeroBackdrop } from "./DeferredOrganicHeroBackdrop";
import { HorizontalRail } from "./HorizontalRail";
import { DeferredHomeStorySections } from "./DeferredHomeStorySections";
import type { Album, Playlist } from "@/types";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { ParigoVideoCard } from "@/components/editorial/ParigoVideoCard";
import { SynchronisationCard } from "@/components/editorial/SynchronisationCard";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { SignedTitle } from "@/components/ui/SignedTitle";
import type { EditorialVideo } from "@/lib/editorial/video-types";
import { resizeArtworkSource } from "@/lib/image-loader";
import { PartnerMarquee } from "./PartnerMarquee";

type PlatformName = "Instagram" | "YouTube" | "LinkedIn" | "Facebook" | "Bandcamp" | "TikTok" | "Spotify";

const LINKTREE_PLATFORMS: Array<{ name: PlatformName; position: string }> = [
  { name: "Instagram", position: "left-0 top-4 -rotate-12 group-hover:-translate-x-1 group-hover:-translate-y-2" },
  { name: "YouTube", position: "left-10 top-[4.5rem] rotate-[8deg] group-hover:translate-y-2" },
  { name: "LinkedIn", position: "left-[4.6rem] top-0 rotate-[7deg] group-hover:-translate-y-2" },
  { name: "Facebook", position: "left-[7.4rem] top-[4.1rem] -rotate-[7deg] group-hover:translate-y-2" },
  { name: "Spotify", position: "left-[8.7rem] top-3 rotate-[11deg] group-hover:translate-x-1 group-hover:-translate-y-1" },
  { name: "TikTok", position: "left-[11.2rem] top-[4.6rem] rotate-[9deg] group-hover:translate-x-2 group-hover:translate-y-1" },
  { name: "Bandcamp", position: "left-[12.1rem] top-0 -rotate-[5deg] group-hover:translate-x-2 group-hover:-translate-y-2" },
];

function HomeSeeAllLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="home-see-all group">
      <span>{children}</span>
      <span className="home-see-all__icon" aria-hidden="true">
        <ArrowUpRight size={13} />
      </span>
    </Link>
  );
}

function PlatformIcon({ name }: { name: PlatformName }) {
  if (name === "Instagram") return <Instagram size={20} />;
  if (name === "YouTube") return <Youtube size={21} />;
  if (name === "LinkedIn") return <Linkedin size={19} />;
  if (name === "Facebook") return <Facebook size={20} />;
  if (name === "Bandcamp") return <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d="M7.1 6.6h14.4l-4.6 10.8H2.5L7.1 6.6Z" /></svg>;
  if (name === "TikTok") return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M14.2 3h3.1c.3 2.1 1.5 3.4 3.7 3.8V10a8.4 8.4 0 0 1-3.7-1.1v6.2a5.9 5.9 0 1 1-5.9-5.9c.4 0 .8 0 1.2.1v3.2a2.8 2.8 0 1 0 1.6 2.6V3Z" /></svg>;
  return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4.5 9.2c4.8-1.3 10.5-.9 14.8 1.3" /><path d="M5.6 13c4-1 8.9-.6 12.5 1.1" /><path d="M6.7 16.6c3.3-.7 7-.4 10 .9" /></svg>;
}

function SectionReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function HomeHero() {
  const { locale } = useI18n();

  return (
    <section data-testid="home-hero" className="relative mt-[74px] flex min-h-[calc(100svh-74px)] items-center overflow-hidden bg-[var(--surface)] px-4 py-10 md:px-8 md:py-12">
      <DeferredOrganicHeroBackdrop />
      <div className="pointer-events-none relative mx-auto w-full max-w-[1180px] text-center">
        <SignedTitle className="pointer-events-auto relative z-10 mx-auto max-w-[13ch] text-[clamp(3.4rem,7.2vw,7.5rem)] font-semibold leading-[.9] tracking-[-.065em]">
          {locale === "fr" ? "Trouvez la bonne musique" : "Find the right music"}
        </SignedTitle>
        <p className="mx-auto mt-6 max-w-3xl font-[var(--font-rounded)] text-base leading-relaxed text-[var(--text-muted)] md:text-lg">
          {locale === "fr" ? <>Un catalogue édité pour les monteurs, superviseurs musicaux et producteurs.<br className="hidden sm:block" />Cherchez, écoutez, comparez et licenciez — sans bruit inutile.</> : <>A curated catalogue built for editors, music supervisors and producers.<br className="hidden sm:block" />Search, listen, compare and license — without the noise.</>}
        </p>
        <div className="pointer-events-auto mx-auto mt-9 max-w-4xl text-left"><AISearch mode="assisted" /></div>
      </div>
    </section>
  );
}

interface HomeExperienceProps {
  initialPlaylists: {
    playlists: Playlist[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  };
  initialParigoAlbums: Album[];
  initialReleases: Album[];
  initialSynchronisations: Synchronisation[];
  initialClips: EditorialVideo[];
}

export function HomeExperience({ initialPlaylists, initialParigoAlbums, initialReleases, initialSynchronisations: syncs, initialClips: clips }: HomeExperienceProps) {
  const { locale, t, localizedPath } = useI18n();
  const [featuredTab, setFeaturedTab] = useState<"playlists" | "releases" | "parigo">("releases");
  const [releases, setReleases] = useState<Awaited<ReturnType<typeof fetchAlbums>>["albums"]>(initialReleases);
  const [parigoAlbums, setParigoAlbums] = useState<Awaited<ReturnType<typeof fetchAlbums>>["albums"]>(initialParigoAlbums);
  const [tabError, setTabError] = useState<"releases" | "parigo" | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const editorialPlaylists = initialPlaylists.playlists;
  const isFeaturedTabLoading = (
    featuredTab === "releases" && releases.length === 0 && tabError !== "releases"
  ) || (
    featuredTab === "parigo" && parigoAlbums.length === 0 && tabError !== "parigo"
  );

  useEffect(() => {
    if (featuredTab !== "releases" && featuredTab !== "parigo") return;
    if (featuredTab === "releases" && releases.length > 0) return;
    if (featuredTab === "parigo" && parigoAlbums.length > 0) return;
    const controller = new AbortController();
    const tab = featuredTab;
    void fetchAlbums(
      tab === "parigo"
        ? { limit: 12, label: PARIGO_LABEL_ID, sort: "releaseDate" }
        : { limit: 12, sort: "releaseDate" },
      controller.signal,
    ).then((data) => {
      if (tab === "parigo") setParigoAlbums(data.albums);
      else setReleases(data.albums);
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setTabError(tab);
    });
    return () => controller.abort();
  }, [featuredTab, parigoAlbums.length, releases.length, retryVersion]);
  return (
    <>
        <section id="about" className="px-4 py-16 md:px-8 md:py-24">
          <SectionReveal className="mx-auto max-w-[1580px]">
            <div className="relative min-h-[610px] overflow-hidden rounded-xl md:min-h-[760px]">
              <Image src="/images/parigo-studio.jpg" alt="Studio PARIGO avec une sélection de vinyles" fill loading="lazy" quality={75} sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/38 to-black/5" />
              <div className="absolute inset-0 flex max-w-3xl flex-col justify-end p-6 text-white md:p-14 lg:p-20">
                <SignedTitle as="h2" className="text-[clamp(2.8rem,6vw,6.4rem)] leading-[.9] tracking-[-.06em] text-white">{locale === "fr" ? "Qui sommes-nous ?" : "Who are we?"}</SignedTitle>
                <p className="mt-7 max-w-2xl text-base leading-7 text-white/88 md:text-lg">{locale === "fr" ? "De la musique d’archives aux productions les plus actuelles, de la musique classique aux répertoires internationaux, Parigo met à votre disposition une offre musicale complète, exigeante et immédiatement exploitable pour tous vos projets audiovisuels." : "From archive music to the latest productions, from classical music to international repertoires, Parigo offers a complete and exacting catalogue ready for every audiovisual project."}</p>
                <Link href="/albums" className="home-about-cta mt-8 inline-flex min-h-11 w-fit items-center gap-2 rounded-md px-5 text-sm font-semibold transition">{locale === "fr" ? "Découvrir le catalogue" : "Explore the catalogue"}<ArrowRight size={15} /></Link>
              </div>
            </div>
          </SectionReveal>
        </section>

        <section id="featured" className="border-y border-[var(--line)] bg-[var(--surface)] px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div><SignedTitle as="h2" className="max-w-[12ch] text-[clamp(2.8rem,5vw,5.6rem)] font-semibold leading-[.92] tracking-[-.055em]">{locale === "fr" ? "À écouter maintenant." : "Listen now."}</SignedTitle></div>
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-[var(--line)] p-1" role="tablist" aria-label={locale === "fr" ? "Sélections mises en avant" : "Featured selections"}>
                {([
                  ["releases", locale === "fr" ? "Nouveautés" : "New releases"],
                  ["playlists", "Playlists"],
                  ["parigo", "Label Parigo"],
                ] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={featuredTab === id} onClick={() => { setTabError(null); setFeaturedTab(id); }} className={`min-h-10 whitespace-nowrap rounded-md px-4 text-xs font-semibold transition ${featuredTab === id ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-soft)]"}`}>{label}</button>)}
              </div>
            </SectionReveal>
            {isFeaturedTabLoading ? (
              <div className="flex min-h-[25rem] items-center justify-center">
                <ParigoLoader
                  size="page"
                  label={locale === "fr" ? "Chargement de la sélection" : "Loading selection"}
                />
              </div>
            ) : tabError === featuredTab ? (
              <div className="rounded-xl border border-[var(--line)] px-6 py-20 text-center"><AlertCircle className="mx-auto text-[var(--signal-strong)]" /><h3 className="mt-4 text-2xl">{locale === "fr" ? "Cette sélection est momentanément indisponible." : "This selection is temporarily unavailable."}</h3><button type="button" onClick={() => { setTabError(null); setRetryVersion((version) => version + 1); }} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--line)] px-4 text-sm font-semibold"><RotateCcw size={15} />{t("common.retry")}</button></div>
            ) : featuredTab === "playlists" ? (
              <HorizontalRail tone="surface" label={locale === "fr" ? "Playlists à écouter maintenant" : "Playlists to listen to now"}>{editorialPlaylists.map((playlist) => <Link key={playlist.id} href={`/playlists/${playlist.id}`} className="home-rail-card group block snap-start"><div className="home-rail-card__media relative aspect-square overflow-hidden rounded-[.8rem] bg-[var(--surface-soft)]"><Image src={resizeArtworkSource(playlist.cover, 320)} alt={playlist.title} fill sizes="(max-width:640px) 78vw, 25vw" className="object-cover transition duration-700 group-hover:scale-[1.035]" /></div><div className="flex min-h-24 items-end justify-between gap-4 px-1 pb-1 pt-5"><div className="min-w-0"><p className="font-mono text-[.54rem] uppercase tracking-[.12em] text-[var(--signal-strong)]">{locale === "fr" ? "Sélection Parigo" : "Parigo selection"}</p><h3 className="mt-2 line-clamp-2 text-lg leading-[1.05]">{playlist.title}</h3></div><p className="shrink-0 font-mono text-[.55rem] text-[var(--text-muted)]">{playlist.trackCount ?? 0} {t("catalog.tracks")}</p></div></Link>)}</HorizontalRail>
            ) : (
            <HorizontalRail tone="surface" label={featuredTab === "parigo" ? (locale === "fr" ? "Albums Parigo" : "Parigo albums") : locale === "fr" ? "Dernières sorties" : "New releases"}>
              {(featuredTab === "parigo" ? parigoAlbums : releases).map((release) => (
                  <Link key={release.id} href={`/albums/${release.id}`} className="home-rail-card group block snap-start">
                    <div className="home-rail-card__media relative aspect-square overflow-hidden rounded-[.8rem] bg-[var(--surface-soft)]"><Image src={release.cover} alt={release.title} fill sizes="(max-width:640px) 78vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.035]" /><span className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#151815] opacity-0 shadow-md transition duration-300 group-hover:-translate-y-1 group-hover:opacity-100"><Play size={16} fill="currentColor" /></span></div>
                    <div className="flex min-h-24 items-end justify-between gap-4 px-1 pb-1 pt-5"><div className="min-w-0"><h3 className="line-clamp-2 text-lg font-semibold leading-[1.05] tracking-[-.025em]">{release.title}</h3><p className="mt-2 truncate font-mono text-[.55rem] uppercase tracking-[.12em] text-[var(--text-muted)]">{release.label}</p></div><span className="shrink-0 font-mono text-[.55rem] text-[var(--text-muted)]">{release.trackCount} {t("catalog.tracks")}</span></div>
                  </Link>
              ))}
            </HorizontalRail>
            )}
            <div className="mt-8 text-right"><HomeSeeAllLink href={localizedPath(featuredTab === "playlists" ? "/playlists" : featuredTab === "parigo" ? "/label-parigo" : "/albums")}>{t("common.seeAll")}</HomeSeeAllLink></div>
          </div>
        </section>

        <section data-testid="home-clips-section" className="border-b border-[var(--line)] bg-[var(--background)] px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="mb-12 grid gap-6 md:grid-cols-12 md:items-end">
              <div className="md:col-span-7">
                <SignedTitle as="h2" className="text-[clamp(2.8rem,5vw,5.6rem)] font-semibold leading-[.92] tracking-[-.055em]">
                  {locale === "fr" ? "Clips, teasers et performances" : "Clips, teasers and performances"}
                </SignedTitle>
              </div>
              <p className="max-w-md text-[var(--text-muted)] md:col-span-4 md:col-start-9">
                {locale === "fr"
                  ? "Les créations audiovisuelles du label, reliées aux compositeurs et aux albums."
                  : "The label’s audiovisual work, linked to composers and albums."}
              </p>
            </SectionReveal>
            <HorizontalRail cinema tone="page" label={locale === "fr" ? "Clips Parigo" : "Parigo videos"}>
              {clips.map((clip) => (
                <ParigoVideoCard
                  key={clip.slug}
                  clip={{
                    slug: clip.slug,
                    youtubeId: clip.youtubeId,
                    title: clip.title,
                    cover: clip.cover,
                    href: localizedPath(`/clips/${clip.slug}`),
                  }}
                  href={localizedPath(`/clips/${clip.slug}`)}
                  image={clip.cover}
                  title={clip.title[locale]}
                  eyebrow={clip.channelTitle || (locale === "fr" ? "Clip Parigo" : "Parigo video")}
                  detail={clip.subtitle?.[locale]}
                  className="snap-start"
                  headingLevel="h3"
                  sizes="(max-width:768px) 91vw, 53vw"
                />
              ))}
            </HorizontalRail>
            <div className="mt-3 text-right">
              <HomeSeeAllLink href={localizedPath("/clips")}>
                {locale === "fr" ? "Voir tous les clips" : "View all videos"}
              </HomeSeeAllLink>
            </div>
          </div>
        </section>

        <DeferredHomeStorySections locale={locale} />

        <section data-testid="home-sync-section" className="bg-[var(--surface-inverse)] px-4 py-20 text-[var(--background)] md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="mb-12 grid w-full min-w-0 gap-8 md:grid-cols-12"><div className="min-w-0 md:col-span-7"><SignedTitle as="h2" className="break-words text-[clamp(2.2rem,5vw,5.5rem)] leading-[.92]">{t("home.syncTitle")}</SignedTitle></div><p className="min-w-0 max-w-md break-words self-end text-[var(--inverse-muted)] md:col-span-4 md:col-start-9">{t("home.syncCopy")}</p></SectionReveal>
            <HorizontalRail wide inverse tone="inverse" label={locale === "fr" ? "Nos synchronisations" : "Our synchronisations"}>
              {syncs.map((sync) => (
                <SynchronisationCard
                  key={sync.slug}
                  href={localizedPath(`/synchronisations/${sync.slug}`)}
                  image={sync.image}
                  title={sync.title}
                  client={sync.client}
                  className="snap-start"
                  headingLevel="h3"
                />
              ))}
            </HorizontalRail>
            <div className="mt-3 text-right"><HomeSeeAllLink href="/synchronisations">{t("common.seeAll")}</HomeSeeAllLink></div>
          </div>
        </section>

        <PartnerMarquee />

        <section data-testid="social-follow-section" className="px-4 py-20 md:px-8 md:py-28">
          <SectionReveal className="group relative mx-auto grid max-w-[1580px] overflow-hidden rounded-[1.2rem] bg-[var(--signal-strong)] p-6 text-white md:grid-cols-12 md:items-center md:p-10 lg:p-14">
            <div className="relative md:col-span-9 md:flex md:items-center md:gap-4"><div className="relative h-28 w-full max-w-[15rem] shrink-0" role="list" aria-label={locale === "fr" ? "Plateformes Parigo : Instagram, YouTube, LinkedIn, Facebook, Bandcamp, TikTok et Spotify" : "Parigo platforms: Instagram, YouTube, LinkedIn, Facebook, Bandcamp, TikTok and Spotify"}>{LINKTREE_PLATFORMS.map((platform) => <span key={platform.name} role="listitem" aria-label={platform.name} className={`absolute flex h-12 w-12 items-center justify-center rounded-[.9rem] border border-white/70 bg-[#ffffff] text-[#247b43] shadow-[0_12px_32px_rgba(19,70,37,.2)] transition-transform duration-500 ${platform.position}`}><PlatformIcon name={platform.name} /><span className="sr-only">{platform.name}</span></span>)}</div><div className="relative mt-4 text-white md:mt-0"><SignedTitle as="h2" className="text-[clamp(2rem,4vw,4.5rem)] leading-[.94] text-white">{locale === "fr" ? "Suivez le fil Parigo." : "Follow the Parigo signal."}</SignedTitle><p className="mt-4 max-w-xl text-sm leading-relaxed text-white/82">{locale === "fr" ? "Sorties, playlists, images et actualités du label — tous nos liens réunis au même endroit." : "Releases, playlists, images and label news — all our links in one place."}</p></div></div>
            <div className="relative mt-8 md:col-span-3 md:col-start-10 md:mt-0 md:text-right"><a href="https://linktr.ee/parigomusicproduction?utm_source=linktree_profile_share&ltsid=0194467e-aa2a-4573-9f3a-63c72b5b8c67" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-3 rounded-full border border-white/78 px-5 text-sm font-semibold !text-white transition hover:border-white hover:bg-white hover:!text-[#123f24] focus-visible:outline-white">{locale === "fr" ? "Ouvrir le Linktree" : "Open Linktree"}<ArrowUpRight size={17} /></a></div>
          </SectionReveal>
        </section>
    </>
  );
}
