"use client";

import { Loader2, Pause, Pencil, Play, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn, formatBPM, formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import type { MemberTrackComment, Track } from "@/types";
import { TrackWaveform } from "./TrackWaveform";
import { useSession } from "@/lib/auth-client";

export type TrackDetailsTab = "information" | "versions" | "lyrics" | "notes";

function Terms({ title, values }: { title: string; values?: string[] }) {
  if (!values?.length) return null;
  return <div><h4 className="eyebrow mb-2 text-[var(--text-muted)]">{title}</h4><div className="flex flex-wrap gap-1.5">{values.map((value) => <span key={value} className="rounded-md bg-[var(--background)] px-2.5 py-1 text-xs font-semibold">{value}</span>)}</div></div>;
}

function VersionRow({ track }: { track: Track }) {
  const { currentTrack, isPlaying, play, pause, resume } = usePlayerStore();
  const active = currentTrack?.id === track.id;
  return <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] py-3 last:border-0"><button type="button" onClick={() => active ? (isPlaying ? pause() : resume()) : play(track)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] hover:border-[var(--signal-strong)]" aria-label={isPlaying && active ? "Pause" : "Play"}>{isPlaying && active ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{track.title}</p>{track.version && <span className="rounded-full border border-[var(--line)] px-2 py-0.5 font-mono text-[.58rem] uppercase text-[var(--text-muted)]">{track.version}</span>}</div><TrackWaveform trackId={track.id} initialData={track.waveform} height={22} /></div><span className="font-mono text-[.65rem] text-[var(--text-muted)]">{formatDuration(track.duration)}</span></div>;
}

export function TrackDetailsPanel({ track, activeTab, onTabChange }: { track: Track; activeTab: TrackDetailsTab; onTabChange: (tab: TrackDetailsTab) => void }) {
  const { locale } = useI18n();
  const { data: session } = useSession();
  const [detail, setDetail] = useState<Track | null>(null);
  const [notes, setNotes] = useState<MemberTrackComment[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");
  const displayed = detail ?? track;
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/tracks/${encodeURIComponent(track.id)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (payload?.data?.track) setDetail(payload.data.track as Track); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [track.id]);
  useEffect(() => {
    if (!session?.user) return;
    const controller = new AbortController();
    void fetch(`/api/user/tracks/${encodeURIComponent(track.id)}/comments`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => response.ok ? setNotes(payload.data?.comments ?? []) : setNoteError(payload.error?.message || "Unable to load notes"))
      .catch((cause) => { if (!(cause instanceof DOMException && cause.name === "AbortError")) setNoteError("Unable to load notes"); })
      .finally(() => { if (!controller.signal.aborted) setNotesLoading(false); });
    return () => controller.abort();
  }, [session?.user, track.id]);

  const saveNote = async () => {
    if (!noteDraft.trim()) return;
    setNoteSaving(true);
    setNoteError("");
    const response = await fetch(`/api/user/tracks/${encodeURIComponent(track.id)}/comments`, {
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
    const response = await fetch(`/api/user/tracks/${encodeURIComponent(track.id)}/comments?commentId=${encodeURIComponent(commentId)}`, { method: "DELETE" });
    if (response.ok) setNotes((current) => current.filter((item) => item.id !== commentId));
  };

  const tabs: Array<[TrackDetailsTab, string]> = [["information", locale === "fr" ? "Informations" : "Information"], ["versions", locale === "fr" ? "Versions" : "Versions"], ["lyrics", locale === "fr" ? "Paroles" : "Lyrics"], ...(session?.user ? [["notes", locale === "fr" ? "Notes privées" : "Private notes"] as [TrackDetailsTab, string]] : [])];
  return (
    <div className="border-t border-[var(--line)] bg-[var(--surface-soft)] px-4 py-5 md:px-8 md:py-7">
      <div className="mb-6 flex w-fit rounded-md border border-[var(--line-strong)] bg-[var(--surface)] p-0.5" role="tablist">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => onTabChange(id)} className={cn("min-h-9 rounded px-4 text-sm font-semibold", activeTab === id ? "bg-[var(--signal-strong)] text-white" : "text-[var(--text-muted)] hover:text-[var(--foreground)]")}>{label}</button>)}</div>
      {activeTab === "information" && <div className="grid gap-8 lg:grid-cols-[minmax(240px,.75fr)_1.5fr]">
        <dl className="grid content-start gap-3 text-sm">{[[locale === "fr" ? "Label" : "Label", displayed.albumLabel], [locale === "fr" ? "Album" : "Album", displayed.albumTitle], ["BPM", formatBPM(displayed.bpm)], [locale === "fr" ? "Code CD" : "CD code", displayed.cdCode], [locale === "fr" ? "Compositeurs" : "Composers", displayed.composers?.join(", ")], [locale === "fr" ? "Éditeurs" : "Publishers", displayed.publishers?.join(", ")], ["ISRC", displayed.isrc]].filter((item) => item[1]).map(([label, value]) => <div key={label} className="grid grid-cols-[110px_1fr] gap-3"><dt className="font-semibold">{label}</dt><dd className="text-[var(--text-muted)]">{value}</dd></div>)}</dl>
        <div className="grid gap-5 sm:grid-cols-2"><Terms title={locale === "fr" ? "Mots clés" : "Keywords"} values={[...(displayed.tags ?? []), ...(displayed.keywords ?? [])]} /><Terms title="Genre" values={displayed.genres} /><Terms title={locale === "fr" ? "Instruments" : "Instruments"} values={displayed.instruments} /><Terms title={locale === "fr" ? "Humeur" : "Mood"} values={displayed.moods} /><Terms title={locale === "fr" ? "Musique pour" : "Music for"} values={displayed.musicFor} /><Terms title={locale === "fr" ? "Ayants droit" : "Right holders"} values={displayed.rightHolders?.map((holder) => holder.name)} /></div>
      </div>}
      {activeTab === "versions" && (displayed.alternateTracks?.length ? <div>{displayed.alternateTracks.map((version) => <VersionRow key={version.id} track={version} />)}</div> : <p className="py-8 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Aucune version alternative disponible." : "No alternate version available."}</p>)}
      {activeTab === "lyrics" && <div className="max-w-3xl whitespace-pre-wrap py-5 text-sm leading-7 text-[var(--text-muted)]">{displayed.lyrics || (locale === "fr" ? "Paroles non disponibles." : "Lyrics unavailable.")}</div>}
      {activeTab === "notes" && session?.user && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_.9fr]"><div><p className="mb-3 text-sm font-semibold">{locale === "fr" ? "Une note visible uniquement dans votre compte." : "A note visible only in your account."}</p><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={4} maxLength={1200} placeholder={locale === "fr" ? "Intention, timecode, retour client…" : "Intent, timecode, client feedback…"} className="w-full resize-y border border-[var(--line-strong)] bg-[var(--surface)] p-3 text-sm leading-6 outline-none focus:border-[var(--foreground)]" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-[.65rem] text-[var(--text-muted)]">{noteDraft.length}/1200</span><div className="flex gap-2">{editingNoteId && <button type="button" onClick={() => { setEditingNoteId(null); setNoteDraft(""); }} className="inline-flex min-h-10 items-center gap-2 px-3 text-xs"><X size={14} />{locale === "fr" ? "Annuler" : "Cancel"}</button>}<button type="button" disabled={noteSaving || !noteDraft.trim()} onClick={() => void saveNote()} className="inline-flex min-h-10 items-center gap-2 bg-[var(--foreground)] px-4 text-xs font-semibold text-[var(--background)] disabled:opacity-40">{noteSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}{editingNoteId ? (locale === "fr" ? "Mettre à jour" : "Update") : (locale === "fr" ? "Ajouter la note" : "Add note")}</button></div></div>{noteError && <p className="mt-3 text-xs text-[var(--danger)]">{noteError}</p>}</div><div className="border-t border-[var(--line)] lg:border-l lg:border-t-0 lg:pl-6">{notesLoading ? <div className="flex min-h-28 items-center justify-center"><Loader2 className="animate-spin" /></div> : notes.length ? notes.map((note) => <article key={note.id} className="border-b border-[var(--line)] py-4 first:pt-0"><p className="whitespace-pre-wrap text-sm leading-6">{note.text}</p><div className="mt-3 flex items-center justify-between gap-3"><span className="text-[.62rem] text-[var(--text-muted)]">{note.updatedAt || note.createdAt ? new Date(note.updatedAt || note.createdAt!).toLocaleDateString(locale) : (locale === "fr" ? "Note privée" : "Private note")}</span><div className="flex"><button type="button" onClick={() => { setEditingNoteId(note.id); setNoteDraft(note.text); }} className="flex h-9 w-9 items-center justify-center text-[var(--text-muted)] hover:text-[var(--foreground)]" aria-label={locale === "fr" ? "Modifier la note" : "Edit note"}><Pencil size={14} /></button><button type="button" onClick={() => void removeNote(note.id)} className="flex h-9 w-9 items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)]" aria-label={locale === "fr" ? "Supprimer la note" : "Delete note"}><Trash2 size={14} /></button></div></div></article>) : <p className="py-6 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Aucune note pour ce morceau." : "No note for this track."}</p>}</div></div>}
    </div>
  );
}
