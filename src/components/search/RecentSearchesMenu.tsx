"use client";

import { Clock3, Trash2 } from "lucide-react";
import type { RecentSearchEntry } from "@/hooks/use-recent-searches";
import { cn } from "@/lib/utils";

interface RecentSearchesMenuProps {
  id: string;
  items: RecentSearchEntry[];
  total: number;
  locale: "fr" | "en";
  activeIndex: number;
  placement: "top" | "bottom";
  onActiveIndexChange: (index: number) => void;
  onSelect: (entry: RecentSearchEntry) => void;
  onClearAll: () => void;
}

function relativeDate(timestamp: number, locale: "fr" | "en") {
  const elapsed = timestamp - Date.now();
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const minutes = Math.round(elapsed / 60_000);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(elapsed / 3_600_000);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(elapsed / 86_400_000), "day");
}

export function RecentSearchesMenu({
  id,
  items,
  total,
  locale,
  activeIndex,
  placement,
  onActiveIndexChange,
  onSelect,
  onClearAll,
}: RecentSearchesMenuProps) {
  return (
    <div
      data-testid="recent-searches-menu"
      data-placement={placement}
      className={cn(
        "absolute inset-x-0 z-[70] overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] shadow-[8px_10px_0_color-mix(in_srgb,var(--signal)_10%,transparent),var(--shadow-xl)] motion-safe:animate-[search-autocomplete-enter_180ms_ease-out_both]",
        "rounded-[var(--parigo-corner-lg)_var(--parigo-turn-lg)]",
        placement === "top" ? "bottom-[calc(100%+.55rem)]" : "top-[calc(100%+.55rem)]",
      )}
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--line)] px-4">
        <p className="flex items-center gap-2 text-xs font-semibold"><Clock3 size={14} className="text-[var(--signal-strong)]" />{locale === "fr" ? "Recherches récentes" : "Recent searches"}</p>
        {total > 0 ? <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClearAll} className="inline-flex min-h-11 items-center gap-1.5 text-[.68rem] font-semibold text-[var(--text-muted)] transition hover:text-[var(--danger)] focus-visible:text-[var(--danger)]"><Trash2 size={13} />{locale === "fr" ? "Tout effacer" : "Clear all"}</button> : null}
      </div>
      {items.length ? (
        <div id={id} role="listbox" aria-label={locale === "fr" ? "Recherches récentes" : "Recent searches"} className="max-h-[min(18rem,42vh)] overflow-y-auto p-2">
          {items.map((entry, index) => (
            <button
              key={`${entry.query}-${entry.updatedAt}`}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onActiveIndexChange(index)}
              onClick={() => onSelect(entry)}
              className={cn("grid min-h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 text-left transition", activeIndex === index ? "bg-[var(--foreground)] text-[var(--background)]" : "hover:bg-[var(--surface-soft)]")}
            >
              <Clock3 size={14} className="opacity-55" />
              <span className="truncate text-sm font-medium">{entry.query}</span>
              <span className="font-mono text-[.55rem] opacity-55">{relativeDate(entry.updatedAt, locale)}</span>
            </button>
          ))}
        </div>
      ) : <div id={id} role="listbox" aria-label={locale === "fr" ? "Recherches récentes" : "Recent searches"}><p className="px-4 py-5 text-sm text-[var(--text-muted)]">{locale === "fr" ? "Aucune recherche récente dans ce mode." : "No recent searches in this mode."}</p></div>}
    </div>
  );
}
