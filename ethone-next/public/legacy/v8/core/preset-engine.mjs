import { builtInPresetById, findPreset, PRESET_FIELDS } from "../data/presets.mjs";

const ALLOWED_DOCK_SCALE = new Set(["normal", "compact", "large"]);
const ALLOWED_DOCK_ALIGN = new Set(["center", "stretch"]);
const ALLOWED_DOCK_GLASS = new Set(["default", "ultra", "opaque"]);
const ALLOWED_HOME_GRID = new Set(["2", "3", "4"]);
const ALLOWED_HOME_HERO = new Set(["full", "compact", "hidden"]);
const ALLOWED_UI_ANIMATIONS = new Set(["smooth", "snappy", "reduced"]);
const ALLOWED_FONT_FAMILY = new Set(["inter", "outfit", "mono", "serif"]);
const ALLOWED_RADIUS_STYLE = new Set(["rounded", "sharp", "soft"]);

const DEFAULT_OPTIONS = Object.freeze({
  storage: globalThis.localStorage,
  document: globalThis.document,
  notify: null,
  setState: null
});

function applyToDocument(doc, preset) {
  if (!doc || !doc.documentElement) return;
  const html = doc.documentElement;
  if (preset.aura) html.dataset.aura = preset.aura;
  if (preset.fontFamily) html.dataset.font = preset.fontFamily;
  if (preset.radiusStyle) html.dataset.radiusStyle = preset.radiusStyle;
}

function applyToStorage(storage, preset) {
  if (!storage) return;
  try {
    if (preset.aura) storage.setItem("v8_home_aura", preset.aura);
    if (preset.fontFamily) storage.setItem("v8_font_family", preset.fontFamily);
    if (preset.radiusStyle) storage.setItem("v8_radius_style", preset.radiusStyle);
  } catch {
    /* silent */
  }
}

function sanitizePreset(preset) {
  if (!preset || typeof preset !== "object") return null;
  return Object.freeze({
    id: String(preset.id || "").slice(0, 32),
    name: String(preset.name || "Sans nom").slice(0, 32),
    description: String(preset.description || "").slice(0, 80),
    icon: String(preset.icon || "sparkles").slice(0, 32),
    theme: ["night", "graphite", "day", "auto"].includes(preset.theme) ? preset.theme : "night",
    accent: ["mint", "sky", "amber", "violet", "rose", "custom"].includes(preset.accent) ? preset.accent : "mint",
    customAccentColor: /^#[0-9a-f]{6}$/i.test(String(preset.customAccentColor || "")) ? String(preset.customAccentColor).toLowerCase() : "#7be5c3",
    aura: ["classic", "boreale", "cyberpunk", "eclipse", "emeraude", "minerale"].includes(preset.aura) ? preset.aura : "classic",
    density: ["spacious", "comfortable", "compact", "ultra-compact", "automatic"].includes(preset.density) ? preset.density : "comfortable",
    fontFamily: ALLOWED_FONT_FAMILY.has(preset.fontFamily) ? preset.fontFamily : "inter",
    radiusStyle: ALLOWED_RADIUS_STYLE.has(preset.radiusStyle) ? preset.radiusStyle : "rounded",
    dockScale: ALLOWED_DOCK_SCALE.has(preset.dockScale) ? preset.dockScale : "normal",
    dockAlign: ALLOWED_DOCK_ALIGN.has(preset.dockAlign) ? preset.dockAlign : "center",
    dockGlass: ALLOWED_DOCK_GLASS.has(preset.dockGlass) ? preset.dockGlass : "default",
    dockAutoHide: preset.dockAutoHide === true,
    dockMagnify: preset.dockMagnify !== false,
    homeGrid: ALLOWED_HOME_GRID.has(preset.homeGrid) ? preset.homeGrid : "4",
    homeHero: ALLOWED_HOME_HERO.has(preset.homeHero) ? preset.homeHero : "full",
    uiAnimations: ALLOWED_UI_ANIMATIONS.has(preset.uiAnimations) ? preset.uiAnimations : "smooth",
    uiGlow: preset.uiGlow !== false,
    uiSoundFeedback: preset.uiSoundFeedback !== false,
    spotlightEnabled: preset.spotlightEnabled !== false,
    ambientEffectsEnabled: preset.ambientEffectsEnabled !== false,
    interfaceBlurEnabled: preset.interfaceBlurEnabled !== false
  });
}

export function applyPreset(preset, state, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const valid = sanitizePreset(preset);
  if (!valid) return { ok: false, error: "Preset invalide" };

  const patch = {};
  PRESET_FIELDS.forEach((field) => {
    if (Object.hasOwn(valid, field)) patch[field] = valid[field];
  });
  patch.activePreset = valid.id;

  if (typeof config.setState === "function") {
    config.setState(patch);
  }
  applyToDocument(config.document, valid);
  applyToStorage(config.storage, valid);

  if (typeof config.notify === "function") {
    config.notify({
      id: "preset-applied",
      title: "Preset appliqué",
      message: `Le preset « ${valid.name} » est actif.`,
      type: "success"
    });
  }
  return { ok: true, preset: valid };
}

export function extractPresetFromState(state, name, description, icon) {
  if (!state || typeof state !== "object") return null;
  const base = builtInPresetById(state.activePreset) || BUILT_IN_PRESETS[0];
  return Object.freeze(sanitizePreset({
    ...base,
    id: `custom-${Date.now()}`,
    name: String(name || "Mon preset").slice(0, 32),
    description: String(description || "").slice(0, 80),
    icon: String(icon || "sparkles").slice(0, 32),
    ...Object.fromEntries(PRESET_FIELDS.map((field) => [field, state[field]]).filter(([, value]) => value !== undefined))
  }));
}

export { builtInPresetById, findPreset };
