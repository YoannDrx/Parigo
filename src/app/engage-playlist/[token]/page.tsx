"use client";

import { use, useEffect, useMemo, useState } from "react";
import { Loader2, Share2 } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { TrackRow } from "@/components/features/TrackRow";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Album, Track } from "@/types";

interface SharedPlaylist {
  id: string;
  title: string;
  description?: string;
  tracks: Track[];
}

export default function EngagePlaylistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { locale } = useI18n();
  const [playlists, setPlaylists] = useState<SharedPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/engage-playlist/${encodeURIComponent(token)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message || "Shared playlist unavailable");
        setPlaylists(payload.data?.playlists || []);
      })
      .catch((cause) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "Shared playlist unavailable");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [token]);

  const albumFor = useMemo(() => (track: Track): Album => ({
    id: track.albumId,
    slug: track.albumSlug,
    title: track.albumTitle || "",
    cover: track.albumCover || "/images/placeholder-album.jpg",
    label: track.albumLabel || "Parigo",
    genres: track.genres,
    moods: track.moods,
    trackCount: 0,
  }), []);

  return <div className="page-shell flex min-h-screen flex-col"><Header /><main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-28 pt-32 lg:px-8">{loading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="animate-spin" /></div> : error || !playlists.length ? <div className="py-24 text-center"><Share2 className="mx-auto mb-6 opacity-30" size={44} /><h1 className="font-[var(--font-editorial)] text-5xl">{locale === "fr" ? "Playlist partagée indisponible" : "Shared playlist unavailable"}</h1><p className="mt-4 text-[var(--text-muted)]">{error}</p></div> : playlists.map((playlist) => <section key={playlist.id} className="mb-20"><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Playlist partagée" : "Shared playlist"}</p><h1 className="mt-5 font-[var(--font-editorial)] text-6xl tracking-[-.05em] md:text-8xl">{playlist.title}</h1>{playlist.description && <p className="mt-6 max-w-2xl text-[var(--text-muted)]">{playlist.description}</p>}<div className="mt-12 border-y border-[var(--line)]">{playlist.tracks.map((track, index) => <TrackRow key={track.id} track={track} album={albumFor(track)} index={index} queue={playlist.tracks} />)}</div></section>)}</main><Footer /></div>;
}
