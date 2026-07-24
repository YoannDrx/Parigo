export const CONSENT_STORAGE_KEY = "parigo-cookie-consent";
export const CONSENT_COOKIE_NAME = "parigo-consent";
export const CONSENT_UNSET = "unset";
export const CONSENT_CHANGE_EVENT = "parigo:cookie-consent-change";
export const CONSENT_OPEN_EVENT = "parigo:open-cookie-preferences";
export const CONSENT_BANNER_ID = "parigo-consent-banner";

export interface ConsentPreferences {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

export function createDefaultConsentPreferences(): ConsentPreferences {
  return { necessary: true, preferences: false, analytics: false, marketing: false, updatedAt: "" };
}

export function persistConsentPreferences(preferences: ConsentPreferences) {
  const value = JSON.stringify({ ...preferences, necessary: true, updatedAt: new Date().toISOString() });
  window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(value)};path=/;max-age=31536000;samesite=lax`;
  const banner = document.getElementById(CONSENT_BANNER_ID);
  if (banner) banner.hidden = true;
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
}

export function normalizeConsentSnapshot(value: string | null | undefined): string {
  if (!value) return CONSENT_UNSET;

  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded) as Partial<ConsentPreferences>;
    if (
      parsed.necessary !== true
      || typeof parsed.preferences !== "boolean"
      || typeof parsed.analytics !== "boolean"
      || typeof parsed.marketing !== "boolean"
      || typeof parsed.updatedAt !== "string"
    ) {
      return CONSENT_UNSET;
    }

    return JSON.stringify({
      necessary: true,
      preferences: parsed.preferences,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: parsed.updatedAt,
    } satisfies ConsentPreferences);
  } catch {
    return CONSENT_UNSET;
  }
}
