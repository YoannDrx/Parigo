"use client";

import { ArrowLeft, ArrowUpRight, Check, ChevronUp, Info, ListEnd, ListPlus, NotebookPen, Pause, Pencil, Play, Save, Share2, Trash2, X } from "lucide-react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { Tooltip } from "@/components/ui/Tooltip";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn, formatBPM, formatDuration } from "@/lib/utils";
import { formatParigoDate } from "@/lib/date-time";
import { usePlayerStore } from "@/stores/player-store";
import { useShortlistStore } from "@/stores/shortlist-store";
import type { ComposerCreditLink, MemberTrackComment, RightHolder, Track } from "@/types";
import { TrackWaveform } from "./TrackWaveform";
import { useSession } from "@/lib/auth-client";
import { FavoriteButton } from "./FavoriteButton";
import { DownloadButton } from "./DownloadButton";
import { AddToPlaylistButton } from "./AddToPlaylistButton";
import { AddTagButton } from "./AddTagButton";
import { CueSheetButton } from "./CueSheetButton";
import { localizeCatalogTerm } from "@/i18n/catalog-terms";

export type TrackDetailsTab = "information" | "versions" | "lyrics" | "notes";

function Terms({ title, values, localize = true }: { title: string; values?: string[]; localize?: boolean }) {
  const { locale } = useI18n();
  if (!values?.length) return null;
  return (
    <section className="track-detail-terms">
      <h4 className="eyebrow mb-3 text-[var(--text-muted)]">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => <span key={value} className="track-detail-term px-2.5 py-1.5 text-xs font-semibold">{localize ? localizeCatalogTerm(value, locale) : value}</span>)}
      </div>
    </section>
  );
}

