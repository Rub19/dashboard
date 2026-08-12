"use client";

import { useEffect } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";

export default function HtmlLang() {
  const { settings } = useSettings();
  const [activeSpace] = useLocalStorage<string>("ethone-active-workspace", "personal");
  const [railExpanded] = useLocalStorage<boolean>("ethone-rail-expanded", false);
  useEffect(() => {
    const html = document.documentElement;
    html.lang = settings.language;
    html.dataset.background = settings.backgroundEffect;
    html.dataset.density = settings.densityMode;
    if (settings.densityMode === "custom") {
      html.style.setProperty("--density-font-scale", `${settings.densityCustom.fontScale / 100}`);
      html.style.setProperty("--density-line-height", `${settings.densityCustom.lineHeight / 100}`);
      html.style.setProperty("--density-pad", `${settings.densityCustom.cardPadding}px`);
      html.style.setProperty("--density-gap", `${settings.densityCustom.sectionGap}px`);
      html.style.setProperty("--density-control-height", `${settings.densityCustom.controlHeight}px`);
      html.style.setProperty("--density-icon-size", `${settings.densityCustom.iconSize}px`);
      html.style.setProperty("--density-row-height", `${settings.densityCustom.rowHeight}px`);
      html.style.setProperty("--density-toolbar-height", `${settings.densityCustom.toolbarHeight}px`);
    } else {
      html.style.removeProperty("--density-font-scale");
      html.style.removeProperty("--density-line-height");
      html.style.removeProperty("--density-pad");
      html.style.removeProperty("--density-gap");
      html.style.removeProperty("--density-control-height");
      html.style.removeProperty("--density-icon-size");
      html.style.removeProperty("--density-row-height");
      html.style.removeProperty("--density-toolbar-height");
    }
    html.dataset.space = activeSpace;
    html.dataset.dataSpace = activeSpace;
    html.dataset.densityMode = settings.densityMode;
    html.dataset.rail = railExpanded ? "expanded" : "compact";
    html.style.setProperty("--dock-offset", railExpanded ? "122px" : "0px");
    html.dataset.wallpaper = settings.wallpaper;
    html.dataset.font = settings.fontFamily;
    html.dataset.accent = settings.accentColor;
    html.dataset.theme = settings.theme;
    html.dataset.aura = settings.aura;
    html.dataset.sessionMode = settings.sessionMode;
    html.style.setProperty("--v8-breathe-duration", settings.ambientEffectsEnabled ? "26s" : "0s");
    html.style.setProperty("--v8-ambient-transition", settings.uiAnimations === "snappy" ? "800ms" : settings.uiAnimations === "reduced" ? "1ms" : "3200ms");
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
    settings.densityCustom,
    settings.wallpaper,
    settings.fontFamily,
    settings.theme,
    settings.aura,
    activeSpace,
    railExpanded,
    settings.accentColor,
    settings.customAccent,
    settings.reducedMotion,
    settings.sessionMode,
    settings.ambientEffectsEnabled,
    settings.uiAnimations,
  ]);
  return null;
}
