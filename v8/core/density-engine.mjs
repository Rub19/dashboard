export const DENSITY_MODES = Object.freeze([
  "spacious",
  "comfortable",
  "compact",
  "ultra-compact",
  "automatic",
  "custom"
]);

export const DENSITY_CUSTOM_RANGES = Object.freeze({
  fontScale: Object.freeze({ min: 0.9, max: 1.12, step: 0.01, unit: "" }),
  lineHeight: Object.freeze({ min: 1.35, max: 1.75, step: 0.05, unit: "" }),
  cardPadding: Object.freeze({ min: 12, max: 32, step: 1, unit: "px" }),
  sectionGap: Object.freeze({ min: 12, max: 36, step: 1, unit: "px" }),
  controlHeight: Object.freeze({ min: 34, max: 48, step: 1, unit: "px" }),
  panelWidth: Object.freeze({ min: 300, max: 440, step: 10, unit: "px" }),
  iconSize: Object.freeze({ min: 16, max: 24, step: 1, unit: "px" }),
  rowHeight: Object.freeze({ min: 40, max: 64, step: 1, unit: "px" }),
  tableRowHeight: Object.freeze({ min: 36, max: 60, step: 1, unit: "px" }),
  widgetScale: Object.freeze({ min: 0.9, max: 1.12, step: 0.01, unit: "" }),
  toolbarHeight: Object.freeze({ min: 42, max: 62, step: 1, unit: "px" })
});

export const DENSITY_PRESETS = Object.freeze({
  spacious: Object.freeze({ fontScale: 1.05, lineHeight: 1.65, cardPadding: 28, sectionGap: 30, controlHeight: 44, panelWidth: 400, iconSize: 21, rowHeight: 58, tableRowHeight: 52, widgetScale: 1.06, toolbarHeight: 58 }),
  comfortable: Object.freeze({ fontScale: 1, lineHeight: 1.55, cardPadding: 22, sectionGap: 24, controlHeight: 38, panelWidth: 360, iconSize: 20, rowHeight: 50, tableRowHeight: 46, widgetScale: 1, toolbarHeight: 52 }),
  compact: Object.freeze({ fontScale: 0.96, lineHeight: 1.48, cardPadding: 17, sectionGap: 18, controlHeight: 36, panelWidth: 340, iconSize: 18, rowHeight: 44, tableRowHeight: 40, widgetScale: 0.96, toolbarHeight: 48 }),
  "ultra-compact": Object.freeze({ fontScale: 0.92, lineHeight: 1.42, cardPadding: 13, sectionGap: 14, controlHeight: 34, panelWidth: 320, iconSize: 17, rowHeight: 40, tableRowHeight: 36, widgetScale: 0.92, toolbarHeight: 44 })
});

export const DEFAULT_DENSITY_SETTINGS = Object.freeze({
  focusDensity: true,
  adaptiveBySpace: true,
  spacePresets: Object.freeze({ personal: "comfortable", focus: "compact", studio: "comfortable" }),
  custom: DENSITY_PRESETS.comfortable
});

const MODE_SET = new Set(DENSITY_MODES);
const PRESET_SET = new Set(Object.keys(DENSITY_PRESETS));
const TOKEN_NAMES = Object.freeze({
  fontScale: "--density-font-scale",
  lineHeight: "--density-line-height",
  cardPadding: "--density-card-padding",
  sectionGap: "--density-section-gap",
  controlHeight: "--density-control-height",
  panelWidth: "--density-panel-width",
  iconSize: "--density-icon-size",
  rowHeight: "--density-row-height",
  tableRowHeight: "--density-table-row-height",
  widgetScale: "--density-widget-scale",
  toolbarHeight: "--density-toolbar-height"
});

function clamp(value, range, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const stepped = Math.round(number / range.step) * range.step;
  const precision = String(range.step).split(".")[1]?.length || 0;
  return Number(Math.min(range.max, Math.max(range.min, stepped)).toFixed(precision));
}

function freezeCustom(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return Object.freeze(Object.fromEntries(Object.entries(DENSITY_CUSTOM_RANGES).map(([key, range]) => [
    key,
    clamp(source[key], range, DENSITY_PRESETS.comfortable[key])
  ])));
}

export function normalizeDensityMode(value, fallback = "comfortable") {
  return MODE_SET.has(value) ? value : fallback;
}

export function sanitizeDensitySettings(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const requestedPresets = source.spacePresets && typeof source.spacePresets === "object" ? source.spacePresets : {};
  const spacePresets = Object.freeze(Object.fromEntries(Object.entries(DEFAULT_DENSITY_SETTINGS.spacePresets).map(([space, fallback]) => [
    space,
    PRESET_SET.has(requestedPresets[space]) ? requestedPresets[space] : fallback
  ])));
  return Object.freeze({
    focusDensity: source.focusDensity !== false,
    adaptiveBySpace: source.adaptiveBySpace !== false,
    spacePresets,
    custom: freezeCustom(source.custom)
  });
}

