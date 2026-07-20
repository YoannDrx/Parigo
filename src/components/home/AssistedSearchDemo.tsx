"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Pause, Play, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { Waveform } from "@/components/features";
import { usePlayerStore } from "@/stores/player-store";
import type { Track } from "@/types";
import { cn, formatDuration } from "@/lib/utils";

const waveform = Array.from({ length: 100 }, (_, index) => {
  const value = Math.sin(index * 0.47) * 0.24 + Math.sin(index * 0.13) * 0.36;
  return Math.max(0.12, Math.min(1, Math.abs(value) + 0.18));
});

const tracks: Track[] = [
  { id: "demo-1", title: "Neon Resolve", duration: 142, bpm: 82, key: "Dm", audioUrl: "/audio/sample-1.mp3", albumId: "signal-01", albumTitle: "Night Architecture", albumCover: "/media/mock/albums/pgo0024.avif", genres: ["Electronic"], moods: ["Tense"], instruments: ["Synth"], isVocal: false, waveform },
  { id: "demo-2", title: "Opening Frame", duration: 168, bpm: 74, key: "Am", audioUrl: "/audio/sample-2.mp3", albumId: "signal-02", albumTitle: "Intimate Stories", albumCover: "/media/mock/albums/pgo0032.avif", genres: ["Cinematic"], moods: ["Melancholic"], instruments: ["Piano"], isVocal: false, waveform: [...waveform].reverse() },
  { id: "demo-3", title: "Forward Motion", duration: 126, bpm: 128, key: "F", audioUrl: "/audio/sample-3.mp3", albumId: "signal-03", albumTitle: "Bright Kinetics", albumCover: "/media/mock/albums/pgo0027.avif", genres: ["Pop"], moods: ["Energetic"], instruments: ["Drums"], isVocal: true, waveform: waveform.map((value, index) => Math.min(1, value + (index % 7) * 0.035)) },
];

interface DemoScenario {
  query: string;
  criteria: string[];
  trackOrder: number[];
}

