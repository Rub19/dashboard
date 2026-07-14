(function applyCachedDensity() {
  "use strict";
  const allowed = new Set(["spacious", "comfortable", "compact", "ultra-compact", "automatic", "custom"]);
  const ranges = {
    fontScale: [0.9, 1.12, ""], lineHeight: [1.35, 1.75, ""], cardPadding: [12, 32, "px"], sectionGap: [12, 36, "px"],
    controlHeight: [34, 48, "px"], panelWidth: [300, 440, "px"], iconSize: [16, 24, "px"], rowHeight: [40, 64, "px"],
    tableRowHeight: [36, 60, "px"], widgetScale: [0.9, 1.12, ""], toolbarHeight: [42, 62, "px"]
  };
  const spacePresets = { personal: "comfortable", focus: "compact", studio: "comfortable" };
  try {
    const state = JSON.parse(localStorage.getItem("ethone:v8-ui-state") || "{}");
    const mode = allowed.has(state.density) ? state.density : "comfortable";
    document.documentElement.dataset.density = mode;
    let effective = mode;
    let reason = "cached";
    if (mode === "automatic") {
      const settings = state.densitySettings && typeof state.densitySettings === "object" ? state.densitySettings : {};
      const presets = settings.spacePresets && typeof settings.spacePresets === "object" ? settings.spacePresets : spacePresets;
      const width = Math.max(320, Number(window.visualViewport?.width || window.innerWidth) || 1280);
      const zoom = Math.max(0.5, Number(window.visualViewport?.scale) || 1);
      let coarsePointer = false;
      try { coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches === true; } catch {}
      if (coarsePointer || width < 760 || zoom >= 1.3) {
        effective = "spacious";
        reason = coarsePointer ? "touch-targets" : zoom >= 1.3 ? "browser-zoom" : "small-screen";
      } else if (settings.adaptiveBySpace !== false && ["spacious", "comfortable", "compact", "ultra-compact"].includes(presets[state.space])) {
        effective = presets[state.space];
        reason = `space-${state.space}`;
      } else if (width >= 1720) {
        effective = "compact";
        reason = "wide-screen";
      } else {
        effective = "comfortable";
        reason = "balanced";
      }
      if (settings.focusDensity !== false && (state.space === "focus" || /focus|deep work/i.test(String(state.flow || ""))) && effective !== "spacious") {
        effective = "compact";
        reason = "focus";
      }
    }
    document.documentElement.dataset.densityEffective = effective;
    document.documentElement.dataset.densityReason = reason;
    if (mode !== "custom") return;
    const custom = state.densitySettings && typeof state.densitySettings === "object" ? state.densitySettings.custom : null;
    if (!custom || typeof custom !== "object") return;
    Object.entries(ranges).forEach(([key, range]) => {
      const value = Number(custom[key]);
      if (!Number.isFinite(value)) return;
      const bounded = Math.min(range[1], Math.max(range[0], value));
      const token = `--density-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
      document.documentElement.style.setProperty(token, `${bounded}${range[2]}`);
    });
  } catch {}
}());
