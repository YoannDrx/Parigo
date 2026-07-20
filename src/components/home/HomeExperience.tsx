"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, Play } from "lucide-react";
import type { ReactNode } from "react";
import { AISearch, MiniPlayer } from "@/components/features";
import { Footer, Header } from "@/components/layout";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui";

const releases = [
  { title: "EDM From Paris", ref: "PGO 0023", cover: "/media/mock/albums/pgo0023.avif" },
  { title: "Latin Experience", ref: "PGO 0026", cover: "/media/mock/albums/pgo0026.avif" },
  { title: "Hollywood Hustlers", ref: "PGO 0028", cover: "/media/mock/albums/pgo0028.avif" },
  { title: "Trap In The Cloud", ref: "PGO 0035", cover: "/media/mock/albums/pgo0035.avif" },
];

const artists = [
  { name: "Arandel", image: "/media/mock/artists/arandel.jpg" },
  { name: "Forever Pavot", image: "/media/mock/artists/forever-pavot.jpg" },
  { name: "Charlotte Savary", image: "/media/mock/artists/charlotte-savary.jpg" },
  { name: "Flore", image: "/media/mock/artists/flore.jpg" },
];

const syncs = [
  { title: "Tokyo Vice", client: "HBO Max", image: "/images/synchros/tokyo-vice.jpg" },
  { title: "Le Monde de demain", client: "Arte / Netflix", image: "/images/synchros/le-monde-de-demain2.jpg" },
  { title: "Monkey Man", client: "Universal", image: "/images/synchros/monkey-man.jpg" },
];

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
  const process = locale === "fr" ? [
    ["01", "Décrivez", "Une émotion, une scène, un rythme ou quelques références suffisent."],
    ["02", "Écoutez", "Comparez les pistes, leurs waveforms et leurs métadonnées sans perdre le fil."],
    ["03", "Sélectionnez", "Créez une shortlist, partagez-la et avancez vers la bonne licence."],
  ] : [
    ["01", "Describe", "A feeling, a scene, a rhythm or a few references are enough."],
    ["02", "Listen", "Compare tracks, waveforms and metadata without losing your flow."],
    ["03", "Select", "Build a shortlist, share it and move towards the right licence."],
  ];
  const uses = locale === "fr" ? ["Publicité", "Documentaire", "Fiction", "Sport", "Mode", "Émotion"] : ["Advertising", "Documentary", "Fiction", "Sport", "Fashion", "Emotion"];

  return (
    <div className="page-shell">
      <Header variant="overlay" />
      <main>
        <section className="relative flex min-h-[860px] items-center overflow-hidden bg-[var(--surface)] px-4 pb-16 pt-28 md:min-h-[100svh] md:px-8 md:pb-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.span animate={{ x: [0, 32, 0], y: [0, -18, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} className="absolute left-[7%] top-[18%] h-[32vw] max-h-[470px] min-h-64 w-[32vw] min-w-64 rounded-full bg-[#cfe6d5] blur-[80px] opacity-75" />
            <motion.span animate={{ x: [0, -28, 0], y: [0, 24, 0] }} transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[8%] right-[8%] h-[28vw] max-h-[430px] min-h-56 w-[28vw] min-w-56 rounded-full bg-[#b7d7c2] blur-[90px] opacity-68" />
          </div>
          <div className="relative mx-auto w-full max-w-[1240px] text-center">
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }} className="eyebrow text-[var(--signal-strong)]">{t("home.eyebrow")}</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .08, ease: [0.22, 1, 0.36, 1] }} aria-label={`${t("home.titleTop")} ${t("home.titleBottom")}`} className="mx-auto mt-8 max-w-[11ch] text-[clamp(3.65rem,9vw,8.8rem)] font-semibold leading-[.87] tracking-[-.065em]">
              <span className="block">{t("home.titleTop")}</span>
              <span className="block text-[var(--signal-strong)]">{t("home.titleBottom")}</span>
            </motion.h1>
            <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-[var(--text-muted)] md:text-lg">{t("home.promise")}</p>
            <div className="mx-auto mt-10 max-w-4xl text-left"><AISearch showExamples /></div>
            <a href="#discover" className="mx-auto mt-12 inline-flex min-h-11 items-center gap-2 text-xs font-semibold uppercase tracking-[.1em] text-[var(--text-muted)] transition hover:text-[var(--foreground)]">{t("home.scroll")} <ArrowDown size={15} /></a>
          </div>
        </section>

        <section id="discover" className="px-4 py-20 md:px-8 md:py-28">
          <SectionReveal className="mx-auto max-w-[1580px]">
            <div className="relative min-h-[620px] overflow-hidden rounded-[var(--radius-md)] md:min-h-[760px]">
              <Image src="/images/synchros/emily.jpg" alt="Emily in Paris — synchronisation Parigo" fill priority sizes="100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/18 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 grid gap-8 p-6 text-white md:grid-cols-12 md:p-12">
                <p className="eyebrow md:col-span-3">{t("home.statementEyebrow")}</p>
                <h2 className="max-w-[18ch] text-[clamp(2.4rem,5vw,5.6rem)] font-semibold leading-[.94] tracking-[-.05em] md:col-span-8 md:col-start-5">{locale === "fr" ? "Une recherche musicale qui commence par votre image." : "Music search that begins with your image."}</h2>
              </div>
            </div>
          </SectionReveal>
        </section>

        <section className="border-y border-[var(--line)] bg-[var(--surface)] px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div><p className="eyebrow text-[var(--signal-strong)]">{t("home.releasesEyebrow")}</p><h2 className="mt-5 max-w-[12ch] text-[clamp(2.8rem,5vw,5.6rem)] font-semibold leading-[.92] tracking-[-.055em]">{locale === "fr" ? "À écouter maintenant." : "Listen now."}</h2></div>
              <Link href="/albums" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:text-[var(--signal-strong)]">{t("common.seeAll")} <ArrowRight size={16} /></Link>
            </SectionReveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {releases.map((release) => (
                <SectionReveal key={release.ref}>
                  <Link href="/albums" className="group block">
                    <div className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-soft)]"><Image src={release.cover} alt={release.title} fill sizes="(max-width:640px) 100vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.025]" /><span className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#151815] opacity-0 shadow-md transition group-hover:opacity-100"><Play size={16} fill="currentColor" /></span></div>
                    <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] py-4"><div><h3 className="text-lg font-semibold tracking-[-.025em]">{release.title}</h3><p className="mt-1 font-mono text-[.6rem] uppercase tracking-[.12em] text-[var(--text-muted)]">Parigo Music</p></div><span className="font-mono text-[.6rem] text-[var(--text-muted)]">{release.ref}</span></div>
                  </Link>
                </SectionReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-24 text-center md:px-8 md:py-36">
          <SectionReveal className="mx-auto max-w-[1320px]">
            <p className="eyebrow text-[var(--signal-strong)]">Parigo Music</p>
            <h2 className="mt-7 text-[clamp(2.65rem,6.8vw,7.2rem)] font-semibold uppercase leading-[.92] tracking-[-.055em]">{locale === "fr" ? "Une musique juste. Au bon moment. Pour la bonne image." : "The right music. At the right moment. For the right image."}</h2>
          </SectionReveal>
        </section>

        <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="grid gap-8 md:grid-cols-12"><div className="md:col-span-4"><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Comment ça marche" : "How it works"}</p><h2 className="mt-5 text-[clamp(2.5rem,4.5vw,4.8rem)] leading-[.94]">{locale === "fr" ? "Du brief à la sélection." : "From brief to selection."}</h2></div><p className="max-w-md self-end text-[var(--text-muted)] md:col-span-4 md:col-start-9">{t("home.demoCopy")}</p></SectionReveal>
            <div className="mt-14 grid border-l border-t border-[var(--line)] md:grid-cols-3">
              {process.map(([number, title, copy]) => <article key={number} className="flex min-h-64 flex-col border-b border-r border-[var(--line)] bg-[var(--surface)] p-6 md:min-h-72"><span className="font-mono text-[.62rem] text-[var(--signal-strong)]">{number}</span><div className="mt-auto"><h3 className="text-3xl">{title}</h3><p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">{copy}</p></div></article>)}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto grid max-w-[1580px] gap-12 lg:grid-cols-12">
            <SectionReveal className="lg:col-span-4"><p className="eyebrow text-[var(--signal-strong)]">{t("home.artistsEyebrow")}</p><h2 className="mt-5 text-[clamp(2.8rem,5vw,5.5rem)] leading-[.92]">{locale === "fr" ? "Nos talents." : "Our talents."}</h2><p className="mt-6 max-w-sm leading-relaxed text-[var(--text-muted)]">{t("home.artistsCopy")}</p><Link href="/artists" className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:text-[var(--signal-strong)]">{t("home.artistsCta")} <ArrowRight size={16} /></Link></SectionReveal>
            <div className="grid grid-cols-2 gap-3 lg:col-span-8">
              {artists.map((artist) => <Link key={artist.name} href="/artists" className="group relative aspect-[4/5] overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-soft)]"><Image src={artist.image} alt={artist.name} fill sizes="(max-width:1024px) 50vw, 33vw" className="object-cover grayscale transition duration-700 group-hover:scale-[1.02] group-hover:grayscale-0" /><div className="absolute inset-0 bg-gradient-to-t from-black/68 via-transparent to-transparent" /><h3 className="absolute inset-x-0 bottom-0 p-4 text-xl text-white md:p-6 md:text-3xl">{artist.name}</h3></Link>)}
            </div>
          </div>
        </section>

        <section className="bg-[var(--surface-inverse)] px-4 py-20 text-[var(--background)] md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="mb-12 grid gap-8 md:grid-cols-12"><div className="md:col-span-7"><p className="eyebrow text-[var(--signal)]">{t("home.syncEyebrow")}</p><h2 className="mt-5 text-[clamp(2.8rem,5vw,5.5rem)] leading-[.92]">{t("home.syncTitle")}</h2></div><p className="max-w-md self-end opacity-58 md:col-span-4 md:col-start-9">{t("home.syncCopy")}</p></SectionReveal>
            <div className="grid gap-4 md:grid-cols-3">
              {syncs.map((sync) => <article key={sync.title} className="group"><div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-md)] bg-[#222]"><Image src={sync.image} alt={`${sync.title} — ${sync.client}`} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.025]" /><div className="absolute inset-0 bg-gradient-to-t from-black/72 via-transparent to-transparent" /><div className="absolute inset-x-0 bottom-0 p-5 text-white"><p className="font-mono text-[.6rem] uppercase tracking-[.13em] opacity-62">{sync.client}</p><h3 className="mt-2 text-2xl md:text-3xl">{sync.title}</h3></div></div></article>)}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1580px]">
            <SectionReveal className="grid gap-8 md:grid-cols-12"><div className="md:col-span-6"><p className="eyebrow text-[var(--signal-strong)]">{t("home.usesEyebrow")}</p><h2 className="mt-5 text-[clamp(2.8rem,5vw,5.5rem)] leading-[.92]">{t("home.usesTitle")}</h2></div></SectionReveal>
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
