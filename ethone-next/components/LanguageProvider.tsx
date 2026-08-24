"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useSettings } from "@/components/SettingsProvider";
import {
  getBentoLabel,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/translations/bento";

export type { Locale };

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  supported: readonly Locale[];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { settings, update } = useSettings();

  const locale: Locale = useMemo(() => {
    const raw = settings.language as string | undefined;
    if (raw && SUPPORTED_LOCALES.includes(raw as Locale)) return raw as Locale;
    return "fr";
  }, [settings.language]);

  const setLocale = useCallback(
    (next: Locale) => {
      update({ language: next } as Partial<typeof settings>);
    },
    [update]
  );

  const t = useCallback(
    (key: string) => getBentoLabel(locale, key),
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      supported: SUPPORTED_LOCALES,
    }),
    [locale, setLocale, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}
