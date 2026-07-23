"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { Playlist } from "@/types";

type StoryProps = { locale: "fr" | "en"; playlists: Playlist[] };

export function DeferredHomeStorySections(props: StoryProps) {
  const [Sections, setSections] = useState<ComponentType<StoryProps> | null>(null);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let idle: number | null = null;
    const load = () => {
      void import("./HomeStorySections").then((module) => {
        if (active) setSections(() => module.HomeStorySections);
      });
    };
    if ("requestIdleCallback" in window) idle = window.requestIdleCallback(load, { timeout: 1_500 });
    else timeout = globalThis.setTimeout(load, 500);
    return () => {
      active = false;
      if (idle !== null && "cancelIdleCallback" in window) window.cancelIdleCallback(idle);
      if (timeout !== null) globalThis.clearTimeout(timeout);
    };
  }, []);

  return Sections ? <Sections {...props} /> : <div aria-hidden="true" className="h-px" />;
}
