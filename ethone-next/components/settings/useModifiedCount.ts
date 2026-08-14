"use client";

import { useSettings } from "@/components/SettingsProvider";
import { DEFAULTS } from "@/lib/settings";
import { getValueByPath } from "@/lib/object-path";

export function useModifiedCount(keys: { key: string; path?: string }[]): number {
  const { settings } = useSettings();
  const src = settings as Record<string, unknown>;
  const defaults = DEFAULTS as Record<string, unknown>;

  return keys.reduce((count, { key, path }) => {
    const currentValue = path ? getValueByPath(src, path) : src[key];
    const defaultValue = path ? getValueByPath(defaults, path) : defaults[key];
    return JSON.stringify(currentValue) !== JSON.stringify(defaultValue) ? count + 1 : count;
  }, 0);
}
