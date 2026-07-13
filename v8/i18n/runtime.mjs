import { currentLocale, normalizeLocale, sourceEntry, translateSource } from "./catalog.mjs";

const TRANSLATABLE_ATTRIBUTES = Object.freeze(["placeholder", "title", "aria-label", "data-tooltip", "value"]);
const INVARIANT_COPY = new Set(["E", "R", "W", "D", "G", "S", "OS", "ESC", "ETHONE", "Ctrl K", "Ctrl S", "Brain", "GitHub", "Discord", "Spotify"]);
const SKIP_SELECTOR = [
  "script",
  "style",
  "template",
  "[translate='no']",
  "[data-i18n-ignore]",
  ".notranslate",
  "[contenteditable='true']"
].join(",");

const COUNT_LABELS = Object.freeze({
  note: { fr: ["note", "notes"], en: ["note", "notes"], es: ["nota", "notas"], de: ["Notiz", "Notizen"] },
  priorité: { fr: ["priorité", "priorités"], en: ["priority", "priorities"], es: ["prioridad", "prioridades"], de: ["Priorität", "Prioritäten"] },
  événement: { fr: ["événement", "événements"], en: ["event", "events"], es: ["evento", "eventos"], de: ["Ereignis", "Ereignisse"] },
  mot: { fr: ["mot", "mots"], en: ["word", "words"], es: ["palabra", "palabras"], de: ["Wort", "Wörter"] },
  commande: { fr: ["commande", "commandes"], en: ["command", "commands"], es: ["comando", "comandos"], de: ["Befehl", "Befehle"] },
  élément: { fr: ["élément", "éléments"], en: ["item", "items"], es: ["elemento", "elementos"], de: ["Element", "Elemente"] }
});

const DYNAMIC_TEMPLATES = Object.freeze({
  manage: { fr: "Gérer {value}", en: "Manage {value}", es: "Gestionar {value}", de: "{value} verwalten" },
  open: { fr: "Ouvrir {value}", en: "Open {value}", es: "Abrir {value}", de: "{value} öffnen" },
  pin: { fr: "Épingler {value}", en: "Pin {value}", es: "Fijar {value}", de: "{value} anheften" },
  unpin: { fr: "Retirer {value} des favoris", en: "Unpin {value}", es: "Desfijar {value}", de: "{value} lösen" },
  joins: { fr: "{value} rejoint ETHONE.", en: "{value} is joining ETHONE.", es: "{value} se incorpora a ETHONE.", de: "{value} kommt zu ETHONE." },
  v8OnlyTarget: { fr: "{value} sera disponible dans ETHONE", en: "{value} will be available in ETHONE", es: "{value} estará disponible en ETHONE", de: "{value} wird in ETHONE verfügbar sein" },
  delete: { fr: "Supprimer {value}", en: "Delete {value}", es: "Eliminar {value}", de: "{value} löschen" },
  complete: { fr: "Terminer {value}", en: "Complete {value}", es: "Completar {value}", de: "{value} abschließen" },
  reopen: { fr: "Rouvrir {value}", en: "Reopen {value}", es: "Reabrir {value}", de: "{value} erneut öffnen" },
  edit: { fr: "Modifier {value}", en: "Edit {value}", es: "Editar {value}", de: "{value} bearbeiten" },
  locked: { fr: "{value}, verrouillé", en: "{value}, locked", es: "{value}, bloqueado", de: "{value}, gesperrt" },
  selectedProfile: { fr: "Profil {value} sélectionné.", en: "Profile {value} selected.", es: "Perfil {value} seleccionado.", de: "Profil {value} ausgewählt." },
  createdProfile: { fr: "Profil {value} créé.", en: "Profile {value} created.", es: "Perfil {value} creado.", de: "Profil {value} erstellt." },
  updatedProfile: { fr: "Profil {value} mis à jour.", en: "Profile {value} updated.", es: "Perfil {value} actualizado.", de: "Profil {value} aktualisiert." },
  deletedProfile: { fr: "Profil {value} supprimé.", en: "Profile {value} deleted.", es: "Perfil {value} eliminado.", de: "Profil {value} gelöscht." },
  providerFailed: { fr: "Connexion {value} impossible.", en: "Could not connect to {value}.", es: "No se pudo conectar con {value}.", de: "Verbindung mit {value} nicht möglich." },
  providerOpening: { fr: "Ouverture de {value}.", en: "Opening {value}.", es: "Abriendo {value}.", de: "{value} wird geöffnet." },
  opened: { fr: "{value} ouvert", en: "{value} opened", es: "{value} abierto", de: "{value} geöffnet" },
  accent: { fr: "Accent {value} appliqué", en: "{value} accent applied", es: "Acento {value} aplicado", de: "Akzent {value} angewendet" },
  added: { fr: "{value} ajouté.", en: "{value} added.", es: "{value} añadido.", de: "{value} hinzugefügt." }
});

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isSkipped(node) {
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  return Boolean(element?.closest?.(SKIP_SELECTOR));
}

