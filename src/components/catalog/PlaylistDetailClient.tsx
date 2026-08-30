"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, Check, Clock, Copy, ListMusic, Music, Play, Shuffle } from "lucide-react";
import { TrackRow } from "@/components/features/TrackRow";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { useI18n } from "@/components/providers/I18nProvider";
import { usePlayerStore } from "@/stores/player-store";
import { formatDuration } from "@/lib/utils";
import type { Album, Track } from "@/types";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { ContextualBackLink } from "@/components/navigation/ContextualBackLink";
import { Tooltip } from "@/components/ui/Tooltip";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useAuthModalStore } from "@/stores/auth-modal-store";

export interface PlaylistDetail { id: string; slug?: string; title: string; description?: string; cover: string; category?: string; trackCount?: number; totalDuration: number; isFeatured?: boolean; tracks: Track[]; }

function albumFor(track: Track): Album {
  return { id: track.albumId, slug: track.albumSlug, title: track.albumTitle || "", code: track.albumCode || track.cdCode, cover: track.albumCover || "/images/placeholder-album.svg", label: track.albumLabel || "", labelSlug: track.albumLabelSlug, genres: track.genres, moods: track.moods, trackCount: 0 };
}

export function PlaylistDetailClient({ playlist }: { playlist: PlaylistDetail }) {
  const { locale, t, localizedPath } = useI18n();
  const { data: session } = useSession();
  const openLogin = useAuthModalStore((state) => state.openLogin);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [copiedPlaylistId, setCopiedPlaylistId] = useState("");
  const { play, setQueue } = usePlayerStore();

  const handlePlayAll = () => { if (!playlist?.tracks.length) return; setQueue(playlist.tracks, 0); play(playlist.tracks[0]); };
  const handleShuffle = () => { if (!playlist?.tracks.length) return; const tracks = [...playlist.tracks]; for (let index = tracks.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [tracks[index], tracks[swap]] = [tracks[swap], tracks[index]]; } setQueue(tracks, 0); play(tracks[0]); };
  const handleSave = async () => {
    if (!playlist) return;
    if (!session?.user) {
      openLogin();
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/user/playlists/copy-featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId: playlist.id, trackIds: playlist.tracks.map((track) => track.id) }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.copied || !payload?.data?.playlist?.id) {
        throw new Error(payload?.error?.message || "copy failed");
      }
      setCopiedPlaylistId(payload.data.playlist.id);
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error && error.message !== "copy failed"
        ? error.message
        : locale === "fr"
          ? "La playlist n’a pas pu être copiée. Réessayez."
          : "The playlist could not be copied. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-[var(--space-page-end)] pt-[var(--space-contextual-back-page-top)] md:pt-[88px]">
        <div className="mx-auto max-w-[1500px] px-[var(--space-page-gutter)] md:pt-[var(--space-divider-content)]"><ContextualBackLink href={localizedPath("/playlists")} className="hover:text-[var(--foreground)]"><ArrowLeft size={17} /> {t("common.back")}</ContextualBackLink></div>
        <section className="editorial-detail-hero relative mx-auto grid max-w-[1500px] items-center gap-[var(--space-block-gap)] overflow-hidden px-[var(--space-page-gutter)] pb-0 pt-[var(--space-contextual-back-gap)] md:pt-[var(--space-section-y)] lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
          <div className="relative aspect-square w-full max-w-[420px] overflow-hidden rounded-[1.1rem] border border-[var(--line)] bg-[var(--surface-soft)] shadow-[0_22px_70px_rgba(15,22,16,.10)]">{playlist.cover ? <Image src={playlist.cover} alt={playlist.title} fill priority sizes="(max-width:768px) 92vw, 420px" className="object-contain" /> : <div className="flex h-full items-center justify-center bg-[var(--surface-soft)]"><ListMusic size={92} className="opacity-20" /></div>}</div>
          <div className="flex max-w-3xl animate-[fade-in_.3s_ease-out_both] flex-col justify-center">
            {playlist.category && <Tag variant="genre" className="mb-5 self-start">{playlist.category.toLowerCase() === "curated" ? (locale === "fr" ? "Sélection Parigo" : "Parigo selection") : playlist.category}</Tag>}
            <SignedTitle className="font-[var(--font-editorial)] text-[clamp(3.2rem,6vw,7rem)] font-normal leading-[.88] tracking-[-.058em]">{playlist.title}</SignedTitle>
            {playlist.description && <p className="mt-7 max-w-2xl text-base leading-relaxed text-[var(--text-muted)] md:text-lg">{playlist.description}</p>}
            <div data-testid="playlist-mobile-summary" className="mt-8 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-y border-[var(--line)] py-3 md:hidden">
              <div className="grid min-w-0 gap-2 font-mono text-[.62rem] uppercase tracking-[.08em] text-[var(--text-muted)]"><span className="flex min-w-0 items-center gap-2"><Music size={14} className="shrink-0" />{playlist.trackCount} {playlist.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span><span className="flex min-w-0 items-center gap-2"><Clock size={14} className="shrink-0" />{formatDuration(playlist.totalDuration)}</span></div>
              <div className="flex items-center gap-2">
                <Tooltip label={t("search.playSelection")}><button type="button" onClick={handlePlayAll} disabled={!playlist.tracks.length} className="grid h-12 w-12 place-items-center rounded-[var(--parigo-corner-md)_var(--parigo-turn-md)] bg-[var(--signal)] text-[#0d1c11] disabled:opacity-40" aria-label={t("search.playSelection")}><Play size={19} fill="currentColor" /></button></Tooltip>
                <Tooltip label={locale === "fr" ? "Lecture aléatoire" : "Shuffle playback"}><button type="button" onClick={handleShuffle} disabled={!playlist.tracks.length} className="grid h-12 w-12 place-items-center rounded-[var(--parigo-corner-md)_var(--parigo-turn-md)] border border-[var(--line-strong)] disabled:opacity-40" aria-label={locale === "fr" ? "Lecture aléatoire" : "Shuffle playback"}><Shuffle size={19} /></button></Tooltip>
                <Tooltip label={saved ? (locale === "fr" ? "Playlist ajoutée" : "Playlist saved") : (locale === "fr" ? "Copier dans mes playlists" : "Copy to my playlists")}><button type="button" onClick={() => void handleSave()} disabled={saved || saving} className="grid h-12 w-12 place-items-center rounded-[var(--parigo-corner-md)_var(--parigo-turn-md)] border border-[var(--line-strong)] disabled:text-[var(--signal-strong)]" aria-label={saved ? (locale === "fr" ? "Playlist ajoutée" : "Playlist saved") : (locale === "fr" ? "Copier dans mes playlists" : "Copy to my playlists")}>{saved ? <Check size={19} /> : <Copy size={19} className={saving ? "animate-pulse" : undefined} />}</button></Tooltip>
              </div>
            </div>
            <div className="mt-8 hidden flex-wrap gap-6 border-y border-[var(--line)] py-5 font-mono text-[.65rem] uppercase tracking-[.1em] text-[var(--text-muted)] md:flex"><span className="flex items-center gap-2"><Music size={14} />{playlist.trackCount} {playlist.trackCount === 1 ? t("catalog.track") : t("catalog.tracks")}</span><span className="flex items-center gap-2"><Clock size={14} />{formatDuration(playlist.totalDuration)}</span></div>
            <div className="mt-8 hidden flex-wrap items-center gap-3 md:flex"><Button variant="primary" size="lg" onClick={handlePlayAll} disabled={!playlist.tracks.length}><Play size={18} fill="currentColor" /> {t("search.playSelection")}</Button><Button variant="outline" size="lg" onClick={handleShuffle} disabled={!playlist.tracks.length}><Shuffle size={18} /> {locale === "fr" ? "Aléatoire" : "Shuffle"}</Button><Button variant="outline" size="lg" onClick={handleSave} disabled={saved || saving}>{saved ? (locale === "fr" ? "Ajoutée" : "Saved") : saving ? (locale === "fr" ? "Copie…" : "Copying…") : (locale === "fr" ? "Copier dans mes playlists" : "Copy to my playlists")}</Button></div>
            {saved && copiedPlaylistId ? <p role="status" className="mt-4 text-sm text-[var(--signal-strong)]">{locale === "fr" ? "La playlist et toutes ses pistes ont été copiées." : "The playlist and all its tracks were copied."} <Link href={localizedPath(`/account/playlists/${copiedPlaylistId}`)} className="border-b border-current font-semibold">{locale === "fr" ? "Ouvrir ma copie" : "Open my copy"}</Link></p> : null}
            {saveError ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{saveError}</p> : null}
          </div>
        </section>
        <section className="mx-auto max-w-[1500px] px-[var(--space-page-gutter)] pb-0 pt-[var(--space-section-y)]"><SignedTitle as="h2" className="mb-[var(--space-heading-content)] font-[var(--font-editorial)] text-6xl font-normal tracking-[-.055em]">{t("catalog.tracks")}</SignedTitle>{playlist.tracks.length ? <div className="border-y border-[var(--line)] py-2">{playlist.tracks.map((track, index) => <TrackRow key={track.id} track={track} album={albumFor(track)} index={index} mobileLayout="dense" />)}</div> : <p className="border-y border-[var(--line)] py-16 text-center text-[var(--text-muted)]">{locale === "fr" ? "Cette playlist ne contient pas encore de pistes." : "This playlist does not contain any tracks yet."}</p>}</section>
      </main>
      <Footer />
    </div>
  );
}
