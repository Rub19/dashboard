"use client";

import { useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";
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
          className="flex h-9 items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/60 px-2.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:bg-[var(--surface-hover)] transition-all active:scale-95 cursor-pointer select-none shadow-sm"
        >
          <FlagIcon code={current} className="h-4 w-5 rounded-sm overflow-hidden" />
          <span className="uppercase text-[11px] text-[var(--text-muted)] font-bold">
            {current}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="ethone-menu w-48 max-w-[calc(100vw-2rem)] overflow-hidden p-1.5">
        <div role="listbox" aria-label={i18n("language")}>
          <p className="ethone-menu-label px-2.5 pb-1 pt-1.5">{i18n("language")}</p>
          {LANGUAGES.map((lang) => {
            const active = lang === current;
            return (
              <button
                key={lang}
                type="button"
                role="option"
                aria-selected={active}
                data-active={active}
                onClick={() => select(lang)}
                className="ethone-menu-item"
              >
                <FlagIcon code={lang} className="h-3.5 w-5 rounded-sm" />
                <span className={active ? "font-semibold" : undefined}>{LANGUAGE_LABELS[lang]}</span>
                {active && <Icon name="check" className="ml-auto h-3.5 w-3.5 !text-[var(--accent-primary)]" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