function translateDynamic(source, locale) {
  const text = normalizeText(source);
  if (!text) return null;

  const count = text.match(/^(\d+)\s+(note|notes|priorité|priorités|événement|événements|mot|mots|commande|commandes|élément|éléments)$/iu);
  if (count) {
    const amount = Number(count[1]);
    const key = count[2].toLocaleLowerCase("fr-FR").replace(/s$/u, "");
    const labels = COUNT_LABELS[key]?.[locale];
    if (labels) return `${amount} ${labels[amount === 1 ? 0 : 1]}`;
  }

  const openTasks = text.match(/^(\d+)\s+à faire$/u);
  if (openTasks) {
    const labels = { fr: "à faire", en: "open", es: "pendientes", de: "offen" };
    return `${openTasks[1]} ${labels[locale]}`;
  }

  const greeting = text.match(/^(Bonjour|Bon après-midi|Bonsoir|Encore éveillé),\s+(.+?)(\.)?$/u);
  if (greeting) {
    const translated = translateSource(greeting[1], locale);
    return `${translated}, ${greeting[2]}${greeting[3] || ""}`;
  }

  const datedCount = text.match(/^(\d{4}-\d{2}-\d{2}),\s+(\d+)\s+(événement|événements)$/u);
  if (datedCount) {
    const labels = COUNT_LABELS.événement[locale];
    return `${datedCount[1]}, ${datedCount[2]} ${labels[Number(datedCount[2]) === 1 ? 0 : 1]}`;
  }

  const deleteProfile = text.match(/^Les données locales du profil\s+(.+)\s+seront supprimées de cet appareil\. Cette action est irréversible\.$/u);
  if (deleteProfile) {
    const copy = {
      fr: "Les données locales du profil {value} seront supprimées de cet appareil. Cette action est irréversible.",
      en: "Local data for profile {value} will be deleted from this device. This action cannot be undone.",
      es: "Los datos locales del perfil {value} se eliminarán de este dispositivo. Esta acción es irreversible.",
      de: "Die lokalen Daten des Profils {value} werden von diesem Gerät gelöscht. Diese Aktion kann nicht rückgängig gemacht werden."
    };
    return copy[locale].replace("{value}", deleteProfile[1]);
  }

  const patterns = [
    ["unpin", /^Retirer\s+(.+)\s+des favoris$/u],
    ["pin", /^Épingler\s+(.+)$/u],
    ["manage", /^Gérer\s+(.+)$/u],
    ["delete", /^Supprimer\s+(.+)$/u],
    ["complete", /^Terminer\s+(.+)$/u],
    ["reopen", /^Rouvrir\s+(.+)$/u],
    ["edit", /^Modifier\s+(.+)$/u],
    ["locked", /^(.+),\s+verrouillé$/u],
    ["selectedProfile", /^Profil\s+(.+)\s+sélectionné\.$/u],
    ["createdProfile", /^Profil\s+(.+)\s+créé\.$/u],
    ["updatedProfile", /^Profil\s+(.+)\s+mis à jour\.$/u],
    ["deletedProfile", /^Profil\s+(.+)\s+supprimé\.$/u],
    ["providerFailed", /^Connexion\s+(.+)\s+impossible\.$/u],
    ["providerOpening", /^Ouverture de\s+(.+)\.$/u],
    ["accent", /^Accent\s+(.+)\s+appliqué$/u],
    ["v8OnlyTarget", /^(.+)\s+sera disponible dans ETHONE$/u],
    ["open", /^Ouvrir\s+(.+)$/u],
    ["joins", /^(.+)\s+rejoint ETHONE\.$/u],
    ["added", /^(.+)\s+ajouté\.$/u],
    ["opened", /^(.+)\s+ouvert$/u]
  ];
  for (const [template, pattern] of patterns) {
    const match = text.match(pattern);
    if (match) return DYNAMIC_TEMPLATES[template][locale].replace("{value}", translateSource(match[1], locale));
  }
  const context = text.match(/^(.+)\s+·\s+(.+)$/u);
  if (context) return `${translateSource(context[1], locale)} · ${translateSource(context[2], locale)}`;
  return null;
}

function isRegistered(source) {
  const clean = normalizeText(source);
  return Boolean(sourceEntry(clean) || globalThis.ETHONEPhraseCatalog?.entry?.(clean) || translateDynamic(clean, "fr"));
}

function localized(source, locale) {
  const clean = normalizeText(source);
  if (sourceEntry(clean) || globalThis.ETHONEPhraseCatalog?.entry?.(clean)) return translateSource(source, locale);
  const dynamic = translateDynamic(source, locale);
  return dynamic || source;
}

