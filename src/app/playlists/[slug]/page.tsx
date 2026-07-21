"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, ListMusic, Loader2, Music, Play, Shuffle } from "lucide-react";
import { TrackRow } from "@/components/features";
import { Footer, Header } from "@/components/layout";
import { Button, Tag } from "@/components/ui";
import { MediaReveal } from "@/components/motion";
import { useI18n } from "@/components/providers/I18nProvider";
import { usePlayerStore } from "@/stores/player-store";
import { formatDuration } from "@/lib/utils";
import type { Album, Track } from "@/types";

interface PlaylistDetail { id: string; slug?: string; title: string; description?: string; cover: string; category?: string; trackCount?: number; totalDuration: number; isFeatured?: boolean; tracks: Track[]; }

function albumFor(track: Track): Album {
  return { id: track.albumId, slug: track.albumSlug, title: track.albumTitle || "", cover: track.albumCover || "/images/placeholder-album.jpg", label: track.albumLabel || "Parigo", labelSlug: track.albumLabelSlug, genres: track.genres, moods: track.moods, trackCount: 0 };
}

export default function PlaylistDetailPage() {
  const { locale, t } = useI18n();
  const slug = useParams().slug as string;
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"not-found" | "unavailable" | null>(null);
  const [saved, setSaved] = useState(false);
  const { play, setQueue } = usePlayerStore();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/playlists/${slug}`, { signal: controller.signal });
        if (!response.ok) {
          setError(response.status === 404 ? "not-found" : "unavailable");
          return;
        }
        setPlaylist((await response.json()).data?.playlist);
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setError("unavailable");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    if (slug) load();
    return () => controller.abort();
  }, [slug]);

  const handlePlayAll = () => { if (!playlist?.tracks.length) return; setQueue(playlist.tracks, 0); play(playlist.tracks[0]); };
  const handleShuffle = () => { if (!playlist?.tracks.length) return; const tracks = [...playlist.tracks]; for (let index = tracks.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [tracks[index], tracks[swap]] = [tracks[swap], tracks[index]]; } setQueue(tracks, 0); play(tracks[0]); };
  const handleSave = async () => {
    if (!playlist) return;
    const response = await fetch("/api/user/playlists/copy-featured", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playlistId: playlist.id }) });
    if (response.ok) setSaved(true);
  };

  if (isLoading) return <div className="page-shell flex min-h-screen flex-col"><Header /><main className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-[var(--color-primary)]" /></main><Footer /></div>;
  if (error || !playlist) {
    const unavailable = error === "unavailable";
    return <div className="page-shell flex min-h-screen flex-col"><Header /><main className="flex flex-1 flex-col items-center justify-center p-8 text-center"><ListMusic size={42} className="mb-6 opacity-25" /><h1 className="font-[var(--font-editorial)] text-5xl font-normal">{unavailable ? (locale === "fr" ? "Playlist momentanément indisponible" : "Playlist temporarily unavailable") : (locale === "fr" ? "Playlist non trouvée" : "Playlist not found")}</h1>{unavailable && <p className="mt-4 max-w-lg text-[var(--text-muted)]">{locale === "fr" ? "Le catalogue n’a pas pu charger cette sélection. Réessayez dans quelques instants." : "The catalogue could not load this selection. Please try again shortly."}</p>}<Link href="/playlists" className="mt-8"><Button variant="outline"><ArrowLeft size={17} /> {t("common.back")}</Button></Link></main><Footer /></div>;
  }

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-28 pt-[88px]">
        <div className="mx-auto max-w-[1500px] px-4 py-6 lg:px-8"><Link href="/playlists" className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--foreground)]"><ArrowLeft size={17} /> {t("common.playlists")}</Link></div>
        <section className="mx-auto grid max-w-[1500px] items-center gap-10 px-4 pb-16 pt-5 lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:pb-24">
          <MediaReveal className="relative aspect-square w-full max-w-[420px] overflow-hidden rounded-[1.1rem] border border-[var(--line)] bg-[var(--surface-soft)] shadow-[0_22px_70px_rgba(15,22,16,.10)]" direction="left">{playlist.cover ? <Image src={playlist.cover} alt={playlist.title} fill priority sizes="(max-width:768px) 92vw, 420px" className="object-contain" /> : <div className="flex h-full items-center justify-center bg-[var(--surface-soft)]"><ListMusic size={92} className="opacity-20" /></div>}</MediaReveal>
          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} className="flex max-w-3xl flex-col justify-center">{playlist.category && <Tag variant="genre" className="mb-5 self-start">{playlist.category.toLowerCase() === "curated" ? (locale === "fr" ? "Sélection Parigo" : "Parigo selection") : playlist.category}</Tag>}<h1 className="font-[var(--font-editorial)] text-[clamp(3.2rem,6vw,7rem)] font-normal leading-[.88] tracking-[-.058em]">{playlist.title}</h1>{playlist.description && <p className="mt-7 max-w-2xl text-base leading-relaxed text-[var(--text-muted)] md:text-lg">{playlist.description}</p>}<div className="mt-8 flex flex-wrap gap-6 border-y border-[var(--line)] py-5 font-mono text-[.65rem] uppercase tracking-[.1em] text-[var(--text-muted)]"><span className="flex items-center gap-2"><Music size={14} />{playlist.trackCount} {playlist.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span><span className="flex items-center gap-2"><Clock size={14} />{formatDuration(playlist.totalDuration)}</span></div><div className="mt-8 flex flex-wrap items-center gap-3"><Button variant="primary" size="lg" onClick={handlePlayAll} disabled={!playlist.tracks.length}><Play size={18} fill="currentColor" /> {t("search.playSelection")}</Button><Button variant="outline" size="lg" onClick={handleShuffle} disabled={!playlist.tracks.length}><Shuffle size={18} /> {locale === "fr" ? "Aléatoire" : "Shuffle"}</Button><Button variant="outline" size="lg" onClick={handleSave} disabled={saved}>{saved ? (locale === "fr" ? "Ajoutée" : "Saved") : (locale === "fr" ? "Copier dans mes playlists" : "Copy to my playlists")}</Button></div></motion.div>
        </section>
        <section className="mx-auto max-w-[1500px] px-4 py-16 lg:px-8 md:py-24"><h2 className="mb-10 font-[var(--font-editorial)] text-6xl font-normal tracking-[-.055em]">{t("catalog.tracks")}</h2>{playlist.tracks.length ? <div className="border-y border-[var(--line)] py-2">{playlist.tracks.map((track, index) => <TrackRow key={track.id} track={track} album={albumFor(track)} index={index} />)}</div> : <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">{locale === "fr" ? "Cette playlist ne contient pas encore de pistes." : "This playlist does not contain any tracks yet."}</p>}</section>
      </main>
      <Footer />
    </div>
  );
}
