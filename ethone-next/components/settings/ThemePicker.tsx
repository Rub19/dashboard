"use client";

import PremiumThemePicker from "./PremiumThemePicker";
import type { ThemeMode } from "@/lib/settings";

type ThemePickerProps = {
  themes?: ThemeMode[];
  value: ThemeMode;
  onChange: (theme: ThemeMode) => void;
  showMore?: boolean;
};

/** Legacy compatibility wrapper around the premium theme picker. */
export default function ThemePicker({ value, onChange }: ThemePickerProps) {
  return <PremiumThemePicker value={value} onChange={onChange} />;
}
