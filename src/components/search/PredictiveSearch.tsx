"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Disc3, FolderHeart, Music2, Search, Tags, UserRound, X } from "lucide-react";
import { fetchAutocomplete } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { AutocompleteGroup, AutocompleteItem } from "@/types";
import { ParigoLoader } from "@/components/ui/ParigoLoader";

const groupLabels = {
  tracks: { fr: "Pistes", en: "Tracks" },
  albums: { fr: "Albums", en: "Albums" },
  playlists: { fr: "Playlists", en: "Playlists" },
  labels: { fr: "Labels", en: "Labels" },
  composers: { fr: "Compositeurs", en: "Composers" },
  words: { fr: "Mots-clés", en: "Keywords" },
} as const;

function GroupIcon({ group }: { group: AutocompleteGroup["key"] }) {
  if (group === "tracks") return <Disc3 size={16} />;
  if (group === "albums") return <Music2 size={16} />;
  if (group === "playlists") return <FolderHeart size={16} />;
  if (group === "labels") return <Tags size={16} />;
  if (group === "composers") return <UserRound size={16} />;
  return <Search size={16} />;
}

export function PredictiveSearch({
  query,
  locale,
  view,
  localizedPath,
  onViewChange,
  onWordSelect,
  onOpenChange,
}: {
  query: string;
  locale: "fr" | "en";
  view: "tracks" | "albums";
  localizedPath: (path: string) => string;
  onViewChange: (view: "tracks" | "albums") => void;
  onWordSelect: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const initialQuery = useRef(query.trim());
  const dismissedQuery = useRef("");
  const suppressFocusOpen = useRef(false);
  const previousQuery = useRef("");
  const [groups, setGroups] = useState<AutocompleteGroup[]>([]);
  const [activeKey, setActiveKey] = useState<AutocompleteGroup["key"]>(view);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const normalized = query.trim();

  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (previousQuery.current !== normalized) {
      dismissedQuery.current = "";
      previousQuery.current = normalized;
    }
    if (normalized.length < 2) {
      setGroups([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    const timeout = window.setTimeout(() => {
      setLoading(true);
      void fetchAutocomplete(normalized, locale, controller.signal)
        .then((nextGroups) => {
          if (currentRequest !== requestId.current) return;
          setGroups(nextGroups);
          setOpen(
            normalized !== initialQuery.current
            &&
            dismissedQuery.current !== normalized
            && nextGroups.some((group) => group.items.length > 0),
          );
          setActiveIndex(0);
        })
        .catch(() => {
          if (!controller.signal.aborted && currentRequest === requestId.current) {
            setGroups([]);
            setOpen(false);
          }
        })
        .finally(() => {
          if (currentRequest === requestId.current) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locale, normalized]);

  useEffect(() => {
    setActiveKey(view);
  }, [view]);

  const visibleGroups = useMemo(() => groups.filter((group) => group.items.length > 0), [groups]);
  const activeGroup = visibleGroups.find((group) => group.key === activeKey) ?? visibleGroups[0];
  const activeItem = activeGroup?.items[activeIndex];

  useEffect(() => {
    if (activeGroup && activeGroup.key !== activeKey) setActiveKey(activeGroup.key);
  }, [activeGroup, activeKey]);

  const close = useCallback((returnFocus = false) => {
    dismissedQuery.current = normalized;
    setOpen(false);
    if (returnFocus) {
      suppressFocusOpen.current = true;
      window.requestAnimationFrame(() => {
        document.getElementById("catalog-search")?.focus();
        suppressFocusOpen.current = false;
      });
    }
  }, [normalized]);

  const selectItem = useCallback((item: AutocompleteItem) => {
    if (item.kind === "keyword" || item.kind === "lyrics") {
      onWordSelect(item.label);
      close(true);
    }
  }, [close, onWordSelect]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const input = document.getElementById("catalog-search");
      if (panelRef.current?.contains(target) || input?.contains(target)) return;
      if (open) close(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if ((event.target as HTMLElement | null)?.id !== "catalog-search") return;
      if (suppressFocusOpen.current || normalized.length < 2 || !visibleGroups.length) return;
      dismissedQuery.current = "";
      setOpen(true);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [close, normalized.length, open, visibleGroups.length]);

  useEffect(() => {
    if (!open || !activeGroup?.items.length) return;
    const onInputKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.id !== "catalog-search") return;
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((current) => (current + direction + activeGroup.items.length) % activeGroup.items.length);
        return;
      }
      if (event.key === "Enter" && activeItem) {
        event.preventDefault();
        if (activeItem.href) {
          close(false);
          router.push(localizedPath(activeItem.href));
        } else {
          selectItem(activeItem);
        }
      }
    };
    document.addEventListener("keydown", onInputKeyDown);
    return () => document.removeEventListener("keydown", onInputKeyDown);
  }, [activeGroup, activeItem, close, localizedPath, open, router, selectItem]);

  if (normalized.length < 2 || (!loading && !open)) return null;

  return (
    <div
      ref={panelRef}
      id="catalog-search-suggestions"
      className="absolute inset-x-0 top-[calc(100%+.5rem)] z-50 overflow-hidden border border-[var(--line-strong)] bg-[var(--surface)] shadow-[0_24px_70px_rgba(0,0,0,.24)]"
      role="region"
      aria-label={locale === "fr" ? "Suggestions de recherche" : "Search suggestions"}
    >
      {loading && !visibleGroups.length ? (
        <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
          <ParigoLoader size="compact" label={locale === "fr" ? "Chargement des suggestions" : "Loading suggestions"} />
          {locale === "fr" ? "Recherche de correspondances…" : "Looking for matches…"}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-3 py-2.5 sm:px-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold">{locale === "fr" ? "Recherches associées" : "Related searches"}</p>
              <p className="mt-0.5 truncate text-[.68rem] text-[var(--text-muted)]">« {normalized} »</p>
            </div>
            <button
              type="button"
              onClick={() => close(true)}
              className="grid h-10 w-10 shrink-0 place-items-center border border-[var(--line)] transition hover:border-[var(--signal-strong)] hover:text-[var(--signal-strong)]"
              aria-label={locale === "fr" ? "Fermer les suggestions" : "Close suggestions"}
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex overflow-x-auto border-b border-[var(--line)] bg-[var(--surface-soft)] p-1" role="tablist">
            {visibleGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                role="tab"
                aria-selected={activeGroup?.key === group.key}
                onClick={() => {
                  setActiveKey(group.key);
                  setActiveIndex(0);
                }}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition",
                  activeGroup?.key === group.key
                    ? "border-[var(--signal-strong)] bg-[var(--surface)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--foreground)]",
                )}
              >
                <GroupIcon group={group.key} />
                {groupLabels[group.key][locale]}
                <span className="font-mono text-[.62rem] opacity-55">{group.count}</span>
              </button>
            ))}
          </div>
          {activeGroup ? (
            <>
              <ul id="catalog-search-listbox" role="listbox" className="max-h-[min(23rem,48vh)] overflow-y-auto p-1.5">
                {activeGroup.items.map((item, index) => {
                  const content = (
                    <>
                      <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--text-muted)]">
                        {item.image ? <Image src={item.image} alt="" fill sizes="44px" className="object-cover" /> : <GroupIcon group={activeGroup.key} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.label}</span>
                        {item.subtitle ? <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{item.subtitle}</span> : null}
                      </span>
                      <ArrowRight size={14} className="shrink-0 opacity-45" />
                    </>
                  );
                  const className = cn(
                    "flex min-h-14 items-center gap-3 border border-transparent px-2.5 py-2 text-left transition",
                    activeIndex === index
                      ? "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--signal-strong)]"
                      : "hover:bg-[var(--surface-soft)]",
                  );
                  return (
                    <li id={`catalog-suggestion-${activeGroup.key}-${index}`} key={`${item.kind}-${item.id}`} role="option" aria-selected={activeIndex === index}>
                      {item.href ? (
                        <Link
                          href={localizedPath(item.href)}
                          className={className}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => close(false)}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={cn(className, "w-full")}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectItem(item)}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-col gap-2 border-t border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2.5 text-[.67rem] text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
                {activeGroup.key === "tracks" || activeGroup.key === "albums" ? (
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-2 self-start font-semibold text-[var(--foreground)] hover:text-[var(--signal-strong)]"
                    onClick={() => {
                      onViewChange(activeGroup.key === "albums" ? "albums" : "tracks");
                      close(true);
                    }}
                  >
                    {locale === "fr" ? "Afficher tous les résultats" : "Show all results"} · {groupLabels[activeGroup.key][locale]}
                    <ArrowRight size={13} />
                  </button>
                ) : <span />}
                <span>{locale === "fr" ? "↑↓ naviguer · Entrée ouvrir · Échap fermer" : "↑↓ navigate · Enter open · Esc close"}</span>
              </div>
            </>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {locale === "fr" ? `${activeGroup?.items.length ?? 0} suggestions` : `${activeGroup?.items.length ?? 0} suggestions`}
          </p>
        </>
      )}
    </div>
  );
}
