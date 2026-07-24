"use client";

import { useEffect } from "react";
import type { Locale } from "@/i18n/messages";
import {
  CONSENT_BANNER_ID,
  CONSENT_OPEN_EVENT,
  CONSENT_STORAGE_KEY,
  CONSENT_UNSET,
  createDefaultConsentPreferences,
  normalizeConsentSnapshot,
  persistConsentPreferences,
} from "@/lib/consent";

export function CookieConsentActions({ locale }: { locale: Locale }) {
  useEffect(() => {
    if (normalizeConsentSnapshot(window.localStorage.getItem(CONSENT_STORAGE_KEY)) !== CONSENT_UNSET) {
      document.getElementById(CONSENT_BANNER_ID)?.remove();
    }
  }, []);

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <button type="button" onClick={() => persistConsentPreferences({ ...createDefaultConsentPreferences(), preferences: true, analytics: true, marketing: true })} className="min-h-11 bg-[var(--signal)] px-5 text-sm font-semibold text-[#10110e]">
        {locale === "fr" ? "Tout accepter" : "Accept all"}
      </button>
      <button type="button" onClick={() => persistConsentPreferences(createDefaultConsentPreferences())} className="min-h-11 border border-white/22 px-5 text-sm font-semibold">
        {locale === "fr" ? "Tout refuser" : "Reject all"}
      </button>
      <button type="button" onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))} className="min-h-11 border-b border-white/28 px-3 text-sm">
        {locale === "fr" ? "Personnaliser" : "Customise"}
      </button>
    </div>
  );
}
