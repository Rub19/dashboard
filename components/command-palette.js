/* ETHONE global search + command palette (Ctrl+K).
   This is the main search engine for pages, actions, integrations,
   settings, local content, widgets and plugins. */

let _cmdSelectedIdx = 0;
let _cmdRenderFrame = 0;
let _cmdKeyboardNav = false;
let _cmdMode = "command";

const CMD_INTEGRATIONS = [
  { id: "discord", title: "Discord", sub: "Integration", keywords: "discord presence lanyard status voice activity messages settings notes tasks files widgets plugins" },
  { id: "spotify", title: "Spotify", sub: "Integration", keywords: "spotify music now playing audio listening settings notes tasks files widgets plugins" },
  { id: "github", title: "GitHub", sub: "Integration", keywords: "github git commits repositories developer code settings notes tasks files widgets plugins" },
  { id: "steam", title: "Steam", sub: "Integration", keywords: "steam gaming games playtime settings notes tasks files widgets plugins" },
  { id: "twitch", title: "Twitch", sub: "Integration", keywords: "twitch stream streaming live settings notes tasks files widgets plugins" },
  { id: "valorant", title: "Valorant", sub: "Integration", keywords: "valorant riot gaming accounts rank matches settings notes tasks files widgets plugins" },
  { id: "googlecalendar", title: "Google Calendar", sub: "Integration", keywords: "google calendar meetings events schedule settings notes tasks files widgets plugins" },
  { id: "googledrive", title: "Google Drive", sub: "Integration", keywords: "google drive files documents folders cloud settings notes tasks widgets plugins" },
  { id: "obs", title: "OBS", sub: "Integration", keywords: "obs studio streaming recording scenes websocket settings notes tasks files widgets plugins" },
  { id: "youtube", title: "YouTube", sub: "Integration", keywords: "youtube videos channel creator uploads settings notes tasks files widgets plugins" },
  { id: "battlenet", title: "Battle.net", sub: "Integration", keywords: "battle battlenet battle.net blizzard gaming settings notes tasks files widgets plugins" },
  { id: "lastfm", title: "Last.fm", sub: "Integration", keywords: "lastfm last fm music scrobbles listening settings notes tasks files widgets plugins" }
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
  ["widgets", "Widget Marketplace", "Widgets", "Install dashboard widgets, mini apps and AI widgets", "spotify discord github weather ai suggestions timeline dashboard widget marketplace"],
  ["plugins", "Plugin Hub", "Plugins", "Install integrations and ETHONE extensions", "plugins extensions discord spotify github steam twitch valorant obs youtube marketplace"],
  ["themes", "Theme Marketplace", "Themes", "Install or create premium ETHONE themes", "theme themes accent purple midnight oled nord tokyo dracula catppuccin marketplace"],
  ["layouts", "Layout Store", "Layouts", "Dashboard layouts for work, gaming and focus", "layout layouts dashboard workspace personal operating system marketplace"],
  ["automations", "Automation Packs", "Automations", "Workflow packs for Brain and widgets", "automation automations workflow brain tasks notes calendar marketplace"],
  ["ai-agents", "AI Agents", "AI Agents", "Specialized Brain agents and prompts", "ai agents brain provider prompt marketplace"]
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

function cmdLabel(key, fallback) {
  try {
    if (typeof t === "function") {
      const value = t(key);
      return value && value !== key ? value : fallback;
    }
  } catch (e) {}
  return fallback || key;
}

function cmdEsc(value) {
  try { if (typeof escapeHTML === "function") return escapeHTML(value); } catch (e) {}
  return String(value == null ? "" : value).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
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

function cmdGo(page) {
  if (!page) return;
  if (cmdRun("navigation.open", { page: page })) return;
  if (typeof switchPage === "function") switchPage(page, null);
}

function openCmdPalette(options) {
  options = typeof options === "string" ? { query: options } : (options || {});
  _cmdMode = options.mode === "spotlight" ? "spotlight" : "command";
  const overlay = document.getElementById("cmd-palette-overlay");
  if (overlay) {
    overlay.classList.add("open");
    overlay.classList.toggle("spotlight-open", _cmdMode === "spotlight");
    overlay.dataset.mode = _cmdMode;
  }
  const input = document.getElementById("cmd-input");
  if (input) {
    input.value = options.query || "";
    input.placeholder = _cmdMode === "spotlight"
      ? "Search pages, widgets, files, commands, settings..."
      : "Search pages, items, actions...";
    input.setAttribute("aria-label", _cmdMode === "spotlight" ? "ETHONE Spotlight Search" : "ETHONE Command Palette");
    if (!input.dataset.cmdInputBound) {
      input.dataset.cmdInputBound = "1";
      input.addEventListener("input", onCmdInput);
    }
  }
  _cmdSelectedIdx = 0;
  renderCmdResults();
  requestAnimationFrame(function () { if (input) input.focus(); });
}

function closeCmdPalette() {
  const overlay = document.getElementById("cmd-palette-overlay");
  if (overlay) {
    overlay.classList.remove("open", "spotlight-open");
    overlay.dataset.mode = "";
  }
  const input = document.getElementById("cmd-input");
  if (input) input.value = "";
}

function openSpotlightSearch(query) {
  openCmdPalette({ mode: "spotlight", query: query || "" });
}

function onCmdInput() {
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
    else if (query.length >= 4 && Math.abs(word.length - query.length) <= 2) {
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
  score -= Math.min(start < 0 ? 0 : start, 24);
  score -= Math.max(0, span - query.length) * 1.7;
  score -= Math.max(0, text.length - query.length) * 0.12;
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

function cmdSearchText(title, sub, keywords) {
  return [title, sub, keywords].map(function (v) { return String(v || ""); }).join(" ");
}

function isCmdItemEnabled(item) {
  try {
    const Actions = window.Ethone && window.Ethone.get("actions");
    return Actions ? Actions.isEnabled(item.id) : true;
  } catch (e) {
    return true;
  }
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
    { id: "search.settings.openTab", context: { tab: "profilee" }, icon: "Set", title: cmdLabel("nav_settings", "Settings"), sub: "Preferences", keywords: "settings profile account security password preferences" },
    { id: "search.brain.open", icon: "AI", title: cmdLabel("nav_ai", "ETHONE AI"), sub: "Ask ETHONE Brain", keywords: "brain ai assistant chat ask ia intelligence" },
    { id: "search.nav.marketplace", icon: "Store", title: "Marketplace", sub: "Store", keywords: "marketplace shop store plugins widgets themes layouts automations templates" },
    { id: "search.nav.workspaces", icon: "Space", title: spacesLabel, sub: "Workspace switcher", keywords: "workspaces spaces environments context" },
    { id: "search.nav.import", icon: "Import", title: "Import Assistant", sub: "Import Notion, Todoist, CSV, JSON...", keywords: "import assistant notion todoist google calendar discord spotify github csv excel markdown json assistant" },
    { id: "search.databases.home", icon: "Data", title: cmdLabel("nav_databases", "Databases"), sub: "Database Builder", keywords: "database databases table records notion" },
    { id: "search.settings.openTab", context: { tab: "plugins" }, icon: "Plug", title: "Plugins", sub: "Settings", keywords: "plugins integrations extensions discord spotify steam twitch github valorant" }
  ].map(function (entry) { return Object.assign({ category: "pages" }, entry); });
}

function buildQuickActionResults() {
  return [
    { id: "search.notes.create", icon: "Note", title: "Create note", sub: "Start a new note", kbd: "Ctrl+N", keywords: "create note new note write document" },
    { id: "search.todos.create", icon: "Task", title: "Create task", sub: "Add a task to your list", kbd: "Ctrl+Alt+N", keywords: "create task add task new todo reminder" },
    { id: "search.items.create", icon: "+", title: "Add file or link", sub: "File, link or folder", kbd: "Ctrl+Alt+F", keywords: "add item file link folder new create" },
    { id: "search.calendar.create", icon: "Cal", title: "Create event", sub: "Add to calendar", kbd: "Ctrl+Alt+E", keywords: "new event add calendar create meeting schedule" },
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
    { id: "search.language.toggle", icon: "Lang", title: "Toggle language", sub: "FR/EN/ES/DE", keywords: "language toggle fr en es de" }
  ].map(function (entry) { return Object.assign({ category: "actions" }, entry); });
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
  const matched = cmdIntegrationDefs().filter(function (integration) {
    return scoreMatch([integration.title, integration.id, integration.keywords].join(" "), q) >= (q.length <= 3 ? 30 : 54);
  }).slice(0, 4);
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
        keywords: [integration.title, integration.id, integration.keywords, action.keywords].join(" "),
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
    { tab: "marketplace", label: "Marketplace", keywords: "marketplace store plugins widgets themes layouts templates" },
    { tab: "plugins", label: "Integrations & plugins", keywords: "plugins integrations discord spotify steam twitch github valorant google drive obs youtube battle net" },
    { tab: "notifications", label: "Notifications", keywords: "notifications alerts quiet hours center reminders" },
    { tab: "keyboard", label: "Keyboard shortcuts", keywords: "keyboard shortcuts hotkeys ctrl command search" },
    { tab: "backup", label: "Backup & sync", keywords: "backup sync restore cloud import export" },
    { tab: "importx", label: "Import", keywords: "import data json restore" },
    { tab: "exportx", label: "Export", keywords: "export data json backup" },
    { tab: "security", label: "Security", keywords: "security password pin two factor sessions tokens" },
    { tab: "developer", label: "Developer", keywords: "developer debug console logs workers supabase" },
    { tab: "experimental", label: "Experimental", keywords: "experimental beta flags labs" }
  ].map(function (entry) {
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

function cmdCategoryLabel(category) {
  const map = {
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
    themes: "Themes",
    marketplace: "Marketplace",
    ai: "AI Conversations"
  };
  return map[category] || category;
}

function buildAllResults(query) {
  const q = normalizeCmdText(query || "");
  const contentCap = q ? 7 : 4;
  const groups = [
    { key: "contextActions", items: buildIntegrationActionResults(q), cap: q ? 10 : 0 },
    { key: "actions", items: buildQuickActionResults(), cap: q ? 6 : null },
    { key: "integrations", items: buildIntegrationResults(q), cap: 8 },
    { key: "widgets", items: buildWidgetResults(q), cap: 8 },
    { key: "marketplace", items: buildMarketplaceResults(q), cap: 8 },
    { key: "plugins", items: buildPluginResults(q), cap: 8 },
    { key: "pages", items: buildPageResults(), cap: q ? 8 : null },
    { key: "settings", items: buildSettingsResults(q), cap: 8 },
    { key: "workspaces", items: buildWorkspaceResults(q), cap: 6 },
    { key: "notes", items: buildNoteResults(q), cap: contentCap },
    { key: "tasks", items: buildTaskResults(q), cap: contentCap },
    { key: "files", items: buildItemResults(q), cap: q ? contentCap : 4 },
    { key: "habits", items: buildHabitResults(q), cap: contentCap },
    { key: "calendar", items: buildEventResults(q), cap: contentCap },
    { key: "databases", items: buildDatabaseResults(q), cap: contentCap },
    { key: "ai", items: buildAIConversationResults(q), cap: contentCap },
    { key: "themes", items: buildThemeResults(q), cap: 5 }
  ];

  const sections = [];
  const all = [];

  groups.forEach(function (group, groupIndex) {
    const minScore = !q ? 0 : q.length <= 2 ? 18 : q.length <= 4 ? 32 : 50;
    let scored = group.items.map(function (item) {
      const base = scoreMatch(cmdSearchText(item.title, item.sub, item.keywords), q);
      const titleBoost = q && normalizeCmdText(item.title).startsWith(q) ? 18 : 0;
      return { item: item, score: base + titleBoost + (item.priority || 0) - groupIndex * 0.01 };
    }).filter(function (entry) {
      return q ? entry.score >= minScore : entry.score > 0;
    });

    scored.sort(function (a, b) {
      return b.score - a.score || String(a.item.title || "").localeCompare(String(b.item.title || ""));
    });

    if (group.cap) scored = scored.slice(0, group.cap);
    const items = scored.map(function (entry) { return entry.item; });
    if (items.length) {
      sections.push({ key: group.key, label: cmdCategoryLabel(group.key), items: items });
      all.push.apply(all, items);
    }
  });

  return { sections: sections, all: all };
}

function renderCmdResults() {
  _cmdRenderFrame = 0;
  const input = document.getElementById("cmd-input");
  const query = input ? input.value : "";
  const result = buildAllResults(query);
  const sections = result.sections;
  const all = result.all;
  const container = document.getElementById("cmd-results");
  if (!container) return;
  _cmdSelectedIdx = all.length ? Math.max(0, Math.min(_cmdSelectedIdx, all.length - 1)) : 0;

  if (!all.length) {
    container.innerHTML = '<div class="cmd-empty-state">No result. Try a page, service, note, task, file or widget.</div>';
    return;
  }

  let html = "";
  let index = 0;
  const queryText = normalizeCmdText(query);
  html += '<div class="cmd-search-summary"><div><strong>' + cmdEsc(queryText ? all.length + " results" : "Universal Search") + '</strong><span>' + cmdEsc(queryText ? "Searching pages, widgets, files, notes, tasks, plugins, AI and Marketplace." : "Type to search ETHONE or run an action.") + '</span></div><kbd>Enter</kbd></div>';
  sections.forEach(function (section) {
    html += '<div class="cmd-section-label"><span>' + cmdEsc(section.label) + '</span><small>' + section.items.length + '</small></div>';
    section.items.forEach(function (item) {
      const selected = index === _cmdSelectedIdx;
      const enabled = isCmdItemEnabled(item);
      html += '<div class="cmd-item' + (selected ? " selected" : "") + (!enabled ? " is-disabled" : "") + '" data-category="' + cmdEsc(item.category || section.key) + '" data-idx="' + index + '" onmousedown="event.preventDefault();executeCmdItem(' + index + ')" onmouseover="_cmdSelectedIdx=' + index + ';renderCmdResults()">' +
        '<div class="cmd-item-icon">' + cmdEsc(item.icon || "Go") + '</div>' +
        '<div class="cmd-item-main"><div class="cmd-item-label">' + cmdEsc(item.title) + '</div>' + (item.sub ? '<div class="cmd-item-sub">' + cmdEsc(item.sub) + '</div>' : "") + '</div>' +
        '<div class="cmd-item-meta"><span>' + cmdEsc(item.badge || cmdCategoryLabel(item.category || section.key)) + '</span>' + (item.detail ? '<small>' + cmdEsc(item.detail) + '</small>' : "") + '</div>' +
        (item.kbd ? '<span class="cmd-item-kbd">' + cmdEsc(item.kbd) + '</span>' : "") +
        (!enabled ? '<span class="cmd-item-tag">' + cmdEsc(cmdLabel("unavailable", "Unavailable")) + '</span>' : "") +
      '</div>';
      index += 1;
    });
  });
  container.innerHTML = html;
  if (_cmdKeyboardNav) {
    const selected = container.querySelector(".cmd-item.selected");
    if (selected) selected.scrollIntoView({ block: "nearest" });
  }
  _cmdKeyboardNav = false;
}

function executeCmdItem(index) {
  const input = document.getElementById("cmd-input");
  const result = buildAllResults(input ? input.value : "");
  const item = result.all[index];
  if (!item) return;
  closeCmdPalette();
  requestAnimationFrame(function () {
    const Actions = window.Ethone && window.Ethone.get("actions");
    if (Actions) Actions.dispatch(item.id, item.context);
    else if (typeof window.toast === "function") window.toast("Commandes indisponibles pour le moment.", "warning");
  });
}

function handleCmdKey(event) {
  const input = document.getElementById("cmd-input");
  const all = buildAllResults(input ? input.value : "").all;
  if (event.key === "Escape") {
    closeCmdPalette();
    return;
  }
  if (!all.length) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    _cmdKeyboardNav = true;
    _cmdSelectedIdx = (_cmdSelectedIdx + 1) % all.length;
    renderCmdResults();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    _cmdKeyboardNav = true;
    _cmdSelectedIdx = (_cmdSelectedIdx - 1 + all.length) % all.length;
    renderCmdResults();
  } else if (event.key === "Enter") {
    event.preventDefault();
    executeCmdItem(_cmdSelectedIdx);
  } else if (
    event.key === "Backspace" ||
    event.key === "Delete" ||
    event.key === "Paste" ||
    (event.key && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey)
  ) {
    setTimeout(onCmdInput, 0);
  }
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
      else cmdToast("Action indisponible pour cette integration.", "info");
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
    const fakeEl = document.createElement("button");
    fakeEl.dataset.widgetType = widgetType || "";
    if (Actions && typeof Actions.has === "function" && Actions.has("dashboard.edit.addWidgetType")) {
      const ok = Actions.dispatch("dashboard.edit.addWidgetType", { source: "command-palette", el: fakeEl, widgetType: widgetType });
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

function registerSearchActions() {
  const Actions = window.Ethone && window.Ethone.get("actions");
  if (!Actions || window.__ethoneSearchActionsRegistered) return;
  window.__ethoneSearchActionsRegistered = true;

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
}

registerSearchActions();

window.openCmdPalette = openCmdPalette;
window.closeCmdPalette = closeCmdPalette;
window.openSpotlightSearch = openSpotlightSearch;
window.onCmdInput = onCmdInput;
window.handleCmdKey = handleCmdKey;
window.executeCmdItem = executeCmdItem;
window.renderCmdResults = renderCmdResults;
window.ETHONEUniversalSearch = {
  search: function (query) { return buildAllResults(query || ""); },
  score: fuzzyScore,
  normalize: normalizeCmdText,
  open: openCmdPalette,
  openSpotlight: openSpotlightSearch,
  sources: function () {
    return ["actions", "integrations", "widgets", "marketplace", "plugins", "pages", "settings", "workspaces", "notes", "tasks", "files", "habits", "calendar", "databases", "ai"];
  }
};

document.addEventListener("keydown", function (event) {
  if (window.ETHONEKeyboardShortcuts && window.ETHONEKeyboardShortcuts.isEnabled && window.ETHONEKeyboardShortcuts.isEnabled()) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    const overlay = document.getElementById("cmd-palette-overlay");
    if (overlay?.classList.contains("open")) closeCmdPalette();
    else openCmdPalette();
    return;
  }

  const tag = document.activeElement?.tagName;
  const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;
  if (document.getElementById("cmd-palette-overlay")?.classList.contains("open") || inInput) return;

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
