"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, ListMusic, Loader2, Music, Play, Shuffle } from "lucide-react";
import { FavoriteButton, MiniPlayer, TrackRow } from "@/components/features";
import { Footer, Header } from "@/components/layout";
import { Button, Tag } from "@/components/ui";
import { MediaReveal } from "@/components/motion";
import { useI18n } from "@/components/providers/I18nProvider";
import { usePlayerStore } from "@/stores/player-store";
import { formatDuration } from "@/lib/utils";
import type { Album, Track } from "@/types";

interface PlaylistDetail { id: string; slug: string; title: string; description: string | null; cover: string | null; category: string | null; trackCount: number; totalDuration: number; isFeatured: boolean; tracks: Array<{ track: Track; album: Album }>; }

export default function PlaylistDetailPage() {
  const { locale, t } = useI18n();
  const slug = useParams().slug as string;
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const { play, setQueue } = usePlayerStore();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/playlists/${slug}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        setPlaylist((await response.json()).playlist);
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(true);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    if (slug) load();
    return () => controller.abort();
  }, [slug]);

  const handlePlayAll = () => { if (!playlist?.tracks.length) return; const tracks = playlist.tracks.map(({ track }) => track); setQueue(tracks, 0); play(tracks[0]); };
  const handleShuffle = () => { if (!playlist?.tracks.length) return; const tracks = [...playlist.tracks.map(({ track }) => track)]; for (let index = tracks.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [tracks[index], tracks[swap]] = [tracks[swap], tracks[index]]; } setQueue(tracks, 0); play(tracks[0]); };

  if (isLoading) return <div className="page-shell flex min-h-screen flex-col"><Header /><main className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-[var(--color-primary)]" /></main><Footer /></div>;
  if (error || !playlist) return <div className="page-shell flex min-h-screen flex-col"><Header /><main className="flex flex-1 flex-col items-center justify-center p-8 text-center"><ListMusic size={42} className="mb-6 opacity-25" /><h1 className="font-[var(--font-editorial)] text-5xl font-normal">{locale === "fr" ? "Playlist non trouvée" : "Playlist not found"}</h1><Link href="/playlists" className="mt-8"><Button variant="outline"><ArrowLeft size={17} /> {t("common.back")}</Button></Link></main><Footer /></div>;

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-28 pt-[70px]">
        <div className="mx-auto max-w-[1700px] px-4 py-6 lg:px-8"><Link href="/playlists" className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={17} /> {t("common.playlists")}</Link></div>
        <section className="mx-auto grid max-w-[1700px] gap-12 px-4 py-8 lg:px-8 md:grid-cols-12 md:py-16"><MediaReveal className="relative aspect-square md:col-span-6" direction="left">{playlist.cover ? <Image src={playlist.cover} alt={playlist.title} fill priority sizes="(max-width:768px) 100vw, 50vw" className="object-cover" /> : <div className="flex h-full items-center justify-center bg-[var(--surface-soft)]"><ListMusic size={110} className="opacity-20" /></div>}</MediaReveal><motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col justify-center md:col-span-5 md:col-start-8">{playlist.category && <Tag variant="genre" className="mb-5 self-start">{playlist.category}</Tag>}<h1 className="font-[var(--font-editorial)] text-[clamp(4.5rem,8vw,9rem)] font-normal leading-[.78] tracking-[-.06em]">{playlist.title}</h1>{playlist.description && <p className="mt-8 text-lg leading-relaxed text-[var(--text-muted)]">{playlist.description}</p>}<div className="mt-9 flex gap-6 font-mono text-[.65rem] uppercase tracking-[.1em] opacity-50"><span className="flex items-center gap-2"><Music size={14} />{playlist.trackCount} {playlist.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span><span className="flex items-center gap-2"><Clock size={14} />{formatDuration(playlist.totalDuration)}</span></div><div className="mt-10 flex flex-wrap items-center gap-3"><Button variant="primary" size="lg" onClick={handlePlayAll} disabled={!playlist.tracks.length}><Play size={18} fill="currentColor" /> {t("search.playSelection")}</Button><Button variant="outline" size="lg" onClick={handleShuffle} disabled={!playlist.tracks.length}><Shuffle size={18} /> {locale === "fr" ? "Aléatoire" : "Shuffle"}</Button><FavoriteButton type="playlist" itemId={playlist.id} size="lg" /></div></motion.div></section>
        <section className="mx-auto max-w-[1500px] px-4 py-16 lg:px-8 md:py-24"><h2 className="mb-10 font-[var(--font-editorial)] text-6xl font-normal tracking-[-.055em]">{t("catalog.tracks")}</h2>{playlist.tracks.length ? <div className="border-y border-[var(--line)] py-2">{playlist.tracks.map(({ track, album }, index) => <TrackRow key={track.id} track={track} album={album} index={index} />)}</div> : <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">{locale === "fr" ? "Cette playlist ne contient pas encore de pistes." : "This playlist does not contain any tracks yet."}</p>}</section>
      </main>
      <Footer /><MiniPlayer />
    </div>
  );
}
