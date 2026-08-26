"use client";

import Image from "next/image";
import { AlertCircle, ArrowUpRight, Facebook, Instagram, Linkedin, RotateCcw, Youtube } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AISearch } from "@/components/features/AISearch";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Synchronisation } from "@/lib/youtube/synchronisation-types";
import { fetchAlbum, fetchAlbums, fetchPlaylist } from "@/lib/api-client";
import { HeroGradientBackdrop } from "./HeroGradientBackdrop";
import { HorizontalRail } from "./HorizontalRail";
import { DeferredHomeStorySections } from "./DeferredHomeStorySections";
import type { Album, Playlist, SearchMode, Track } from "@/types";
import { PARIGO_LABEL_ID } from "@/config/catalog";
import { ParigoVideoCard } from "@/components/editorial/ParigoVideoCard";
import { SynchronisationCard } from "@/components/editorial/SynchronisationCard";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { SignedTitle } from "@/components/ui/SignedTitle";
import type { EditorialVideo } from "@/lib/editorial/video-types";
import { resizeArtworkSource } from "@/lib/image-loader";
import { HomeAudioCard } from "./HomeAudioCard";
import { usePlayerStore } from "@/stores/player-store";
import { HomeHeroContent, HomeReveal } from "./HomeMotion";
import { HomeSeeAllLink } from "./HomeSeeAllLink";
import { localizePlaylist } from "@/lib/catalog-localization";
import { HomeSectionCta } from "./HomeSectionCta";

const PartnerMarquee = lazy(() => import("./PartnerMarquee").then((module) => ({ default: module.PartnerMarquee })));

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

function PlatformIcon({ name }: { name: PlatformName }) {
  if (name === "Instagram") return <Instagram size={20} />;
  if (name === "YouTube") return <Youtube size={21} />;
  if (name === "LinkedIn") return <Linkedin size={19} />;
  if (name === "Facebook") return <Facebook size={20} />;
  if (name === "Bandcamp") return <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d="M7.1 6.6h14.4l-4.6 10.8H2.5L7.1 6.6Z" /></svg>;
  if (name === "TikTok") return <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M14.2 3h3.1c.3 2.1 1.5 3.4 3.7 3.8V10a8.4 8.4 0 0 1-3.7-1.1v6.2a5.9 5.9 0 1 1-5.9-5.9c.4 0 .8 0 1.2.1v3.2a2.8 2.8 0 1 0 1.6 2.6V3Z" /></svg>;
  return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4.5 9.2c4.8-1.3 10.5-.9 14.8 1.3" /><path d="M5.6 13c4-1 8.9-.6 12.5 1.1" /><path d="M6.7 16.6c3.3-.7 7-.4 10 .9" /></svg>;
}

function SectionReveal({ children, className = "", origin = "bottom" }: { children: ReactNode; className?: string; origin?: "bottom" | "left" | "right" | "top" }) {
  return <HomeReveal className={className} origin={origin}>{children}</HomeReveal>;
}

