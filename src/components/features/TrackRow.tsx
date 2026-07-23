"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Check, ListPlus, ListEnd, ArrowUpRight, Info, Share2, Plus, X, NotebookPen } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Track, Album } from "@/types";
import { Tag, Tooltip } from "@/components/ui";
import { TrackWaveform } from "./TrackWaveform";
import { TrackDetailsPanel, type TrackDetailsTab } from "./TrackDetailsPanel";
import { FavoriteButton } from "./FavoriteButton";
import { DownloadButton } from "./DownloadButton";
import { AddToPlaylistButton } from "./AddToPlaylistButton";
import { AddTagButton } from "./AddTagButton";
import { CueSheetButton } from "./CueSheetButton";
import { formatDuration, formatBPM, cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import { useShortlistStore } from "@/stores/shortlist-store";
import { useI18n } from "@/components/providers/I18nProvider";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";
import { useSession } from "@/lib/auth-client";

interface TrackRowProps {
  track: Track;
  album?: Album;
  index: number;
  showAlbumCover?: boolean;
  showWaveform?: boolean;
  queue?: Track[];
  compact?: boolean;
  density?: "full" | "mid" | "light";
}

const openMobileActionMenus = new Set<symbol>();

function MobileAction({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2"><span className="text-xs font-semibold leading-4">{label}</span><div className="shrink-0">{children}</div></div>;
}

export function TrackRow({
  track,
  album,
  index,
  showAlbumCover = true,
  showWaveform = true,
  queue,
  compact = false,
  density = compact ? "mid" : "full",
}: TrackRowProps) {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const { currentTrack, isPlaying, progress, duration, play, pause, resume, setQueue, addToQueue } = usePlayerStore();
  const addToShortlist = useShortlistStore((state) => state.add);
  const removeFromShortlist = useShortlistStore((state) => state.remove);
  const isShortlisted = useShortlistStore((state) => state.items.some((item) => item.track.id === track.id));
  const isCurrentTrack = currentTrack?.id === track.id;
  const isPlayingThis = isCurrentTrack && isPlaying;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState<TrackDetailsTab>("information");
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const mobileActionsToken = useRef(Symbol(track.id));
  const displayedTerms = [track.genres[0], track.moods[0]].filter(Boolean) as string[];
  const additionalTerms = [...new Set([
    ...track.genres.slice(1),
    ...track.moods.slice(1),
    ...(track.instruments ?? []),
    ...(track.tags ?? []),
    ...(track.keywords ?? []),
    ...(track.musicFor ?? []),
  ].filter((term) => term && !displayedTerms.some((displayed) => displayed.toLocaleLowerCase() === term.toLocaleLowerCase())))];
  const additionalTermsLabel = additionalTerms.slice(0, 12).map((term) => localizeCatalogTerm(term, locale)).join(" · ");
  const mobileActionsId = `track-actions-${track.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  useEffect(() => {
    if (!mobileActionsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileActionsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileActionsOpen]);

  useEffect(() => {
    if (!mobileActionsOpen) return;
    const token = mobileActionsToken.current;
    openMobileActionMenus.add(token);
    document.body.dataset.mobileTrackActionsOpen = "true";
    return () => {
      openMobileActionMenus.delete(token);
      if (openMobileActionMenus.size === 0) delete document.body.dataset.mobileTrackActionsOpen;
    };
  }, [mobileActionsOpen]);

  // Calculate progress percentage for waveform
  const progressPercent = isCurrentTrack && duration > 0 ? (progress / duration) * 100 : 0;

  const handlePlay = () => {
    if (isCurrentTrack) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      if (queue?.length) {
        const trackIndex = queue.findIndex((item) => item.id === track.id);
        setQueue(queue, trackIndex >= 0 ? trackIndex : 0);
      } else if (album?.tracks) {
        const trackIndex = album.tracks.findIndex((t) => t.id === track.id);
        setQueue(album.tracks, trackIndex);
      }
      play(track);
    }
  };
  const shareTrack = async () => {
    const url = `${window.location.origin}/albums/${album?.slug || track.albumId}?track=${encodeURIComponent(track.id)}`;
    if (navigator.share) await navigator.share({ title: track.title, text: track.description, url }).catch(() => undefined);
    else await navigator.clipboard.writeText(url);
  };
  const toggleDetails = (tab: TrackDetailsTab) => {
    if (detailsOpen && detailsTab === tab) setDetailsOpen(false);
    else {
      setDetailsTab(tab);
      setDetailsOpen(true);
    }
  };

  return (
    <motion.article
      data-mobile-track-actions={mobileActionsOpen ? "open" : undefined}
      className={cn("group relative border-b border-[var(--line)] transition-all duration-150 last:border-b-0", isCurrentTrack ? "bg-[var(--color-primary-light)]" : "hover:bg-black/[.04]")}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className={cn("flex items-center gap-2 px-2 md:gap-3 md:px-3", density === "full" ? "py-3.5" : density === "mid" ? "py-2.5" : "py-1.5")}>
      {/* Index / Play button */}
      <div className="flex w-10 flex-shrink-0 items-center justify-center md:w-8">
        <Tooltip label={isPlayingThis ? t("common.pause") : t("common.play")}>
        <button
          onClick={handlePlay}
          aria-label={isPlayingThis ? `${t("common.pause")} ${track.title}` : `${t("common.play")} ${track.title}`}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-all md:h-8 md:w-8",
            isPlayingThis
              ? "bg-[var(--color-primary)] text-white"
              : "text-[var(--text-muted)] group-hover:bg-[var(--surface-soft)] group-hover:text-[var(--foreground)]"
          )}
        >
          {isPlayingThis ? (
            <Pause size={14} className="fill-current" />
          ) : (
            <span className="hidden text-sm font-mono lg:inline lg:group-hover:hidden">
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
          {!isPlayingThis && (
            <Play
              size={14}
              data-testid="track-play-icon"
              className="ml-0.5 block fill-current lg:hidden lg:group-hover:block"
            />
          )}
        </button>
        </Tooltip>
      </div>

      {/* Album cover */}
      {showAlbumCover && album && density !== "light" && (
        <div className={cn("relative flex-shrink-0 overflow-hidden border border-[var(--line)]", density === "full" ? "h-16 w-16" : "h-10 w-10")}>
          <Image
            src={album.cover}
            alt={album.title}
            fill
            sizes={density === "full" ? "64px" : "40px"}
            className="object-cover"
          />
        </div>
      )}

      {/* Track info + Waveform */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => toggleDetails("information")} aria-expanded={detailsOpen} className="min-w-0 text-left">
          <p
            className={cn(
              "font-medium truncate",
              isCurrentTrack
                ? "text-[var(--color-primary-dark)]"
                : "text-[var(--foreground)]"
            )}
          >
            {track.title}
          </p></button>
          {album && (
            <Link href={`/albums/${album.slug || album.id}`} className="hidden truncate text-sm text-[var(--color-gray-400)] transition hover:text-[var(--foreground)] sm:inline">
              — {album.title}
            </Link>
          )}
        </div>

        {/* Waveform */}
        {showWaveform && density !== "light" && (
          <div className="w-full">
            <TrackWaveform
              trackId={track.id}
              initialData={track.waveform}
              progress={progressPercent}
              height={density === "full" ? 28 : 20}
              className="opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
        )}
        {density === "full" && track.description && <p className="line-clamp-2 max-w-5xl text-xs leading-5 text-[var(--text-muted)]">{track.description}</p>}
        <p className="font-mono text-[.6rem] text-[var(--text-muted)] sm:hidden">{formatDuration(track.duration)}{track.bpm ? ` · ${formatBPM(track.bpm)}` : ""}</p>
      </div>

      {/* Tags - Hidden on small screens */}
      {density === "full" && <div className="hidden xl:flex items-center gap-1 flex-shrink-0">
        {track.genres.slice(0, 1).map((genre) => (
          <Tooltip key={genre} label={`${locale === "fr" ? "Genre principal" : "Primary genre"} · ${localizeCatalogTerm(genre, locale)}`}>
            <Tag variant="genre" size="sm">{localizeCatalogTerm(genre, locale)}</Tag>
          </Tooltip>
        ))}
        {track.moods.slice(0, 1).map((mood) => (
          <Tooltip key={mood} label={`${locale === "fr" ? "Humeur principale" : "Primary mood"} · ${localizeCatalogTerm(mood, locale)}`}>
            <Tag variant="mood" size="sm">{localizeCatalogTerm(mood, locale)}</Tag>
          </Tooltip>
        ))}
        {additionalTerms.length > 0 && <Tooltip label={`${locale === "fr" ? "Autres tags" : "Other tags"} · ${additionalTermsLabel}${additionalTerms.length > 12 ? "…" : ""}`}><button type="button" onClick={() => { setDetailsTab("information"); setDetailsOpen(true); }} className="inline-flex min-h-7 items-center rounded-full border border-dashed border-[var(--line-strong)] px-2 text-[.65rem] font-semibold text-[var(--text-muted)] transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]" aria-label={`${locale === "fr" ? "Voir tous les tags" : "View all tags"} : ${track.title}`}>+{additionalTerms.length}</button></Tooltip>}
      </div>}

      {/* BPM */}
      <div className="hidden md:block w-16 text-right flex-shrink-0">
        <span className="text-sm font-mono text-[var(--color-gray-400)]">
          {formatBPM(track.bpm)}
        </span>
      </div>

      {/* Duration */}
      <div className="hidden w-12 flex-shrink-0 text-right sm:block">
        <span className="text-sm font-mono text-[var(--color-gray-400)]">
          {formatDuration(track.duration)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-0.5">
        <div className="hidden lg:contents"><FavoriteButton type="track" itemId={track.id} size="sm" />
        <Tooltip label={locale === "fr" ? "Informations sur la piste" : "Track information"}><button type="button" onClick={() => toggleDetails("information")} aria-expanded={detailsOpen && detailsTab === "information"} className={cn("flex h-10 w-10 items-center justify-center transition hover:bg-[var(--surface-soft)]", detailsOpen && detailsTab === "information" && "text-[var(--signal-strong)]")} aria-label={`${locale === "fr" ? "Informations sur la piste" : "Track information"} : ${track.title}`}><Info size={17} /></button></Tooltip>{session?.user && <Tooltip label={locale === "fr" ? "Note privée" : "Private note"}><button type="button" onClick={() => toggleDetails("notes")} aria-expanded={detailsOpen && detailsTab === "notes"} className={cn("flex h-10 w-10 items-center justify-center transition hover:bg-[var(--surface-soft)]", detailsOpen && detailsTab === "notes" && "text-[var(--signal-strong)]")} aria-label={`${locale === "fr" ? "Ouvrir les notes privées" : "Open private notes"} : ${track.title}`}><NotebookPen size={17} /></button></Tooltip>}</div>
        <div className="hidden lg:contents"><DownloadButton trackId={track.id} trackTitle={track.title} /><AddToPlaylistButton trackId={track.id} trackTitle={track.title} /><AddTagButton trackId={track.id} trackTitle={track.title} /><CueSheetButton compact title={track.title} trackIds={[track.id]} /></div>
        <Tooltip label={locale === "fr" ? "Ajouter à la file d’attente" : "Add to queue"} className="hidden xl:inline-flex"><button onClick={() => addToQueue(track)} className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Ajouter à la file d’attente" : "Add to queue"} : ${track.title}`}>
          <ListEnd size={17} className="text-[var(--color-gray-500)]" />
        </button></Tooltip>
        <Tooltip label={isShortlisted ? (locale === "fr" ? "Déjà dans la sélection — retirer" : "Already selected — remove") : (locale === "fr" ? "Ajouter à la sélection" : "Add to selection")}><button onClick={() => isShortlisted ? removeFromShortlist(track.id) : addToShortlist(track)} aria-pressed={isShortlisted} className={cn("flex h-10 w-10 items-center justify-center rounded-full border transition-colors", isShortlisted ? "border-[var(--signal-strong)] bg-[var(--signal-strong)] text-white shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_16%,transparent)]" : "border-[var(--signal-strong)]/45 text-[var(--signal-strong)] hover:bg-[var(--signal-strong)] hover:text-white")} aria-label={`${isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")} : ${track.title}`}>
          {isShortlisted ? <Check size={17} /> : <ListPlus size={17} />}
        </button></Tooltip>
        <button type="button" onClick={() => setMobileActionsOpen((value) => !value)} aria-expanded={mobileActionsOpen} aria-controls={mobileActionsId} className={cn("flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] transition lg:hidden", mobileActionsOpen && "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]")} aria-label={`${mobileActionsOpen ? (locale === "fr" ? "Fermer les actions" : "Close actions") : (locale === "fr" ? "Plus d’actions" : "More actions")} : ${track.title}`}>
          <Plus size={18} className={cn("transition-transform", mobileActionsOpen && "rotate-45")} />
        </button>
        <Tooltip label={locale === "fr" ? "Partager" : "Share"} className="hidden xl:inline-flex"><button type="button" onClick={() => void shareTrack()} className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Partager" : "Share"} : ${track.title}`}><Share2 size={17} /></button></Tooltip>
        <Tooltip label={locale === "fr" ? "Demander une licence" : "Request a licence"} className="hidden 2xl:inline-flex"><Link href={`/contact?track=${encodeURIComponent(track.slug || track.id)}`} className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Demander une licence" : "Request a licence"} : ${track.title}`}>
          <ArrowUpRight size={17} className="text-[var(--color-gray-500)]" />
        </Link></Tooltip>
      </div>
      </div>
      {mobileActionsOpen && <div id={mobileActionsId} role="region" aria-label={`${locale === "fr" ? "Actions pour" : "Actions for"} ${track.title}`} className="border-t border-[var(--line)] bg-[var(--surface)] px-3 pb-4 pt-3 lg:hidden">
        <div className="mb-3 flex items-center justify-between"><p className="eyebrow text-[var(--text-muted)]">{locale === "fr" ? "Actions de la piste" : "Track actions"}</p><button type="button" onClick={() => setMobileActionsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)]" aria-label={locale === "fr" ? "Fermer les actions" : "Close actions"}><X size={15} /></button></div>
        <div className="grid grid-cols-2 gap-2">
          <MobileAction label={locale === "fr" ? "Favoris" : "Favourite"}><FavoriteButton type="track" itemId={track.id} size="md" showTooltip={false} /></MobileAction>
          <MobileAction label={locale === "fr" ? "Informations" : "Information"}><button type="button" onClick={() => { toggleDetails("information"); setMobileActionsOpen(false); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Informations sur la piste" : "Track information"} : ${track.title}`}><Info size={17} /></button></MobileAction>
          {session?.user && <MobileAction label={locale === "fr" ? "Note privée" : "Private note"}><button type="button" onClick={() => { toggleDetails("notes"); setMobileActionsOpen(false); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Ouvrir les notes privées" : "Open private notes"} : ${track.title}`}><NotebookPen size={17} /></button></MobileAction>}
          <MobileAction label={locale === "fr" ? "Télécharger" : "Download"}><DownloadButton trackId={track.id} trackTitle={track.title} /></MobileAction>
          <MobileAction label={locale === "fr" ? "Playlist" : "Playlist"}><AddToPlaylistButton trackId={track.id} trackTitle={track.title} /></MobileAction>
          {session?.user && <MobileAction label={locale === "fr" ? "Tag personnel" : "Personal tag"}><AddTagButton trackId={track.id} trackTitle={track.title} /></MobileAction>}
          {session?.user && <MobileAction label="Cue sheet"><CueSheetButton compact title={track.title} trackIds={[track.id]} /></MobileAction>}
          <MobileAction label={locale === "fr" ? "File d’attente" : "Queue"}><button type="button" onClick={() => { addToQueue(track); setMobileActionsOpen(false); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Ajouter à la file d’attente" : "Add to queue"} : ${track.title}`}><ListEnd size={17} /></button></MobileAction>
          <MobileAction label={locale === "fr" ? "Partager" : "Share"}><button type="button" onClick={() => { void shareTrack(); setMobileActionsOpen(false); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Partager" : "Share"} : ${track.title}`}><Share2 size={17} /></button></MobileAction>
          <MobileAction label={locale === "fr" ? "Licence" : "Licence"}><Link href={`/contact?track=${encodeURIComponent(track.slug || track.id)}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Demander une licence" : "Request a licence"} : ${track.title}`}><ArrowUpRight size={17} /></Link></MobileAction>
        </div>
      </div>}
      {detailsOpen && <TrackDetailsPanel track={track} activeTab={detailsTab} onTabChange={setDetailsTab} />}
    </motion.article>
  );
}
