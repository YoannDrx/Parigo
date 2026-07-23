"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";
import { Tooltip } from "@/components/ui";

function RailArrow({ direction }: { direction: -1 | 1 }) {
  return (
    <svg viewBox="0 0 42 16" className="home-rail-nav__arrow h-4 w-10" aria-hidden="true">
      <path d="M2 8h38" className="home-rail-nav__shaft" />
      <path d={direction === -1 ? "M8 2 2 8l6 6" : "m34 2 6 6-6 6"} />
    </svg>
  );
}

export function HorizontalRail({ children, label, wide = false, cinema = false, inverse = false }: { children: ReactNode; label: string; wide?: boolean; cinema?: boolean; inverse?: boolean }) {
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
      <div ref={railRef} role="region" onScroll={updateBounds} className={cn("no-scrollbar grid snap-x snap-mandatory grid-flow-col gap-5 overflow-x-auto px-1 pb-5 pt-2", cinema ? "auto-cols-[91%] sm:auto-cols-[72%] lg:auto-cols-[53%] xl:auto-cols-[43%]" : wide ? "auto-cols-[86%] md:auto-cols-[58%] xl:auto-cols-[42%]" : "auto-cols-[78%] sm:auto-cols-[44%] lg:auto-cols-[31%] xl:auto-cols-[23%]")} aria-label={label}>
        {children}
      </div>
      <div className="mt-2 grid grid-cols-1 items-center gap-5 border-t border-[var(--line)] pt-4 lg:mt-3 lg:grid-cols-[auto_1fr_auto] lg:pt-5">
        <span className="hidden font-mono text-[.56rem] uppercase tracking-[.14em] text-[var(--text-muted)] lg:block">{label}</span>
        <div aria-hidden="true" className="relative h-[2px] overflow-hidden"><div style={{ transform: `scaleX(${bounds.overflow ? Math.max(.06, progress) : 1})` }} className="absolute inset-0 origin-left bg-[var(--signal)] transition-transform duration-300" /></div>
        <div className="hidden items-center gap-3 lg:flex">
          <Tooltip label={locale === "fr" ? "Précédent" : "Previous"}>
            <button type="button" onClick={() => move(-1)} disabled={!bounds.overflow} className={cn("home-rail-nav home-rail-nav--previous", inverse && "home-rail-nav--inverse")} aria-label={locale === "fr" ? "Précédent" : "Previous"}><RailArrow direction={-1} /></button>
          </Tooltip>
          <Tooltip label={locale === "fr" ? "Suivant" : "Next"}>
            <button type="button" onClick={() => move(1)} disabled={!bounds.overflow} className={cn("home-rail-nav home-rail-nav--next", inverse && "home-rail-nav--inverse")} aria-label={locale === "fr" ? "Suivant" : "Next"}><RailArrow direction={1} /></button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
