import { sanitizeBrainPreferences } from "./preferences.mjs";

const ROUTES = new Set(["home", "notes", "tasks", "calendar", "files", "activity", "connections", "spaces", "flows", "brain", "settings"]);
const SECRET_KEY = /(?:password|passcode|pin|token|secret|api.?key|authorization|credential|session|cookie|refresh)/i;
const SECRET_VALUE = /(?:bearer\s+[a-z0-9._~-]{12,}|(?:sk|pat|ghp|glpat|xox[baprs])[-_a-z0-9]{12,}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/i;
const clean = (value, limit = 180) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);

function redact(value, depth = 0) {
  if (depth > 4 || value == null) return value == null ? null : "[limite]";
  if (typeof value === "string") return SECRET_VALUE.test(value) ? "[donnee sensible masquee]" : clean(value, 500);
  if (["number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) return Object.freeze(value.slice(0, 12).map((item) => redact(item, depth + 1)));
  if (typeof value !== "object") return null;
  return Object.freeze(Object.fromEntries(Object.entries(value).filter(([key]) => !SECRET_KEY.test(key)).slice(0, 30).map(([key, item]) => [key, redact(item, depth + 1)])));
}

const source = (id, allowed, active, count, detail) => Object.freeze({ id, allowed, active: allowed && active, count: Math.max(0, Number(count) || 0), detail: clean(detail, 120) });

function routeContext(route, snapshot, state, permissions) {
  const context = {};
  const sources = [];
  const tasks = (snapshot.tasks || []).filter((task) => !task.done);
  const gaming = (snapshot.activities || []).filter((item) => item?.category === "gaming" || ["discord", "steam", "spotify"].includes(item?.source));

  function include(id, contextKey, permission, routes, items, limit, detail, view) {
    const allowed = permissions[permission] === true;
    const active = allowed && routes.includes(route);
    if (active) context[contextKey] = items.slice(0, limit).map(view);
    sources.push(source(id, allowed, active, items.length, active ? detail : allowed ? "Non requis sur cette page" : "Permission desactivee"));
  }

  include("tasks", "tasks", "tasks", ["home", "tasks", "brain"], tasks, 8, "Titres, priorites et echeances", (item) => ({ id: item.id, title: item.title, priority: item.priority, due: item.due }));
  include("notes", "notes", "notes", ["notes", "home", "brain"], snapshot.notes || [], 6, "Titres et metadonnees uniquement", (item) => ({ id: item.id, title: item.title, updatedAt: item.updatedAt, pinned: item.pinned }));
  include("calendar", "events", "calendar", ["calendar", "home", "brain"], snapshot.events || [], 8, "Evenements a venir", (item) => ({ id: item.id, title: item.title, date: item.date }));
  include("connections", "connections", "connections", ["connections", "brain"], snapshot.connections || [], 12, "Etat technique, aucun secret", (item) => ({ id: item.id, status: item.status, lastSyncAt: item.lastSyncAt, responseMs: item.responseMs }));
  include("activity", "activity", "activity", ["activity", "home", "brain"], snapshot.activities || [], 10, "Dix signaux recents maximum", (item) => ({ source: item.source, category: item.category, title: item.title, timestamp: item.timestamp }));
  include("gaming", "gaming", "gaming", ["home", "activity", "brain"], gaming, 6, "Six signaux jeu ou media", (item) => ({ source: item.source, title: item.title, timestamp: item.timestamp }));
  include("files", "files", "files", ["files"], snapshot.files || [], 8, "Noms et types, sans contenu", (item) => ({ id: item.id, name: item.name, type: item.type, favorite: item.favorite }));

  const settingsActive = route === "settings" && permissions.settings === true;
  if (settingsActive) context.settings = { theme: state.theme, accent: state.accent, density: state.density, densityEffective: state.densityEffective || state.density };
  sources.push(source("settings", permissions.settings === true, settingsActive, settingsActive ? 4 : 0, settingsActive ? "Apparence active uniquement" : permissions.settings ? "Non requis sur cette page" : "Permission desactivee"));
  sources.push(source("profile", permissions.profile === true, Boolean(permissions.profile && snapshot.profile), snapshot.profile ? 1 : 0, permissions.profile ? "Identifiant public et nom uniquement" : "Permission desactivee"));
  return Object.freeze({ context: redact(context), sources: Object.freeze(sources) });
}

export function createBrainContextEngine(options = {}) {
  const repository = options.repository;
  const getState = typeof options.getState === "function" ? options.getState : () => ({});
  if (!repository?.snapshot) throw new TypeError("Brain Context Engine requires a repository");
  let builds = 0;

  function build(request = {}) {
    const state = getState() || {};
    const snapshot = repository.snapshot();
    const preferences = sanitizeBrainPreferences(state.brainPreferences);
    const route = ROUTES.has(request.route) ? request.route : ROUTES.has(state.route) ? state.route : "home";
    const scoped = routeContext(route, snapshot, state, preferences.permissions);
    builds += 1;
    return Object.freeze({
      schema: "ethone-brain-context",
      version: 1,
      generatedAt: new Date().toISOString(),
      intent: clean(request.intent, 240),
      route,
      workspace: Object.freeze({ space: clean(state.space, 48), flow: clean(state.flow, 80) }),
      profile: preferences.permissions.profile && snapshot.profile ? Object.freeze({ id: clean(snapshot.profile.id, 80), name: clean(snapshot.profile.name, 80) }) : null,
      context: scoped.context,
      sources: scoped.sources,
      privacy: Object.freeze({ mode: preferences.provider.privacy, excludedSensitiveKeys: true, fullNoteBodies: false, secrets: false })
    });
  }

  return Object.freeze({ build, diagnostics: () => Object.freeze({ builds, listeners: 0, observers: 0, timers: 0 }) });
}
