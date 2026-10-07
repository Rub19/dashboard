"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import FlagIcon, { LANGUAGES, LANGUAGE_LABELS, type Language } from "@/components/FlagIcon";
import { useSettings } from "@/components/SettingsProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Check } from "@/components/icons/ph";

export default function DiscordLanguageDropdown({ align = "left" }: { align?: "left" | "right" }) {
  const { settings, update } = useSettings();
  const i18n = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = (LANGUAGES.includes(settings.language as Language)
    ? settings.language
    : "fr") as Language;

  const handleSelect = useCallback(
    (lang: Language) => {
      update({ language: lang });
      setOpen(false);
    },
    [update]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="p-1 rounded hover:bg-[var(--surface-hover,var(--surface-raised))] transition-colors cursor-pointer flex items-center justify-center"
        title={i18n("dChangeLanguage", "Changer de langue")}
        aria-label={i18n("dChangeLanguage", "Changer de langue")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <FlagIcon code={currentLang} className="h-3.5 w-5 rounded-xs pointer-events-none" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={i18n("dChangeLanguage", "Changer de langue")}
          className={`absolute bottom-full mb-2 ${align === "right" ? "right-0" : "left-0"} z-50 w-40 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/95 p-1 shadow-2xl backdrop-blur-md`}
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang === currentLang;
            return (
              <button
                key={lang}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(lang)}
                className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[var(--accent-primary)]/15 text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-hover,var(--surface-raised))] hover:text-[var(--text-primary)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FlagIcon code={lang} className="h-3 w-4.5 rounded-xs shrink-0 pointer-events-none" />
                  <span>{LANGUAGE_LABELS[lang]}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-[var(--accent-primary)] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
