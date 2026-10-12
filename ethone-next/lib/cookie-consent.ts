export interface CookieConsent {
  necessary: boolean;
  preferences: boolean;
  analytics: boolean;
  timestamp: string;
  version: string;
}

export const COOKIE_CONSENT_KEY = "ethone:cookie-consent";
export const COOKIE_CONSENT_VERSION = "2026.1";

export function getCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsent;
  } catch {
    return null;
  }
}

export function saveCookieConsent(consent: { preferences: boolean; analytics: boolean }): CookieConsent {
  const fullConsent: CookieConsent = {
    necessary: true,
    preferences: Boolean(consent.preferences),
    analytics: Boolean(consent.analytics),
    timestamp: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fullConsent));
      window.dispatchEvent(new CustomEvent("ethone:cookie-consent-updated", { detail: fullConsent }));
    } catch {}
  }
  return fullConsent;
}

export function openCookieSettings(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ethone:open-cookie-settings"));
  }
}
