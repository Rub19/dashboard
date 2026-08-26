"use client";

import { useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Check } from "lucide-react";
import FlagIcon, { LANGUAGES, LANGUAGE_LABELS, type Language } from "@/components/FlagIcon";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/motion/Popover";

export default function LanguageSwitcher() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);

  const current = (settings.language as Language) || "fr";

  function select(lang: Language) {
    if (lang !== current) {
      update({ language: lang });
      notify.language(lang);
    }
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      side="bottom"
      align="end"
      sideOffset={8}
      panelRadius={8}
      gooStrength={0}
    >
      <PopoverTrigger>
        <button
          type="button"
          data-tooltip={i18n("language")}
          data-tooltip-position="bottom"
          aria-label={i18n("language")}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-11 min-h-[44px] items-center gap-2 rounded-full border border-[var(--text-primary)]/[0.06] bg-[var(--surface)]/60 px-3 text-xs font-medium text-[var(--text-primary)] transition-all motion-reduce:transition-none hover:border-[var(--text-primary)]/15 hover:bg-[var(--text-primary)]/[0.08] active:scale-95 cursor-pointer select-none"
        >
          <FlagIcon code={current} className="h-5 w-6" />
          <span className="pointer-events-none hidden uppercase 2xl:inline">{current}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="min-w-[11rem] max-w-[calc(100dvw-2rem)] overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--background)] p-1.5 shadow-2xl backdrop-blur-xl">
        <div role="listbox" aria-label={i18n("language")}>
          {LANGUAGES.map((lang) => {
          const active = lang === current;
          return (
            <button
              key={lang}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => select(lang)}
              className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none ${
                active
                  ? "bg-[var(--text-primary)]/[0.08] text-[var(--text-primary)] ring-1 ring-[var(--panel-border)]/10"
                  : "text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.06]"
              }`}
            >
              <FlagIcon code={lang} className="h-4 w-5" />
              <span className="pointer-events-none uppercase">{lang}</span>
              <span className={active ? "pointer-events-none text-[var(--text-muted)]" : "pointer-events-none text-[var(--text-muted)]"}>
                {LANGUAGE_LABELS[lang]}
              </span>
              {active && (
                <Check className="pointer-events-none ml-auto h-4 w-4 text-[var(--accent)]" />
              )}
            </button>
          );
        })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
