const BRAND = "ETHONE";
const SEPARATOR = "\u2014";

export const DOCUMENT_CONTEXT_LABELS: Record<string, string> = {
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
  window: "Window",
  mail: "Mail",
  team: "Team",
  focus: "Focus",
  weather: "Météo",
  bills: "Bills",
  interactions: "Interactions",
};

const SURFACE_KEYS = new Set(["command", "mission", "notifications", "profile", "widgets", "window"]);
const DEFAULT_DESCRIPTION = "ETHONE est votre système d'exploitation personnel : un espace unifié pour organiser, créer et avancer.";

function contextLabel(key: string): string {
  return DOCUMENT_CONTEXT_LABELS[String(key || "").toLowerCase()] ?? "";
}

export function formatDocumentTitle(label = ""): string {
  const clean = String(label || "").trim();
  return clean ? `${BRAND} ${SEPARATOR} ${clean}` : BRAND;
}

export function titleForContext(key: string): string {
  return formatDocumentTitle(contextLabel(key));
}

export function descriptionForContext(key: string): string {
  const label = contextLabel(key);
  if (key === "login") return "Connectez-vous à ETHONE, votre système d'exploitation personnel.";
  if (key === "profiles") return "Choisissez votre environnement personnel avant d'entrer dans ETHONE.";
  if (key === "onboarding") return "Configurez votre environnement ETHONE en quelques étapes.";
  return label ? `${label} dans ETHONE, votre système d'exploitation personnel.` : DEFAULT_DESCRIPTION;
}

import { resolveLegacyTheme, THEME_DEFINITIONS } from "./theme-engine";

export function themeColorForState(state: { theme?: string; space?: string } = {}): string {
  const theme = state.theme || "";
  if (state.space === "focus") return "#070b10";
  if (state.space === "studio") return "#0d090d";
  const resolved = resolveLegacyTheme(theme);
  return THEME_DEFINITIONS[resolved]?.bgMain || "#08080a";
}

export function createDocumentMetadataManager(document: Document) {
  let primaryKey = "home";
  let surfaceKey = "";

  function setMetaContent(selector: string, content: string) {
    const node = document.querySelector(selector) as HTMLMetaElement | null;
    if (node) node.setAttribute("content", content);
  }

  function apply() {
    const activeKey = surfaceKey || primaryKey;
    const title = titleForContext(activeKey);
    const description = descriptionForContext(primaryKey);
    document.title = title;
    document.documentElement.dataset.documentContext = activeKey || "ethone";
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[name="twitter:description"]', description);
    return title;
  }

  function setRoute(route: string) {
    primaryKey = Object.hasOwn(DOCUMENT_CONTEXT_LABELS, route) ? route : "home";
    surfaceKey = "";
    return apply();
  }

  function setSurface(surface: string) {
    const normalized = String(surface || "").toLowerCase();
    surfaceKey = SURFACE_KEYS.has(normalized) ? normalized : "";
    return apply();
  }

  function setThemeColor(color: string) {
    const value = /^#[0-9a-f]{6}$/i.test(String(color || "")) ? String(color) : "#080a0d";
    setMetaContent('meta[name="theme-color"]', value);
    setMetaContent('meta[name="msapplication-TileColor"]', value);
    return value;
  }

  return Object.freeze({
    setRoute,
    setSurface,
    setThemeColor,
    refresh: apply,
    current: () => Object.freeze({ primary: primaryKey, surface: surfaceKey, title: document.title }),
  });
}
