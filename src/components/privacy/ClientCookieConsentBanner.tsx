"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/messages";
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_COOKIE_NAME,
  CONSENT_STORAGE_KEY,
  CONSENT_UNSET,
  normalizeConsentSnapshot,
} from "@/lib/consent";
import { CookieConsentBanner } from "./CookieConsentBanner";

function readConsentSnapshot() {
  const stored = normalizeConsentSnapshot(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  if (stored !== CONSENT_UNSET) return stored;

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))
    ?.slice(CONSENT_COOKIE_NAME.length + 1);
  return normalizeConsentSnapshot(cookie);
}

export function ClientCookieConsentBanner({ locale, initialSnapshot }: { locale: Locale; initialSnapshot: string }) {
  // Match the request cookie on the first render so an existing choice never
  // flashes before hydration. Local storage remains the client-side fallback.
  const [visible, setVisible] = useState(initialSnapshot === CONSENT_UNSET);

  useEffect(() => {
    const refresh = () => setVisible(readConsentSnapshot() === CONSENT_UNSET);
    refresh();
    window.addEventListener(CONSENT_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, refresh);
  }, []);

  return visible ? <CookieConsentBanner locale={locale} /> : null;
}
