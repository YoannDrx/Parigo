"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((module) => module.Analytics),
  { ssr: false },
);
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then((module) => module.SpeedInsights),
  { ssr: false },
);

const STORAGE_KEY = "parigo-cookie-consent";
const CHANGE_EVENT = "parigo:cookie-consent-change";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function getSnapshot() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return false;
    return JSON.parse(value).analytics === true;
  } catch {
    return false;
  }
}

function sanitizeUrl(url: string): string {
  const parsed = new URL(url, window.location.origin);
  parsed.search = "";
  parsed.pathname = parsed.pathname
    .replace(/\/albums\/[^/]+/, "/albums/[id]")
    .replace(/\/labels\/[^/]+/, "/labels/[slug]")
    .replace(/\/playlists\/[^/]+/, "/playlists/[slug]")
    .replace(/\/engage-playlist\/[^/]+/, "/engage-playlist/[token]");
  return `${parsed.origin}${parsed.pathname}`;
}

export function AnalyticsGate() {
  const allowed = useSyncExternalStore(subscribe, getSnapshot, () => false);
  if (!allowed) return null;

  return (
    <>
      <Analytics beforeSend={(event) => ({ ...event, url: sanitizeUrl(event.url) })} />
      <SpeedInsights beforeSend={(metric) => ({ ...metric, url: sanitizeUrl(metric.url) })} />
    </>
  );
}