function VersionRow({ track, onInspect }: { track: Track; onInspect: (track: Track, tab: TrackDetailsTab) => void }) {
  const { locale, t } = useI18n();
  const { data: session } = useSession();
  const { currentTrack, isPlaying, play, pause, resume, addToQueue } = usePlayerStore();
  const addToShortlist = useShortlistStore((state) => state.add);
  const removeFromShortlist = useShortlistStore((state) => state.remove);
  const isShortlisted = useShortlistStore((state) => state.items.some((item) => item.track.id === track.id));
  const active = currentTrack?.id === track.id;
  const shareTrack = async () => {
    const url = `${window.location.origin}/albums/${track.albumId}?track=${encodeURIComponent(track.id)}`;
    if (navigator.share) await navigator.share({ title: track.title, text: track.description, url }).catch(() => undefined);
    else await navigator.clipboard.writeText(url);
  };
  return (
    <article className="track-detail-version border-b border-[var(--line)] py-4 last:border-0">
      <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 xl:grid-cols-[44px_minmax(0,1fr)_4.5rem_3.5rem]">
        <button type="button" onClick={() => active ? (isPlaying ? pause() : resume()) : play(track)} className="track-detail-version__play flex h-10 w-10 items-center justify-center border border-[var(--line)] hover:border-[var(--signal-strong)]" aria-label={`${isPlaying && active ? (locale === "fr" ? "Pause" : "Pause") : (locale === "fr" ? "Lire" : "Play")} : ${track.title}`}>
          {isPlaying && active ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-sm font-semibold">{track.title}</p>
            {track.version && <span className="track-detail-term shrink-0 border border-[var(--line)] px-2 py-0.5 font-mono text-[.58rem] uppercase text-[var(--text-muted)]">{track.version}</span>}
          </div>
          <TrackWaveform trackId={track.id} initialData={track.waveform} height={22} />
        </div>
        <span className="hidden text-right font-mono text-[.65rem] text-[var(--text-muted)] xl:block">{formatBPM(track.bpm)}</span>
        <span className="hidden text-right font-mono text-[.65rem] text-[var(--text-muted)] xl:block">{formatDuration(track.duration)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-[var(--line)] pt-3 sm:ml-[3.5rem]">
        <span className="mr-2 font-mono text-[.6rem] text-[var(--text-muted)] xl:hidden">{formatBPM(track.bpm)} · {formatDuration(track.duration)}</span>
        <FavoriteButton type="track" itemId={track.id} size="sm" />
        <Tooltip label={locale === "fr" ? "Informations sur la piste" : "Track information"}>
          <button type="button" onClick={() => onInspect(track, "information")} className="track-detail-version__action" aria-label={`${locale === "fr" ? "Informations sur la piste" : "Track information"} : ${track.title}`}><Info size={16} /></button>
        </Tooltip>
        {session?.user && (
          <Tooltip label={locale === "fr" ? "Note privée" : "Private note"}>
            <button type="button" onClick={() => onInspect(track, "notes")} className="track-detail-version__action" aria-label={`${locale === "fr" ? "Ouvrir les notes privées" : "Open private notes"} : ${track.title}`}><NotebookPen size={16} /></button>
          </Tooltip>
        )}
        <DownloadButton trackId={track.id} trackTitle={track.title} className="h-9 w-9" />
        <AddToPlaylistButton trackId={track.id} trackTitle={track.title} className="h-9 w-9" />
        <AddTagButton trackId={track.id} trackTitle={track.title} />
        <CueSheetButton compact title={track.title} trackIds={[track.id]} />
        <Tooltip label={locale === "fr" ? "Ajouter à la file d’attente" : "Add to queue"}>
          <button type="button" onClick={() => addToQueue(track)} className="track-detail-version__action" aria-label={`${locale === "fr" ? "Ajouter à la file d’attente" : "Add to queue"} : ${track.title}`}><ListEnd size={16} /></button>
        </Tooltip>
        <Tooltip label={isShortlisted ? (locale === "fr" ? "Retirer de la sélection" : "Remove from selection") : (locale === "fr" ? "Ajouter à la sélection" : "Add to selection")}>
          <button type="button" onClick={() => isShortlisted ? removeFromShortlist(track.id) : addToShortlist(track)} aria-pressed={isShortlisted} className={cn("track-detail-version__action", isShortlisted && "bg-[var(--signal-strong)] text-white")} aria-label={`${isShortlisted ? t("search.removeShortlist") : t("search.addShortlist")} : ${track.title}`}>{isShortlisted ? <Check size={16} /> : <ListPlus size={16} />}</button>
        </Tooltip>
        <Tooltip label={locale === "fr" ? "Partager" : "Share"}>
          <button type="button" onClick={() => void shareTrack()} className="track-detail-version__action" aria-label={`${locale === "fr" ? "Partager" : "Share"} : ${track.title}`}><Share2 size={16} /></button>
        </Tooltip>
        <Tooltip label={locale === "fr" ? "Demander une licence" : "Request a licence"}>
          <Link href={`/contact?track=${encodeURIComponent(track.slug || track.id)}`} className="track-detail-version__action" aria-label={`${locale === "fr" ? "Demander une licence" : "Request a licence"} : ${track.title}`}><ArrowUpRight size={16} /></Link>
        </Tooltip>
      </div>
    </article>
  );
}

export function TrackDetailsPanel({ track, composerCredits, activeTab, onTabChange, onClose }: { track: Track; composerCredits?: ComposerCreditLink[]; activeTab: TrackDetailsTab; onTabChange: (tab: TrackDetailsTab) => void; onClose: () => void }) {
  const { locale, localizedPath } = useI18n();
  const { data: session } = useSession();
  const [detailsById, setDetailsById] = useState<Record<string, Track>>({});
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [focusedTrack, setFocusedTrack] = useState<Track | null>(null);
  const [notes, setNotes] = useState<MemberTrackComment[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [rightHoldersById, setRightHoldersById] = useState<Record<string, RightHolder[]>>({});
  const selectedTrack = focusedTrack ?? track;
  const displayed = detailsById[selectedTrack.id] ?? selectedTrack;
  const rootTrack = detailsById[track.id] ?? track;
  const activeTrackId = selectedTrack.id;
  const rightHolders = rightHoldersById[activeTrackId] ?? displayed.rightHolders ?? [];
  const rightHoldersLoading = activeTab === "information" && !rightHoldersById[activeTrackId];
  const rootTrackLoading = selectedTrack.id === track.id && detailsLoading && !detailsById[track.id];

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/tracks/${encodeURIComponent(selectedTrack.id)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (payload?.data?.track) {
          const fetchedTrack = payload.data.track as Track;
          setDetailsById((current) => ({ ...current, [fetchedTrack.id]: fetchedTrack }));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setDetailsLoading(false);
      });
    return () => controller.abort();
  }, [selectedTrack.id]);

  useEffect(() => {
    if (activeTab !== "information" || rightHoldersById[selectedTrack.id]) return;
    const controller = new AbortController();
    void fetch(`/api/tracks/${encodeURIComponent(selectedTrack.id)}/right-holders`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (response.ok) {
          setRightHoldersById((current) => ({
            ...current,
            [selectedTrack.id]: payload.data?.rightHolders ?? [],
          }));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRightHoldersById((current) => ({ ...current, [selectedTrack.id]: [] }));
        }
      });
    return () => controller.abort();
  }, [activeTab, rightHoldersById, selectedTrack.id]);

  useEffect(() => {
    if (!session?.user) return;
    const controller = new AbortController();
    void fetch(`/api/user/tracks/${encodeURIComponent(activeTrackId)}/comments`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => response.ok ? setNotes(payload.data?.comments ?? []) : setNoteError(payload.error?.message || "Unable to load notes"))
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setNoteError("Unable to load notes"); })
      .finally(() => { if (!controller.signal.aborted) setNotesLoading(false); });
    return () => controller.abort();
  }, [session?.user, activeTrackId]);

  const saveNote = async () => {
    if (!noteDraft.trim()) return;
    setNoteSaving(true);
    setNoteError("");
    const response = await fetch(`/api/user/tracks/${encodeURIComponent(activeTrackId)}/comments`, {
      method: editingNoteId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(editingNoteId ? { commentId: editingNoteId } : {}), text: noteDraft.trim() }),
    });
    const payload = await response.json();
    if (response.ok && payload.data?.comment) {
      const comment = payload.data.comment as MemberTrackComment;
      setNotes((current) => editingNoteId ? current.map((item) => item.id === editingNoteId ? comment : item) : [comment, ...current]);
      setNoteDraft("");
      setEditingNoteId(null);
    } else setNoteError(payload.error?.message || (locale === "fr" ? "La note n’a pas pu être enregistrée." : "The note could not be saved."));
    setNoteSaving(false);
  };

  const removeNote = async (commentId: string) => {
    const response = await fetch(`/api/user/tracks/${encodeURIComponent(activeTrackId)}/comments?commentId=${encodeURIComponent(commentId)}`, { method: "DELETE" });
    if (response.ok) setNotes((current) => current.filter((item) => item.id !== commentId));
  };

  const focusTrack = (nextTrack: Track | null, tab?: TrackDetailsTab) => {
    setFocusedTrack(nextTrack);
    setDetailsLoading(true);
    setNotes([]);
    setNoteDraft("");
    setEditingNoteId(null);
    setNoteError("");
    setNotesLoading(Boolean(session?.user));
    if (tab) onTabChange(tab);
  };

  const tabs: Array<[TrackDetailsTab, string]> = [["information", locale === "fr" ? "Informations" : "Information"], ["versions", locale === "fr" ? "Versions" : "Versions"], ["lyrics", locale === "fr" ? "Paroles" : "Lyrics"], ...(session?.user ? [["notes", locale === "fr" ? "Notes privées" : "Private notes"] as [TrackDetailsTab, string]] : [])];
  const facts = [
    ["BPM", formatBPM(displayed.bpm)],
    [locale === "fr" ? "Durée" : "Duration", formatDuration(displayed.duration)],
    [locale === "fr" ? "Référence album" : "Album reference", displayed.albumCode || displayed.cdCode],
    [locale === "fr" ? "Éditeurs" : "Publishers", displayed.publishers?.join(", ")],
    ["ISRC", displayed.isrc],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  return (
    <section className="track-detail-panel relative border-t border-[var(--line-strong)] bg-[var(--surface-soft)]" aria-label={`${locale === "fr" ? "Détails de la piste" : "Track details"} : ${displayed.title}`}>
      <div className="flex items-stretch border-b border-[var(--line)]">
        <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto px-4 md:px-6">
          <div className="track-detail-tabs flex min-w-max gap-6" role="tablist">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => onTabChange(id)} className={cn("relative min-h-11 px-0 text-xs font-semibold transition after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-[var(--signal-strong)] after:transition-transform", activeTab === id ? "text-[var(--foreground)] after:scale-x-100" : "text-[var(--text-muted)] hover:text-[var(--foreground)] hover:after:scale-x-50")}>{label}</button>)}</div>
        </div>
        <button type="button" onClick={onClose} className="track-detail-panel__collapse m-1.5 flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--line)]" aria-label={locale === "fr" ? "Replier les informations" : "Collapse information"}><ChevronUp size={14} /></button>
      </div>

      {focusedTrack && (
        <div className="flex min-w-0 items-center gap-3 border-b border-[var(--line)] px-4 py-2 md:px-6">
          <button type="button" onClick={() => focusTrack(null)} className="inline-flex min-h-8 shrink-0 items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:text-[var(--foreground)]">
            <ArrowLeft size={13} />
            {locale === "fr" ? "Piste principale" : "Main track"}
          </button>
          <span aria-hidden="true" className="h-3 w-px bg-[var(--line-strong)]" />
          <p className="min-w-0 truncate text-xs font-semibold">{displayed.title}{displayed.version ? ` · ${displayed.version}` : ""}</p>
        </div>
      )}

      <div className="track-detail-panel__content px-4 py-4 md:px-6">
        {activeTab === "information" && (
          <div role="tabpanel" className="grid gap-x-8 gap-y-5 lg:grid-cols-[minmax(240px,.9fr)_minmax(320px,1.1fr)]">
            <section className="min-w-0">
              <p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "À propos de la piste" : "About this track"}</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                {displayed.description || (locale === "fr" ? "Aucune description éditoriale n’est disponible pour cette piste." : "No editorial description is available for this track.")}
              </p>
              {displayed.composers?.length ? (
                <div className="mt-5 border-t border-[var(--line)] pt-4">
                  <p className="mb-3 font-mono text-[.58rem] uppercase tracking-[.1em] text-[var(--text-muted)]">{locale === "fr" ? "Compositeur" : "Composer"}</p>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    {displayed.composers.map((credit) => {
                      const profile = composerCredits?.find((item) => item.credit === credit && item.href);
                      return profile?.href
                        ? <Link key={credit} href={localizedPath(profile.href)} className="track-detail-term px-2.5 py-1.5 text-xs font-semibold transition hover:text-[var(--signal-strong)]">{profile.name}</Link>
                        : <span key={credit} className="track-detail-term px-2.5 py-1.5 text-xs font-semibold">{credit}</span>;
                    })}
                  </div>
                </div>
              ) : null}
              {displayed.authors?.length ? (
                <div className="mt-5 border-t border-[var(--line)] pt-4">
                  <p className="mb-3 font-mono text-[.58rem] uppercase tracking-[.1em] text-[var(--text-muted)]">{locale === "fr" ? "Autrice" : "Songwriter"}</p>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    {displayed.authors.map((credit) => {
                      const profile = composerCredits?.find((item) => item.credit === credit && item.href);
                      return profile?.href
                        ? <Link key={credit} href={localizedPath(profile.href)} className="track-detail-term px-2.5 py-1.5 text-xs font-semibold transition hover:text-[var(--signal-strong)]">{profile.name}</Link>
                        : <span key={credit} className="track-detail-term px-2.5 py-1.5 text-xs font-semibold">{credit}</span>;
                    })}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="min-w-0 border-t border-[var(--line)] pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <p className="eyebrow mb-2 text-[var(--signal-strong)]">{locale === "fr" ? "Repères" : "Key details"}</p>
              <dl className="track-detail-facts grid content-start">
                {facts.map(([label, value]) => (
                  <div key={label} className="track-detail-fact grid grid-cols-[minmax(6.5rem,.55fr)_minmax(0,1fr)] items-baseline gap-4 border-b border-[var(--line)] py-2.5">
                    <dt className="font-mono text-[.58rem] uppercase leading-4 tracking-[.08em] text-[var(--text-muted)]">{label}</dt>
                    <dd className="min-w-0 break-words text-sm font-semibold leading-5">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="border-t border-[var(--line-strong)] pt-5 lg:col-span-2">
              <div className="mb-4">
                <p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Couleurs & usages" : "Colours & uses"}</p>
              </div>
              <div className="track-detail-taxonomy grid content-start gap-x-7 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                <Terms title={locale === "fr" ? "Mots clés" : "Keywords"} values={[...new Set([...(displayed.tags ?? []), ...(displayed.keywords ?? [])])]} />
                <Terms title="Genre" values={displayed.genres} />
                <Terms title={locale === "fr" ? "Instruments" : "Instruments"} values={displayed.instruments} />
                <Terms title={locale === "fr" ? "Humeur" : "Mood"} values={displayed.moods} />
                <Terms title={locale === "fr" ? "Musique pour" : "Music for"} values={displayed.musicFor} />
              </div>
            </section>
            <section className="border-t border-[var(--line-strong)] pt-5 lg:col-span-2">
              <p className="eyebrow text-[var(--signal-strong)]">{locale === "fr" ? "Ayants droit" : "Right holders"}</p>
              {rightHoldersLoading ? (
                <div className="mt-4">
                  <ParigoLoader size="compact" label={locale === "fr" ? "Chargement des ayants droit" : "Loading right holders"} />
                </div>
              ) : rightHolders.length ? (
                <div className="mt-4 overflow-x-auto border border-[var(--line)]">
                  <table className="w-full min-w-[42rem] text-left text-xs">
                    <thead className="bg-[var(--surface)] font-mono uppercase tracking-[.08em] text-[var(--text-muted)]">
                      <tr>
                        <th className="px-3 py-2.5">{locale === "fr" ? "Nom" : "Name"}</th>
                        <th className="px-3 py-2.5">{locale === "fr" ? "Rôle" : "Role"}</th>
                        <th className="px-3 py-2.5">{locale === "fr" ? "Société" : "Society"}</th>
                        <th className="px-3 py-2.5">{locale === "fr" ? "Part" : "Share"}</th>
                        <th className="px-3 py-2.5">IPI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rightHolders.map((holder) => (
                        <tr key={holder.id} className="border-t border-[var(--line)]">
                          <td className="px-3 py-3 font-semibold">{holder.name}</td>
                          <td className="px-3 py-3">{holder.capacity || holder.capacityGroup || "—"}</td>
                          <td className="px-3 py-3">{holder.collectingSociety || "—"}</td>
                          <td className="px-3 py-3">{holder.share !== undefined ? `${holder.share}${holder.shareType ? ` ${holder.shareType}` : ""}` : "—"}</td>
                          <td className="px-3 py-3">{holder.ipi || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  {locale === "fr"
                    ? "Aucune donnée structurée d’ayant droit n’est renvoyée pour cette piste."
                    : "No structured right-holder data is returned for this track."}
                </p>
              )}
            </section>
          </div>
        )}
        {activeTab === "versions" && <div role="tabpanel">{rootTrackLoading ? <div className="flex min-h-28 items-center justify-center"><ParigoLoader size="compact" label={locale === "fr" ? "Chargement des versions" : "Loading versions"} /></div> : rootTrack.alternateTracks?.length ? <div>{rootTrack.alternateTracks.map((version) => <VersionRow key={version.id} track={version} onInspect={focusTrack} />)}</div> : <p className="py-8 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Aucune version alternative disponible." : "No alternate version available."}</p>}</div>}
        {activeTab === "lyrics" && <div role="tabpanel" className="max-w-3xl whitespace-pre-wrap py-5 text-sm leading-7 text-[var(--text-muted)]">{displayed.lyrics || (locale === "fr" ? "Paroles non disponibles." : "Lyrics unavailable.")}</div>}
        {activeTab === "notes" && session?.user && <div role="tabpanel" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_.9fr]"><div><p className="mb-3 text-sm font-semibold">{locale === "fr" ? "Une note visible uniquement dans votre compte." : "A note visible only in your account."}</p><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={4} maxLength={1200} placeholder={locale === "fr" ? "Intention, timecode, retour client…" : "Intent, timecode, client feedback…"} className="w-full resize-y border border-[var(--line-strong)] bg-[var(--surface)] p-3 text-sm leading-6 outline-none focus:border-[var(--foreground)]" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-[.65rem] text-[var(--text-muted)]">{noteDraft.length}/1200</span><div className="flex gap-2">{editingNoteId && <button type="button" onClick={() => { setEditingNoteId(null); setNoteDraft(""); }} className="inline-flex min-h-10 items-center gap-2 px-3 text-xs"><X size={14} />{locale === "fr" ? "Annuler" : "Cancel"}</button>}<button type="button" disabled={noteSaving || !noteDraft.trim()} onClick={() => void saveNote()} className="inline-flex min-h-10 items-center gap-2 bg-[var(--foreground)] px-4 text-xs font-semibold text-[var(--background)] disabled:opacity-40">{noteSaving ? <ParigoLoader size="icon" label={locale === "fr" ? "Enregistrement de la note" : "Saving note"} /> : <Save size={14} />}{editingNoteId ? (locale === "fr" ? "Mettre à jour" : "Update") : (locale === "fr" ? "Ajouter la note" : "Add note")}</button></div></div>{noteError && <p className="mt-3 text-xs text-[var(--danger)]">{noteError}</p>}</div><div className="border-t border-[var(--line)] lg:border-l lg:border-t-0 lg:pl-6">{notesLoading ? <div className="flex min-h-28 items-center justify-center"><ParigoLoader size="compact" label={locale === "fr" ? "Chargement des notes" : "Loading notes"} /></div> : notes.length ? notes.map((note) => <article key={note.id} className="border-b border-[var(--line)] py-4 first:pt-0"><p className="whitespace-pre-wrap text-sm leading-6">{note.text}</p><div className="mt-3 flex items-center justify-between gap-3"><span className="text-[.62rem] text-[var(--text-muted)]">{note.updatedAt || note.createdAt ? formatParigoDate(note.updatedAt || note.createdAt!, locale) : (locale === "fr" ? "Note privée" : "Private note")}</span><div className="flex"><button type="button" onClick={() => { setEditingNoteId(note.id); setNoteDraft(note.text); }} className="flex h-9 w-9 items-center justify-center text-[var(--text-muted)] hover:text-[var(--foreground)]" aria-label={locale === "fr" ? "Modifier la note" : "Edit note"}><Pencil size={14} /></button><button type="button" onClick={() => void removeNote(note.id)} className="flex h-9 w-9 items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)]" aria-label={locale === "fr" ? "Supprimer la note" : "Delete note"}><Trash2 size={14} /></button></div></div></article>) : <p className="py-6 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Aucune note pour ce morceau." : "No note for this track."}</p>}</div></div>}
      </div>
    </section>
  );
}
