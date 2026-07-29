"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Check, ListPlus, ListEnd, ArrowUpRight, Info, Share2, Ellipsis, X, NotebookPen } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Track, Album, ComposerCreditLink } from "@/types";
import { Tag } from "@/components/ui/Tag";
import { Tooltip } from "@/components/ui/Tooltip";
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
  condensedActions?: boolean;
  showCompleteActions?: boolean;
  composerCredits?: ComposerCreditLink[];
  initialDetailsOpen?: boolean;
  leadingMeta?: ReactNode;
  showTags?: boolean;
}

const openMobileActionMenus = new Set<symbol>();

function MobileAction({ label, children }: { label: string; children: ReactNode }) {
  return <div className="track-mobile-action flex min-h-11 items-center justify-between gap-2 border border-[var(--line)] bg-[var(--background)] px-2.5 py-1.5"><span className="text-[.7rem] font-semibold leading-4">{label}</span><div className="track-mobile-action__control shrink-0">{children}</div></div>;
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
  condensedActions = false,
  showCompleteActions = density === "full",
  composerCredits,
  initialDetailsOpen = false,
  leadingMeta,
  showTags = true,
}: TrackRowProps) {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const { currentTrack, isPlaying, progress, duration, play, pause, resume, setQueue, addToQueue } = usePlayerStore();
  const addToShortlist = useShortlistStore((state) => state.add);
  const removeFromShortlist = useShortlistStore((state) => state.remove);
  const isShortlisted = useShortlistStore((state) => state.items.some((item) => item.track.id === track.id));
  const isCurrentTrack = currentTrack?.id === track.id;
  const isPlayingThis = isCurrentTrack && isPlaying;
  const [detailsOpen, setDetailsOpen] = useState(initialDetailsOpen);
  const [detailsTab, setDetailsTab] = useState<TrackDetailsTab>("information");
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const mobileActionsToken = useRef(Symbol(track.id));
  const articleRef = useRef<HTMLElement>(null);
  const actionsTriggerRef = useRef<HTMLButtonElement>(null);
  const actionsPopoverRef = useRef<HTMLDivElement>(null);
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
      if (event.key === "Escape") {
        setMobileActionsOpen(false);
        actionsTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileActionsOpen]);

  useEffect(() => {
    if (!mobileActionsOpen || !condensedActions) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (actionsPopoverRef.current?.contains(target) || actionsTriggerRef.current?.contains(target)) return;
      setMobileActionsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [condensedActions, mobileActionsOpen]);

  useEffect(() => {
    if (!initialDetailsOpen) return;
    const frame = window.requestAnimationFrame(() => {
      articleRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialDetailsOpen]);

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
    <article
      ref={articleRef}
      data-track-id={track.id}
      data-density={density}
      data-mobile-track-actions={mobileActionsOpen ? "open" : undefined}
      data-actions-open={mobileActionsOpen ? "true" : undefined}
      data-state={isCurrentTrack ? "playing" : "idle"}
      data-deep-linked={initialDetailsOpen ? "true" : undefined}
      style={{ animationDelay: `${Math.min(index * 50, 350)}ms` }}
      className={cn("parigo-track-row group relative animate-[fade-in_.24s_ease-out_both] border-b border-[var(--line)] transition-all duration-150 last:border-b-0", density !== "full" && "parigo-track-row--compact", isCurrentTrack ? "bg-[var(--color-primary-light)]" : "")}
    >
      <div className={cn("parigo-track-row__main flex items-center gap-2 px-2 md:gap-3 md:px-3", density === "full" ? "py-3.5" : density === "mid" ? "py-2.5" : "py-2")}>
      {leadingMeta && <div className="parigo-track-row__leading-meta flex w-16 flex-shrink-0 flex-col items-start justify-center gap-0.5">{leadingMeta}</div>}
      {/* Index / Play button */}
      <div className="parigo-track-row__index flex w-10 flex-shrink-0 items-center justify-center md:w-8">
        <Tooltip label={isPlayingThis ? t("common.pause") : t("common.play")}>
        <button
          onClick={handlePlay}
          aria-label={isPlayingThis ? `${t("common.pause")} ${track.title}` : `${t("common.play")} ${track.title}`}
          className={cn(
            "parigo-track-row__play flex h-10 w-10 items-center justify-center transition-all md:h-8 md:w-8",
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
        <Link
          href={`/albums/${album.slug || album.id}`}
          aria-label={`${locale === "fr" ? "Voir l’album" : "View album"} ${album.title}`}
          className={cn("parigo-track-row__cover relative flex-shrink-0 overflow-hidden border border-[var(--line)] transition hover:border-[var(--signal-strong)] focus-visible:border-[var(--signal-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/25", density === "full" ? "h-14 w-14 sm:h-16 sm:w-16" : "h-10 w-10")}
        >
          <Image
            src={album.cover}
            alt={album.title}
            fill
            sizes={density === "full" ? "64px" : "40px"}
            className="object-cover"
          />
        </Link>
      )}

      {/* Track info + Waveform */}
      <div className="parigo-track-row__info flex min-w-0 flex-1 flex-col gap-1">
        {density === "full" ? (
          <div className="min-w-0">
            <p
              className={cn(
                "parigo-track-row__title break-words font-medium leading-5",
                isCurrentTrack
                  ? "text-[var(--color-primary-dark)]"
                  : "text-[var(--foreground)]"
              )}
            >
              {track.title}
            </p>
            {album && (
              <div className="mt-1 flex min-w-0 items-center gap-x-3">
                <Link href={`/albums/${album.slug || album.id}`} className="parigo-track-row__album min-w-0 truncate text-xs leading-5 text-[var(--text-muted)] transition hover:text-[var(--foreground)] sm:text-sm">
                  {album.title}
                </Link>
                {album.code && <span className="album-reference-tag hidden shrink-0 sm:inline-flex">{locale === "fr" ? "Réf." : "Ref."} {album.code}</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
            <p
              className={cn(
                "parigo-track-row__title min-w-0 max-w-[48%] shrink truncate font-medium leading-5",
                density === "light" && "font-semibold",
                isCurrentTrack
                  ? "text-[var(--color-primary-dark)]"
                  : "text-[var(--foreground)]"
              )}
            >
              {track.title}
            </p>
            {album && (
              <>
                <span aria-hidden="true" className="parigo-track-row__album-separator shrink-0 text-xs text-[var(--text-muted)]">—</span>
                <Link href={`/albums/${album.slug || album.id}`} className="parigo-track-row__album min-w-0 max-w-[36%] shrink truncate text-xs leading-5 text-[var(--text-muted)] transition hover:text-[var(--foreground)] sm:text-sm">
                  {album.title}
                </Link>
                {album.code && <span className="album-reference-tag ml-1 hidden shrink-0 sm:inline-flex">{locale === "fr" ? "Réf." : "Ref."} {album.code}</span>}
              </>
            )}
          </div>
        )}

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
        {density === "full" && track.description && <p className="parigo-track-row__description line-clamp-2 max-w-5xl text-xs leading-5 text-[var(--text-muted)]">{track.description}</p>}
        <p className="font-mono text-[.6rem] text-[var(--text-muted)] sm:hidden">{formatDuration(track.duration)}{track.bpm ? ` · ${formatBPM(track.bpm)}` : ""}</p>
      </div>

      {/* Tags - Hidden on small screens */}
      {density === "full" && showTags && <div className="parigo-track-row__tags hidden flex-shrink-0 items-center gap-1 xl:flex">
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
        {additionalTerms.length > 0 && <Tooltip label={`${locale === "fr" ? "Autres tags" : "Other tags"} · ${additionalTermsLabel}${additionalTerms.length > 12 ? "…" : ""}`}><span tabIndex={0} className="parigo-track-row__more-tags inline-flex min-h-7 items-center border border-dashed border-[var(--line-strong)] px-2 text-[.65rem] font-semibold text-[var(--text-muted)]" aria-label={`${locale === "fr" ? "Autres tags" : "Other tags"} : ${track.title}`}>+{additionalTerms.length}</span></Tooltip>}
      </div>}

      {/* BPM */}
      <div className="parigo-track-row__bpm hidden w-16 flex-shrink-0 text-right md:block">
        <span className="text-sm font-mono text-[var(--color-gray-400)]">
          {formatBPM(track.bpm)}
        </span>
      </div>

      {/* Duration */}
      <div className="parigo-track-row__duration hidden w-12 flex-shrink-0 text-right sm:block">
        <span className="text-sm font-mono text-[var(--color-gray-400)]">
          {formatDuration(track.duration)}
        </span>
      </div>

      {/* Actions */}
      <div className="parigo-track-row__actions flex flex-shrink-0 items-center gap-0.5">
        <div className="parigo-track-row__desktop-actions hidden lg:contents"><FavoriteButton type="track" itemId={track.id} size="sm" />
        <Tooltip label={locale === "fr" ? "Informations sur la piste" : "Track information"}><button type="button" onClick={() => toggleDetails("information")} aria-expanded={detailsOpen} className={cn("flex h-10 w-10 items-center justify-center transition hover:bg-[var(--surface-soft)]", detailsOpen && "text-[var(--signal-strong)]")} aria-label={`${locale === "fr" ? "Informations sur la piste" : "Track information"} : ${track.title}`}><Info size={17} /></button></Tooltip>{session?.user && <Tooltip label={locale === "fr" ? "Note privée" : "Private note"}><button type="button" onClick={() => toggleDetails("notes")} aria-expanded={detailsOpen && detailsTab === "notes"} className={cn("flex h-10 w-10 items-center justify-center transition hover:bg-[var(--surface-soft)]", detailsOpen && detailsTab === "notes" && "text-[var(--signal-strong)]")} aria-label={`${locale === "fr" ? "Ouvrir les notes privées" : "Open private notes"} : ${track.title}`}><NotebookPen size={17} /></button></Tooltip>}</div>
        {!condensedActions && <div className="parigo-track-row__desktop-actions hidden lg:contents"><DownloadButton trackId={track.id} trackTitle={track.title} /><AddToPlaylistButton trackId={track.id} trackTitle={track.title} /><AddTagButton trackId={track.id} trackTitle={track.title} /><CueSheetButton compact title={track.title} trackIds={[track.id]} /></div>}
        {!condensedActions && showCompleteActions && <Tooltip label={locale === "fr" ? "Ajouter à la file d’attente" : "Add to queue"} className="parigo-track-row__wide-action hidden xl:inline-flex"><button onClick={() => addToQueue(track)} className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Ajouter à la file d’attente" : "Add to queue"} : ${track.title}`}>
          <ListEnd size={17} className="text-[var(--color-gray-500)]" />
        </button></Tooltip>}
        <Tooltip label={isShortlisted ? (locale === "fr" ? "Déjà dans la sélection — retirer" : "Already selected — remove") : (locale === "fr" ? "Ajouter à la sélection" : "Add to selection")}><button onClick={() => isShortlisted ? removeFromShortlist(track.id) : addToShortlist(track)} aria-pressed={isShortlisted} className={cn("flex h-10 w-10 items-center justify-center border transition-colors", isShortlisted ? "border-[var(--signal-strong)] bg-[var(--signal-strong)] text-white shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_16%,transparent)]" : "border-[var(--signal-strong)]/45 text-[var(--signal-strong)] hover:bg-[var(--signal-strong)] hover:text-white")} aria-label={`${isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")} : ${track.title}`}>
          {isShortlisted ? <Check size={17} /> : <ListPlus size={17} />}
        </button></Tooltip>
        <button ref={actionsTriggerRef} type="button" onClick={() => setMobileActionsOpen((value) => !value)} aria-expanded={mobileActionsOpen} aria-controls={mobileActionsId} aria-haspopup={condensedActions ? "dialog" : undefined} className={cn("parigo-track-row__actions-trigger flex h-10 w-10 items-center justify-center border border-[var(--line-strong)] transition", !condensedActions && "lg:hidden", condensedActions && "rounded-[var(--parigo-corner-sm)_var(--parigo-turn-sm)]", mobileActionsOpen && "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]")} aria-label={`${mobileActionsOpen ? (locale === "fr" ? "Fermer les actions" : "Close actions") : (locale === "fr" ? "Plus d’actions" : "More actions")} : ${track.title}`}>
          <Ellipsis size={19} />
        </button>
        {!condensedActions && showCompleteActions && <Tooltip label={locale === "fr" ? "Partager" : "Share"} className="parigo-track-row__wide-action hidden xl:inline-flex"><button type="button" onClick={() => void shareTrack()} className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Partager" : "Share"} : ${track.title}`}><Share2 size={17} /></button></Tooltip>}
        {!condensedActions && showCompleteActions && <Tooltip label={locale === "fr" ? "Demander une licence" : "Request a licence"} className="parigo-track-row__wide-action hidden 2xl:inline-flex"><Link href={`/contact?track=${encodeURIComponent(track.slug || track.id)}`} className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Demander une licence" : "Request a licence"} : ${track.title}`}>
          <ArrowUpRight size={17} className="text-[var(--color-gray-500)]" />
        </Link></Tooltip>}
      </div>
      </div>
      {mobileActionsOpen && <div ref={actionsPopoverRef} id={mobileActionsId} role={condensedActions ? "dialog" : "region"} aria-label={`${locale === "fr" ? "Actions pour" : "Actions for"} ${track.title}`} className={cn("parigo-track-row__mobile-actions bg-[var(--surface)] px-2.5 pb-2.5 pt-2.5", condensedActions ? "parigo-track-actions-popover absolute right-2 top-[calc(100%+.25rem)] w-[min(18rem,calc(100vw-2rem))] border border-[var(--line-strong)]" : "border-t border-[var(--line)] lg:hidden")}>
        <div className="mb-2 flex items-center justify-between gap-3 pl-1"><p className="eyebrow truncate text-[var(--text-muted)]">{locale === "fr" ? "Actions de la piste" : "Track actions"}</p><button type="button" onClick={() => setMobileActionsOpen(false)} className="parigo-track-actions-popover__close flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--line)]" aria-label={locale === "fr" ? "Fermer les actions" : "Close actions"}><X size={14} /></button></div>
        <div className={cn("grid grid-cols-2 gap-1.5", !condensedActions && "sm:grid-cols-3")}>
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
      {detailsOpen && <div className="mb-4 ml-3 mr-1 mt-2 sm:ml-8 lg:ml-12"><TrackDetailsPanel track={track} composerCredits={composerCredits} activeTab={detailsTab} onTabChange={setDetailsTab} onClose={() => setDetailsOpen(false)} /></div>}
    </article>
  );
}
