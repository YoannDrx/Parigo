"use client";

import { useCallback, useEffect, useState } from "react";
import type { SearchMode } from "@/types";

export const RECENT_SEARCHES_STORAGE_KEY = "parigo-recent-searches-v1";
const RECENT_SEARCHES_EVENT = "parigo:recent-searches-change";
const MAX_RECENT_SEARCHES = 8;

export interface RecentSearchEntry {
  query: string;
  updatedAt: number;
}

export interface RecentSearchState {
  version: 1;
  keyword: RecentSearchEntry[];
  ai: RecentSearchEntry[];
}

const EMPTY_STATE: RecentSearchState = { version: 1, keyword: [], ai: [] };

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").slice(0, 500);
}

function validEntries(value: unknown): RecentSearchEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<RecentSearchEntry>;
    const query = typeof candidate.query === "string" ? normalizeQuery(candidate.query) : "";
    const updatedAt = typeof candidate.updatedAt === "number" && Number.isFinite(candidate.updatedAt) ? candidate.updatedAt : 0;
    return query && updatedAt > 0 ? [{ query, updatedAt }] : [];
  }).slice(0, MAX_RECENT_SEARCHES);
}

export function parseRecentSearches(value: string | null): RecentSearchState {
  if (!value) return EMPTY_STATE;
  try {
    const parsed = JSON.parse(value) as Partial<RecentSearchState>;
    if (parsed.version !== 1) return EMPTY_STATE;
    return { version: 1, keyword: validEntries(parsed.keyword), ai: validEntries(parsed.ai) };
  } catch {
    return EMPTY_STATE;
  }
}

function readRecentSearches() {
  if (typeof window === "undefined") return EMPTY_STATE;
  return parseRecentSearches(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY));
}

function persistRecentSearches(state: RecentSearchState) {
  window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
}

export function recordRecentSearch(mode: SearchMode, query: string, updatedAt = Date.now()) {
  if (typeof window === "undefined") return EMPTY_STATE;
  const normalized = normalizeQuery(query);
  if (!normalized) return readRecentSearches();
  const current = readRecentSearches();
  const nextEntries = [
    { query: normalized, updatedAt },
    ...current[mode].filter((entry) => entry.query.localeCompare(normalized, undefined, { sensitivity: "accent" }) !== 0),
  ].slice(0, MAX_RECENT_SEARCHES);
  const next = { ...current, [mode]: nextEntries };
  persistRecentSearches(next);
  return next;
}

export function clearRecentSearches() {
  if (typeof window === "undefined") return EMPTY_STATE;
  persistRecentSearches(EMPTY_STATE);
  return EMPTY_STATE;
}

export function useRecentSearches(mode: SearchMode) {
  const [state, setState] = useState<RecentSearchState>(EMPTY_STATE);

  useEffect(() => {
    const update = () => setState(readRecentSearches());
    const onStorage = (event: StorageEvent) => {
      if (event.key === RECENT_SEARCHES_STORAGE_KEY) update();
    };
    update();
    window.addEventListener(RECENT_SEARCHES_EVENT, update);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(RECENT_SEARCHES_EVENT, update);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const record = useCallback((query: string) => {
    setState(recordRecentSearch(mode, query));
  }, [mode]);
  const clearAll = useCallback(() => setState(clearRecentSearches()), []);
  const total = state.keyword.length + state.ai.length;

  return { items: state[mode], total, record, clearAll };
}
