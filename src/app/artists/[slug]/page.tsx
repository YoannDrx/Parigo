"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Disc3, ExternalLink, Loader2, Music, Users } from "lucide-react";
import { AlbumCard, MiniPlayer, TrackRow } from "@/components/features";
import { Footer, Header } from "@/components/layout";
import { Button } from "@/components/ui";
import { MediaReveal } from "@/components/motion";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Album, Track } from "@/types";

interface ArtistLink { id: string; platform: string; url: string; label: string | null; }
interface ArtistDetail { id: string; slug: string; name: string; bio: string | null; image: string | null; links: ArtistLink[]; albumCount: number; trackCount: number; albums: Album[]; featuredTracks: Track[]; }

export default function ArtistDetailPage() {
  const { locale, t } = useI18n();
  const slug = useParams().slug as string;
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<"albums" | "tracks">("albums");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/artists/${slug}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        setArtist((await response.json()).artist);
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(true);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    if (slug) load();
    return () => controller.abort();
  }, [slug]);

  if (isLoading) return <div className="page-shell flex min-h-screen flex-col"><Header /><main className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-[var(--color-primary)]" /></main><Footer /></div>;
  if (error || !artist) return <div className="page-shell flex min-h-screen flex-col"><Header /><main className="flex flex-1 flex-col items-center justify-center p-8 text-center"><Users size={42} className="mb-6 opacity-25" /><h1 className="font-[var(--font-editorial)] text-5xl font-normal">{locale === "fr" ? "Artiste non trouvé" : "Artist not found"}</h1><Link href="/artists" className="mt-8"><Button variant="outline"><ArrowLeft size={17} /> {t("common.back")}</Button></Link></main><Footer /></div>;

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-28 pt-[70px]">
        <div className="mx-auto max-w-[1700px] px-4 py-6 lg:px-8"><Link href="/artists" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={17} /> {t("common.artists")}</Link></div>
        <section className="mx-auto grid max-w-[1700px] gap-12 px-4 py-8 lg:px-8 md:grid-cols-12 md:py-16">
          <MediaReveal className="relative aspect-[4/5] md:col-span-5" direction="left">{artist.image ? <Image src={artist.image} alt={artist.name} fill priority sizes="(max-width:768px) 100vw, 42vw" className="object-cover grayscale transition duration-1000 hover:grayscale-0" /> : <div className="flex h-full items-center justify-center bg-[var(--surface-soft)] font-[var(--font-editorial)] text-[12rem]">{artist.name.charAt(0)}</div>}</MediaReveal>
          <motion.div initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }} className="self-center md:col-span-6 md:col-start-7"><p className="eyebrow mb-6 text-[var(--color-primary-dark)]">{t("catalog.artistsEyebrow")}</p><h1 className="font-[var(--font-editorial)] text-[clamp(4.5rem,9vw,10rem)] font-normal leading-[.75] tracking-[-.065em]">{artist.name}</h1>{artist.bio && <p className="mt-10 max-w-2xl text-lg leading-relaxed text-[var(--text-muted)]">{artist.bio}</p>}<div className="mt-10 flex flex-wrap gap-8 border-t border-[var(--line)] pt-6 font-mono text-[.65rem] uppercase tracking-[.1em] opacity-55"><span>{artist.albumCount} {artist.albumCount === 1 ? t("catalog.album") : t("catalog.albums")}</span><span>{artist.trackCount} {artist.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span></div>{artist.links.length > 0 && <div className="mt-8 flex flex-wrap gap-2">{artist.links.map((link) => <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-sm transition hover:border-[var(--signal)]">{link.label || link.platform}<ExternalLink size={13} /></a>)}</div>}</motion.div>
        </section>
        <section className="mx-auto max-w-[1700px] px-4 py-16 lg:px-8 md:py-24"><div className="mb-12 flex gap-2"><button onClick={() => setActiveTab("albums")} className={`min-h-11 rounded-full border px-5 ${activeTab === "albums" ? "bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--line)]"}`}><Disc3 className="mr-2 inline" size={16} />{t("common.albums")}</button><button onClick={() => setActiveTab("tracks")} className={`min-h-11 rounded-full border px-5 ${activeTab === "tracks" ? "bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--line)]"}`}><Music className="mr-2 inline" size={16} />{t("catalog.tracks")}</button></div>{activeTab === "albums" ? artist.albums.length ? <div className="grid grid-cols-2 gap-x-5 gap-y-14 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{artist.albums.map((album) => <AlbumCard key={album.id} album={album} />)}</div> : <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">{t("catalog.noAlbums")}</p> : artist.featuredTracks.length ? <div className="border-y border-[var(--line)] py-2">{artist.featuredTracks.map((track, index) => <TrackRow key={track.id} track={track} album={track.albumId ? { id: track.albumId, title: track.albumTitle || "", cover: track.albumCover || "/media/mock/albums/pgo0022.avif", label: "", trackCount: 0, genres: [] } : undefined} index={index} />)}</div> : <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">{locale === "fr" ? "Aucune piste disponible." : "No tracks available."}</p>}</section>
      </main>
      <Footer /><MiniPlayer />
    </div>
  );
}
