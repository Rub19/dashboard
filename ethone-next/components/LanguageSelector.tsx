"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/translations/bento";

const LOCALE_NAMES: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
  ja: "日本語",
};

export default function LanguageSelector() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="liquid-glass-btn inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 text-[var(--text-primary)] backdrop-blur-[var(--panel-blur)] transition-colors hover:border-[var(--accent-primary)]/50"
      >
        <Globe className="h-4 w-4 text-[var(--accent-primary)]" />
        <span className="text-xs font-medium">{LOCALE_NAMES[locale]}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1 shadow-2xl backdrop-blur-[var(--panel-blur)]">
          {SUPPORTED_LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLocale(l);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                l === locale
                  ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                  : "text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.03]"
              }`}
            >
              {LOCALE_NAMES[l]}
              {l === locale && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
