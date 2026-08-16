"use client";

import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";

const LANGUAGES = ["fr", "en", "es", "de"] as const;

type Language = (typeof LANGUAGES)[number];

const LANGUAGE_LABELS: Record<Language, string> = {
  fr: "Fran\u00e7ais",
  en: "English",
  es: "Espa\u00f1ol",
  de: "Deutsch",
};

function Flag({ code, className = "h-4 w-6" }: { code: Language; className?: string }) {
  const base = `rounded-[2px] ${className}`;
  switch (code) {
    case "fr":
      return (
        <svg viewBox="0 0 60 40" className={base} aria-hidden="true">
          <rect x="0" y="0" width="20" height="40" fill="#0055A4" />
          <rect x="20" y="0" width="20" height="40" fill="#FFFFFF" />
          <rect x="40" y="0" width="20" height="40" fill="#EF4135" />
        </svg>
      );
    case "en":
      return (
        <svg viewBox="0 0 60 40" className={base} aria-hidden="true">
          <rect width="60" height="40" fill="#012169" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M30 0 V40 M0 20 H60" stroke="#FFFFFF" strokeWidth="10" />
          <path d="M30 0 V40 M0 20 H60" stroke="#C8102E" strokeWidth="6" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="3" />
        </svg>
      );
    case "es":
      return (
        <svg viewBox="0 0 60 40" className={base} aria-hidden="true">
          <rect width="60" height="10" fill="#AA151B" />
          <rect y="10" width="60" height="20" fill="#F1BF00" />
          <rect y="30" width="60" height="10" fill="#AA151B" />
        </svg>
      );
    case "de":
      return (
        <svg viewBox="0 0 60 40" className={base} aria-hidden="true">
          <rect width="60" height="13.33" fill="#000000" />
          <rect y="13.33" width="60" height="13.33" fill="#DD0000" />
          <rect y="26.66" width="60" height="13.34" fill="#FFCE00" />
        </svg>
      );
    default:
      return null;
  }
}

export default function LanguageSwitcher() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { success } = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = (settings.language as Language) || "fr";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function select(lang: Language) {
    if (lang !== current) {
      update({ language: lang });
      success(`${i18n("language")}: ${LANGUAGE_LABELS[lang]}`);
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={i18n("language")}
        aria-label={i18n("language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
      >
        <Icon name="globe" className="h-4 w-4" />
        <Flag code={current} className="h-4 w-5" />
        <span className="hidden uppercase 2xl:inline">{current}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1.5 shadow-2xl backdrop-blur-xl"
        >
          {LANGUAGES.map((lang) => {
            const active = lang === current;
            return (
              <button
                key={lang}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => select(lang)}
                className={`flex w-full items-center gap-2.5 rounded-[var(--panel-radius)] px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--foreground)] hover:bg-[var(--panel-bg)]"
                }`}
              >
                <Flag code={lang} className="h-4 w-5" />
                <span className="uppercase">{lang}</span>
                <span className={active ? "text-white/80" : "text-[var(--muted)]"}>
                  {LANGUAGE_LABELS[lang]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
