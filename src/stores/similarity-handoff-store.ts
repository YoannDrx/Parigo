"use client";

import { useSyncExternalStore } from "react";
import type { SimilaritySearchSource } from "@/types";

export type SimilarityHandoff =
  | { source: "track"; openPicker: true }
  | { source: "prompt"; prompt: string }
  | { source: "url"; url: string }
  | { source: "upload"; file: File };

declare global {
  interface Window {
    __parigoSimilarityHandoff?: SimilarityHandoff;
  }
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function setSimilarityHandoff(value: SimilarityHandoff) {
  if (typeof window !== "undefined") {
    window.__parigoSimilarityHandoff = value;
    emit();
  }
}

export function peekSimilarityHandoff(): SimilarityHandoff | null {
  return typeof window === "undefined" ? null : window.__parigoSimilarityHandoff ?? null;
}

export function clearSimilarityHandoff(source?: SimilaritySearchSource) {
  if (typeof window === "undefined") return;
  if (!source || window.__parigoSimilarityHandoff?.source === source) {
    delete window.__parigoSimilarityHandoff;
    emit();
  }
}

export function useSimilarityHandoff(): SimilarityHandoff | null {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    peekSimilarityHandoff,
    () => null,
  );
}
