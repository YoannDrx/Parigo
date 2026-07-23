"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";

export function HorizontalRail({ children, label, wide = false, cinema = false }: { children: ReactNode; label: string; wide?: boolean; cinema?: boolean }) {
  const { locale } = useI18n();
  const railRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ start: true, end: false, overflow: false });
  const [progress, setProgress] = useState(0);

  const updateBounds = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setBounds({
      start: rail.scrollLeft <= 2,
      end: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2,
      overflow: rail.scrollWidth > rail.clientWidth + 2,
    });
    const maxScroll = Math.max(1, rail.scrollWidth - rail.clientWidth);
    setProgress(Math.min(1, Math.max(0, rail.scrollLeft / maxScroll)));
  }, []);

  useEffect(() => {
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    if (railRef.current) observer.observe(railRef.current);
    return () => observer.disconnect();
  }, [children, updateBounds]);

  const move = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail || !bounds.overflow) return;
    if (direction === 1 && bounds.end) {
      rail.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    if (direction === -1 && bounds.start) {
      rail.scrollTo({ left: rail.scrollWidth - rail.clientWidth, behavior: "smooth" });
      return;
    }
    rail.scrollBy({ left: direction * Math.max(320, rail.clientWidth * .82), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div ref={railRef} onScroll={updateBounds} className={cn("no-scrollbar grid snap-x snap-mandatory grid-flow-col gap-5 overflow-x-auto px-1 pb-5 pt-2", cinema ? "auto-cols-[91%] sm:auto-cols-[72%] lg:auto-cols-[53%] xl:auto-cols-[43%]" : wide ? "auto-cols-[86%] md:auto-cols-[58%] xl:auto-cols-[42%]" : "auto-cols-[78%] sm:auto-cols-[44%] lg:auto-cols-[31%] xl:auto-cols-[23%]")} aria-label={label}>
        {children}
      </div>
      <div className="mt-2 grid grid-cols-1 items-center gap-5 border-t border-[var(--line)] pt-4 lg:mt-3 lg:grid-cols-[auto_1fr_auto] lg:pt-5">
        <span className="hidden font-mono text-[.56rem] uppercase tracking-[.14em] text-[var(--text-muted)] lg:block">{label}</span>
        <div aria-hidden="true" className="relative h-[2px] overflow-hidden"><div style={{ transform: `scaleX(${bounds.overflow ? Math.max(.06, progress) : 1})` }} className="absolute inset-0 origin-left bg-[var(--signal)] transition-transform duration-300" /></div>
        <div className="hidden gap-2 lg:flex">
        <button type="button" onClick={() => move(-1)} disabled={!bounds.overflow} className="group flex h-12 w-16 items-center justify-center overflow-hidden rounded-full border border-current transition enabled:hover:border-[var(--signal)] enabled:hover:bg-[var(--signal)] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-25" aria-label={locale === "fr" ? "Précédent" : "Previous"}><ChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" /></button>
        <button type="button" onClick={() => move(1)} disabled={!bounds.overflow} className="group flex h-12 w-16 items-center justify-center overflow-hidden rounded-full border border-current transition enabled:hover:border-[var(--signal)] enabled:hover:bg-[var(--signal)] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-25" aria-label={locale === "fr" ? "Suivant" : "Next"}><ChevronRight size={20} className="transition-transform group-hover:translate-x-1" /></button>
        </div>
      </div>
    </div>
  );
}
