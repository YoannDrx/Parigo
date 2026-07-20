"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ListPlus, Play, Trash2, X } from "lucide-react";
import { useShortlistStore } from "@/stores/shortlist-store";
import { usePlayerStore } from "@/stores/player-store";
import { useI18n } from "@/components/providers/I18nProvider";

export function ShortlistDrawer() {
  const { locale, t } = useI18n();
  const { items, isOpen, setOpen, remove, clear } = useShortlistStore();
  const { setQueue, play } = usePlayerStore();

  if (items.length === 0) return null;
  const playAll = () => {
    const tracks = items.map((item) => item.track);
    setQueue(tracks, 0);
    play(tracks[0]);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-24 right-4 z-[58] flex min-h-12 items-center gap-2 rounded-full bg-[var(--signal)] px-4 text-sm font-semibold text-[#11120f] shadow-[var(--shadow-md)] md:right-8" aria-label={`${t("common.open")} ${t("search.shortlist")}, ${items.length} ${items.length > 1 ? t("catalog.tracks") : t("catalog.track")}`}><ListPlus size={18} /><span>{items.length}</span></button>
      <AnimatePresence>
        {isOpen && <><motion.button aria-label={`${t("common.close")} ${t("search.shortlist")}`} className="fixed inset-0 z-[79] bg-black/45 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} /><motion.aside role="dialog" aria-modal="true" aria-label={t("search.shortlist")} className="fixed bottom-0 right-0 top-0 z-[80] flex w-full max-w-md flex-col bg-[var(--background)] p-5 text-[var(--foreground)] shadow-[-30px_0_80px_rgba(0,0,0,.28)] md:p-7" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}><div className="flex items-center justify-between border-b border-[var(--line)] pb-5"><div><p className="eyebrow text-[var(--color-primary-dark)]">{locale === "fr" ? "Sélection de travail" : "Working selection"}</p><h2 className="mt-1 font-[var(--font-editorial)] text-4xl font-normal">{t("search.shortlist")}</h2></div><button onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)]" aria-label={t("common.close")}><X size={19} /></button></div><div className="flex-1 overflow-y-auto py-4">{items.map((item, index) => <div key={item.track.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[var(--line)] py-4"><span className="font-mono text-xs opacity-35">{String(index + 1).padStart(2,"0")}</span><div className="min-w-0"><p className="truncate font-semibold">{item.track.title}</p><p className="truncate text-sm opacity-48">{item.track.albumTitle}</p></div><button onClick={() => remove(item.track.id)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-current/[.06]" aria-label={`${t("search.removeShortlist")} : ${item.track.title}`}><Trash2 size={17} /></button></div>)}</div><div className="grid grid-cols-[1fr_auto] gap-3 border-t border-[var(--line)] pt-5"><button onClick={playAll} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--signal)] font-semibold text-[#11120f]"><Play size={17} fill="currentColor" /> {t("search.playSelection")}</button><button onClick={clear} className="flex min-h-12 items-center justify-center rounded-full border border-[var(--line)] px-4 text-sm">{t("search.clearShortlist")}</button></div></motion.aside></>}
      </AnimatePresence>
    </>
  );
}
