/* ETHONE global search + command palette (Ctrl+K).
   This is the main search engine for pages, actions, integrations,
   settings, local content, widgets and plugins. */

let _cmdSelectedIdx = 0;
let _cmdRenderFrame = 0;
let _cmdKeyboardNav = false;
let _cmdMode = "command";
let _cmdPreviousFocus = null;
let _cmdCachedQuery = null;
let _cmdCachedResult = null;
let _cmdIndexCache = null;
let _cmdIndexSignature = "";
let _cmdLastSearchStats = { query: "", searchMs: 0, buildMs: 0, indexSize: 0 };

const CMD_STORE_KEY = "ethone:command-palette:v2";
const CMD_INDEX_SENTINEL = "__ethone_index__";
const CMD_RECENT_LIMIT = 16;
const CMD_FREQUENT_LIMIT = 16;
const CMD_SEARCH_LIMIT = 12;
const CMD_GROUP_PRIORITY = {
  context: 120,
  quickAccess: 112,
  recent: 95,
  recentSearches: 92,
  frequent: 88,
  favorites: 86,
  pages: 78,
  actions: 72,
  settings: 68,
  integrations: 56,
  widgets: 54,
  flows: 52,
  workspaces: 50,
  themes: 48,
  diagnostics: 46,
  notifications: 44,
  history: 43,
  marketplace: 42,
  plugins: 40,
  notes: 34,
  tasks: 33,
  files: 32,
  calendar: 31,
  habits: 30,
  databases: 28,
  ai: 27,
  contextActions: 25
};

const CMD_INTEGRATIONS = [
  { id: "discord", title: "Discord", sub: "Integration", keywords: "discord presence lanyard status voice activity messages settings notes tasks files widgets plugins" },
  { id: "spotify", title: "Spotify", sub: "Integration", keywords: "spotify music now playing audio listening settings notes tasks files widgets plugins" },
  { id: "github", title: "GitHub", sub: "Integration", keywords: "github git commits repositories developer code settings notes tasks files widgets plugins" },
  { id: "steam", title: "Steam", sub: "Integration", keywords: "steam gaming games playtime settings notes tasks files widgets plugins" },
  { id: "twitch", title: "Twitch", sub: "Integration", keywords: "twitch stream streaming live settings notes tasks files widgets plugins" },
  { id: "valorant", title: "Valorant", sub: "Integration", keywords: "valorant riot gaming accounts rank matches settings notes tasks files widgets plugins" }
];

const CMD_WIDGET_FALLBACKS = [
  ["clock", "Clock", "time date hour widget"],
  ["calendar", "Calendar", "events schedule meetings widget"],
  ["discord", "Discord", "presence social integration widget"],
  ["spotify", "Spotify", "music now playing integration widget"],
  ["lastfm", "LastFM", "music scrobble history widget"],
  ["github", "GitHub", "commits repositories developer widget"],
  ["weather", "Weather", "weather forecast meteo widget"],
  ["goals", "Goals", "objectives progress widget"],
  ["habits", "Habits", "routine streak widget"],
  ["notes", "Notes", "notes documents writing widget"],
  ["productivity", "Productivity", "tasks stats analytics widget"],
  ["timelineFeed", "Timeline", "activity events history widget"],
  ["aiSuggestions", "AI Suggestions", "brain recommendations widget"],
  ["cpu", "CPU", "system performance widget"],
  ["ram", "RAM", "memory system performance widget"]
];

const CMD_MARKETPLACE_FALLBACKS = [
  ["themes", "Theme Marketplace", "Themes", "Preview and apply verified ETHONE themes", "theme themes accent appearance graphite oled marketplace"]
];

const CMD_INTEGRATION_ACTIONS = [
  { suffix: "open", title: "Open {name}", sub: "Integration surface", id: "search.integration.open", keywords: "open launch view integration service", priority: 90 },
  { suffix: "settings", title: "{name} settings", sub: "Configure connection", id: "search.integration.settings", keywords: "settings configure account api key oauth connection", priority: 42 },
  { suffix: "connect", title: "Connect {name}", sub: "Start or reconnect", id: "search.integration.connect", keywords: "connect reconnect login oauth account authorize", priority: 30 },
  { suffix: "disconnect", title: "Disconnect {name}", sub: "Requires confirmation in Integration Hub", id: "search.integration.disconnect", keywords: "disconnect remove logout unlink disable", priority: 28 },
  { suffix: "refresh", title: "Refresh {name}", sub: "Test sync status", id: "search.integration.refresh", keywords: "refresh test sync status update", priority: 22 },
  { suffix: "widget", title: "Create {name} widget", sub: "Open widget marketplace", id: "search.widget.createService", keywords: "create widget dashboard card panel marketplace", priority: 26 },
  { suffix: "dashboard", title: "Add {name} to Dashboard", sub: "Add widget to Home", id: "search.widget.addDashboard", keywords: "add dashboard widget pin home quick action", priority: 24 }
];

function cmdLang() {
  try { return typeof _lang !== "undefined" ? _lang : "en"; } catch (e) { return "en"; }
}

function cmdExperimentalEnabled() {
  try {
    return new URLSearchParams(window.location.search || "").get("experimental") === "1"
      || localStorage.getItem("ethone:experimental-enabled") === "1";
  } catch (e) {
    return false;
  }
}

function cmdLabel(key, fallback) {
  try {
    if (typeof t === "function") {
      const value = t(key);
      return value && value !== key ? value : fallback;
    }
  } catch (e) {}
  return fallback || key;
}

const CMD_COPY = {
  en: {
    placeholderSpotlight: "Search pages, widgets, files, commands, settings...",
    placeholderCommand: "Search pages, items, actions...",
    spotlightLabel: "ETHONE Spotlight Search",
    paletteLabel: "ETHONE Command Palette",
    noResult: "No result",
    emptyHelp: "Try a page, service, note, task, file or widget.",
    universalSearch: "Universal Search",
    resultCount: ["{count} result", "{count} results"],
    searchingContext: "Searching ETHONE with context from {page}.",
    suggestedContext: "Suggested commands for {page}. Type to search everything.",
    pin: "Pin command",
    unpin: "Unpin command",
    navigate: "navigate",
    select: "select",
    close: "close"
  },
  fr: {
    placeholderSpotlight: "Rechercher pages, widgets, fichiers, commandes, paramètres...",
    placeholderCommand: "Rechercher des pages, éléments et actions...",
    spotlightLabel: "Recherche Spotlight ETHONE",
    paletteLabel: "Palette de commandes ETHONE",
    noResult: "Aucun résultat",
    emptyHelp: "Essayez une page, un service, une note, une tâche, un fichier ou un widget.",
    universalSearch: "Recherche universelle",
    resultCount: ["{count} résultat", "{count} résultats"],
    searchingContext: "Recherche dans ETHONE depuis {page}.",
    suggestedContext: "Commandes suggérées pour {page}. Saisissez votre recherche.",
    pin: "Épingler la commande",
    unpin: "Retirer des favoris",
    navigate: "naviguer",
    select: "sélectionner",
    close: "fermer"
  },
  es: {
    placeholderSpotlight: "Buscar páginas, widgets, archivos, comandos y ajustes...",
    placeholderCommand: "Buscar páginas, elementos y acciones...",
    spotlightLabel: "Búsqueda Spotlight de ETHONE",
    paletteLabel: "Paleta de comandos de ETHONE",
    noResult: "Sin resultados",
    emptyHelp: "Prueba con una página, servicio, nota, tarea, archivo o widget.",
    universalSearch: "Búsqueda universal",
    resultCount: ["{count} resultado", "{count} resultados"],
    searchingContext: "Buscando en ETHONE desde {page}.",
    suggestedContext: "Comandos sugeridos para {page}. Escribe para buscar.",
    pin: "Fijar comando",
    unpin: "Desfijar comando",
    navigate: "navegar",
    select: "seleccionar",
    close: "cerrar"
  },
  de: {
    placeholderSpotlight: "Seiten, Widgets, Dateien, Befehle und Einstellungen suchen...",
    placeholderCommand: "Seiten, Elemente und Aktionen suchen...",
    spotlightLabel: "ETHONE Spotlight-Suche",
    paletteLabel: "ETHONE-Befehlspalette",
    noResult: "Keine Ergebnisse",
    emptyHelp: "Suche nach einer Seite, einem Dienst, einer Notiz, Aufgabe, Datei oder einem Widget.",
    universalSearch: "Universelle Suche",
    resultCount: ["{count} Ergebnis", "{count} Ergebnisse"],
    searchingContext: "ETHONE wird im Kontext von {page} durchsucht.",
    suggestedContext: "Vorgeschlagene Befehle für {page}. Tippe, um zu suchen.",
    pin: "Befehl anheften",
    unpin: "Befehl lösen",
    navigate: "navigieren",
    select: "auswählen",
    close: "schließen"
  }
};

const CMD_CATEGORY_COPY = {
  fr: {
    context: "Suggéré ici", quickAccess: "Accès rapide", recent: "Récent", recentSearches: "Recherches récentes",
    frequent: "Fréquent", favorites: "Favoris", actions: "Actions", contextActions: "Actions intelligentes",
    pages: "Pages", integrations: "Intégrations", settings: "Paramètres", notes: "Notes", tasks: "Tâches",
    files: "Fichiers", widgets: "Widgets", plugins: "Extensions", habits: "Habitudes", calendar: "Calendrier",
    databases: "Bases de données", workspaces: "Espaces", flows: "Flows", themes: "Thèmes", diagnostics: "Diagnostics",
    notifications: "Notifications", history: "Historique", marketplace: "Marketplace", ai: "Conversations IA"
  },
  es: {
    context: "Sugerido aquí", quickAccess: "Acceso rápido", recent: "Reciente", recentSearches: "Búsquedas recientes",
    frequent: "Frecuente", favorites: "Favoritos", actions: "Acciones", contextActions: "Acciones inteligentes",
    pages: "Páginas", integrations: "Integraciones", settings: "Ajustes", notes: "Notas", tasks: "Tareas",
    files: "Archivos", widgets: "Widgets", plugins: "Plugins", habits: "Hábitos", calendar: "Calendario",
    databases: "Bases de datos", workspaces: "Espacios", flows: "Flows", themes: "Temas", diagnostics: "Diagnóstico",
    notifications: "Notificaciones", history: "Historial", marketplace: "Marketplace", ai: "Conversaciones IA"
  },
  de: {
    context: "Hier vorgeschlagen", quickAccess: "Schnellzugriff", recent: "Zuletzt", recentSearches: "Letzte Suchen",
    frequent: "Häufig", favorites: "Favoriten", actions: "Aktionen", contextActions: "Intelligente Aktionen",
    pages: "Seiten", integrations: "Integrationen", settings: "Einstellungen", notes: "Notizen", tasks: "Aufgaben",
    files: "Dateien", widgets: "Widgets", plugins: "Plugins", habits: "Gewohnheiten", calendar: "Kalender",
    databases: "Datenbanken", workspaces: "Arbeitsbereiche", flows: "Flows", themes: "Themes", diagnostics: "Diagnose",
    notifications: "Benachrichtigungen", history: "Verlauf", marketplace: "Marketplace", ai: "KI-Unterhaltungen"
  }
};

function cmdCopy(key, variables) {
  const lang = String(cmdLang() || "en").toLowerCase().split("-")[0];
  const table = CMD_COPY[lang] || CMD_COPY.en;
  const fallback = CMD_COPY.en[key] || key;
  let value = table[key] || fallback;
  if (Array.isArray(value)) value = value[Number(variables && variables.count) === 1 ? 0 : 1];
  return String(value).replace(/\{(\w+)\}/g, function (_, name) {
    return variables && variables[name] != null ? String(variables[name]) : "";
  });
}

function cmdCategoryCopy(category, fallback) {
  const lang = String(cmdLang() || "en").toLowerCase().split("-")[0];
  const table = CMD_CATEGORY_COPY[lang];
  return table && table[category] ? table[category] : fallback;
}

