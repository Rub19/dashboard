"use client";

import { useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
import FlagIcon, { LANGUAGES, LANGUAGE_LABELS, type Language } from "@/components/FlagIcon";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/motion/Popover";
import { cn } from "@/lib/utils";

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
      sideOffset={10}
      panelRadius={16}
      gooStrength={0}
    >
      <PopoverTrigger>
        <button
          type="button"
          aria-label={i18n("language")}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-9 items-center gap-2 rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 px-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] transition-all active:scale-95 cursor-pointer select-none shadow-sm"
        >
          <FlagIcon code={current} className="h-4 w-5 rounded-sm overflow-hidden" />
          <span className="uppercase text-[11px] text-[var(--text-muted)] font-bold">
            {current}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-1.5 shadow-2xl backdrop-blur-2xl">
        <div role="listbox" aria-label={i18n("language")} className="space-y-1">
          <div className="px-2.5 py-1.5 border-b border-[var(--panel-border)]/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Langue de l&apos;interface
            </span>
          </div>

          {LANGUAGES.map((lang) => {
            const active = lang === current;
            return (
              <button
                key={lang}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => select(lang)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all",
                  active
                    ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-bold shadow-sm"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                )}
              >
                <div className="flex items-center gap-2">
                  <FlagIcon code={lang} className="h-3.5 w-4.5 rounded-sm" />
                  <span>{LANGUAGE_LABELS[lang]}</span>
                </div>

                {active && <Icon name="check" className="h-3.5 w-3.5 text-[var(--accent-primary)]" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
