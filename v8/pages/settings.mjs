import { actionButton, debounce, element, icon, throttleFrame } from "../ui/dom.mjs";
import { statusState, emptyState } from "../ui/empty-state.mjs";
import { prepareFormControls, setFieldState, setFormStatus } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { DEFAULT_SOUND_PREFERENCES, SOUND_PACKS } from "../services/sound-manager.mjs";
import { uploadProfileMedia, validateMediaFile } from "../services/media-upload.mjs";
import { createSelect } from "../ui/select.mjs";
import { DENSITY_CUSTOM_RANGES, DENSITY_PRESETS, densityCssVariables, resolveDensity, sanitizeDensitySettings } from "../core/density-engine.mjs";
import { resolveTheme, systemPrefersLight } from "../core/theme-engine.mjs";
import { BRAIN_MEMORY_CATEGORIES, BRAIN_PERMISSION_CATEGORIES, brainPreferenceLabel, sanitizeBrainPreferences } from "../brain/preferences.mjs";
import { BUILT_IN_PRESETS } from "../data/presets.mjs";
import { downloadJson } from "../utils/download.mjs";

const ACCENTS = Object.freeze(["mint", "sky", "amber", "violet", "rose"]);
const THEME_LABELS = Object.freeze({ night: "Nuit", midnight: "Minuit", graphite: "Graphite", day: "Jour", auto: "Automatique" });
const THEME_OPTIONS = Object.freeze([
  Object.freeze({ id: "night", label: "Nuit", icon: "moon-star", copy: "Sombre et profond, le mode par defaut.", swatch: Object.freeze({ canvas: "#080a0d", surface: "#171c22", text: "#f4f7fa" }) }),
  Object.freeze({ id: "graphite", label: "Graphite", icon: "circle", copy: "Sombre, un ton plus clair et neutre.", swatch: Object.freeze({ canvas: "#111317", surface: "#20252b", text: "#f4f7fa" }) }),
  Object.freeze({ id: "day", label: "Jour", icon: "sun", copy: "Clair, pour la lumière du jour.", swatch: Object.freeze({ canvas: "#f4f5f7", surface: "#ffffff", text: "#161a21" }) }),
  Object.freeze({ id: "auto", label: "Automatique", icon: "monitor", copy: "Suit les préférences de votre système.", swatch: null })
]);
const BRAIN_PERMISSION_LABELS = Object.freeze({ notes: "Notes", tasks: "Taches", calendar: "Calendrier", connections: "Connexions", gaming: "Gaming", activity: "Activité", files: "Fichiers", profile: "Profil", settings: "Réglages", mail: "Mail" });
const BRAIN_MEMORY_LABELS = Object.freeze({ interface: "Interface", habits: "Habitudes", widgets: "Widgets", schedules: "Plannings", "task-types": "Types de taches", spaces: "Spaces", flows: "Flows", "response-style": "Style de réponse", goals: "Objectifs" });
const SYNC_LABELS = Object.freeze({ loading: "Connexion Supabase", saving: "Synchronisation", saved: "Synchronise", offline: "Hors ligne", retrying: "Nouvelle tentative", error: "Erreur", expired: "Session expiree", online: "Synchronise", syncing: "Synchronisation" });
const DENSITY_LABELS = Object.freeze({ spacious: "Spacieuse", comfortable: "Confortable", compact: "Compacte", "ultra-compact": "Ultra compacte", automatic: "Automatique", custom: "Personnalisée" });
const DENSITY_OPTIONS = Object.freeze([
  Object.freeze({ id: "spacious", label: "Spacieuse", icon: "maximize", copy: "Lecture et cibles tactiles genereuses." }),
  Object.freeze({ id: "comfortable", label: "Confortable", icon: "panel-top", copy: "Equilibre par defaut pour le quotidien." }),
  Object.freeze({ id: "compact", label: "Compacte", icon: "rows-3", copy: "Davantage d'information sans sacrifier la lecture." }),
  Object.freeze({ id: "ultra-compact", label: "Ultra compacte", icon: "list-collapse", copy: "Densité maximale avec focus et cibles conserves." }),
  Object.freeze({ id: "automatic", label: "Automatique", icon: "wand-sparkles", copy: "S'adapte a l'écran, au zoom et au contexte." }),
  Object.freeze({ id: "custom", label: "Personnalisée", icon: "sliders-horizontal", copy: "Reglez chaque dimension de l'interface." })
]);
const CUSTOM_DENSITY_LABELS = Object.freeze({ fontScale: "Taille du texte", lineHeight: "Interligne", cardPadding: "Padding des cartes", sectionGap: "Espacement des blocs", controlHeight: "Hauteur des boutons", panelWidth: "Largeur des panneaux", iconSize: "Taille des icônes", rowHeight: "Densité des listes", tableRowHeight: "Densité des tableaux", widgetScale: "Taille des widgets", toolbarHeight: "Hauteur des toolbars" });
const SOUND_VOLUME_ROWS = Object.freeze([
  Object.freeze({ id: "master", icon: "volume-2", title: "Volume général", description: "Limiter le niveau de tout ETHONE." }),
  Object.freeze({ id: "notifications", icon: "bell-ring", title: "Notifications", description: "Informations, succès, alertes et mises a jour." }),
  Object.freeze({ id: "interface", icon: "mouse-pointer-2", title: "Interface", description: "Fenêtres, commandes et interactions importantes." }),
  Object.freeze({ id: "brain", icon: "brain", title: "Brain", description: "Reflexion, réponse et fin de traitement." }),
  Object.freeze({ id: "system", icon: "audio-lines", title: "Système", description: "Connexion, sauvegarde, synchronisation et Spaces." })
]);
const AURA_OPTIONS = Object.freeze([
  Object.freeze({ id: "classic", label: "Classique", icon: "sparkles", copy: "Ambiance ETHONE par défaut." }),
  Object.freeze({ id: "boreale", label: "Boréale", icon: "zap", copy: "Cyan boréal et violet intense." }),
  Object.freeze({ id: "cyberpunk", label: "Cyberpunk", icon: "flame", copy: "Magenta néon & émeraude vif." }),
  Object.freeze({ id: "eclipse", label: "Éclipse", icon: "moon", copy: "Lueur or sur nuit stellaire." }),
  Object.freeze({ id: "emeraude", label: "Émeraude", icon: "gem", copy: "Vert jade précieux & saphir." }),
  Object.freeze({ id: "minerale", label: "Minérale", icon: "mountain", copy: "Ardoise brute et platine." })
]);
const FONT_OPTIONS = Object.freeze([
  Object.freeze({ id: "inter", label: "Inter (Moderne)", icon: "type", copy: "Sans-serif équilibré par défaut." }),
  Object.freeze({ id: "outfit", label: "Outfit (Géométrique)", icon: "sparkles", copy: "Rendu dynamique et élégant." }),
  Object.freeze({ id: "mono", label: "JetBrains Mono", icon: "code", copy: "Esprit technique et cyberpunk." }),
  Object.freeze({ id: "serif", label: "Editorial Serif", icon: "book-open", copy: "Typographie littéraire et premium." })
]);
const RADIUS_OPTIONS = Object.freeze([
  Object.freeze({ id: "rounded", label: "Arrondi Ergonomique", icon: "circle", copy: "Courbe naturelle (8px / 14px)." }),
  Object.freeze({ id: "sharp", label: "Tech Anguleux", icon: "square", copy: "Angles nets (3px / 6px)." }),
  Object.freeze({ id: "soft", label: "Courbe iOS", icon: "smile", copy: "Courbes généreuses (12px / 20px)." })
]);
const WALLPAPER_OPTIONS = Object.freeze([
  Object.freeze({ id: "none", label: "Aucun", icon: "minus" }),
  Object.freeze({ id: "nebula", label: "Nébuleuse", icon: "sparkles" }),
  Object.freeze({ id: "mesh", label: "Grille", icon: "layout-grid" }),
  Object.freeze({ id: "aurora", label: "Aurore", icon: "sun" }),
  Object.freeze({ id: "noise", label: "Grain", icon: "mountain" })
]);
const CONNECTIONS = Object.freeze(["github", "google-calendar", "google-drive", "notion", "reddit", "spotify", "todoist", "youtube"]);
const FONT_SIZE_OPTIONS = Object.freeze([
  Object.freeze({ id: "small", label: "Petite" }),
  Object.freeze({ id: "default", label: "Défaut" }),
  Object.freeze({ id: "large", label: "Grande" }),
  Object.freeze({ id: "extra-large", label: "Très grande" })
]);
const COLOR_BLIND_OPTIONS = Object.freeze([
  Object.freeze({ id: "none", label: "Aucun" }),
  Object.freeze({ id: "protanopia", label: "Protanopie" }),
  Object.freeze({ id: "deuteranopia", label: "Deutéranopie" }),
  Object.freeze({ id: "tritanopia", label: "Tritanopie" }),
  Object.freeze({ id: "achromatopsia", label: "Achromatopsie" })
]);
const SHORTCUTS = Object.freeze([
  Object.freeze({ id: "command-palette", keys: "Ctrl/Cmd + K", label: "Palette de commandes", default: true }),
  Object.freeze({ id: "help", keys: "?", label: "Aide et raccourcis", default: true }),
  Object.freeze({ id: "go-home", keys: "G puis H", label: "Accueil", default: true }),
  Object.freeze({ id: "go-mail", keys: "G puis M", label: "Mail", default: true }),
  Object.freeze({ id: "go-brain", keys: "G puis B", label: "Brain", default: true }),
  Object.freeze({ id: "new-item", keys: "N", label: "Nouvelle note", default: true }),
  Object.freeze({ id: "close", keys: "Esc", label: "Fermer", default: true })
]);

const FAVORITES_KEY = "ethone:settings:favorites";
const RECENT_KEY = "ethone:settings:recent";
const SHORTCUTS_KEY = "ethone:settings:shortcuts";
const MAIL_SETTINGS_KEY = "ethone:settings:mail";
const ACCESSIBILITY_KEY = "ethone:settings:accessibility";

let settingRowSequence = 0;

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function getLocalObject(key, fallback = {}) {
  try { return JSON.parse(globalThis.localStorage?.getItem(key) || "null") || fallback; } catch { return fallback; }
}
function setLocalObject(key, value) { try { globalThis.localStorage?.setItem(key, JSON.stringify(value)); } catch { /* silent */ } }
function getFavorites() { return new Set(getLocalObject(FAVORITES_KEY, [])); }
function setFavorites(set) { setLocalObject(FAVORITES_KEY, [...set]); }
function getRecent() { const list = getLocalObject(RECENT_KEY, []); return Array.isArray(list) ? list.slice(0, 5) : []; }
function addRecent(id, title) {
  const list = getRecent().filter((entry) => entry.id !== id);
  list.unshift({ id, title, at: Date.now() });
  setLocalObject(RECENT_KEY, list.slice(0, 5));
  return list.slice(0, 5);
}
function getShortcuts() { return getLocalObject(SHORTCUTS_KEY, Object.fromEntries(SHORTCUTS.map((s) => [s.id, s.default]))); }
function setShortcuts(map) { setLocalObject(SHORTCUTS_KEY, map); }
function getMailSettings() { return getLocalObject(MAIL_SETTINGS_KEY, { notificationSound: true, markAsReadOnOpen: true, defaultSignature: true, spamFilter: true, pgpAutoEncrypt: false, offlineMode: false }); }
function setMailSettings(map) { setLocalObject(MAIL_SETTINGS_KEY, map); }
function getAccessibility() { return getLocalObject(ACCESSIBILITY_KEY, { fontSize: "default", reducedMotion: false, highContrast: false, colorBlind: "none" }); }
function setAccessibility(map) { setLocalObject(ACCESSIBILITY_KEY, map); applyAccessibility(map); }
function applyAccessibility(map) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.v8FontSize = map.fontSize || "default";
  document.documentElement.classList.toggle("v8-reduced-motion", map.reducedMotion === true);
  document.documentElement.dataset.v8ReducedMotion = map.reducedMotion ? "true" : "false";
  document.documentElement.classList.toggle("v8-high-contrast", map.highContrast === true);
  document.documentElement.dataset.v8HighContrast = map.highContrast ? "true" : "false";
  document.documentElement.dataset.v8ColorBlind = map.colorBlind || "none";
}

