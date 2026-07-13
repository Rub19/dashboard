const BRAND = "ETHONE";
const SEPARATOR = "\u2014";

export const DOCUMENT_CONTEXT_LABELS = Object.freeze({
  boot: "",
  login: "Login",
  profiles: "Profile Selection",
  onboarding: "Onboarding",
  error: "Unavailable",
  home: "Dashboard",
  notes: "Notes",
  tasks: "Tasks",
  calendar: "Calendar",
  files: "Files",
  activity: "Activity Hub",
  connections: "Connections",
  spaces: "Spaces",
  flows: "Flows",
  widgets: "Widgets",
  brain: "Brain",
  settings: "Settings",
  marketplace: "Marketplace",
  command: "Command Palette",
  mission: "Mission Control",
  notifications: "Notifications",
  profile: "Profile",
  window: "Window"
});

const ENTRY_KEYS = new Set(["boot", "login", "profiles", "onboarding", "error"]);
const SURFACE_KEYS = new Set(["command", "mission", "notifications", "profile", "widgets", "window"]);
const DEFAULT_DESCRIPTION = "ETHONE est votre syst\u00e8me d'exploitation personnel : un espace unifi\u00e9 pour organiser, cr\u00e9er et avancer.";
const SOCIAL_LOCALES = Object.freeze({ fr: "fr_FR", en: "en_US", es: "es_ES", de: "de_DE" });

function contextLabel(key) {
  return DOCUMENT_CONTEXT_LABELS[String(key || "").toLowerCase()] ?? "";
}

export function formatDocumentTitle(label = "") {
  const clean = String(label || "").trim();
  return clean ? `${BRAND} ${SEPARATOR} ${clean}` : BRAND;
}

export function titleForContext(key) {
  return formatDocumentTitle(contextLabel(key));
}

export function themeColorForState(state = {}) {
  if (state.space === "focus") return "#070b10";
  if (state.space === "studio") return "#0d090d";
  return state.theme === "graphite" ? "#111317" : "#080a0d";
}

function descriptionFor(key) {
  const label = contextLabel(key);
  if (key === "login") return "Connectez-vous \u00e0 ETHONE, votre syst\u00e8me d'exploitation personnel.";
  if (key === "profiles") return "Choisissez votre environnement personnel avant d'entrer dans ETHONE.";
  if (key === "onboarding") return "Configurez votre environnement ETHONE en quelques \u00e9tapes.";
  return label ? `${label} dans ETHONE, votre syst\u00e8me d'exploitation personnel.` : DEFAULT_DESCRIPTION;
}

function setMetaContent(documentRef, selector, content) {
  const node = documentRef.querySelector(selector);
  if (node) node.setAttribute("content", content);
}

export function createDocumentMetadataManager(documentRef) {
  if (!documentRef) throw new TypeError("Document metadata manager requires a document");
  let primaryKey = "boot";
  let surfaceKey = "";

  function apply() {
    const activeKey = surfaceKey || primaryKey;
    const title = titleForContext(activeKey);
    const description = descriptionFor(primaryKey);
    documentRef.title = title;
    documentRef.documentElement.dataset.documentContext = activeKey || "ethone";
    setMetaContent(documentRef, 'meta[property="og:title"]', title);
    setMetaContent(documentRef, 'meta[name="twitter:title"]', title);
    setMetaContent(documentRef, 'meta[name="description"]', description);
    setMetaContent(documentRef, 'meta[property="og:description"]', description);
    setMetaContent(documentRef, 'meta[name="twitter:description"]', description);
    return title;
  }

  function setEntry(key) {
    const normalized = String(key || "boot").toLowerCase();
    primaryKey = ENTRY_KEYS.has(normalized) ? normalized : "boot";
    surfaceKey = "";
    return apply();
  }

  function setRoute(route) {
    primaryKey = Object.hasOwn(DOCUMENT_CONTEXT_LABELS, route) ? route : "home";
    return apply();
  }

  function setSurface(surface) {
    const normalized = String(surface || "").toLowerCase();
    surfaceKey = SURFACE_KEYS.has(normalized) ? normalized : "";
    return apply();
  }

  function setThemeColor(color) {
    const value = /^#[0-9a-f]{6}$/i.test(String(color || "")) ? String(color) : "#080a0d";
    setMetaContent(documentRef, 'meta[name="theme-color"]', value);
    setMetaContent(documentRef, 'meta[name="msapplication-TileColor"]', value);
    return value;
  }

  function setLocale(locale) {
    const normalized = Object.hasOwn(SOCIAL_LOCALES, locale) ? locale : "fr";
    setMetaContent(documentRef, 'meta[property="og:locale"]', SOCIAL_LOCALES[normalized]);
    return normalized;
  }

  return Object.freeze({
    setEntry,
    setRoute,
    setSurface,
    setThemeColor,
    setLocale,
    refresh: apply,
    current: () => Object.freeze({ primary: primaryKey, surface: surfaceKey, title: documentRef.title })
  });
}
