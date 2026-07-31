"use client";

import { useEffect, useState, type ComponentType } from "react";
import { ParigoLoader } from "@/components/ui/ParigoLoader";
import { useI18n } from "@/components/providers/I18nProvider";

type StoryProps = {
  locale: "fr" | "en";
};

export function DeferredHomeStorySections(props: StoryProps) {
  const { locale } = useI18n();
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
    const timeout = globalThis.setTimeout(load, 2_000);
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
    : (
      <div className="flex min-h-[100svh] items-center justify-center bg-[var(--background)]">
        <ParigoLoader
          size="page"
          label={locale === "fr" ? "Chargement de la suite de la page" : "Loading the rest of the page"}
        />
      </div>
    );
}
