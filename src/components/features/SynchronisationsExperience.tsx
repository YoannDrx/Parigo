"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Play, Youtube } from "lucide-react";
import { Footer, Header } from "@/components/layout";
import { useI18n } from "@/components/providers/I18nProvider";
import { SYNCHRONISATIONS, SYNCHRONISATIONS_PLAYLIST_URL } from "@/content/synchronisations";

export function SynchronisationsExperience() {
  const { locale } = useI18n();
  return <div className="page-shell">
    <Header />
    <main className="overflow-x-clip px-4 pb-24 pt-28 md:px-8 md:pb-36 md:pt-36">
      <div className="mx-auto min-w-0 max-w-[1580px]">
        <div className="grid min-w-0 gap-10 md:grid-cols-12 md:items-end">
          <div className="min-w-0 md:col-span-8">
            <p className="eyebrow text-[var(--signal-strong)]">Music for images</p>
            <h1 className="mt-6 min-w-0 text-[clamp(2.3rem,10vw,6rem)] font-semibold leading-[.88] tracking-[-.07em] md:text-[clamp(4rem,8.5vw,9rem)] md:leading-[.84]">
              <span className="block">{locale === "fr" ? "Nos" : "Our"}</span>
              <span className="block">{locale === "fr" ? "synchronisations" : "synchronisations"}<span className="text-[var(--signal)]">.</span></span>
            </h1>
          </div>
          <div className="min-w-0 max-w-md md:col-span-3 md:col-start-10">
            <p className="leading-relaxed text-[var(--text-muted)]">{locale === "fr" ? "Films, séries, campagnes : une sélection de récits auxquels le catalogue Parigo a prêté sa couleur." : "Films, series and campaigns: selected stories coloured by the Parigo catalogue."}</p>
            <a href={SYNCHRONISATIONS_PLAYLIST_URL} target="_blank" rel="noreferrer" className="group mt-7 inline-flex min-h-12 max-w-full items-center gap-3 border border-[var(--signal-strong)] bg-[var(--signal-soft)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--signal-strong)] hover:text-[var(--background)] sm:px-5">
              <Youtube size={17} className="shrink-0" /><span className="min-w-0">{locale === "fr" ? "Voir la playlist YouTube" : "View the YouTube playlist"}</span><ArrowUpRight size={16} className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
        <div className="mt-12 grid min-w-0 gap-4 sm:mt-16 sm:gap-6 lg:grid-cols-2 lg:gap-7">{SYNCHRONISATIONS.map((sync, index) => <Link key={sync.slug} href={`/synchronisations/${sync.slug}`} className="home-sync-card group block min-w-0"><div className="home-sync-card__frame relative aspect-video min-w-0 overflow-hidden bg-[#0b0e0b]"><Image src={sync.image} alt={`${sync.title} — ${sync.client}`} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-contain transition duration-700 group-hover:scale-[1.018]" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/5" /><span className="absolute right-4 top-4 font-mono text-[.54rem] text-white/65 sm:right-5 sm:top-5 sm:text-[.58rem]">SYNC / {String(index + 1).padStart(2, "0")}</span><span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center border border-white/45 bg-black/25 text-white shadow-xl backdrop-blur-md transition duration-500 group-hover:rotate-[8deg] group-hover:scale-110 group-hover:bg-[var(--signal)] sm:left-5 sm:top-5 sm:h-12 sm:w-12"><Play size={16} fill="currentColor" /></span><div className="absolute inset-x-0 bottom-0 flex min-w-0 items-end justify-between gap-4 p-4 text-white sm:p-6 md:p-8"><div className="min-w-0"><p className="truncate font-mono text-[.54rem] uppercase tracking-[.13em] text-white/65 sm:text-[.58rem]">{sync.client}</p><h2 className="mt-1.5 truncate text-2xl font-semibold tracking-[-.045em] sm:mt-2 sm:text-3xl md:text-4xl">{sync.title}</h2></div><span className="hidden shrink-0 font-mono text-[.56rem] uppercase tracking-[.12em] text-white/55 sm:block">{locale === "fr" ? "Voir la synchronisation" : "View the synchronisation"} ↗</span></div></div></Link>)}</div>
      </div>
    </main>
    <Footer />
  </div>;
}