function DemoResult({ track, queue, index }: { track: Track; queue: Track[]; index: number }) {
  const { t } = useI18n();
  const { currentTrack, isPlaying, play, pause, resume, setQueue } = usePlayerStore();
  const active = currentTrack?.id === track.id;
  const toggle = () => {
    if (active) return isPlaying ? pause() : resume();
    setQueue(queue, index);
    play(track);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className={cn("group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-t border-current/16 py-4 md:grid-cols-[auto_1.2fr_1fr_auto_auto]", active && "text-[var(--signal)]")}>
      <button type="button" onClick={toggle} className="flex h-11 w-11 items-center justify-center rounded-full border border-current/20 transition hover:border-[var(--signal)]" aria-label={active && isPlaying ? `${t("common.pause")} ${track.title}` : `${t("common.play")} ${track.title}`}>
        {active && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <div className="min-w-0"><p className="font-semibold tracking-[-.025em]">{track.title}</p><p className="text-sm opacity-45">{track.albumTitle}</p></div>
      <div className="hidden md:block"><Waveform data={track.waveform} progress={active ? 22 : 0} height={26} waveColor="currentColor" progressColor="var(--signal)" /></div>
      <span className="hidden font-mono text-[.65rem] opacity-45 md:block">{track.bpm} BPM</span>
      <span className="font-mono text-[.65rem] opacity-45">{formatDuration(track.duration)}</span>
    </motion.div>
  );
}

export function AssistedSearchDemo() {
  const { locale, t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [showResults, setShowResults] = useState(Boolean(reduceMotion));
  const scenarios = useMemo<DemoScenario[]>(() => locale === "fr" ? [
    { query: "Une tension électronique lente, sans voix", criteria: ["Électronique", "Tension", "Sans voix", "70–90 BPM"], trackOrder: [0, 1, 2] },
    { query: "Un piano intime et organique pour un documentaire", criteria: ["Piano", "Intime", "Documentaire", "Instrumental"], trackOrder: [1, 0, 2] },
    { query: "Une énergie lumineuse pour une campagne sport", criteria: ["Sport", "Énergique", "Lumineux", "> 125 BPM"], trackOrder: [2, 0, 1] },
    { query: "Des cordes cinématiques, épiques mais sensibles", criteria: ["Cordes", "Cinématique", "Épique", "Émotion"], trackOrder: [1, 2, 0] },
  ] : [
    { query: "Slow electronic tension with no vocals", criteria: ["Electronic", "Tension", "No vocals", "70–90 BPM"], trackOrder: [0, 1, 2] },
    { query: "Intimate organic piano for a documentary", criteria: ["Piano", "Intimate", "Documentary", "Instrumental"], trackOrder: [1, 0, 2] },
    { query: "Bright energy for a sports campaign", criteria: ["Sport", "Energetic", "Bright", "> 125 BPM"], trackOrder: [2, 0, 1] },
    { query: "Cinematic strings, epic yet sensitive", criteria: ["Strings", "Cinematic", "Epic", "Emotional"], trackOrder: [1, 2, 0] },
  ], [locale]);

  useEffect(() => {
    if (reduceMotion) return;
    const resultsTimer = window.setTimeout(() => setShowResults(true), 1700);
    const nextTimer = window.setTimeout(() => { setShowResults(false); setActive((value) => (value + 1) % scenarios.length); }, 5600);
    return () => { window.clearTimeout(resultsTimer); window.clearTimeout(nextTimer); };
  }, [active, reduceMotion, scenarios.length]);

  const scenario = scenarios[active];
  const resultsVisible = Boolean(reduceMotion) || showResults;
  const queue = scenario.trackOrder.map((index) => tracks[index]);
  const chooseScenario = (index: number) => { setActive(index); setShowResults(Boolean(reduceMotion)); };

  return (
    <div className="overflow-hidden border border-white/18 bg-black/18 shadow-[0_28px_90px_rgba(0,0,0,.22)]">
      <div className="flex min-h-20 items-center gap-4 border-b border-white/16 px-5 md:px-7">
        <Search size={19} className="shrink-0 text-[var(--signal)]" />
        <div className="min-w-0 flex-1 text-base font-medium md:text-lg" aria-live="polite">
          <motion.span key={scenario.query} initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.025 } } }} aria-label={scenario.query}>
            {scenario.query.split("").map((character, index) => <motion.span key={`${character}-${index}`} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} aria-hidden="true">{character}</motion.span>)}
          </motion.span>
          {!resultsVisible && <span className="ml-0.5 inline-block h-5 w-px animate-pulse bg-[var(--signal)] align-middle" />}
        </div>
        <motion.span animate={{ scale: resultsVisible ? [1, 1.13, 1] : 1 }} className="flex h-10 w-10 shrink-0 items-center justify-center bg-[var(--signal)] text-[#11120f]">{resultsVisible ? <Check size={17} /> : <ArrowRight size={17} />}</motion.span>
      </div>

      <div className="min-h-[360px] px-5 py-5 md:px-7">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Sparkles size={15} className="text-[var(--signal)]" />
          <span className="eyebrow opacity-52">{locale === "fr" ? "Critères compris" : "Understood criteria"}</span>
          <AnimatePresence mode="popLayout">
            {resultsVisible && scenario.criteria.map((criterion) => <motion.span key={criterion} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border border-current/18 px-2.5 py-1 font-mono text-[.62rem]">{criterion}</motion.span>)}
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait">
          {resultsVisible ? <motion.div key={active} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{queue.map((track, index) => <DemoResult key={track.id} track={track} queue={queue} index={index} />)}</motion.div> : <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid min-h-56 place-items-center"><div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[.14em] opacity-45"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--signal)]" />{locale === "fr" ? "Interprétation de l’intention" : "Interpreting the intention"}</div></motion.div>}
        </AnimatePresence>
        <Link href={`/search?q=${encodeURIComponent(scenario.query)}`} className="mt-5 inline-flex items-center gap-2 border-b border-current/30 pb-1 text-sm font-semibold hover:border-[var(--signal)] hover:text-[var(--signal)]">{t("common.seeAll")} <ArrowRight size={15} /></Link>
      </div>

      <div className="grid grid-cols-4 border-t border-white/16" aria-label={locale === "fr" ? "Choisir une recherche de démonstration" : "Choose a demo search"}>
        {scenarios.map((item, index) => <button type="button" key={item.query} onClick={() => chooseScenario(index)} aria-pressed={index === active} className={cn("min-h-11 border-r border-white/14 font-mono text-[.62rem] transition last:border-r-0", index === active ? "bg-[var(--signal)] text-[#11120f]" : "opacity-45 hover:opacity-100")}>0{index + 1}</button>)}
      </div>
    </div>
  );
}
