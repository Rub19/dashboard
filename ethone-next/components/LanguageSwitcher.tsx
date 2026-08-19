"use client";

import { useState } from "react";
import { FloatingPortal } from "@floating-ui/react";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { useTopbarDropdown } from "@/lib/hooks/useTopbarDropdown";
import FlagIcon, { LANGUAGES, LANGUAGE_LABELS, type Language } from "@/components/FlagIcon";

export default function LanguageSwitcher() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const { setTrigger, setPanel, floatingStyles } = useTopbarDropdown({
    open,
    onClose: () => setOpen(false),
  });

  const current = (settings.language as Language) || "fr";

  function select(lang: Language) {
    if (lang !== current) {
      update({ language: lang });
      notify.language(lang);
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        ref={setTrigger as unknown as React.Ref<HTMLButtonElement>}
        onClick={() => setOpen(!open)}
        title={i18n("language")}
        aria-label={i18n("language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-full border border-white/[0.06] bg-zinc-900/60 px-3 text-xs font-medium text-white transition-all hover:border-white/15 hover:bg-white/[0.08] active:scale-95 cursor-pointer select-none"
      >
        <FlagIcon code={current} className="h-5 w-6" />
        <span className="pointer-events-none hidden uppercase 2xl:inline">{current}</span>
      </button>

      <FloatingPortal>
        {open && (
          <div
            ref={setPanel as unknown as React.Ref<HTMLDivElement>}
            role="listbox"
            style={floatingStyles}
            className="z-[100] min-w-[11rem] overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1.5 shadow-2xl backdrop-blur-xl"
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
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--foreground)] hover:bg-[var(--panel-bg)]"
                }`}
              >
                <FlagIcon code={lang} className="h-4 w-5" />
                <span className="pointer-events-none uppercase">{lang}</span>
                <span className={active ? "pointer-events-none text-white/80" : "pointer-events-none text-[var(--muted)]"}>
                  {LANGUAGE_LABELS[lang]}
                </span>
              </button>
            );
          })}
        </div>
      )}
      </FloatingPortal>
    </div>
  );
}
