"use client";

import { useSettings } from "@/components/SettingsProvider";
import { t } from "@/lib/i18n";

export function useI18n() {
  const { settings } = useSettings();
  const lang = settings.language || "fr";
  return (key: string) => t(lang, key);
}
