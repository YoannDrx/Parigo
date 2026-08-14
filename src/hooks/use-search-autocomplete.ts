"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAutocomplete, fetchSearchTranslationSuggestion } from "@/lib/api-client";
import type { AutocompleteGroup, AutocompleteItem, QueryResolution } from "@/types";

export function useSearchAutocomplete(
  query: string,
  language: "fr" | "en",
  enabled = true,
) {
  const [groups, setGroups] = useState<AutocompleteGroup[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim();

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
        const nextGroups = await fetchAutocomplete(normalizedQuery, language, controller.signal);
        const limitedGroups = nextGroups.map((group) => {
          const limit = group.key === "tracks" ? 4 : group.key === "words" || group.key === "filters" ? 6 : 3;
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
  }, [enabled, language, normalizedQuery]);

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

export function useEmptySearchTranslation(
  query: string,
  language: "fr" | "en",
  enabled: boolean,
) {
  const normalizedQuery = query.trim();
  const [state, setState] = useState<{
    query: string;
    status: "idle" | "loading" | "success" | "error";
    suggestion?: QueryResolution;
  }>({ query: "", status: "idle" });

  useEffect(() => {
    if (!enabled || language !== "fr" || normalizedQuery.length < 2) {
      const frame = window.requestAnimationFrame(() => setState({ query: normalizedQuery, status: "idle" }));
      return () => window.cancelAnimationFrame(frame);
    }

    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => setState({ query: normalizedQuery, status: "loading" }));
    const timeout = window.setTimeout(async () => {
      try {
        const suggestion = await fetchSearchTranslationSuggestion(normalizedQuery, language, controller.signal);
        setState({ query: normalizedQuery, status: "success", suggestion });
      } catch {
        if (!controller.signal.aborted) setState({ query: normalizedQuery, status: "error" });
      }
    }, 350);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [enabled, language, normalizedQuery]);

  const current = state.query === normalizedQuery;
  return {
    loading: current && state.status === "loading",
    suggestion: current ? state.suggestion : undefined,
  };
}