function choice(actionId, iconName, label, active) {
  return actionButton({ actionId, className: `v8-setting-choice${active ? " is-active" : ""}` }, [icon(iconName), element("span", { text: label }), active ? icon("check") : null]);
}

function settingRow(iconName, title, description, control, sectionId = "") {
  const rowId = `v8-setting-row-${++settingRowSequence}`;
  const settingId = `${sectionId}--${rowId}`;
  const titleId = `${rowId}-title`;
  const descriptionId = `${rowId}-description`;
  const controls = control.matches?.("input, textarea, select, button[role='switch']") ? [control] : [...control.querySelectorAll?.("input, textarea, select, button[role='switch']") || []];
  controls.forEach((entry) => {
    if (!entry.hasAttribute("aria-label") && !entry.hasAttribute("aria-labelledby")) entry.setAttribute("aria-labelledby", titleId);
    const describedBy = new Set(String(entry.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    describedBy.add(descriptionId);
    entry.setAttribute("aria-describedby", [...describedBy].join(" "));
  });
  const star = element("button", {
    className: `v8-setting-row__star${getFavorites().has(settingId) ? " is-active" : ""}`,
    attributes: { type: "button", "aria-label": "Ajouter aux favoris", "aria-pressed": String(getFavorites().has(settingId)) },
    dataset: { settingsFavorite: settingId, settingsTitle: title, settingsDescription: description }
  }, [icon("star")]);
  const copy = element("div", { className: "v8-setting-row__copy" }, [element("strong", { id: titleId, text: title }), element("p", { id: descriptionId, text: description })]);
  copy.dataset.settingsTitle = title;
  copy.dataset.settingsDescription = description;
  return element("div", { className: "v8-setting-row", id: rowId, dataset: { settingsRow: settingId, settingsSection: sectionId, settingsTitle: title, settingsDescription: description } }, [
    element("span", { className: "v8-setting-row__icon" }, [icon(iconName)]),
    star,
    copy,
    element("div", { className: "v8-setting-row__control" }, [control])
  ]);
}

function switchControl(actionId, label, checked, disabled = false) {
  return element("button", {
    className: "v8-switch",
    attributes: { type: "button", role: "switch", "aria-label": label, "aria-checked": String(checked), disabled: disabled || null },
    dataset: { action: actionId }
  }, [element("span", { className: "v8-switch__track", attributes: { "aria-hidden": "true" } }, [element("span", { className: "v8-switch__thumb" })])]);
}

function mailSwitch(path, label, checked) {
  const control = switchControl("", label, checked);
  delete control.dataset.action;
  control.dataset.mailPreference = path;
  return control;
}

function shortcutSwitch(id, label, checked) {
  const control = switchControl("", label, checked);
  delete control.dataset.action;
  control.dataset.shortcutId = id;
  return control;
}

function soundRange(category, value, disabled) {
  const percent = Math.round(Number(value || 0) * 100);
  const label = category === "master" ? "Volume général" : `Volume ${category}`;
  const range = element("input", {
    className: "v8-range",
    attributes: { type: "range", min: "0", max: "100", step: "1", value: String(percent), "aria-label": label, disabled: disabled || null },
    dataset: { soundVolume: category }
  });
  range.style.setProperty("--v8-range-progress", `${percent}%`);
  return element("div", { className: "v8-sound-range" }, [
    range,
    element("output", { text: `${percent} %`, attributes: { "aria-live": "off" }, dataset: { soundValue: category } })
  ]);
}

function densitySwatch(values) {
  if (!values) return null;
  const scale = 0.15;
  const row = Math.max(3, Math.round(values.rowHeight * scale));
  const pad = Math.max(2, Math.round(values.cardPadding * scale));
  const gap = Math.max(1, Math.round(values.sectionGap * scale * 0.6));
  const swatch = element("span", { className: "v8-density-swatch", attributes: { "aria-hidden": "true" } }, [
    element("span", { className: "v8-density-swatch__bar v8-density-swatch__bar--accent" }),
    element("span", { className: "v8-density-swatch__bar" }),
    element("span", { className: "v8-density-swatch__bar v8-density-swatch__bar--short" })
  ]);
  swatch.style.setProperty("--v8-density-swatch-row", `${row}px`);
  swatch.style.setProperty("--v8-density-swatch-pad", `${pad}px`);
  swatch.style.setProperty("--v8-density-swatch-gap", `${gap}px`);
  return swatch;
}

function themeSwatch(option, resolvedId) {
  const swatch = option.swatch || THEME_OPTIONS.find((entry) => entry.id === resolvedId)?.swatch;
  if (!swatch) return element("span", { className: "v8-theme-swatch v8-theme-swatch--auto" }, [icon("monitor")]);
  const node = element("span", { className: "v8-theme-swatch" }, [
    element("span", { className: "v8-theme-swatch__chip" }),
    element("span", { className: "v8-theme-swatch__dot" })
  ]);
  node.style.setProperty("--v8-theme-swatch-canvas", swatch.canvas);
  node.style.setProperty("--v8-theme-swatch-surface", swatch.surface);
  node.style.setProperty("--v8-theme-swatch-text", swatch.text);
  return node;
}

function themeModeChoice(option, active, resolution) {
  const resolvedNote = option.id === "auto" && resolution
    ? element("small", { className: "v8-theme-choice__resolved", text: `-> ${THEME_LABELS[resolution?.effective || "night"]}` })
    : null;
  return element("button", {
    className: `v8-theme-choice${active ? " is-active" : ""}`,
    attributes: { type: "button", "aria-pressed": String(active) },
    dataset: { action: `v8.theme.${option.id}`, themeMode: option.id }
  }, [
    themeSwatch(option, resolution?.effective),
    element("span", {}, [element("strong", { text: option.label }), element("small", { text: option.copy }), resolvedNote].filter(Boolean)),
    active ? icon("check") : null
  ]);
}

function densityModeChoice(option, active, previewValues) {
  const values = previewValues || DENSITY_PRESETS[option.id] || null;
  const swatch = densitySwatch(values);
  const mark = element("span", { className: "v8-density-choice__icon" }, [icon(option.icon), swatch]);
  return element("button", {
    className: `v8-density-choice${active ? " is-active" : ""}`,
    attributes: { type: "button", "aria-pressed": String(active) },
    dataset: { action: `v8.density.${option.id}`, densityMode: option.id }
  }, [mark, element("span", {}, [element("strong", { text: option.label }), element("small", { text: option.copy })]), active ? icon("check") : null]);
}

function densityCustomControl(key, value) {
  const range = DENSITY_CUSTOM_RANGES[key];
  const input = element("input", { className: "v8-range", attributes: { type: "range", min: String(range.min), max: String(range.max), step: String(range.step), value: String(value), "aria-label": CUSTOM_DENSITY_LABELS[key] }, dataset: { densityCustom: key } });
  const progress = ((Number(value) - range.min) / (range.max - range.min)) * 100;
  input.style.setProperty("--v8-range-progress", `${progress}%`);
  return element("label", { className: "v8-density-custom-row" }, [element("span", {}, [element("strong", { text: CUSTOM_DENSITY_LABELS[key] }), element("output", { text: `${value}${range.unit}`, dataset: { densityOutput: key } })]), input]);
}

function densityPreview() {
  return element("div", { className: "v8-density-preview", attributes: { "aria-label": "Apercu interactif de la densité" } }, [
    element("aside", { className: "v8-density-preview__rail" }, [icon("circle-dot"), icon("house"), icon("notebook-pen"), icon("settings-2")]),
    element("div", { className: "v8-density-preview__workspace" }, [
      element("header", {}, [element("span", {}, [icon("panel-top"), element("strong", { text: "Apercu" })]), element("span", { className: "v8-density-preview__demo-control", attributes: { "aria-hidden": "true" } }, [icon("search")])]),
      element("article", { className: "v8-density-preview__card" }, [element("small", { text: "Dashboard" }), element("strong", { text: "Votre espace en un regard" }), element("p", { text: "Cartes, listes et commandes utilisent les mêmes tokens." }), element("span", { className: "v8-density-preview__demo-control", attributes: { "aria-hidden": "true" } }, [icon("sparkles"), element("span", { text: "Action" })])]),
      element("div", { className: "v8-density-preview__list" }, ["Priorité principale", "Briefing Brain", "Synchronisation Supabase"].map((label, index) => element("span", {}, [icon(index === 0 ? "circle-check-big" : index === 1 ? "brain" : "cloud"), element("b", { text: label })])))
    ]),
    element("aside", { className: "v8-density-preview__widget" }, [element("small", { text: "Widget" }), element("strong", { text: "09:41" }), element("span", { text: "Focus actif" })])
  ]);
}

function brainPreferenceSwitch(path, label, checked) {
  const control = switchControl("", label, checked);
  delete control.dataset.action;
  control.dataset.brainPreference = path;
  return control;
}

function preferenceSelect(path, label, values, current) {
  const select = createSelect({ className: "v8-input", attributes: { "aria-label": label }, dataset: { brainPreferenceSelect: path } }, values.map((entry) => element("option", { text: entry.label, attributes: { value: entry.value } })));
  select.value = current;
  return select;
}

function profileAvatarPreviewNode(avatar, fallback) {
  if (avatar && avatar.kind === "image" && avatar.value) {
    return element("img", { className: "v8-profile-media-preview__image", attributes: { src: avatar.value, alt: "", loading: "lazy", referrerpolicy: "no-referrer" } });
  }
  const glyph = avatar && (avatar.kind === "symbol" || avatar.kind === "initials") ? avatar.value : fallback;
  return element("span", { className: "v8-profile-media-preview__glyph", text: String(glyph || "E") });
}

function settingSectionCard(id, eyebrow, title, description, rows) {
  return element("section", { id: `v8-settings-${id}`, className: "v8-card v8-settings-section", attributes: { role: "region", "aria-labelledby": `v8-settings-${id}-heading` } }, [
    element("header", { className: "v8-card__header" }, [
      element("span", { className: "v8-eyebrow", text: eyebrow }),
      element("h2", { id: `v8-settings-${id}-heading`, text: title }),
      description ? element("p", { text: description }) : null
    ]),
    element("div", { className: "v8-card__body" }, rows.filter(Boolean))
  ]);
}

function sectionIndexLink(id, label) {
  return element("a", { className: "v8-section-index__item", attributes: { href: `#v8-settings-${id}`, tabindex: "0" }, dataset: { sectionIndex: id } }, [element("span", { text: label })]);
}

function highlightText(root, query) {
  if (!query) return;
  const lower = query.toLowerCase();
  const strong = root.querySelector("strong");
  const p = root.querySelector("p");
  if (strong && strong.dataset.strongText == null) strong.dataset.strongText = strong.textContent;
  if (p && p.dataset.pText == null) p.dataset.pText = p.textContent;
  [strong, p].forEach((node) => {
    if (!node) return;
    const text = node.dataset.strongText || node.dataset.pText || node.textContent;
    const index = text.toLowerCase().indexOf(lower);
    if (index < 0) { node.textContent = text; return; }
    const before = text.slice(0, index);
    const match = text.slice(index, index + query.length);
    const after = text.slice(index + query.length);
    node.textContent = "";
    if (before) node.append(document.createTextNode(before));
    node.append(element("mark", { className: "v8-search-mark", text: match }));
    if (after) node.append(document.createTextNode(after));
  });
}

function unhighlightText(row) {
  const strong = row.querySelector("strong");
  const p = row.querySelector("p");
  if (strong && strong.dataset.strongText != null) strong.textContent = strong.dataset.strongText;
  if (p && p.dataset.pText != null) p.textContent = p.dataset.pText;
}

export function mountSettings(stage, options = {}) {
  const state = options.state || {};
  const sounds = options.sounds || null;
  const externalServices = options.externalServices || null;
  const soundSupported = sounds?.diagnostics?.().supported !== false && Boolean(sounds);
  const spatialSupported = soundSupported && sounds?.diagnostics?.().spatialSupported !== false;
  const initialSoundPreferences = sounds?.preferences?.() || DEFAULT_SOUND_PREFERENCES;
  let latestState = state;
  const initialDensitySettings = sanitizeDensitySettings(state.densitySettings);
  const densityPreviewHost = densityPreview();
  const densityChoices = element("div", { className: "v8-density-options", attributes: { role: "group", "aria-label": "Mode de densité" } }, DENSITY_OPTIONS.map((option) => densityModeChoice(option, state.density === option.id, option.id === "custom" ? initialDensitySettings.custom : option.id === "automatic" ? DENSITY_PRESETS.comfortable : null)));
  const densityCustomHost = element("div", { className: "v8-density-custom", attributes: { hidden: state.density !== "custom" } }, Object.keys(DENSITY_CUSTOM_RANGES).map((key) => densityCustomControl(key, initialDensitySettings.custom[key])));
  const densityResolved = element("span", { className: "v8-density-resolved", attributes: { "aria-live": "polite" } });
  const themeResolution = resolveTheme(state.theme, { systemPrefersLight: systemPrefersLight(globalThis) });
  const themeChoices = element("div", { className: "v8-theme-options", attributes: { role: "group", "aria-label": "Thème" } }, THEME_OPTIONS.map((option) => themeModeChoice(option, state.theme === option.id, themeResolution)));
  const themeResolved = element("span", { className: "v8-density-resolved", attributes: { "aria-live": "polite" }, text: themeResolution.requested === "auto" ? `${THEME_LABELS[themeResolution.effective]} - systeme` : THEME_LABELS[themeResolution.effective] });
  const brainPreferences = sanitizeBrainPreferences(state.brainPreferences);
  const brainNameInput = element("input", { className: "v8-input", attributes: { type: "text", maxlength: "32", value: brainPreferences.assistantName, "aria-label": "Nom de l'assistant" }, dataset: { brainPreferenceInput: "assistantName" } });
  const brainPersonaSelect = preferenceSelect("persona", "Personnalite Brain", ["concise", "balanced", "expert", "coach", "creative", "developer", "custom"].map((value) => ({ value, label: brainPreferenceLabel("persona", value) })), brainPreferences.persona);
  const brainDetailSelect = preferenceSelect("detail", "Niveau de détail", ["brief", "balanced", "detailed"].map((value) => ({ value, label: brainPreferenceLabel("detailOption", value) })), brainPreferences.detail);
  const brainToneSelect = preferenceSelect("tone", "Ton de Brain", [{ value: "calm", label: "Calme" }, { value: "direct", label: "Direct" }, { value: "warm", label: "Chaleureux" }, { value: "technical", label: "Technique" }, { value: "creative", label: "Creatif" }], brainPreferences.tone);
  const brainLanguageSelect = preferenceSelect("language", "Langue de réponse", [{ value: "auto", label: "Langue de l'interface" }, { value: "fr", label: "Francais" }, { value: "en", label: "English" }, { value: "es", label: "Espanol" }, { value: "de", label: "Deutsch" }], brainPreferences.language);
  const brainSuggestionSelect = preferenceSelect("suggestionFrequency", "Frequence des suggestions", [{ value: "off", label: "Desactivees" }, { value: "low", label: "Faible" }, { value: "balanced", label: "Equilibree" }, { value: "high", label: "Elevee" }], brainPreferences.suggestionFrequency);
  const brainAutomationSelect = preferenceSelect("automationLevel", "Niveau d'automatisation", ["manual", "suggest-only", "confirm", "trusted"].map((value) => ({ value, label: brainPreferenceLabel("automationOption", value) })), brainPreferences.automationLevel);
  const brainProviderSelect = preferenceSelect("provider.active", "Provider Brain", [
    { value: "context", label: "ETHONE Context" }, { value: "openai", label: "OpenAI via backend" }, { value: "anthropic", label: "Anthropic via backend" }, { value: "groq", label: "Groq via backend" }, { value: "gemini", label: "Gemini via backend" }, { value: "ollama", label: "Ollama via pont local" }, { value: "lm-studio", label: "LM Studio via pont local" }
  ], brainPreferences.provider.active);
  const brainRetentionSelect = preferenceSelect("memory.retentionDays", "Retention de la memoire", [{ value: "30", label: "30 jours" }, { value: "90", label: "90 jours" }, { value: "365", label: "1 an" }], String(brainPreferences.memory.retentionDays));
  const brainModelInput = element("input", { className: "v8-input", attributes: { type: "text", maxlength: "80", value: brainPreferences.provider.model, "aria-label": "Modele Brain" }, dataset: { brainPreferenceInput: "provider.model" } });
  const brainFallbackSelect = preferenceSelect("provider.fallback", "Provider de secours", [{ value: "context", label: "ETHONE Context" }, { value: "openai", label: "OpenAI" }, { value: "anthropic", label: "Anthropic" }, { value: "groq", label: "Groq" }, { value: "gemini", label: "Gemini" }, { value: "ollama", label: "Ollama" }, { value: "lm-studio", label: "LM Studio" }], brainPreferences.provider.fallback);
  const brainPrivacySelect = preferenceSelect("provider.privacy", "Niveau de confidentialité", [{ value: "minimal", label: "Contexte minimal" }, { value: "full-context", label: "Contexte autorise complet" }], brainPreferences.provider.privacy);
  const brainPermissionGrid = element("div", { className: "v8-brain-settings-permissions" }, BRAIN_PERMISSION_CATEGORIES.map((permission) => {
    const label = BRAIN_PERMISSION_LABELS[permission] || permission;
    return element("label", {}, [element("span", {}, [icon(brainPreferences.permissions[permission] ? "eye" : "eye-off"), element("strong", { text: label })]), brainPreferenceSwitch(`permissions.${permission}`, `Autoriser ${label}`, brainPreferences.permissions[permission])]);
  }));
  const brainMemoryCategoryGrid = element("div", { className: "v8-brain-settings-permissions" }, BRAIN_MEMORY_CATEGORIES.map((category) => {
    const label = BRAIN_MEMORY_LABELS[category] || category;
    return element("label", {}, [element("span", {}, [icon(brainPreferences.memory.categories[category] ? "bookmark-check" : "bookmark-x"), element("strong", { text: label })]), brainPreferenceSwitch(`memory.categories.${category}`, `Memoriser ${label}`, brainPreferences.memory.categories[category])]);
  }));
  const brainMemoryStatus = element("p", { className: "v8-settings-memory-status", text: "Les memoires sont chargees uniquement a la demande.", attributes: { "aria-live": "polite" } });
  const brainMemoryList = element("div", { className: "v8-settings-memory-list" });
  const brainMemoryLoad = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { settingsMemoryLoad: "" } }, [icon("database"), element("span", { text: "Voir les memoires" })]);
  const settingsSaveStatus = element("span", { className: "v8-badge", text: "Enregistre", attributes: { role: "status", "aria-live": "polite", "aria-atomic": "true" }, dataset: { formStatus: "" } });
  const accentControls = element("div", { className: "v8-accent-picker", attributes: { role: "group", "aria-label": "Couleur d'accent" } });
  ACCENTS.forEach((accent) => accentControls.append(element("button", {
    className: `v8-accent-swatch v8-accent-swatch--${accent}${state.accent === accent ? " is-active" : ""}`,
    attributes: { type: "button", "aria-label": `Accent ${accent}`, "aria-pressed": state.accent === accent ? "true" : "false" },
    dataset: { action: `v8.accent.${accent}` }
  }, [state.accent === accent ? icon("check") : null])));
  const customAccentInitial = /^#[0-9a-f]{6}$/i.test(state.customAccentColor || "") ? state.customAccentColor : "#7be5c3";
  const customColorInput = element("input", { className: "v8-accent-swatch__input", attributes: { type: "color", value: customAccentInitial, "aria-label": "Choisir une couleur d'accent personnalisée" } });
  const customColorSwatch = element("label", { className: `v8-accent-swatch v8-accent-swatch--custom${state.accent === "custom" ? " is-active" : ""}`, attributes: { "aria-label": "Accent personnalisé", "data-tooltip": "Couleur personnalisée" } }, [customColorInput, state.accent === "custom" ? icon("check") : null]);
  customColorSwatch.style.setProperty("--v8-accent-swatch-custom-color", customAccentInitial);
  accentControls.append(customColorSwatch);
  const currentAura = globalThis.localStorage?.getItem("v8_home_aura") || "classic";
  const auraChoices = element("div", { className: "v8-theme-options", attributes: { role: "group", "aria-label": "Ambiance lumineuse Aura" } }, AURA_OPTIONS.map((option) => {
    const active = currentAura === option.id;
    return element("button", { className: `v8-theme-choice${active ? " is-active" : ""}`, attributes: { type: "button", "aria-pressed": String(active) }, dataset: { action: `v8.aura.${option.id}` } }, [icon(option.icon), element("span", {}, [element("strong", { text: option.label }), element("small", { text: option.copy })]), active ? icon("check") : null]);
  }));
  const fontChoices = element("div", { className: "v8-theme-options", attributes: { role: "group", "aria-label": "Typographie" } }, FONT_OPTIONS.map((option) => {
    const active = (state.fontFamily || "inter") === option.id;
    return element("button", { className: `v8-theme-choice${active ? " is-active" : ""}`, attributes: { type: "button", "aria-pressed": String(active) }, dataset: { action: `v8.font.${option.id}` } }, [icon(option.icon), element("span", {}, [element("strong", { text: option.label }), element("small", { text: option.copy })]), active ? icon("check") : null]);
  }));
  const radiusChoices = element("div", { className: "v8-theme-options", attributes: { role: "group", "aria-label": "Courbure" } }, RADIUS_OPTIONS.map((option) => {
    const active = (state.radiusStyle || "rounded") === option.id;
    return element("button", { className: `v8-theme-choice${active ? " is-active" : ""}`, attributes: { type: "button", "aria-pressed": String(active) }, dataset: { action: `v8.radius.${option.id}` } }, [icon(option.icon), element("span", {}, [element("strong", { text: option.label }), element("small", { text: option.copy })]), active ? icon("check") : null]);
  }));
  const wallpaperChoices = element("div", { className: "v8-theme-options", attributes: { role: "group", "aria-label": "Fond d'écran" } }, WALLPAPER_OPTIONS.map((option) => {
    const active = (state.wallpaper || "none") === option.id;
    return element("button", { className: `v8-theme-choice${active ? " is-active" : ""}`, attributes: { type: "button", "aria-pressed": String(active) }, dataset: { action: `v8.wallpaper.${option.id}`, wallpaperMode: option.id } }, [icon(option.icon), element("span", {}, [element("strong", { text: option.label })]), active ? icon("check") : null]);
  }));
  const lowDataEnabled = getLocalObject("ethone:low-data", { enabled: false }).enabled;
  const lowDataSwitch = switchControl("", "Mode faibles données", lowDataEnabled);
  delete lowDataSwitch.dataset.action;
  lowDataSwitch.dataset.lowData = "";
  const presetChoices = element("div", { className: "v8-preset-choices" }, BUILT_IN_PRESETS.map((preset) => {
    const active = state.activePreset === preset.id;
    return element("button", { className: `v8-preset-choice${active ? " is-active" : ""}`, attributes: { type: "button", "aria-pressed": String(active) }, dataset: { action: "v8.preset.apply", presetId: preset.id } }, [icon(preset.icon), element("span", {}, [element("strong", { text: preset.name }), element("small", { text: preset.description })]), active ? icon("check") : null]);
  }));
  const savePresetButton = actionButton({ actionId: "v8.preset.save", className: "v8-button--secondary" }, [icon("save"), element("span", { text: "Sauvegarder" })]);
  const exportPresetButton = actionButton({ actionId: "v8.preset.export", className: "v8-button--outline" }, [icon("download"), element("span", { text: "Exporter" })]);

  const profile = options.profile || null;
  const canUploadMedia = Boolean(options.clientProvider) && Boolean(options.ownerId);
  const avatarPreviewHost = element("div", { className: `v8-profile-media-preview${!profile?.avatar ? " is-empty" : ""}` });
  const bannerPreviewHost = element("div", { className: `v8-profile-media-preview v8-profile-media-preview--banner${!profile?.banner ? " is-empty" : ""}` });
  if (profile?.avatar) avatarPreviewHost.replaceChildren(profileAvatarPreviewNode(profile.avatar, "E"));
  if (profile?.banner) bannerPreviewHost.style.backgroundImage = `url("${profile.banner}")`;
  const avatarFileInput = element("input", { attributes: { type: "file", accept: "image/png,image/jpeg,image/webp", "aria-label": "Choisir une photo de profil", disabled: !canUploadMedia || null }, dataset: { profileMediaInput: "avatar" } });
  const bannerFileInput = element("input", { attributes: { type: "file", accept: "image/png,image/jpeg,image/webp", "aria-label": "Choisir une bannière", disabled: !canUploadMedia || null }, dataset: { profileMediaInput: "banner" } });
  const avatarMediaStatus = element("p", { className: "v8-settings-diagnostic-note", text: canUploadMedia ? "PNG, JPEG ou WebP, 5 Mo maximum." : "Disponible une fois connecté.", attributes: { "aria-live": "polite" } });
  const bannerMediaStatus = element("p", { className: "v8-settings-diagnostic-note", text: canUploadMedia ? "Format large recommande, 5 Mo maximum." : "Disponible une fois connecté.", attributes: { "aria-live": "polite" } });
  const nameInput = element("input", { className: "v8-input", attributes: { type: "text", value: profile?.name || "", maxlength: "80", placeholder: "Nom du profil", "aria-label": "Nom du profil", disabled: !profile?.id || null } });
  const nameStatus = element("p", { className: "v8-settings-diagnostic-note", attributes: { "aria-live": "polite" } });
  const nameSaveButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" } }, [icon("save"), element("span", { text: "Enregistrer" })]);

  const workerStatusHost = element("div", { className: "v8-system-checks", attributes: { "aria-live": "polite" } });
  const workerError = element("p", { className: "v8-settings-diagnostic-note" });
  const workerDiagnosticButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" } }, [icon("stethoscope"), element("span", { text: "Vérifier le Worker" })]);
  const configImportInput = element("input", { attributes: { type: "file", accept: "application/json", "aria-label": "Importer une configuration ETHONE" }, dataset: { settingsConfigImport: "" } });
  const configImportButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { settingsConfigImportTrigger: "" } }, [icon("upload"), element("span", { text: "Importer" })]);
  const configExportButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { settingsConfigExport: "" } }, [icon("download"), element("span", { text: "Exporter" })]);
  const resetPersonalizationButton = element("button", { className: "v8-button v8-button--danger", attributes: { type: "button" }, dataset: { settingsReset: "personalization" } }, [icon("rotate-ccw"), element("span", { text: "Réinitialiser la personnalisation" })]);
  const deleteBrainMemoryButton = element("button", { className: "v8-button v8-button--danger", attributes: { type: "button" } }, [icon("trash-2"), element("span", { text: "Supprimer la mémoire Brain" })]);

  const mailSettings = getMailSettings();
  const accessibility = getAccessibility();
  applyAccessibility(accessibility);

  const searchInput = element("input", { className: "v8-input v8-settings-search__input", attributes: { type: "search", placeholder: "Rechercher un réglage...", "aria-label": "Rechercher un réglage", autocomplete: "off" } });
  const helpInput = element("input", { className: "v8-input v8-settings-search__input", attributes: { type: "search", placeholder: "Recherche d'aide...", "aria-label": "Rechercher de l'aide", autocomplete: "off" } });
  const emptySearch = emptyState({ kind: "no-results", compact: true, inline: true, className: "v8-settings-empty" });
  const favoritesHost = element("div", { className: "v8-settings-favorites" });
  const recentsHost = element("div", { className: "v8-settings-recents" });
  const sectionIndex = element("nav", { className: "v8-section-index", attributes: { role: "navigation", "aria-label": "Sections des réglages" } });

  const shortcutsMap = getShortcuts();
  const shortcutsHost = element("div", { className: "v8-shortcuts-list" }, SHORTCUTS.map((s) => settingRow("keyboard", s.label, s.keys, shortcutSwitch(s.id, `Activer ${s.label}`, shortcutsMap[s.id] !== false), "shortcuts")));
  const shortcutsResetButton = element("button", { className: "v8-button v8-button--outline", attributes: { type: "button" } }, [icon("rotate-ccw"), element("span", { text: "Réinitialiser les raccourcis" })]);

  const cards = [];
  const addCard = (id, eyebrow, title, description, rows) => {
    const card = settingSectionCard(id, eyebrow, title, description, rows);
    cards.push({ id, title, card });
    return card;
  };

  const accountCard = addCard("account", "Identité", "Compte", "Votre nom, photo et bannière visibles dans tout ETHONE.", [
    settingRow("user-round", "Nom du profil", "Affiché dans ETHONE et pour les autres profils.", element("div", { className: "v8-profile-name-control" }, [nameInput, nameSaveButton, nameStatus]), "account"),
    element("div", { className: "v8-profile-media-row" }, [avatarPreviewHost, element("div", { className: "v8-profile-media-row__controls" }, [element("strong", { text: "Photo de profil" }), avatarFileInput, avatarMediaStatus])]),
    element("div", { className: "v8-profile-media-row" }, [bannerPreviewHost, element("div", { className: "v8-profile-media-row__controls" }, [element("strong", { text: "Bannière" }), bannerFileInput, bannerMediaStatus])]),
    settingRow("badge-check", "Notes de version", "Historique des mises à jour, nouveautés et correctifs.", actionButton({ actionId: "v8.changelog.open", variant: "secondary" }, [icon("badge-check"), element("span", { text: "Ouvrir le Changelog" })]), "account")
  ]);

  const appearanceCard = addCard("appearance", "Design System", "Apparence", "Des réglages sobres, cohérents et persistants.", [
    element("div", { className: "v8-density-settings" }, [element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("layout-template")]), element("div", {}, [element("strong", { text: "Presets" }), element("p", { text: "Appliquer une ambiance prête à l'emploi." })]), presetChoices, element("div", { className: "v8-preset-actions" }, [savePresetButton, exportPresetButton])])]),
    element("div", { className: "v8-density-settings" }, [element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("sun-moon")]), element("div", {}, [element("strong", { text: "Thème" }), element("p", { text: "Adapter les surfaces et le contraste." })]), themeResolved]), themeChoices]),
    element("div", { className: "v8-density-settings" }, [element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("sparkles")]), element("div", {}, [element("strong", { text: "Ambiance Aura" }), element("p", { text: "L'atmosphère colorée du Dashboard." })])]), auraChoices]),
    element("div", { className: "v8-density-settings" }, [element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("type")]), element("div", {}, [element("strong", { text: "Typographie" }), element("p", { text: "Personnaliser le caractère du texte." })])]), fontChoices]),
    element("div", { className: "v8-density-settings" }, [element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("circle")]), element("div", {}, [element("strong", { text: "Courbure du Design" }), element("p", { text: "Échelle d'arrondi des cartes et boutons." })])]), radiusChoices]),
    settingRow("palette", "Accent", "Identifier le Space et les actions importantes.", element("div", { className: "v8-theme-picker" }, [accentControls]), "appearance"),
    settingRow("image", "Fond d'écran", "Arrière-plan décoratif du Dashboard.", wallpaperChoices, "appearance"),
    element("div", { className: "v8-density-settings" }, [element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("rows-3")]), element("div", {}, [element("strong", { text: "Density Engine" }), element("p", { text: "Une densité cohérente pour chaque page et résolution." })]), densityResolved]), densityChoices, densityCustomHost, element("div", { className: "v8-density-adaptive" }, [
      element("label", {}, [element("span", {}, [element("strong", { text: "Focus Density" }), element("small", { text: "Compacter automatiquement le Space Focus." })]), switchControl("v8.density.focus", "Activer Focus Density", initialDensitySettings.focusDensity)]),
      element("label", {}, [element("span", {}, [element("strong", { text: "Presets par Space" }), element("small", { text: "Personnel confortable, Focus compact, Studio confortable." })]), switchControl("v8.density.spaces", "Activer les presets par Space", initialDensitySettings.adaptiveBySpace)])
    ]), densityPreviewHost]),
    settingRow("languages", "Langue", "Changer rapidement la langue de l'interface.", actionButton({ actionId: "v8.locale.cycle", variant: "secondary" }, [icon("languages"), element("span", { text: "Langue suivante" })]), "appearance"),
    settingRow("gauge", "Faibles données", "Réduire les données externes et les effets réseau.", lowDataSwitch, "appearance")
  ]);

  const dashboardCard = addCard("dashboard", "Dashboard", "Tableau de bord", "Comportement de l'accueil, du Dock et des animations.", [
    settingRow("sparkles", "Spotlight", "Révéler le Dashboard au démarrage.", switchControl("v8.spotlight.toggle", "Animation Spotlight au demarrage", state.spotlightEnabled !== false), "dashboard"),
    settingRow("minimize", "Mode Zen", "Masquer les barres pour un focus maximal.", switchControl("v8.zen.toggle", "Activer le Mode Zen", state.zen === true), "dashboard"),
    settingRow("dock", "Taille du Dock", "Échelle de la barre de navigation.", element("div", { className: "v8-dock-scale-options", attributes: { role: "group", "aria-label": "Taille du Dock" } }, [choice("v8.dock.scale.compact", "minimize", "Compacte", state.dockScale === "compact"), choice("v8.dock.scale.normal", "dock", "Normale", !state.dockScale || state.dockScale === "normal"), choice("v8.dock.scale.large", "maximize", "Grande", state.dockScale === "large")]), "dashboard"),
    settingRow("align-center", "Alignement du Dock", "Dock centré flottant ou étendu.", element("div", { className: "v8-dock-scale-options", attributes: { role: "group", "aria-label": "Alignement du Dock" } }, [choice("v8.dock.align.center", "align-center", "Centré", !state.dockAlign || state.dockAlign === "center"), choice("v8.dock.align.stretch", "maximize", "Plein Écran", state.dockAlign === "stretch")]), "dashboard"),
    settingRow("sparkles", "Style du Dock (Verre)", "Transparence, flou artistique ou opaque.", element("div", { className: "v8-dock-scale-options", attributes: { role: "group", "aria-label": "Style du Dock" } }, [choice("v8.dock.glass.default", "sparkles", "Vitrifié", !state.dockGlass || state.dockGlass === "default"), choice("v8.dock.glass.ultra", "blend", "Ultra Flou", state.dockGlass === "ultra"), choice("v8.dock.glass.opaque", "layout", "Sobre", state.dockGlass === "opaque")]), "dashboard"),
    settingRow("eye-off", "Masquage auto du Dock", "Masquer automatiquement le dock.", element("div", { className: "v8-dock-scale-options", attributes: { role: "group", "aria-label": "Masquage auto du Dock" } }, [choice("v8.dock.autohide.off", "eye", "Toujours visible", !state.dockAutoHide), choice("v8.dock.autohide.on", "eye-off", "Masquer auto", state.dockAutoHide === true)]), "dashboard"),
    settingRow("layout-grid", "Grille de l'Accueil", "Nombre de colonnes du Dashboard.", element("div", { className: "v8-dock-scale-options", attributes: { role: "group", "aria-label": "Grille de l'Accueil" } }, [choice("v8.home.grid.2", "layout-grid", "2 Colonnes", state.homeGrid === "2"), choice("v8.home.grid.3", "layout-grid", "3 Colonnes", state.homeGrid === "3"), choice("v8.home.grid.4", "layout-grid", "4 Colonnes", !state.homeGrid || state.homeGrid === "4")]), "dashboard"),
    settingRow("image", "Bannière d'Accueil", "Afficher la salutation complète, compacte ou masquée.", element("div", { className: "v8-dock-scale-options", attributes: { role: "group", "aria-label": "Bannière d'Accueil" } }, [choice("v8.home.hero.full", "image", "Complète", !state.homeHero || state.homeHero === "full"), choice("v8.home.hero.compact", "minimize", "Compacte", state.homeHero === "compact"), choice("v8.home.hero.hidden", "eye-off", "Masquée", state.homeHero === "hidden")]), "dashboard"),
    element("div", { className: "v8-density-settings" }, [element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("gauge")]), element("div", {}, [element("strong", { text: "Performance" }), element("p", { text: "Réduire les effets visuels pour gagner en fluidité." })])]),
      settingRow("sparkle", "Effets d'ambiance", "Halos et particules animés en arrière-plan.", switchControl("v8.motion.ambient.toggle", "Activer les effets d'ambiance", state.ambientEffectsEnabled !== false), "dashboard"),
      settingRow("blend", "Flou d'interface", "Verre dépoli sur dock, fenêtres et menus.", switchControl("v8.motion.blur.toggle", "Activer le flou d'interface", state.interfaceBlurEnabled !== false), "dashboard")
    ])
  ]);

  const brainCard = addCard("brain", "Personal Brain", "Brain", "Assistant, mémoire et confidentialité.", [
    settingRow("signature", "Identité", "Choisir le nom et le style de réponse.", element("div", { className: "v8-brain-settings-controls" }, [brainPreferenceSwitch("enabled", "Activer Brain", brainPreferences.enabled), brainNameInput, brainPersonaSelect, brainDetailSelect]), "brain"),
    settingRow("message-square-more", "Comportement", "Ajuster le ton, la langue, les suggestions et l'automatisation.", element("div", { className: "v8-brain-settings-controls" }, [brainToneSelect, brainLanguageSelect, brainSuggestionSelect, brainAutomationSelect]), "brain"),
    settingRow("sparkles", "Présence", "Brain reste discret et respecte le mode Focus.", element("div", { className: "v8-brain-settings-inline" }, [brainPreferenceSwitch("proactive", "Suggestions proactives", brainPreferences.proactive), brainPreferenceSwitch("notifications", "Notifications Brain", brainPreferences.notifications), brainPreferenceSwitch("sounds", "Sons Brain", brainPreferences.sounds), brainPreferenceSwitch("silentInFocus", "Silencieux en Focus", brainPreferences.silentInFocus)]), "brain"),
    settingRow("cpu", "Provider", "Les providers cloud exigent le backend ETHONE.", element("div", { className: "v8-brain-settings-controls" }, [brainProviderSelect, brainModelInput, brainFallbackSelect, brainPrivacySelect]), "brain"),
    settingRow("database", "Mémoire", "Préférences utiles, avec rétention et RLS.", element("div", { className: "v8-brain-settings-inline" }, [brainPreferenceSwitch("memory.enabled", "Activer la mémoire Brain", brainPreferences.memory.enabled), brainRetentionSelect, brainMemoryLoad]), "brain"),
    settingRow("sunrise", "Briefing quotidien", "Événements, priorités et signaux utiles.", element("div", { className: "v8-brain-settings-inline" }, [brainPreferenceSwitch("briefing.enabled", "Activer le briefing Brain", brainPreferences.briefing.enabled), brainPreferenceSwitch("briefing.concise", "Conserver un briefing concis", brainPreferences.briefing.concise)]), "brain"),
    settingRow("eye", "Permissions", "Données que Brain peut consulter.", brainPermissionGrid, "brain"),
    settingRow("bookmark", "Catégories de mémoire", "Ce que Brain retient pour personnaliser vos espaces.", brainMemoryCategoryGrid, "brain"),
    settingRow("brain-circuit", "Mémoires stockées", "Consulter, modifier et supprimer les souvenirs Brain.", element("div", {}, [brainMemoryList, brainMemoryStatus]), "brain")
  ]);

  const connectionRows = CONNECTIONS.map((id) => settingRow("plug", id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, " "), `Connecter ou gérer votre compte ${id}.`, actionButton({ actionId: `v8.connections.${id}.connect`, variant: "secondary" }, [icon("link"), element("span", { text: "Connecter" })]), `connections--${id}`));
  const connectionsCard = addCard("connections", "Services", "Connexions", "Liens avec vos apps et comptes externes.", connectionRows);

  const soundPackSelect = createSelect({ className: "v8-input", attributes: { "aria-label": "Pack sonore" }, dataset: { soundPack: "" } }, SOUND_PACKS.map((pack) => element("option", { text: pack.label, attributes: { value: pack.id } })));
  soundPackSelect.value = initialSoundPreferences.pack;
  const notificationsCard = addCard("notifications", "Signal", "Notifications", "Sons, alertes et comportement des signaux.", [
    settingRow("volume-2", "Pack sonore", "Thème audio des retours dans ETHONE.", soundPackSelect, "notifications"),
    ...SOUND_VOLUME_ROWS.map((row) => settingRow(row.icon, row.title, row.description, soundRange(row.id, initialSoundPreferences.volumes?.[row.id] ?? (row.id === "master" ? initialSoundPreferences.master : 0.5), !soundSupported), `notifications--${row.id}`)),
    settingRow("bell-off", "Mode Silence", "Désactiver tous les retours sonores.", switchControl("v8.sound.silent", "Mode Silence", initialSoundPreferences.silent === true), "notifications"),
    settingRow("audio-lines", "Audio spatial", "Spatialisation légère des signaux.", switchControl("v8.sound.spatial", "Activer l'audio spatial", initialSoundPreferences.spatial !== false && spatialSupported, !spatialSupported), "notifications")
  ]);

  const mailCard = addCard("mail", "Courrier", "Mail", "Préférences de lecture, rédaction et sécurité.", [
    settingRow("bell-ring", "Son de notification", "Jouer un son à l'arrivée d'un nouveau message.", mailSwitch("notificationSound", "Son de notification", mailSettings.notificationSound), "mail"),
    settingRow("mail-open", "Marquer comme lu", "Marquer automatiquement un message à l'ouverture.", mailSwitch("markAsReadOnOpen", "Marquer comme lu à l'ouverture", mailSettings.markAsReadOnOpen), "mail"),
    settingRow("pen-tool", "Signature par défaut", "Insérer automatiquement la signature.", mailSwitch("defaultSignature", "Signature par défaut", mailSettings.defaultSignature), "mail"),
    settingRow("shield", "Filtre anti-spam", "Détecter et isoler les messages suspects.", mailSwitch("spamFilter", "Filtre anti-spam", mailSettings.spamFilter), "mail"),
    settingRow("lock", "Chiffrement PGP auto", "Chiffrer automatiquement si une clé PGP est connue.", mailSwitch("pgpAutoEncrypt", "Chiffrement PGP automatique", mailSettings.pgpAutoEncrypt), "mail"),
    settingRow("wifi-off", "Mode hors ligne", "Conserver les actions en attente sans connexion.", mailSwitch("offlineMode", "Mode hors ligne", mailSettings.offlineMode), "mail")
  ]);

  const securityCard = addCard("security", "Sécurité", "Sécurité", "Diagnostic et contrôle de session.", [
    settingRow("shield-check", "État des services", "Vérifier le worker et les connexions cloud.", workerDiagnosticButton, "security"),
    workerStatusHost,
    workerError,
    settingRow("key-round", "Passkeys et appareils", "Gérer les clés d'accès et la confiance des appareils.", actionButton({ actionId: "v8.security.open", variant: "secondary" }, [icon("key-round"), element("span", { text: "Ouvrir la sécurité" })]), "security")
  ]);

  const privacyCard = addCard("privacy", "Confidentialité", "Vie privée", "Contrôler ce que Brain sait et peut conserver.", [
    settingRow("eye", "Accès de Brain", `Brain peut consulter : ${BRAIN_PERMISSION_CATEGORIES.filter((c) => brainPreferences.permissions[c]).map((c) => BRAIN_PERMISSION_LABELS[c] || c).join(", ") || "rien"}.`, brainPermissionGrid.cloneNode(true), "privacy"),
    settingRow("trash-2", "Supprimer la mémoire Brain", "Effacer tous les souvenirs enregistrés par Brain.", deleteBrainMemoryButton, "privacy"),
    settingRow("rotate-ccw", "Réinitialiser la personnalisation", "Effacer les préférences locales et repartir à zéro.", resetPersonalizationButton, "privacy")
  ]);

  const fontSizeSelect = createSelect({ className: "v8-input", attributes: { "aria-label": "Taille de police" } }, FONT_SIZE_OPTIONS.map((o) => element("option", { text: o.label, attributes: { value: o.id } })));
  fontSizeSelect.value = accessibility.fontSize;
  const colorBlindSelect = createSelect({ className: "v8-input", attributes: { "aria-label": "Mode daltonien" } }, COLOR_BLIND_OPTIONS.map((o) => element("option", { text: o.label, attributes: { value: o.id } })));
  colorBlindSelect.value = accessibility.colorBlind;
  const accessibilityCard = addCard("accessibility", "Accessibilité", "Accessibilité", "Adapter ETHONE à vos besoins de lecture et de perception.", [
    settingRow("type", "Taille du texte", "Augmenter ou réduire l'échelle du texte.", fontSizeSelect, "accessibility"),
    settingRow("pause", "Réduire les mouvements", "Limiter les animations et les transitions.", switchControl("v8.ui.animations.reduced", "Réduire les mouvements", accessibility.reducedMotion), "accessibility"),
    settingRow("contrast", "Contraste élevé", "Renforcer les contrastes pour plus de lisibilité.", switchControl("v8.accessibility.highcontrast", "Contraste élevé", accessibility.highContrast), "accessibility"),
    settingRow("palette", "Mode daltonien", "Adapter les couleurs en cas de trouble de la vision.", colorBlindSelect, "accessibility")
  ]);

  const shortcutsCard = addCard("shortcuts", "Clavier", "Raccourcis", "Activer ou désactiver les raccourcis clavier.", [shortcutsHost, shortcutsResetButton]);

  const advancedCard = addCard("advanced", "Avancé", "Avancé", "Import, export, diagnostic et maintenance.", [
    settingRow("archive", "Configuration ETHONE", "Exporter ou importer l'ensemble des réglages locaux.", element("div", { className: "v8-brain-settings-inline" }, [configExportButton, configImportButton, configImportInput]), "advanced"),
    settingRow("rotate-ccw", "Réinitialiser", "Effacer la personnalisation et revenir à l'état initial.", resetPersonalizationButton, "advanced")
  ]);

  sectionIndex.replaceChildren(...cards.map(({ id, title }) => sectionIndexLink(id, title)));

  const favoritesCard = settingSectionCard("favorites", "Favoris", "Favoris", "Vos réglages épinglés pour un accès rapide.", [favoritesHost]);
  const recentsCard = settingSectionCard("recents", "Historique", "Récemment modifiés", "Les 5 derniers réglages changés.", [recentsHost]);
  const helpCard = settingSectionCard("help", "Aide", "Rechercher de l'aide", "Trouvez un réglage par mots-clés.", [helpInput, emptySearch.cloneNode(true)]);

  const page = element("section", { className: "v8-page v8-settings-page", dataset: { page: "settings" } }, [
    element("header", { className: "v8-page-heading v8-settings-heading" }, [
      element("button", { className: "v8-icon-button v8-settings-back", attributes: { type: "button", "aria-label": "Retour", "data-tooltip": "Retour" }, dataset: { action: "v8.home.open" } }, [icon("arrow-left")]),
      element("div", { className: "v8-page-heading__copy" }, [element("span", { className: "v8-eyebrow", text: "Système" }), element("h1", { text: "Réglages" }), element("p", { text: "Une seule source de vérité pour l'apparence et le comportement d'ETHONE." })]),
      element("div", { className: "v8-page-heading__actions" }, [settingsSaveStatus, actionButton({ actionId: "v8.profile.open", variant: "secondary" }, [icon("user-round"), element("span", { text: "Profil" })])])
    ]),
    element("div", { className: "v8-settings-sticky" }, [
      sectionIndex,
      element("div", { className: "v8-settings-search" }, [icon("search"), searchInput])
    ]),
    emptySearch,
    favoritesCard,
    recentsCard,
    ...cards.map(({ card }) => card),
    helpCard
  ]);

  stage.replaceChildren(page);
  prepareFormControls(page);
  const controller = new AbortController();
  let workerDiagnosticRunning = false;

  function workerMetric(iconName, title, value) { return element("span", {}, [icon(iconName), element("strong", { text: title }), element("b", { text: value })]); }
  function renderWorkerStatus() {
    const snapshot = externalServices?.diagnostics?.() || {};
    const requests = Math.max(0, Number(snapshot.requests) || 0);
    const successes = Math.max(0, Number(snapshot.successes) || 0);
    const rate = requests ? `${Math.round((successes / requests) * 100)} %` : "Non mesuré";
    const services = Array.isArray(snapshot.services) ? snapshot.services : [];
    const available = services.filter((service) => service.available).map((service) => service.id);
    const remaining = Number.isFinite(Number(snapshot.rateLimit?.remaining)) ? String(snapshot.rateLimit.remaining) : "Non communiqué";
    workerStatusHost.replaceChildren(
      workerMetric(snapshot.workerConnected ? "shield-check" : "shield-alert", "Worker", snapshot.workerConnected ? "Connecté" : "Non vérifié"),
      workerMetric("timer", "Latence", Number.isFinite(Number(snapshot.lastLatencyMs)) ? `${Math.round(snapshot.lastLatencyMs)} ms` : "Non mesurée"),
      workerMetric("chart-no-axes-combined", "Succès", rate),
      workerMetric("blocks", "Services", available.length ? available.join(", ") : "Aucun confirme"),
      workerMetric("gauge", "Rate limit", remaining),
      workerMetric("database", "Cache", Number.isFinite(Number(snapshot.cache?.entries)) ? `${snapshot.cache.entries} entree${snapshot.cache.entries === 1 ? "" : "s"}` : "Non mesuré")
    );
    workerError.textContent = snapshot.lastError ? `Derniere erreur : ${snapshot.lastError}` : "Aucune erreur Worker enregistree.";
    refreshIcons();
  }

  function previewResolution(nextState = latestState, customOverride = null) {
    const settings = sanitizeDensitySettings(nextState.densitySettings);
    if (customOverride) return { requested: "custom", effective: "custom", reason: "preview", values: customOverride };
    const current = options.densityEngine?.resolution?.();
    if (current?.requested === nextState.density) return current;
    return resolveDensity(nextState, { width: globalThis.innerWidth || 1280, height: globalThis.innerHeight || 800, zoom: globalThis.visualViewport?.scale || 1, coarsePointer: false, panelOpen: false, railExpanded: nextState.railExpanded });
  }

  function applySwatchValues(actionId, values) {
    if (!values) return;
    const swatch = page.querySelector(`[data-action='${actionId}'] .v8-density-swatch`);
    if (!swatch) return;
    swatch.style.setProperty("--v8-density-swatch-row", `${Math.max(3, Math.round(values.rowHeight * 0.15))}px`);
    swatch.style.setProperty("--v8-density-swatch-pad", `${Math.max(2, Math.round(values.cardPadding * 0.15))}px`);
    swatch.style.setProperty("--v8-density-swatch-gap", `${Math.max(1, Math.round(values.sectionGap * 0.15 * 0.6))}px`);
  }

  function updateDensityPreview(nextState = latestState, customOverride = null) {
    const resolution = previewResolution(nextState, customOverride);
    Object.entries(densityCssVariables(resolution.values)).forEach(([name, value]) => densityPreviewHost.style.setProperty(name, value));
    densityPreviewHost.dataset.previewDensity = resolution.effective;
    densityResolved.textContent = resolution.requested === "automatic" ? `${DENSITY_LABELS[resolution.effective]} - ${resolution.reason}` : DENSITY_LABELS[resolution.effective] || "Confortable";
    applySwatchValues("v8.density.automatic", resolution.requested === "automatic" ? resolution.values : null);
    applySwatchValues("v8.density.custom", resolution.requested === "custom" ? resolution.values : null);
  }

  function updatePreferenceControls(nextState) {
    latestState = nextState;
    const saveState = nextState.saveStatus || (nextState.networkStatus === "offline" ? "offline" : "saved");
    if (saveState === "saving" || saveState === "syncing") setFormStatus(settingsSaveStatus, "loading", "Enregistrement...");
    else if (saveState === "error") setFormStatus(settingsSaveStatus, "error", "Erreur de sauvegarde");
    else if (saveState === "offline") setFormStatus(settingsSaveStatus, "error", "Hors ligne - en attente");
    else setFormStatus(settingsSaveStatus, "saved", "Enregistre");
    page.querySelectorAll("[data-density-mode]").forEach((button) => {
      const active = button.dataset.densityMode === nextState.density;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      const check = button.querySelector("[data-lucide='check']");
      if (active && !check) button.append(icon("check"));
      if (!active) check?.remove();
    });
    page.querySelectorAll("[data-action^='v8.accent.']").forEach((button) => {
      const active = button.dataset.action === `v8.accent.${nextState.accent}`;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      const check = button.querySelector("[data-lucide='check']");
      if (active && !check) button.append(icon("check"));
      if (!active) check?.remove();
    });
    customColorSwatch.classList.toggle("is-active", nextState.accent === "custom");
    const customCheck = customColorSwatch.querySelector("[data-lucide='check']");
    if (nextState.accent === "custom" && !customCheck) customColorSwatch.append(icon("check"));
    if (nextState.accent !== "custom") customCheck?.remove();
    if (document.activeElement !== customColorInput) {
      customColorInput.value = nextState.customAccentColor;
      customColorSwatch.style.setProperty("--v8-accent-swatch-custom-color", nextState.customAccentColor);
    }
    densityCustomHost.hidden = nextState.density !== "custom";
    const nextThemeResolution = resolveTheme(nextState.theme, { systemPrefersLight: systemPrefersLight(globalThis) });
    page.querySelectorAll("[data-theme-mode]").forEach((button) => {
      const active = button.dataset.themeMode === nextState.theme;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      const check = button.querySelector("[data-lucide='check']");
      if (active && !check) button.append(icon("check"));
      if (!active) check?.remove();
      if (button.dataset.themeMode === "auto") {
        const note = button.querySelector(".v8-theme-choice__resolved");
        if (note) note.hidden = nextThemeResolution.requested !== "auto";
      }
    });
    themeResolved.textContent = nextThemeResolution.requested === "auto" ? `${THEME_LABELS[nextThemeResolution.effective]} - systeme` : THEME_LABELS[nextThemeResolution.effective];
    const toggleStateMap = [
      { action: "v8.zen.toggle", value: nextState.zen === true },
      { action: "v8.spotlight.toggle", value: nextState.spotlightEnabled !== false },
      { action: "v8.motion.ambient.toggle", value: nextState.ambientEffectsEnabled !== false },
      { action: "v8.motion.blur.toggle", value: nextState.interfaceBlurEnabled !== false },
      { action: "v8.dock.magnify.toggle", value: nextState.dockMagnify === true },
      { action: "v8.ui.glow.toggle", value: nextState.uiGlow === true },
      { action: "v8.ui.sound.feedback.toggle", value: nextState.uiSoundFeedback === true }
    ];
    toggleStateMap.forEach(({ action, value }) => { page.querySelector(`[data-action='${action}']`)?.setAttribute("aria-checked", String(value)); });
    updateDensityPreview(nextState);
    refreshIcons();
  }

  function renderFavorites() {
    const favs = [...getFavorites()];
    const rows = [...page.querySelectorAll("[data-settings-row]")];
    if (!favs.length) { favoritesHost.replaceChildren(statusState("empty", { compact: true, inline: true, iconName: "star", eyebrow: "Favoris", title: "Aucun favori", description: "Épinglez un réglage avec l'étoile à gauche de chaque option." })); return; }
    const links = favs.map((id) => {
      const row = rows.find((r) => r.dataset.settingsRow === id);
      if (!row) return null;
      return element("button", { className: "v8-chip", attributes: { type: "button" }, dataset: { settingsGo: id } }, [icon("star"), element("span", { text: row.dataset.settingsTitle || "Réglage" })]);
    }).filter(Boolean);
    favoritesHost.replaceChildren(...links);
    refreshIcons();
  }

  function renderRecents() {
    const recents = getRecent();
    if (!recents.length) { recentsHost.replaceChildren(statusState("empty", { compact: true, inline: true, iconName: "history", eyebrow: "Historique", title: "Aucune modification", description: "Les réglages changés apparaîtront ici." })); return; }
    const rows = [...page.querySelectorAll("[data-settings-row]")];
    const links = recents.map((entry) => {
      const row = rows.find((r) => r.dataset.settingsRow === entry.id);
      return element("button", { className: "v8-chip", attributes: { type: "button" }, dataset: { settingsGo: entry.id } }, [icon("history"), element("span", { text: row?.dataset.settingsTitle || entry.title || "Réglage" })]);
    }).filter(Boolean);
    recentsHost.replaceChildren(...links);
    refreshIcons();
  }

  function filterSettings(query) {
    const lower = query.toLowerCase().trim();
    const allRows = [...page.querySelectorAll("[data-settings-row]")];
    let any = false;
    page.querySelectorAll(".v8-card.v8-settings-section").forEach((card) => { if (!card.id || card.id === "v8-settings-favorites" || card.id === "v8-settings-recents" || card.id === "v8-settings-help") return; card.hidden = false; });
    allRows.forEach((row) => {
      const title = row.dataset.settingsTitle || "";
      const desc = row.dataset.settingsDescription || "";
      unhighlightText(row);
      if (!lower || title.toLowerCase().includes(lower) || desc.toLowerCase().includes(lower)) {
        row.hidden = false;
        if (lower) highlightText(row, lower);
        any = true;
      } else {
        row.hidden = true;
      }
    });
    page.querySelectorAll(".v8-card.v8-settings-section").forEach((card) => {
      if (!card.id || card.id === "v8-settings-favorites" || card.id === "v8-settings-recents" || card.id === "v8-settings-help") return;
      const visibleRows = [...card.querySelectorAll("[data-settings-row]")].some((r) => !r.hidden);
      card.hidden = !visibleRows;
    });
    emptySearch.hidden = any;
  }

  function filterHelp(query) {
    const lower = query.toLowerCase().trim();
    const results = [];
    if (lower) {
      page.querySelectorAll("[data-settings-row]").forEach((row) => {
        const title = row.dataset.settingsTitle || "";
        const desc = row.dataset.settingsDescription || "";
        if (title.toLowerCase().includes(lower) || desc.toLowerCase().includes(lower)) results.push({ id: row.dataset.settingsRow, title, desc });
      });
    }
    const list = helpInput.nextElementSibling;
    if (!list) return;
    if (!results.length) { list.replaceChildren(statusState(lower ? "no-results" : "empty", { compact: true, inline: true, title: lower ? "Aucun résultat" : "Saisissez un mot-clé", description: lower ? "Essayez un autre terme." : "Tapez 'notifications', 'theme', 'mail'..." })); return; }
    list.replaceChildren(...results.map((r) => element("button", { className: "v8-chip", attributes: { type: "button" }, dataset: { settingsGo: r.id } }, [icon("search"), element("span", { text: r.title })])));
    refreshIcons();
  }

  function commitSetting(control, actionId, context) {
    setFieldState(control, "loading", "Enregistrement...");
    setFormStatus(settingsSaveStatus, "loading", "Enregistrement...");
    const settle = (result) => {
      if (result?.ok === false) { setFieldState(control, "invalid", result.message); setFormStatus(settingsSaveStatus, "error", result.message || "Erreur de sauvegarde"); }
      else { setFieldState(control, "valid", "Enregistre"); setFormStatus(settingsSaveStatus, "saved", result?.message || "Enregistre"); }
      return result;
    };
    const result = options.actions?.dispatch?.(actionId, context);
    return result?.then ? result.then(settle) : settle(result);
  }

  const unsubscribeState = options.subscribeState ? options.subscribeState((next) => updatePreferenceControls(next)) : () => {};
  const unsubscribeSounds = sounds?.subscribe ? sounds.subscribe(() => { const next = sounds.preferences?.() || DEFAULT_SOUND_PREFERENCES; SOUND_VOLUME_ROWS.forEach((row) => { const input = page.querySelector(`[data-sound-volume='${row.id}']`); if (input) input.value = String(Math.round((next.volumes?.[row.id] ?? next.master) * 100)); }); }) : () => {};

  function saveProfileName() {
    const nextName = nameInput.value.trim();
    if (!profile?.id) return;
    if (!nextName) { nameStatus.textContent = "Le nom ne peut pas être vide."; return; }
    const patched = options.repository?.updateProfile?.(profile.id, { name: nextName });
    if (!patched?.ok) { nameStatus.textContent = patched?.message || "Enregistrement impossible."; return; }
    nameInput.value = nextName;
    nameStatus.textContent = "Nom mis a jour.";
    options.onProfileMediaUpdated?.("name", nextName);
  }

  async function handleProfileMediaChange(kind, input, statusEl) {
    const file = input.files?.[0] || null;
    if (!file) return;
    const validation = validateMediaFile(file);
    if (!validation.ok) { statusEl.textContent = validation.message; input.value = ""; return; }
    statusEl.textContent = "Envoi en cours...";
    input.disabled = true;
    try {
      const client = await options.clientProvider?.();
      const upload = await uploadProfileMedia({ file, kind, ownerId: options.ownerId, client });
      if (!upload.ok) { statusEl.textContent = upload.message; options.notify?.({ id: `profile-media-${kind}-error`, title: "Téléversement impossible", message: upload.message, type: "error" }); return; }
      const patch = kind === "banner" ? { bannerImg: upload.data.url } : { avatarImg: upload.data.url };
      const patched = options.repository?.updateProfile?.(profile?.id, patch);
      if (!patched?.ok) { statusEl.textContent = patched?.message || "Enregistrement impossible."; return; }
      if (kind === "banner") { bannerPreviewHost.style.backgroundImage = `url("${upload.data.url}")`; bannerPreviewHost.classList.remove("is-empty"); }
      else { avatarPreviewHost.replaceChildren(profileAvatarPreviewNode({ kind: "image", value: upload.data.url }, "E")); options.onProfileMediaUpdated?.("avatar", upload.data.url); }
      statusEl.textContent = kind === "banner" ? "Bannière mise à jour." : "Photo mise à jour.";
    } finally { input.disabled = false; input.value = ""; }
  }

  let memoryBusy = false;
  async function renderSettingsMemories() {
    if (memoryBusy || !options.brain?.memory) return;
    memoryBusy = true;
    brainMemoryLoad.disabled = true;
    brainMemoryStatus.textContent = "Chargement sécurisé depuis Supabase...";
    brainMemoryList.replaceChildren(statusState("loading", { title: "Chargement des memoires", description: "Lecture sécurisée depuis Supabase.", compact: true, inline: true }));
    refreshIcons();
    const response = await options.brain.memory.list();
    if (controller.signal.aborted) return;
    memoryBusy = false;
    brainMemoryLoad.disabled = false;
    brainMemoryStatus.textContent = response.ok ? `${response.data.length} memoire${response.data.length > 1 ? "s" : ""} active${response.data.length > 1 ? "s" : ""}.` : response.message;
    brainMemoryList.replaceChildren(...(response.ok && response.data.length ? response.data.map((entry) => element("div", { className: "v8-settings-memory-row" }, [element("span", {}, [icon("bookmark")]), element("div", {}, [element("small", { text: entry.category }), element("strong", { text: entry.key }), element("p", { text: entry.value })]), element("div", {}, [element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Modifier cette memoire" }, dataset: { settingsMemoryEdit: entry.id, settingsMemoryValue: entry.value } }, [icon("pencil")]), element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Supprimer cette memoire" }, dataset: { settingsMemoryDelete: entry.id } }, [icon("trash-2")])])])) : [statusState(response.ok ? "empty" : "error", { iconName: "database", eyebrow: "Memoire Brain", title: response.ok ? "Aucune memoire active" : "Memoires indisponibles", description: response.ok ? "Brain n'a encore rien retenu." : "Impossible de lire la mémoire." })]));
    refreshIcons();
  }

  updatePreferenceControls(state);
  renderFavorites();
  renderRecents();
  filterSettings("");

  page.addEventListener("click", (event) => {
    const button = event.target.closest("[data-settings-favorite]");
    if (!button) return;
    event.stopPropagation();
    const id = button.dataset.settingsFavorite;
    const favs = getFavorites();
    const active = !favs.has(id);
    if (active) favs.add(id); else favs.delete(id);
    setFavorites(favs);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    renderFavorites();
  }, { signal: controller.signal });

  page.addEventListener("click", (event) => {
    const button = event.target.closest("[data-settings-go]");
    if (!button) return;
    event.preventDefault();
    const id = button.dataset.settingsGo;
    const target = page.querySelector(`[data-settings-row='${id}']`);
    if (target) { target.scrollIntoView({ behavior: "smooth", block: "center" }); target.classList.add("is-targeted"); globalThis.setTimeout(() => target.classList.remove("is-targeted"), 1200); }
  }, { signal: controller.signal });

  page.addEventListener("click", (event) => {
    const button = event.target.closest(".v8-setting-choice, [data-density-mode], [data-theme-mode], button.v8-accent-swatch, [data-wallpaper-mode]");
    if (!button || !button.dataset.action) return;
    event.stopPropagation();
    options.actions?.dispatch?.(button.dataset.action, { source: "settings" });
  }, { signal: controller.signal });

  page.addEventListener("click", (event) => {
    const button = event.target.closest(".v8-preset-choice, .v8-preset-actions [data-action]");
    if (!button || !button.dataset.action) return;
    event.stopPropagation();
    const context = { source: "settings" };
    if (button.dataset.presetId) context.id = button.dataset.presetId;
    if (button.dataset.presetName) context.name = button.dataset.presetName;
    options.actions?.dispatch?.(button.dataset.action, context);
  }, { signal: controller.signal });

  page.addEventListener("click", (event) => {
    const row = event.target.closest("[data-settings-row]");
    if (!row) return;
    addRecent(row.dataset.settingsRow, row.dataset.settingsTitle || "Réglage");
    renderRecents();
  }, { signal: controller.signal });

  const dispatchVolume = throttleFrame((category, value, el, event) => { options.actions?.dispatch?.("v8.sound.volume", { source: "settings", category, value, element: el, event }); });
  page.querySelectorAll("[data-sound-volume]").forEach((control) => control.addEventListener("input", (event) => {
    const category = event.currentTarget.dataset.soundVolume;
    const value = Number(event.currentTarget.value) / 100;
    const output = page.querySelector(`[data-sound-value="${category}"]`);
    if (output) output.textContent = `${Math.round(value * 100)} %`;
    event.currentTarget.style.setProperty("--v8-range-progress", `${Math.round(value * 100)}%`);
    dispatchVolume(category, value, event.currentTarget, event);
  }, { signal: controller.signal }));

  page.querySelector("[data-sound-pack]")?.addEventListener("change", (event) => { commitSetting(event.currentTarget, `v8.sound.pack.${event.currentTarget.value}`, { source: "settings", element: event.currentTarget, event }); addRecent("notifications--pack", "Pack sonore"); }, { signal: controller.signal });

  page.querySelectorAll("[data-density-custom]").forEach((control) => {
    control.addEventListener("input", (event) => {
      const key = event.currentTarget.dataset.densityCustom;
      const range = DENSITY_CUSTOM_RANGES[key];
      const value = Number(event.currentTarget.value);
      const progress = ((value - range.min) / (range.max - range.min)) * 100;
      event.currentTarget.style.setProperty("--v8-range-progress", `${progress}%`);
      page.querySelector(`[data-density-output='${key}']`).textContent = `${value}${range.unit}`;
      const custom = { ...sanitizeDensitySettings(latestState.densitySettings).custom, [key]: value };
      updateDensityPreview({ ...latestState, density: "custom" }, custom);
    }, { signal: controller.signal });
    control.addEventListener("change", (event) => commitSetting(event.currentTarget, "v8.density.custom.update", { source: "settings", key: event.currentTarget.dataset.densityCustom, value: Number(event.currentTarget.value) }), { signal: controller.signal });
  });

  page.querySelectorAll("[data-brain-preference]").forEach((control) => control.addEventListener("click", (event) => {
    const path = event.currentTarget.dataset.brainPreference;
    const value = event.currentTarget.getAttribute("aria-checked") !== "true";
    commitSetting(event.currentTarget, "v8.brain.preference", { source: "settings", path, value });
  }, { signal: controller.signal }));

  page.querySelectorAll("[data-brain-preference-select]").forEach((control) => control.addEventListener("change", (event) => {
    const path = event.currentTarget.dataset.brainPreferenceSelect;
    const value = path === "memory.retentionDays" ? Number(event.currentTarget.value) : event.currentTarget.value;
    commitSetting(event.currentTarget, "v8.brain.preference", { source: "settings", path, value });
  }, { signal: controller.signal }));

  page.querySelectorAll("[data-brain-preference-input]").forEach((control) => control.addEventListener("change", (event) => commitSetting(event.currentTarget, "v8.brain.preference", { source: "settings", path: event.currentTarget.dataset.brainPreferenceInput, value: event.currentTarget.value }), { signal: controller.signal }));

  brainMemoryLoad.addEventListener("click", () => void renderSettingsMemories(), { signal: controller.signal });
  brainMemoryList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest("[data-settings-memory-delete]");
    const editButton = event.target.closest("[data-settings-memory-edit]");
    if (removeButton) {
      if (!confirm("Supprimer cette memoire Brain ?")) return;
      const response = await options.brain.memory.remove(removeButton.dataset.settingsMemoryDelete);
      brainMemoryStatus.textContent = response.message;
      if (response.ok) await renderSettingsMemories();
    } else if (editButton) {
      const value = prompt("Modifier la memoire", editButton.dataset.settingsMemoryValue || "");
      if (value == null) return;
      const response = await options.brain.memory.update(editButton.dataset.settingsMemoryEdit, { value });
      brainMemoryStatus.textContent = response.message;
      if (response.ok) await renderSettingsMemories();
    }
  }, { signal: controller.signal });

  deleteBrainMemoryButton.addEventListener("click", async () => {
    if (!confirm("Supprimer définitivement toutes les mémoires Brain ?")) return;
    const response = await options.brain?.memory?.clear?.({ confirmed: true });
    brainMemoryStatus.textContent = response?.message || "Suppression indisponible.";
    if (response?.ok) await renderSettingsMemories();
  }, { signal: controller.signal });

  page.querySelectorAll("[data-mail-preference]").forEach((control) => control.addEventListener("click", (event) => {
    const path = event.currentTarget.dataset.mailPreference;
    const current = getMailSettings();
    const value = event.currentTarget.getAttribute("aria-checked") !== "true";
    current[path] = value;
    setMailSettings(current);
    event.currentTarget.setAttribute("aria-checked", String(value));
    commitSetting(event.currentTarget, "v8.mail.preference", { source: "settings", path, value });
  }, { signal: controller.signal }));

  page.querySelectorAll("[data-shortcut-id]").forEach((control) => control.addEventListener("click", (event) => {
    const id = event.currentTarget.dataset.shortcutId;
    const map = getShortcuts();
    const value = event.currentTarget.getAttribute("aria-checked") !== "true";
    map[id] = value;
    setShortcuts(map);
    event.currentTarget.setAttribute("aria-checked", String(value));
  }, { signal: controller.signal }));

  shortcutsResetButton.addEventListener("click", () => {
    const defaults = Object.fromEntries(SHORTCUTS.map((s) => [s.id, s.default]));
    setShortcuts(defaults);
    page.querySelectorAll("[data-shortcut-id]").forEach((control) => control.setAttribute("aria-checked", String(defaults[control.dataset.shortcutId])));
  }, { signal: controller.signal });

  const updateAccessibility = () => {
    const fontSize = fontSizeSelect.value;
    const colorBlind = colorBlindSelect.value;
    const highContrast = page.querySelector("[data-action='v8.accessibility.highcontrast']")?.getAttribute("aria-checked") === "true";
    const reducedMotion = page.querySelector("[data-action='v8.ui.animations.reduced']")?.getAttribute("aria-checked") === "true";
    setAccessibility({ fontSize, colorBlind, highContrast, reducedMotion });
  };

  fontSizeSelect.addEventListener("change", () => { updateAccessibility(); commitSetting(fontSizeSelect, "v8.accessibility.fontsize", { source: "settings", value: fontSizeSelect.value }); }, { signal: controller.signal });
  colorBlindSelect.addEventListener("change", () => { updateAccessibility(); commitSetting(colorBlindSelect, "v8.accessibility.colorblind", { source: "settings", value: colorBlindSelect.value }); }, { signal: controller.signal });

  page.querySelector("[data-action='v8.ui.animations.reduced']")?.addEventListener("click", () => globalThis.setTimeout(updateAccessibility, 0), { signal: controller.signal });
  page.querySelector("[data-action='v8.accessibility.highcontrast']")?.addEventListener("click", () => globalThis.setTimeout(updateAccessibility, 0), { signal: controller.signal });

  const searchDebounce = debounce((q) => filterSettings(q), 120);
  searchInput.addEventListener("input", () => searchDebounce(searchInput.value), { signal: controller.signal });

  helpInput.addEventListener("input", () => filterHelp(helpInput.value), { signal: controller.signal });

  sectionIndex.addEventListener("click", (event) => {
    const link = event.target.closest("[data-section-index]");
    if (!link) return;
    event.preventDefault();
    const target = page.querySelector(`#v8-settings-${link.dataset.sectionIndex}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, { signal: controller.signal });

  page.addEventListener("click", (event) => {
    const button = event.target.closest("[data-low-data]");
    if (!button) return;
    const current = getLocalObject("ethone:low-data", { enabled: false });
    current.enabled = button.getAttribute("aria-checked") !== "true";
    button.setAttribute("aria-checked", String(current.enabled));
    setLocalObject("ethone:low-data", current);
    document.documentElement.dataset.v8LowData = current.enabled ? "true" : "false";
    options.actions?.dispatch?.("v8.appearance.lowdata.toggle", { source: "settings", enabled: current.enabled });
  }, { signal: controller.signal });

  page.querySelectorAll("[data-action^='v8.wallpaper.']").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    const id = event.currentTarget.dataset.wallpaperMode || event.currentTarget.dataset.action.split(".").pop();
    options.actions?.dispatch?.(event.currentTarget.dataset.action, { source: "settings", id });
    setLocalObject("ethone:wallpaper", { id });
    document.documentElement.dataset.v8Wallpaper = id;
    page.querySelectorAll("[data-wallpaper-mode]").forEach((b) => { const active = b.dataset.wallpaperMode === id; b.classList.toggle("is-active", active); b.setAttribute("aria-pressed", String(active)); });
  }, { signal: controller.signal }));

  workerDiagnosticButton.addEventListener("click", async () => {
    if (!externalServices?.diagnostic || workerDiagnosticRunning) return;
    workerDiagnosticRunning = true;
    workerDiagnosticButton.disabled = true;
    workerDiagnosticButton.setAttribute("aria-busy", "true");
    workerDiagnosticButton.querySelector("span").textContent = "Vérification";
    try { await externalServices.diagnostic(); } catch {}
    if (!controller.signal.aborted) { workerDiagnosticRunning = false; workerDiagnosticButton.disabled = false; workerDiagnosticButton.removeAttribute("aria-busy"); workerDiagnosticButton.querySelector("span").textContent = "Vérifier le Worker"; renderWorkerStatus(); }
  }, { signal: controller.signal });

  avatarFileInput.addEventListener("change", () => void handleProfileMediaChange("avatar", avatarFileInput, avatarMediaStatus), { signal: controller.signal });
  bannerFileInput.addEventListener("change", () => void handleProfileMediaChange("banner", bannerFileInput, bannerMediaStatus), { signal: controller.signal });
  nameSaveButton.addEventListener("click", saveProfileName, { signal: controller.signal });
  nameInput.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); saveProfileName(); } }, { signal: controller.signal });
  nameInput.addEventListener("input", () => { nameStatus.textContent = ""; }, { signal: controller.signal });
  customColorInput.addEventListener("input", (event) => { customColorSwatch.style.setProperty("--v8-accent-swatch-custom-color", event.currentTarget.value); }, { signal: controller.signal });
  customColorInput.addEventListener("change", (event) => commitSetting(event.currentTarget, "v8.accent.custom", { source: "settings", value: event.currentTarget.value, element: event.currentTarget, event }), { signal: controller.signal });

  function getAllLocal() {
    const data = {};
    try { for (let i = 0; i < globalThis.localStorage.length; i++) { const key = globalThis.localStorage.key(i); if (key) data[key] = globalThis.localStorage.getItem(key); } } catch {}
    return data;
  }

  configExportButton.addEventListener("click", () => {
    const config = { version: 1, timestamp: Date.now(), state: latestState, local: getAllLocal() };
    downloadJson(config, "ethone-config.json");
  }, { signal: controller.signal });

  page.querySelector("[data-settings-config-import-trigger]")?.addEventListener("click", () => { configImportInput.click(); }, { signal: controller.signal });

  configImportInput.addEventListener("change", async () => {
    const file = configImportInput.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const config = JSON.parse(text);
      if (!config || typeof config !== "object") throw new Error("Fichier invalide");
      if (!confirm("Cela remplacera vos réglages locaux par ceux du fichier. Continuer ?")) return;
      if (config.local && typeof config.local === "object") { Object.entries(config.local).forEach(([key, value]) => { try { globalThis.localStorage.setItem(key, value); } catch {} }); }
      if (config.state && typeof config.state === "object") { Object.entries(config.state).forEach(([key, value]) => { if (value !== undefined) latestState[key] = value; }); }
      alert("Configuration importée. ETHONE va se recharger.");
      globalThis.location.reload();
    } catch (err) { alert(`Import échoué : ${err.message}`); }
  }, { signal: controller.signal });

  resetPersonalizationButton.addEventListener("click", () => {
    if (!confirm("Réinitialiser toutes les préférences d'apparence et de comportement ?")) return;
    try {
      ["ethone:settings:favorites", "ethone:settings:recent", "ethone:settings:shortcuts", "ethone:settings:mail", "ethone:settings:accessibility", "ethone:low-data", "ethone:wallpaper", "v8_home_aura", "v8_font_family", "v8_radius_style"].forEach((key) => { try { globalThis.localStorage.removeItem(key); } catch {} });
      document.documentElement.removeAttribute("data-v8-wallpaper");
      document.documentElement.removeAttribute("data-v8-low-data");
      document.documentElement.removeAttribute("data-v8-font-size");
      document.documentElement.removeAttribute("data-v8-color-blind");
      document.documentElement.classList.remove("v8-reduced-motion", "v8-high-contrast");
    } catch {}
    options.notify?.({ id: "personalization-reset", title: "Personnalisation", message: "Préférences locales réinitialisées. Rechargez pour appliquer complètement.", type: "success" });
  }, { signal: controller.signal });

  page.querySelectorAll(".v8-card .v8-card__header").forEach((header) => {
    const card = header.closest(".v8-card");
    header.addEventListener("click", (event) => {
      if (event.target.closest("button, input, select, a")) return;
      const body = card.querySelector(".v8-card__body");
      if (!body) return;
      const collapsed = card.classList.toggle("is-collapsed");
      body.hidden = collapsed;
      card.dataset.collapsed = String(collapsed);
    });
  });

  refreshIcons();
  return () => {
    unsubscribeState();
    unsubscribeSounds();
    controller.abort();
    page.remove();
  };
}
