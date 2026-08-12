export const DENSITY_MODES = [
  "spacious",
  "comfortable",
  "compact",
  "dense",
  "ultra-compact",
  "ultra",
  "normal",
  "airy",
  "automatic",
  "custom",
] as const;

export type DensityMode = (typeof DENSITY_MODES)[number];

export type DensityValues = {
  fontScale: number;
  lineHeight: number;
  cardPadding: number;
  sectionGap: number;
  controlHeight: number;
  iconSize: number;
  rowHeight: number;
  toolbarHeight: number;
};

export const DENSITY_PRESETS: Record<string, DensityValues> = {
  spacious: { fontScale: 1.05, lineHeight: 1.65, cardPadding: 28, sectionGap: 30, controlHeight: 44, iconSize: 21, rowHeight: 58, toolbarHeight: 58 },
  comfortable: { fontScale: 1, lineHeight: 1.55, cardPadding: 22, sectionGap: 24, controlHeight: 38, iconSize: 20, rowHeight: 50, toolbarHeight: 52 },
  compact: { fontScale: 0.96, lineHeight: 1.48, cardPadding: 17, sectionGap: 18, controlHeight: 36, iconSize: 18, rowHeight: 44, toolbarHeight: 48 },
  dense: { fontScale: 0.92, lineHeight: 1.4, cardPadding: 12, sectionGap: 12, controlHeight: 32, iconSize: 16, rowHeight: 38, toolbarHeight: 42 },
  "ultra-compact": { fontScale: 0.92, lineHeight: 1.42, cardPadding: 13, sectionGap: 14, controlHeight: 34, iconSize: 17, rowHeight: 40, toolbarHeight: 44 },
  ultra: { fontScale: 0.9, lineHeight: 1.38, cardPadding: 11, sectionGap: 10, controlHeight: 30, iconSize: 16, rowHeight: 36, toolbarHeight: 40 },
  normal: { fontScale: 1, lineHeight: 1.55, cardPadding: 20, sectionGap: 22, controlHeight: 38, iconSize: 20, rowHeight: 50, toolbarHeight: 52 },
  airy: { fontScale: 1.08, lineHeight: 1.75, cardPadding: 30, sectionGap: 34, controlHeight: 46, iconSize: 22, rowHeight: 62, toolbarHeight: 60 },
};

export type DensitySettings = {
  focusDensity?: boolean;
  adaptiveBySpace?: boolean;
  spacePresets?: Record<string, string>;
  custom?: Partial<DensityValues>;
};

export type DensityResolution = {
  requested: string;
  effective: string;
  values: DensityValues;
  reason: string;
};

export type ViewportEnvironment = {
  width?: number;
  height?: number;
  zoom?: number;
  coarsePointer?: boolean;
  panelOpen?: boolean;
  railExpanded?: boolean;
  widgetPanelOpen?: boolean;
};

function coerceMode(value: string | undefined): string {
  if (!value) return "comfortable";
  if (DENSITY_MODES.includes(value as DensityMode)) return value;
  if (value === "ultra-compact") return "ultra-compact";
  return "comfortable";
}

function mergeValues(preset: string, custom?: Partial<DensityValues>): DensityValues {
  const base = DENSITY_PRESETS[preset] || DENSITY_PRESETS.comfortable;
  if (!custom) return base;
  return {
    fontScale: custom.fontScale ?? base.fontScale,
    lineHeight: custom.lineHeight ?? base.lineHeight,
    cardPadding: custom.cardPadding ?? base.cardPadding,
    sectionGap: custom.sectionGap ?? base.sectionGap,
    controlHeight: custom.controlHeight ?? base.controlHeight,
    iconSize: custom.iconSize ?? base.iconSize,
    rowHeight: custom.rowHeight ?? base.rowHeight,
    toolbarHeight: custom.toolbarHeight ?? base.toolbarHeight,
  };
}

