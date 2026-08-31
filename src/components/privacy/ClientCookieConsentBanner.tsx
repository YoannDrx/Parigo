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

export function ClientCookieConsentBanner({ locale }: { locale: Locale }) {
  // The shared shell keeps the banner available for first-time visitors. The
  // head prepaint script hides it before paint when this browser has a choice.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const refresh = () => {
      const nextVisible = readConsentSnapshot() === CONSENT_UNSET;
      document.documentElement.dataset.parigoConsent = nextVisible ? "unset" : "set";
      setVisible(nextVisible);
    };
    refresh();
    window.addEventListener(CONSENT_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, refresh);
  }, []);

  return visible ? <CookieConsentBanner locale={locale} /> : null;
}
