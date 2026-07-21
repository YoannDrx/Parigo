"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn, formatBPM, formatDuration } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import type { Track } from "@/types";
import { TrackWaveform } from "./TrackWaveform";

type Tab = "information" | "versions" | "lyrics";

function Terms({ title, values }: { title: string; values?: string[] }) {
  if (!values?.length) return null;
  return <div><h4 className="eyebrow mb-2 text-[var(--text-muted)]">{title}</h4><div className="flex flex-wrap gap-1.5">{values.map((value) => <span key={value} className="rounded-md bg-[var(--background)] px-2.5 py-1 text-xs font-semibold">{value}</span>)}</div></div>;
}

function VersionRow({ track }: { track: Track }) {
  const { currentTrack, isPlaying, play, pause, resume } = usePlayerStore();
  const active = currentTrack?.id === track.id;
  return <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] py-3 last:border-0"><button type="button" onClick={() => active ? (isPlaying ? pause() : resume()) : play(track)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] hover:border-[var(--signal-strong)]" aria-label={isPlaying && active ? "Pause" : "Play"}>{isPlaying && active ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{track.title}</p>{track.version && <span className="rounded-full border border-[var(--line)] px-2 py-0.5 font-mono text-[.58rem] uppercase text-[var(--text-muted)]">{track.version}</span>}</div><TrackWaveform trackId={track.id} initialData={track.waveform} height={22} /></div><span className="font-mono text-[.65rem] text-[var(--text-muted)]">{formatDuration(track.duration)}</span></div>;
}

export function TrackDetailsPanel({ track }: { track: Track }) {
  const { locale } = useI18n();
  const [tab, setTab] = useState<Tab>("information");
  const [detail, setDetail] = useState<Track | null>(null);
  const displayed = detail ?? track;
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/tracks/${encodeURIComponent(track.id)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (payload?.data?.track) setDetail(payload.data.track as Track); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [track.id]);
  const tabs: Array<[Tab, string]> = [["information", locale === "fr" ? "Informations" : "Information"], ["versions", locale === "fr" ? "Versions" : "Versions"], ["lyrics", locale === "fr" ? "Paroles" : "Lyrics"]];
  return (
    <div className="border-t border-[var(--line)] bg-[var(--surface-soft)] px-4 py-5 md:px-8 md:py-7">
      <div className="mb-6 flex w-fit rounded-md border border-[var(--line-strong)] bg-[var(--surface)] p-0.5" role="tablist">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn("min-h-9 rounded px-4 text-sm font-semibold", tab === id ? "bg-[var(--signal-strong)] text-white" : "text-[var(--text-muted)] hover:text-[var(--foreground)]")}>{label}</button>)}</div>
      {tab === "information" && <div className="grid gap-8 lg:grid-cols-[minmax(240px,.75fr)_1.5fr]">
        <dl className="grid content-start gap-3 text-sm">{[[locale === "fr" ? "Label" : "Label", displayed.albumLabel], [locale === "fr" ? "Album" : "Album", displayed.albumTitle], ["BPM", formatBPM(displayed.bpm)], [locale === "fr" ? "Code CD" : "CD code", displayed.cdCode], [locale === "fr" ? "Compositeurs" : "Composers", displayed.composers?.join(", ")], [locale === "fr" ? "Éditeurs" : "Publishers", displayed.publishers?.join(", ")], ["ISRC", displayed.isrc]].filter((item) => item[1]).map(([label, value]) => <div key={label} className="grid grid-cols-[110px_1fr] gap-3"><dt className="font-semibold">{label}</dt><dd className="text-[var(--text-muted)]">{value}</dd></div>)}</dl>
        <div className="grid gap-5 sm:grid-cols-2"><Terms title={locale === "fr" ? "Mots clés" : "Keywords"} values={[...(displayed.tags ?? []), ...(displayed.keywords ?? [])]} /><Terms title="Genre" values={displayed.genres} /><Terms title={locale === "fr" ? "Instruments" : "Instruments"} values={displayed.instruments} /><Terms title={locale === "fr" ? "Humeur" : "Mood"} values={displayed.moods} /><Terms title={locale === "fr" ? "Musique pour" : "Music for"} values={displayed.musicFor} /><Terms title={locale === "fr" ? "Ayants droit" : "Right holders"} values={displayed.rightHolders?.map((holder) => holder.name)} /></div>
      </div>}
      {tab === "versions" && (displayed.alternateTracks?.length ? <div>{displayed.alternateTracks.map((version) => <VersionRow key={version.id} track={version} />)}</div> : <p className="py-8 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Aucune version alternative disponible." : "No alternate version available."}</p>)}
      {tab === "lyrics" && <div className="max-w-3xl whitespace-pre-wrap py-5 text-sm leading-7 text-[var(--text-muted)]">{displayed.lyrics || (locale === "fr" ? "Paroles non disponibles." : "Lyrics unavailable.")}</div>}
    </div>
  );
}
