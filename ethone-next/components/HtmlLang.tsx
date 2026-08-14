"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { resolveDensity, applyDensityVariables, getViewportSnapshot } from "@/lib/density-engine";
import { useAmbientEngine } from "@/lib/hooks/useAmbientEngine";

export default function HtmlLang() {
  useAmbientEngine();
  const { settings } = useSettings();
  const [activeSpace] = useLocalStorage<string>("ethone-active-workspace", "personal");
  const [railExpanded] = useLocalStorage<boolean>("ethone-rail-expanded", false);
  const [viewport, setViewport] = useState(getViewportSnapshot);
  useEffect(() => {
    const onResize = () => setViewport(getViewportSnapshot());
    window.addEventListener("resize", onResize, { passive: true });
    (window as unknown as { visualViewport?: EventTarget }).visualViewport?.addEventListener?.("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      (window as unknown as { visualViewport?: EventTarget }).visualViewport?.removeEventListener?.("resize", onResize);
    };
  }, []);
  useEffect(() => {
    const html = document.documentElement;
    html.lang = settings.language;
    html.dataset.background = settings.backgroundEffect;

    const resolution = resolveDensity(
      settings.densityMode,
      { custom: settings.densityMode === "custom" ? settings.densityCustom : undefined },
      { ...viewport, railExpanded },
      activeSpace
    );
    applyDensityVariables(html, resolution);

    if (settings.densityMode === "custom") {
      // custom values override resolution custom merge
      html.style.setProperty("--density-font-scale", `${settings.densityCustom.fontScale / 100}`);
      html.style.setProperty("--density-line-height", `${settings.densityCustom.lineHeight / 100}`);
      html.style.setProperty("--density-pad", `${settings.densityCustom.cardPadding}px`);
      html.style.setProperty("--density-gap", `${settings.densityCustom.sectionGap}px`);
      html.style.setProperty("--density-control-height", `${settings.densityCustom.controlHeight}px`);
      html.style.setProperty("--density-icon-size", `${settings.densityCustom.iconSize}px`);
      html.style.setProperty("--density-row-height", `${settings.densityCustom.rowHeight}px`);
      html.style.setProperty("--density-toolbar-height", `${settings.densityCustom.toolbarHeight}px`);
    }
    html.dataset.space = activeSpace;
    html.dataset.dataSpace = activeSpace;
    html.dataset.densityMode = settings.densityMode;
    // data-rail removed: it collided with a global [data-rail] { width: 72px; } rule.
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
    viewport,
  ]);
  return null;
}