export function resolveDensity(
  requested: string,
  settings: DensitySettings = {},
  environment: ViewportEnvironment = {},
  space?: string,
  flow?: string
): DensityResolution {
  const mode = coerceMode(requested);
  const densitySettings = {
    focusDensity: settings.focusDensity !== false,
    adaptiveBySpace: settings.adaptiveBySpace !== false,
    spacePresets: settings.spacePresets || { personal: "comfortable", focus: "compact", studio: "comfortable" },
    custom: settings.custom,
  };

  if (mode === "custom") {
    return {
      requested,
      effective: "custom",
      values: mergeValues("comfortable", densitySettings.custom),
      reason: "custom",
    };
  }

  if (mode !== "automatic") {
    const preset = mode === "ultra" ? "ultra" : mode === "normal" ? "normal" : mode === "airy" ? "airy" : mode;
    return { requested, effective: mode, values: mergeValues(preset, densitySettings.custom), reason: "explicit" };
  }

  const width = Math.max(320, Number(environment.width) || 1280);
  const zoom = Math.max(0.5, Math.min(3, Number(environment.zoom) || 1));
  const presetNames = new Set(Object.keys(DENSITY_PRESETS));
  let effective = "comfortable";
  let reason = "balanced";

  if (environment.coarsePointer || width < 760 || zoom >= 1.3) {
    effective = "spacious";
    reason = environment.coarsePointer ? "touch-targets" : zoom >= 1.3 ? "browser-zoom" : "small-screen";
  } else if (densitySettings.adaptiveBySpace && space && presetNames.has(densitySettings.spacePresets[space])) {
    effective = densitySettings.spacePresets[space];
    reason = `space-${space}`;
  } else if (width >= 1720 && !environment.panelOpen) {
    effective = "compact";
    reason = "wide-screen";
  }

  if (densitySettings.focusDensity && (space === "focus" || /focus|deep work|pomodoro/i.test(String(flow || ""))) && effective !== "spacious") {
    effective = "compact";
    reason = "focus";
  }

  if ((environment.panelOpen || environment.railExpanded || environment.widgetPanelOpen) && width < 1180 && effective === "compact") {
    effective = "comfortable";
    reason = "available-width";
  }

  return { requested, effective, values: mergeValues(effective, densitySettings.custom), reason };
}

export function applyDensityVariables(target: HTMLElement, resolution: DensityResolution) {
  if (!target) return;
  target.dataset.density = resolution.requested;
  target.dataset.densityEffective = resolution.effective;
  target.dataset.densityReason = resolution.reason;

  target.style.setProperty("--density-font-scale", String(resolution.values.fontScale));
  target.style.setProperty("--density-line-height", String(resolution.values.lineHeight));
  target.style.setProperty("--density-pad", `${resolution.values.cardPadding}px`);
  target.style.setProperty("--density-gap", `${resolution.values.sectionGap}px`);
  target.style.setProperty("--density-control-height", `${resolution.values.controlHeight}px`);
  target.style.setProperty("--density-icon-size", `${resolution.values.iconSize}px`);
  target.style.setProperty("--density-row-height", `${resolution.values.rowHeight}px`);
  target.style.setProperty("--density-toolbar-height", `${resolution.values.toolbarHeight}px`);

  // Legacy v8 token aliases used in some components
  target.style.setProperty("--density-card-padding", `${resolution.values.cardPadding}px`);
  target.style.setProperty("--density-section-gap", `${resolution.values.sectionGap}px`);
}

export function getViewportSnapshot(): ViewportEnvironment {
  if (typeof window === "undefined") return { width: 1280, height: 800, zoom: 1, coarsePointer: false };
  const visualViewport = (window as unknown as { visualViewport?: { width?: number; height?: number; scale?: number } }).visualViewport;
  const width = Math.max(320, Number(visualViewport?.width || window.innerWidth) || 1280);
  const height = Math.max(320, Number(visualViewport?.height || window.innerHeight) || 800);
  const zoom = Math.max(0.5, Math.min(3, Number(visualViewport?.scale) || 1));
  let coarsePointer = false;
  try {
    coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches === true;
  } catch {
    coarsePointer = false;
  }
  return { width, height, zoom, coarsePointer };
}
