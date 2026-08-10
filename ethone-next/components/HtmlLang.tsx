"use client";

import { useEffect } from "react";
import { useSettings } from "@/components/SettingsProvider";

export default function HtmlLang() {
  const { settings } = useSettings();
  useEffect(() => {
    const html = document.documentElement;
    html.lang = settings.language;
    html.dataset.background = settings.backgroundEffect;
    html.dataset.density = settings.densityMode;
    html.dataset.wallpaper = settings.wallpaper;
    html.dataset.font = settings.fontFamily;
    html.dataset.accent = settings.accentColor;
    html.setAttribute("data-accent", settings.accentColor);
    if (settings.accentColor === "custom") {
      html.style.setProperty("--accent", settings.customAccent);
      html.style.setProperty("--accent-soft", settings.customAccent + "33");
    } else {
      html.style.removeProperty("--accent");
      html.style.removeProperty("--accent-soft");
    }
    if (settings.reducedMotion) {
      html.setAttribute("data-reduced-motion", "true");
    } else {
      html.removeAttribute("data-reduced-motion");
    }
  }, [
    settings.language,
    settings.backgroundEffect,
    settings.densityMode,
    settings.wallpaper,
    settings.fontFamily,
    settings.accentColor,
    settings.customAccent,
    settings.reducedMotion,
  ]);
  return null;
}
