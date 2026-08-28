"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, ListPlus, Play, Save, Sparkles, Trash2, X } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useShortlistStore } from "@/stores/shortlist-store";
import { useSimilarityCapabilities } from "@/hooks/use-api";
import { usePlayerStore } from "@/stores/player-store";
import { useAuthModalStore } from "@/stores/auth-modal-store";
import { useSession } from "@/lib/auth-client";
import { useI18n } from "@/components/providers/I18nProvider";
import { Select } from "@/components/ui/Select";
import { CueSheetButton } from "./CueSheetButton";
import { formatParigoDate } from "@/lib/date-time";
import { setSimilarityHandoff } from "@/stores/similarity-handoff-store";
import type { Playlist } from "@/types";
import { EditorialEmptyState } from "@/components/ui/EditorialEmptyState";
import { emptyStateIllustrations } from "@/data/empty-state-illustrations";

export function ShortlistDrawer() {
  const { locale, t, localizedPath } = useI18n();
  const { data: session } = useSession();
  const openLogin = useAuthModalStore((state) => state.openLogin);
  const { items, isOpen, setOpen, remove, clear, move } = useShortlistStore();
  const similarityCapabilities = useSimilarityCapabilities();
  const { currentTrack, setQueue, play } = usePlayerStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [targetPlaylist, setTargetPlaylist] = useState("");
  const [saveMode, setSaveMode] = useState<"new" | "existing">("new");
  const [playlistTitle, setPlaylistTitle] = useState(
    () => `${locale === "fr" ? "Sélection Parigo" : "Parigo selection"} · ${formatParigoDate(new Date(), locale)}`,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageRequestId, setMessageRequestId] = useState("");
  const [saved, setSaved] = useState(false);
  const [playerClearance, setPlayerClearance] = useState<number | null>(null);

  useEffect(() => {
    if (!currentTrack) return;

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
    if (!message) return;
    const timeout = window.setTimeout(() => {
      setMessage("");
      setMessageRequestId("");
    }, saved ? 4500 : 7000);
    return () => window.clearTimeout(timeout);
  }, [message, saved]);

  const tracks = items.map((item) => item.track);
  const effectivePlayerClearance = currentTrack ? playerClearance : null;
  const playAll = () => { if (!tracks.length) return; setQueue(tracks, 0); play(tracks[0]); };

  const saveToPlaylist = async (existingId?: string) => {
    if (!session?.user) { setOpen(false); openLogin(); return; }
    setSaving(true);
    setMessage("");
    setMessageRequestId("");
    setSaved(false);
    try {
      let playlistId = existingId;
      if (!playlistId) {
        const title = playlistTitle.trim();
        if (!title) throw new Error(locale === "fr" ? "Donnez un nom à la playlist." : "Give the playlist a name.");
        const createResponse = await fetch("/api/user/playlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description: locale === "fr" ? "Créée depuis une sélection de travail Parigo" : "Created from a Parigo working selection",
            trackIds: tracks.map((track) => track.id),
          }),
        });
        const created = await createResponse.json();
        if (!createResponse.ok || !created.data?.playlist?.id || !created.data?.verified) {
          setMessageRequestId(created.error?.requestId || createResponse.headers.get("X-Request-ID") || "");
          throw new Error(created.error?.message || (locale === "fr" ? "La playlist n’a pas pu être créée." : "The playlist could not be created."));
        }
        playlistId = created.data.playlist.id;
      }
      if (!playlistId) throw new Error(locale === "fr" ? "La playlist cible est introuvable." : "The target playlist could not be found.");
      if (existingId) {
        const addResponse = await fetch(`/api/user/playlists/${encodeURIComponent(playlistId)}/tracks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", trackIds: tracks.map((track) => track.id) }),
        });
        const added = await addResponse.json();
        if (!addResponse.ok || !added.data?.updated || !added.data?.verified) {
          setMessageRequestId(added.error?.requestId || addResponse.headers.get("X-Request-ID") || "");
          throw new Error(added.error?.message || (locale === "fr" ? "Certaines pistes n’ont pas été confirmées dans la playlist Parigo. La sélection a été conservée." : "Some tracks were not confirmed in the Parigo playlist. The selection was kept."));
        }
      }
      setSaved(true);
      setMessage(locale === "fr" ? "Playlist enregistrée." : "Playlist saved.");
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
            style={effectivePlayerClearance === null ? undefined : { bottom: effectivePlayerClearance }}
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
          <motion.button aria-label={`${t("common.close")} ${t("search.shortlist")}`} className="parigo-modal-backdrop fixed inset-0 z-[79]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside role="dialog" aria-modal="true" aria-label={t("search.shortlist")} className="shortlist-drawer parigo-drawer parigo-drawer--right fixed bottom-0 right-0 top-0 z-[80] flex w-full max-w-lg flex-col bg-[var(--background)] p-5 text-[var(--foreground)] md:p-7" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}>
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-5"><div><p className="eyebrow text-[var(--color-primary-dark)]">{locale === "fr" ? "Sélection de travail" : "Working selection"}</p><h2 className="mt-1 font-[var(--font-editorial)] text-4xl font-normal">{t("search.shortlist")}</h2></div><button onClick={() => setOpen(false)} className="shortlist-icon-action shortlist-drawer__close flex h-11 w-11 items-center justify-center border border-[var(--line)]" aria-label={t("common.close")}><X size={19} /></button></div>
            {!session?.user && <p className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3 text-xs leading-5 text-[var(--text-muted)]">{locale === "fr" ? "Cette sélection est enregistrée uniquement sur cet appareil. " : "This selection is saved on this device only. "}<button type="button" onClick={() => { setOpen(false); openLogin(); }} className="font-semibold text-[var(--signal-strong)] underline decoration-current/35 underline-offset-4 transition hover:text-[var(--foreground)] focus-visible:rounded-sm">{locale === "fr" ? "Connectez-vous" : "Sign in"}</button>{locale === "fr" ? " pour la convertir en playlist Parigo, la partager ou générer un cue sheet." : " to convert it to a Parigo playlist, share it or generate a cue sheet."}</p>}
            <div className="flex-1 overflow-y-auto py-4">{items.length ? items.map((item, index) => {
              const albumTarget = localizedPath(`/albums/${item.track.albumSlug || item.track.albumId}`);
              const trackTarget = `${albumTarget}?track=${encodeURIComponent(item.track.id)}`;
              return (
                <article key={item.track.id} className="shortlist-track-row group relative grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] px-2 py-3">
                  <Link href={albumTarget} onClick={() => setOpen(false)} aria-label={`${locale === "fr" ? "Voir l’album" : "View album"} ${item.track.albumTitle || ""}`} className="relative h-12 w-12 overflow-hidden bg-[var(--surface-soft)] outline-none ring-[var(--signal-strong)] focus-visible:ring-2">
                    <Image src={item.track.albumCover || "/images/placeholder-album.svg"} alt="" fill sizes="48px" className="object-cover transition duration-300 group-hover:scale-[1.04]" />
                  </Link>
                  <div className="min-w-0">
                    <span className="mb-1 block font-mono text-[.54rem] text-[var(--text-muted)]">{String(index + 1).padStart(2,"0")}</span>
                    <Link href={trackTarget} onClick={() => setOpen(false)} className="shortlist-track-row__title block truncate text-sm font-semibold transition-colors hover:text-[var(--signal-strong)] focus-visible:text-[var(--signal-strong)] focus-visible:outline-none">{item.track.title}</Link>
                    {item.track.albumTitle && <Link href={albumTarget} onClick={() => setOpen(false)} className="mt-1 block truncate text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--foreground)] focus-visible:text-[var(--foreground)] focus-visible:outline-none">{item.track.albumTitle}</Link>}
                  </div>
                  <div className="flex gap-0.5">
                    <button type="button" disabled={index === 0} onClick={() => move(item.track.id, -1)} className="shortlist-icon-action flex h-9 w-8 items-center justify-center text-[var(--text-muted)] disabled:opacity-20" aria-label={locale === "fr" ? "Monter" : "Move up"}><ArrowUp size={14} /></button>
                    <button type="button" disabled={index === items.length - 1} onClick={() => move(item.track.id, 1)} className="shortlist-icon-action flex h-9 w-8 items-center justify-center text-[var(--text-muted)] disabled:opacity-20" aria-label={locale === "fr" ? "Descendre" : "Move down"}><ArrowDown size={14} /></button>
                    <button type="button" onClick={() => remove(item.track.id)} data-tone="danger" className="shortlist-icon-action flex h-9 w-8 items-center justify-center text-[var(--text-muted)]" aria-label={`${t("search.removeShortlist")} : ${item.track.title}`}><Trash2 size={15} /></button>
                  </div>
                </article>
              );
            }) : <EditorialEmptyState image={emptyStateIllustrations.shortlist.src} imageAlt={emptyStateIllustrations.shortlist.alt(locale)} imageClassName={emptyStateIllustrations.shortlist.imageClassName} title={locale === "fr" ? "Votre sélection est vide" : "Your selection is empty"} description={locale === "fr" ? "Ajoutez des pistes depuis une recherche, un album ou une playlist. Elles apparaîtront ici dans l’ordre de votre choix." : "Add tracks from a search, album or playlist. They will appear here in your chosen order."} headingLevel={3} layout="stacked" testId="empty-shortlist" className="mx-auto max-w-sm" />}</div>
            {message && <div role={saved ? "status" : "alert"} className={`mb-3 grid grid-cols-[1.75rem_minmax(0,1fr)_1.75rem] items-center border p-3 text-center text-xs leading-5 ${saved ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}><span aria-hidden="true" /><div className="min-w-0"><p>{message}</p>{messageRequestId && <p className="mt-1 font-mono text-[.62rem] opacity-65">{locale === "fr" ? "Référence" : "Reference"} : {messageRequestId}</p>}</div><button type="button" onClick={() => { setMessage(""); setMessageRequestId(""); }} className="shortlist-icon-action flex h-7 w-7 shrink-0 items-center justify-center border border-current/25" aria-label={locale === "fr" ? "Fermer le message" : "Dismiss message"}><X size={13} /></button></div>}
            {session?.user && items.length > 0 && <div className="shortlist-save-card parigo-frame mb-3 grid gap-3 border border-[var(--line)] bg-[var(--surface)] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{locale === "fr" ? "Enregistrer la shortlist" : "Save shortlist"}</p><div className="shortlist-save-card__cue"><CueSheetButton compact title={locale === "fr" ? "Sélection Parigo" : "Parigo selection"} trackIds={tracks.map((track) => track.id)} /></div></div><div role="group" aria-label={locale === "fr" ? "Destination de la shortlist" : "Shortlist destination"} className="shortlist-save-card__toggle search-view-toggle grid grid-cols-2 text-xs font-semibold"><button type="button" aria-pressed={saveMode === "new"} onClick={() => setSaveMode("new")} className="min-h-9 px-2">{locale === "fr" ? "Nouvelle playlist" : "New playlist"}</button><button type="button" aria-pressed={saveMode === "existing"} onClick={() => setSaveMode("existing")} className="min-h-9 px-2">{locale === "fr" ? "Playlist existante" : "Existing playlist"}</button></div>{saveMode === "new" ? <><label htmlFor="shortlist-playlist-title" className="sr-only">{locale === "fr" ? "Nom de la nouvelle playlist" : "New playlist name"}</label><input id="shortlist-playlist-title" value={playlistTitle} onChange={(event) => setPlaylistTitle(event.target.value)} maxLength={160} className="shortlist-save-card__input h-11 border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none" /><button type="button" onClick={() => void saveToPlaylist()} disabled={saving || !playlistTitle.trim()} className="shortlist-save-action flex min-h-11 items-center justify-center gap-2 bg-[var(--foreground)] px-3 text-sm font-semibold text-[var(--background)] disabled:opacity-50">{saving ? <ParigoLoader size="icon" label={locale === "fr" ? "Création de la playlist" : "Creating playlist"} /> : <Save size={16} />}{locale === "fr" ? "Créer la playlist" : "Create playlist"}</button></> : <><Select value={targetPlaylist} onValueChange={setTargetPlaylist} ariaLabel={locale === "fr" ? "Playlist existante" : "Existing playlist"} caption="Playlist" className="shortlist-playlist-select min-w-0" placement="top" listboxClassName="shortlist-playlist-select__list max-h-[min(18rem,48vh)]" options={[{ value: "", label: locale === "fr" ? "Choisir une playlist…" : "Choose a playlist…", description: locale === "fr" ? "Destination de votre sélection" : "Selection destination" }, ...playlists.map((playlist) => ({ value: playlist.id, label: playlist.title, description: `${playlist.trackCount ?? playlist.trackIds?.length ?? 0} ${locale === "fr" ? "pistes" : "tracks"}` }))]} /><button type="button" disabled={!targetPlaylist || saving} onClick={() => void saveToPlaylist(targetPlaylist)} className="shortlist-save-action flex min-h-11 items-center justify-center gap-2 border border-[var(--line)] px-3 text-sm font-semibold disabled:opacity-40">{saving ? <ParigoLoader size="icon" label={locale === "fr" ? "Ajout à la playlist" : "Adding playlist"} /> : <Save size={16} />}{locale === "fr" ? "Ajouter à la playlist" : "Add to playlist"}</button></>}</div>}
            {similarityCapabilities.data?.track.enabled && items.length > 0 && <Link href={localizedPath("/search?mode=ai&source=track&pick=1")} onClick={() => { setSimilarityHandoff({ source: "track", openPicker: true }); setOpen(false); }} className="mb-3 flex min-h-12 items-center justify-center gap-2 border border-[var(--ai-search)] text-sm font-semibold text-[var(--ai-search)] transition hover:bg-[color-mix(in_srgb,var(--ai-search)_9%,var(--surface))]"><Sparkles size={16} />{locale === "fr" ? "Choisir des références pour la similarité" : "Choose similarity references"}</Link>}
            <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-[var(--line)] pt-5"><button onClick={playAll} disabled={!items.length} className="shortlist-footer-action shortlist-footer-action--play flex min-h-12 items-center justify-center gap-2 bg-[var(--signal)] font-semibold text-[#11120f] disabled:cursor-not-allowed disabled:opacity-35"><Play size={17} fill="currentColor" /> {t("search.playSelection")}</button><button onClick={clear} disabled={!items.length} className="shortlist-footer-action shortlist-footer-action--clear flex min-h-12 items-center justify-center border border-[var(--line)] px-4 text-sm disabled:opacity-30">{saved ? <Check className="mr-1" size={15} /> : null}{t("search.clearShortlist")}</button></div>
          </motion.aside>
        </>}
      </AnimatePresence>
    </>
  );
}
