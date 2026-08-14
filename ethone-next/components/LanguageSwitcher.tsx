"use client";

import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";

const LANGUAGES = ["fr", "en", "es", "de"] as const;

type Language = (typeof LANGUAGES)[number];

export default function LanguageSwitcher() {
  const i18n = useI18n();
  const { settings, update } = useSettings();
  const { success } = useToast();

  const current = (settings.language as Language) || "fr";

  function cycle() {
    const idx = LANGUAGES.indexOf(current);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    update({ language: next });
    success(`${i18n("language")}: ${next.toUpperCase()}`);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title={i18n("language")}
      aria-label={i18n("language")}
      className="flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      <Icon name="globe" className="h-4 w-4" />
      <span className="hidden uppercase sm:inline">{current}</span>
    </button>
  );
}