function cmdEsc(value) {
  try { if (typeof escapeHTML === "function") return escapeHTML(value); } catch (e) {}
  return String(value == null ? "" : value).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

function syncCmdChrome() {
  const footer = document.getElementById("cmd-footer");
  if (!footer) return;
  footer.innerHTML = '<span><span class="cmd-k">↑ ↓</span> ' + cmdEsc(cmdCopy("navigate")) + '</span>' +
    '<span><span class="cmd-k">Enter</span> ' + cmdEsc(cmdCopy("select")) + '</span>' +
    '<span><span class="cmd-k">ESC</span> ' + cmdEsc(cmdCopy("close")) + '</span>';
}

function cmdProfile() {
  try { return typeof curP === "function" ? curP() : null; } catch (e) { return null; }
}

function cmdState() {
  const profile = cmdProfile();
  return profile && profile.state ? profile.state : {};
}

function cmdSave() {
  try { if (typeof saveStateNow === "function") saveStateNow(); } catch (e) {}
}

function cmdToast(message, type) {
  try {
    if (typeof toast === "function") {
      toast(message, type || "info");
      return;
    }
  } catch (e) {}
}

function cmdActions() {
  try { return window.Ethone && window.Ethone.get("actions"); } catch (e) { return null; }
}

function cmdIconName(value, item, sectionKey) {
  const raw = String(value || item?.icon || item?.category || sectionKey || "command").trim();
  const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const map = {
    ai: "brain",
    brain: "brain",
    ethoneai: "brain",
    cal: "calendar-days",
    calendar: "calendar-days",
    calendardays: "calendar-days",
    task: "square-check-big",
    tasks: "square-check-big",
    todo: "square-check-big",
    todos: "square-check-big",
    note: "notebook-pen",
    notes: "notebook-pen",
    notebook: "notebook-pen",
    board: "columns-3",
    kanban: "columns-3",
    theme: "palette",
    themes: "palette",
    color: "palette",
    palette: "palette",
    save: "save",
    home: "layout-dashboard",
    dashboard: "layout-dashboard",
    overview: "layout-dashboard",
    layout: "layout-dashboard",
    files: "folder",
    file: "file",
    folder: "folder",
    set: "settings",
    settings: "settings",
    plug: "plug",
    plugin: "plug",
    plugins: "plug",
    ext: "puzzle",
    store: "store",
    marketplace: "store",
    widget: "blocks",
    widgets: "blocks",
    blocks: "blocks",
    panel: "panel-right-open",
    panels: "panel-right-open",
    flow: "workflow",
    flows: "workflow",
    workflow: "workflow",
    space: "monitor",
    spaces: "monitor",
    workspace: "monitor",
    workspaces: "monitor",
    search: "search",
    import: "download",
    export: "upload",
    data: "database",
    database: "database",
    databases: "database",
    stats: "chart-no-axes-combined",
    statistics: "chart-no-axes-combined",
    activity: "activity",
    health: "heart-pulse",
    version: "git-commit",
    git: "github",
    github: "github",
    discord: "message-circle",
    spotify: "music",
    steam: "gamepad-2",
    twitch: "radio",
    valorant: "crosshair",
    valo: "crosshair",
    crosshair: "crosshair",
    googlecalendar: "calendar-days",
    googledrive: "hard-drive",
    obs: "video",
    youtube: "youtube",
    battlenet: "swords",
    lastfm: "radio",
    music: "music",
    game: "gamepad-2",
    gaming: "gamepad-2",
    loop: "repeat-2",
    habit: "repeat-2",
    habits: "repeat-2",
    history: "clock",
    time: "clock",
    timemachine: "history",
    trophy: "trophy",
    apps: "grid-3x3",
    orbit: "orbit",
    brief: "newspaper",
    user: "user-round",
    lang: "languages",
    tv: "monitor-play",
    dev: "bug",
    scan: "scan-search",
    launch: "rocket",
    rocket: "rocket",
    sparkles: "sparkles",
    new: "sparkles",
    plus: "plus",
    reset: "rotate-ccw",
    off: "power-off",
    done: "circle-check",
    img: "image",
    image: "image",
    code: "code-2",
    book: "book-open",
    filetext: "file-text",
    memory: "database-zap",
    server: "server",
    model: "cpu",
    bell: "bell",
    notifications: "bell",
    actions: "zap",
    recent: "clock-3",
    frequent: "flame",
    favorites: "star",
    quickaccess: "star",
    diagnostics: "scan-search",
    context: "sparkles",
    contextactions: "sparkles",
    command: "terminal",
    go: "arrow-right",
    open: "arrow-up-right",
    link: "link",
    connections: "plug-zap",
    importassistant: "download",
    applibrary: "grid-3x3",
    morningbriefing: "newspaper",
    achievements: "trophy",
    inspector: "scan-search",
    diagnostic: "scan-search",
    scansearch: "scan-search",
    healthcenter: "heart-pulse",
    versionhistory: "git-commit",
    timemachinesnapshot: "save",
    widgetbuilder: "blocks",
    presentation: "monitor-play"
  };
  if (map[key]) return map[key];
  if (raw.indexOf("-") !== -1 || raw.indexOf("_") !== -1) return raw.toLowerCase().replace(/_/g, "-");
  return map[String(item?.category || sectionKey || "").toLowerCase().replace(/[^a-z0-9]+/g, "")] || "sparkles";
}

function cmdIconHTML(item, sectionKey) {
  const name = cmdIconName(item && item.icon, item, sectionKey);
  return '<i data-lucide="' + cmdEsc(name) + '" aria-hidden="true"></i>';
}

function cmdRenderIcons(root) {
  try {
    if (!window.lucide || window.__lucideFailed) return;
    const scope = root || document;
    if (typeof window.lucide.createElement !== "function" || !window.lucide.icons) {
      if (typeof window.lucide.createIcons === "function") {
        window.lucide.createIcons({ attrs: { "stroke-width": 1.9, "aria-hidden": "true", focusable: "false" } });
      }
      return;
    }
    const markers = Array.prototype.slice.call(scope.querySelectorAll("[data-lucide]"));
    if (scope.nodeType === 1 && scope.matches && scope.matches("[data-lucide]")) markers.unshift(scope);
    markers.forEach(function (marker) {
      if (!marker || !marker.parentNode) return;
      const rawName = String(marker.getAttribute("data-lucide") || "sparkles");
      const iconKey = rawName.split(/[-_]+/).filter(Boolean).map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }).join("");
      const iconNode = window.lucide.icons[iconKey] || window.lucide.icons.Sparkles;
      if (!iconNode) return;
      const svg = window.lucide.createElement(iconNode);
      const markerClass = marker.getAttribute("class");
      if (markerClass) markerClass.split(/\s+/).filter(Boolean).forEach(function (name) { svg.classList.add(name); });
      Array.prototype.forEach.call(marker.attributes || [], function (attribute) {
        if (attribute.name !== "data-lucide" && attribute.name !== "class") svg.setAttribute(attribute.name, attribute.value);
      });
      svg.setAttribute("stroke-width", "1.9");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.classList.add("ethone-icon");
      marker.replaceWith(svg);
    });
  } catch (e) {}
}

