"use client";

import { useMemo } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { t } from "@/lib/i18n";

export function useI18n() {
  const { settings } = useSettings();
  const lang = settings.language || "fr";
  return useMemo(
    () => (key: string, ...args: unknown[]) => {
      const fallback = args.find((a) => typeof a === "string") as string | undefined;
      return t(lang, key, fallback);
    },
    [lang]
  );
}
