import { actionButton, element, icon } from "../ui/dom.mjs";
import { statusState } from "../ui/empty-state.mjs";
import { prepareFormControls, setFieldState, setFormStatus } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { DEFAULT_SOUND_PREFERENCES, SOUND_PACKS } from "../services/sound-manager.mjs";
import { DENSITY_CUSTOM_RANGES, densityCssVariables, resolveDensity, sanitizeDensitySettings } from "../core/density-engine.mjs";
import { BRAIN_MEMORY_CATEGORIES, BRAIN_PERMISSION_CATEGORIES, brainPreferenceLabel, sanitizeBrainPreferences } from "../brain/preferences.mjs";

const ACCENTS = Object.freeze(["mint", "sky", "amber", "violet", "rose"]);
const BRAIN_PERMISSION_LABELS = Object.freeze({ notes: "Notes", tasks: "Taches", calendar: "Calendrier", connections: "Connexions", gaming: "Gaming", activity: "Activite", files: "Fichiers", profile: "Profil", settings: "Reglages" });
const BRAIN_MEMORY_LABELS = Object.freeze({ interface: "Interface", habits: "Habitudes", widgets: "Widgets", schedules: "Plannings", "task-types": "Types de taches", spaces: "Spaces", flows: "Flows", "response-style": "Style de reponse", goals: "Objectifs" });
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
const DENSITY_LABELS = Object.freeze({ spacious: "Spacieuse", comfortable: "Confortable", compact: "Compacte", "ultra-compact": "Ultra compacte", automatic: "Automatique", custom: "Personnalisee" });
const DENSITY_OPTIONS = Object.freeze([
  Object.freeze({ id: "spacious", label: "Spacieuse", icon: "maximize-2", copy: "Lecture et cibles tactiles genereuses." }),
  Object.freeze({ id: "comfortable", label: "Confortable", icon: "panel-top", copy: "Equilibre par defaut pour le quotidien." }),
  Object.freeze({ id: "compact", label: "Compacte", icon: "rows-3", copy: "Davantage d'information sans sacrifier la lecture." }),
  Object.freeze({ id: "ultra-compact", label: "Ultra compacte", icon: "list-collapse", copy: "Densite maximale avec focus et cibles conserves." }),
  Object.freeze({ id: "automatic", label: "Automatique", icon: "wand-sparkles", copy: "S'adapte a l'ecran, au zoom et au contexte." }),
  Object.freeze({ id: "custom", label: "Personnalisee", icon: "sliders-horizontal", copy: "Reglez chaque dimension de l'interface." })
]);
const CUSTOM_DENSITY_LABELS = Object.freeze({ fontScale: "Taille du texte", lineHeight: "Interligne", cardPadding: "Padding des cartes", sectionGap: "Espacement des blocs", controlHeight: "Hauteur des boutons", panelWidth: "Largeur des panneaux", iconSize: "Taille des icones", rowHeight: "Densite des listes", tableRowHeight: "Densite des tableaux", widgetScale: "Taille des widgets", toolbarHeight: "Hauteur des toolbars" });
const SOUND_VOLUME_ROWS = Object.freeze([
  Object.freeze({ id: "master", icon: "volume-2", title: "Volume general", description: "Limiter le niveau de tout ETHONE." }),
  Object.freeze({ id: "notifications", icon: "bell-ring", title: "Notifications", description: "Informations, succes, alertes et mises a jour." }),
  Object.freeze({ id: "interface", icon: "mouse-pointer-2", title: "Interface", description: "Fenetres, commandes et interactions importantes." }),
  Object.freeze({ id: "brain", icon: "brain", title: "Brain", description: "Reflexion, reponse et fin de traitement." }),
  Object.freeze({ id: "system", icon: "audio-lines", title: "Systeme", description: "Connexion, sauvegarde, synchronisation et Spaces." })
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
  const label = category === "master" ? "Volume general" : `Volume ${category}`;
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

function densityModeChoice(option, active) {
  return element("button", {
    className: `v8-density-choice${active ? " is-active" : ""}`,
    attributes: { type: "button", "aria-pressed": String(active) },
    dataset: { action: `v8.density.${option.id}`, densityMode: option.id }
  }, [element("span", { className: "v8-density-choice__icon" }, [icon(option.icon)]), element("span", {}, [element("strong", { text: option.label }), element("small", { text: option.copy })]), active ? icon("check") : null]);
}

function densityCustomControl(key, value) {
  const range = DENSITY_CUSTOM_RANGES[key];
  const input = element("input", { className: "v8-range", attributes: { type: "range", min: String(range.min), max: String(range.max), step: String(range.step), value: String(value), "aria-label": CUSTOM_DENSITY_LABELS[key] }, dataset: { densityCustom: key } });
  const progress = ((Number(value) - range.min) / (range.max - range.min)) * 100;
  input.style.setProperty("--v8-range-progress", `${progress}%`);
  return element("label", { className: "v8-density-custom-row" }, [element("span", {}, [element("strong", { text: CUSTOM_DENSITY_LABELS[key] }), element("output", { text: `${value}${range.unit}`, dataset: { densityOutput: key } })]), input]);
}

function densityPreview() {
  return element("div", { className: "v8-density-preview", attributes: { "aria-label": "Apercu interactif de la densite" } }, [
    element("aside", { className: "v8-density-preview__rail" }, [icon("circle-dot"), icon("house"), icon("notebook-pen"), icon("settings-2")]),
    element("div", { className: "v8-density-preview__workspace" }, [
      element("header", {}, [element("span", {}, [icon("panel-top"), element("strong", { text: "Apercu" })]), element("span", { className: "v8-density-preview__demo-control", attributes: { "aria-hidden": "true" } }, [icon("search")])]),
      element("article", { className: "v8-density-preview__card" }, [element("small", { text: "Dashboard" }), element("strong", { text: "Votre espace en un regard" }), element("p", { text: "Cartes, listes et commandes utilisent les memes tokens." }), element("span", { className: "v8-density-preview__demo-control", attributes: { "aria-hidden": "true" } }, [icon("sparkles"), element("span", { text: "Action" })])]),
      element("div", { className: "v8-density-preview__list" }, ["Priorite principale", "Briefing Brain", "Synchronisation Supabase"].map((label, index) => element("span", {}, [icon(index === 0 ? "circle-check-big" : index === 1 ? "brain" : "cloud"), element("b", { text: label })])))
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
  const select = element("select", { className: "v8-input", attributes: { "aria-label": label }, dataset: { brainPreferenceSelect: path } }, values.map((entry) => element("option", { text: entry.label, attributes: { value: entry.value } })));
  select.value = current;
  return select;
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
  const densityChoices = element("div", { className: "v8-density-options", attributes: { role: "group", "aria-label": "Mode de densite" } }, DENSITY_OPTIONS.map((option) => densityModeChoice(option, state.density === option.id)));
  const densityCustomHost = element("div", { className: "v8-density-custom", attributes: { hidden: state.density !== "custom" } }, Object.keys(DENSITY_CUSTOM_RANGES).map((key) => densityCustomControl(key, initialDensitySettings.custom[key])));
  const densityResolved = element("span", { className: "v8-density-resolved", attributes: { "aria-live": "polite" } });
  const brainPreferences = sanitizeBrainPreferences(state.brainPreferences);
  const brainNameInput = element("input", { className: "v8-input", attributes: { type: "text", maxlength: "32", value: brainPreferences.assistantName, "aria-label": "Nom de l'assistant" }, dataset: { brainPreferenceInput: "assistantName" } });
  const brainPersonaSelect = preferenceSelect("persona", "Personnalite Brain", ["concise", "balanced", "expert", "coach", "creative", "developer", "custom"].map((value) => ({ value, label: brainPreferenceLabel("persona", value) })), brainPreferences.persona);
  const brainDetailSelect = preferenceSelect("detail", "Niveau de detail", ["brief", "balanced", "detailed"].map((value) => ({ value, label: brainPreferenceLabel("detailOption", value) })), brainPreferences.detail);
  const brainToneSelect = preferenceSelect("tone", "Ton de Brain", [{ value: "calm", label: "Calme" }, { value: "direct", label: "Direct" }, { value: "warm", label: "Chaleureux" }, { value: "technical", label: "Technique" }, { value: "creative", label: "Creatif" }], brainPreferences.tone);
  const brainLanguageSelect = preferenceSelect("language", "Langue de reponse", [{ value: "auto", label: "Langue de l'interface" }, { value: "fr", label: "Francais" }, { value: "en", label: "English" }, { value: "es", label: "Espanol" }, { value: "de", label: "Deutsch" }], brainPreferences.language);
  const brainSuggestionSelect = preferenceSelect("suggestionFrequency", "Frequence des suggestions", [{ value: "off", label: "Desactivees" }, { value: "low", label: "Faible" }, { value: "balanced", label: "Equilibree" }, { value: "high", label: "Elevee" }], brainPreferences.suggestionFrequency);
  const brainAutomationSelect = preferenceSelect("automationLevel", "Niveau d'automatisation", ["manual", "suggest-only", "confirm", "trusted"].map((value) => ({ value, label: brainPreferenceLabel("automationOption", value) })), brainPreferences.automationLevel);
  const brainProviderSelect = preferenceSelect("provider.active", "Provider Brain", [
    { value: "context", label: "ETHONE Context" }, { value: "openai", label: "OpenAI via backend" }, { value: "anthropic", label: "Anthropic via backend" }, { value: "groq", label: "Groq via backend" }, { value: "gemini", label: "Gemini via backend" }, { value: "ollama", label: "Ollama via pont local" }, { value: "lm-studio", label: "LM Studio via pont local" }
  ], brainPreferences.provider.active);
  const brainRetentionSelect = preferenceSelect("memory.retentionDays", "Retention de la memoire", [{ value: "30", label: "30 jours" }, { value: "90", label: "90 jours" }, { value: "365", label: "1 an" }], String(brainPreferences.memory.retentionDays));
  const brainModelInput = element("input", { className: "v8-input", attributes: { type: "text", maxlength: "80", value: brainPreferences.provider.model, "aria-label": "Modele Brain" }, dataset: { brainPreferenceInput: "provider.model" } });
  const brainFallbackSelect = preferenceSelect("provider.fallback", "Provider de secours", [{ value: "context", label: "ETHONE Context" }, { value: "openai", label: "OpenAI" }, { value: "anthropic", label: "Anthropic" }, { value: "groq", label: "Groq" }, { value: "gemini", label: "Gemini" }, { value: "ollama", label: "Ollama" }, { value: "lm-studio", label: "LM Studio" }], brainPreferences.provider.fallback);
  const brainPrivacySelect = preferenceSelect("provider.privacy", "Niveau de confidentialite", [{ value: "minimal", label: "Contexte minimal" }, { value: "full-context", label: "Contexte autorise complet" }], brainPreferences.provider.privacy);
  const brainPermissionGrid = element("div", { className: "v8-brain-settings-permissions" }, BRAIN_PERMISSION_CATEGORIES.map((permission) => {
    const label = BRAIN_PERMISSION_LABELS[permission] || permission;
    return element("label", {}, [element("span", {}, [icon(brainPreç­9¶‰žËkºwµç@€€É•™É•Í¡%½¹Ì ¤ì(€ô((€™Õ¹Ñ¥½¸ÁÉ•Ù¥•ÝI•Í½±ÕÑ¥½¸¡¹•áÑMÑ…Ñ”€ô±…Ñ•ÍÑMÑ…Ñ”°ÕÍÑ½µ=Ù•ÉÉ¥‘”€ô¹Õ±°¤ì(€€€½¹ÍÐÍ•ÑÑ¥¹Ì€ôÍ…¹¥Ñ¥é••¹Í¥ÑåM•ÑÑ¥¹Ì¡¹•áÑMÑ…Ñ”¹‘•¹Í¥ÑåM•ÑÑ¥¹Ì¤ì(€€€¥˜€¡ÕÍÑ½µ=Ù•ÉÉ¥‘”¤É•ÑÕÉ¸ìÉ•ÅÕ•ÍÑ•è€‰ÕÍÑ½´ˆ°•™™•Ñ¥Ù”è€‰ÕÍÑ½´ˆ°É•…Í½¸è€‰ÁÉ•Ù¥•Üˆ°Ù…±Õ•ÌèÕÍÑ½µ=Ù•ÉÉ¥‘”ôì(€€€½¹ÍÐÕÉÉ•¹Ð€ô½ÁÑ¥½¹Ì¹‘•¹Í¥Ñå¹¥¹”ü¹É•Í½±ÕÑ¥½¸ü¸ ¤ì(€€€¥˜€¡ÕÉÉ•¹Ðü¹É•ÅÕ•ÍÑ•€ôôô¹•áÑMÑ…Ñ”¹‘•¹Í¥Ñä¤É•ÑÕÉ¸ÕÉÉ•¹Ðì(€€€É•ÑÕÉ¸É•Í½±Ù••¹Í¥Ñä¡¹•áÑMÑ…Ñ”°ìÝ¥‘Ñ è±½‰…±Q¡¥Ì¹¥¹¹•É]¥‘Ñ ñð€ÄÈàÀ°¡•¥¡Ðè±½‰…±Q¡¥Ì¹¥¹¹•É!•¥¡Ðñð€àÀÀ°é½½´è±½‰…±Q¡¥Ì¹Ù¥ÍÕ…±Y¥•ÝÁ½ÉÐü¹Í…±”ñð€Ä°½…ÉÍ•A½¥¹Ñ•Èè™…±Í”°Á…¹•±=Á•¸è™…±Í”°É…¥±áÁ…¹‘•è¹•áÑMÑ…Ñ”¹É…¥±áÁ…¹‘•ô¤ì(€ô((€™Õ¹Ñ¥½¸ÕÁ‘…Ñ••¹Í¥ÑåAÉ•Ù¥•Ü¡¹•áÑMÑ…Ñ”€ô±…Ñ•ÍÑMÑ…Ñ”°ÕÍÑ½µ=Ù•ÉÉ¥‘”€ô¹Õ±°¤ì(€€€½¹ÍÐÉ•Í½±ÕÑ¥½¸€ôÁÉ•Ù¥•ÝI•Í½±ÕÑ¥½¸¡¹•áÑMÑ…Ñ”°ÕÍÑ½µ=Ù•ÉÉ¥‘”¤ì(€€€=‰©•Ð¹•¹ÑÉ¥•Ì¡‘•¹Í¥ÑåÍÍY…É¥…‰±•Ì¡É•Í½±ÕÑ¥½¸¹Ù…±Õ•Ì¤¤¹™½É…  ¡m¹…µ”°Ù…±Õ•t¤€ôø‘•¹Í¥ÑåAÉ•Ù¥•Ý!½ÍÐ¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä¡¹…µ”°Ù…±Õ”¤¤ì(€€€‘•¹Í¥ÑåAÉ•Ù¥•Ý!½ÍÐ¹‘…Ñ…Í•Ð¹ÁÉ•Ù¥•Ý•¹Í¥Ñä€ôÉ•Í½±ÕÑ¥½¸¹•™™•Ñ¥Ù”ì(€€€‘•¹Í¥ÑåI•Í½±Ù•¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•Í½±ÕÑ¥½¸¹É•ÅÕ•ÍÑ•€ôôô€‰…ÕÑ½µ…Ñ¥Œˆ€ü€‘í9M%Qe}1	1MmÉ•Í½±ÕÑ¥½¸¹•™™•Ñ¥Ù•uô€´€‘íÉ•Í½±ÕÑ¥½¸¹É•…Í½¹õ€€è9M%Qe}1	1MmÉ•Í½±ÕÑ¥½¸¹•™™•Ñ¥Ù•tñð€‰½¹™½ÉÑ…‰±”ˆì(€ô((€™Õ¹Ñ¥½¸ÕÁ‘…Ñ•AÉ•™•É•¹•½¹ÑÉ½±Ì¡¹•áÑMÑ…Ñ”¤ì(€€€±…Ñ•ÍÑMÑ…Ñ”€ô¹•áÑMÑ…Ñ”ì(€€€½¹ÍÐÍ…Ù•MÑ…Ñ”€ô¹•áÑMÑ…Ñ”¹Í…Ù•MÑ…ÑÕÌñð€¡¹•áÑMÑ…Ñ”¹¹•ÑÝ½É­MÑ…ÑÕÌ€ôôô€‰½™™±¥¹”ˆ€ü€‰½™™±¥¹”ˆ€è€‰Í…Ù•ˆ¤ì(€€€¥˜€¡Í…Ù•MÑ…Ñ”€ôôô€‰Í…Ù¥¹œˆñðÍ…Ù•MÑ…Ñ”€ôôô€‰Íå¹¥¹œˆ¤Í•Ñ½ÉµMÑ…ÑÕÌ¡Í•ÑÑ¥¹ÍM…Ù•MÑ…ÑÕÌ°€‰±½…‘¥¹œˆ°€‰¹É•¥ÍÑÉ•µ•¹Ð¸¸¸ˆ¤ì(€€€•±Í”¥˜€¡Í…Ù•MÑ…Ñ”€ôôô€‰•ÉÉ½Èˆ¤Í•Ñ½ÉµMÑ…ÑÕÌ¡Í•ÑÑ¥¹ÍM…Ù•MÑ…ÑÕÌ°€‰•ÉÉ½Èˆ°€‰ÉÉ•ÕÈ‘”Í…ÕÙ•…É‘”ˆ¤ì(€€€•±Í”¥˜€¡Í…Ù•MÑ…Ñ”€ôôô€‰½™™±¥¹”ˆ¤Í•Ñ½ÉµMÑ…ÑÕÌ¡Í•ÑÑ¥¹ÍM…Ù•MÑ…ÑÕÌ°€‰•ÉÉ½Èˆ°€‰!½ÉÌ±¥¹”€´•¸…ÑÑ•¹Ñ”ˆ¤ì(€€€•±Í”Í•Ñ½ÉµMÑ…ÑÕÌ¡Í•ÑÑ¥¹ÍM…Ù•MÑ…ÑÕÌ°€‰Í…Ù•ˆ°€‰¹É•¥ÍÑÉ”ˆ¤ì(€€€½¹ÍÐ‘•¹Í¥ÑåM•ÑÑ¥¹Ì€ôÍ…¹¥Ñ¥é••¹Í¥ÑåM•ÑÑ¥¹Ì¡¹•áÑMÑ…Ñ”¹‘•¹Í¥ÑåM•ÑÑ¥¹Ì¤ì(€€€Á…”¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ‘•¹Í¥Ñäµµ½‘•tˆ¤¹™½É…  ¡‰ÕÑÑ½¸¤€ôøì(€€€€€½¹ÍÐ…Ñ¥Ù”€ô‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹‘•¹Í¥Ñå5½‘”€ôôô¹•áÑMÑ…Ñ”¹‘•¹Í¥Ñäì(€€€€€‰ÕÑÑ½¸¹±…ÍÍ1¥ÍÐ¹Ñ½±” ‰¥Ìµ…Ñ¥Ù”ˆ°…Ñ¥Ù”¤ì(€€€€€‰ÕÑÑ½¸¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µÁÉ•ÍÍ•ˆ°MÑÉ¥¹œ¡…Ñ¥Ù”¤¤ì(€€€€€½¹ÍÐ¡•¬€ô‰ÕÑÑ½¸¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ±Õ¥‘”ô¡•¬tˆ¤ì(€€€€€¥˜€¡…Ñ¥Ù”€˜˜€…¡•¬¤‰ÕÑÑ½¸¹…ÁÁ•¹¡¥½¸ ‰¡•¬ˆ¤¤ì(€€€€€¥˜€ ……Ñ¥Ù”¤¡•¬ü¹É•µ½Ù” ¤ì(€€€ô¤ì(€€€‘•¹Í¥ÑåÕÍÑ½µ!½ÍÐ¹¡¥‘‘•¸€ô¹•áÑMÑ…Ñ”¹‘•¹Í¥Ñä€„ôô€‰ÕÍÑ½´ˆì(€€€Á…”¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸ôØà¹‘•¹Í¥Ñä¹™½ÕÌtˆ¤ü¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ¡•­•ˆ°MÑÉ¥¹œ¡‘•¹Í¥ÑåM•ÑÑ¥¹Ì¹™½ÕÍ•¹Í¥Ñä¤¤ì(€€€Á…”¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸ôØà¹‘•¹Í¥Ñä¹ÍÁ…•Ìtˆ¤ü¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ¡•­•ˆ°MÑÉ¥¹œ¡‘•¹Í¥ÑåM•ÑÑ¥¹Ì¹…‘…ÁÑ¥Ù•	åMÁ…”¤¤ì(€€€½¹ÍÐ‰É…¥¹AÉ•™Ì€ôÍ…¹¥Ñ¥é•	É…¥¹AÉ•™•É•¹•Ì¡¹•áÑMÑ…Ñ”¹‰É…¥¹AÉ•™•É•¹•Ì¤ì(€€€Á…”¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ‰É…¥¸µÁÉ•™•É•¹•tˆ¤¹™½É…  ¡½¹ÑÉ½°¤€ôøì(€€€€€½¹ÍÐÙ…±Õ”€ô½¹ÑÉ½°¹‘…Ñ…Í•Ð¹‰É…¥¹AÉ•™•É•¹”¹ÍÁ±¥Ð ˆ¸ˆ¤¹É•‘Õ” ¡ÕÉÍ½È°­•ä¤€ôøÕÉÍ½Èü¹m­•åt°‰É…¥¹AÉ•™Ì¤ì(€€€€€½¹ÑÉ½°¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ¡•­•ˆ°MÑÉ¥¹œ¡Ù…±Õ”€ôôôÑÉÕ”¤¤ì(€€€€€½¹ÍÐÍÑ…Ñ•%½¸€ô½¹ÑÉ½°¹±½Í•ÍÐ ‰±…‰•°ˆ¤ü¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ±Õ¥‘•tˆ¤ì(€€€€€¥˜€¡ÍÑ…Ñ•%½¸€˜˜½¹ÑÉ½°¹‘…Ñ…Í•Ð¹‰É…¥¹AÉ•™•É•¹”¹ÍÑ…ÉÑÍ]¥Ñ  ‰Á•Éµ¥ÍÍ¥½¹Ì¸ˆ¤¤ÍÑ…Ñ•%½¸¹‘…Ñ…Í•Ð¹±Õ¥‘”€ôÙ…±Õ”€ôôôÑÉÕ”€ü€‰•å”ˆ€è€‰•å”µ½™˜ˆì(€€€€€¥˜€¡ÍÑ…Ñ•%½¸€˜˜½¹ÑÉ½°¹‘…Ñ…Í•Ð¹‰É…¥¹AÉ•™•É•¹”¹ÍÑ…ÉÑÍ]¥Ñ  ‰µ•µ½Éä¹…Ñ•½É¥•Ì¸ˆ¤¤ÍÑ…Ñ•%½¸¹‘…Ñ…Í•Ð¹±Õ¥‘”€ôÙ…±Õ”€ôôôÑÉÕ”€ü€‰‰½½­µ…É¬µ¡•¬ˆ€è€‰‰½½­µ…É¬µàˆì(€€€ô¤ì(€€€Á…”¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ‰É…¥¸µÁÉ•™•É•¹”µÍ•±•Ñtˆ¤¹™½É…  ¡½¹ÑÉ½°¤€ôøì(€€€€€½¹ÍÐÙ…±Õ”€ô½¹ÑÉ½°¹‘…Ñ…Í•Ð¹‰É…¥¹AÉ•™•É•¹•M•±•Ð¹ÍÁ±¥Ð ˆ¸ˆ¤¹É•‘Õ” ¡ÕÉÍ½È°­•ä¤€ôøÕÉÍ½Èü¹m­•åt°‰É…¥¹AÉ•™Ì¤ì(€€€€€½¹ÑÉ½°¹Ù…±Õ”€ôMÑÉ¥¹œ¡Ù…±Õ”¤ì(€€€ô¤ì(€€€Á…”¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ‰É…¥¸µÁÉ•™•É•¹”µ¥¹ÁÕÑtˆ¤¹™½É…  ¡½¹ÑÉ½°¤€ôøì(€€€€€½¹ÍÐÙ…±Õ”€ô½¹ÑÉ½°¹‘…Ñ…Í•Ð¹‰É…¥¹AÉ•™•É•¹•%¹ÁÕÐ¹ÍÁ±¥Ð ˆ¸ˆ¤¹É•‘Õ” ¡ÕÉÍ½È°­•ä¤€ôøÕÉÍ½Èü¹m­•åt°‰É…¥¹AÉ•™Ì¤ì(€€€€€¥˜€¡‘½Õµ•¹Ð¹…Ñ¥Ù•±•µ•¹Ð€„ôô½¹ÑÉ½°¤½¹ÑÉ½°¹Ù…±Õ”€ôMÑÉ¥¹œ¡Ù…±Õ”€üü€ˆˆ¤ì(€€€ô¤ì(€€€ÕÁ‘…Ñ••¹Í¥ÑåAÉ•Ù¥•Ü¡¹•áÑMÑ…Ñ”¤ì(€€€É•™É•Í¡%½¹Ì ¤ì(€ô((€±•Ðµ•µ½Éå	ÕÍä€ô™…±Í”ì(€…Íå¹Œ™Õ¹Ñ¥½¸É•¹‘•ÉM•ÑÑ¥¹Í5•µ½É¥•Ì ¤ì(€€€¥˜€¡µ•µ½Éå	ÕÍäñð€…½ÁÑ¥½¹Ì¹‰É…¥¸ü¹µ•µ½Éä¤É•ÑÕÉ¸ì(€€€µ•µ½Éå	ÕÍä€ôÑÉÕ”ì(€€€‰É…¥¹5•µ½Éå1½…¹‘¥Í…‰±•€ôÑÉÕ”ì(€€€‰É…¥¹5•µ½ÉåMÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ô€‰¡…É•µ•¹ÐÍ•ÕÉ¥Í”‘•ÁÕ¥ÌMÕÁ…‰…Í”¸¸¸ˆì(€€€‰É…¥¹5•µ½Éå1¥ÍÐ¹É•Á±…•¡¥±‘É•¸¡ÍÑ…ÑÕÍMÑ…Ñ” ‰±½…‘¥¹œˆ°ì(€€€€€Ñ¥Ñ±”è€‰¡…É•µ•¹Ð‘•Ìµ•µ½¥É•Ìˆ°(€€€€€‘•ÍÉ¥ÁÑ¥½¸è€‰1•ÑÕÉ”Í•ÕÉ¥Í•”‘•ÁÕ¥ÌMÕÁ…‰…Í”¸ˆ°(€€€€€½µÁ…ÐèÑÉÕ”°(€€€€€¥¹±¥¹”èÑÉÕ”(€€€ô¤¤ì(€€€É•™É•Í¡%½¹Ì ¤ì(€€€½¹ÍÐÉ•ÍÁ½¹Í”€ô…Ý…¥Ð½ÁÑ¥½¹Ì¹‰É…¥¸¹µ•µ½Éä¹±¥ÍÐ ¤ì(€€€¥˜€¡½¹ÑÉ½±±•È¹Í¥¹…°¹…‰½ÉÑ•¤É•ÑÕÉ¸ì(€€€µ•µ½Éå	ÕÍä€ô™…±Í”ì(€€€‰É…¥¹5•µ½Éå1½…¹‘¥Í…‰±•€ô™…±Í”ì(€€€‰É…¥¹5•µ½ÉåMÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•ÍÁ½¹Í”¹½¬€ü€‘íÉ•ÍÁ½¹Í”¹‘…Ñ„¹±•¹Ñ¡ôµ•µ½¥É”‘íÉ•ÍÁ½¹Í”¹‘…Ñ„¹±•¹Ñ €ø€Ä€ü€‰Ìˆ€è€ˆ‰ô…Ñ¥Ù”‘íÉ•ÍÁ½¹Í”¹‘…Ñ„¹±•¹Ñ €ø€Ä€ü€‰Ìˆ€è€ˆ‰ô¹€€èÉ•ÍÁ½¹Í”¹µ•ÍÍ…”ì(€€€‰É…¥¹5•µ½Éå1¥ÍÐ¹É•Á±…•¡¥±‘É•¸ ¸¸¸¡É•ÍÁ½¹Í”¹½¬€˜˜É•ÍÁ½¹Í”¹‘…Ñ„¹±•¹Ñ €üÉ•ÍÁ½¹Í”¹‘…Ñ„¹µ…À ¡•¹ÑÉä¤€ôø•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÍ•ÑÑ¥¹Ìµµ•µ½ÉäµÉ½Üˆô°m•±•µ•¹Ð ‰ÍÁ…¸ˆ°íô°m¥½¸ ‰‰½½­µ…É¬ˆ¥t¤°•±•µ•¹Ð ‰‘¥Øˆ°íô°m•±•µ•¹Ð ‰Íµ…±°ˆ°ìÑ•áÐè•¹ÑÉä¹…Ñ•½Éäô¤°•±•µ•¹Ð ‰ÍÑÉ½¹œˆ°ìÑ•áÐè•¹ÑÉä¹­•äô¤°•±•µ•¹Ð ‰Àˆ°ìÑ•áÐè•¹ÑÉä¹Ù…±Õ”ô¥t¤°•±•µ•¹Ð ‰‘¥Øˆ°íô°m•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°ì±…ÍÍ9…µ”è€‰Øàµ¥½¸µ‰ÕÑÑ½¸ˆ°…ÑÑÉ¥‰ÕÑ•ÌèìÑåÁ”è€‰‰ÕÑÑ½¸ˆ°€‰…É¥„µ±…‰•°ˆè€‰5½‘¥™¥•È•ÑÑ”µ•µ½¥É”ˆô°‘…Ñ…Í•ÐèìÍ•ÑÑ¥¹Í5•µ½Éå‘¥Ðè•¹ÑÉä¹¥°Í•ÑÑ¥¹Í5•µ½ÉåY…±Õ”è•¹ÑÉä¹Ù…±Õ”ôô°m¥½¸ ‰Á•¹¥°ˆ¥t¤°•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°ì±…ÍÍ9…µ”è€‰Øàµ¥½¸µ‰ÕÑÑ½¸ˆ°…ÑÑÉ¥‰ÕÑ•ÌèìÑåÁ”è€‰‰ÕÑÑ½¸ˆ°€‰…É¥„µ±…‰•°ˆè€‰MÕÁÁÉ¥µ•È•ÑÑ”µ•µ½¥É”ˆô°‘…Ñ…Í•ÐèìÍ•ÑÑ¥¹Í5•µ½Éå•±•Ñ”è•¹ÑÉä¹¥ôô°m¥½¸ ‰ÑÉ…Í ´Èˆ¥t¥t¥t¤¤€èmÍÑ…ÑÕÍMÑ…Ñ”¡É•ÍÁ½¹Í”¹½¬€ü€‰•µÁÑäˆ€è€‰•ÉÉ½Èˆ°ì(€€€€€¥½¹9…µ”è€‰‘…Ñ…‰…Í”ˆ°(€€€€€•å•‰É½Üè€‰5•µ½¥É”	É…¥¸ˆ°(€€€€€Ñ¥Ñ±”èÉ•ÍÁ½¹Í”¹½¬€ü€‰ÕÕ¹”µ•µ½¥É”…Ñ¥Ù”ˆ€è€‰5•µ½¥É•Ì¥¹‘¥ÍÁ½¹¥‰±•Ìˆ°(€€€€€‘•ÍÉ¥ÁÑ¥½¸èÉ•ÍÁ½¹Í”¹½¬€ü€‰1•ÌÁÉ•™•É•¹•Ì…©½ÕÑ••ÌÙ½±½¹Ñ…¥É•µ•¹Ð…ÁÁ…É…¥ÑÉ½¹Ð¥¤¸ˆ€èÉ•ÍÁ½¹Í”¹µ•ÍÍ…”°(€€€€€…Ñ¥½¹ÌèÉ•ÍÁ½¹Í”¹½¬€ümt€èm•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°ì±…ÍÍ9…µ”è€‰Øàµ‰ÕÑÑ½¸Øàµ‰ÕÑÑ½¸´µÍ•½¹‘…Éäˆ°…ÑÑÉ¥‰ÕÑ•ÌèìÑåÁ”è€‰‰ÕÑÑ½¸ˆô°•Ù•¹ÑÌèì±¥¬è€ ¤€ôøÙ½¥É•¹‘•ÉM•ÑÑ¥¹Í5•µ½É¥•Ì ¤ôô°m¥½¸ ‰É•™É•Í µÜˆ¤°•±•µ•¹Ð ‰ÍÁ…¸ˆ°ìÑ•áÐè€‰I••ÍÍ…å•Èˆô¥t¥t°(€€€€€½µÁ…ÐèÑÉÕ”°(€€€€€¥¹±¥¹”èÑÉÕ”(€€€ô¥t¤¤ì(€€€É•™É•Í¡%½¹Ì ¤ì(€ô((€É•¹‘•É]½É­•ÉMÑ…ÑÕÌ ¤ì(€ÕÁ‘…Ñ•AÉ•™•É•¹•½¹ÑÉ½±Ì¡ÍÑ…Ñ”¤ì(€½¹ÍÐÕ¹ÍÕ‰ÍÉ¥‰•MÑ…Ñ”€ô½ÁÑ¥½¹Ì¹ÍÕ‰ÍÉ¥‰•MÑ…Ñ”ü¸ ¡¹•áÐ¤€ôøÕÁ‘…Ñ•AÉ•™•É•¹•½¹ÑÉ½±Ì¡¹•áÐ¤¤ñð€  ¤€ôøíô¤ì(€½¹ÍÐÕ¹ÍÕ‰ÍÉ¥‰•M½Õ¹‘Ì€ôÍ½Õ¹‘Ìü¹ÍÕ‰ÍÉ¥‰”ü¸ ¡ÁÉ•™•É•¹•Ì¤€ôøì(€€€½¹ÍÐÑ½±”€ôÁ…”¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸ôØà¹Í½Õ¹¹Ñ½±”tˆ¤ì(€€€Ñ½±”ü¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ¡•­•ˆ°MÑÉ¥¹œ¡ÁÉ•™•É•¹•Ì¹•¹…‰±•¤¤ì(€€€½¹ÍÐÍ¥±•¹ÑQ½±”€ôÁ…”¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸ôØà¹Í½Õ¹¹Í¥±•¹Ðtˆ¤ì(€€€Í¥±•¹ÑQ½±”ü¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ¡•­•ˆ°MÑÉ¥¹œ¡ÁÉ•™•É•¹•Ì¹Í¥±•¹Ð¤¤ì(€€€½¹ÍÐÍÁ…Ñ¥…±Q½±”€ôÁ…”¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ…Ñ¥½¸ôØà¹Í½Õ¹¹ÍÁ…Ñ¥…°tˆ¤ì(€€€ÍÁ…Ñ¥…±Q½±”ü¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ¡•­•ˆ°MÑÉ¥¹œ¡ÁÉ•™•É•¹•Ì¹ÍÁ…Ñ¥…°¤¤ì(€€€½¹ÍÐÁ…¬€ôÁ…”¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µÍ½Õ¹µÁ…­tˆ¤ì(€€€¥˜€¡Á…¬¤Á…¬¹Ù…±Õ”€ôÁÉ•™•É•¹•Ì¹Á…¬ì(€€€½¹ÍÐ‘•ÍÉ¥ÁÑ¥½¸€ôÁ…”¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µÍ½Õ¹µÁ…¬µ‘•ÍÉ¥ÁÑ¥½¹tˆ¤ì(€€€¥˜€¡‘•ÍÉ¥ÁÑ¥½¸¤‘•ÍÉ¥ÁÑ¥½¸¹Ñ•áÑ½¹Ñ•¹Ð€ôM=U9}A-L¹™¥¹ ¡•¹ÑÉä¤€ôø•¹ÑÉä¹¥€ôôôÁÉ•™•É•¹•Ì¹Á…¬¤ü¹‘•ÍÉ¥ÁÑ¥½¸ñð€ˆˆì(€€€Á…”¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µÍ½Õ¹µÙ½±Õµ•tˆ¤¹™½É…  ¡½¹ÑÉ½°¤€ôøì(€€€€€½¹ÍÐ…Ñ•½Éä€ô½¹ÑÉ½°¹‘…Ñ…Í•Ð¹Í½Õ¹‘Y½±Õµ”ì(€€€€€½¹ÍÐÙ…±Õ”€ô…Ñ•½Éä€ôôô€‰µ…ÍÑ•Èˆ€üÁÉ•™•É•¹•Ì¹µ…ÍÑ•È€èÁÉ•™•É•¹•Ì¹Ù½±Õµ•Ím…Ñ•½Éåtì(€€€€€½¹ÍÐÁ•É•¹Ð€ô5…Ñ ¹É½Õ¹¡9Õµ‰•È¡Ù…±Õ”ñð€À¤€¨€ÄÀÀ¤ì(€€€€€½¹ÑÉ½°¹Ù…±Õ”€ôMÑÉ¥¹œ¡Á•É•¹Ð¤ì(€€€€€½¹ÑÉ½°¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä ˆ´µØàµÉ…¹”µÁÉ½É•ÍÌˆ°€‘íÁ•É•¹Ñô•€¤ì(€€€€€½¹ÍÐ½ÕÑÁÕÐ€ôÁ…”¹ÅÕ•ÉåM•±•Ñ½È¡m‘…Ñ„µÍ½Õ¹µÙ…±Õ”ôˆ‘í…Ñ•½Éåô‰u€¤ì(€€€€€¥˜€¡½ÕÑÁÕÐ¤½ÕÑÁÕÐ¹Ñ•áÑ½¹Ñ•¹Ð€ô€‘íÁ•É•¹Ñô€•€ì(€€€ô¤ì(€ô¤ñð€  ¤€ôøíô¤ì(€™Õ¹Ñ¥½¸½µµ¥ÑM•ÑÑ¥¹œ¡½¹ÑÉ½°°…Ñ¥½¹%°½¹Ñ•áÐ¤ì(€€€Í•Ñ¥•±‘MÑ…Ñ”¡½¹ÑÉ½°°€‰±½…‘¥¹œˆ°€‰¹É•¥ÍÑÉ•µ•¹Ð¸¸¸ˆ¤ì(€€€Í•Ñ½ÉµMÑ…ÑÕÌ¡Í•ÑÑ¥¹ÍM…Ù•MÑ…ÑÕÌ°€‰±½…‘¥¹œˆ°€‰¹É•¥ÍÑÉ•µ•¹Ð¸¸¸ˆ¤ì(€€€½¹ÍÐÍ•ÑÑ±”€ô€¡É•ÍÕ±Ð¤€ôøì(€€€€€¥˜€¡É•ÍÕ±Ðü¹½¬€ôôô™…±Í”¤ì(€€€€€€€Í•Ñ¥•±‘MÑ…Ñ”¡½¹ÑÉ½°°€‰¥¹Ù…±¥ˆ°É•ÍÕ±Ð¹µ•ÍÍ…”¤ì(€€€€€€€Í•Ñ½ÉµMÑ…ÑÕÌ¡Í•ÑÑ¥¹ÍM…Ù•MÑ…ÑÕÌ°€‰•ÉÉ½Èˆ°É•ÍÕ±Ð¹µ•ÍÍ…”ñð€‰ÉÉ•ÕÈ‘”Í…ÕÙ•…É‘”ˆ¤ì(€€€€€ô•±Í”ì(€€€€€€€Í•Ñ¥•±‘MÑ…Ñ”¡½¹ÑÉ½°°€‰Ù…±¥ˆ°€‰¹É•¥ÍÑÉ”ˆ¤ì(€€€€€€€Í•Ñ½ÉµMÑ…ÑÕÌ¡Í•ÑÑ¥¹ÍM…Ù•MÑ…ÑÕÌ°€‰Í…Ù•ˆ°É•ÍÕ±Ðü¹µ•ÍÍ…”ñð€‰¹É•¥ÍÑÉ”ˆ¤ì(€€€€€ô(€€€€€É•ÑÕÉ¸É•ÍÕ±Ðì(€€€ôì(€€€½¹ÍÐÉ•ÍÕ±Ð€ô½ÁÑ¥½¹Ì¹…Ñ¥½¹Ìü¹‘¥ÍÁ…Ñ ü¸¡…Ñ¥½¹%°½¹Ñ•áÐ¤ì(€€€É•ÑÕÉ¸É•ÍÕ±Ðü¹Ñ¡•¸€üÉ•ÍÕ±Ð¹Ñ¡•¸¡Í•ÑÑ±”¤€èÍ•ÑÑ±”¡É•ÍÕ±Ð¤ì(€ô(€™Õ¹Ñ¥½¸¡…¹‘±•M•Ñ¥½¹9…Ù¥…Ñ¥½¸¡•Ù•¹Ð¤ì(€€€½¹ÍÐ‰ÕÑÑ½¸€ô•Ù•¹Ð¹Ñ…É•Ð¹±½Í•ÍÐ ‰m‘…Ñ„µÍ•ÑÑ¥¹ÌµÍ•Ñ¥½¹tˆ¤ì(€€€¥˜€ …‰ÕÑÑ½¸ñð€…Á…”¹½¹Ñ…¥¹Ì¡‰ÕÑÑ½¸¤¤É•ÑÕÉ¸ì(€€€¹…Ù	ÕÑÑ½¹Ì¹™½É…  ¡•¹ÑÉä¤€ôø•¹ÑÉä¹±…ÍÍ1¥ÍÐ¹Ñ½±” ‰¥Ìµ…Ñ¥Ù”ˆ°•¹ÑÉä€ôôô‰ÕÑÑ½¸¤¤ì(€€€¹…Ù	ÕÑÑ½¹Ì¹™½É…  ¡•¹ÑÉä¤€ôø•¹ÑÉä¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µÕÉÉ•¹Ðˆ°•¹ÑÉä€ôôô‰ÕÑÑ½¸€ü€‰ÑÉÕ”ˆ€è€‰™…±Í”ˆ¤¤ì(€€€Á…”¹ÅÕ•ÉåM•±•Ñ½È¡€Œ‘í‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹Í•ÑÑ¥¹ÍM•Ñ¥½¹õ€¤ü¹ÍÉ½±±%¹Ñ½Y¥•Ü¡ì‰•¡…Ù¥½Èè€‰Íµ½½Ñ ˆ°‰±½¬è€‰ÍÑ…ÉÐˆô¤ì(€ô(€Á…”¹ÅÕ•ÉåM•±•Ñ½È ˆ¹ØàµÍ•ÑÑ¥¹Ìµ¹…Øˆ¤ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°¡…¹‘±•M•Ñ¥½¹9…Ù¥…Ñ¥½¸°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€Ý½É­•É¥…¹½ÍÑ¥	ÕÑÑ½¸¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…Íå¹Œ€ ¤€ôøì(€€€¥˜€ …•áÑ•É¹…±M•ÉÙ¥•Ìü¹‘¥…¹½ÍÑ¥ŒñðÝ½É­•É¥…¹½ÍÑ¥IÕ¹¹¥¹œ¤É•ÑÕÉ¸ì(€€€Ý½É­•É¥…¹½ÍÑ¥IÕ¹¹¥¹œ€ôÑÉÕ”ì(€€€Ý½É­•É¥…¹½ÍÑ¥	ÕÑÑ½¸¹‘¥Í…‰±•€ôÑÉÕ”ì(€€€Ý½É­•É¥…¹½ÍÑ¥	ÕÑÑ½¸¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ‰ÕÍäˆ°€‰ÑÉÕ”ˆ¤ì(€€€Ý½É­•É¥…¹½ÍÑ¥	ÕÑÑ½¸¹ÅÕ•ÉåM•±•Ñ½È ‰ÍÁ…¸ˆ¤¹Ñ•áÑ½¹Ñ•¹Ð€ô€‰Y•É¥™¥…Ñ¥½¸ˆì(€€€ÑÉäì(€€€€€…Ý…¥Ð•áÑ•É¹…±M•ÉÙ¥•Ì¹‘¥…¹½ÍÑ¥Œ ¤ì(€€€ô…Ñ íô(€€€¥˜€ …½¹ÑÉ½±±•È¹Í¥¹…°¹…‰½ÉÑ•¤ì(€€€€€Ý½É­•É¥…¹½ÍÑ¥IÕ¹¹¥¹œ€ô™…±Í”ì(€€€€€Ý½É­•É¥…¹½ÍÑ¥	ÕÑÑ½¸¹‘¥Í…‰±•€ô™…±Í”ì(€€€€€Ý½É­•É¥…¹½ÍÑ¥	ÕÑÑ½¸¹É•µ½Ù•ÑÑÉ¥‰ÕÑ” ‰…É¥„µ‰ÕÍäˆ¤ì(€€€€€Ý½É­•É¥…¹½ÍÑ¥	ÕÑÑ½¸¹ÅÕ•ÉåM•±•Ñ½È ‰ÍÁ…¸ˆ¤¹Ñ•áÑ½¹Ñ•¹Ð€ô€‰Y•É¥™¥•È±”]½É­•Èˆì(€€€€€É•¹‘•É]½É­•ÉMÑ…ÑÕÌ ¤ì(€€€ô(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€Á…”¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µÍ½Õ¹µÁ…­tˆ¤ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€¡•Ù•¹Ð¤€ôøì(€€€½µµ¥ÑM•ÑÑ¥¹œ¡•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð°Øà¹Í½Õ¹¹Á…¬¸‘í•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹Ù…±Õ•õ€°ìÍ½ÕÉ”è€‰Í•ÑÑ¥¹Ìˆ°•±•µ•¹Ðè•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð°•Ù•¹Ðô¤ì(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€Á…”¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µÍ½Õ¹µÙ½±Õµ•tˆ¤¹™½É…  ¡½¹ÑÉ½°¤€ôø½¹ÑÉ½°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¥¹ÁÕÐˆ°€¡•Ù•¹Ð¤€ôøì(€€€½¹ÍÐ…Ñ•½Éä€ô•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹‘…Ñ…Í•Ð¹Í½Õ¹‘Y½±Õµ”ì(€€€½¹ÍÐÙ…±Õ”€ô9Õµ‰•È¡•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹Ù…±Õ”¤€¼€ÄÀÀì(€€€½¹ÍÐ½ÕÑÁÕÐ€ôÁ…”¹ÅÕ•ÉåM•±•Ñ½È¡m‘…Ñ„µÍ½Õ¹µÙ…±Õ”ôˆ‘í…Ñ•½Éåô‰u€¤ì(€€€¥˜€¡½ÕÑÁÕÐ¤½ÕÑÁÕÐ¹Ñ•áÑ½¹Ñ•¹Ð€ô€‘í5…Ñ ¹É½Õ¹¡Ù…±Õ”€¨€ÄÀÀ¥ô€•€ì(€€€•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä ˆ´µØàµÉ…¹”µÁÉ½É•ÍÌˆ°€‘í5…Ñ ¹É½Õ¹¡Ù…±Õ”€¨€ÄÀÀ¥ô•€¤ì(€€€½ÁÑ¥½¹Ì¹…Ñ¥½¹Ìü¹‘¥ÍÁ…Ñ ü¸ ‰Øà¹Í½Õ¹¹Ù½±Õµ”ˆ°ìÍ½ÕÉ”è€‰Í•ÑÑ¥¹Ìˆ°…Ñ•½Éä°Ù…±Õ”°•±•µ•¹Ðè•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð°•Ù•¹Ðô¤ì(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤¤ì(€Á…”¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ‘•¹Í¥ÑäµÕÍÑ½µtˆ¤¹™½É…  ¡½¹ÑÉ½°¤€ôøì(€€€½¹ÑÉ½°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¥¹ÁÕÐˆ°€¡•Ù•¹Ð¤€ôøì(€€€€€½¹ÍÐ­•ä€ô•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹‘…Ñ…Í•Ð¹‘•¹Í¥ÑåÕÍÑ½´ì(€€€€€½¹ÍÐÉ…¹”€ô9M%Qe}UMQ=5}I9Mm­•åtì(€€€€€½¹ÍÐÙ…±Õ”€ô9Õµ‰•È¡•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹Ù…±Õ”¤ì(€€€€€½¹ÍÐÁÉ½É•ÍÌ€ô€ ¡Ù…±Õ”€´É…¹”¹µ¥¸¤€¼€¡É…¹”¹µ…à€´É…¹”¹µ¥¸¤¤€¨€ÄÀÀì(€€€€€•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä ˆ´µØàµÉ…¹”µÁÉ½É•ÍÌˆ°€‘íÁÉ½É•ÍÍô•€¤ì(€€€€€Á…”¹ÅÕ•ÉåM•±•Ñ½È¡m‘…Ñ„µ‘•¹Í¥Ñäµ½ÕÑÁÕÐôœ‘í­•åôu€¤¹Ñ•áÑ½¹Ñ•¹Ð€ô€‘íÙ…±Õ•ô‘íÉ…¹”¹Õ¹¥Ñõ€ì(€€€€€½¹ÍÐÕÍÑ½´€ôì€¸¸¹Í…¹¥Ñ¥é••¹Í¥ÑåM•ÑÑ¥¹Ì¡±…Ñ•ÍÑMÑ…Ñ”¹‘•¹Í¥ÑåM•ÑÑ¥¹Ì¤¹ÕÍÑ½´°m­•åtèÙ…±Õ”ôì(€€€€€ÕÁ‘…Ñ••¹Í¥ÑåAÉ•Ù¥•Ü¡ì€¸¸¹±…Ñ•ÍÑMÑ…Ñ”°‘•¹Í¥Ñäè€‰ÕÍÑ½´ˆô°ÕÍÑ½´¤ì(€€€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€€€½¹ÑÉ½°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€¡•Ù•¹Ð¤€ôø½µµ¥ÑM•ÑÑ¥¹œ¡•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð°€‰Øà¹‘•¹Í¥Ñä¹ÕÍÑ½´¹ÕÁ‘…Ñ”ˆ°ìÍ½ÕÉ”è€‰Í•ÑÑ¥¹Ìˆ°­•äè•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹‘…Ñ…Í•Ð¹‘•¹Í¥ÑåÕÍÑ½´°Ù…±Õ”è9Õµ‰•È¡•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹Ù…±Õ”¤ô¤°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€ô¤ì(€Á…”¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ‰É…¥¸µÁÉ•™•É•¹•tˆ¤¹™½É…  ¡½¹ÑÉ½°¤€ôø½¹ÑÉ½°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€¡•Ù•¹Ð¤€ôøì(€€€½¹ÍÐÁ…Ñ €ô•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹‘…Ñ…Í•Ð¹‰É…¥¹AÉ•™•É•¹”ì(€€€½¹ÍÐÙ…±Õ”€ô•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ¡•­•ˆ¤€„ôô€‰ÑÉÕ”ˆì(€€€½µµ¥ÑM•ÑÑ¥¹œ¡•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð°€‰Øà¹‰É…¥¸¹ÁÉ•™•É•¹”ˆ°ìÍ½ÕÉ”è€‰Í•ÑÑ¥¹Ìˆ°Á…Ñ °Ù…±Õ”ô¤ì(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤¤ì(€Á…”¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ‰É…¥¸µÁÉ•™•É•¹”µÍ•±•Ñtˆ¤¹™½É…  ¡½¹ÑÉ½°¤€ôø½¹ÑÉ½°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€¡•Ù•¹Ð¤€ôøì(€€€½¹ÍÐÁ…Ñ €ô•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹‘…Ñ…Í•Ð¹‰É…¥¹AÉ•™•É•¹•M•±•Ðì(€€€½¹ÍÐÙ…±Õ”€ôÁ…Ñ €ôôô€‰µ•µ½Éä¹É•Ñ•¹Ñ¥½¹…åÌˆ€ü9Õµ‰•È¡•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹Ù…±Õ”¤€è•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹Ù…±Õ”ì(€€€½µµ¥ÑM•ÑÑ¥¹œ¡•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð°€‰Øà¹‰É…¥¸¹ÁÉ•™•É•¹”ˆ°ìÍ½ÕÉ”è€‰Í•ÑÑ¥¹Ìˆ°Á…Ñ °Ù…±Õ”ô¤ì(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤¤ì(€Á…”¹ÅÕ•ÉåM•±•Ñ½É±° ‰m‘…Ñ„µ‰É…¥¸µÁÉ•™•É•¹”µ¥¹ÁÕÑtˆ¤¹™½É…  ¡½¹ÑÉ½°¤€ôø½¹ÑÉ½°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€¡•Ù•¹Ð¤€ôø½µµ¥ÑM•ÑÑ¥¹œ¡•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð°€‰Øà¹‰É…¥¸¹ÁÉ•™•É•¹”ˆ°ìÍ½ÕÉ”è€‰Í•ÑÑ¥¹Ìˆ°Á…Ñ è•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹‘…Ñ…Í•Ð¹‰É…¥¹AÉ•™•É•¹•%¹ÁÕÐ°Ù…±Õ”è•Ù•¹Ð¹ÕÉÉ•¹ÑQ…É•Ð¹Ù…±Õ”ô¤°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤¤ì(€‰É…¥¹5•µ½Éå1½…¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøÙ½¥É•¹‘•ÉM•ÑÑ¥¹Í5•µ½É¥•Ì ¤°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€‰É…¥¹5•µ½Éå1¥ÍÐ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…Íå¹Œ€¡•Ù•¹Ð¤€ôøì(€€€½¹ÍÐÉ•µ½Ù•	ÕÑÑ½¸€ô•Ù•¹Ð¹Ñ…É•Ð¹±½Í•ÍÐ ‰m‘…Ñ„µÍ•ÑÑ¥¹Ìµµ•µ½Éäµ‘•±•Ñ•tˆ¤ì(€€€½¹ÍÐ•‘¥Ñ	ÕÑÑ½¸€ô•Ù•¹Ð¹Ñ…É•Ð¹±½Í•ÍÐ ‰m‘…Ñ„µÍ•ÑÑ¥¹Ìµµ•µ½Éäµ•‘¥Ñtˆ¤ì(€€€¥˜€¡É•µ½Ù•	ÕÑÑ½¸¤ì(€€€€€¥˜€ …½¹™¥É´ ‰MÕÁÁÉ¥µ•È•ÑÑ”µ•µ½¥É”	É…¥¸€üˆ¤¤É•ÑÕÉ¸ì(€€€€€½¹ÍÐÉ•ÍÁ½¹Í”€ô…Ý…¥Ð½ÁÑ¥½¹Ì¹‰É…¥¸¹µ•µ½Éä¹É•µ½Ù”¡É•µ½Ù•	ÕÑÑ½¸¹‘…Ñ…Í•Ð¹Í•ÑÑ¥¹Í5•µ½Éå•±•Ñ”¤ì(€€€€€‰É…¥¹5•µ½ÉåMÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•ÍÁ½¹Í”¹µ•ÍÍ…”ì(€€€€€¥˜€¡É•ÍÁ½¹Í”¹½¬¤…Ý…¥ÐÉ•¹‘•ÉM•ÑÑ¥¹Í5•µ½É¥•Ì ¤ì(€€€ô•±Í”¥˜€¡•‘¥Ñ	ÕÑÑ½¸¤ì(€€€€€½¹ÍÐÙ…±Õ”€ôÁÉ½µÁÐ ‰5½‘¥™¥•È±„µ•µ½¥É”ˆ°•‘¥Ñ	ÕÑÑ½¸¹‘…Ñ…Í•Ð¹Í•ÑÑ¥¹Í5•µ½ÉåY…±Õ”ñð€ˆˆ¤ì(€€€€€¥˜€¡Ù…±Õ”€ôô¹Õ±°¤É•ÑÕÉ¸ì(€€€€€½¹ÍÐÉ•ÍÁ½¹Í”€ô…Ý…¥Ð½ÁÑ¥½¹Ì¹‰É…¥¸¹µ•µ½Éä¹ÕÁ‘…Ñ”¡•‘¥Ñ	ÕÑÑ½¸¹‘…Ñ…Í•Ð¹Í•ÑÑ¥¹Í5•µ½Éå‘¥Ð°ìÙ…±Õ”ô¤ì(€€€€€‰É…¥¹5•µ½ÉåMÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•ÍÁ½¹Í”¹µ•ÍÍ…”ì(€€€€€¥˜€¡É•ÍÁ½¹Í”¹½¬¤…Ý…¥ÐÉ•¹‘•ÉM•ÑÑ¥¹Í5•µ½É¥•Ì ¤ì(€€€ô(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€Á…”¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µÍ•ÑÑ¥¹Ìµµ•µ½Éäµ•áÁ½ÉÑtˆ¤ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…Íå¹Œ€ ¤€ôøì(€€€½¹ÍÐÉ•ÍÁ½¹Í”€ô…Ý…¥Ð½ÁÑ¥½¹Ì¹‰É…¥¸ü¹µ•µ½Éäü¹•áÁ½ÉÑ±°ü¸ ¤ì(€€€¥˜€¡É•ÍÁ½¹Í”ü¹½¬¤‘½Ý¹±½…‘)Í½¸¡É•ÍÁ½¹Í”¹‘…Ñ„°€‰•Ñ¡½¹”µ‰É…¥¸µµ•µ½Éä¹©Í½¸ˆ¤ì(€€€•±Í”‰É…¥¹5•µ½ÉåMÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•ÍÁ½¹Í”ü¹µ•ÍÍ…”ñð€‰áÁ½ÉÐ¥¹‘¥ÍÁ½¹¥‰±”¸ˆì(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€Á…”¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µÍ•ÑÑ¥¹Ìµµ•µ½Éäµ±•…Étˆ¤ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…Íå¹Œ€ ¤€ôøì(€€€¥˜€ …½¹™¥É´ ‰MÕÁÁÉ¥µ•È‘•™¥¹¥Ñ¥Ù•µ•¹ÐÑ½ÕÑ•Ì±•Ìµ•µ½¥É•Ì	É…¥¸€üˆ¤¤É•ÑÕÉ¸ì(€€€½¹ÍÐÉ•ÍÁ½¹Í”€ô…Ý…¥Ð½ÁÑ¥½¹Ì¹‰É…¥¸ü¹µ•µ½Éäü¹±•…Èü¸¡ì½¹™¥Éµ•èÑÉÕ”ô¤ì(€€€‰É…¥¹5•µ½ÉåMÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•ÍÁ½¹Í”ü¹µ•ÍÍ…”ñð€‰MÕÁÁÉ•ÍÍ¥½¸¥¹‘¥ÍÁ½¹¥‰±”¸ˆì(€€€¥˜€¡É•ÍÁ½¹Í”ü¹½¬¤…Ý…¥ÐÉ•¹‘•ÉM•ÑÑ¥¹Í5•µ½É¥•Ì ¤ì(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€É•™É•Í¡%½¹Ì ¤ì(€É•ÑÕÉ¸€ ¤€ôøì(€€€Õ¹ÍÕ‰ÍÉ¥‰•MÑ…Ñ” ¤ì(€€€Õ¹ÍÕ‰ÍÉ¥‰•M½Õ¹‘Ì ¤ì(€€€½¹ÑÉ½±±•È¹…‰½ÉÐ ¤ì(€€€Á…”¹É•µ½Ù” ¤ì(€ôì)ô(