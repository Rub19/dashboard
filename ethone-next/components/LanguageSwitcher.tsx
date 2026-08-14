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

const LANGUAGE_FLAGS: Record<Language, string> = {
  fr: "\ud83c\uddeb\ud83c\uddf7",
  en: "\ud83c\uddec\ud83c\udde7",
  es: "\ud83c\uddea\ud83c\uddf8",
  de: "\ud83c\udde9\ud83c\uddea",
};

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
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <Icon name="globe" className="h-4 w-4" />
        <span className="hidden uppercase sm:inline">{current}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 min-w-[10rem] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-2xl backdrop-blur-xl"
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
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--foreground)] hover:bg-[var(--surface-raised)]"
                }`}
              >
                <span aria-hidden="true">{LANGUAGE_FLAGS[lang]}</span>
                <span className="uppercase">{lang}</span>
                <span className="text-[var(--muted)]">{LANGUAGE_LABELS[lang]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