export function HomeHero() {
  const { locale } = useI18n();
  const [searchMode, setSearchMode] = useState<SearchMode>("keyword");
  const publicSearchMode = searchMode === "keyword" ? "catalog" : "ai";
  const heroRef = useRef<HTMLElement>(null);
  const title = locale === "fr" ? "Trouvez la bonne musique" : "Find the right music";

  return (
    <section ref={heroRef} data-testid="home-hero" data-search-mode={publicSearchMode} className="home-hero relative mt-[74px] flex min-h-[calc(100svh-74px)] items-center overflow-x-clip bg-[var(--surface)] px-4 py-10 md:px-8 md:py-12">
      <HeroGradientBackdrop mode={searchMode} />
      <HomeHeroContent
        target={heroRef}
        title={title}
        descriptionLines={locale === "fr"
          ? ["Des compositions originales pensées pour raconter vos images.", "Explorez, écoutez, comparez et licenciez en quelques clics."]
          : ["Original compositions created to tell the story of your images.", "Explore, listen, compare and license in just a few clicks."]}
        search={<AISearch onModeChange={setSearchMode} />}
      />
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
  initialComposers: Array<{ slug: string; name: string; image: string }>;
}

export function HomeExperience({ initialPlaylists, initialParigoAlbums, initialReleases, initialSynchronisations: syncs, initialClips: clips, initialComposers }: HomeExperienceProps) {
  const { locale, t, localizedPath } = useI18n();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const pause = usePlayerStore((state) => state.pause);
  const play = usePlayerStore((state) => state.play);
  const resume = usePlayerStore((state) => state.resume);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const [featuredTab, setFeaturedTab] = useState<"playlists" | "releases" | "parigo">("releases");
  const [releases, setReleases] = useState<Awaited<ReturnType<typeof fetchAlbums>>["albums"]>(initialReleases);
  const [parigoAlbums, setParigoAlbums] = useState<Awaited<ReturnType<typeof fetchAlbums>>["albums"]>(initialParigoAlbums);
  const [tabError, setTabError] = useState<"releases" | "parigo" | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [activeAudioSelection, setActiveAudioSelection] = useState<string | null>(null);
  const [loadingAudioSelection, setLoadingAudioSelection] = useState<string | null>(null);
  const [audioPlaybackError, setAudioPlaybackError] = useState<string | null>(null);
  const audioTracks = useRef(new Map<string, Track[]>());
  const releasesRef = useRef(releases);
  const parigoAlbumsRef = useRef(parigoAlbums);
  const editorialPlaylists = useMemo(
    () => initialPlaylists.playlists.map((playlist) => localizePlaylist(playlist, locale)),
    [initialPlaylists.playlists, locale],
  );
  const isFeaturedTabLoading = (
    featuredTab === "releases" && releases.length === 0 && tabError !== "releases"
  ) || (
    featuredTab === "parigo" && parigoAlbums.length === 0 && tabError !== "parigo"
  );

  useEffect(() => {
    if (featuredTab !== "releases" && featuredTab !== "parigo") return;
    const controller = new AbortController();
    const tab = featuredTab;
    void fetchAlbums(
      tab === "parigo"
        ? { limit: 12, label: PARIGO_LABEL_ID, sort: "releaseDate" }
        : { limit: 12, sort: "releaseDate" },
      controller.signal,
    ).then((data) => {
      if (tab === "parigo") {
        parigoAlbumsRef.current = data.albums;
        setParigoAlbums(data.albums);
      } else {
        releasesRef.current = data.albums;
        setReleases(data.albums);
      }
      setTabError((current) => current === tab ? null : current);
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const hasFallback = tab === "parigo" ? parigoAlbumsRef.current.length > 0 : releasesRef.current.length > 0;
      if (!hasFallback) setTabError(tab);
    });
    return () => controller.abort();
  }, [featuredTab, retryVersion]);

  const playAudioSelection = async (selectionKey: string, loadTracks: () => Promise<Track[]>) => {
    if (loadingAudioSelection) return;
    if (activeAudioSelection === selectionKey && currentTrack) {
      if (isPlaying) pause();
      else resume();
      return;
    }

    setAudioPlaybackError(null);
    setLoadingAudioSelection(selectionKey);
    try {
      const tracks = audioTracks.current.get(selectionKey) ?? await loadTracks();
      audioTracks.current.set(selectionKey, tracks);
      if (tracks.length === 0) throw new Error("Empty audio selection");
      setQueue(tracks, 0);
      play(tracks[0]);
      setActiveAudioSelection(selectionKey);
    } catch {
      setAudioPlaybackError(locale === "fr"
        ? "Impossible de lancer cette sélection pour le moment."
        : "This selection cannot be played right now.");
    } finally {
      setLoadingAudioSelection(null);
    }
  };

  return (
    <>
        <section id="about" className="px-[var(--space-page-gutter)] py-[var(--space-section-y)]">
          <SectionReveal className="mx-auto max-w-[1580px]">
            <div className="relative min-h-[610px] overflow-hidden rounded-xl md:min-h-[760px]">
              <Image
                data-testid="home-about-image"
                src="/images/editorial/parigo-spaces/01-home-studio-parigo-covers.avif"
                alt="Studio PARIGO avec ses pochettes et sa collection de vinyles"
                fill
                loading="lazy"
                quality={75}
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/38 to-black/5" />
              <div className="absolute inset-0 flex max-w-3xl flex-col justify-end p-6 text-white md:p-14 lg:p-20">
                <HomeReveal origin="left" viewportAmount={0.35}><SignedTitle as="h2" className="text-[clamp(2.8rem,6vw,6.4rem)] leading-[.9] tracking-[-.06em] text-white">{locale === "fr" ? "Qui sommes nous ?" : "Who are we?"}</SignedTitle></HomeReveal>
                <HomeReveal origin="bottom" delay={0.12} viewportAmount={0.35}><p className="mt-7 max-w-2xl text-base leading-7 text-white/88 md:text-lg">{locale === "fr" ? "Parigo accompagne les professionnels de l'image et du son dans la recherche de musiques et la gestion des droits. Télévision, cinéma, documentaires, publicité, podcasts, radio ou contenus digitaux : notre catalogue international et notre expertise de la synchronisation vous aident à trouver la musique idéale pour votre projet." : "Parigo helps image and sound professionals search for music and manage rights. Television, cinema, documentaries, advertising, podcasts, radio and digital content: our international catalogue and synchronisation expertise help you find the ideal music for your project."}</p></HomeReveal>
                <HomeReveal origin="right" delay={0.2} viewportAmount={0.35} className="w-fit"><HomeSectionCta href="/albums" inverse className="mt-8">{locale === "fr" ? "Découvrir le catalogue" : "Explore the catalogue"}</HomeSectionCta></HomeReveal>
              </div>
            </div>
          </SectionReveal>
        </section>

        <section id="featured" className="overflow-x-clip border-y border-[var(--line)] bg-[var(--surface)] px-[var(--space-page-gutter)] py-[var(--space-section-y-large)]">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal origin="left" className="mb-[var(--space-heading-content)] flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div><SignedTitle as="h2" variant="section" className="max-w-[12ch] font-semibold">{locale === "fr" ? "À écouter maintenant." : "Listen now."}</SignedTitle></div>
              <div className="grid w-full max-w-xl grid-cols-3 gap-1 rounded-lg border border-[var(--line)] p-1 md:w-[34rem]" role="tablist" aria-label={locale === "fr" ? "Sélections mises en avant" : "Featured selections"}>
                {([
                  ["releases", locale === "fr" ? "Nouveautés" : "New releases"],
                  ["playlists", "Playlists"],
                  ["parigo", locale === "fr" ? "Notre label" : "Our label"],
                ] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={featuredTab === id} onClick={() => { setTabError(null); setAudioPlaybackError(null); setFeaturedTab(id); }} className={`min-h-11 min-w-0 rounded-md px-1.5 text-[.7rem] font-semibold transition sm:px-3 sm:text-xs ${featuredTab === id ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-soft)]"}`}>{label}</button>)}
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
              <HomeReveal origin="bottom" delay={0.08}>
              <HorizontalRail key={featuredTab} tone="surface" label={locale === "fr" ? "Playlists à écouter maintenant" : "Playlists to listen to now"}>
                {editorialPlaylists.map((playlist) => {
                  const selectionKey = `playlist:${playlist.id}`;
                  return (
                    <HomeAudioCard
                      key={playlist.id}
                      href={localizedPath(`/playlists/${playlist.slug || playlist.id}`)}
                      image={resizeArtworkSource(playlist.cover, 320)}
                      title={playlist.title}
                      eyebrow={locale === "fr" ? "Sélection Parigo" : "Parigo selection"}
                      meta={`${playlist.trackCount ?? 0} ${t("catalog.tracks")}`}
                      active={activeAudioSelection === selectionKey && Boolean(currentTrack)}
                      playing={activeAudioSelection === selectionKey && Boolean(currentTrack) && isPlaying}
                      loading={loadingAudioSelection === selectionKey}
                      onPlay={() => void playAudioSelection(selectionKey, async () => (await fetchPlaylist(playlist.slug || playlist.id)).tracks)}
                    />
                  );
                })}
              </HorizontalRail>
              </HomeReveal>
            ) : (
            <HomeReveal origin="bottom" delay={0.08}>
            <HorizontalRail key={featuredTab} tone="surface" label={featuredTab === "parigo" ? (locale === "fr" ? "Albums Parigo" : "Parigo albums") : locale === "fr" ? "Dernières sorties" : "New releases"}>
              {(featuredTab === "parigo" ? parigoAlbums : releases).map((release) => {
                const selectionKey = `album:${release.id}`;
                return (
                  <HomeAudioCard
                    key={release.id}
                    href={localizedPath(`/albums/${release.slug || release.id}`)}
                    image={release.cover}
                    title={release.title}
                    eyebrow={release.label}
                    meta={`${release.trackCount} ${t("catalog.tracks")}`}
                    active={activeAudioSelection === selectionKey && Boolean(currentTrack)}
                    playing={activeAudioSelection === selectionKey && Boolean(currentTrack) && isPlaying}
                    loading={loadingAudioSelection === selectionKey}
                    onPlay={() => void playAudioSelection(selectionKey, async () => (await fetchAlbum(release.slug || release.id)).album.tracks)}
                  />
                );
              })}
            </HorizontalRail>
            </HomeReveal>
            )}
            {audioPlaybackError && <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{audioPlaybackError}</p>}
            <div className="mt-8 text-right"><HomeSeeAllLink href={localizedPath(featuredTab === "playlists" ? "/playlists" : featuredTab === "parigo" ? "/notre-label" : "/albums")}>{t("common.seeAll")}</HomeSeeAllLink></div>
          </div>
        </section>

        <section data-testid="home-clips-section" className="overflow-x-clip border-b border-[var(--line)] bg-[var(--background)] px-[var(--space-page-gutter)] py-[var(--space-section-y-large)]">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal origin="right" className="mb-[var(--space-heading-content)]">
              <div>
                <SignedTitle as="h2" className="text-[clamp(2.8rem,5vw,5.6rem)] font-semibold leading-[.92] tracking-[-.055em]">
                  {locale === "fr" ? "Clips, teasers et performances" : "Clips, teasers and performances"}
                </SignedTitle>
              </div>
            </SectionReveal>
            <HomeReveal origin="bottom" delay={0.08}>
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
            </HomeReveal>
            <div className="mt-3 text-right">
              <HomeSeeAllLink href={localizedPath("/clips")}>
                {locale === "fr" ? "Voir tous les clips" : "View all videos"}
              </HomeSeeAllLink>
            </div>
          </div>
        </section>

        <DeferredHomeStorySections locale={locale} profiles={initialComposers}>
          <section data-testid="home-sync-section" className="overflow-x-clip bg-[var(--surface-inverse)] px-[var(--space-page-gutter)] py-[var(--space-section-y-large)] text-[var(--background)]">
            <div className="mx-auto max-w-[1580px]">
              <SectionReveal origin="left" className="mb-[var(--space-heading-content)] w-full min-w-0"><SignedTitle as="h2" variant="section" className="max-w-[12ch] break-words">{t("home.syncTitle")}</SignedTitle></SectionReveal>
              <HomeReveal origin="bottom" delay={0.08}>
              <HorizontalRail wide inverse tone="inverse" label={locale === "fr" ? "Nos synchros" : "Our syncs"}>
                {syncs.map((sync) => (
                  <SynchronisationCard
                    key={sync.slug}
                    slug={sync.slug}
                    youtubeId={sync.youtubeId}
                    href={localizedPath(`/synchronisations/${sync.slug}`)}
                    image={sync.image}
                    title={sync.title}
                    client={sync.client}
                    detail={sync.year ? String(sync.year) : undefined}
                    className="snap-start"
                    headingLevel="h3"
                  />
                ))}
              </HorizontalRail>
              </HomeReveal>
              <div className="mt-3 text-right"><HomeSeeAllLink href="/synchronisations">{t("common.seeAll")}</HomeSeeAllLink></div>
            </div>
          </section>
        </DeferredHomeStorySections>

        <Suspense fallback={<div className="min-h-72 bg-[#0b110d]" aria-hidden="true" />}>
          <PartnerMarquee />
        </Suspense>

        <section data-testid="social-follow-section" className="px-[var(--space-page-gutter)] py-[var(--space-section-y-large)]">
          <SectionReveal origin="bottom" className="group relative mx-auto grid max-w-[1580px] overflow-hidden rounded-[1.2rem] bg-[var(--signal-strong)] p-6 text-[#123f24] md:grid-cols-12 md:items-center md:p-10 lg:p-14">
            <div className="relative md:col-span-9 md:flex md:items-center md:gap-4"><div className="relative h-28 w-full max-w-[15rem] shrink-0" role="list" aria-label={locale === "fr" ? "Plateformes Parigo : Instagram, YouTube, LinkedIn, Facebook, Bandcamp, TikTok et Spotify" : "Parigo platforms: Instagram, YouTube, LinkedIn, Facebook, Bandcamp, TikTok and Spotify"}>{LINKTREE_PLATFORMS.map((platform, index) => <span key={platform.name} role="listitem" aria-label={platform.name} style={{ "--platform-delay": `${index * -0.42}s` } as React.CSSProperties} className={`social-platform-icon absolute flex h-12 w-12 items-center justify-center rounded-[.9rem] border border-white/70 bg-[#ffffff] text-[#247b43] shadow-[0_12px_32px_rgba(19,70,37,.2)] transition-transform duration-500 ${platform.position}`}><PlatformIcon name={platform.name} /><span className="sr-only">{platform.name}</span></span>)}</div><div className="relative mt-4 md:mt-0"><SignedTitle as="h2" variant="section" className="text-[#123f24]">{locale === "fr" ? "Suivez le fil Parigo." : "Follow the Parigo signal."}</SignedTitle><p className="mt-4 max-w-xl text-sm leading-relaxed text-[#174f2d]">{locale === "fr" ? "Sorties, playlists, images et actualités du label — tous nos liens réunis au même endroit." : "Releases, playlists, images and label news — all our links in one place."}</p></div></div>
            <div className="relative mt-8 md:col-span-3 md:col-start-10 md:mt-0 md:text-right"><a href="https://linktr.ee/parigomusicproduction?utm_source=linktree_profile_share&ltsid=0194467e-aa2a-4573-9f3a-63c72b5b8c67" target="_blank" rel="noreferrer" className="social-follow-cta inline-flex min-h-12 items-center gap-3 rounded-full border border-[#123f24]/70 px-5 text-sm font-semibold !text-[#123f24] transition hover:border-[#123f24] hover:bg-[#123f24] hover:!text-white focus-visible:outline-[#123f24]">{locale === "fr" ? "Ouvrir le Linktree" : "Open Linktree"}<ArrowUpRight size={17} /></a></div>
          </SectionReveal>
        </section>
    </>
  );
}
