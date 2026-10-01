"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { ChevronDown } from "@/components/icons/ph";
import { Icon } from "@/lib/icons";
import FlagIcon, { LANGUAGES, LANGUAGE_LABELS, type Language } from "@/components/FlagIcon";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/motion/Popover";
import { EASE_SNAP, SPRING_PILL } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";

/** Compact locale pill (round flag + language) opening a glass list where a
 * highlight glides between rows and the rows cascade in. */
export default function LanguageSwitcher() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { notify } = useToast();
  const { reduced } = useMotionPref();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<Language | null>(null);

  const current = (settings.language as Language) || "fr";
  const highlighted = hovered ?? current;

  function select(lang: Language) {
    if (lang !== current) {
      update({ language: lang });
      notify.language(lang);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} trigger="click" side="bottom" align="end" sideOffset={8}>
      <PopoverTrigger>
        <button
          type="button"
          aria-label={`${i18n("language")} : ${LANGUAGE_LABELS[current]}`}
          className="group flex h-9 cursor-pointer select-none items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] pl-1.5 pr-2.5 text-[13px] font-medium text-[var(--text-primary)] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] outline-none transition-[border-color,background-color,transform] duration-200 hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.06] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-main)] active:scale-[0.97] data-[state=open]:border-[var(--text-primary)]/20 data-[state=open]:bg-[var(--text-primary)]/[0.06]"
        >
          <span className="relative h-6 w-6 overflow-hidden rounded-full ring-1 ring-[var(--text-primary)]/10">
            <FlagIcon code={current} className="absolute left-1/2 top-1/2 h-6 w-9 max-w-none -translate-x-1/2 -translate-y-1/2" />
          </span>
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em]">{current}</span>
          <ChevronDown
            className="h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-300 [transition-timing-function:var(--ease-snap)] group-data-[state=open]:rotate-180"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-60 max-w-[calc(100vw-2rem)]">
        <motion.div
          role="listbox"
          aria-label={i18n("language")}
          initial={reduced ? false : { opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: EASE_SNAP }}
          onMouseLeave={() => setHovered(null)}
          className="origin-top-right overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] p-1.5 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.7)] backdrop-blur-2xl"
          style={{ background: "color-mix(in srgb, var(--bg-card, var(--bg-main)) 95%, transparent)" }}
        >
          <p className="px-3 pb-1.5 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {i18n("language")}
          </p>
          {LANGUAGES.map((lang, i) => {
            const active = lang === current;
            return (
              <motion.button
                key={lang}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => select(lang)}
                onMouseEnter={() => setHovered(lang)}
                onFocus={() => setHovered(lang)}
                initial={reduced ? false : { opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: EASE_SNAP, delay: 0.03 + i * 0.035 }}
                className="relative flex h-11 w-full cursor-pointer items-center gap-3 rounded-[var(--inset-radius)] px-2.5 text-left text-sm text-[var(--text-primary)] outline-none"
              >
                {highlighted === lang && (
                  <motion.span
                    layoutId="lang-highlight"
                    transition={SPRING_PILL}
                    className="absolute inset-0 rounded-[var(--inset-radius)] bg-[var(--text-primary)]/[0.06]"
                  />
                )}
                <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--text-primary)]/10">
                  <FlagIcon code={lang} className="absolute left-1/2 top-1/2 h-6 w-9 max-w-none -translate-x-1/2 -translate-y-1/2" />
                </span>
                <span className={active ? "relative font-semibold" : "relative"}>{LANGUAGE_LABELS[lang]}</span>
                <span className="relative ml-auto flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{lang}</span>
                  <span className="grid h-4 w-4 place-items-center">
                    {active && <Icon name="check" pack="lucide" className="h-4 w-4 !text-[var(--accent-primary)]" />}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
