import { actionButton, element, icon, throttleFrame } from "../ui/dom.mjs";
import { statusState } from "../ui/empty-state.mjs";
import { prepareFormControls, setFieldState, setFormStatus } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { DEFAULT_SOUND_PREFERENCES, SOUND_PACKS } from "../services/sound-manager.mjs";
import { uploadProfileMedia, validateMediaFile } from "../services/media-upload.mjs";
import { createSelect } from "../ui/select.mjs";
import { DENSITY_CUSTOM_RANGES, DENSITY_PRESETS, densityCssVariables, resolveDensity, sanitizeDensitySettings } from "../core/density-engine.mjs";
import { resolveTheme, systemPrefersLight } from "../core/theme-engine.mjs";
import { BRAIN_MEMORY_CATEGORIES, BRAIN_PERMISSION_CATEGORIES, brainPreferenceLabel, sanitizeBrainPreferences } from "../brain/preferences.mjs";

const ACCENTS = Object.freeze(["mint", "sky", "amber", "violet", "rose"]);
const THEME_LABELS = Object.freeze({ night: "Nuit", graphite: "Graphite", day: "Jour", auto: "Automatique" });
const THEME_OPTIONS = Object.freeze([
  Object.freeze({ id: "night", label: "Nuit", icon: "moon-star", copy: "Sombre et profond, le mode par defaut.", swatch: Object.freeze({ canvas: "#080a0d", surface: "#171c22", text: "#f4f7fa" }) }),
  Object.freeze({ id: "graphite", label: "Graphite", icon: "circle", copy: "Sombre, un ton plus clair et neutre.", swatch: Object.freeze({ canvas: "#111317", surface: "#20252b", text: "#f4f7fa" }) }),
  Object.freeze({ id: "day", label: "Jour", icon: "sun", copy: "Clair, pour la lumière du jour.", swatch: Object.freeze({ canvas: "#f4f5f7", surface: "#ffffff", text: "#161a21" }) }),
  Object.freeze({ id: "auto", label: "Automatique", icon: "monitor", copy: "Suit les préférences de votre système.", swatch: null })
]);
const BRAIN_PERMISSION_LABELS = Object.freeze({ notes: "Notes", tasks: "Taches", calendar: "Calendrier", connections: "Connexions", gaming: "Gaming", activity: "Activité", files: "Fichiers", profile: "Profil", settings: "Réglages" });
const BRAIN_MEMORY_LABELS = Object.freeze({ interface: "Interface", habits: "Habitudes", widgets: "Widgets", schedules: "Plannings", "task-types": "Types de taches", spaces: "Spaces", flows: "Flows", "response-style": "Style de réponse", goals: "Objectifs" });
const SYNC_LABELS = Object.freeze({
  loading: "Connexion Supabase",
  saving: "Synchronisation",
  saved: "Synchronise",
  offline: "Hors ligne",
  retrying: "Nouvelle tentative",
  error: "Erreur",
  expired: "Session expiree",
  online: "Synchronise",
  syncing: "Synchronisation"
});
const DENSITY_LABELS = Object.freeze({ spacious: "Spacieuse", comfortable: "Confortable", compact: "Compacte", "ultra-compact": "Ultra compacte", automatic: "Automatique", custom: "Personnalisée" });
const DENSITY_OPTIONS = Object.freeze([
  Object.freeze({ id: "spacious", label: "Spacieuse", icon: "maximize-2", copy: "Lecture et cibles tactiles genereuses." }),
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
let settingRowSequence = 0;

function choice(actionId, iconName, label, active) {
  return actionButton({ actionId, className: `v8-setting-choice${active ? " is-active" : ""}` }, [icon(iconName), element("span", { text: label }), active ? icon("check") : null]);
}

function settingRow(iconName, title, description, control) {
  const rowId = `v8-setting-row-${++settingRowSequence}`;
  const titleId = `${rowId}-title`;
  const descriptionId = `${rowId}-description`;
  const controls = control.matches?.("input, textarea, select, button[role='switch']") ? [control] : [...control.querySelectorAll?.("input, textarea, select, button[role='switch']") || []];
  controls.forEach((entry) => {
    if (!entry.hasAttribute("aria-label") && !entry.hasAttribute("aria-labelledby")) entry.setAttribute("aria-labelledby", titleId);
    const describedBy = new Set(String(entry.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    describedBy.add(descriptionId);
    entry.setAttribute("aria-describedby", [...describedBy].join(" "));
  });
  return element("div", { className: "v8-setting-row", id: rowId }, [
    element("span", { className: "v8-setting-row__icon" }, [icon(iconName)]),
    element("div", { className: "v8-setting-row__copy" }, [element("strong", { id: titleId, text: title }), element("p", { id: descriptionId, text: description })]),
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
  const resolvedNote = option.id === "auto"
    ? element("small", { className: "v8-thème-choice__resolved", text: `-> ${THEME_LABELS[resolution?.effective || "night"]}`, attributes: { hidden: resolution?.requested !== "auto" } })
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

function downloadJson(payload, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
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
  const brainDetailSelect = preferenceSelect("détail", "Niveau de détail", ["brief", "balanced", "detailed"].map((value) => ({ value, label: brainPreferenceLabel("detailOption", value) })), brainPreferences.detail);
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
  const settingsSaveStatus = element("span", { className: "v8-badge", text: "Enregistre", attributes: { role: "status", "aria-live": "polite", "aria-atomic": "true" }, dataset: { formStatus: "" } });
  const brainMemoryList = element("div", { className: "v8-settings-memory-list" });
  const brainMemoryLoad = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { settingsMemoryLoad: "" } }, [icon("database"), element("span", { text: "Voir les memoires" })]);
  const accentControls = element("div", { className: "v8-accent-picker", attributes: { role: "group", "aria-label": "Couleur d'accent" } });
  ACCENTS.forEach((accent) => accentControls.append(element("button", {
    className: `v8-accent-swatch v8-accent-swatch--${accent}${state.accent === accent ? " is-active" : ""}`,
    attributes: { type: "button", "aria-label": `Accent ${accent}`, "aria-pressed": state.accent === accent ? "true" : "false" },
    dataset: { action: `v8.accent.${accent}` }
  }, [state.accent === accent ? icon("check") : null])));
  const customAccentInitial = /^#[0-9a-f]{6}$/i.test(state.customAccentColor || "") ? state.customAccentColor : "#7be5c3";
  const customColorInput = element("input", {
    className: "v8-accent-swatch__input",
    attributes: { type: "color", value: customAccentInitial, "aria-label": "Choisir une couleur d'accent personnalisée" }
  });
  const customColorSwatch = element("label", {
    className: `v8-accent-swatch v8-accent-swatch--custom${state.accent === "custom" ? " is-active" : ""}`,
    attributes: { "aria-label": "Accent personnalisé", "data-tooltip": "Couleur personnalisée" }
  }, [customColorInput, state.accent === "custom" ? icon("check") : null]);
  customColorSwatch.style.setProperty("--v8-accent-swatch-custom-color", customAccentInitial);
  accentControls.append(customColorSwatch);

  const currentAura = globalThis.localStorage?.getItem("v8_home_aura") || "classic";
  const auraChoices = element("div", { className: "v8-theme-options", attributes: { role: "group", "aria-label": "Ambiance lumineuse Aura" } }, AURA_OPTIONS.map((option) => {
    const active = currentAura === option.id;
    return element("button", {
      className: `v8-theme-choice${active ? " is-active" : ""}`,
      attributes: { type: "button", "aria-pressed": String(active) },
      dataset: { action: `v8.aura.${option.id}`, auraChoice: option.id }
    }, [
      icon(option.icon),
      element("span", {}, [element("strong", { text: option.label }), element("small", { text: option.copy })]),
      active ? icon("check") : null
    ]);
  }));

  const currentFont = globalThis.localStorage?.getItem("v8_font_family") || "inter";
  const fontChoices = element("div", { className: "v8-theme-options", attributes: { role: "group", "aria-label": "Typographie d'interface" } }, FONT_OPTIONS.map((option) => {
    const active = currentFont === option.id;
    return element("button", {
      className: `v8-theme-choice${active ? " is-active" : ""}`,
      attributes: { type: "button", "aria-pressed": String(active) },
      dataset: { action: `v8.font.${option.id}`, fontChoice: option.id }
    }, [
      icon(option.icon),
      element("span", {}, [element("strong", { text: option.label }), element("small", { text: option.copy })]),
      active ? icon("check") : null
    ]);
  }));

  const currentRadius = globalThis.localStorage?.getItem("v8_radius_style") || "rounded";
  const radiusChoices = element("div", { className: "v8-theme-options", attributes: { role: "group", "aria-label": "Style de courbure" } }, RADIUS_OPTIONS.map((option) => {
    const active = currentRadius === option.id;
    return element("button", {
      className: `v8-theme-choice${active ? " is-active" : ""}`,
      attributes: { type: "button", "aria-pressed": String(active) },
      dataset: { action: `v8.radius.${option.id}`, radiusChoice: option.id }
    }, [
      icon(option.icon),
      element("span", {}, [element("strong", { text: option.label }), element("small", { text: option.copy })]),
      active ? icon("check") : null
    ]);
  }));

  const soundPackSelect = createSelect({
    className: "v8-input v8-sound-pack-select",
    attributes: { "aria-label": "Pack sonore", disabled: !soundSupported || null, translate: "no" },
    dataset: { soundPack: "" }
  }, SOUND_PACKS.map((pack) => element("option", { text: pack.label, attributes: { value: pack.id } })));
  soundPackSelect.value = initialSoundPreferences.pack;
  const soundPackControl = element("div", { className: "v8-sound-pack-control" }, [
    element("div", {}, [soundPackSelect, actionButton({ actionId: "v8.sound.preview", className: "v8-icon-button", ariaLabel: "Ecouter un apercu", disabled: !soundSupported }, [icon("play")])]),
    element("small", { text: SOUND_PACKS.find((pack) => pack.id === initialSoundPreferences.pack)?.description || "Signature douce et lumineuse.", dataset: { soundPackDescription: "" } })
  ]);
  const workerStatusHost = element("div", { className: "v8-system-checks", attributes: { "aria-live": "polite" } });
  const workerError = element("p", { className: "v8-settings-diagnostic-note" });
  const workerDiagnosticButton = element("button", {
    className: "v8-button v8-button--secondary",
    attributes: { type: "button", disabled: !externalServices || null },
    dataset: { workerDiagnostic: "" }
  }, [icon("scan-search"), element("span", { text: externalServices ? "Vérifier le Worker" : "Worker indisponible" })]);

  const profile = options.profile || null;
  const canUploadMedia = Boolean(options.clientProvider && options.ownerId && profile?.id);
  const nameInput = element("input", { className: "v8-input", attributes: { type: "text", value: profile?.name || "", maxlength: "80", placeholder: "Nom du profil", "aria-label": "Nom du profil", disabled: !profile?.id || null } });
  const nameStatus = element("p", { className: "v8-settings-diagnostic-note", attributes: { "aria-live": "polite" } });
  const nameSaveButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button", disabled: !profile?.id || null } }, [icon("check"), element("span", { text: "Enregistrer" })]);
  const avatarPreviewHost = element("div", { className: "v8-profile-media-preview v8-profile-media-preview--avatar" }, [profileAvatarPreviewNode(profile?.avatar, (profile?.name || "E").slice(0, 1).toUpperCase())]);
  const bannerPreviewHost = element("div", { className: `v8-profile-media-preview v8-profile-media-preview--banner${profile?.banner ? "" : " is-empty"}` });
  if (profile?.banner) bannerPreviewHost.style.backgroundImage = `url("${profile.banner}")`;
  const avatarFileInput = element("input", { attributes: { type: "file", accept: "image/png,image/jpeg,image/webp", "aria-label": "Choisir une photo de profil", disabled: !canUploadMedia || null }, dataset: { profileMediaInput: "avatar" } });
  const bannerFileInput = element("input", { attributes: { type: "file", accept: "image/png,image/jpeg,image/webp", "aria-label": "Choisir une bannière", disabled: !canUploadMedia || null }, dataset: { profileMediaInput: "banner" } });
  const avatarMediaStatus = element("p", { className: "v8-settings-diagnostic-note", text: canUploadMedia ? "PNG, JPEG ou WebP, 5 Mo maximum." : "Disponible une fois connecté.", attributes: { "aria-live": "polite" } });
  const bannerMediaStatus = element("p", { className: "v8-settings-diagnostic-note", text: canUploadMedia ? "Format large recommande, 5 Mo maximum." : "Disponible une fois connecté.", attributes: { "aria-live": "polite" } });

  const page = element("section", { className: "v8-page v8-settings-page", dataset: { page: "settings" } }, [
    element("header", { className: "v8-page-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Système" }),
        element("h1", { text: "Réglages" }),
        element("p", { text: "Une seule source de verite pour l'apparence et le comportement d'ETHONE." })
      ]),
      element("div", { className: "v8-page-heading__actions" }, [settingsSaveStatus, actionButton({ actionId: "v8.profile.open", variant: "secondary" }, [icon("user-round"), element("span", { text: "Profil" })])])
    ]),
    element("div", { className: "v8-settings-layout" }, [
      element("aside", { className: "v8-settings-nav", attributes: { role: "tablist", "aria-orientation": "vertical", "aria-label": "Sections des réglages" } }, [
        element("button", { className: "is-active", text: "Profil", attributes: { type: "button", role: "tab", "aria-selected": "true", "aria-controls": "v8-settings-profile", tabindex: "0" }, dataset: { settingsSection: "v8-settings-profile" } }),
        element("button", { text: "Apparence", attributes: { type: "button", role: "tab", "aria-selected": "false", "aria-controls": "v8-settings-appearance", tabindex: "-1" }, dataset: { settingsSection: "v8-settings-appearance" } }),
        element("button", { text: "Brain", attributes: { type: "button", role: "tab", "aria-selected": "false", "aria-controls": "v8-settings-brain", tabindex: "-1" }, dataset: { settingsSection: "v8-settings-brain" } }),
        element("button", { text: "Sons", attributes: { type: "button", role: "tab", "aria-selected": "false", "aria-controls": "v8-settings-sounds", tabindex: "-1" }, dataset: { settingsSection: "v8-settings-sounds" } }),
        element("button", { text: "Workspace", attributes: { type: "button", role: "tab", "aria-selected": "false", "aria-controls": "v8-settings-workspace", tabindex: "-1" }, dataset: { settingsSection: "v8-settings-workspace" } }),
        element("button", { text: "Système", attributes: { type: "button", role: "tab", "aria-selected": "false", "aria-controls": "v8-settings-system", tabindex: "-1" }, dataset: { settingsSection: "v8-settings-system" } }),
        element("button", { text: "Developer", attributes: { type: "button", role: "tab", "aria-selected": "false", "aria-controls": "v8-settings-developer", tabindex: "-1" }, dataset: { settingsSection: "v8-settings-developer" } })
      ]),
      element("div", { className: "v8-settings-content" }, [
        element("section", { id: "v8-settings-profile", className: "v8-settings-section v8-surface", attributes: { role: "tabpanel", tabindex: "0" } }, [
          element("header", {}, [element("span", { className: "v8-eyebrow", text: "Identite" }), element("h2", { text: "Profil" }), element("p", { text: "Votre nom, votre photo et votre bannière, visibles dans tout ETHONE." })]),
          settingRow("user-round", "Nom du profil", "Affiche dans ETHONE et pour les autres profils de ce compte.", element("div", { className: "v8-profile-name-control" }, [nameInput, nameSaveButton, nameStatus])),
          element("div", { className: "v8-profile-media-row" }, [
            avatarPreviewHost,
            element("div", { className: "v8-profile-media-row__controls" }, [
              element("strong", { text: "Photo de profil" }),
              avatarFileInput,
              avatarMediaStatus
            ])
          ]),
          element("div", { className: "v8-profile-media-row" }, [
            bannerPreviewHost,
            element("div", { className: "v8-profile-media-row__controls" }, [
              element("strong", { text: "Bannière" }),
              bannerFileInput,
              bannerMediaStatus
            ])
          ])
        ]),
        element("section", { id: "v8-settings-appearance", className: "v8-settings-section v8-surface", attributes: { role: "tabpanel", tabindex: "0", hidden: true } }, [
          element("header", {}, [element("span", { className: "v8-eyebrow", text: "Design System" }), element("h2", { text: "Apparence" }), element("p", { text: "Des réglages sobres, coherents et persistants." })]),
          element("div", { className: "v8-density-settings" }, [
            element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("sun-moon")]), element("div", {}, [element("strong", { text: "Thème" }), element("p", { text: "Adapter les surfaces et le contraste." })]), themeResolved]),
            themeChoices
          ]),
          element("div", { className: "v8-density-settings" }, [
            element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("sparkles")]), element("div", {}, [element("strong", { text: "Ambiance Lumineuse (Aura)" }), element("p", { text: "Choisir l'atmosphère colorée et les réflexions vitrées du Dashboard." })])]),
            auraChoices
          ]),
          element("div", { className: "v8-density-settings" }, [
            element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("type")]), element("div", {}, [element("strong", { text: "Typographie d'interface" }), element("p", { text: "Personnaliser le caractère et la personnalité du texte." })])]),
            fontChoices
          ]),
          element("div", { className: "v8-density-settings" }, [
            element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("circle")]), element("div", {}, [element("strong", { text: "Courbure du Design" }), element("p", { text: "Ajuster l'échelle d'arrondi des cartes et boutons du système." })])]),
            radiusChoices
          ]),
          settingRow("palette", "Accent", "Identifier le Space et les actions importantes.", accentControls),
          element("div", { className: "v8-density-settings" }, [
            element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("rows-3")]), element("div", {}, [element("strong", { text: "Density Engine" }), element("p", { text: "Une densité coherente pour chaque page, panneau, widget et resolution." })]), densityResolved]),
            densityChoices,
            densityCustomHost,
            element("div", { className: "v8-density-adaptive" }, [
              element("label", {}, [element("span", {}, [element("strong", { text: "Focus Density" }), element("small", { text: "Compacter automatiquement le Space Focus." })]), switchControl("v8.density.focus", "Activer Focus Density", initialDensitySettings.focusDensity)]),
              element("label", {}, [element("span", {}, [element("strong", { text: "Presets par Space" }), element("small", { text: "Personnel confortable, Focus compact, Studio confortable." })]), switchControl("v8.density.spaces", "Activer les presets par Space", initialDensitySettings.adaptiveBySpace)])
            ]),
            densityPreviewHost
          ]),
          settingRow("sparkles", "Spotlight", "Reveler le Dashboard avec une transition breve au demarrage.", switchControl("v8.spotlight.toggle", "Animation Spotlight au demarrage", state.spotlightEnabled !== false)),
          settingRow("minimize-2", "Mode Zen", "Masquer les barres pour un focus maximal sur votre contenu (Alt+Z).", switchControl("v8.zen.toggle", "Activer le Mode Zen", state.zen === true)),
          settingRow("layout-bottom", "Taille du Dock", "Changer l'échelle de la barre de navigation inférieure.", element("div", { className: "v8-dock-scale-options", attributes: { role: "group", "aria-label": "Taille du Dock" } }, [
            choice("v8.dock.scale.compact", "minimize-2", "Compacte", state.dockScale === "compact"),
            choice("v8.dock.scale.normal", "layout-bottom", "Normale", !state.dockScale || state.dockScale === "normal"),
            choice("v8.dock.scale.large", "maximize-2", "Grande", state.dockScale === "large")
          ])),
          settingRow("languages", "Langue", "Changer rapidement la langue de l'interface.", actionButton({ actionId: "v8.locale.cycle", variant: "secondary" }, [icon("languages"), element("span", { text: "Langue suivante" })])),
          element("div", { className: "v8-density-settings" }, [
            element("div", { className: "v8-density-settings__heading" }, [element("span", { className: "v8-setting-row__icon" }, [icon("gauge")]), element("div", {}, [element("strong", { text: "Performance" }), element("p", { text: "Reduire les effets visuels pour gagner en fluidite sur les appareils moins puissants." })])]),
            settingRow("sparkle", "Effets d'ambiance", "Halos et particules animes en arriere-plan. Les desactiver allégé le rendu en continu.", switchControl("v8.motion.ambient.toggle", "Activer les effets d'ambiance", state.ambientEffectsEnabled !== false)),
            settingRow("blend", "Flou d'interface", "Effet de verre depoli sur le dock, les fenêtrès et menus. Le desactiver amélioré la fluidite du defilement.", switchControl("v8.motion.blur.toggle", "Activer le flou d'interface", state.interfaceBlurEnabled !== false))
          ])
        ]),
        element("section", { id: "v8-settings-brain", className: "v8-settings-section v8-surface", attributes: { role: "tabpanel", tabindex: "0", hidden: true } }, [
          element("header", {}, [element("span", { className: "v8-eyebrow", text: "Personal Brain" }), element("h2", { text: "Assistant, memoire et confidentialité" }), element("p", { text: "Un contexte minimal, des permissions explicites et aucune clé privée dans le navigateur." })]),
          settingRow("signature", "Identite", "Choisir le nom et le style de réponse.", element("div", { className: "v8-brain-settings-controls" }, [brainPreferenceSwitch("enabled", "Activer Brain", brainPreferences.enabled), brainNameInput, brainPersonaSelect, brainDetailSelect])),
          settingRow("message-square-more", "Comportement", "Ajuster le ton, la langue, les suggestions et le niveau d'automatisation.", element("div", { className: "v8-brain-settings-controls" }, [brainToneSelect, brainLanguageSelect, brainSuggestionSelect, brainAutomationSelect])),
          settingRow("sparkles", "Presence", "Brain reste discret et respecte le mode Focus.", element("div", { className: "v8-brain-settings-inline" }, [brainPreferenceSwitch("proactive", "Suggestions proactives", brainPreferences.proactive), brainPreferenceSwitch("notifications", "Notifications Brain", brainPreferences.notifications), brainPreferenceSwitch("sounds", "Sons Brain", brainPreferences.sounds), brainPreferenceSwitch("silentInFocus", "Silencieux en Focus", brainPreferences.silentInFocus)])),
          settingRow("cpu", "Provider", "Les providers cloud exigent le backend ETHONE sécurisé.", element("div", { className: "v8-brain-settings-controls" }, [brainProviderSelect, brainModelInput, brainFallbackSelect, brainPrivacySelect])),
          settingRow("database", "Memoire", "Préférences utiles uniquement, avec retention et RLS.", element("div", { className: "v8-brain-settings-inline" }, [brainPreferenceSwitch("memory.enabled", "Activer la memoire Brain", brainPreferences.memory.enabled), brainRetentionSelect, brainMemoryLoad])),
          settingRow("sunrise", "Briefing quotidien", "Événements, priorités et signaux utiles, en format concis.", element("div", { className: "v8-brain-settings-inline" }, [brainPreferenceSwitch("briefing.enabled", "Activer le briefing Brain", brainPreferences.briefing.enabled), brainPreferenceSwitch("briefing.concise", "Conserver un briefing concis", brainPreferences.briefing.concise)])),
          element("div", { className: "v8-brain-settings-block" }, [
            element("header", {}, [
              element("div", {}, [element("strong", { text: "Privacy Center" }), element("p", { text: "Chaque catégorie peut être desactivee independamment." })]),
              actionButton({ actionId: "v8.brain.open", variant: "secondary" }, [icon("brain"), element("span", { text: "Ouvrir Brain" })])
            ]),
            brainPermissionGrid
          ]),
          element("div", { className: "v8-brain-settings-block v8-brain-settings-memory" }, [
            element("header", {}, [
              element("div", {}, [element("strong", { text: "Memoire personnelle" }), brainMemoryStatus]),
              element("div", {}, [
                element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { settingsMemoryExport: "" } }, [icon("download"), element("span", { text: "Exporter" })]),
                element("button", { className: "v8-button v8-button--danger", attributes: { type: "button" }, dataset: { settingsMemoryClear: "" } }, [icon("trash-2"), element("span", { text: "Tout effacer" })])
              ])
            ]),
            brainMemoryCategoryGrid,
            brainMemoryList
          ])
        ]),
        element("section", { id: "v8-settings-sounds", className: "v8-settings-section v8-surface", attributes: { role: "tabpanel", tabindex: "0", hidden: true } }, [
          element("header", {}, [element("span", { className: "v8-eyebrow", text: "Audio system" }), element("h2", { text: "Sons" }), element("p", { text: "Des retours courts et discrets, toujours facultatifs." })]),
          settingRow("volume-2", "Retours sonores", soundSupported ? "Activer ou couper tout le système audio." : "Le son n'est pas disponible dans ce navigateur.", switchControl("v8.sound.toggle", "Activer les sons", initialSoundPreferences.enabled, !soundSupported)),
          settingRow("volume-x", "Mode silencieux", "Couper temporairement toutes les interactions sonores.", switchControl("v8.sound.silent", "Activer le mode silencieux", initialSoundPreferences.silent, !soundSupported)),
          settingRow("audio-waveform", "Audio spatial", spatialSupported ? "Orienter très legerement les sons selon leur origine." : "L'audio spatial n'est pas disponible dans ce navigateur.", switchControl("v8.sound.spatial", "Activer l'audio spatial", initialSoundPreferences.spatial, !spatialSupported)),
          settingRow("disc-3", "Pack sonore", "Choisir une identite sonore originale pour ETHONE.", soundPackControl),
          ...SOUND_VOLUME_ROWS.map((row) => settingRow(row.icon, row.title, row.description, soundRange(row.id, row.id === "master" ? initialSoundPreferences.master : initialSoundPreferences.volumes[row.id], !soundSupported)))
        ]),
        element("section", { id: "v8-settings-workspace", className: "v8-settings-section v8-surface", attributes: { role: "tabpanel", tabindex: "0", hidden: true } }, [
          element("header", {}, [element("span", { className: "v8-eyebrow", text: "Environnements" }), element("h2", { text: "Spaces" }), element("p", { text: "Chaque Space applique son Flow et son ambiance." })]),
          element("div", { className: "v8-settings-spaces" }, [
            choice("v8.space.personal", "user-round", "Personnel", state.space === "personal"),
            choice("v8.space.focus", "focus", "Focus", state.space === "focus"),
            choice("v8.space.studio", "sparkles", "Studio", state.space === "studio")
          ])
        ]),
        element("section", { id: "v8-settings-system", className: "v8-settings-section v8-surface", attributes: { role: "tabpanel", tabindex: "0", hidden: true } }, [
          element("header", {}, [element("span", { className: "v8-eyebrow", text: "État" }), element("h2", { text: "Système cloud" })]),
          element("div", { className: "v8-system-checks" }, [
            element("span", {}, [icon("shield-check"), element("strong", { text: "Données" }), element("b", { text: "RLS actif" })]),
            element("span", {}, [icon("cloud"), element("strong", { text: "Supabase" }), element("b", { text: SYNC_LABELS[state.syncStatus] || "Connexion" })]),
            element("span", {}, [icon("gauge"), element("strong", { text: "Interface" }), element("b", { text: DENSITY_LABELS[state.density] || "Confortable" })])
          ])
        ]),
        element("section", { id: "v8-settings-developer", className: "v8-settings-section v8-surface", attributes: { role: "tabpanel", tabindex: "0", hidden: true } }, [
          element("header", {}, [
            element("span", { className: "v8-eyebrow", text: "Inspector" }),
            element("h2", { text: "Services externes" }),
            element("p", { text: "Diagnostic explicite, sans surveillance ni requete en arriere-plan." }),
            workerDiagnosticButton
          ]),
          workerStatusHost,
          workerError
        ])
      ])
    ])
  ]);
  stage.replaceChildren(page);
  prepareFormControls(page);
  const navButtons = [...page.querySelectorAll(".v8-settings-nav button")];
  const controller = new AbortController();
  let workerDiagnosticRunning = false;

  function workerMetric(iconName, title, value) {
    return element("span", {}, [icon(iconName), element("strong", { text: title }), element("b", { text: value })]);
  }

  function renderWorkerStatus() {
    const snapshot = externalServices?.diagnostics?.() || {};
    const requests = Math.max(0, Number(snapshot.requests) || 0);
    const successes = Math.max(0, Number(snapshot.successes) || 0);
    const rate = requests ? `${Math.round((successes / requests) * 100)} %` : "Non mesuré";
    const services = Array.isArray(snapshot.services) ? snapshot.services : [];
    const available = services.filter((service) => service.available).map((service) => service.id);
    const remaining = Number.isFinite(Number(snapshot.rateLimit?.remaining)) ? String(snapshot.rateLimit.remaining) : "Non communique";
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
    const densitySettings = sanitizeDensitySettings(nextState.densitySettings);
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
        const note = button.querySelector(".v8-thème-choice__resolved");
        if (note) {
          note.hidden = nextThemeResolution.requested !== "auto";
          note.textContent = `-> ${THEME_LABELS[nextThemeResolution.effective]}`;
        }
      }
    });
    themeResolved.textContent = nextThemeResolution.requested === "auto" ? `${THEME_LABELS[nextThemeResolution.effective]} - systeme` : THEME_LABELS[nextThemeResolution.effective];

    const activeAura = globalThis.localStorage?.getItem("v8_home_aura") || "classic";
    auraChoices.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.action === `v8.aura.${activeAura}`;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      const check = button.querySelector("[data-lucide='check']");
      if (active && !check) button.append(icon("check"));
      if (!active) check?.remove();
    });

    const activeFont = globalThis.localStorage?.getItem("v8_font_family") || "inter";
    fontChoices.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.action === `v8.font.${activeFont}`;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      const check = button.querySelector("[data-lucide='check']");
      if (active && !check) button.append(icon("check"));
      if (!active) check?.remove();
    });

    const activeRadius = globalThis.localStorage?.getItem("v8_radius_style") || "rounded";
    radiusChoices.querySelectorAll("button").forEach((button) => {
      const active = button.dataset.action === `v8.radius.${activeRadius}`;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      const check = button.querySelector("[data-lucide='check']");
      if (active && !check) button.append(icon("check"));
      if (!active) check?.remove();
    });

    page.querySelector("[data-action='v8.density.focus']")?.setAttribute("aria-checked", String(densitySettings.focusDensity));
    page.querySelector("[data-action='v8.density.spaces']")?.setAttribute("aria-checked", String(densitySettings.adaptiveBySpace));
    const brainPrefs = sanitizeBrainPreferences(nextState.brainPreferences);
    page.querySelectorAll("[data-brain-preference]").forEach((control) => {
      const value = control.dataset.brainPreference.split(".").reduce((cursor, key) => cursor?.[key], brainPrefs);
      control.setAttribute("aria-checked", String(value === true));
      const stateIcon = control.closest("label")?.querySelector("[data-lucide]");
      if (stateIcon && control.dataset.brainPreference.startsWith("permissions.")) stateIcon.dataset.lucide = value === true ? "eye" : "eye-off";
      if (stateIcon && control.dataset.brainPreference.startsWith("memory.categories.")) stateIcon.dataset.lucide = value === true ? "bookmark-check" : "bookmark-x";
    });
    page.querySelectorAll("[data-brain-preference-select]").forEach((control) => {
      const value = control.dataset.brainPreferenceSelect.split(".").reduce((cursor, key) => cursor?.[key], brainPrefs);
      control.value = String(value);
    });
    page.querySelectorAll("[data-brain-preference-input]").forEach((control) => {
      const value = control.dataset.brainPreferenceInput.split(".").reduce((cursor, key) => cursor?.[key], brainPrefs);
      if (document.activeElement !== control) control.value = String(value ?? "");
    });
    updateDensityPreview(nextState);
    refreshIcons();
  }

  let memoryBusy = false;
  async function renderSettingsMemories() {
    if (memoryBusy || !options.brain?.memory) return;
    memoryBusy = true;
    brainMemoryLoad.disabled = true;
    brainMemoryStatus.textContent = "Chargement sécurisé depuis Supabase...";
    brainMemoryList.replaceChildren(statusState("loading", {
      title: "Chargement des memoires",
      description: "Lecture sécurisée depuis Supabase.",
      compact: true,
      inline: true
    }));
    refreshIcons();
    const response = await options.brain.memory.list();
    if (controller.signal.aborted) return;
    memoryBusy = false;
    brainMemoryLoad.disabled = false;
    brainMemoryStatus.textContent = response.ok ? `${response.data.length} memoire${response.data.length > 1 ? "s" : ""} active${response.data.length > 1 ? "s" : ""}.` : response.message;
    brainMemoryList.replaceChildren(...(response.ok && response.data.length ? response.data.map((entry) => element("div", { className: "v8-settings-memory-row" }, [element("span", {}, [icon("bookmark")]), element("div", {}, [element("small", { text: entry.category }), element("strong", { text: entry.key }), element("p", { text: entry.value })]), element("div", {}, [element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Modifier cette memoire" }, dataset: { settingsMemoryEdit: entry.id, settingsMemoryValue: entry.value } }, [icon("pencil")]), element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Supprimer cette memoire" }, dataset: { settingsMemoryDelete: entry.id } }, [icon("trash-2")])])])) : [statusState(response.ok ? "empty" : "error", {
      iconName: "database",
      eyebrow: "Memoire Brain",
      title: response.ok ? "Aucune memoire active" : "Memoires indisponibles",
      description: response.ok ? "Les préférences ajoutees volontairement apparaitront ici." : response.message,
      actions: response.ok ? [] : [element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: () => void renderSettingsMemories() } }, [icon("refresh-cw"), element("span", { text: "Réessayer" })])],
      compact: true,
      inline: true
    })]));
    refreshIcons();
  }

  renderWorkerStatus();
  updatePreferenceControls(state);
  const unsubscribeState = options.subscribeState?.((next) => updatePreferenceControls(next)) || (() => {});
  const unsubscribeSounds = sounds?.subscribe?.((preferences) => {
    const toggle = page.querySelector("[data-action='v8.sound.toggle']");
    toggle?.setAttribute("aria-checked", String(preferences.enabled));
    const silentToggle = page.querySelector("[data-action='v8.sound.silent']");
    silentToggle?.setAttribute("aria-checked", String(preferences.silent));
    const spatialToggle = page.querySelector("[data-action='v8.sound.spatial']");
    spatialToggle?.setAttribute("aria-checked", String(preferences.spatial));
    const pack = page.querySelector("[data-sound-pack]");
    if (pack) pack.value = preferences.pack;
    const description = page.querySelector("[data-sound-pack-description]");
    if (description) description.textContent = SOUND_PACKS.find((entry) => entry.id === preferences.pack)?.description || "";
    page.querySelectorAll("[data-sound-volume]").forEach((control) => {
      const category = control.dataset.soundVolume;
      const value = category === "master" ? preferences.master : preferences.volumes[category];
      const percent = Math.round(Number(value || 0) * 100);
      control.value = String(percent);
      control.style.setProperty("--v8-range-progress", `${percent}%`);
      const output = page.querySelector(`[data-sound-value="${category}"]`);
      if (output) output.textContent = `${percent} %`;
    });
  }) || (() => {});
  function commitSetting(control, actionId, context) {
    setFieldState(control, "loading", "Enregistrement...");
    setFormStatus(settingsSaveStatus, "loading", "Enregistrement...");
    const settle = (result) => {
      if (result?.ok === false) {
        setFieldState(control, "invalid", result.message);
        setFormStatus(settingsSaveStatus, "error", result.message || "Erreur de sauvegarde");
      } else {
        setFieldState(control, "valid", "Enregistre");
        setFormStatus(settingsSaveStatus, "saved", result?.message || "Enregistre");
      }
      return result;
    };
    const result = options.actions?.dispatch?.(actionId, context);
    return result?.then ? result.then(settle) : settle(result);
  }
  function activateSection(button, focus = false) {
    if (!button) return;
    navButtons.forEach((entry) => {
      const active = entry === button;
      entry.classList.toggle("is-active", active);
      entry.setAttribute("aria-selected", String(active));
      entry.tabIndex = active ? 0 : -1;
      if (active && focus) entry.focus();
    });
    page.querySelectorAll(".v8-settings-section").forEach((panel) => { panel.hidden = panel.id !== button.dataset.settingsSection; });
  }
  function handleSectionNavigation(event) {
    const button = event.target.closest("[data-settings-section]");
    if (!button || !page.contains(button)) return;
    activateSection(button);
  }
  function handleSectionKeydown(event) {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = navButtons.findIndex((entry) => entry.classList.contains("is-active"));
    const next = event.key === "Home" ? 0 : event.key === "End" ? navButtons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + navButtons.length) % navButtons.length;
    activateSection(navButtons[next], true);
  }
  page.querySelector(".v8-settings-nav")?.addEventListener("click", handleSectionNavigation, { signal: controller.signal });
  page.querySelector(".v8-settings-nav")?.addEventListener("keydown", handleSectionKeydown, { signal: controller.signal });
  workerDiagnosticButton.addEventListener("click", async () => {
    if (!externalServices?.diagnostic || workerDiagnosticRunning) return;
    workerDiagnosticRunning = true;
    workerDiagnosticButton.disabled = true;
    workerDiagnosticButton.setAttribute("aria-busy", "true");
    workerDiagnosticButton.querySelector("span").textContent = "Vérification";
    try {
      await externalServices.diagnostic();
    } catch {}
    if (!controller.signal.aborted) {
      workerDiagnosticRunning = false;
      workerDiagnosticButton.disabled = false;
      workerDiagnosticButton.removeAttribute("aria-busy");
      workerDiagnosticButton.querySelector("span").textContent = "Vérifier le Worker";
      renderWorkerStatus();
    }
  }, { signal: controller.signal });
  async function handleProfileMediaChange(kind, input, statusEl) {
    const file = input.files?.[0] || null;
    if (!file) return;
    const validation = validateMediaFile(file);
    if (!validation.ok) {
      statusEl.textContent = validation.message;
      input.value = "";
      return;
    }
    statusEl.textContent = "Envoi en cours...";
    input.disabled = true;
    try {
      const client = await options.clientProvider?.();
      const upload = await uploadProfileMedia({ file, kind, ownerId: options.ownerId, client });
      if (!upload.ok) {
        statusEl.textContent = upload.message;
        options.notify?.({ id: `profile-media-${kind}-error`, title: "Televersement impossible", message: upload.message, type: "error" });
        return;
      }
      const patch = kind === "banner" ? { bannerImg: upload.data.url } : { avatarImg: upload.data.url };
      const patched = options.repository?.updateProfile?.(profile?.id, patch);
      if (!patched?.ok) {
        statusEl.textContent = patched?.message || "Enregistrement impossible.";
        return;
      }
      if (kind === "banner") {
        bannerPreviewHost.style.backgroundImage = `url("${upload.data.url}")`;
        bannerPreviewHost.classList.remove("is-empty");
      } else {
        avatarPreviewHost.replaceChildren(profileAvatarPreviewNode({ kind: "image", value: upload.data.url }, "E"));
        options.onProfileMediaUpdated?.("avatar", upload.data.url);
      }
      statusEl.textContent = kind === "banner" ? "Bannière mise a jour." : "Photo mise a jour.";
    } finally {
      input.disabled = false;
      input.value = "";
    }
  }
  avatarFileInput.addEventListener("change", () => void handleProfileMediaChange("avatar", avatarFileInput, avatarMediaStatus), { signal: controller.signal });
  bannerFileInput.addEventListener("change", () => void handleProfileMediaChange("banner", bannerFileInput, bannerMediaStatus), { signal: controller.signal });
  function saveProfileName() {
    const nextName = nameInput.value.trim();
    if (!profile?.id) return;
    if (!nextName) {
      nameStatus.textContent = "Le nom ne peut pas être vide.";
      return;
    }
    const patched = options.repository?.updateProfile?.(profile.id, { name: nextName });
    if (!patched?.ok) {
      nameStatus.textContent = patched?.message || "Enregistrement impossible.";
      return;
    }
    nameInput.value = nextName;
    nameStatus.textContent = "Nom mis a jour.";
    options.onProfileMediaUpdated?.("name", nextName);
  }
  nameSaveButton.addEventListener("click", saveProfileName, { signal: controller.signal });
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") { event.preventDefault(); saveProfileName(); }
  }, { signal: controller.signal });
  nameInput.addEventListener("input", () => { nameStatus.textContent = ""; }, { signal: controller.signal });
  customColorInput.addEventListener("input", (event) => {
    customColorSwatch.style.setProperty("--v8-accent-swatch-custom-color", event.currentTarget.value);
  }, { signal: controller.signal });
  customColorInput.addEventListener("change", (event) => {
    commitSetting(event.currentTarget, "v8.accent.custom", { source: "settings", value: event.currentTarget.value, element: event.currentTarget, event });
  }, { signal: controller.signal });
  page.querySelector("[data-sound-pack]")?.addEventListener("change", (event) => {
    commitSetting(event.currentTarget, `v8.sound.pack.${event.currentTarget.value}`, { source: "settings", element: event.currentTarget, event });
  }, { signal: controller.signal });
  auraChoices.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => {
    auraChoices.querySelectorAll("button").forEach((b) => {
      b.classList.remove("is-active");
      b.setAttribute("aria-pressed", "false");
      const checkIcon = b.querySelector(".lucide-check");
      if (checkIcon) checkIcon.remove();
    });
    btn.classList.add("is-active");
    btn.setAttribute("aria-pressed", "true");
    btn.append(icon("check"));
    options.actions?.dispatch?.(btn.dataset.action, { source: "settings" });
  }, { signal: controller.signal }));

  fontChoices.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => {
    fontChoices.querySelectorAll("button").forEach((b) => {
      b.classList.remove("is-active");
      b.setAttribute("aria-pressed", "false");
      const checkIcon = b.querySelector(".lucide-check");
      if (checkIcon) checkIcon.remove();
    });
    btn.classList.add("is-active");
    btn.setAttribute("aria-pressed", "true");
    btn.append(icon("check"));
    options.actions?.dispatch?.(btn.dataset.action, { source: "settings" });
  }, { signal: controller.signal }));

  radiusChoices.querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => {
    radiusChoices.querySelectorAll("button").forEach((b) => {
      b.classList.remove("is-active");
      b.setAttribute("aria-pressed", "false");
      const checkIcon = b.querySelector(".lucide-check");
      if (checkIcon) checkIcon.remove();
    });
    btn.classList.add("is-active");
    btn.setAttribute("aria-pressed", "true");
    btn.append(icon("check"));
    options.actions?.dispatch?.(btn.dataset.action, { source: "settings" });
  }, { signal: controller.signal }));
  const dispatchVolume = throttleFrame((category, value, element, event) => {
    options.actions?.dispatch?.("v8.sound.volume", { source: "settings", category, value, element, event });
  });
  page.querySelectorAll("[data-sound-volume]").forEach((control) => control.addEventListener("input", (event) => {
    const category = event.currentTarget.dataset.soundVolume;
    const value = Number(event.currentTarget.value) / 100;
    const output = page.querySelector(`[data-sound-value="${category}"]`);
    if (output) output.textContent = `${Math.round(value * 100)} %`;
    event.currentTarget.style.setProperty("--v8-range-progress", `${Math.round(value * 100)}%`);
    dispatchVolume(category, value, event.currentTarget, event);
  }, { signal: controller.signal }));
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
  page.querySelector("[data-settings-memory-export]")?.addEventListener("click", async () => {
    const response = await options.brain?.memory?.exportAll?.();
    if (response?.ok) downloadJson(response.data, "ethone-brain-memory.json");
    else brainMemoryStatus.textContent = response?.message || "Export indisponible.";
  }, { signal: controller.signal });
  page.querySelector("[data-settings-memory-clear]")?.addEventListener("click", async () => {
    if (!confirm("Supprimer definitivement toutes les memoires Brain ?")) return;
    const response = await options.brain?.memory?.clear?.({ confirmed: true });
    brainMemoryStatus.textContent = response?.message || "Suppression indisponible.";
    if (response?.ok) await renderSettingsMemories();
  }, { signal: controller.signal });
  refreshIcons();
  return () => {
    unsubscribeState();
    unsubscribeSounds();
    controller.abort();
    page.remove();
  };
}
