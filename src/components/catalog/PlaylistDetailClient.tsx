"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, ListMusic, Music, Play, Shuffle } from "lucide-react";
import { TrackRow } from "@/components/features/TrackRow";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { useI18n } from "@/components/providers/I18nProvider";
import { usePlayerStore } from "@/stores/player-store";
import { formatDuration } from "@/lib/utils";
import type { Album, Track } from "@/types";

export interface PlaylistDetail { id: string; slug?: string; title: string; description?: string; cover: string; category?: string; trackCount?: number; totalDuration: number; isFeatured?: boolean; tracks: Track[]; }

function albumFor(track: Track): Album {
  return { id: track.albumId, slug: track.albumSlug, title: track.albumTitle || "", cover: track.albumCover || "/images/placeholder-album.jpg", label: track.albumLabel || "Parigo", labelSlug: track.albumLabelSlug, genres: track.genres, moods: track.moods, trackCount: 0 };
}

export function PlaylistDetailClient({ playlist }: { playlist: PlaylistDetail }) {
  const { locale, t, localizedPath } = useI18n();
  const [saved, setSaved] = useState(false);
  const { play, setQueue } = usePlayerStore();

  const handlePlayAll = () => { if (!playlist?.tracks.length) return; setQueue(playlist.tracks, 0); play(playlist.tracks[0]); };
  const handleShuffle = () => { if (!playlist?.tracks.length) return; const tracks = [...playlist.tracks]; for (let index = tracks.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [tracks[index], tracks[swap]] = [tracks[swap], tracks[index]]; } setQueue(tracks, 0); play(tracks[0]); };
  const handleSave = async () => {
    if (!playlist) return;
    const response = await fetch("/api/user/playlists/copy-featured", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playlistId: playlist.id }) });
    if (response.ok) setSaved(true);
  };

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-28 pt-[88px]">
        <div className="mx-auto max-w-[1500px] px-4 py-6 lg:px-8"><Link href={localizedPath("/playlists")} className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--foreground)]"><ArrowLeft size={17} /> {t("common.playlists")}</Link></div>
        <section className="mx-auto grid max-w-[1500px] items-center gap-10 px-4 pb-16 pt-5 lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)] lg:gap-16 lg:px-8 lg:pb-24">
          <div className="relative aspect-square w-full max-w-[420px] overflow-hidden rounded-[1.1rem] border border-[var(--line)] bg-[var(--surface-soft)] shadow-[0_22px_70px_rgba(15,22,16,.10)]">{playlist.cover ? <Image src={playlist.cover} alt={playlist.title} fill priority sizes="(max-width:768px) 92vw, 420px" className="object-contain" /> : <div className="flex h-full items-center justify-center bg-[var(--surface-soft)]"><ListMusic size={92} className="opacity-20" /></div>}</div>
          <div className="flex max-w-3xl animate-[fade-in_.3s_ease-out_both] flex-col justify-center">{playlist.category && <Tag variant="genre" className="mb-5 self-start">{playlist.category.toLowerCase() === "curated" ? (locale === "fr" ? "Sélection Parigo" : "Parigo selection") : playlist.category}</Tag>}<h1 className="font-[var(--font-editorial)] text-[clamp(3.2rem,6vw,7rem)] font-normal leading-[.88] tracking-[-.058em]">{playlist.title}</h1>{playlist.description && <p className="mt-7 max-w-2xl text-base leading-relaxed text-[var(--text-muted)] md:text-lg">{playlist.description}</p>}<div className="mt-8 flex flex-wrap gap-6 border-y border-[var(--line)] py-5 font-mono text-[.65rem] uppercase tracking-[.1em] text-[var(--text-muted)]"><span className="flex items-center gap-2"><Music size={14} />{playlist.trackCount} {playlist.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span><span className="flex items-center gap-2"><Clock size={14} />{formatDuration(playlist.totalDuration)}</span></div><div className="mt-8 flex flex-wrap items-center gap-3"><Button variant="primary" size="lg" onClick={handlePlayAll} disabled={!playlist.tracks.length}><Play size={18} fill="currentColor" /> {t("search.playSelection")}</Button><Button variant="outline" size="lg" onClick={handleShuffle} disabled={!playlist.tracks.length}><Shuffle size={18} /> {locale === "fr" ? "Aléatoire" : "Shuffle"}</Button><Button variant="outline" size="lg" onClick={handleSave} disabled={saved}>{saved ? (locale === "fr" ? "Ajoutée" : "Saved") : (locale === "fr" ? "Copier dans mes playlists" : "Copy to my playlists")}</Button></div></div>
        </section>
        <section className="mx-auto max-w-[1500px] px-4 py-16 lg:px-8 md:py-24"><h2 className="mb-10 font-[var(--font-editorial)] text-6xl font-normal tracking-[-.055em]">{t("catalog.tracks")}</h2>{playlist.tracks.length ? <div className="border-y border-[var(--line)] py-2">{playlist.tracks.map((track, index) => <TrackRow key={track.id} track={track} album={albumFor(track)} index={index} />)}</div> : <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">{locale === "fr" ? "Cette playlist ne contient pas encore de pistes." : "This playlist does not contain any tracks yet."}</p>}</section>
      </main>
      <Footer />
    </div>
  );
}
