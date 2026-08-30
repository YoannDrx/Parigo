"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, ListPlus, X } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { cn } from "@/lib/utils";
import type { Playlist } from "@/types";
import { AnchoredPopover } from "@/components/ui/AnchoredPopover";
import { Tooltip } from "@/components/ui/Tooltip";

export function AddToPlaylistButton({ trackId, trackTitle, className, mobileSheet = false, onOpen }: { trackId: string; trackTitle: string; className?: string; mobileSheet?: boolean; onOpen?: () => void }) {
  const { data: session } = useSession();
  const openLogin = useAuthModalStore((state) => state.openLogin);
  const { locale } = useI18n();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const show = async () => {
    if (!session?.user) {
      onOpen?.();
      openLogin();
      return;
    }
    setOpen(true);
    onOpen?.();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/user/playlists", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error("playlist fetch failed");
      setPlaylists(payload.data?.playlists ?? []);
    } catch {
      setPlaylists([]);
      setError(locale === "fr" ? "Vos playlists n’ont pas pu être chargées." : "Your playlists could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const add = async (playlist: Playlist) => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/user/playlists/${encodeURIComponent(playlist.id)}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", trackIds: [trackId] }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    setLoading(false);
    if (response?.ok && payload?.data?.verified) {
      setMessage(locale === "fr" ? `Ajouté à « ${playlist.title} »` : `Added to “${playlist.title}”`);
      window.setTimeout(() => setOpen(false), 900);
    } else {
      setError(payload?.error?.message || (locale === "fr"
        ? "Cette piste n’a pas pu être ajoutée à la playlist."
        : "This track could not be added to the playlist."));
    }
  };

  const label = locale === "fr" ? "Ajouter à une playlist" : "Add to playlist";
  return (
    <>
      <Tooltip label={label}><button ref={buttonRef} type="button" onClick={() => open ? setOpen(false) : void show()} disabled={loading && !open} aria-expanded={open} className={cn("flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-50", className)} aria-label={`${label} : ${trackTitle}`}>{loading && !open ? <ParigoLoader size="icon" label={locale === "fr" ? "Chargement des playlists" : "Loading playlists"} /> : <ListPlus size={17} className="text-[var(--color-gray-500)]" />}</button></Tooltip>
      <AnchoredPopover open={open} onClose={() => setOpen(false)} anchorRef={buttonRef} label={`${label} — ${trackTitle}`} width={304} mobileSheet={mobileSheet}>
        <div className="flex items-center justify-between border-b border-[var(--line)] px-2 pb-2"><div><p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Sélection personnelle" : "Personal selection"}</p><p className="mt-1 text-sm font-semibold">{locale === "fr" ? "Choisir une playlist" : "Choose a playlist"}</p></div><button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)]" aria-label={locale === "fr" ? "Fermer" : "Close"}><X size={14} /></button></div>
        {loading ? <div className="grid min-h-28 place-items-center"><ParigoLoader size="compact" label={locale === "fr" ? "Chargement des playlists" : "Loading playlists"} /></div> : playlists.length ? <div className="max-h-64 overflow-y-auto py-1">{playlists.map((playlist) => <button key={playlist.id} type="button" onClick={() => void add(playlist)} className="grid min-h-12 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] px-2 text-left transition last:border-0 hover:bg-[var(--signal-soft)]"><span className="truncate text-xs font-semibold">{playlist.title}</span><span className="font-mono text-[.6rem] text-[var(--text-muted)]">{playlist.trackCount ?? playlist.tracks?.length ?? 0}</span></button>)}</div> : !error && <div className="p-3"><p className="text-xs leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Aucune playlist pour le moment. Créez-en une, puis revenez ajouter cette piste." : "No playlist yet. Create one, then come back to add this track."}</p><Link href="/account/playlists" className="mt-3 inline-flex min-h-9 items-center border-b border-[var(--signal-strong)] text-xs font-semibold text-[var(--signal-strong)]">{locale === "fr" ? "Créer une playlist" : "Create a playlist"}</Link></div>}
        {message && <p role="status" className="flex items-center gap-1.5 border-t border-[var(--line)] p-3 text-xs font-semibold text-[var(--signal-strong)]"><Check size={14} />{message}</p>}
        {error && <p role="alert" className="border-t border-[var(--line)] p-3 text-xs leading-5 text-[var(--danger)]">{error}</p>}
      </AnchoredPopover>
    </>
  );
}