function viewportSnapshot(runtime, state) {
  const visualViewport = runtime.visualViewport;
  const width = Math.max(320, Number(visualViewport?.width || runtime.innerWidth) || 1280);
  const height = Math.max(320, Number(visualViewport?.height || runtime.innerHeight) || 800);
  const zoom = Math.max(0.5, Math.min(3, Number(visualViewport?.scale) || 1));
  let coarsePointer = false;
  try { coarsePointer = runtime.matchMedia?.("(pointer: coarse)")?.matches === true; } catch {}
  return Object.freeze({
    width,
    height,
    zoom,
    coarsePointer,
    panelOpen: Boolean(state?.panel || state?.commandOpen || state?.missionOpen),
    railExpanded: state?.railExpanded === true,
    widgetPanelOpen: state?.panel === "widgets"
  });
}

export function resolveDensity(state = {}, environment = {}) {
  const requested = normalizeDensityMode(state.density);
  const settings = sanitizeDensitySettings(state.densitySettings);
  if (requested === "custom") return Object.freeze({ requested, effective: "custom", values: settings.custom, reason: "custom" });
  if (requested !== "automatic") return Object.freeze({ requested, effective: requested, values: DENSITY_PRESETS[requested], reason: "explicit" });

  const width = Math.max(320, Number(environment.width) || 1280);
  const zoom = Math.max(0.5, Number(environment.zoom) || 1);
  let effective = "comfortable";
  let reason = "balanced";

  if (environment.coarsePointer || width < 760 || zoom >= 1.3) {
    effective = "spacious";
    reason = environment.coarsePointer ? "touch-targets" : zoom >= 1.3 ? "browser-zoom" : "small-screen";
  } else if (settings.adaptiveBySpace && PRESET_SET.has(settings.spacePresets[state.space])) {
    effective = settings.spacePresets[state.space];
    reason = `space-${state.space}`;
  } else if (width >= 1720 && !environment.panelOpen) {
    effective = "compact";
    reason = "wide-screen";
  }

  if (settings.focusDensity && (state.space === "focus" || /focus|deep work/i.test(String(state.flow || ""))) && effective !== "spacious") {
    effective = "compact";
    reason = "focus";
  }
  if ((environment.panelOpen || environment.railExpanded || environment.widgetPanelOpen) && width < 1180 && effective === "compact") {
    effective = "comfortable";
    reason = "available-width";
  }
  return Object.freeze({ requested, effective, values: DENSITY_PRESETS[effective], reason });
}

export function densityCssVariables(values = DENSITY_PRESETS.comfortable) {
  return Object.freeze(Object.fromEntries(Object.entries(TOKEN_NAMES).map(([key, token]) => {
    const unit = DENSITY_CUSTOM_RANGES[key]?.unit || "";
    return [token, `${values[key]}${unit}`];
  })));
}

function applyToTarget(target, resolution) {
  if (!target) return resolution;
  target.dataset.density = resolution.requested;
  target.dataset.densityEffective = resolution.effective;
  target.dataset.densityReason = resolution.reason;
  const variables = densityCssVariables(resolution.values);
  Object.entries(variables).forEach(([name, value]) => target.style?.setProperty?.(name, value));
  return resolution;
}

export function createDensityEngine(options = {}) {
  const runtime = options.runtime || globalThis;
  const target = options.target || runtime.document?.documentElement || null;
  const getState = typeof options.getState === "function" ? options.getState : () => ({});
  let started = false;
  let frame = 0;
  let frameKind = "";
  let lastResolution = null;

  function refresh(input = getState()) {
    const state = input && typeof input === "object" ? input : {};
    lastResolution = applyToTarget(target, resolveDensity(state, viewportSnapshot(runtime, state)));
    return lastResolution;
  }

  function schedule() {
    if (frameKind) return;
    const callback = () => { frame = 0; refresh(); };
    if (typeof runtime.requestAnimationFrame === "function") {
      frameKind = "animation-frame";
      frame = runtime.requestAnimationFrame(() => { frameKind = ""; callback(); });
    } else if (typeof runtime.setTimeout === "function") {
      frameKind = "timeout";
      frame = runtime.setTimeout(() => { frameKind = ""; callback(); }, 16);
    }
  }

  function start(initialState = getState()) {
    if (started) return false;
    started = true;
    runtime.addEventListener?.("resize", schedule, { passive: true });
    runtime.visualViewport?.addEventListener?.("resize", schedule, { passive: true });
    refresh(initialState);
    return true;
  }

  function destroy() {
    if (!started) return false;
    started = false;
    runtime.removeEventListener?.("resize", schedule);
    runtime.visualViewport?.removeEventListener?.("resize", schedule);
    if (frameKind === "animation-frame") runtime.cancelAnimationFrame?.(frame);
    if (frameKind === "timeout") runtime.clearTimeout?.(frame);
    frame = 0;
    frameKind = "";
    return true;
  }

  return Object.freeze({
    start,
    refresh,
    destroy,
    resolution: () => lastResolution,
    diagnostics: () => Object.freeze({ started, framePending: Boolean(frameKind), ...(lastResolution || resolveDensity(getState(), viewportSnapshot(runtime, getState()))) })
  });
}