export function createV8I18n(root, options = {}) {
  if (!root) throw new TypeError("ETHONE i18n requires a root element");
  const storage = options.storage || globalThis.localStorage;
  const textSources = new WeakMap();
  const textOutputs = new WeakMap();
  const attributeSources = new WeakMap();
  const attributeOutputs = new WeakMap();
  let locale = currentLocale(storage);
  let observer = null;
  let scheduled = false;
  let destroyed = false;

  function sourceForText(node) {
    const current = node.nodeValue || "";
    if (!textSources.has(node) || textOutputs.get(node) !== current) textSources.set(node, current);
    return textSources.get(node);
  }

  function sourceForAttribute(node, attribute) {
    let sources = attributeSources.get(node);
    let outputs = attributeOutputs.get(node);
    if (!sources) { sources = new Map(); attributeSources.set(node, sources); }
    if (!outputs) { outputs = new Map(); attributeOutputs.set(node, outputs); }
    const current = node.getAttribute(attribute) || "";
    if (!sources.has(attribute) || outputs.get(attribute) !== current) sources.set(attribute, current);
    return { source: sources.get(attribute), outputs };
  }

  function applyText(node) {
    if (isSkipped(node)) return;
    const source = sourceForText(node);
    if (!normalizeText(source)) return;
    const output = localized(source, locale);
    if (node.nodeValue !== output) node.nodeValue = output;
    textOutputs.set(node, output);
  }

  function applyAttributes(node) {
    if (!(node instanceof Element) || isSkipped(node)) return;
    TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
      if (!node.hasAttribute(attribute) || (attribute === "value" && !node.matches("input[type='button'], input[type='submit'], input[type='reset']"))) return;
      const { source, outputs } = sourceForAttribute(node, attribute);
      const output = localized(source, locale);
      if (node.getAttribute(attribute) !== output) node.setAttribute(attribute, output);
      outputs.set(attribute, output);
    });
  }

  function applySubtree(target = root) {
    if (destroyed || !target) return;
    if (target.nodeType === Node.TEXT_NODE) {
      applyText(target);
      return;
    }
    if (!(target instanceof Element) && target !== root) return;
    if (target instanceof Element) applyAttributes(target);
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) applyText(node);
      else applyAttributes(node);
      node = walker.nextNode();
    }
  }

  function scheduleApply() {
    if (scheduled || destroyed) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      applySubtree(root);
    });
  }

  function persist(nextLocale) {
    try {
      storage?.setItem("nexus_lang", nextLocale);
      storage?.setItem("ethone_lang", nextLocale);
      storage?.setItem("ethone.language", nextLocale);
    } catch {}
  }

  function setLocale(value, { announce = true } = {}) {
    const nextLocale = normalizeLocale(value);
    const changed = nextLocale !== locale;
    locale = nextLocale;
    persist(locale);
    document.documentElement.lang = locale;
    applySubtree(root);
    if (changed) options.onChange?.(locale);
    if (changed && announce) {
      globalThis.dispatchEvent?.(new CustomEvent("ethone:language-changed", { detail: { language: locale, source: "v8-i18n" } }));
    }
    return locale;
  }

  function handleLanguageChange(event) {
    if (event?.detail?.source === "v8-i18n") return;
    setLocale(event?.detail?.language || currentLocale(storage), { announce: false });
  }

  function audit(target = root) {
    const unregistered = new Set();
    const missing = new Set();
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = target;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE && !isSkipped(node)) {
        const source = normalizeText(textSources.get(node) || node.nodeValue);
        if (source && /[A-Za-zÀ-ÿ]/u.test(source) && !INVARIANT_COPY.has(source) && !isRegistered(source)) unregistered.add(source);
        if (source && isRegistered(source) && normalizeText(localized(source, locale)) === source && locale !== "fr") {
          const entry = sourceEntry(source) || globalThis.ETHONEPhraseCatalog?.entry?.(source);
          if (entry && entry[locale] == null) missing.add(source);
        }
      }
      node = walker.nextNode();
    }
    return Object.freeze({ locale, unregistered: Object.freeze([...unregistered]), missing: Object.freeze([...missing]) });
  }

  observer = new MutationObserver(scheduleApply);
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TRANSLATABLE_ATTRIBUTES });
  globalThis.addEventListener("ethone:language-changed", handleLanguageChange);
  document.documentElement.lang = locale;
  applySubtree(root);

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    observer?.disconnect();
    observer = null;
    globalThis.removeEventListener("ethone:language-changed", handleLanguageChange);
    return true;
  }

  return Object.freeze({
    apply: applySubtree,
    translate: (source) => localized(source, locale),
    setLocale,
    locale: () => locale,
    audit,
    destroy
  });
}
