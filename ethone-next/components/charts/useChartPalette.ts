"use client";

import { useEffect, useState } from "react";

export interface ChartPalette {
  accent: string;
  accentContrast: string;
  textMuted: string;
  textPrimary: string;
  panelBorder: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

const VARS: Record<keyof ChartPalette, string> = {
  accent: "--accent-primary",
  accentContrast: "--accent-contrast",
  textMuted: "--text-muted",
  textPrimary: "--text-primary",
  panelBorder: "--panel-border",
  success: "--success",
  warning: "--warning",
  danger: "--danger",
  info: "--info",
};

function readPalette(): ChartPalette {
  if (typeof document === "undefined") {
    return { accent: "#C1234F", accentContrast: "#fff", textMuted: "#9ca3af", textPrimary: "#f4f4f5", panelBorder: "#ffffff1f", success: "#10b981", warning: "#f59e0b", danger: "#ef4444", info: "#3b82f6" };
  }
  const root = getComputedStyle(document.documentElement);
  const entries = Object.entries(VARS).map(([key, cssVar]) => [key, root.getPropertyValue(cssVar).trim() || undefined]);
  return Object.fromEntries(entries) as unknown as ChartPalette;
}

// Recharts takes real color values (not Tailwind classes), so charts read the
// active theme's CSS vars directly. Re-reads on any inline style/class change
// on <html> — that's how theme/appearance switches are applied (see
// ambient-engine.ts / density-engine.ts, both use style.setProperty on the
// root element) — so a chart already on screen updates live if the user
// changes theme without needing a page reload.
export function useChartPalette(): ChartPalette {
  const [palette, setPalette] = useState<ChartPalette>(() => readPalette());

  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setPalette(readPalette());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-theme"] });
    return () => observer.disconnect();
  }, []);

  return palette;
}
