"use client";

import { useSyncExternalStore } from "react";

export const TOUCH_LAYOUT_MEDIA_QUERY = "(max-width: 767px), (hover: none) and (pointer: coarse)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(TOUCH_LAYOUT_MEDIA_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(TOUCH_LAYOUT_MEDIA_QUERY).matches;
}

export function useTouchLayout() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
