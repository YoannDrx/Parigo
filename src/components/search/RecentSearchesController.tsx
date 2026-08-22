"use client";

import { useCallback, useEffect, useState } from "react";
import { useRecentSearches, type RecentSearchEntry } from "@/hooks/use-recent-searches";
import type { SearchMode } from "@/types";
import { RecentSearchesMenu } from "./RecentSearchesMenu";

export { recordRecentSearch } from "@/hooks/use-recent-searches";

interface RecentSearchesControllerProps {
  id: string;
  inputId: string;
  mode: SearchMode;
  locale: "fr" | "en";
  onSelectQuery: (query: string) => void;
  onClearAnnouncement: () => void;
}

const NO_RECENT_SEARCHES: RecentSearchEntry[] = [];

export function RecentSearchesController({ id, inputId, mode, locale, onSelectQuery, onClearAnnouncement }: RecentSearchesControllerProps) {
  const { items, total, record, clearAll } = useRecentSearches(mode);
  const visibleItems = mode === "ai" ? NO_RECENT_SEARCHES : items;
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement] = useState<"top" | "bottom">(() => {
    const input = document.getElementById(inputId);
    const bounds = input?.closest(".search-command")?.getBoundingClientRect();
    if (!bounds) return "bottom";
    const spaceBelow = window.innerHeight - bounds.bottom - 8;
    const spaceAbove = bounds.top - 8;
    return spaceBelow < 336 && spaceAbove > spaceBelow ? "top" : "bottom";
  });

  const select = useCallback((entry: RecentSearchEntry) => {
    record(entry.query);
    setActiveIndex(-1);
    onSelectQuery(entry.query);
  }, [onSelectQuery, record]);

  useEffect(() => {
    const input = document.getElementById(inputId);
    if (!(input instanceof HTMLInputElement)) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && visibleItems.length) {
        event.preventDefault();
        event.stopPropagation();
        setActiveIndex((current) => event.key === "ArrowDown"
          ? current >= visibleItems.length - 1 ? 0 : current + 1
          : current <= 0 ? visibleItems.length - 1 : current - 1);
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        event.stopPropagation();
        select(visibleItems[activeIndex]);
      }
    };
    input.addEventListener("keydown", onKeyDown);
    return () => input.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, inputId, select, visibleItems]);

  useEffect(() => {
    const input = document.getElementById(inputId);
    if (!(input instanceof HTMLInputElement)) return;
    if (activeIndex >= 0) input.setAttribute("aria-activedescendant", `${id}-option-${activeIndex}`);
    else input.removeAttribute("aria-activedescendant");
    return () => input.removeAttribute("aria-activedescendant");
  }, [activeIndex, id, inputId]);

  return <RecentSearchesMenu id={id} items={visibleItems} total={total} locale={locale} activeIndex={activeIndex} placement={placement} onActiveIndexChange={setActiveIndex} onSelect={select} onClearAll={() => { clearAll(); setActiveIndex(-1); onClearAnnouncement(); }} />;
}
