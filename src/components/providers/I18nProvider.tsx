"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { messages, type Locale, type MessageKey } from "@/i18n/messages";
import { localizedPath as buildLocalizedPath } from "@/lib/locale";

interface I18nContextValue {
  locale: Locale;
  localizedPath: (path: string) => string;
  t: (key: MessageKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveMessage(locale: Locale, key: MessageKey): string {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, messages[locale]);
  return typeof value === "string" ? value : key;
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const locale = initialLocale;
  const t = useCallback((key: MessageKey) => resolveMessage(locale, key), [locale]);
  const localizedPath = useCallback((path: string) => buildLocalizedPath(locale, path), [locale]);
  const value = useMemo(() => ({ locale, localizedPath, t }), [locale, localizedPath, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
