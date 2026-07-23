"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowRight, ArrowUpRight, Facebook, Instagram, Linkedin, Play, RotateCcw, Youtube } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AISearch } from "@/components/features";
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

const SENSATION_LAYOUTS = [
  "lg:col-span-5 lg:min-h-[23rem]",
  "lg:col-span-4 lg:min-h-[23rem]",
  "lg:col-span-3 lg:min-h-[23rem]",
  "lg:col-span-4 lg:min-h-[18rem]",
  "lg:col-span-3 lg:min-h-[18rem]",
  "lg:col-span-5 lg:min-h-[18rem]",
] as const;

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
  const sensations = locale === "fr" ? [
    { label: "Publicité", query: "publicité", note: "Impact immédiat" },
    { label: "Documentaire", query: "documentaire", note: "Récit & profondeur" },
    { label: "Fiction", query: "fiction", note: "Tension narrative" },
    { label: "Sport", query: "sport énergique", note: "Rythme & mouvement" },
    { label: "Mode", query: "mode élégante", note: "Allure contemporaine" },
    { label: "Émotion", query: "émotion intime", note: "Sensible & humain" },
  ] : [
    { label: "Advertising", query: "advertising", note: "Immediate impact" },
    { label: "Documentary", query: "documentary", note: "Story & depth" },
    { label: "Fiction", query: "fiction", note: "Narrative tension" },
    { label: "Sport", query: "energetic sport", note: "Rhythm & movement" },
    { label: "Fashion", query: "elegant fashion", note: "Contemporary edge" },
    { label: "Emotion", query: "intimate emotion", note: "Sensitive & human" },
  ];

  return (
    <div className="page-shell home-shell">
      <Header variant="overlay" />
      <main>
        <section data-testid="home-hero" className="relative mt-[74px] flex min-h-[calc(100svh-74px)] items-center overflow-hidden bg-[var(--surface)] px-4 py-10 md:px-8 md:py-12">
          <OrganicHeroBackdrop />
          <div className="pointer-events-none relative mx-auto w-full max-w-[1180px] text-center">
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }} className="eyebrow text-[var(--signal-strong)]">Parigo Music · Paris</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .72, delay: .08, ease: [0.22, 1, 0.36, 1] }} className="mx-auto mt-7 max-w-[13ch] text-[clamp(3.4rem,7.2vw,7.5rem)] font-semibold leading-[.9] tracking-[-.065em]">
              {locale === "fr" ? "Trouvez la bonne musique" : "Find the right music"}<span className="text-[var(--signal-strong)]">.</span>
            </motion.h1>
            <p className="mx-auto mt-6 max-w-3xl font-[var(--font-rounded)] text-base leading-relaxed text-[var(--text-muted)] md:text-lg">
              {locale === "fr" ? <>Un catalogue édité pour les monteurs, superviseurs musicaux et producteurs.<br className="hidden sm:block" />Cherchez, écoutez, comparez et licenciez — sans bruit inutile.</> : <>A curated catalogue built for editors, music supervisors and producers.<br className="hidden sm:block" />Search, listen, compare and license — without the noise.</>}
            </p>
            <div className="pointer-events-auto mx-auto mt-9 max-w-4xl text-left"><AISearch mode="assisted" /></div>
            <Link href="/search" className="pointer-events-auto mx-auto mt-11 inline-flex min-h-9 items-center gap-2 font-mono text-[.56rem] uppercase tracking-[.16em] text-[var(--text-muted)]/65 transition hover:text-[var(--foreground)]">{t("home.scroll")} <ArrowRight size={12} /></Link>
          </div>
        </section>

        <section id="about" className="px-4 py-16 md:px-8 md:py-24">
          <SectionReveal className="mx-auto max-w-[1580px]">
            <div className="relative min-h-[610px] overflow-hidden rounded-xl md:min-h-[760px]">
              <picture className="absolute inset-0 block"><source srcSet="/images/parigo-studio.avif" type="image/avif" /><source srcSet="/images/parigo-studio.webp" type="image/webp" /><Image src="/images/parigo-studio.jpg" alt="Studio PARIGO avec une sélection de vinyles" fill priority sizes="100vw" className="object-cover" /></picture>
              <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/38 to-black/5" />
              <div className="absolute inset-0 flex max-w-3xl flex-col justify-end p-6 text-white md:p-14 lg:p-20">
                <p className="eyebrow mb-5 text-emerald-200">{locale === "fr" ? "Parigo depuis 2013" : "Parigo since 2013"}</p>
                <h2 className="text-[clamp(2.8rem,6vw,6.4rem)] leading-[.9] tracking-[-.06em] text-white">{locale === "fr" ? "Qui sommes-nous ?" : "Who are we?"}</h2>
                <p className="mt-7 max-w-2xl text-base leading-7 text-white/88 md:text-lg">{locale === "fr" ? "De la musique d’archives aux productions les plus actuelles, de la musique classique aux répertoires internationaux, Parigo met à votre disposition une offre musicale complète, exigeante et immédiatement exploitable pour tous vos projets audiovisuels." : "From archive music to the latest productions, from classical music to international repertoires, Parigo offers a complete and exacting catalogue ready for every audiovisual project."}</p>
                <Link href="/albums" className="home-about-cta mt-8 inline-flex min-h-11 w-fit items-center gap-2 rounded-md px-5 text-sm font-semibold transition">{locale === "fr" ? "Découvrir le catalogue" : "Explore the catalogue"}<ArrowRight size={15} /></Link>
              </div>
            </div>
          </SectionReveal>
        </section>

        <section id="featured" className="border-y border-[var(--line)] bg-[var(--surface)] px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "À la une" : "Featured"}</p><h2 className="mt-5 max-w-[12ch] text-[clamp(2.8rem,5vw,5.6rem)] font-semibold leading-[.92] tracking-[-.055em]">{locale === "fr" ? "À écouter maintenant." : "Listen now."}</h2></div>
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
              <HorizontalRail cinema label={locale === "fr" ? "Synchronisations à la une" : "Featured synchronisations"}>{syncs.map((sync, index) => <Link key={sync.slug} href={`/synchronisations/${sync.slug}`} className="home-sync-card group snap-start"><div className="home-sync-card__frame relative aspect-video overflow-hidden bg-[#0b0e0b]"><Image src={sync.image} alt={`${sync.title} — ${sync.client}`} fill sizes="(max-width:768px) 91vw, 53vw" className="object-contain transition duration-700 group-hover:scale-[1.018]" /><div className="absolute inset-0 bg-gradient-to-t from-black/82 via-transparent to-black/5" /><span className="absolute right-5 top-5 font-mono text-[.58rem] text-white/60">SYNC / {String(index + 1).padStart(2, "0")}</span><span className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/25 text-white backdrop-blur-md transition duration-500 group-hover:rotate-[8deg] group-hover:scale-110 group-hover:bg-[var(--signal)]"><Play size={17} fill="currentColor" /></span><div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-5 text-white md:p-7"><div><p className="font-mono text-[.58rem] uppercase tracking-[.13em] text-white/62">{sync.client}</p><h3 className="mt-2 text-2xl md:text-4xl">{sync.title}</h3></div><span className="hidden font-mono text-[.58rem] uppercase tracking-[.12em] text-white/55 sm:block">{locale === "fr" ? "Voir le film" : "Watch the film"} ↗</span></div></div></Link>)}</HorizontalRail>
            ) : featuredTab === "playlists" ? (
              <HorizontalRail label={locale === "fr" ? "Playlists à écouter maintenant" : "Playlists to listen to now"}>{editorialPlaylists.map((playlist, index) => <Link key={playlist.id} href={`/playlists/${playlist.id}`} className="home-rail-card group block snap-start"><div className="home-rail-card__media relative aspect-square overflow-hidden rounded-[.8rem] bg-[var(--surface-soft)]"><Image src={playlist.cover} alt={playlist.title} fill sizes="(max-width:640px) 78vw, 25vw" className="object-cover transition duration-700 group-hover:scale-[1.035]" /><span className="absolute right-3 top-3 rounded-full bg-black/68 px-2.5 py-1.5 font-mono text-[.55rem] text-white backdrop-blur">P / {String(index + 1).padStart(2, "0")}</span></div><div className="flex min-h-24 items-end justify-between gap-4 px-1 pb-1 pt-5"><div className="min-w-0"><p className="font-mono text-[.54rem] uppercase tracking-[.12em] text-[var(--signal-strong)]">{locale === "fr" ? "Sélection Parigo" : "Parigo selection"}</p><h3 className="mt-2 line-clamp-2 text-lg leading-[1.05]">{playlist.title}</h3></div><p className="shrink-0 font-mono text-[.55rem] text-[var(--text-muted)]">{playlist.trackCount ?? 0} {t("catalog.tracks")}</p></div></Link>)}</HorizontalRail>
            ) : (
            <HorizontalRail label={featuredTab === "parigo" ? (locale === "fr" ? "Albums Parigo" : "Parigo albums") : locale === "fr" ? "Dernières sorties" : "New releases"}>
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
            <HorizontalRail wide inverse label={locale === "fr" ? "Nos synchronisations" : "Our synchronisations"}>{syncs.map((sync, index) => <Link key={sync.slug} href={`/synchronisations/${sync.slug}`} className="home-sync-card group snap-start"><div className="home-sync-card__frame relative aspect-video overflow-hidden bg-[#0b0e0b]"><Image src={sync.image} alt={`${sync.title} — ${sync.client}`} fill sizes="(max-width:768px) 86vw, 55vw" className="object-contain transition-transform duration-700 group-hover:scale-[1.018]" /><div className="absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-transparent" /><span className="absolute right-5 top-5 font-mono text-xs text-white/60">{String(index + 1).padStart(2, "0")}</span><span className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/45 bg-black/22 text-white backdrop-blur-md transition group-hover:scale-110 group-hover:bg-[var(--signal)]"><Play size={17} fill="currentColor" /></span><div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-8"><p className="font-mono text-[.6rem] uppercase tracking-[.13em] opacity-62">{sync.client}</p><h3 className="mt-2 text-2xl md:text-4xl">{sync.title}</h3></div></div></Link>)}</HorizontalRail>
            <div className="mt-3 text-right"><Link href="/synchronisations" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:text-[var(--signal)]">{t("common.seeAll")}<ArrowRight size={16} /></Link></div>
          </div>
        </section>

        <section className="px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="grid gap-8 md:grid-cols-12">
              <div className="md:col-span-7"><p className="eyebrow text-[var(--signal-strong)]">{t("home.usesEyebrow")}</p><h2 className="mt-5 max-w-[10ch] text-[clamp(2.8rem,5vw,5.5rem)] leading-[.92] text-[var(--foreground)]">{t("home.usesTitle")}</h2></div>
              <div className="max-w-md self-end md:col-span-4 md:col-start-9"><p className="text-sm leading-relaxed text-[var(--text-muted)]">{locale === "fr" ? "Choisissez un point de départ sensible. Chaque carte interroge le catalogue Parigo en direct, puis vous laisse affiner le résultat par humeur, genre, instrument, BPM ou durée." : "Choose a feeling as your starting point. Each card searches the live Parigo catalogue, then lets you refine by mood, genre, instrument, BPM or duration."}</p><Link href="/search" className="mt-5 inline-flex min-h-10 items-center gap-2 font-mono text-[.62rem] font-semibold uppercase tracking-[.12em] text-[var(--text-muted)] transition hover:text-[var(--signal-strong)]">{locale === "fr" ? "Ou décrire votre propre intention" : "Or describe your own intention"}<ArrowRight size={14} className="text-[var(--signal-strong)]" /></Link></div>
            </SectionReveal>
            <div className="mt-14 grid gap-px border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-12">
              {sensations.map((item, index) => <Link key={item.label} href={`/search?q=${encodeURIComponent(item.query)}&view=tracks&type=main`} aria-label={`${item.label} — ${locale === "fr" ? "chercher dans le catalogue" : "search the catalogue"}`} className={`group relative flex min-h-52 flex-col justify-between overflow-hidden bg-[var(--background)] p-6 text-[var(--foreground)] transition duration-500 hover:z-10 hover:bg-[color-mix(in_srgb,var(--signal-strong)_22%,#0b0f0c)] hover:text-white hover:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--signal)_42%,transparent)] md:p-8 ${SENSATION_LAYOUTS[index]}`}>
                <span aria-hidden="true" className="absolute -bottom-10 -right-3 font-[var(--font-editorial)] text-[9rem] leading-none text-[var(--signal)] opacity-0 transition duration-500 group-hover:-translate-y-3 group-hover:opacity-[.09]">{index + 1}</span>
                <div className="relative flex items-start justify-between gap-6"><span className="max-w-[18ch] font-mono text-[.58rem] uppercase tracking-[.14em] text-[var(--text-muted)] transition group-hover:text-white/76">{item.note}</span><ArrowUpRight size={17} className="shrink-0 text-[var(--signal-strong)] transition duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[var(--signal)]" /></div>
                <div className="relative min-w-0"><span className="mb-4 block h-px w-10 bg-[var(--signal-strong)] transition-all duration-500 group-hover:w-20 group-hover:bg-[var(--signal)]" /><h3 className="max-w-full break-words text-[clamp(1.85rem,3vw,4rem)] leading-[.9] tracking-[-.06em] text-[var(--foreground)] transition-colors group-hover:text-white">{item.label}</h3><p className="mt-5 font-mono text-[.55rem] uppercase tracking-[.12em] text-[var(--text-muted)] transition group-hover:text-white/72">{locale === "fr" ? "Écouter cette direction" : "Listen in this direction"} · 0{index + 1}</p></div>
              </Link>)}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 md:px-8 md:pb-28">
          <SectionReveal className="group relative mx-auto grid max-w-[1580px] overflow-hidden rounded-[1.2rem] bg-[var(--signal-strong)] p-6 text-white md:grid-cols-12 md:items-center md:p-10 lg:p-14">
            <div aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full border-[44px] border-white/10 transition duration-700 group-hover:scale-110" />
            <div className="relative md:col-span-9 md:flex md:items-center md:gap-4"><div className="relative h-28 w-full max-w-[15rem] shrink-0" aria-label={locale === "fr" ? "Plateformes Parigo : Instagram, YouTube, LinkedIn, Facebook, Bandcamp, TikTok et Spotify" : "Parigo platforms: Instagram, YouTube, LinkedIn, Facebook, Bandcamp, TikTok and Spotify"}>{LINKTREE_PLATFORMS.map((platform) => <span key={platform.name} aria-label={platform.name} className={`absolute flex h-12 w-12 items-center justify-center rounded-[.9rem] border border-white/70 bg-[#ffffff] text-[#247b43] shadow-[0_12px_32px_rgba(19,70,37,.2)] transition-transform duration-500 ${platform.position}`}><PlatformIcon name={platform.name} /><span className="sr-only">{platform.name}</span></span>)}</div><div className="relative mt-4 md:mt-0"><p className="eyebrow text-white/62">{locale === "fr" ? "Parigo ailleurs" : "Parigo elsewhere"}</p><h2 className="mt-3 text-[clamp(2rem,4vw,4.5rem)] leading-[.94]">{locale === "fr" ? "Suivez le fil Parigo." : "Follow the Parigo signal."}</h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-white/68">{locale === "fr" ? "Sorties, playlists, images et actualités du studio — tous nos liens réunis au même endroit." : "Releases, playlists, images and studio news — all our links in one place."}</p></div></div>
            <div className="relative mt-8 md:col-span-3 md:col-start-10 md:mt-0 md:text-right"><a href="https://linktr.ee/parigomusicproduction?utm_source=linktree_profile_share&ltsid=0194467e-aa2a-4573-9f3a-63c72b5b8c67" target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-3 rounded-full border border-white/48 px-5 text-sm font-semibold text-white transition hover:border-[#247b43] hover:bg-white hover:!text-[#247b43]">{locale === "fr" ? "Ouvrir le Linktree" : "Open Linktree"}<ArrowUpRight size={17} /></a></div>
          </SectionReveal>
        </section>

        <section className="border-t border-[var(--line)] bg-[var(--surface)] px-4 py-20 md:px-8 md:py-28">
          <SectionReveal className="mx-auto grid max-w-[1580px] gap-10 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8"><p className="eyebrow text-[var(--signal-strong)]">{t("home.licenseEyebrow")}</p><h2 className="mt-6 max-w-[13ch] text-[clamp(2.8rem,5.8vw,6.2rem)] leading-[.92]">{t("home.licenseTitle")}</h2></div>
            <div className="md:col-span-3 md:col-start-10"><p className="mb-7 leading-relaxed text-[var(--text-muted)]">{t("home.licenseCopy")}</p><div className="flex flex-wrap gap-3"><Link href="/contact"><Button className="home-project-cta">{t("home.licenseCta")}</Button></Link><Link href="/licensing"><Button variant="outline">{t("home.discoverLicensing")}</Button></Link></div></div>
          </SectionReveal>
        </section>
      </main>
      <Footer />
    </div>
  );
}
