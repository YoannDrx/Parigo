"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";
import { Tooltip } from "@/components/ui/Tooltip";
import { CarouselNavButton } from "@/components/ui/CarouselNavButton";

export function HorizontalRail({ children, label, wide = false, cinema = false, inverse = false, tone = "page" }: { children: ReactNode; label: string; wide?: boolean; cinema?: boolean; inverse?: boolean; tone?: "page" | "surface" | "inverse" }) {
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
    <div className={cn("home-rail relative", `home-rail--${tone}`)}>
      <div ref={railRef} role="region" onScroll={updateBounds} className={cn("no-scrollbar grid snap-x snap-mandatory grid-flow-col gap-5 overflow-x-auto px-1 pt-2", tone === "surface" && "pb-5", cinema ? "auto-cols-[91%] sm:auto-cols-[72%] lg:auto-cols-[53%] xl:auto-cols-[43%]" : wide ? "auto-cols-[86%] md:auto-cols-[58%] xl:auto-cols-[42%]" : "auto-cols-[78%] sm:auto-cols-[44%] lg:auto-cols-[31%] xl:auto-cols-[23%]")} aria-label={label}>
        {children}
      </div>
      <div className={cn("mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border-t pt-4 lg:mt-3 lg:grid-cols-[auto_1fr_auto] lg:gap-5 lg:pt-5", inverse ? "border-[color:color-mix(in_srgb,var(--inverse-foreground)_24%,transparent)]" : "border-[var(--line)]")}>
        <span className={cn("home-rail__label font-mono text-[.58rem] font-semibold uppercase tracking-[.14em]", inverse ? "text-[var(--inverse-foreground)]" : "text-[var(--text-muted)]")}>{label}</span>
        <div aria-hidden="true" className={cn("relative h-[3px] overflow-hidden", inverse ? "bg-[color:color-mix(in_srgb,var(--inverse-foreground)_20%,transparent)]" : "bg-[var(--line)]")}><div style={{ transform: `scaleX(${bounds.overflow ? Math.max(.06, progress) : 1})` }} className="absolute inset-0 origin-left bg-[var(--signal)] transition-transform duration-300" /></div>
        <div className="home-rail-nav-group hidden items-center lg:flex">
          <Tooltip label={locale === "fr" ? "Précédent" : "Previous"}>
            <CarouselNavButton direction="previous" inverse={inverse} onClick={() => move(-1)} disabled={!bounds.overflow} className="home-rail-nav" aria-label={locale === "fr" ? "Précédent" : "Previous"} />
          </Tooltip>
          <Tooltip label={locale === "fr" ? "Suivant" : "Next"}>
            <CarouselNavButton direction="next" inverse={inverse} onClick={() => move(1)} disabled={!bounds.overflow} className="home-rail-nav" aria-label={locale === "fr" ? "Suivant" : "Next"} />
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
