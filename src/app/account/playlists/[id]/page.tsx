"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Pencil, Trash2, X } from "lucide-react";
import { TrackRow } from "@/components/features";
import { Button } from "@/components/ui";
import { useI18n } from "@/components/providers/I18nProvider";
import type { Album, Track } from "@/types";

interface MemberPlaylist { id: string; title: string; description?: string; tracks: Track[]; }

function albumFor(track: Track): Album {
  return { id: track.albumId, slug: track.albumSlug, title: track.albumTitle || "", cover: track.albumCover || "/images/placeholder-album.jpg", label: track.albumLabel || "Parigo", genres: track.genres, moods: track.moods, trackCount: 0 };
}

export default function MemberPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { locale } = useI18n();
  const [playlist, setPlaylist] = useState<MemberPlaylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}`, { cache: "no-store" });
    const payload = await response.json();
    if (response.ok) setPlaylist(payload.data?.playlist);
    else setError(payload.error?.message || "Playlist unavailable");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/user/playlists/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (response.ok) setPlaylist(payload.data?.playlist);
        else setError(payload.error?.message || "Playlist unavailable");
      })
      .catch((cause) => {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setError("Playlist unavailable");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  const rename = async () => {
    if (!playlist) return;
    const title = window.prompt(locale === "fr" ? "Nouveau nom" : "New name", playlist.title);
    if (!title?.trim()) return;
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), description: playlist.description || "" }) });
    if (response.ok) setPlaylist({ ...playlist, title: title.trim() });
  };

  const removePlaylist = async () => {
    if (!window.confirm(locale === "fr" ? "Supprimer définitivement cette playlist ?" : "Delete this playlist permanently?")) return;
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) router.push("/account/playlists");
  };

  const mutateTracks = async (action: "remove" | "reorder", trackIds: string[]) => {
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(id)}/tracks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, trackIds }) });
    if (response.ok) await load();
  };

  const move = (index: number, direction: -1 | 1) => {
    if (!playlist) return;
    const target = index + direction;
    if (target < 0 || target >= playlist.tracks.length) return;
    const tracks = [...playlist.tracks];
    [tracks[index], tracks[target]] = [tracks[target], tracks[index]];
    setPlaylist({ ...playlist, tracks });
    void mutateTracks("reorder", tracks.map((track) => track.id));
  };

  if (loading) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!playlist) return <div className="py-20 text-center"><p>{error}</p><Button variant="outline" className="mt-6" onClick={() => router.push("/account/playlists")}><ArrowLeft size={16} /> {locale === "fr" ? "Retour" : "Back"}</Button></div>;

  return <div className="space-y-8"><button type="button" onClick={() => router.push("/account/playlists")} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]"><ArrowLeft size={16} /> {locale === "fr" ? "Mes playlists" : "My playlists"}</button><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow text-[var(--signal-strong)]">Parigo</p><h1 className="mt-3 font-[var(--font-editorial)] text-6xl tracking-[-.05em]">{playlist.title}</h1>{playlist.description && <p className="mt-3 text-[var(--text-muted)]">{playlist.description}</p>}</div><div className="flex gap-2"><Button variant="outline" onClick={() => void rename()}><Pencil size={16} /> {locale === "fr" ? "Renommer" : "Rename"}</Button><Button variant="outline" onClick={() => void removePlaylist()} className="text-red-600"><Trash2 size={16} /> {locale === "fr" ? "Supprimer" : "Delete"}</Button></div></div>{playlist.tracks.length ? <div className="border-y border-[var(--line)]">{playlist.tracks.map((track, index) => <div key={track.id} className="grid grid-cols-[1fr_auto] items-center"><TrackRow track={track} album={albumFor(track)} index={index} queue={playlist.tracks} /><div className="flex"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="h-10 w-10 disabled:opacity-25" aria-label={locale === "fr" ? "Monter" : "Move up"}><ArrowUp size={16} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === playlist.tracks.length - 1} className="h-10 w-10 disabled:opacity-25" aria-label={locale === "fr" ? "Descendre" : "Move down"}><ArrowDown size={16} /></button><button type="button" onClick={() => void mutateTracks("remove", [track.id])} className="h-10 w-10 text-red-600" aria-label={locale === "fr" ? "Retirer" : "Remove"}><X size={16} /></button></div></div>)}</div> : <p className="border-y border-[var(--line)] py-20 text-center text-[var(--text-muted)]">{locale === "fr" ? "Cette playlist est vide." : "This playlist is empty."}</p>}</div>;
}
