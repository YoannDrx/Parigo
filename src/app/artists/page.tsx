"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Disc3, LayoutGrid, List, Loader2, Music, Search, Users } from "lucide-react";
import { Header, Footer } from "@/components/layout";
import { MiniPlayer } from "@/components/features";
import { CatalogHero } from "@/components/catalog";
import { useI18n } from "@/components/providers/I18nProvider";

interface Artist { id: string; slug: string; name: string; image: string | null; albumCount: number; trackCount: number; }

export default function ArtistsPage() {
  const { locale, t } = useI18n();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    const controller = new AbortController();
    async function loadArtists() {
      try {
        const response = await fetch("/api/artists?limit=200", { signal: controller.signal });
        if (response.ok) setArtists((await response.json()).artists || []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.error("Error loading artists:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    loadArtists();
    return () => controller.abort();
  }, []);

  const availableLetters = useMemo(() => Array.from(new Set(artists.map((artist) => /^[A-Z]/.test(artist.name.charAt(0).toUpperCase()) ? artist.name.charAt(0).toUpperCase() : "#"))).sort(), [artists]);
  const filteredArtists = useMemo(() => artists.filter((artist) => (!searchQuery || artist.name.toLowerCase().includes(searchQuery.toLowerCase())) && (!selectedLetter || (selectedLetter === "#" ? !/^[A-Z]/.test(artist.name.charAt(0).toUpperCase()) : artist.name.charAt(0).toUpperCase() === selectedLetter))), [artists, searchQuery, selectedLetter]);

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-32">
        <CatalogHero eyebrow={t("catalog.artistsEyebrow")} title={t("catalog.artistsTitle")} intro={t("catalog.artistsIntro")} meta={`${artists.length} ${t("common.artists").toLowerCase()}`} />
        <div className="mx-auto max-w-[1700px] px-4 py-12 lg:px-8 md:py-16">
          <div className="mb-14 grid gap-8 md:grid-cols-12">
            <label className="relative block md:col-span-5"><span className="sr-only">{t("catalog.searchArtist")}</span><Search size={18} className="absolute left-0 top-1/2 -translate-y-1/2 opacity-45" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t("catalog.searchArtist")} className="min-h-14 w-full border-b border-[var(--line-strong)] bg-transparent pl-8 outline-none placeholder:text-current/35 focus:border-[var(--signal)]" /></label>
            <div className="flex flex-wrap items-end gap-1 self-end md:col-span-6 md:col-start-7"><button onClick={() => setSelectedLetter(null)} className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-2 font-mono text-[.65rem] ${selectedLetter === null ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--line)]"}`}>{locale === "fr" ? "TOUS" : "ALL"}</button>{"ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("").map((letter) => <button key={letter} onClick={() => setSelectedLetter(letter)} disabled={!availableLetters.includes(letter)} className={`flex h-9 w-9 items-center justify-center rounded-full border font-mono text-[.65rem] transition disabled:cursor-not-allowed disabled:opacity-20 ${selectedLetter === letter ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}>{letter}</button>)}</div>
          </div>

          <div className="mb-7 flex items-center justify-between border-b border-[var(--line)] pb-4"><p className="font-mono text-[.68rem] uppercase tracking-[.12em] text-[var(--text-muted)]">{filteredArtists.length} {t("common.artists").toLowerCase()}</p><div className="flex border border-[var(--line)]" role="group" aria-label={locale === "fr" ? "Mode d’affichage" : "View mode"}><button type="button" onClick={() => setViewMode("list")} aria-pressed={viewMode === "list"} aria-label={locale === "fr" ? "Vue liste" : "List view"} className={`grid h-11 w-11 place-items-center border-r border-[var(--line)] ${viewMode === "list" ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-soft)]"}`}><List size={17} /></button><button type="button" onClick={() => setViewMode("grid")} aria-pressed={viewMode === "grid"} aria-label={locale === "fr" ? "Vue cartes" : "Grid view"} className={`grid h-11 w-11 place-items-center ${viewMode === "grid" ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-soft)]"}`}><LayoutGrid size={17} /></button></div></div>

          {isLoading ? <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[var(--color-primary)]" /></div> : filteredArtists.length === 0 ? <div className="py-24 text-center"><Users size={40} className="mx-auto mb-6 opacity-25" /><h2 className="font-[var(--font-editorial)] text-5xl font-normal">{t("catalog.noArtists")}</h2></div> : (
            viewMode === "list" ? <div className="border-t border-[var(--line)]">
              {filteredArtists.map((artist, index) => <motion.div key={artist.id} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .4 }} transition={{ duration: .55, delay: (index % 8) * .025 }}><Link href={`/artists/${artist.slug}`} className="group grid min-h-28 items-center border-b border-[var(--line)] py-5 md:grid-cols-12"><span className="font-mono text-[.62rem] opacity-32 md:col-span-1">{String(index + 1).padStart(2, "0")}</span><div className="flex items-center gap-5 md:col-span-6"><div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--surface-soft)] md:h-20 md:w-20">{artist.image ? <Image src={artist.image} alt="" fill sizes="80px" className="object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0" /> : <span className="flex h-full items-center justify-center font-[var(--font-editorial)] text-3xl">{artist.name.charAt(0)}</span>}</div><h2 className="font-[var(--font-editorial)] text-4xl font-normal tracking-[-.045em] transition duration-500 group-hover:translate-x-3 group-hover:italic group-hover:text-[var(--color-primary-dark)] md:text-6xl">{artist.name}</h2></div><div className="mt-4 flex gap-5 text-xs text-[var(--text-muted)] md:col-span-3 md:col-start-10 md:mt-0"><span className="flex items-center gap-2"><Disc3 size={14} /> {artist.albumCount} {artist.albumCount === 1 ? t("catalog.album") : t("catalog.albums")}</span><span className="flex items-center gap-2"><Music size={14} /> {artist.trackCount} {artist.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span></div></Link></motion.div>)}
            </div> : <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredArtists.map((artist, index) => <motion.article key={artist.id} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ delay: (index % 8) * .035 }}><Link href={`/artists/${artist.slug}`} className="group block"><div className="relative aspect-[4/5] overflow-hidden bg-[var(--surface-soft)]">{artist.image ? <Image src={artist.image} alt={artist.name} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw" className="object-cover grayscale transition duration-700 group-hover:scale-[1.035] group-hover:grayscale-0" /> : <span className="grid h-full place-items-center font-[var(--font-editorial)] text-8xl">{artist.name.charAt(0)}</span>}<span className="absolute right-3 top-3 bg-[var(--signal)] px-2 py-1 font-mono text-[.6rem] text-[#10110e]">{String(index + 1).padStart(2, "0")}</span></div><div className="mt-4 flex items-start justify-between gap-4 border-t border-[var(--line)] pt-4"><h2 className="font-[var(--font-editorial)] text-3xl font-normal tracking-[-.04em] transition group-hover:italic group-hover:text-[var(--color-primary-dark)]">{artist.name}</h2><span className="font-mono text-[.6rem] opacity-45">{artist.trackCount} {t("catalog.tracks")}</span></div></Link></motion.article>)}</div>
          )}
        </div>
      </main>
      <Footer />
      <MiniPlayer />
    </div>
  );
}
