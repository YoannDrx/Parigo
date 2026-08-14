"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAutocomplete } from "@/lib/api-client";
import type { AutocompleteGroup, AutocompleteItem, AutocompleteSearchContext } from "@/types";

export function useSearchAutocomplete(
  query: string,
  language: "fr" | "en",
  enabled = true,
  context: AutocompleteSearchContext = {},
) {
  const [groups, setGroups] = useState<AutocompleteGroup[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim();
  const categories = context.categories?.join(",") ?? "";
  const styles = context.styles?.join(",") ?? "";
  const labels = context.labels?.join(",") ?? "";

  useEffect(() => {
    if (!enabled || normalizedQuery.length < 2) {
      const frame = window.requestAnimationFrame(() => {
        setGroups([]);
        setStatus("idle");
        setActiveIndex(-1);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => {
      setGroups([]);
      setStatus("loading");
      setActiveIndex(-1);
    });
    const timeout = window.setTimeout(async () => {
      try {
        const nextGroups = await fetchAutocomplete(normalizedQuery, language, {
          categories: categories ? categories.split(",") : undefined,
          styles: styles ? styles.split(",") : undefined,
          labels: labels ? labels.split(",") : undefined,
          composer: context.composer,
          minBpm: context.minBpm,
          maxBpm: context.maxBpm,
          minDuration: context.minDuration,
          maxDuration: context.maxDuration,
          type: context.type,
          sort: context.sort,
        }, controller.signal);
        const limitedGroups = nextGroups.map((group) => {
          const limit = group.key === "titles" ? 12 : group.key === "tracks" ? 4 : group.key === "words" || group.key === "filters" ? 6 : 3;
          return { ...group, items: group.items.slice(0, limit) };
        });
        setGroups(limitedGroups.filter((group) => group.items.length > 0));
        setStatus("success");
        setActiveIndex(-1);
      } catch {
        if (!controller.signal.aborted) {
          setGroups([]);
          setStatus("error");
        }
      }
    }, 250);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [categories, context.composer, context.maxBpm, context.maxDuration, context.minBpm, context.minDuration, context.sort, context.type, enabled, labels, language, normalizedQuery, styles]);

  const items = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const close = useCallback(() => {
    setGroups([]);
    setStatus("idle");
    setActiveIndex(-1);
  }, []);
  const move = useCallback((direction: 1 | -1) => {
    if (!items.length) return;
    setActiveIndex((current) => {
      if (direction === 1) return current >= items.length - 1 ? 0 : current + 1;
      return current <= 0 ? items.length - 1 : current - 1;
    });
  }, [items.length]);

  return {
    groups,
    items,
    loading: status === "loading",
    status,
    activeIndex,
    activeItem: activeIndex >= 0 ? items[activeIndex] : undefined,
    setActiveIndex,
    move,
    close,
  };
}

export function autocompleteItemIndex(groups: AutocompleteGroup[], item: AutocompleteItem): number {
  return groups.flatMap((group) => group.items).findIndex((candidate) =>
    candidate.kind === item.kind
      && candidate.id === item.id
      && candidate.filterGroup === item.filterGroup,
  );
}