function cmdCurrentPage() {
  try {
    const surface = function (selector) {
      const el = document.querySelector(selector);
      if (!el) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 20 && rect.height > 20;
    };
    if (surface("#auth-screen")) return "login";
    if (surface("#profile-screen")) return "profiles";
    if (surface("#password-screen")) return "password";
  } catch (e) {}
  try {
    if (window.ETHONEOSContext && typeof window.ETHONEOSContext.snapshot === "function") {
      const os = window.ETHONEOSContext.snapshot();
      if (os && os.page && os.page.id) return os.page.id;
    }
  } catch (e) {}
  try {
    const active = document.querySelector(".tab-content.active[id^='page-']:not(.de-window-page)");
    if (active && active.id) return active.id.replace(/^page-/, "");
  } catch (e) {}
  try {
    const hash = String(location.hash || "").replace(/^#\/?/, "");
    if (hash) return hash.split(/[/?]/)[0] || "dashboard";
  } catch (e) {}
  return "dashboard";
}

function cmdPageLabel(page) {
  const map = {
    login: "Connexion",
    profiles: "Profils",
    password: "Securite",
    dashboard: "Dashboard",
    notes: cmdLabel("nav_notes", "Notes"),
    todos: cmdLabel("nav_tasks", "Tasks"),
    tasks: cmdLabel("nav_tasks", "Tasks"),
    files: cmdLabel("nav_files", "Files"),
    settings: cmdLabel("nav_settings", "Settings"),
    ai: cmdLabel("nav_ai", "ETHONE AI"),
    marketplace: "Marketplace",
    connections: cmdLabel("nav_connections", "Connections"),
    calendar: cmdLabel("nav_calendar", "Calendar"),
    gaming: cmdLabel("nav_gaming", "Gaming"),
    activity: "Activity",
    health: "Health",
    versions: "Version Center",
    databases: cmdLabel("nav_databases", "Databases")
  };
  return map[page] || page.replace(/[-_]+/g, " ").replace(/\b\w/g, function (m) { return m.toUpperCase(); });
}

function buildAuthSurfaceResults(query) {
  const items = [
    { id: "command.auth.login", actionId: "command.auth.login", icon: "log-in", title: "Connexion", sub: "Utiliser un compte ETHONE", keywords: "connexion login sign in email compte", priority: 120 },
    { id: "command.auth.register", actionId: "command.auth.register", icon: "user-plus", title: "Creer un compte", sub: "Configurer un nouvel espace", keywords: "register signup creer compte nouveau", priority: 112 },
    { id: "search.language.toggle", actionId: "search.language.toggle", icon: "languages", title: "Changer de langue", sub: "FR, EN, ES, DE", keywords: "langue language french english espagnol deutsch", priority: 90 }
  ];
  const q = normalizeCmdText(query || "");
  const filtered = !q ? items : items.filter(function (item) {
    return fuzzyScore(normalizeCmdText(cmdSearchText(item.title, item.sub, item.keywords)), q) >= (q.length <= 3 ? 18 : 40);
  });
  return {
    sections: filtered.length ? [{ key: "context", label: "Connexion", items: filtered }] : [],
    all: filtered
  };
}

function cmdReadStore() {
  try {
    const raw = localStorage.getItem(CMD_STORE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return {
      recent: Array.isArray(data.recent) ? data.recent : [],
      frequent: data.frequent && typeof data.frequent === "object" ? data.frequent : {},
      favorites: Array.isArray(data.favorites) ? data.favorites : [],
      searches: Array.isArray(data.searches) ? data.searches : []
    };
  } catch (e) {
    return { recent: [], frequent: {}, favorites: [], searches: [] };
  }
}

function cmdWriteStore(store) {
  try {
    localStorage.setItem(CMD_STORE_KEY, JSON.stringify({
      recent: (store.recent || []).slice(0, CMD_RECENT_LIMIT),
      frequent: store.frequent || {},
      favorites: (store.favorites || []).slice(0, CMD_FREQUENT_LIMIT),
      searches: (store.searches || []).slice(0, CMD_SEARCH_LIMIT)
    }));
  } catch (e) {}
}

function cmdStableItemKey(item) {
  if (!item) return "";
  let ctx = "";
  try { ctx = item.context ? JSON.stringify(item.context) : ""; } catch (e) {}
  return [item.actionId || item.id || "", item.title || "", ctx].join("|");
}

function cmdSerializableItem(item) {
  if (!item) return null;
  const context = item.context && typeof item.context === "object" ? Object.assign({}, item.context) : {};
  return {
    id: item.id,
    actionId: item.actionId || item.id,
    context: context,
    category: item.category || "actions",
    icon: item.icon || "Go",
    title: item.title || item.id || "Command",
    sub: item.sub || "",
    keywords: item.keywords || "",
    badge: item.badge || "",
    detail: item.detail || "",
    kbd: item.kbd || "",
    priority: item.priority || 0
  };
}

function cmdRecordUsage(item) {
  const snapshot = cmdSerializableItem(item);
  if (!snapshot) return;
  const key = cmdStableItemKey(snapshot);
  if (!key) return;
  const store = cmdReadStore();
  const now = Date.now();
  store.recent = [{ key: key, item: snapshot, at: now }].concat((store.recent || []).filter(function (entry) {
    return entry && entry.key !== key;
  })).slice(0, CMD_RECENT_LIMIT);
  const freq = store.frequent[key] || { key: key, item: snapshot, count: 0, last: 0 };
  freq.item = snapshot;
  freq.count = Math.min(999, (freq.count || 0) + 1);
  freq.last = now;
  store.frequent[key] = freq;
  cmdWriteStore(store);
}

function cmdRecordSearch(query) {
  query = String(query || "").trim();
  if (!query || query.length < 2) return;
  const store = cmdReadStore();
  const key = normalizeCmdText(query);
  store.searches = [{ key: key, query: query, at: Date.now() }].concat((store.searches || []).filter(function (entry) {
    return entry && entry.key !== key;
  })).slice(0, CMD_SEARCH_LIMIT);
  cmdWriteStore(store);
}

function cmdIsFavorite(item, store) {
  const key = cmdStableItemKey(cmdSerializableItem(item));
  if (!key) return false;
  store = store || cmdReadStore();
  return (store.favorites || []).some(function (entry) { return entry && entry.key === key; });
}

function cmdToggleFavoriteByItem(item) {
  const snapshot = cmdSerializableItem(item);
  const key = cmdStableItemKey(snapshot);
  if (!snapshot || !key) return false;
  const store = cmdReadStore();
  const favorites = (store.favorites || []).filter(function (entry) { return entry && entry.key !== key; });
  const wasPinned = favorites.length !== (store.favorites || []).length;
  if (!wasPinned) favorites.unshift({ key: key, item: snapshot, at: Date.now() });
  store.favorites = favorites.slice(0, CMD_FREQUENT_LIMIT);
  cmdWriteStore(store);
  cmdToast(wasPinned ? "Commande retiree des favoris." : "Commande epinglee dans Quick Access.", wasPinned ? "info" : "success");
  return !wasPinned;
}

function toggleCmdFavorite(index) {
  const input = document.getElementById("cmd-input");
  const result = getCmdResult(input ? input.value : "");
  const item = result.all[index];
  if (!item || item.category === "recentSearches") return false;
  cmdToggleFavoriteByItem(item);
  invalidateCmdCache();
  renderCmdResults();
  return false;
}

function cmdItemActionId(item) {
  return item && (item.actionId || item.id);
}

function cmdRun(actionId, context) {
  const actions = cmdActions();
  if (actions && typeof actions.dispatch === "function") {
    return actions.dispatch(actionId, Object.assign({ source: "command-palette" }, context || {}));
  }
  if (typeof window.runAction === "function") {
    return window.runAction(actionId, Object.assign({ source: "command-palette" }, context || {}));
  }
  return false;
}

function isCmdOpen() {
  const overlay = document.getElementById("cmd-palette-overlay");
  return !!(overlay && overlay.classList.contains("open"));
}

function setCommandOpenState(open) {
  try {
    document.body.classList.toggle("ethone-command-open", !!open);
    const overlay = document.getElementById("cmd-palette-overlay");
    if (overlay) {
      overlay.inert = !open;
      overlay.setAttribute("aria-hidden", open ? "false" : "true");
    }
  } catch (e) {}
}

function getCmdResult(query) {
  query = String(query == null ? "" : query);
  if (_cmdCachedResult && _cmdCachedQuery === query) return _cmdCachedResult;
  _cmdCachedQuery = query;
  _cmdCachedResult = buildAllResults(query);
  return _cmdCachedResult;
}

function invalidateCmdCache() {
  _cmdCachedQuery = null;
  _cmdCachedResult = null;
}

function invalidateUniversalSearchIndex() {
  _cmdIndexCache = null;
  _cmdIndexSignature = "";
  _cmdCachedQuery = null;
  _cmdCachedResult = null;
}

function cmdNow() {
  try { return performance.now(); } catch (e) { return Date.now(); }
}

function cmdArray(value) {
  return Array.isArray(value) ? value : [];
}

function cmdObjectKeys(value) {
  try { return value && typeof value === "object" ? Object.keys(value) : []; } catch (e) { return []; }
}

function cmdDataSignature() {
  const st = cmdState() || {};
  const profile = cmdProfile();
  let activeWorkspace = "";
  let activeFlow = "";
  try { activeWorkspace = localStorage.getItem("ethone:active-workspace") || localStorage.getItem("ethone:active-space-id") || ""; } catch (e) {}
  try { activeFlow = window.ETHONEFlow && window.ETHONEFlow.state ? (window.ETHONEFlow.state().activeId || "") : ""; } catch (e) {}
  let fallbackTimelineLength = 0;
  try {
    const raw = localStorage.getItem("ethone:timeline");
    fallbackTimelineLength = raw ? raw.length : 0;
  } catch (e) {}
  return [
    cmdCurrentPage(),
    profile && (profile.id || profile.name || ""),
    activeWorkspace,
    activeFlow,
    cmdArray(st.notes).length,
    cmdArray(st.todos).length,
    cmdArray(st.items).length,
    cmdArray(st.events).length,
    cmdArray(st.habits).length,
    cmdArray(st.databases).length,
    cmdArray(st.timeline).length,
    cmdArray(st.activity).length,
    cmdArray(st.notifications).length,
    cmdArray(st.aiSessions).length,
    cmdArray(st.aiCore && st.aiCore.conversations).length,
    cmdObjectKeys(st.connections).length,
    cmdObjectKeys(st.plugins).length,
    Array.isArray(window.__ethoneWidgetCatalogTypes) ? window.__ethoneWidgetCatalogTypes.length : 0,
    fallbackTimelineLength
  ].join("|");
}

function cmdStableContextKey(context) {
  try { return context ? JSON.stringify(context) : ""; } catch (e) { return ""; }
}

function cmdDedupedItems(items) {
  const seen = new Set();
  return cmdArray(items).filter(function (item) {
    if (!item) return false;
    const key = [item.actionId || item.id || "", item.title || "", cmdStableContextKey(item.context)].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cmdGo(page) {
  if (!page) return;
  if (cmdRun("navigation.open", { page: page })) return;
  if (typeof switchPage === "function") switchPage(page, null);
}

function openCmdPalette(options) {
  options = typeof options === "string" ? { query: options } : (options || {});
  _cmdMode = options.mode === "spotlight" ? "spotlight" : "command";
  const overlay = document.getElementById("cmd-palette-overlay");
  if (!overlay) return false;
  _cmdPreviousFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : _cmdPreviousFocus;
  if (overlay) {
    overlay.classList.add("open");
    overlay.classList.toggle("spotlight-open", _cmdMode === "spotlight");
    overlay.dataset.mode = _cmdMode;
  }
  const input = document.getElementById("cmd-input");
  if (input) {
    input.value = options.query || "";
    input.placeholder = cmdCopy(_cmdMode === "spotlight" ? "placeholderSpotlight" : "placeholderCommand");
    input.setAttribute("aria-label", cmdCopy(_cmdMode === "spotlight" ? "spotlightLabel" : "paletteLabel"));
    input.setAttribute("aria-controls", "cmd-results");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-haspopup", "listbox");
    input.setAttribute("aria-expanded", "true");
    if (!input.dataset.cmdInputBound && !input.getAttribute("oninput")) {
      input.dataset.cmdInputBound = "1";
      input.addEventListener("input", onCmdInput);
    }
  }
  _cmdSelectedIdx = 0;
  invalidateCmdCache();
  setCommandOpenState(true);
  syncCmdChrome();
  renderCmdResults();
  requestAnimationFrame(function () {
    focusCmdInput();
    setTimeout(focusCmdInput, 40);
  });
  return true;
}

function closeCmdPalette() {
  const overlay = document.getElementById("cmd-palette-overlay");
  if (overlay) {
    overlay.classList.remove("open", "spotlight-open");
    overlay.dataset.mode = "";
  }
  if (_cmdRenderFrame) {
    cancelAnimationFrame(_cmdRenderFrame);
    _cmdRenderFrame = 0;
  }
  invalidateCmdCache();
  setCommandOpenState(false);
  const input = document.getElementById("cmd-input");
  if (input) {
    input.value = "";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  if (_cmdPreviousFocus && typeof _cmdPreviousFocus.focus === "function" && document.contains(_cmdPreviousFocus)) {
    try { _cmdPreviousFocus.focus({ preventScroll: true }); } catch (e) {}
  }
}

function focusCmdInput() {
  const input = document.getElementById("cmd-input");
  if (!input || !isCmdOpen()) return false;
  try {
    input.focus({ preventScroll: true });
    if (typeof input.setSelectionRange === "function" && input.value) {
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (typeof input.select === "function") {
      input.select();
    }
  } catch (e) {
    try { input.focus(); } catch (error) {}
  }
  return document.activeElement === input;
}

function openSpotlightSearch(query) {
  openCmdPalette({ mode: "spotlight", query: query || "" });
}

function onCmdInput() {
  invalidateCmdCache();
  if (_cmdRenderFrame) cancelAnimationFrame(_cmdRenderFrame);
  _cmdRenderFrame = requestAnimationFrame(renderCmdResults);
}

function normalizeCmdText(value) {
  return String(value == null ? "" : value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fuzzyScore(text, query) {
  text = normalizeCmdText(text);
  query = normalizeCmdText(query);
  if (!query) return 1;
  if (!text) return 0;
  if (text === query) return 150;

  const direct = text.indexOf(query);
  if (direct >= 0) {
    const boundary = direct === 0 || text.charAt(direct - 1) === " ";
    return (boundary ? 118 : 96) - Math.min(direct, 36);
  }

  let best = 0;
  const words = text.split(/\s+/);
  for (const word of words) {
    if (!word) continue;
    if (word === query) best = Math.max(best, 142);
    else if (word.startsWith(query)) best = Math.max(best, 110 - Math.max(0, word.length - query.length));
    else if (word.includes(query)) best = Math.max(best, 82 - Math.min(word.indexOf(query), 24));
    else if (query.length >= 4 && word.charAt(0) === query.charAt(0) && Math.abs(word.length - query.length) <= 2) {
      const distance = cmdEditDistance(word, query, 2);
      if (distance <= 2) best = Math.max(best, 104 - distance * 18 - Math.abs(word.length - query.length) * 4);
    }
  }

  let qi = 0;
  let score = 0;
  let streak = 0;
  let start = -1;
  let last = -1;
  for (let ti = 0; ti < text.length && qi < query.length; ti += 1) {
    if (text[ti] === query[qi]) {
      if (start < 0) start = ti;
      last = ti;
      streak += 1;
      score += 6 + Math.min(streak, 5) * 2;
      if (ti === 0 || text[ti - 1] === " ") score += 8;
      qi += 1;
    } else {
      streak = 0;
    }
  }
  if (qi !== query.length) return best;
  const span = last >= start ? last - start + 1 : query.length;
  if (query.length >= 4 && best < 50 && span > query.length * 2.2) return best;
  score -= Math.min(start < 0 ? 0 : start, 24);
  score -= Math.max(0, span - query.length) * 1.7;
  score -= Math.max(0, text.length - query.length) * 0.12;
  if (query.length >= 4 && best < 50) return Math.max(best, Math.min(score, 45));
  return Math.max(best, score);
}

function cmdEditDistance(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = [];
  let cur = [];
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prev[j - 2] + 1);
      }
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > limit) return limit + 1;
    const tmp = prev;
    prev = cur;
    cur = tmp;
  }
  return prev[b.length];
}

function scoreMatch(haystack, query) {
  return fuzzyScore(haystack, query);
}

function cmdIntentBoost(doc, query) {
  const q = normalizeCmdText(query || "");
  if (!doc || !q || q.length < 3) return 0;
  const groupBoosts = {
    quickAccess: 160,
    pages: 150,
    settings: 120,
    actions: 110,
    diagnostics: 110
  };
  const boost = groupBoosts[doc.groupKey] || 0;
  if (!boost) return 0;
  if (doc.normalizedTitle === q) return boost + 30;
  const aliases = " " + String(doc.normalizedKeywords || "") + " ";
  return aliases.indexOf(" " + q + " ") >= 0 ? boost : 0;
}

function cmdSearchText(title, sub, keywords) {
  return [title, sub, keywords].map(function (v) { return String(v || ""); }).join(" ");
}

function isCmdItemEnabled(item) {
  if (!item || item.enabled === false || item.comingSoon) return false;
  try {
    const Actions = window.Ethone && window.Ethone.get("actions");
    const actionId = cmdItemActionId(item);
    if (!actionId) return false;
    return Actions ? Actions.isEnabled(actionId, item.context || {}) : true;
  } catch (e) {
    return true;
  }
}

function cmdUnavailableLabel(item) {
  if (item && item.comingSoon) return "Coming Soon";
  return cmdLabel("unavailable", "Unavailable");
}

function buildPageResults() {
  const l = cmdLang();
  const spacesLabel = l === "fr" ? "Espaces" : l === "es" ? "Espacios" : l === "de" ? "Bereiche" : "Workspaces";
  return [
    { id: "search.nav.dashboard", icon: "Home", title: cmdLabel("nav_overview", "Overview"), sub: "ETHONE Home", keywords: "home overview dashboard main personal os brain focus pomodoro" },
    { id: "search.nav.files", icon: "Files", title: cmdLabel("nav_files", "Files"), sub: "Files, links and documents", keywords: "files links documents finder explorer quick look tags favorites recent" },
    { id: "search.nav.notes", icon: "Note", title: cmdLabel("nav_notes", "Notes"), sub: "Notes workspace", keywords: "notes write markdown text documents" },
    { id: "search.nav.todos", icon: "Task", title: cmdLabel("nav_tasks", "Tasks"), sub: "Tasks and todos", keywords: "tasks todos checklist reminders work" },
    { id: "search.nav.kanban", icon: "Board", title: cmdLabel("nav_kanban", "Kanban"), sub: "Workflow board", keywords: "kanban board cards workflow" },
    { id: "search.nav.calendar", icon: "Cal", title: cmdLabel("nav_calendar", "Calendar"), sub: "Events and schedule", keywords: "calendar events schedule agenda meetings" },
    { id: "search.nav.habits", icon: "Loop", title: cmdLabel("nav_habits", "Habits"), sub: "Daily routines", keywords: "habits streak daily routine" },
    { id: "search.nav.gaming", icon: "Game", title: cmdLabel("nav_gaming", "Gaming"), sub: "Gaming stats and sessions", keywords: "gaming valorant riot steam discord spotify twitch" },
    { id: "search.nav.valorantAccounts", icon: "Valo", title: cmdLabel("nav_valorant_accounts", "Valorant Accounts"), sub: "Gaming", keywords: "valorant riot valo accounts" },
    { id: "search.nav.stats", icon: "Stats", title: cmdLabel("nav_stats", "Statistics"), sub: "Analytics", keywords: "stats statistics analytics productivity charts" },
    { id: "search.nav.activity", icon: "Activity", title: "Activity", sub: "ETHONE journal", keywords: "activity timeline history journal logs connexions creations modifications suppressions sync ai plugins github discord spotify workspaces" },
    { id: "search.nav.health", icon: "Health", title: "Health Center", sub: "Diagnostics", keywords: "health diagnostic diagnostics performance memory storage errors integrations api plugins sync status score" },
    { id: "search.nav.versions", icon: "Version", title: "Version History", sub: "Snapshots and restore", keywords: "version history versions snapshots restore rollback compare diff git notion figma backup" },
    { id: "search.nav.github", icon: "Git", title: "GitHub", sub: "Developer activity", keywords: "github git repositories commits developer" },
    { id: "search.connections.open", icon: "Link", title: cmdLabel("nav_connections", "Connections"), sub: "Integration Hub", keywords: "connections integrations discord spotify twitch lastfm github steam google obs youtube battle net" },
    { id: "search.settings.openTab", context: { tab: "profilee" }, icon: "Set", title: cmdLabel("nav_settings", "Settings"), sub: "Preferences", keywords: "settings parameters parametres preferences profile account security password appearance notifications accent theme", priority: 84 },
    { id: "search.brain.open", icon: "AI", title: cmdLabel("nav_ai", "ETHONE AI"), sub: "Ask ETHONE Brain", keywords: "brain ai assistant chat ask ia intelligence" },
    { id: "search.nav.marketplace", icon: "Store", title: "Marketplace", sub: "Verified themes", keywords: "marketplace shop store themes appearance graphite oled" },
    { id: "search.nav.workspaces", icon: "Space", title: spacesLabel, sub: "Workspace switcher", keywords: "workspaces spaces environments context" },
    { id: "search.nav.import", icon: "Import", title: "Import Assistant", sub: "Import Notion, Todoist, CSV, JSON...", keywords: "import assistant notion todoist google calendar discord spotify github csv excel markdown json assistant" },
    { id: "search.databases.home", icon: "Data", title: cmdLabel("nav_databases", "Databases"), sub: "Database Builder", keywords: "database databases table records notion" },
    { id: "search.settings.openTab", context: { tab: "plugins" }, icon: "Plug", title: "Plugins", sub: "Settings", keywords: "plugins integrations extensions discord spotify steam twitch github valorant", priority: 4 }
  ].map(function (entry) { return Object.assign({ category: "pages" }, entry); });
}

function buildQuickActionResults() {
  return [
    { id: "search.notes.create", icon: "Note", title: "Create note", sub: "Start a new note", kbd: "Ctrl+N", keywords: "create note new note write document creer créer nouvelle note ecrire écrire document" },
    { id: "search.todos.create", icon: "Task", title: "Create task", sub: "Add a task to your list", kbd: "Ctrl+Alt+N", keywords: "create task add task new todo reminder creer créer nouvelle tache tâche rappel" },
    { id: "search.items.create", icon: "+", title: "Add file or link", sub: "File, link or folder", kbd: "Ctrl+Alt+F", keywords: "add item file link folder new create ajouter fichier lien dossier creer créer" },
    { id: "search.calendar.create", icon: "Cal", title: "Create event", sub: "Add to calendar", kbd: "Ctrl+Alt+E", keywords: "new event add calendar create meeting schedule creer créer nouvel evenement événement calendrier reunion réunion" },
    { id: "search.theme.change", icon: "Theme", title: "Change theme", sub: "Open Appearance settings", keywords: "change theme appearance accent color density typography background purple" },
    { id: "search.applibrary.open", icon: "Apps", title: "Open App Library", sub: "Search, pin, hide and organize apps", kbd: "Ctrl+Shift+L", keywords: "app library apps applications ios launcher springboard pin hide folder organize" },
    { id: "search.universe.open", icon: "Orbit", title: "Open ETHONE Universe", sub: "Planet navigation for Spaces", kbd: "Ctrl+Shift+U", keywords: "universe planets spaces immersive navigation gaming dev study brain files calendar marketplace settings" },
    { id: "search.briefing.open", icon: "Brief", title: "Open Morning Briefing", sub: "Daily ETHONE summary", keywords: "morning briefing daily summary today tasks events goals spotify github weather quote brain" },
    { id: "search.achievements.open", icon: "Trophy", title: "Open Achievements", sub: "Badges, levels and streaks", keywords: "achievements badges levels streaks trophies tasks focus github spotify workspace" },
    { id: "timeMachine.open", icon: "History", title: "Open Time Machine", sub: "Restore layouts, widgets, settings, notes and workspaces", keywords: "time machine snapshot snapshots restore rollback history layouts widgets settings notes dashboard workspaces" },
    { id: "timeMachine.snapshot", icon: "Save", title: "Create Time Machine snapshot", sub: "Save a restore point now", keywords: "create snapshot save restore point checkpoint time machine backup" },
    { id: "widgets.builder.open", icon: "Widget", title: "Open Widget Builder", sub: "Create a custom dashboard widget without code", keywords: "widget builder custom no code create dashboard card source layout animation action" },
    { id: "search.spotify.launch", icon: "Music", title: "Launch Spotify", sub: "Open Spotify integration", keywords: "launch spotify music play open now playing audio integration" },
    { id: "search.ai.ask", icon: "AI", title: "Ask ETHONE AI", sub: "Open contextual intelligence", keywords: "ask ethone ai brain summarize analyse organize create improve" },
    { id: "search.workspaces.switcher", icon: "Space", title: "Switch workspace", sub: "Open ETHONE Spaces", keywords: "switch workspace spaces personal gaming development study environment" },
    { id: "onboarding.open", icon: "OS", title: "Revoir l'onboarding", sub: "Relancer la premiere configuration ETHONE", keywords: "onboarding first run tutoriel tutorial guide bienvenue setup configuration premiere utilisation" },
    { id: "whatsnew.open", icon: "New", title: "Voir les nouveautes", sub: "Version ETHONE et changelog", keywords: "nouveautes whats new changelog version update release notes mise a jour" },
    { id: "search.nav.import", icon: "Import", title: "Import data", sub: "Notion, Todoist, CSV, JSON...", keywords: "import data assistant notion todoist calendar csv excel markdown json" },
    { id: "search.profile.switch", icon: "User", title: "Switch profile", sub: "Profile select", keywords: "switch profile change user" },
    { id: "search.presentation.open", icon: "TV", title: "Presentation mode", sub: "Full-screen dashboard on TV", kbd: "P", keywords: "presentation tv fullscreen mode" },
    { id: "search.language.toggle", icon: "Lang", title: "Toggle language", sub: "FR/EN/ES/DE", keywords: "language toggle fr en es de" },
    { id: "inspector.open", icon: "Dev", title: "Open Inspector", sub: "Developer diagnostics", kbd: "Ctrl+Shift+I", keywords: "developer inspector diagnostics debug fps console modules listeners timers observers performance" },
    { id: "inspector.diagnostic.run", icon: "Scan", title: "Run Full Diagnostic", sub: "QA report and repair tools", keywords: "diagnostic qa report bugs runtime sidebar overlays console warnings errors export json" }
  ].filter(function (entry) {
    return cmdExperimentalEnabled() || [
      "search.applibrary.open",
      "search.universe.open",
      "search.briefing.open",
      "search.achievements.open",
      "widgets.builder.open"
    ].indexOf(entry.id) === -1;
  }).map(function (entry) { return Object.assign({ category: "actions" }, entry); });
}

function buildQuickAccessResults() {
  return [
    { id: "search.nav.dashboard", icon: "layout-dashboard", title: cmdLabel("nav_overview", "Dashboard"), sub: "ETHONE Home", badge: "Pinned", keywords: "quick access dashboard home overview", priority: 120 },
    { id: "search.brain.open", icon: "brain", title: cmdLabel("nav_ai", "ETHONE AI"), sub: "Brain and contextual intelligence", badge: "Pinned", keywords: "quick access brain ai ethone assistant", priority: 116 },
    { id: "search.settings.openTab", context: { tab: "profilee" }, icon: "settings", title: cmdLabel("nav_settings", "Settings"), sub: "Preferences and appearance", badge: "Pinned", keywords: "quick access settings preferences appearance theme", priority: 112 },
    { id: "search.nav.notes", icon: "notebook-pen", title: cmdLabel("nav_notes", "Notes"), sub: "Workspace notes", badge: "Pinned", keywords: "quick access notes note notebook writing", priority: 108 },
    { id: "search.nav.marketplace", icon: "store", title: "Marketplace", sub: "Verified themes", badge: "Pinned", keywords: "quick access marketplace store themes appearance", priority: 104 },
    { id: "flow.open", icon: "workflow", title: "Flows", sub: "Change working context", badge: "Pinned", keywords: "quick access flows smart flow context", priority: 100 }
  ].map(function (entry) { return Object.assign({ category: "quickAccess" }, entry); });
}

function buildRecentSearchResults(query) {
  const store = cmdReadStore();
  return (store.searches || []).slice(0, CMD_SEARCH_LIMIT).map(function (entry) {
    const search = String(entry.query || "").trim();
    if (!search) return null;
    return {
      id: "command.search.replay",
      actionId: "command.search.replay",
      context: { query: search },
      category: "recentSearches",
      icon: "search",
      title: search,
      sub: "Recent search",
      badge: "Search",
      keywords: [search, "recent search command palette"].join(" "),
      priority: 44
    };
  }).filter(Boolean);
}

function buildContextResults(query) {
  const page = cmdCurrentPage();
  const pageLabel = cmdPageLabel(page);
  let os = null;
  try { os = window.ETHONEOSContext && window.ETHONEOSContext.snapshot ? window.ETHONEOSContext.snapshot() : null; } catch (e) {}
  const common = [
    { id: "cmd.context.openBrain", actionId: "brain.open", icon: "AI", title: "Ask Brain about this page", sub: "Context: " + pageLabel, keywords: "brain ai context summarize analyze help page current", priority: 88 },
    { id: "cmd.context.notifications", actionId: "notifications.open", icon: "Bell", title: "Open Notification Center", sub: "Notifications and activity", keywords: "notifications alerts center unread activity", priority: 40 }
  ];
  if (os && os.mode) {
    common.unshift({
      id: "cmd.context.osMode",
      actionId: "brain.open",
      icon: "sparkles",
      title: "Ask Brain about " + os.mode.label,
      sub: os.summary || "Current ETHONE OS context",
      keywords: ["brain os context", os.mode.id, os.mode.label, os.summary || ""].join(" "),
      priority: 122
    });
  }
  const byPage = {
    dashboard: [
      { id: "cmd.dashboard.addWidget", actionId: "widgets.add", icon: "Widget", title: "Add widget", sub: "Dashboard", keywords: "dashboard add widget widgets panel", priority: 118 },
      { id: "cmd.dashboard.edit", actionId: "dashboard.edit.toggle", icon: "Layout", title: "Edit dashboard", sub: "Customize cards and widgets", keywords: "edit dashboard customize layout widgets", priority: 114 },
      { id: "cmd.dashboard.space", actionId: "spaces.open", icon: "Space", title: "Change Space", sub: "Switch workspace context", keywords: "space workspace switch environment", priority: 104 },
      { id: "cmd.dashboard.flow", actionId: "flow.open", icon: "Flow", title: "Change Flow", sub: "Transform current context", keywords: "flow smart flow context gaming development study", priority: 98 },
      { id: "cmd.dashboard.widgets", actionId: "widgets.open", icon: "Panel", title: "Open Widgets panel", sub: "Live widgets", keywords: "widgets panel live dashboard", priority: 92 }
    ],
    notes: [
      { id: "cmd.notes.new", actionId: "notes.new", icon: "Note", title: "New note", sub: "Create a note", keywords: "new note create write", priority: 118 },
      { id: "cmd.notes.search", actionId: "command.notes.search", icon: "Search", title: "Search notes", sub: "Focus notes search", keywords: "search notes find note", priority: 106 },
      { id: "cmd.notes.summary", actionId: "command.notes.summarize", icon: "AI", title: "Summarize with ETHONE AI", sub: "Ask Brain to summarize notes", keywords: "summarize notes brain ai summary", priority: 96 },
      { id: "cmd.notes.export", actionId: "command.notes.export", icon: "Export", title: "Export notes", sub: "Open export settings", keywords: "export notes backup markdown json", priority: 84 }
    ],
    settings: [
      { id: "cmd.settings.theme", actionId: "theme.open", icon: "Theme", title: "Change theme", sub: "Appearance", keywords: "theme appearance dark accent color", priority: 118 },
      { id: "cmd.settings.accent", actionId: "command.settings.accent", icon: "Color", title: "Change accent color", sub: "Appearance settings", keywords: "accent color purple appearance theme", priority: 112 },
      { id: "cmd.settings.appearance", actionId: "settings.tab.open", context: { tab: "theme" }, icon: "Set", title: "Open Appearance", sub: "Settings", keywords: "appearance theme density blur glow typography", priority: 104 },
      { id: "cmd.settings.notifications", actionId: "settings.tab.open", context: { tab: "notifications" }, icon: "Bell", title: "Open Notifications", sub: "Settings", keywords: "notifications alerts quiet hours", priority: 100 },
      { id: "cmd.settings.inspector", actionId: "inspector.open", icon: "Dev", title: "Open Inspector", sub: "Developer diagnostics", keywords: "inspector diagnostic developer fps console", priority: 94 }
    ],
    ai: [
      { id: "cmd.ai.newChat", actionId: "command.ai.newChat", icon: "AI", title: "New AI chat", sub: "ETHONE AI", keywords: "new chat ai brain conversation", priority: 118 },
      { id: "cmd.ai.provider", actionId: "settings.tab.open", context: { tab: "brain" }, icon: "Server", title: "Change provider", sub: "Brain & AI settings", keywords: "provider openai claude groq gemini model brain ai", priority: 106 },
      { id: "cmd.ai.model", actionId: "settings.tab.open", context: { tab: "brain" }, icon: "Model", title: "Change model", sub: "Brain & AI settings", keywords: "model provider ai brain", priority: 102 },
      { id: "cmd.ai.memory", actionId: "command.ai.memory", icon: "Memory", title: "Open memory", sub: "Brain context", keywords: "memory brain context preferences", priority: 92 },
      { id: "cmd.ai.plugins", actionId: "settings.tab.open", context: { tab: "plugins" }, icon: "Plug", title: "Open AI plugins", sub: "Integrations & plugins", keywords: "plugins ai mcp tools providers", priority: 88 }
    ],
    marketplace: [
      { id: "cmd.marketplace.searchPlugins", actionId: "command.marketplace.plugins", icon: "Ext", title: "Manage plugins", sub: "Settings", keywords: "manage plugins settings extensions", priority: 118 },
      { id: "cmd.marketplace.themes", actionId: "command.marketplace.themes", icon: "Theme", title: "Open themes", sub: "Theme Marketplace", keywords: "themes theme marketplace appearance", priority: 102 },
      { id: "cmd.marketplace.integrations", actionId: "settings.tab.open", context: { tab: "plugins" }, icon: "Plug", title: "Open integrations", sub: "Settings", keywords: "integrations connections plugins discord spotify github", priority: 94 }
    ],
    files: [
      { id: "cmd.files.new", actionId: "files.new", icon: "File", title: "Add file or link", sub: "Files", keywords: "add file link folder upload", priority: 118 },
      { id: "cmd.files.search", actionId: "command.files.search", icon: "Search", title: "Search files", sub: "Focus file search", keywords: "search files documents links finder", priority: 104 },
      { id: "cmd.files.ai", actionId: "search.ai.ask", icon: "AI", title: "Classify with ETHONE AI", sub: "File context", keywords: "ai classify organize files documents", priority: 82 }
    ],
    todos: [
      { id: "cmd.tasks.new", actionId: "tasks.new", icon: "Task", title: "New task", sub: "Tasks", keywords: "new task todo create", priority: 118 },
      { id: "cmd.tasks.search", actionId: "command.tasks.search", icon: "Search", title: "Search tasks", sub: "Focus task search", keywords: "search tasks todos find", priority: 104 },
      { id: "cmd.tasks.ai", actionId: "search.ai.ask", icon: "AI", title: "Create subtasks with Brain", sub: "Task context", keywords: "ai subtasks tasks brain plan", priority: 92 }
    ]
  };
  if (page === "tasks") byPage.tasks = byPage.todos;
  const pageItems = (byPage[page] || []).concat(common);
  return pageItems.map(function (entry) {
    return Object.assign({
      category: "context",
      badge: pageLabel,
      keywords: [entry.keywords, page, pageLabel, "contextual command current page"].join(" ")
    }, entry);
  });
}

function buildStoredCommandResults(kind, query) {
  const store = cmdReadStore();
  const entries = kind === "frequent"
    ? Object.keys(store.frequent || {}).map(function (key) { return store.frequent[key]; }).sort(function (a, b) {
        return (b.count || 0) - (a.count || 0) || (b.last || 0) - (a.last || 0);
      })
    : kind === "favorites"
      ? (store.favorites || [])
      : (store.recent || []);
  return (entries || []).slice(0, kind === "recent" ? CMD_RECENT_LIMIT : CMD_FREQUENT_LIMIT).map(function (entry) {
    const item = entry.item || entry;
    if (!item || !item.id) return null;
    return Object.assign({}, item, {
      category: kind,
      badge: kind === "frequent" && entry.count ? entry.count + "x" : cmdCategoryLabel(item.category || "actions"),
      priority: (item.priority || 0) + (kind === "recent" ? 20 : kind === "frequent" ? Math.min(30, entry.count || 0) : 10),
      keywords: [item.keywords, item.title, item.sub, kind, "recent frequent favorite command"].join(" ")
    });
  }).filter(Boolean);
}

function buildFlowResults(query) {
  if (!query) return [];
  let flows = [];
  try {
    if (window.ETHONEFlow && typeof window.ETHONEFlow.flows === "function") flows = window.ETHONEFlow.flows();
  } catch (e) {}
  if (!Array.isArray(flows) || !flows.length) {
    flows = [
      { id: "personal", name: "Personal Flow", description: "Journal, tasks, notes and calm planning.", icon: "Home" },
      { id: "development", name: "Development Flow", description: "GitHub, AI, notes and focus context.", icon: "Code" },
      { id: "gaming", name: "Gaming Flow", description: "Discord, Spotify, Valorant and Steam context.", icon: "Game" },
      { id: "study", name: "Study Flow", description: "Notes, calendar, focus timer and Brain.", icon: "Book" }
    ];
  }
  return flows.map(function (flow) {
    return {
      id: "cmd.flow." + (flow.id || flow.name),
      actionId: "flow.open",
      context: { flow: flow.id },
      category: "flows",
      icon: flow.icon || "Flow",
      title: flow.name || flow.label || flow.id || "ETHONE Flow",
      sub: flow.description || "Smart workspace context",
      keywords: [flow.id, flow.name, flow.description, flow.category, "flow smart flow workspace context gaming development study streaming"].join(" ")
    };
  });
}

function buildWorkspaceResults(query) {
  if (!query) return [];
  const profile = cmdProfile();
  let list = Array.isArray(profile?.workspaces) ? profile.workspaces : [];
  try {
    if (!list.length) {
      const cachedName = localStorage.getItem("ethone:active-workspace") || localStorage.getItem("ethone:active-space-id") || "";
      if (cachedName) list = [{ id: localStorage.getItem("ethone:active-workspace-id") || "active", name: cachedName, description: "Current ETHONE Space" }];
    }
  } catch (e) {
    if (!list) list = [];
  }
  return (Array.isArray(list) ? list : []).map(function (workspace) {
    return {
      id: "search.workspace.open",
      context: { workspaceId: workspace.id },
      category: "workspaces",
      icon: workspace.emoji || "Space",
      title: workspace.name || workspace.label || "Workspace",
      sub: workspace.description || "ETHONE Space",
      keywords: [workspace.name, workspace.label, workspace.description, workspace.template, "workspace space environment"].join(" ")
    };
  });
}

function buildIntegrationResults(query) {
  if (!query) return [];
  return cmdIntegrationDefs().map(function (integration) {
    return {
      id: "search.integration.open",
      context: { integrationId: integration.id },
      category: "integrations",
      icon: "Plug",
      title: integration.title,
      sub: integration.sub || "Integration",
      keywords: integration.keywords
    };
  });
}

function cmdIntegrationDefs() {
  const byId = new Map();
  CMD_INTEGRATIONS.forEach(function (integration) {
    byId.set(integration.id, Object.assign({}, integration));
  });
  try {
    const hubDefs = window.ethoneIntegrationHub
      ? (typeof window.ethoneIntegrationHub.defs === "function" ? window.ethoneIntegrationHub.defs() : window.ethoneIntegrationHub.defs)
      : [];
    hubDefs.forEach(function (def) {
      byId.set(def.id, {
        id: def.id,
        title: def.name || def.id,
        sub: def.placeholder ? "Integration ready" : "Integration",
        keywords: [def.id, def.name, def.desc, (def.preview || []).join(" "), "integration connection settings widgets plugins marketplace"].join(" ")
      });
    });
  } catch (e) {}
  return Array.from(byId.values());
}

function buildIntegrationActionResults(query) {
  if (!query) return [];
  const q = normalizeCmdText(query);
  const allMode = query === CMD_INDEX_SENTINEL;
  const matched = (allMode ? cmdIntegrationDefs() : cmdIntegrationDefs().filter(function (integration) {
    return scoreMatch([integration.title, integration.id, integration.keywords].join(" "), q) >= (q.length <= 3 ? 30 : 54);
  })).slice(0, allMode ? 12 : 4);
  const out = [];
  matched.forEach(function (integration) {
    CMD_INTEGRATION_ACTIONS.forEach(function (action, actionIndex) {
      out.push({
        id: action.id,
        context: { integrationId: integration.id, widgetType: integration.id, query: integration.title },
        category: "contextActions",
        icon: action.suffix === "disconnect" ? "Off" : action.suffix === "widget" || action.suffix === "dashboard" ? "Widget" : "Go",
        title: action.title.replace("{name}", integration.title),
        sub: action.sub,
        badge: integration.title,
        keywords: [integration.title, integration.id, action.title.replace("{name}", integration.title), action.keywords].join(" "),
        priority: action.priority || (22 - actionIndex)
      });
    });
  });
  return out;
}

function buildPluginResults(query) {
  if (!query) return [];
  return cmdIntegrationDefs().map(function (plugin) {
    return {
      id: "search.plugin.open",
      context: { pluginId: plugin.id },
      category: "plugins",
      icon: "Ext",
      title: plugin.title,
      sub: "Plugin",
      keywords: plugin.keywords + " extension plugin marketplace store"
    };
  });
}

function widgetDefinitions() {
  const seen = new Set();
  const out = [];
  const registry = window.Ethone && window.Ethone.get && window.Ethone.get("widgets");
  const types = Array.isArray(window.__ethoneWidgetCatalogTypes) ? window.__ethoneWidgetCatalogTypes : [];
  types.forEach(function (type) {
    if (seen.has(type)) return;
    seen.add(type);
    let def = null;
    try { def = registry && registry.get ? registry.get(type) : null; } catch (e) {}
    out.push([type, (def && def.label) || type, [type, def && def.category, "widget dashboard"].join(" ")]);
  });
  CMD_WIDGET_FALLBACKS.forEach(function (row) {
    if (!seen.has(row[0])) {
      seen.add(row[0]);
      out.push(row);
    }
  });
  return out;
}

function buildWidgetResults(query) {
  if (!query) return [];
  return widgetDefinitions().map(function (row) {
    return {
      id: "search.widget.open",
      context: { widgetType: row[0] },
      category: "widgets",
      icon: "Widget",
      title: row[1],
      sub: "Widget",
      keywords: row[2]
    };
  });
}

function buildNoteResults(query) {
  if (!query) return [];
  const profile = cmdProfile();
  return (profile?.state?.notes || []).map(function (note) {
    return {
      id: "search.notes.open",
      context: { noteId: note.id },
      category: "notes",
      icon: "Note",
      title: note.title || "Untitled",
      sub: (note.content || "").slice(0, 70) || "Note",
      keywords: [note.content, note.tag, note.color, "note notes document"].join(" ")
    };
  });
}

function buildTaskResults(query) {
  if (!query) return [];
  const profile = cmdProfile();
  return (profile?.state?.todos || []).map(function (task) {
    return {
      id: "search.todos.open",
      context: { todoId: task.id },
      category: "tasks",
      icon: task.done ? "Done" : "Task",
      title: task.text || task.title || "Untitled",
      sub: task.done ? "Done" : (task.due ? "Due " + task.due : "Task"),
      keywords: [task.tag, task.priority, task.description, "task todo reminder"].join(" ")
    };
  });
}

function itemToCmdResult(item) {
  return {
    id: "search.items.open",
    context: { itemId: item.id },
    category: "files",
    icon: item.type === "link" ? "Link" : item.type === "folder" ? "Folder" : item.type === "image" ? "Img" : "File",
    title: item.name || "Untitled",
    sub: item.url || item.meta || item.type || "File",
    keywords: [item.tag, item.meta, item.type, item.url, "file files document link image folder"].join(" ")
  };
}

function buildItemResults(query) {
  const profile = cmdProfile();
  return (profile?.state?.items || []).map(itemToCmdResult);
}

function buildHabitResults(query) {
  if (!query) return [];
  const profile = cmdProfile();
  return (profile?.state?.habits || []).map(function (habit) {
    return {
      id: "search.habits.open",
      category: "habits",
      icon: "Loop",
      title: habit.name || "Untitled",
      sub: "Habit" + (habit.streak ? " - " + habit.streak + " day streak" : ""),
      keywords: [habit.icon, habit.name, "habit routine streak"].join(" ")
    };
  });
}

function buildEventResults(query) {
  if (!query) return [];
  const profile = cmdProfile();
  return (profile?.state?.events || []).map(function (event) {
    return {
      id: "search.calendar.open",
      context: { date: event.date },
      category: "calendar",
      icon: "Cal",
      title: event.title || "Untitled",
      sub: event.date || "Event",
      keywords: [event.title, event.date, event.time, "calendar event meeting schedule"].join(" ")
    };
  });
}

function buildSettingsResults(query) {
  if (!query) return [];
  return [
    { tab: "profilee", label: "Profile", keywords: "profile avatar name general account" },
    { tab: "account", label: "Account", keywords: "account email username session sign out" },
    { tab: "theme", label: "Appearance", keywords: "theme appearance color accent radius blur glow typography density background" },
    { tab: "workspaces", label: "Workspaces", keywords: "workspaces spaces layout wallpaper accent" },
    { tab: "widgets", label: "Dashboard widgets", keywords: "widgets dashboard layout cards clock calendar discord spotify github weather" },
    { tab: "brain", label: "Brain & AI", keywords: "brain ai provider model openai claude groq gemini memory" },
    { tab: "automation", label: "Automation", keywords: "automation rules reminders workflows shortcuts" },
    { tab: "marketplace", label: "Marketplace", keywords: "marketplace store themes appearance" },
    { tab: "plugins", label: "Integrations & plugins", keywords: "plugins integrations discord spotify steam twitch github valorant" },
    { tab: "notifications", label: "Notifications", keywords: "notifications alerts quiet hours center reminders" },
    { tab: "keyboard", label: "Keyboard shortcuts", keywords: "keyboard shortcuts hotkeys ctrl command search" },
    { tab: "backup", label: "Backup & sync", keywords: "backup sync restore cloud import export" },
    { tab: "importx", label: "Import", keywords: "import data json restore" },
    { tab: "exportx", label: "Export", keywords: "export data json backup" },
    { tab: "security", label: "Security", keywords: "security password pin two factor sessions tokens" },
    { tab: "developer", label: "Developer", keywords: "developer debug console logs workers supabase" },
    { tab: "experimental", label: "Experimental", keywords: "experimental beta flags labs", experimental: true }
  ].filter(function (entry) {
    return !entry.experimental || cmdExperimentalEnabled();
  }).map(function (entry) {
    return {
      id: "search.settings.openTab",
      context: { tab: entry.tab },
      category: "settings",
      icon: "Set",
      title: entry.label,
      sub: "Settings",
      keywords: entry.keywords
    };
  });
}

function buildDatabaseResults(query) {
  if (!query) return [];
  let databases = [];
  try {
    if (typeof dbList === "function") databases = dbList();
    else databases = cmdState().databases || [];
  } catch (e) {
    databases = cmdState().databases || [];
  }
  return (Array.isArray(databases) ? databases : []).map(function (db) {
    return {
      id: "search.databases.open",
      context: { dbId: db.id },
      category: "databases",
      icon: "Data",
      title: db.name || "Untitled",
      sub: (db.rows ? db.rows.length : 0) + " rows",
      keywords: [db.name, db.description, (db.columns || []).map(function (col) { return col.name || col.key || ""; }).join(" "), "database table records notion builder"].join(" ")
    };
  });
}

function buildThemeResults(query) {
  if (!query || typeof THEMES === "undefined") return [];
  return THEMES.map(function (theme, index) {
    return {
      id: "search.theme.pick",
      context: { themeIdx: index },
      category: "themes",
      icon: "Theme",
      title: "Theme: " + theme.name,
      sub: "Switch accent color",
      keywords: "theme color accent appearance " + theme.name
    };
  });
}

function buildMarketplaceResults(query) {
  if (!query) return [];
  let items = [];
  try {
    if (window.ETHONEMarketplace && typeof window.ETHONEMarketplace.catalog === "function") {
      items = items.concat(window.ETHONEMarketplace.catalog().map(function (entry) {
        return {
          source: "marketplace",
          id: entry.id,
          title: entry.title || entry.name || entry.id,
          category: entry.category || "Marketplace",
          description: entry.description || entry.desc || "",
          tags: Array.isArray(entry.tags) ? entry.tags.join(" ") : "",
          author: entry.author || "",
          rating: entry.rating || ""
        };
      }));
    }
  } catch (e) {}
  try {
    if (window.ETHONEWidgetMarketplace && typeof window.ETHONEWidgetMarketplace.catalog === "function") {
      items = items.concat(window.ETHONEWidgetMarketplace.catalog().map(function (entry) {
        return {
          source: "widget-marketplace",
          id: entry.type || entry.id,
          title: entry.title || entry.label || entry.name || entry.type,
          category: entry.category || "Widgets",
          description: entry.description || entry.desc || "",
          tags: [entry.type, entry.kind, "widget dashboard marketplace"].join(" "),
          author: entry.author || "ETHONE"
        };
      }));
    }
  } catch (e) {}
  if (!items.length) {
    items = CMD_MARKETPLACE_FALLBACKS.map(function (row) {
      return { source: "fallback", id: row[0], title: row[1], category: row[2], description: row[3], tags: row[4], author: "ETHONE" };
    });
  }
  const seen = new Set();
  return items.filter(function (entry) {
    const key = entry.source + ":" + entry.id;
    if (!entry.id || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(function (entry) {
    return {
      id: "search.marketplace.openItem",
      context: { itemId: entry.id, query: entry.title, category: entry.category, source: entry.source },
      category: "marketplace",
      icon: entry.category === "Themes" ? "Theme" : entry.category === "Plugins" ? "Ext" : "Store",
      title: entry.title,
      sub: entry.category + (entry.author ? " - " + entry.author : ""),
      badge: entry.source === "widget-marketplace" ? "Widget Store" : "Marketplace",
      keywords: [entry.title, entry.category, entry.description, entry.tags, entry.author, "marketplace store install rating version changelog"].join(" ")
    };
  });
}

function buildAIConversationResults(query) {
  if (!query) return [];
  const st = cmdState();
  const out = [];
  (Array.isArray(st.aiSessions) ? st.aiSessions : []).forEach(function (session) {
    const messages = Array.isArray(session.messages) ? session.messages : [];
    const last = messages[messages.length - 1] || {};
    out.push({
      id: "search.ai.conversation.open",
      context: { sessionId: session.id, source: "legacy" },
      category: "ai",
      icon: "AI",
      title: session.title || session.preview || "AI conversation",
      sub: session.ts ? new Date(session.ts).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Saved chat",
      keywords: [session.title, session.preview, last.content, messages.map(function (m) { return m.content || ""; }).slice(-4).join(" "), "ai conversation brain chat history"].join(" ")
    });
  });
  const core = st.aiCore || {};
  (Array.isArray(core.conversations) ? core.conversations : []).forEach(function (conversation) {
    out.push({
      id: "search.ai.conversation.open",
      context: { conversationId: conversation.id, source: "core" },
      category: "ai",
      icon: "AI",
      title: conversation.input || "Brain request",
      sub: [conversation.provider, conversation.model, conversation.origin].filter(Boolean).join(" - ") || "AI Core",
      keywords: [conversation.input, conversation.context, conversation.provider, conversation.model, conversation.origin, "ai core brain conversation provider"].join(" ")
    });
  });
  return out.slice(-40);
}

function buildHistoryResults(query) {
  if (!query) return [];
  let entries = [];
  try {
    if (window.ETHONETimeline && typeof window.ETHONETimeline.items === "function") entries = window.ETHONETimeline.items();
  } catch (e) {}
  if (!Array.isArray(entries) || !entries.length) {
    const st = cmdState();
    entries = cmdArray(st.timeline).length ? cmdArray(st.timeline) : cmdArray(st.activity);
  }
  if (!Array.isArray(entries) || !entries.length) {
    try { entries = JSON.parse(localStorage.getItem("ethone:timeline") || "[]"); } catch (e) { entries = []; }
  }
  return cmdArray(entries).slice(0, 90).map(function (entry) {
    const title = entry.title || entry.text || entry.message || "Activity";
    const body = entry.body || entry.sub || entry.source || entry.category || "";
    const ts = entry.ts || entry.createdAt || entry.time || "";
    return {
      id: "search.nav.activity",
      category: "history",
      icon: entry.icon || "History",
      title: title,
      sub: body || "ETHONE history",
      detail: ts ? new Date(ts).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "",
      badge: entry.category || "History",
      keywords: [title, body, entry.category, entry.source, entry.time, entry.workspace && entry.workspace.name, "history timeline activity recent actions journal"].join(" ")
    };
  });
}

function buildNotificationResults(query) {
  if (!query) return [];
  const st = cmdState();
  const notifications = Array.isArray(st.notifications) ? st.notifications : [];
  return notifications.slice(-40).map(function (notification) {
    return {
      id: "notifications.open",
      category: "notifications",
      icon: notification.icon || "Bell",
      title: notification.title || notification.message || "Notification",
      sub: notification.body || notification.sub || notification.category || "Notification",
      detail: notification.createdAt ? new Date(notification.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
      keywords: [notification.title, notification.message, notification.body, notification.category, notification.source, "notification alert reminder activity"].join(" ")
    };
  });
}

function buildDiagnosticResults(query) {
  if (!query) return [];
  return [
    { id: "inspector.open", category: "diagnostics", icon: "Dev", title: "Open Inspector", sub: "Runtime, FPS, modules and console", keywords: "inspector developer diagnostic diagnostics runtime fps modules console warnings errors", priority: 100 },
    { id: "inspector.diagnostic.run", category: "diagnostics", icon: "Scan", title: "Run Full Diagnostic", sub: "Audit sidebar, overlays, pages and errors", keywords: "run full diagnostic qa audit sidebar overlays buttons errors warnings", priority: 96 },
    { id: "health.open", category: "diagnostics", icon: "Health", title: "Open Health Center", sub: "Application health score", keywords: "health center score memory cpu api plugins errors performance", priority: 80 }
  ];
}

function cmdCategoryLabel(category) {
  const map = {
    context: "Suggested here",
    quickAccess: "Quick Access",
    recent: "Recent",
    recentSearches: "Recent Searches",
    frequent: "Frequent",
    favorites: "Favorites",
    actions: cmdLabel("cmd_actions", "Actions"),
    contextActions: "Smart actions",
    pages: cmdLabel("cmd_pages", "Pages"),
    integrations: cmdLabel("integrations", "Integrations"),
    settings: cmdLabel("nav_settings", "Settings"),
    notes: cmdLabel("nav_notes", "Notes"),
    tasks: cmdLabel("nav_tasks", "Tasks"),
    files: cmdLabel("cmd_files", "Files"),
    widgets: "Widgets",
    plugins: "Plugins",
    habits: cmdLabel("nav_habits", "Habits"),
    calendar: cmdLabel("nav_calendar", "Calendar"),
    databases: cmdLabel("nav_databases", "Databases"),
    workspaces: "Workspaces",
    flows: "Flows",
    themes: "Themes",
    diagnostics: "Diagnostics",
    notifications: "Notifications",
    history: "History",
    marketplace: "Marketplace",
    ai: "AI Conversations"
  };
  return cmdCategoryCopy(category, map[category] || category);
}

function cmdUniversalGroupDefs() {
  const all = CMD_INDEX_SENTINEL;
  return [
    { key: "context", items: buildContextResults(all), cap: 8 },
    { key: "quickAccess", items: buildQuickAccessResults(), cap: 8 },
    { key: "recent", items: buildStoredCommandResults("recent", all), cap: 6 },
    { key: "recentSearches", items: buildRecentSearchResults(all), cap: 5 },
    { key: "frequent", items: buildStoredCommandResults("frequent", all), cap: 6 },
    { key: "favorites", items: buildStoredCommandResults("favorites", all), cap: 6 },
    { key: "actions", items: buildQuickActionResults(), cap: 10 },
    { key: "pages", items: buildPageResults(), cap: 9 },
    { key: "settings", items: buildSettingsResults(all), cap: 8 },
    { key: "flows", items: buildFlowResults(all), cap: 8 },
    { key: "workspaces", items: buildWorkspaceResults(all), cap: 8 },
    { key: "diagnostics", items: buildDiagnosticResults(all), cap: 6 },
    { key: "notifications", items: buildNotificationResults(all), cap: 6 },
    { key: "history", items: buildHistoryResults(all), cap: 8 },
    { key: "integrations", items: buildIntegrationResults(all), cap: 10 },
    { key: "widgets", items: buildWidgetResults(all), cap: 10 },
    { key: "contextActions", items: buildIntegrationActionResults(all), cap: 10 },
    { key: "marketplace", items: buildMarketplaceResults(all), cap: 10 },
    { key: "plugins", items: buildPluginResults(all), cap: 10 },
    { key: "notes", items: buildNoteResults(all), cap: 8 },
    { key: "tasks", items: buildTaskResults(all), cap: 8 },
    { key: "files", items: buildItemResults(all), cap: 8 },
    { key: "habits", items: buildHabitResults(all), cap: 8 },
    { key: "calendar", items: buildEventResults(all), cap: 8 },
    { key: "databases", items: buildDatabaseResults(all), cap: 8 },
    { key: "ai", items: buildAIConversationResults(all), cap: 8 },
    { key: "themes", items: buildThemeResults(all), cap: 8 }
  ];
}

function cmdGetUniversalIndex() {
  const signature = cmdDataSignature();
  if (_cmdIndexCache && _cmdIndexSignature === signature) return _cmdIndexCache;
  const started = cmdNow();
  const docs = [];
  const sourceStats = {};
  cmdUniversalGroupDefs().forEach(function (group, groupIndex) {
    const groupPriority = CMD_GROUP_PRIORITY[group.key] || 0;
    const items = cmdDedupedItems(group.items);
    sourceStats[group.key] = items.length;
    items.forEach(function (rawItem, itemIndex) {
      const item = Object.assign({ category: group.key }, rawItem);
      if (!item.category) item.category = group.key;
      const searchText = cmdSearchText(item.title, item.sub, item.keywords);
      docs.push({
        item: item,
        groupKey: group.key,
        groupLabel: cmdCategoryLabel(group.key),
        groupPriority: groupPriority,
        groupIndex: groupIndex,
        itemIndex: itemIndex,
        cap: group.cap || 8,
        text: searchText,
        normalizedText: normalizeCmdText(searchText),
        normalizedTitle: normalizeCmdText(item.title || ""),
        normalizedKeywords: normalizeCmdText(item.keywords || "")
      });
    });
  });
  _cmdIndexSignature = signature;
  _cmdIndexCache = {
    docs: docs,
    sourceStats: sourceStats,
    builtAt: Date.now(),
    buildMs: Math.round((cmdNow() - started) * 100) / 100
  };
  _cmdLastSearchStats = Object.assign({}, _cmdLastSearchStats, {
    buildMs: _cmdIndexCache.buildMs,
    indexSize: docs.length
  });
  return _cmdIndexCache;
}

function buildIndexedResults(query) {
  if (cmdCurrentPage() === "login") return buildAuthSurfaceResults(query);
  const started = cmdNow();
  const q = normalizeCmdText(query || "");
  const index = cmdGetUniversalIndex();
  const minScore = q.length <= 2 ? 18 : q.length <= 4 ? 32 : 50;
  const buckets = {};
  const seenGlobal = new Set();

  index.docs.forEach(function (doc) {
    const item = doc.item;
    const base = fuzzyScore(doc.normalizedText, q);
    if (base < minScore) return;
    const exactBoost = doc.normalizedTitle === q ? 30 : 0;
    const titleBoost = doc.normalizedTitle.indexOf(q) === 0 ? 20 : 0;
    const categoryBoost = normalizeCmdText(item.category || doc.groupKey).indexOf(q) === 0 ? 10 : 0;
    const availabilityPenalty = item.comingSoon ? 180 : (isCmdItemEnabled(item) ? 0 : 80);
    const score = base + exactBoost + titleBoost + categoryBoost + cmdIntentBoost(doc, q) + (item.priority || 0) + doc.groupPriority - availabilityPenalty - doc.groupIndex * 0.01 - doc.itemIndex * 0.001;
    const key = [item.actionId || item.id || "", item.title || "", cmdStableContextKey(item.context)].join("|");
    if (seenGlobal.has(key) && score < 145) return;
    seenGlobal.add(key);
    if (!buckets[doc.groupKey]) {
      buckets[doc.groupKey] = { key: doc.groupKey, label: doc.groupLabel, cap: doc.cap, score: score, entries: [] };
    }
    buckets[doc.groupKey].score = Math.max(buckets[doc.groupKey].score, score);
    buckets[doc.groupKey].entries.push({ item: item, score: score });
  });

  const sections = Object.keys(buckets).map(function (key) {
    const bucket = buckets[key];
    bucket.entries.sort(function (a, b) {
      return b.score - a.score || String(a.item.title || "").localeCompare(String(b.item.title || ""));
    });
    return {
      key: bucket.key,
      label: bucket.label,
      score: bucket.score,
      items: bucket.entries.slice(0, bucket.cap).map(function (entry) { return entry.item; })
    };
  }).filter(function (section) { return section.items.length > 0; });

  sections.sort(function (a, b) {
    return b.score - a.score || String(a.label || "").localeCompare(String(b.label || ""));
  });

  const all = [];
  sections.forEach(function (section) { all.push.apply(all, section.items); });
  _cmdLastSearchStats = {
    query: query || "",
    searchMs: Math.round((cmdNow() - started) * 100) / 100,
    buildMs: index.buildMs,
    indexSize: index.docs.length,
    sections: sections.length,
    results: all.length,
    sourceStats: index.sourceStats
  };
  return { sections: sections.map(function (section) { return { key: section.key, label: section.label, items: section.items }; }), all: all };
}

function buildAllResults(query) {
  if (cmdCurrentPage() === "login") return buildAuthSurfaceResults(query);
  const q = normalizeCmdText(query || "");
  if (q) return buildIndexedResults(query || "");
  const contentCap = q ? 7 : 4;
  const groups = [
    { key: "context", items: buildContextResults(q), cap: q ? 8 : 6 },
    { key: "quickAccess", items: buildQuickAccessResults(), cap: q ? 6 : 6 },
    { key: "recent", items: buildStoredCommandResults("recent", q), cap: q ? 5 : 6 },
    { key: "recentSearches", items: buildRecentSearchResults(q), cap: q ? 4 : 5 },
    { key: "frequent", items: buildStoredCommandResults("frequent", q), cap: q ? 5 : 6 },
    { key: "favorites", items: buildStoredCommandResults("favorites", q), cap: 6 },
    { key: "actions", items: buildQuickActionResults(), cap: q ? 8 : 10 },
    { key: "pages", items: buildPageResults(), cap: q ? 8 : 8 },
    { key: "settings", items: buildSettingsResults(q), cap: 8 },
    { key: "flows", items: buildFlowResults(q), cap: 6 },
    { key: "workspaces", items: buildWorkspaceResults(q), cap: 6 },
    { key: "diagnostics", items: buildDiagnosticResults(q), cap: 6 },
    { key: "notifications", items: buildNotificationResults(q), cap: 6 },
    { key: "integrations", items: buildIntegrationResults(q), cap: 8 },
    { key: "widgets", items: buildWidgetResults(q), cap: 8 },
    { key: "contextActions", items: buildIntegrationActionResults(q), cap: q ? 10 : 0 },
    { key: "marketplace", items: buildMarketplaceResults(q), cap: 8 },
    { key: "plugins", items: buildPluginResults(q), cap: 8 },
    { key: "notes", items: buildNoteResults(q), cap: contentCap },
    { key: "tasks", items: buildTaskResults(q), cap: contentCap },
    { key: "files", items: buildItemResults(q), cap: q ? contentCap : 4 },
    { key: "habits", items: buildHabitResults(q), cap: contentCap },
    { key: "calendar", items: buildEventResults(q), cap: contentCap },
    { key: "databases", items: buildDatabaseResults(q), cap: contentCap },
    { key: "ai", items: buildAIConversationResults(q), cap: contentCap },
    { key: "themes", items: buildThemeResults(q), cap: 5 }
  ];

  const sectionEntries = [];

  groups.forEach(function (group, groupIndex) {
    const minScore = !q ? 0 : q.length <= 2 ? 18 : q.length <= 4 ? 32 : 50;
    const groupPriority = CMD_GROUP_PRIORITY[group.key] || 0;
    let scored = group.items.map(function (item) {
      const base = scoreMatch(cmdSearchText(item.title, item.sub, item.keywords), q);
      const titleBoost = q && normalizeCmdText(item.title).startsWith(q) ? 18 : 0;
      const exactBoost = q && normalizeCmdText(item.title) === q ? 26 : 0;
      const match = base + titleBoost;
      const availabilityPenalty = item.comingSoon ? 180 : (isCmdItemEnabled(item) ? 0 : 80);
      return {
        item: item,
        match: match,
        score: match + exactBoost + (item.priority || 0) + groupPriority - availabilityPenalty - groupIndex * 0.01
      };
    }).filter(function (entry) {
      return q ? entry.match >= minScore : entry.score > 0;
    });

    scored.sort(function (a, b) {
      return b.score - a.score || String(a.item.title || "").localeCompare(String(b.item.title || ""));
    });

    if (group.cap) scored = scored.slice(0, group.cap);
    const items = scored.map(function (entry) { return entry.item; });
    if (items.length) {
      sectionEntries.push({
        key: group.key,
        label: cmdCategoryLabel(group.key),
        items: items,
        score: scored.reduce(function (max, entry) { return Math.max(max, entry.score); }, 0) + groupPriority
      });
    }
  });

  sectionEntries.sort(function (a, b) {
    return b.score - a.score || String(a.label || "").localeCompare(String(b.label || ""));
  });
  const sections = sectionEntries.map(function (section) {
    return { key: section.key, label: section.label, items: section.items };
  });
  const all = [];
  sections.forEach(function (section) { all.push.apply(all, section.items); });

  return { sections: sections, all: all };
}

function renderCmdResults() {
  _cmdRenderFrame = 0;
  const input = document.getElementById("cmd-input");
  const query = input ? input.value : "";
  const result = getCmdResult(query);
  const sections = result.sections;
  const all = result.all;
  const container = document.getElementById("cmd-results");
  if (!container) return;
  _cmdSelectedIdx = all.length ? Math.max(0, Math.min(_cmdSelectedIdx, all.length - 1)) : 0;

  if (!all.length) {
    container.innerHTML = '<div class="cmd-empty-state"><i data-lucide="search-x" aria-hidden="true"></i><strong>' + cmdEsc(cmdCopy("noResult")) + '</strong><span>' + cmdEsc(cmdCopy("emptyHelp")) + '</span></div>';
    container.removeAttribute("aria-activedescendant");
    if (input) input.removeAttribute("aria-activedescendant");
    cmdRenderIcons(container);
    return;
  }

  let html = "";
  let index = 0;
  const queryText = normalizeCmdText(query);
  const pageLabel = cmdPageLabel(cmdCurrentPage());
  const favoriteStore = cmdReadStore();
  html += '<div class="cmd-search-summary"><div><strong>' + cmdEsc(queryText ? cmdCopy("resultCount", { count: all.length }) : cmdCopy("universalSearch")) + '</strong><span>' + cmdEsc(queryText ? cmdCopy("searchingContext", { page: pageLabel }) : cmdCopy("suggestedContext", { page: pageLabel })) + '</span></div><span class="cmd-context-pill">' + cmdEsc(pageLabel) + '</span><kbd>Enter</kbd></div>';
  sections.forEach(function (section) {
    html += '<div class="cmd-section-label"><span>' + cmdEsc(section.label) + '</span><small>' + section.items.length + '</small></div>';
    section.items.forEach(function (item) {
      const selected = index === _cmdSelectedIdx;
      const enabled = isCmdItemEnabled(item);
      const optionId = "cmd-option-" + index;
      const actionId = cmdItemActionId(item) || "";
      const status = !enabled ? (item.comingSoon ? "coming-soon" : "disabled") : "ready";
      const pinned = cmdIsFavorite(item, favoriteStore);
      const canPin = item.category !== "recentSearches";
      html += '<div id="' + optionId + '" class="cmd-item' + (selected ? " selected" : "") + (!enabled ? " is-disabled" : "") + '" role="option" aria-selected="' + (selected ? "true" : "false") + '" tabindex="-1" data-category="' + cmdEsc(item.category || section.key) + '" data-action-id="' + cmdEsc(actionId) + '" data-status="' + cmdEsc(status) + '" data-idx="' + index + '" onmousedown="event.preventDefault();executeCmdItem(' + index + ')" onmouseover="_cmdSelectedIdx=' + index + ';renderCmdResults()">' +
        '<div class="cmd-item-icon">' + cmdIconHTML(item, section.key) + '</div>' +
        '<div class="cmd-item-main"><div class="cmd-item-label">' + cmdEsc(item.title) + '</div>' + (item.sub ? '<div class="cmd-item-sub">' + cmdEsc(item.sub) + '</div>' : "") + '</div>' +
        '<div class="cmd-item-meta"><span>' + cmdEsc(item.badge || cmdCategoryLabel(item.category || section.key)) + '</span>' + (item.detail ? '<small>' + cmdEsc(item.detail) + '</small>' : "") + '</div>' +
        (item.kbd ? '<span class="cmd-item-kbd">' + cmdEsc(item.kbd) + '</span>' : "") +
        (!enabled ? '<span class="cmd-item-tag">' + cmdEsc(cmdUnavailableLabel(item)) + '</span>' : "") +
        (canPin ? '<button class="cmd-pin' + (pinned ? " is-pinned" : "") + '" type="button" aria-label="' + cmdEsc(cmdCopy(pinned ? "unpin" : "pin")) + '" title="' + cmdEsc(cmdCopy(pinned ? "unpin" : "pin")) + '" data-cmd-pin-idx="' + index + '" onmousedown="event.preventDefault();event.stopPropagation();" onclick="event.preventDefault();event.stopPropagation();toggleCmdFavorite(' + index + ')"><i data-lucide="star" aria-hidden="true"></i></button>' : "") +
      '</div>';
      index += 1;
    });
  });
  container.innerHTML = html;
  cmdRenderIcons(container);
  try { window.dispatchEvent(new CustomEvent("ethone:command-palette-rendered", { detail: { root: "cmd-results" } })); } catch (e) {}
  const active = container.querySelector(".cmd-item.selected");
  if (active) {
    container.setAttribute("aria-activedescendant", active.id || "");
    if (input) input.setAttribute("aria-activedescendant", active.id || "");
  } else {
    container.removeAttribute("aria-activedescendant");
    if (input) input.removeAttribute("aria-activedescendant");
  }
  if (_cmdKeyboardNav) {
    const selected = container.querySelector(".cmd-item.selected");
    if (selected) selected.scrollIntoView({ block: "nearest" });
  }
  _cmdKeyboardNav = false;
}

function executeCmdItem(index) {
  const input = document.getElementById("cmd-input");
  const result = getCmdResult(input ? input.value : "");
  const item = result.all[index];
  if (!item) return;
  const actionId = cmdItemActionId(item);
  if (!isCmdItemEnabled(item) || !actionId) {
    cmdToast(item.disabledReason || cmdUnavailableLabel(item), "info");
    return;
  }
  cmdRecordUsage(item);
  cmdRecordSearch(input ? input.value : "");
  closeCmdPalette();
  requestAnimationFrame(function () {
    const Actions = cmdActions();
    if (Actions) Actions.dispatch(actionId, Object.assign({ source: "command-palette" }, item.context || {}));
    else if (typeof window.toast === "function") window.toast("Commandes indisponibles pour le moment.", "warning");
  });
}

function handleCmdKey(event) {
  const input = document.getElementById("cmd-input");
  const all = getCmdResult(input ? input.value : "").all;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeCmdPalette();
    return false;
  }
  if (!all.length) {
    if (event.key === "Tab" || event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
    return true;
  }
  if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
    event.preventDefault();
    event.stopPropagation();
    _cmdKeyboardNav = true;
    _cmdSelectedIdx = (_cmdSelectedIdx + 1) % all.length;
    renderCmdResults();
    return false;
  } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
    event.preventDefault();
    event.stopPropagation();
    _cmdKeyboardNav = true;
    _cmdSelectedIdx = (_cmdSelectedIdx - 1 + all.length) % all.length;
    renderCmdResults();
    return false;
  } else if (event.key === "Enter") {
    event.preventDefault();
    event.stopPropagation();
    executeCmdItem(_cmdSelectedIdx);
    return false;
  }
  return true;
}

function openSettingsTab(tab) {
  cmdGo("settings");
  setTimeout(function () {
    let btn = document.querySelector('.settings-nav-item[data-settings-tab="' + tab + '"]');
    if (!btn) {
      btn = Array.prototype.find.call(document.querySelectorAll(".settings-nav-item"), function (node) {
        return String(node.getAttribute("onclick") || "").indexOf("'" + tab + "'") !== -1 ||
          String(node.getAttribute("onclick") || "").indexOf('"' + tab + '"') !== -1;
      });
    }
    if (typeof switchSettingsTab === "function") switchSettingsTab(tab, btn || null);
  }, 60);
}

function focusAIInput() {
  setTimeout(function () { document.getElementById("ai-input")?.focus(); }, 100);
}

function pulseElement(element) {
  if (!element) return;
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  element.classList.add("cmd-highlight-pulse");
  setTimeout(function () { element.classList.remove("cmd-highlight-pulse"); }, 1400);
}

function highlightTodo(id) {
  setTimeout(function () {
    const el = document.querySelector('.todo-item[onclick*="toggleTodo(' + id + ')"],[data-todo-id="' + id + '"]');
    pulseElement(el);
  }, 150);
}

function focusIntegration(id) {
  cmdGo(id === "valorant" ? "connections" : "connections");
  setTimeout(function () {
    const card = document.getElementById("ih-card-" + id);
    pulseElement(card);
  }, 220);
}

function runIntegrationHubAction(id, action) {
  focusIntegration(id);
  if (action === "open" || action === "settings") return;
  setTimeout(function () {
    try {
      const hub = window.ethoneIntegrationHub;
      if (hub && typeof hub[action] === "function") {
        hub[action](id);
        return;
      }
      const selector = '[data-ih-action="' + action + '"][data-ih-id="' + id + '"]';
      const btn = document.querySelector(selector);
      if (btn && !btn.disabled) btn.click();
      else cmdToast("Cette commande ne peut pas etre executee pour cette integration.", "info");
    } catch (e) {
      cmdToast("Impossible d'executer cette action pour le moment.", "error");
    }
  }, 240);
}

function openWidgetSearch(widgetType) {
  openSettingsTab("widgets");
  setTimeout(function () {
    const input = document.getElementById("settings-v2-search-input");
    if (input) {
      input.value = widgetType || "widgets";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, 160);
}

function openServiceWidgetCreator(widgetType, query) {
  try {
    if (window.ETHONEWidgetMarketplace && typeof window.ETHONEWidgetMarketplace.open === "function") {
      window.ETHONEWidgetMarketplace.open();
      setTimeout(function () {
        if (typeof window.ETHONEWidgetMarketplace.search === "function") window.ETHONEWidgetMarketplace.search(query || widgetType || "");
        const input = document.getElementById("wm-search-input");
        if (input) {
          input.value = query || widgetType || "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus({ preventScroll: true });
        }
      }, 180);
      return;
    }
  } catch (e) {}
  openWidgetSearch(widgetType);
}

function addWidgetToDashboard(widgetType) {
  cmdGo("dashboard");
  setTimeout(function () {
    const Actions = cmdActions();
    let widgetExists = false;
    try {
      const registry = window.Ethone && window.Ethone.get && window.Ethone.get("widgets");
      widgetExists = !!(registry && typeof registry.get === "function" && registry.get(widgetType));
    } catch (e) {}
    if (!widgetExists) {
      openServiceWidgetCreator(widgetType, widgetType);
      return;
    }
    const actionElement = document.createElement("button");
    actionElement.dataset.widgetType = widgetType || "";
    if (Actions && typeof Actions.has === "function" && Actions.has("dashboard.edit.addWidgetType")) {
      const ok = Actions.dispatch("dashboard.edit.addWidgetType", { source: "command-palette", el: actionElement, widgetType: widgetType });
      if (ok) {
        cmdToast("Widget ajoute au dashboard.", "success");
        return;
      }
    }
    openServiceWidgetCreator(widgetType, widgetType);
  }, 180);
}

function openMarketplaceSearch(query, category) {
  cmdGo("marketplace");
  setTimeout(function () {
    try {
      if (window.ETHONEMarketplace && typeof window.ETHONEMarketplace.search === "function") window.ETHONEMarketplace.search(query || "");
    } catch (e) {}
    const input = document.querySelector('[id^="mp41-search-"]');
    if (input) {
      input.value = query || "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus({ preventScroll: true });
    }
    if (category) {
      const wanted = normalizeCmdText(category);
      const tab = Array.prototype.find.call(document.querySelectorAll("[data-mp41-category]"), function (node) {
        return normalizeCmdText(node.dataset.mp41Category || node.textContent) === wanted;
      });
      if (tab) tab.click();
    }
  }, 220);
}

function openAIConversation(ctx) {
  cmdGo("ai");
  setTimeout(function () {
    if (ctx && ctx.source === "legacy" && ctx.sessionId != null && typeof loadAISession === "function") {
      loadAISession(ctx.sessionId);
      return;
    }
    if (typeof toggleAISessions === "function") toggleAISessions();
    focusAIInput();
    if (ctx && ctx.conversationId != null) cmdToast("Conversation AI Core ouverte dans ETHONE AI.", "info");
  }, 180);
}

function openPluginSearch(pluginId) {
  openSettingsTab("plugins");
  setTimeout(function () {
    const row = document.querySelector('[data-ih-id="' + pluginId + '"],#ih-card-' + pluginId);
    if (row) pulseElement(row);
  }, 220);
}

function cmdLoadLazyGroup(group, callback) {
  const lazy = window.ETHONELazyModules;
  const run = function () {
    try { if (typeof callback === "function") callback(); } catch (e) { cmdToast("Impossible d'ouvrir ce module pour le moment.", "error"); }
  };
  try {
    if (lazy && typeof lazy.load === "function") {
      Promise.resolve(lazy.load(group)).then(function (loaded) {
        if (loaded === false) return;
        run();
      }).catch(function () {
        cmdToast("Module indisponible pour le moment.", "info");
      });
      return;
    }
  } catch (e) {}
  run();
}

function cmdFocusFirst(selectors, value) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  const input = Array.prototype.map.call(list, function (selector) {
    try { return document.querySelector(selector); } catch (e) { return null; }
  }).find(Boolean);
  if (!input) return false;
  if (typeof value === "string") {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
  pulseElement(input);
  return true;
}

function cmdOpenTimeMachine(snapshot) {
  cmdLoadLazyGroup("time-machine", function () {
    if (window.ETHONETimeMachine) {
      if (snapshot && typeof window.ETHONETimeMachine.snapshot === "function") return window.ETHONETimeMachine.snapshot("Manual command palette snapshot");
      if (typeof window.ETHONETimeMachine.open === "function") return window.ETHONETimeMachine.open();
    }
    cmdToast("Time Machine sera disponible depuis les modules experimentaux.", "info");
  });
}

function registerSearchActions() {
  const Actions = window.Ethone && window.Ethone.get("actions");
  if (!Actions || window.__ethoneSearchActionsRegistered) return;
  window.__ethoneSearchActionsRegistered = true;

  Actions.register("search.open", { label: "Universal Search", handler: function (ctx) { openCmdPalette({ query: (ctx && ctx.query) || "" }); } });
  Actions.register("universalSearch.open", { label: "Universal Search", handler: function (ctx) { openCmdPalette({ query: (ctx && ctx.query) || "" }); } });
  Actions.register("command.auth.login", { label: "Connexion", handler: function () {
    const tab = document.getElementById("tab-login");
    if (tab) tab.click();
    setTimeout(function () { const input = document.getElementById("auth-login-id"); if (input) input.focus({ preventScroll: true }); }, 0);
    return true;
  } });
  Actions.register("command.auth.register", { label: "Creer un compte", handler: function () {
    const tab = document.getElementById("tab-register");
    if (tab) tab.click();
    setTimeout(function () { const input = document.getElementById("auth-reg-username"); if (input) input.focus({ preventScroll: true }); }, 0);
    return true;
  } });
  Actions.register("search.nav.dashboard", { handler: function () { cmdGo("dashboard"); } });
  Actions.register("search.nav.files", { handler: function () { cmdGo("files"); } });
  Actions.register("search.nav.notes", { handler: function () { cmdGo("notes"); } });
  Actions.register("search.nav.todos", { handler: function () { cmdGo("todos"); } });
  Actions.register("search.nav.kanban", { handler: function () { cmdGo("kanban"); } });
  Actions.register("search.nav.calendar", { handler: function () { cmdGo("calendar"); } });
  Actions.register("search.nav.habits", { handler: function () { cmdGo("habits"); } });
  Actions.register("search.nav.gaming", { handler: function () { cmdGo("gaming"); } });
  Actions.register("search.nav.valorantAccounts", { handler: function () { cmdGo("valorant-accounts"); } });
  Actions.register("search.nav.stats", { handler: function () { cmdGo("stats"); } });
  Actions.register("search.nav.activity", { handler: function () { cmdGo("activity"); } });
  Actions.register("search.nav.health", { handler: function () { cmdGo("health"); } });
  Actions.register("search.nav.versions", { handler: function () { cmdGo("versions"); } });
  Actions.register("search.nav.github", { handler: function () { cmdGo("github"); } });
  Actions.register("search.nav.marketplace", { handler: function () { cmdGo("marketplace"); } });
  Actions.register("search.nav.import", { handler: function () { cmdGo("import"); } });
  Actions.register("search.nav.workspaces", { handler: function () {
    cmdGo("dashboard");
    setTimeout(function () {
      const btn = document.querySelector('[data-v4-action-id="dashboard.workspace.toggle"],.d4-workspace');
      if (btn) btn.click();
    }, 180);
  } });

  Actions.register("search.integration.open", { handler: function (ctx) { focusIntegration(ctx && ctx.integrationId); } });
  Actions.register("search.integration.settings", { handler: function (ctx) { runIntegrationHubAction(ctx && ctx.integrationId, "settings"); } });
  Actions.register("search.integration.connect", { handler: function (ctx) { runIntegrationHubAction(ctx && ctx.integrationId, "connect"); } });
  Actions.register("search.integration.disconnect", { handler: function (ctx) { runIntegrationHubAction(ctx && ctx.integrationId, "disconnect"); } });
  Actions.register("search.integration.refresh", { handler: function (ctx) { runIntegrationHubAction(ctx && ctx.integrationId, "refresh"); } });
  Actions.register("search.plugin.open", { handler: function (ctx) { openPluginSearch(ctx && ctx.pluginId); } });
  Actions.register("search.widget.open", { handler: function (ctx) { openWidgetSearch(ctx && ctx.widgetType); } });
  Actions.register("search.widget.createService", { handler: function (ctx) { openServiceWidgetCreator(ctx && ctx.widgetType, ctx && ctx.query); } });
  Actions.register("search.widget.addDashboard", { handler: function (ctx) { addWidgetToDashboard(ctx && ctx.widgetType); } });
  Actions.register("search.marketplace.openItem", { handler: function (ctx) { openMarketplaceSearch((ctx && (ctx.query || ctx.itemId)) || "", ctx && ctx.category); } });
  Actions.register("search.ai.conversation.open", { handler: function (ctx) { openAIConversation(ctx || {}); } });

  Actions.register("search.notes.open", { handler: function (ctx) {
    cmdGo("notes");
    if (ctx && ctx.noteId != null && typeof selectNote === "function") setTimeout(function () { selectNote(ctx.noteId); }, 80);
  } });
  Actions.register("search.notes.create", { handler: function () { cmdRun("notes.new"); } });

  Actions.register("search.todos.open", { handler: function (ctx) { cmdGo("todos"); if (ctx && ctx.todoId != null) highlightTodo(ctx.todoId); } });
  Actions.register("search.todos.create", { handler: function () { cmdRun("tasks.new"); } });

  Actions.register("search.items.open", { handler: function (ctx) {
    cmdGo("files");
    if (ctx && ctx.itemId != null && typeof selectFile === "function") setTimeout(function () { selectFile(ctx.itemId); }, 120);
    else if (ctx && ctx.itemId != null && typeof openItem === "function") setTimeout(function () { openItem(ctx.itemId); }, 120);
  } });
  Actions.register("search.items.create", { handler: function () { cmdRun("files.new"); } });

  Actions.register("search.habits.open", { handler: function () { cmdGo("habits"); } });
  Actions.register("search.calendar.open", { handler: function (ctx) {
    cmdGo("calendar");
    if (ctx && ctx.date) {
      setTimeout(function () {
        const d = new Date(ctx.date);
        if (!isNaN(d)) {
          try { calYear = d.getFullYear(); calMonth = d.getMonth(); } catch (e) {}
        }
        if (typeof renderCalendar === "function") renderCalendar();
        if (typeof showDayEvents === "function") showDayEvents(ctx.date);
      }, 90);
    }
  } });
  Actions.register("search.calendar.create", { handler: function () { cmdRun("calendar.new"); } });

  Actions.register("search.settings.openTab", { handler: function (ctx) { cmdRun("settings.tab.open", { tab: (ctx && ctx.tab) || "profilee" }); } });
  Actions.register("command.notes.search", { handler: function () {
    cmdGo("notes");
    setTimeout(function () { cmdFocusFirst(["#notes-search", "#notes-search-input", ".notes-search input", "[data-notes-search]"], ""); }, 120);
  } });
  Actions.register("command.notes.summarize", { handler: function () {
    cmdRun("brain.open");
    setTimeout(function () {
      if (cmdFocusFirst(["#ai-input", "textarea[data-ai-input]", ".ai-input textarea"], "Resume mes notes actuelles.")) return;
      cmdToast("ETHONE AI est ouvert. Ajoute ta demande dans le champ de chat.", "info");
    }, 220);
  } });
  Actions.register("command.notes.export", { handler: function () { cmdRun("settings.tab.open", { tab: "exportx" }); } });
  Actions.register("command.settings.accent", { handler: function () {
    cmdRun("settings.tab.open", { tab: "theme" });
    setTimeout(function () { cmdFocusFirst(["#settings-accent-color", "[data-setting='accent']", "input[type='color']"], null); }, 180);
  } });
  Actions.register("command.ai.newChat", { handler: function () {
    cmdGo("ai");
    setTimeout(function () {
      try { if (typeof newAIChat === "function") { newAIChat(); return; } } catch (e) {}
      focusAIInput();
    }, 160);
  } });
  Actions.register("command.ai.memory", { handler: function () { cmdRun("settings.tab.open", { tab: "brain" }); } });
  Actions.register("command.marketplace.plugins", { handler: function () { openMarketplaceSearch("plugins", "plugins"); } });
  Actions.register("command.marketplace.themes", { handler: function () { openMarketplaceSearch("themes", "themes"); } });
  Actions.register("command.files.search", { handler: function () {
    cmdGo("files");
    setTimeout(function () { cmdFocusFirst(["#files-search", "#file-search", ".files-search input", "[data-files-search]"], ""); }, 140);
  } });
  Actions.register("command.tasks.search", { handler: function () {
    cmdGo("todos");
    setTimeout(function () { cmdFocusFirst(["#todo-search", "#todos-search", ".todo-search input", "[data-tasks-search]"], ""); }, 140);
  } });
  Actions.register("command.search.replay", { handler: function (ctx) {
    openCmdPalette({ query: (ctx && ctx.query) || "" });
  } });
  Actions.register("search.theme.change", { handler: function () { cmdRun("theme.open"); } });
  Actions.register("search.applibrary.open", { handler: function () { cmdRun("appLibrary.open"); } });
  Actions.register("search.universe.open", { handler: function () { cmdRun("universe.open"); } });
  Actions.register("search.briefing.open", { handler: function () { cmdRun("briefing.open"); } });
  Actions.register("search.achievements.open", { handler: function () { cmdRun("achievements.open"); } });
  Actions.register("search.connections.open", { handler: function () { cmdGo("connections"); } });
  Actions.register("search.brain.open", { handler: function () { cmdRun("brain.open"); focusAIInput(); } });
  Actions.register("search.ai.ask", { handler: function () {
    if (window.ETHONEAIEverywhere && typeof window.ETHONEAIEverywhere.openCopilot === "function") {
      window.ETHONEAIEverywhere.openCopilot(window.ETHONEAIEverywhere.contextFromElement(document.activeElement));
    } else {
      cmdRun("brain.open");
      focusAIInput();
    }
  } });
  Actions.register("search.spotify.launch", { handler: function () {
    focusIntegration("spotify");
    try { window.open("https://open.spotify.com/", "_blank", "noopener,noreferrer"); } catch (e) {}
  } });
  Actions.register("search.workspaces.switcher", { handler: function () { cmdRun("spaces.open"); } });
  Actions.register("search.workspace.open", { handler: function (ctx) {
    const api = window.ETHONESpaces || window.ETHONEWorkspaces;
    if (api && typeof api.setActive === "function" && ctx && ctx.workspaceId) api.setActive(ctx.workspaceId);
    cmdGo("dashboard");
  } });
  Actions.register("search.databases.home", { handler: function () { cmdGo("databases"); } });
  Actions.register("search.databases.open", { handler: function (ctx) {
    cmdGo("databases");
    if (ctx && ctx.dbId != null && typeof dbOpenDatabase === "function") setTimeout(function () { dbOpenDatabase(ctx.dbId); }, 90);
  } });
  Actions.register("search.theme.pick", { handler: function (ctx) { if (ctx && ctx.themeIdx != null && typeof pickTheme === "function") pickTheme(ctx.themeIdx); } });
  Actions.register("search.profile.switch", { handler: function () { cmdRun("profile.switch"); } });
  Actions.register("search.presentation.open", { handler: function () { if (typeof openPresentationMode === "function") openPresentationMode(); } });
  Actions.register("search.language.toggle", { handler: function () {
    const langs = ["fr", "en", "es", "de"];
    const idx = langs.indexOf(cmdLang());
    if (typeof setLangAndClose === "function") setLangAndClose(langs[(idx + 1) % langs.length], "lang-dd-topbar");
  } });
  if (!Actions.has || !Actions.has("dashboard.edit.toggle")) {
    Actions.register("dashboard.edit.toggle", { label: "Edit dashboard", handler: function () {
      cmdGo("dashboard");
      setTimeout(function () {
        const btn = document.getElementById("d4-edit-toggle") || document.querySelector('[data-v4-action-id="dashboard.edit.toggle"]');
        if (btn && !btn.disabled) btn.click();
        else cmdToast("Le mode edition du dashboard sera disponible quand le dashboard aura fini de charger.", "info");
      }, 180);
      return true;
    } });
  }
  if (!Actions.has || !Actions.has("timeMachine.open")) {
    Actions.register("timeMachine.open", { label: "Time Machine", handler: function () { cmdOpenTimeMachine(false); } });
  }
  if (!Actions.has || !Actions.has("timeMachine.snapshot")) {
    Actions.register("timeMachine.snapshot", { label: "Create Time Machine snapshot", handler: function () { cmdOpenTimeMachine(true); } });
  }
  if (!Actions.has || !Actions.has("health.open")) {
    Actions.register("health.open", { label: "Health Center", handler: function () { cmdGo("health"); } });
  }
}

function scheduleSearchActionRegistration() {
  registerSearchActions();
  if (!window.__ethoneSearchActionsRegistered) {
    setTimeout(registerSearchActions, 120);
    setTimeout(registerSearchActions, 600);
    document.addEventListener("DOMContentLoaded", function () { setTimeout(registerSearchActions, 0); }, { once: true });
    window.addEventListener("ethone:app-ready", registerSearchActions, { once: true });
  }
}

function bindCmdPaletteInteractions() {
  if (window.__ethoneCmdPaletteInteractionsBound) return;
  window.__ethoneCmdPaletteInteractionsBound = true;
  document.addEventListener("click", function (event) {
    const pin = event.target && event.target.closest ? event.target.closest(".cmd-pin[data-cmd-pin-idx]") : null;
    if (!pin) return;
    event.preventDefault();
    event.stopPropagation();
    toggleCmdFavorite(Number(pin.getAttribute("data-cmd-pin-idx") || "0"));
  }, true);
}

scheduleSearchActionRegistration();
bindCmdPaletteInteractions();

window.openCmdPalette = openCmdPalette;
window.closeCmdPalette = closeCmdPalette;
window.openSpotlightSearch = openSpotlightSearch;
window.onCmdInput = onCmdInput;
window.handleCmdKey = handleCmdKey;
window.executeCmdItem = executeCmdItem;
window.toggleCmdFavorite = toggleCmdFavorite;
window.renderCmdResults = renderCmdResults;
window.ETHONEUniversalSearch = {
  search: function (query) { return buildAllResults(query || ""); },
  index: function () { return cmdGetUniversalIndex(); },
  invalidate: invalidateUniversalSearchIndex,
  stats: function () { return Object.assign({}, _cmdLastSearchStats); },
  score: fuzzyScore,
  normalize: normalizeCmdText,
  open: openCmdPalette,
  openSpotlight: openSpotlightSearch,
  sources: function () {
    return ["context", "quickAccess", "recent", "recentSearches", "frequent", "favorites", "actions", "pages", "settings", "flows", "workspaces", "diagnostics", "notifications", "history", "integrations", "widgets", "contextActions", "marketplace", "plugins", "notes", "tasks", "files", "habits", "calendar", "databases", "ai", "themes"];
  }
};

[
  "storage",
  "ethone:timeline",
  "ethone:notification",
  "ethone:profile-changed",
  "ethone:workspace-change",
  "ethone:workspace-update",
  "ethone:space-change",
  "ethone:flow-change",
  "ethone:lazy-group-loaded",
  "ethone:widget-sdk-register",
  "ethone:custom-widgets-change",
  "ethone:theme-changed"
].forEach(function (eventName) {
  window.addEventListener(eventName, invalidateUniversalSearchIndex, { passive: true });
});

document.addEventListener("keydown", function (event) {
  const overlay = document.getElementById("cmd-palette-overlay");
  const paletteOpen = !!(overlay && overlay.classList.contains("open"));
  if (paletteOpen) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeCmdPalette();
      return;
    }
    if (event.key === "Tab" || event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
      handleCmdKey(event);
      return;
    }
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    event.stopPropagation();
    if (paletteOpen) closeCmdPalette();
    else openCmdPalette();
    return;
  }

  const tag = document.activeElement?.tagName;
  const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;
  if (paletteOpen || inInput) return;

  if (event.key === "n" && !event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); cmdGo("notes"); }
  if (event.key === "t" && !event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); cmdGo("todos"); }
  if (event.key === "g" && !event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); cmdGo("gaming"); }
  if (event.key === "h" && !event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); cmdGo("habits"); }

  if (event.code === "Space") {
    const dash = document.getElementById("page-dashboard");
    if (dash && dash.classList.contains("active") && document.getElementById("pomo-ring-wrap") && typeof pomoToggle === "function") {
      event.preventDefault();
      pomoToggle();
    }
  }
});
