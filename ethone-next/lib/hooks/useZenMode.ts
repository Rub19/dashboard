"use client";

import { useSettings } from "@/components/SettingsProvider";

export function useZenMode() {
  const { settings, update } = useSettings();

  return {
    zenMode: settings.zenMode,
    toggle: () => update({ zenMode: !settings.zenMode }),
    enable: () => update({ zenMode: true }),
    disable: () => update({ zenMode: false }),
  };
}
