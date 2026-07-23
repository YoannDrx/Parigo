"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { Playlist } from "@/types";

type StoryProps = { locale: "fr" | "en"; playlists: Playlist[] };

export function DeferredHomeStorySections(props: StoryProps) {
  const [Sections, setSections] = useState<ComponentType<StoryProps> | null>(null);

  useEffect(() => {
    let active = true;
    let requested = false;
    const load = () => {
      if (requested) return;
      requested = true;
      void import("./HomeStorySections").then((module) => {
        if (active) setSections(() => module.HomeStorySections);
      });
    };
    // These long-form, below-the-fold animations are intentionally kept out of
    // the LCP window. A user who scrolls gets them immediately; an idle page
    // receives them after the critical rendering work has settled.
    const timeout = globalThis.setTimeout(load, 6_000);
    const loadOnIntent = () => load();
    window.addEventListener("scroll", loadOnIntent, { once: true, passive: true });
    return () => {
      active = false;
      globalThis.clearTimeout(timeout);
      window.removeEventListener("scroll", loadOnIntent);
    };
  }, []);

  return Sections
    ? <Sections {...props} />
    : <div aria-hidden="true" className="h-[795svh] lg:h-[753svh]" />;
}
