"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { messages, type Locale, type MessageKey } from "@/i18n/messages";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: MessageKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const LOCALE_EVENT = "parigo:locale-change";

function subscribeToLocale(callback: () => void) {
  window.addEventListener(LOCALE_EVENT, callback);
  return () => window.removeEventListener(LOCALE_EVENT, callback);
}

function getLocaleSnapshot(): Locale {
  return document.documentElement.lang === "en" ? "en" : "fr";
}

function getServerLocaleSnapshot(): Locale {
  return "fr";
}

function resolveMessage(locale: Locale, key: MessageKey): string {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, messages[locale]);
  return typeof value === "string" ? value : key;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeToLocale, getLocaleSnapshot, getServerLocaleSnapshot);

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem("parigo-locale", nextLocale);
    document.documentElement.lang = nextLocale;
    document.cookie = `parigo-locale=${nextLocale};path=/;max-age=31536000;samesite=lax`;
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }, []);

  const toggleLocale = useCallback(() => setLocale(locale === "fr" ? "en" : "fr"), [locale, setLocale]);
  const t = useCallback((key: MessageKey) => resolveMessage(locale, key), [locale]);
  const value = useMemo(() => ({ locale, setLocale, toggleLocale, t }), [locale, setLocale, toggleLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
