"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, ListPlus, Loader2, Play, Save, Trash2, X } from "lucide-react";
import { useShortlistStore } from "@/stores/shortlist-store";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";
import { Select } from "@/components/ui/Select";
import { CueSheetButton } from "./CueSheetButton";
import type { Playlist } from "@/types";

export function ShortlistDrawer() {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const openLogin = useAuthModalStore((state) => state.openLogin);
  const { items, isOpen, setOpen, remove, clear, move } = useShortlistStore();
  const { currentTrack, setQueue, play } = usePlayerStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [targetPlaylist, setTargetPlaylist] = useState("");
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [playerClearance, setPlayerClearance] = useState<number | null>(null);

  useEffect(() => {
    if (!currentTrack) {
      setPlayerClearance(null);
      return;
    }

    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let positionFrame = 0;
    let removeResizeListener: () => void = () => {};

    const connectToPlayer = () => {
      const dock = document.querySelector<HTMLElement>("[data-testid='player-dock']");
      if (!dock) return false;

      const measure = () => {
        const dockBottom = Number.parseFloat(window.getComputedStyle(dock).bottom) || 0;
        setPlayerClearance(Math.max(0, dockBottom + dock.offsetHeight + 12));
      };

      measure();
      const motionStartedAt = performance.now();
      const followPlayerEntrance = () => {
        measure();
        if (performance.now() - motionStartedAt < 650) {
          positionFrame = window.requestAnimationFrame(followPlayerEntrance);
        }
      };
      positionFrame = window.requestAnimationFrame(followPlayerEntrance);
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(dock);
      window.addEventListener("resize", measure);
      removeResizeListener = () => window.removeEventListener("resize", measure);
      return true;
    };

    if (!connectToPlayer()) {
      mutationObserver = new MutationObserver(() => {
        if (connectToPlayer()) mutationObserver?.disconnect();
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      window.cancelAnimationFrame(positionFrame);
      removeResizeListener();
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [currentTrack]);

  useEffect(() => {
    if (!isOpen || !session?.user) return;
    void fetch("/api/user/playlists", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setPlaylists(payload?.data?.playlists ?? []));
  }, [isOpen, session?.user]);

  useEffect(() => {
    if (playlistTitle || !isOpen) return;
    setPlaylistTitle(`${locale === "fr" ? "Sélection Parigo" : "Parigo selection"} · ${new Date().toLocaleDateString(locale)}`);
  }, [isOpen, locale, playlistTitle]);

  const tracks = items.map((item) => item.track);
  const playAll = () => { if (!tracks.length) return; setQueue(tracks, 0); play(tracks[0]); };

  const saveToPlaylist = async (existingId?: string) => {
    if (!session?.user) { setOpen(false); openLogin(); return; }
    setSaving(true);
    setMessage("");
    setSaved(false);
    try {
      let playlistId = existingId;
      if (!playlistId) {
        const title = playlistTitle.trim();
        if (!title) throw new Error(locale === "fr" ? "Donnez un nom à la playlist." : "Give the playlist a name.");
        const createResponse = await fetch("/api/user/playlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description: locale === "fr" ? "Créée depuis une sélection de travail Parigo" : "Created from a Parigo working selection" }),
        });
        const created = await createResponse.json();
        if (!createResponse.ok || !created.data?.playlist?.id) throw new Error(created.error?.message || (locale === "fr" ? "La playlist n’a pas pu être créée." : "The playlist could not be created."));
        playlistId = created.data.playlist.id;
      }
      if (!playlistId) throw new Error(locale === "fr" ? "La playlist cible est introuvable." : "The target playlist could not be found.");
      const addResponse = await fetch(`/api/user/playlists/${encodeURIComponent(playlistId)}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", trackIds: tracks.map((track) => track.id) }),
      });
      const added = await addResponse.json();
      if (!addResponse.ok || !added.data?.updated || !added.data?.verified) throw new Error(added.error?.message || (locale === "fr" ? "Certaines pistes n’ont pas été confirmées dans la playlist Parigo. La sélection a été conservée." : "Some tracks were not confirmed in the Parigo playlist. The selection was kept."));
      setSaved(true);
      setMessage(locale === "fr" ? "La playlist Parigo a été vérifiée. Vous pouvez maintenant vider cette sélection." : "The Parigo playlist was verified. You can now clear this selection.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (locale === "fr" ? "La sélection a été conservée après une erreur." : "The selection was kept after an error."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {items.length > 0 && (
          <motion.button
            data-shortlist-trigger
            onClick={() => setOpen(true)}
            className="group fixed bottom-[max(.5rem,env(safe-area-inset-bottom))] right-3 z-[58] flex h-14 max-w-[4.65rem] items-center gap-2 overflow-hidden rounded-full bg-[var(--signal)] px-3 text-sm font-semibold text-[#11120f] shadow-[var(--shadow-md)] transition-[bottom,max-width,transform,box-shadow,opacity] duration-300 hover:max-w-[11rem] hover:-translate-y-0.5 hover:shadow-lg focus-visible:max-w-[11rem] md:bottom-3 md:right-5"
            style={playerClearance === null ? undefined : { bottom: playerClearance }}
            initial={{ opacity: 0, scale: 0.84, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 8 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            aria-label={`${t("common.open")} ${t("search.shortlist")}, ${items.length} ${items.length > 1 ? t("catalog.tracks") : t("catalog.track")}`}
          >
            <ListPlus size={19} className="shrink-0" />
            <span className="shrink-0 rounded-full bg-black/12 px-2 py-0.5 font-mono text-xs">{items.length}</span>
            <span className="max-w-0 shrink-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-300 group-hover:max-w-24 group-hover:opacity-100 group-focus-visible:max-w-24 group-focus-visible:opacity-100">{locale === "fr" ? "Sélection" : "Selection"}</span>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && <>
          <motion.button aria-label={`${t("common.close")} ${t("search.shortlist")}`} className="fixed inset-0 z-[79] bg-black/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside role="dialog" aria-modal="true" aria-label={t("search.shortlist")} className="parigo-drawer parigo-drawer--right fixed bottom-0 right-0 top-0 z-[80] flex w-full max-w-lg flex-col bg-[var(--background)] p-5 text-[var(--foreground)] md:p-7" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}>
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-5"><div><p className="eyebrow text-[var(--color-primary-dark)]">{locale === "fr" ? "Sélection de travail" : "Working selection"}</p><h2 className="mt-1 font-[var(--font-editorial)] text-4xl font-normal">{t("search.shortlist")}</h2></div><button onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)]" aria-label={t("common.close")}><X size={19} /></button></div>
            {!session?.user && <p className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3 text-xs leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Cette sélection est enregistrée uniquement sur cet appareil. " : "This selection is saved on this device only. "}<button type="button" onClick={() => { setOpen(false); openLogin(); }} className="font-semibold text-[var(--signal-strong)] underline decoration-current/35 underline-offset-4 transition hover:text-[var(--foreground)] focus-visible:rounded-sm">{locale === "fr" ? "Connectez-vous" : "Sign in"}</button>{locale === "fr" ? " pour la convertir en playlist Parigo, la partager ou générer un cue sheet." : " to convert it to a Parigo playlist, share it or generate a cue sheet."}</p>}
            <div className="flex-1 overflow-y-auto py-4">{items.length ? items.map((item, index) => <div key={item.track.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[var(--line)] py-4"><span className="font-mono text-xs opacity-35">{String(index + 1).padStart(2,"0")}</span><div className="min-w-0"><p className="truncate font-semibold">{item.track.title}</p><p className="truncate text-sm opacity-48">{item.track.albumTitle}</p></div><div className="flex"><button type="button" disabled={index === 0} onClick={() => move(item.track.id, -1)} className="flex h-9 w-9 items-center justify-center disabled:opacity-20" aria-label={locale === "fr" ? "Monter" : "Move up"}><ArrowUp size={14} /></button><button type="button" disabled={index === items.length - 1} onClick={() => move(item.track.id, 1)} className="flex h-9 w-9 items-center justify-center disabled:opacity-20" aria-label={locale === "fr" ? "Descendre" : "Move down"}><ArrowDown size={14} /></button><button onClick={() => remove(item.track.id)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-current/[.06]" aria-label={`${t("search.removeShortlist")} : ${item.track.title}`}><Trash2 size={15} /></button></div></div>) : <div className="mx-auto max-w-sm py-12 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--signal-strong)]/40 text-[var(--signal-strong)]"><ListPlus size={25} /></span><h3 className="mt-5 text-2xl">{locale === "fr" ? "Votre sélection est vide" : "Your selection is empty"}</h3><p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{locale === "fr" ? "Dans une liste de pistes, utilisez le bouton + entouré de vert. Les pistes ajoutées apparaîtront ici, dans l’ordre de votre choix." : "In any track list, use the green outlined + button. Added tracks will appear here in your chosen order."}</p><ol className="mt-7 grid gap-2 text-left text-xs text-[var(--text-muted)]"><li><b className="mr-2 text-[var(--foreground)]">01</b>{locale === "fr" ? "Ajoutez des pistes depuis la recherche, un album ou une playlist." : "Add tracks from search, an album or a playlist."}</li><li><b className="mr-2 text-[var(--foreground)]">02</b>{locale === "fr" ? "Réordonnez et écoutez votre sélection." : "Reorder and listen to your selection."}</li><li><b className="mr-2 text-[var(--foreground)]">03</b>{locale === "fr" ? "Connectez-vous pour la convertir en playlist Parigo." : "Sign in to convert it to a Parigo playlist."}</li></ol></div>}</div>
            {message && <p role="status" className={`mb-3 rounded-lg border p-3 text-xs leading-5 ${saved ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>{message}</p>}
            {session?.user && items.length > 0 && <div className="mb-3 grid gap-2 rounded-lg border border-[var(--line)] p-3"><p className="mb-1 text-xs leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Parigo crée d’abord la playlist, ajoute toutes les pistes, puis vérifie leur présence à distance. Votre sélection locale n’est jamais vidée automatiquement." : "Parigo first creates the playlist, adds every track, then verifies them remotely. Your local selection is never cleared automatically."}</p><label htmlFor="shortlist-playlist-title" className="mt-1 text-[.65rem] font-semibold uppercase tracking-[.09em] text-[var(--text-muted)]">{locale === "fr" ? "Nom de la nouvelle playlist" : "New playlist name"}</label><input id="shortlist-playlist-title" value={playlistTitle} onChange={(event) => setPlaylistTitle(event.target.value)} maxLength={160} className="h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none transition focus:border-[var(--signal-strong)]" /><button type="button" onClick={() => void saveToPlaylist()} disabled={saving || !playlistTitle.trim()} className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--foreground)] px-3 text-sm font-semibold text-[var(--background)] disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}{locale === "fr" ? "Créer et vérifier la playlist" : "Create and verify playlist"}</button>{playlists.length > 0 && <div className="flex gap-2"><Select value={targetPlaylist} onValueChange={setTargetPlaylist} ariaLabel={locale === "fr" ? "Playlist existante" : "Existing playlist"} className="min-w-0 flex-1" options={[{ value: "", label: locale === "fr" ? "Ajouter à une playlist…" : "Add to a playlist…" }, ...playlists.map((playlist) => ({ value: playlist.id, label: playlist.title }))]} /><button type="button" disabled={!targetPlaylist || saving} onClick={() => void saveToPlaylist(targetPlaylist)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-xs font-semibold disabled:opacity-40">{locale === "fr" ? "Ajouter" : "Add"}</button></div>}<CueSheetButton title={locale === "fr" ? "Sélection Parigo" : "Parigo selection"} trackIds={tracks.map((track) => track.id)} /></div>}
            <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-[var(--line)] pt-5"><button onClick={playAll} disabled={!items.length} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--signal)] font-semibold text-[#11120f] disabled:cursor-not-allowed disabled:opacity-35"><Play size={17} fill="currentColor" /> {t("search.playSelection")}</button><button onClick={clear} disabled={!items.length} className="flex min-h-12 items-center justify-center rounded-full border border-[var(--line)] px-4 text-sm disabled:opacity-30">{saved ? <Check className="mr-1" size={15} /> : null}{t("search.clearShortlist")}</button></div>
          </motion.aside>
        </>}
      </AnimatePresence>
    </>
  );
}
