"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowDown, ArrowRight, Play, RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AISearch, MiniPlayer } from "@/components/features";
import { Footer, Header } from "@/components/layout";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui";
import { SYNCHRONISATIONS as syncs } from "@/content/synchronisations";
import { useAlbums, useFeaturedPlaylists } from "@/hooks/use-api";
import { OrganicHeroBackdrop } from "./OrganicHeroBackdrop";
import { HorizontalRail } from "./HorizontalRail";
import { EditorialScrollStory } from "./EditorialScrollStory";
import { ManifestoScrollSection } from "./ManifestoScrollSection";
import { ProcessSignalSection } from "./ProcessSignalSection";

const PARIGO_LABEL_ID = "b9d701733704e2d7";

function SectionReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div initial={reduceMotion ? undefined : { opacity: 0, y: 24 }} whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .62, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

export function HomeExperience() {
  const { locale, t } = useI18n();
  const [featuredTab, setFeaturedTab] = useState<"playlists" | "releases" | "syncs" | "parigo">("playlists");
  const releaseQuery = useAlbums({ limit: 12, sort: "releaseDate" });
  const playlistQuery = useFeaturedPlaylists(12);
  const parigoQuery = useAlbums({ limit: 12, label: PARIGO_LABEL_ID, sort: "releaseDate" });
  const { data: releaseData } = releaseQuery;
  const { data: playlistData } = playlistQuery;
  const releases = releaseData?.albums || [];
  const editorialPlaylists = playlistData?.playlists || [];
  const parigoAlbums = parigoQuery.data?.albums || [];
  const uses = locale === "fr" ? ["Publicité", "Documentaire", "Fiction", "Sport", "Mode", "Émotion"] : ["Advertising", "Documentary", "Fiction", "Sport", "Fashion", "Emotion"];

  return (
    <div className="page-shell">
      <Header variant="overlay" />
      <main>
        <section className="relative flex min-h-[760px] items-center overflow-hidden bg-[var(--surface)] px-4 pb-14 pt-28 md:min-h-[94svh] md:px-8">
          <OrganicHeroBackdrop />
          <div className="pointer-events-none relative mx-auto w-full max-w-[1180px] text-center">
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }} className="eyebrow text-[var(--signal-strong)]">Parigo Music · Paris</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .72, delay: .08, ease: [0.22, 1, 0.36, 1] }} className="mx-auto mt-7 max-w-[12ch] text-[clamp(3.4rem,7.2vw,7.5rem)] font-semibold leading-[.9] tracking-[-.065em]">
              Music for image<span className="text-[var(--signal-strong)]">.</span>
            </motion.h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--text-muted)] md:text-lg">{locale === "fr" ? "Une librairie musicale indépendante au service des images, des récits et des émotions." : "An independent music library for images, stories and emotion."}</p>
            <div className="pointer-events-auto mx-auto mt-9 max-w-4xl text-left"><AISearch /></div>
            <a href="#about" className="pointer-events-auto mx-auto mt-10 inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[.1em] text-[var(--text-muted)] transition hover:text-[var(--foreground)]">{t("home.scroll")} <ArrowDown size={15} /></a>
          </div>
        </section>

        <section id="about" className="px-4 py-16 md:px-8 md:py-24">
          <SectionReveal className="mx-auto max-w-[1580px]">
            <div className="relative min-h-[610px] overflow-hidden rounded-xl md:min-h-[760px]">
              <picture className="absolute inset-0 block"><source srcSet="/images/parigo-studio.avif" type="image/avif" /><source srcSet="/images/parigo-studio.webp" type="image/webp" /><Image src="/images/parigo-studio.jpg" alt="Studio PARIGO avec une sélection de vinyles" fill priority sizes="100vw" className="object-cover" /></picture>
              <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/38 to-black/5" />
              <div className="absolute inset-0 flex max-w-3xl flex-col justify-end p-6 text-white md:p-14 lg:p-20">
                <p className="eyebrow mb-5 text-emerald-200">Parigo depuis 2013</p>
                <h2 className="text-[clamp(2.8rem,6vw,6.4rem)] leading-[.9] tracking-[-.06em]">{locale === "fr" ? "Qui sommes-nous ?" : "Who are we?"}</h2>
                <p className="mt-7 max-w-2xl text-base leading-7 text-white/82 md:text-lg">{locale === "fr" ? "De la musique d’archives aux productions les plus actuelles, de la musique classique aux répertoires internationaux, Parigo met à votre disposition une offre musicale complète, exigeante et immédiatement exploitable pour tous vos projets audiovisuels." : "From archive music to the latest productions, from classical music to international repertoires, Parigo offers a complete and exacting catalogue ready for every audiovisual project."}</p>
                <Link href="/albums" className="mt-8 inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-white/55 px-5 text-sm font-semibold transition hover:bg-white hover:text-black">{locale === "fr" ? "Découvrir le catalogue" : "Explore the catalogue"}<ArrowRight size={15} /></Link>
              </div>
            </div>
          </SectionReveal>
        </section>

        <section id="featured" className="border-y border-[var(--line)] bg-[var(--surface)] px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div><p className="eyebrow text-[var(--signal-strong)]">Featured</p><h2 className="mt-5 max-w-[12ch] text-[clamp(2.8rem,5vw,5.6rem)] font-semibold leading-[.92] tracking-[-.055em]">{locale === "fr" ? "À écouter maintenant." : "Listen now."}</h2></div>
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-[var(--line)] p-1" role="tablist" aria-label={locale === "fr" ? "Sélections mises en avant" : "Featured selections"}>
                {([
                  ["playlists", locale === "fr" ? "Playlists" : "Playlists"],
                  ["releases", locale === "fr" ? "Nouveautés" : "New releases"],
                  ["syncs", locale === "fr" ? "Synchronisations" : "Syncs"],
                  ["parigo", "Label PARIGO"],
                ] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={featuredTab === id} onClick={() => setFeaturedTab(id)} className={`min-h-10 whitespace-nowrap rounded-md px-4 text-xs font-semibold transition ${featuredTab === id ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-soft)]"}`}>{label}</button>)}
              </div>
            </SectionReveal>
            {(featuredTab === "releases" && releaseQuery.isError) || (featuredTab === "playlists" && playlistQuery.isError) || (featuredTab === "parigo" && parigoQuery.isError) ? (
              <div className="rounded-xl border border-[var(--line)] px-6 py-20 text-center"><AlertCircle className="mx-auto text-[var(--signal-strong)]" /><h3 className="mt-4 text-2xl">{locale === "fr" ? "Cette sélection est momentanément indisponible." : "This selection is temporarily unavailable."}</h3><button type="button" onClick={() => { if (featuredTab === "playlists") void playlistQuery.refetch(); else if (featuredTab === "parigo") void parigoQuery.refetch(); else void releaseQuery.refetch(); }} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--line)] px-4 text-sm font-semibold"><RotateCcw size={15} />{t("common.retry")}</button></div>
            ) : featuredTab === "syncs" ? (
              <HorizontalRail cinema label={locale === "fr" ? "Synchronisations à la une" : "Featured synchronisations"}>{syncs.map((sync, index) => <Link key={sync.slug} href={`/synchronisations/${sync.slug}`} className="home-sync-card group snap-start"><div className="home-sync-card__frame relative aspect-video overflow-hidden bg-[#0b0e0b]"><Image src={sync.image} alt={`${sync.title} — ${sync.client}`} fill sizes="(max-width:768px) 91vw, 53vw" className="object-contain transition duration-700 group-hover:scale-[1.018]" /><div className="absolute inset-0 bg-gradient-to-t from-black/82 via-transparent to-black/5" /><span className="absolute right-5 top-5 font-mono text-[.58rem] text-white/60">SYNC / {String(index + 1).padStart(2, "0")}</span><span className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/25 text-white backdrop-blur-md transition duration-500 group-hover:rotate-[8deg] group-hover:scale-110 group-hover:bg-[var(--signal)]"><Play size={17} fill="currentColor" /></span><div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-5 text-white md:p-7"><div><p className="font-mono text-[.58rem] uppercase tracking-[.13em] text-white/62">{sync.client}</p><h3 className="mt-2 text-2xl md:text-4xl">{sync.title}</h3></div><span className="hidden font-mono text-[.58rem] uppercase tracking-[.12em] text-white/55 sm:block">Voir le film ↗</span></div></div></Link>)}</HorizontalRail>
            ) : featuredTab === "playlists" ? (
              <HorizontalRail label={locale === "fr" ? "Playlists à écouter maintenant" : "Playlists to listen to now"}>{editorialPlaylists.map((playlist, index) => <Link key={playlist.id} href={`/playlists/${playlist.id}`} className="home-rail-card group block snap-start"><div className="home-rail-card__media relative aspect-square overflow-hidden rounded-[.8rem] bg-[var(--surface-soft)]"><Image src={playlist.cover} alt={playlist.title} fill sizes="(max-width:640px) 78vw, 25vw" className="object-cover transition duration-700 group-hover:scale-[1.035]" /><span className="absolute right-3 top-3 rounded-full bg-black/68 px-2.5 py-1.5 font-mono text-[.55rem] text-white backdrop-blur">P / {String(index + 1).padStart(2, "0")}</span></div><div className="flex min-h-24 items-end justify-between gap-4 px-1 pb-1 pt-5"><div className="min-w-0"><p className="font-mono text-[.54rem] uppercase tracking-[.12em] text-[var(--signal-strong)]">{locale === "fr" ? "Sélection Parigo" : "Parigo selection"}</p><h3 className="mt-2 line-clamp-2 text-lg leading-[1.05]">{playlist.title}</h3></div><p className="shrink-0 font-mono text-[.55rem] text-[var(--text-muted)]">{playlist.trackCount ?? 0} {t("catalog.tracks")}</p></div></Link>)}</HorizontalRail>
            ) : (
            <HorizontalRail label={featuredTab === "parigo" ? "Albums Parigo" : locale === "fr" ? "Dernières sorties" : "New releases"}>
              {(featuredTab === "parigo" ? parigoAlbums : releases).map((release, index) => (
                  <Link key={release.id} href={`/albums/${release.id}`} className="home-rail-card group block snap-start">
                    <div className="home-rail-card__media relative aspect-square overflow-hidden rounded-[.8rem] bg-[var(--surface-soft)]"><Image src={release.cover} alt={release.title} fill sizes="(max-width:640px) 78vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.035]" /><span className="absolute right-3 top-3 rounded-full bg-black/68 px-2.5 py-1.5 font-mono text-[.55rem] text-white backdrop-blur">A / {String(index + 1).padStart(2, "0")}</span><span className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#151815] opacity-0 shadow-md transition duration-300 group-hover:-translate-y-1 group-hover:opacity-100"><Play size={16} fill="currentColor" /></span></div>
                    <div className="flex min-h-24 items-end justify-between gap-4 px-1 pb-1 pt-5"><div className="min-w-0"><h3 className="line-clamp-2 text-lg font-semibold leading-[1.05] tracking-[-.025em]">{release.title}</h3><p className="mt-2 truncate font-mono text-[.55rem] uppercase tracking-[.12em] text-[var(--text-muted)]">{release.label}</p></div><span className="shrink-0 font-mono text-[.55rem] text-[var(--text-muted)]">{release.trackCount} {t("catalog.tracks")}</span></div>
                  </Link>
              ))}
            </HorizontalRail>
            )}
            <div className="mt-8 text-right"><Link href={featuredTab === "playlists" ? "/playlists" : featuredTab === "syncs" ? "/synchronisations" : "/albums"} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:text-[var(--signal-strong)]">{t("common.seeAll")}<ArrowRight size={16} /></Link></div>
          </div>
        </section>

        <ManifestoScrollSection locale={locale} />

        <ProcessSignalSection locale={locale} />

        <EditorialScrollStory playlists={editorialPlaylists} locale={locale} />

        <section className="bg-[var(--surface-inverse)] px-4 py-20 text-[var(--background)] md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="mb-12 grid gap-8 md:grid-cols-12"><div className="md:col-span-7"><p className="eyebrow text-[var(--signal)]">{t("home.syncEyebrow")}</p><h2 className="mt-5 text-[clamp(2.8rem,5vw,5.5rem)] leading-[.92]">{t("home.syncTitle")}</h2></div><p className="max-w-md self-end opacity-58 md:col-span-4 md:col-start-9">{t("home.syncCopy")}</p></SectionReveal>
            <HorizontalRail wide label={locale === "fr" ? "Nos synchronisations" : "Our synchronisations"}>{syncs.map((sync, index) => <Link key={sync.slug} href={`/synchronisations/${sync.slug}`} className="home-sync-card group snap-start"><div className="home-sync-card__frame relative aspect-video overflow-hidden bg-[#0b0e0b]"><Image src={sync.image} alt={`${sync.title} — ${sync.client}`} fill sizes="(max-width:768px) 86vw, 55vw" className="object-contain transition-transform duration-700 group-hover:scale-[1.018]" /><div className="absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-transparent" /><span className="absolute right-5 top-5 font-mono text-xs text-white/60">{String(index + 1).padStart(2, "0")}</span><span className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/45 bg-black/22 text-white backdrop-blur-md transition group-hover:scale-110 group-hover:bg-[var(--signal)]"><Play size={17} fill="currentColor" /></span><div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-8"><p className="font-mono text-[.6rem] uppercase tracking-[.13em] opacity-62">{sync.client}</p><h3 className="mt-2 text-2xl md:text-4xl">{sync.title}</h3></div></div></Link>)}</HorizontalRail>
            <div className="mt-3 text-right"><Link href="/synchronisations" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:text-[var(--signal)]">{t("common.seeAll")}<ArrowRight size={16} /></Link></div>
          </div>
        </section>

        <section className="px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="grid gap-8 md:grid-cols-12"><div className="md:col-span-6"><p className="eyebrow text-[var(--signal-strong)]">{t("home.usesEyebrow")}</p><h2 className="mt-5 text-[clamp(2.8rem,5vw,5.5rem)] leading-[.92]">{t("home.usesTitle")}</h2></div><p className="max-w-md self-end text-sm leading-relaxed text-[var(--text-muted)] md:col-span-4 md:col-start-9">{locale === "fr" ? "Chaque entrée lance une recherche par mot-clé dans le catalogue. Vous pourrez ensuite affiner le résultat avec les genres, humeurs, usages, instruments, labels, styles, BPM et durée." : "Each entry starts a keyword search across the catalogue. You can then refine it by genre, mood, use, instrument, label, style, BPM and duration."}</p></SectionReveal>
            <div className="mt-12 grid border-l border-t border-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">{uses.map((use, index) => <Link key={use} href={`/search?q=${encodeURIComponent(use)}`} className="group flex min-h-32 items-center justify-between border-b border-r border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:bg-[var(--signal-soft)]"><span className="text-2xl font-semibold tracking-[-.035em]">{use}</span><span className="font-mono text-[.6rem] text-[var(--text-muted)]">0{index + 1} ↗</span></Link>)}</div>
          </div>
        </section>

        <section className="border-t border-[var(--line)] bg-[var(--surface)] px-4 py-20 md:px-8 md:py-28">
          <SectionReveal className="mx-auto grid max-w-[1580px] gap-10 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8"><p className="eyebrow text-[var(--signal-strong)]">{t("home.licenseEyebrow")}</p><h2 className="mt-6 max-w-[13ch] text-[clamp(2.8rem,5.8vw,6.2rem)] leading-[.92]">{t("home.licenseTitle")}</h2></div>
            <div className="md:col-span-3 md:col-start-10"><p className="mb-7 leading-relaxed text-[var(--text-muted)]">{t("home.licenseCopy")}</p><div className="flex flex-wrap gap-3"><Link href="/contact"><Button>{t("home.licenseCta")}</Button></Link><Link href="/licensing"><Button variant="outline">{t("home.discoverLicensing")}</Button></Link></div></div>
          </SectionReveal>
        </section>
      </main>
      <Footer />
      <MiniPlayer />
    </div>
  );
}
