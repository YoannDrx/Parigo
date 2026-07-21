import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Play, Youtube } from "lucide-react";
import { Footer, Header } from "@/components/layout";
import { SYNCHRONISATIONS, SYNCHRONISATIONS_PLAYLIST_URL } from "@/content/synchronisations";

export const metadata: Metadata = {
  title: "Nos synchronisations",
  description: "Découvrez une sélection de films, séries et campagnes mis en musique avec le catalogue Parigo.",
};

export default function SynchronisationsPage() {
  return (
    <div className="page-shell">
      <Header />
      <main className="px-4 pb-24 pt-28 md:px-8 md:pb-36 md:pt-36">
        <div className="mx-auto max-w-[1580px]">
          <div className="grid gap-10 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8"><p className="eyebrow text-[var(--signal-strong)]">Music for image</p><h1 className="mt-6 text-[clamp(3.8rem,8.5vw,9rem)] font-semibold leading-[.84] tracking-[-.07em]">Nos synchronisations<span className="text-[var(--signal)]">.</span></h1></div>
            <div className="max-w-md md:col-span-3 md:col-start-10">
              <p className="leading-relaxed text-[var(--text-muted)]">Films, séries, campagnes : une sélection de récits auxquels le catalogue Parigo a prêté sa couleur.</p>
              <a href={SYNCHRONISATIONS_PLAYLIST_URL} target="_blank" rel="noreferrer" className="group mt-7 inline-flex min-h-12 items-center gap-3 rounded-full border border-[var(--signal-strong)] bg-[var(--signal-soft)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--signal-strong)] hover:text-[var(--background)]"><Youtube size={17} /><span>Voir la playlist YouTube</span><ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>
            </div>
          </div>
          <div className="mt-16 grid gap-7 lg:grid-cols-2">
            {SYNCHRONISATIONS.map((sync, index) => (
              <Link key={sync.slug} href={`/synchronisations/${sync.slug}`} className="home-sync-card group block">
                <div className="home-sync-card__frame relative aspect-video overflow-hidden bg-[#0b0e0b]"><Image src={sync.image} alt={`${sync.title} — ${sync.client}`} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-contain transition duration-700 group-hover:scale-[1.018]" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/5" /><span className="absolute right-5 top-5 font-mono text-[.58rem] text-white/65">SYNC / {String(index + 1).padStart(2, "0")}</span><span className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/45 bg-black/25 text-white shadow-xl backdrop-blur-md transition duration-500 group-hover:rotate-[8deg] group-hover:scale-110 group-hover:bg-[var(--signal)]"><Play size={17} fill="currentColor" /></span><div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-6 text-white md:p-8"><div><p className="font-mono text-[.58rem] uppercase tracking-[.13em] text-white/65">{sync.client}</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.045em] md:text-4xl">{sync.title}</h2></div><span className="hidden font-mono text-[.56rem] uppercase tracking-[.12em] text-white/55 sm:block">Voir la synchronisation ↗</span></div></div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
