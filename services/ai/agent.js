/*
 * ETHONE Brain Agent
 * Turns natural language into safe local ETHONE actions.
 * No provider calls, no backend writes, no destructive actions without an
 * existing explicit UI confirmation flow.
 */
(function initEthoneBrainAgent(global) {
  "use strict";

  if (global.ETHONEBrainAgent) return;

  var HISTORY_LIMIT = 80;
  var ACTION_VERSION = "1.0.0";
  var wrappedChat = false;

  var PLUGIN_ALIASES = {
    discord: "discord",
    spotify: "spotify",
    github: "github",
    steam: "steam",
    twitch: "twitch",
    youtube: "youtube",
    valorant: "valorant",
    riot: "valorant",
    obs: "obs",
    "google calendar": "googlecalendar",
    googlecalendar: "googlecalendar",
    calendar: "googlecalendar",
    "google drive": "googledrive",
    googledrive: "googledrive",
    drive: "googledrive",
    "battle.net": "battlenet",
    battlenet: "battlenet",
    battle: "battlenet",
    lastfm: "lastfm",
    "last.fm": "lastfm"
  };

  var THEME_ALIASES = {
    purple: "ethone-purple",
    violet: "ethone-purple",
    ethone: "ethone-purple",
    midnight: "midnight",
    oled: "oled",
    nord: "nord",
    tokyo: "tokyo-night",
    "tokyo night": "tokyo-night",
    gruvbox: "gruvbox",
    catppuccin: "catppuccin",
    dracula: "dracula",
    carbon: "carbon",
    glass: "glass"
  };

  var WIDGET_ALIASES = {
    ai: "aiSuggestions",
    brain: "aiSuggestions",
    suggestions: "aiSuggestions",
    spotify: "spotify",
    discord: "discord",
    github: "github",
    calendar: "calendar",
    notes: "notes",
    note: "notes",
    tasks: "productivity",
    todo: "productivity",
    productivity: "productivity",
    focus: "dailyFocus",
    clock: "clock",
    horloge: "clock",
    weather: "weather",
    meteo: "weather",
    valorant: "valorant",
    steam: "steam",
    cpu: "cpu",
    ram: "ram",
    network: "network",
    nowplaying: "nowPlaying",
    "now playing": "nowPlaying"
  };

  function profile() {
    try { return typeof global.curP === "function" ? global.curP() : null; } catch (e) { return null; }
  }

  function state() {
    var p = profile();
    if (!p) return null;
    if (!p.state) p.state = {};
    return p.state;
  }

  function save() {
    try { if (typeof global.saveStateNow === "function") global.saveStateNow(); } catch (e) {}
  }

  function actions() {
    try {
      return global.ETHONEActions || global.ACTION_REGISTRY ||
        (global.Ethone && global.Ethone.get && global.Ethone.get("actions")) || null;
    } catch (e) {
      return null;
    }
  }

  function dispatch(id, ctx) {
    var A = actions();
    try {
      if (A && typeof A.dispatch === "function") return A.dispatch(id, Object.assign({ source: "brain-agent" }, ctx || {}));
    } catch (e) {
      console.warn("[Brain Agent] action dispatch failed", id, e);
    }
    return false;
  }

  function openPage(page) {
    if (dispatch("navigation.open", { page: page })) return true;
    try {
      if (typeof global.switchPage === "function") {
        global.switchPage(page, null);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function toast(message, type) {
    try {
      if (typeof global.toast === "function") {
        global.toast(message, type || "info");
        return;
      }
    } catch (e) {}
    console[type === "error" ? "error" : "log"]("[Brain Agent]", message);
  }

  function recordActivity(title, body, category) {
    try {
      if (global.ETHONETimeline && typeof global.ETHONETimeline.record === "function") {
        global.ETHONETimeline.record({
          title: title,
          body: body || "",
          category: category || "ai",
          icon: "brain",
          source: "Brain Agent",
          dedupe: "brain-agent-" + Date.now()
        });
        return;
      }
      if (typeof global.addActivity === "function") global.addActivity(title, "var(--accent)", "ai");
    } catch (e) {}
  }

  function ensureAgentState() {
    var s = state();
    if (!s) return null;
    if (!s.brainAgent) s.brainAgent = { version: ACTION_VERSION, history: [], queued: [] };
    if (!Array.isArray(s.brainAgent.history)) s.brainAgent.history = [];
    if (!Array.isArray(s.brainAgent.queued)) s.brainAgent.queued = [];
    s.brainAgent.version = ACTION_VERSION;
    return s.brainAgent;
  }

  function pushHistory(entry) {
    var st = ensureAgentState();
    if (!st) return;
    st.history.unshift(Object.assign({ ts: Date.now(), source: "brain-agent" }, entry || {}));
    st.history = st.history.slice(0, HISTORY_LIMIT);
    save();
  }

  function normalize(text) {
    return String(text || "")
      .replace(/[’]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function lower(text) {
    var value = normalize(text).toLowerCase();
    try { value = value.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
    return value;
  }

  function lang() {
    return String(global._lang || "fr").slice(0, 2).toLowerCase();
  }

  function i18n(fr, en) {
    return lang() === "fr" ? fr : en;
  }

  function escapeText(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function cleanTitle(value, fallback) {
    var v = normalize(value)
      .replace(/^(une?|un|a|an|la|le|les|des|du|de|the)\s+/i, "")
      .replace(/^(note|tache|tâche|task|todo|workspace|space|espace|database|base|db|plugin|widget|theme|thème)\s*[:\-]?\s*/i, "")
      .replace(/\s+(stp|svp|please)$/i, "")
      .trim();
    return v || fallback;
  }

  function quoted(text) {
    var m = String(text || "").match(/[“"«](.+?)[”"»]/);
    return m ? m[1] : "";
  }

  function afterKeyword(text, words, fallback) {
    var q = quoted(text);
    if (q) return cleanTitle(q, fallback);
    var escaped = words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|");
    var rx = new RegExp("(?:^|\\b)(?:" + escaped + ")(?:\\s+(?:appellee?|appel[eé]e?|nommee?|nomm[eé]e?|called|named))?\\s*[:\\-]?\\s*(.+)$", "i");
    var m = String(text || "").match(rx);
    if (m && m[1]) return cleanTitle(m[1], fallback);
    return fallback;
  }

  function detectKnown(source, aliases) {
    var t = lower(source);
    var keys = Object.keys(aliases).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var rx = new RegExp("(^|[^a-z0-9])" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)", "i");
      if (rx.test(t)) return aliases[key];
    }
    return "";
  }

  function inferIntent(text) {
    var t = lower(text);
    if (!t) return { intent: "", confidence: 0 };

    var hasCreate = /\b(cree|crée|creer|créer|ajoute|nouveau|nouvelle|create|make|add|new)\b/.test(t);
    var hasInstall = /\b(installe|installer|install|enable|active|ajoute)\b/.test(t);
    var hasMove = /\b(deplace|déplace|deplacer|déplacer|move|reorder|remonte|descends|place)\b/.test(t);
    var hasModify = /\b(modifie|modifier|change|changer|applique|apply|set|mets|met)\b/.test(t);

    if ((hasCreate || /\bnote\b/.test(t)) && /\bnote\b/.test(t)) return { intent: "note.create", confidence: hasCreate ? 0.92 : 0.72 };
    if ((hasCreate || /\b(task|todo|tache|tâche)\b/.test(t)) && /\b(task|todo|tache|tâche)\b/.test(t)) return { intent: "task.create", confidence: hasCreate ? 0.92 : 0.72 };
    if ((hasCreate || /\b(workspace|space|espace)\b/.test(t)) && /\b(workspace|space|espace)\b/.test(t)) return { intent: "workspace.create", confidence: hasCreate ? 0.9 : 0.7 };
    if ((hasCreate || /\b(database|base|db)\b/.test(t)) && /\b(database|base|db)\b/.test(t)) return { intent: "database.create", confidence: hasCreate ? 0.9 : 0.7 };
    if (hasInstall && /\b(widget|widgets)\b/.test(t)) return { intent: "widget.install", confidence: 0.85 };
    if (hasInstall && (/\b(plugin|extension|integration|integrations?)\b/.test(t) || detectKnown(t, PLUGIN_ALIASES))) return { intent: "plugin.install", confidence: 0.86 };
    if (hasMove && /\b(widget|widgets)\b/.test(t)) return { intent: "widget.move", confidence: 0.82 };
    if (hasModify && /\b(theme|thème|accent|couleur|color|palette)\b/.test(t)) return { intent: "theme.apply", confidence: 0.85 };
    return { intent: "", confidence: 0 };
  }

  function plan(input, context) {
    var text = normalize(input);
    var inferred = inferIntent(text);
    if (!inferred.intent) {
      return {
        intent: "",
        confidence: 0,
        executable: false,
        needsConfirmation: false,
        input: text,
        message: i18n("Je peux agir dans ETHONE, mais je n'ai pas reconnu d'action locale claire.", "I can act inside ETHONE, but I did not detect a clear local action."),
        steps: []
      };
    }

    var payload = {};
    var steps = [];
    var needsConfirmation = false;
    if (inferred.intent === "note.create") {
      payload.title = afterKeyword(text, ["note"], i18n("Nouvelle note", "New note"));
      payload.content = quoted(text) ? "" : "";
      steps = [i18n("Créer une note locale", "Create a local note"), i18n("Ouvrir Notes", "Open Notes")];
    } else if (inferred.intent === "task.create") {
      payload.text = afterKeyword(text, ["tache", "tâche", "task", "todo"], i18n("Nouvelle tâche", "New task"));
      payload.priority = /\b(urgent|high|haute|important)\b/.test(lower(text)) ? "high" : "normal";
      steps = [i18n("Créer une tâche locale", "Create a local task"), i18n("Ouvrir Tâches", "Open Tasks")];
    } else if (inferred.intent === "workspace.create") {
      payload.name = afterKeyword(text, ["workspace", "space", "espace"], i18n("Nouveau Space", "New Space"));
      payload.accent = detectColor(text) || "#8b5cf6";
      steps = [i18n("Créer un Workspace", "Create a Workspace"), i18n("Le rendre disponible dans le switcher", "Make it available in the switcher")];
    } else if (inferred.intent === "database.create") {
      payload.name = afterKeyword(text, ["database", "base", "db"], i18n("Nouvelle base", "New database"));
      steps = [i18n("Créer une base Notion-like", "Create a Notion-like database"), i18n("Ouvrir Databases", "Open Databases")];
    } else if (inferred.intent === "plugin.install") {
      payload.plugin = detectKnown(text, PLUGIN_ALIASES) || cleanTitle(afterKeyword(text, ["plugin", "extension", "integration", "intégration"], ""), "");
      steps = [i18n("Installer/activer le plugin local", "Install/enable the local plugin"), i18n("Ouvrir le Plugin Hub si besoin", "Open Plugin Hub if needed")];
    } else if (inferred.intent === "theme.apply") {
      payload.theme = detectKnown(text, THEME_ALIASES);
      payload.accent = detectColor(text);
      steps = [i18n("Appliquer le thème ou l'accent", "Apply theme or accent"), i18n("Sauvegarder les préférences", "Save preferences")];
    } else if (inferred.intent === "widget.install") {
      payload.widget = detectKnown(text, WIDGET_ALIASES) || cleanTitle(afterKeyword(text, ["widget"], ""), "");
      steps = [i18n("Installer le widget sur le Dashboard", "Install widget on the Dashboard"), i18n("Rafraîchir le layout", "Refresh layout")];
    } else if (inferred.intent === "widget.move") {
      payload.widget = detectKnown(text, WIDGET_ALIASES) || cleanTitle(afterKeyword(text, ["widget"], ""), "");
      payload.position = /\b(bas|bottom|fin|end)\b/.test(lower(text)) ? "bottom" : "top";
      steps = [i18n("Réordonner le widget dans le layout actif", "Reorder widget in the active layout"), i18n("Sauvegarder le Dashboard", "Save Dashboard")];
    }

    if (/supprime|delete|remove|reset|efface/i.test(text)) needsConfirmation = true;
    return {
      intent: inferred.intent,
      confidence: inferred.confidence,
      executable: true,
      needsConfirmation: needsConfirmation,
      input: text,
      payload: payload,
      steps: steps,
      context: context || {},
      message: i18n("Brain Agent a préparé une action ETHONE.", "Brain Agent prepared an ETHONE action.")
    };
  }

  function detectColor(text) {
    var hex = String(text || "").match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i);
    if (hex) return hex[0];
    var t = lower(text);
    if (/\b(red|rouge)\b/.test(t)) return "#ef4444";
    if (/\b(green|vert)\b/.test(t)) return "#22c55e";
    if (/\b(blue|bleu)\b/.test(t)) return "#3b82f6";
    if (/\b(purple|violet)\b/.test(t)) return "#8b5cf6";
    if (/\b(pink|rose)\b/.test(t)) return "#ec4899";
    if (/\b(orange|amber)\b/.test(t)) return "#f59e0b";
    return "";
  }

  function execute(inputOrPlan, options) {
    var currentPlan = typeof inputOrPlan === "string" ? plan(inputOrPlan, options || {}) : inputOrPlan;
    if (!currentPlan || !currentPlan.intent || !currentPlan.executable) {
      return result(false, currentPlan, i18n("Aucune action ETHONE reconnue.", "No ETHONE action recognized."));
    }
    if (currentPlan.needsConfirmation && !(options && options.confirmed)) {
      return result(false, currentPlan, i18n("Cette action nécessite une confirmation explicite.", "This action requires explicit confirmation."));
    }

    try {
      var out;
      switch (currentPlan.intent) {
        case "note.create": out = createNote(currentPlan.payload); break;
        case "task.create": out = createTask(currentPlan.payload); break;
        case "workspace.create": out = createWorkspace(currentPlan.payload); break;
        case "plugin.install": out = installPlugin(currentPlan.payload); break;
        case "theme.apply": out = applyTheme(currentPlan.payload); break;
        case "database.create": out = createDatabase(currentPlan.payload); break;
        case "widget.install": out = installWidget(currentPlan.payload); break;
        case "widget.move": out = moveWidget(currentPlan.payload); break;
        default: out = { ok: false, message: i18n("Action inconnue.", "Unknown action.") };
      }
      var entry = {
        ok: !!out.ok,
        intent: currentPlan.intent,
        input: currentPlan.input,
        payload: currentPlan.payload,
        message: out.message
      };
      pushHistory(entry);
      if (out.ok) recordActivity("Brain Agent: " + labelFor(currentPlan.intent), out.message, "ai");
      return result(out.ok, currentPlan, out.message, out.data);
    } catch (error) {
      console.error("[Brain Agent] execute failed", error);
      pushHistory({ ok: false, intent: currentPlan.intent, input: currentPlan.input, payload: currentPlan.payload, message: error.message });
      return result(false, currentPlan, i18n("Brain Agent a stoppé l'action sans casser l'interface : ", "Brain Agent stopped safely: ") + (error.message || error));
    }
  }

  function result(ok, currentPlan, message, data) {
    var payload = {
      ok: !!ok,
      intent: currentPlan && currentPlan.intent || "",
      plan: currentPlan || null,
      message: message || "",
      data: data || null
    };
    if (message) toast(message, ok ? "success" : "info");
    return payload;
  }

  function labelFor(intent) {
    return ({
      "note.create": i18n("note créée", "note created"),
      "task.create": i18n("tâche créée", "task created"),
      "workspace.create": i18n("workspace créé", "workspace created"),
      "plugin.install": i18n("plugin installé", "plugin installed"),
      "theme.apply": i18n("thème appliqué", "theme applied"),
      "database.create": i18n("base créée", "database created"),
      "widget.install": i18n("widget installé", "widget installed"),
      "widget.move": i18n("widget déplacé", "widget moved")
    })[intent] || intent;
  }

  function createNote(payload) {
    var s = state();
    if (!s) return { ok: false, message: i18n("Profil indisponible.", "Profile unavailable.") };
    if (!Array.isArray(s.notes)) s.notes = [];
    var now = new Date().toISOString();
    var id = Date.now();
    var title = cleanTitle(payload && payload.title, i18n("Nouvelle note", "New note"));
    var note = {
      id: id,
      title: title,
      content: payload && payload.content ? String(payload.content) : "# " + title + "\n\n",
      color: "#8b5cf6",
      pinned: false,
      created: now,
      updated: now,
      tags: ["brain"],
      relations: []
    };
    s.notes.unshift(note);
    save();
    openPage("notes");
    setTimeout(function () {
      try { if (typeof global.renderNotesList === "function") global.renderNotesList(); } catch (e) {}
      try { if (typeof global.selectNote === "function") global.selectNote(id); } catch (e) {}
    }, 90);
    return { ok: true, message: i18n("Note créée : ", "Note created: ") + title, data: note };
  }

  function createTask(payload) {
    var s = state();
    if (!s) return { ok: false, message: i18n("Profil indisponible.", "Profile unavailable.") };
    if (!Array.isArray(s.todos)) s.todos = [];
    var text = cleanTitle(payload && payload.text, i18n("Nouvelle tâche", "New task"));
    var task = {
      id: Date.now(),
      text: text,
      priority: payload && payload.priority || "normal",
      done: false,
      color: "",
      due: payload && payload.due || "",
      tag: "Brain",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      createdAt: new Date().toISOString()
    };
    s.todos.unshift(task);
    save();
    openPage("todos");
    setTimeout(function () {
      try { if (typeof global.renderTodos === "function") global.renderTodos(); } catch (e) {}
      try { if (typeof global.updateStats === "function") global.updateStats(); } catch (e) {}
    }, 90);
    return { ok: true, message: i18n("Tâche créée : ", "Task created: ") + text, data: task };
  }

  function createWorkspace(payload) {
    var name = cleanTitle(payload && payload.name, i18n("Nouveau Space", "New Space"));
    var api = global.ETHONEWorkspaces || global.ETHONESpaces || (global.Ethone && global.Ethone.get && global.Ethone.get("workspaces"));
    var workspace = null;
    if (api && typeof api.create === "function") {
      workspace = api.create({
        name: name,
        label: name,
        description: i18n("Créé par Brain Agent.", "Created by Brain Agent."),
        accent: payload && payload.accent || "#8b5cf6",
        icon: "brain"
      });
      if (workspace && typeof api.setActive === "function") api.setActive(workspace.id, { silent: true });
    } else {
      var p = profile();
      if (!p) return { ok: false, message: i18n("Profil indisponible.", "Profile unavailable.") };
      if (!Array.isArray(p.workspaces)) p.workspaces = [];
      workspace = { id: "ws-" + Date.now().toString(36), name: name, label: name, accent: payload && payload.accent || "#8b5cf6", icon: "brain", createdAt: new Date().toISOString() };
      p.workspaces.push(workspace);
      p.activeWorkspaceId = workspace.id;
      save();
    }
    try { global.dispatchEvent(new CustomEvent("ethone:workspace-change", { detail: { workspace: workspace } })); } catch (e) {}
    return { ok: true, message: i18n("Workspace créé : ", "Workspace created: ") + name, data: workspace };
  }

  function installPlugin(payload) {
    var id = payload && payload.plugin;
    if (!id) return { ok: false, message: i18n("Plugin non reconnu.", "Plugin not recognized.") };
    var hub = global.ETHONEPluginHub;
    if (hub && typeof hub.install === "function") {
      if (Array.isArray(hub.plugins) && !hub.plugins.some(function (plugin) { return plugin && plugin.id === id; })) {
        return { ok: false, message: i18n("Plugin indisponible : ", "Plugin unavailable: ") + id };
      }
      hub.install(id);
      var st = typeof hub.state === "function" ? hub.state(id) : null;
      if (st && st.installed === false) return { ok: false, message: i18n("Plugin non installe : ", "Plugin not installed: ") + id };
      return { ok: true, message: i18n("Plugin activé : ", "Plugin enabled: ") + id, data: { id: id } };
    }
    var s = state();
    if (!s) return { ok: false, message: i18n("Profil indisponible.", "Profile unavailable.") };
    if (!s.pluginHub) s.pluginHub = { plugins: {} };
    if (!s.pluginHub.plugins) s.pluginHub.plugins = {};
    s.pluginHub.plugins[id] = Object.assign({}, s.pluginHub.plugins[id] || {}, {
      installed: true,
      enabled: true,
      status: "installed",
      installedAt: Date.now(),
      updatedAt: Date.now()
    });
    save();
    return { ok: true, message: i18n("Plugin activé localement : ", "Plugin enabled locally: ") + id, data: { id: id } };
  }

  function applyTheme(payload) {
    var engine = global.ETHONEThemeEngine;
    if (!engine) return { ok: false, message: i18n("Moteur de thème indisponible.", "Theme engine unavailable.") };
    var theme = payload && payload.theme;
    var accent = payload && payload.accent;
    if (theme && typeof engine.setPreset === "function") {
      engine.setPreset(theme, { toast: false });
      return { ok: true, message: i18n("Thème appliqué : ", "Theme applied: ") + theme, data: { theme: theme } };
    }
    if (accent && typeof engine.setField === "function") {
      engine.setField("customAccent", accent);
      return { ok: true, message: i18n("Accent appliqué : ", "Accent applied: ") + accent, data: { accent: accent } };
    }
    return { ok: false, message: i18n("Thème ou couleur non reconnu.", "Theme or color not recognized.") };
  }

  function createDatabase(payload) {
    var name = cleanTitle(payload && payload.name, i18n("Nouvelle base", "New database"));
    var db = null;
    if (typeof global.dbCreate === "function") {
      db = global.dbCreate({
        name: name,
        icon: "Brain",
        color: "#8b5cf6",
        description: i18n("Base créée par Brain Agent.", "Database created by Brain Agent."),
        columns: [
          { key: "title", label: "Name", type: "text", width: 240, primary: true },
          { key: "status", label: "Status", type: "select", width: 150, options: ["Todo", "Doing", "Done"] },
          { key: "created", label: "Created", type: "date", width: 140 }
        ],
        rows: []
      });
    } else {
      var s = state();
      if (!s) return { ok: false, message: i18n("Profil indisponible.", "Profile unavailable.") };
      if (!Array.isArray(s.databases)) s.databases = [];
      db = { id: Date.now(), name: name, icon: "Brain", color: "#8b5cf6", columns: [{ key: "title", label: "Name", type: "text", primary: true }], rows: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      s.databases.push(db);
      save();
    }
    openPage("databases");
    return { ok: true, message: i18n("Database créée : ", "Database created: ") + name, data: db };
  }

  function installWidget(payload) {
    var type = payload && payload.widget;
    if (!type) return { ok: false, message: i18n("Widget non reconnu.", "Widget not recognized.") };
    var ok = false;
    if (global.ETHONEWidgetMarketplace && typeof global.ETHONEWidgetMarketplace.install === "function") {
      ok = !!global.ETHONEWidgetMarketplace.install(type);
    }
    if (!ok && typeof global.ethoneDashboardV4AddWidget === "function") {
      ok = !!global.ethoneDashboardV4AddWidget(type, {});
    }
    if (!ok) {
      ok = dispatch("dashboard.edit.addWidgetType", { widgetType: type, config: {}, source: "brain-agent" });
    }
    if (!ok) return { ok: false, message: i18n("Widget indisponible : ", "Widget unavailable: ") + type };
    openPage("dashboard");
    try { if (typeof global.ethoneDashboardV4Render === "function") global.ethoneDashboardV4Render(); } catch (e) {}
    return { ok: true, message: i18n("Widget ajouté : ", "Widget added: ") + type, data: { widget: type } };
  }

  function moveWidget(payload) {
    var type = payload && payload.widget;
    var position = payload && payload.position || "top";
    if (!type) return { ok: false, message: i18n("Widget non reconnu.", "Widget not recognized.") };
    var moved = moveDashboardV4Widget(type, position);
    if (!moved) {
      var st = ensureAgentState();
      if (st) st.queued.unshift({ type: "widget.move", widget: type, position: position, ts: Date.now() });
      save();
      dispatch("widgets.manage");
      return { ok: true, message: i18n("Action préparée : ouvre le gestionnaire de widgets pour finaliser le déplacement de ", "Action prepared: open Widget Manager to finish moving ") + type, data: { queued: true } };
    }
    openPage("dashboard");
    try { if (typeof global.ethoneDashboardV4Render === "function") global.ethoneDashboardV4Render(); } catch (e) {}
    return { ok: true, message: i18n("Widget déplacé : ", "Widget moved: ") + type, data: { widget: type, position: position } };
  }

  function moveDashboardV4Widget(type, position) {
    try {
      var raw = localStorage.getItem("ethone:dashboard-v4-layouts");
      var lib = raw ? JSON.parse(raw) : null;
      if (!lib || !Array.isArray(lib.layouts)) return false;
      var layout = lib.layouts.find(function (l) { return l.id === lib.activeId; }) || lib.layouts[0];
      if (!layout || !layout.prefs || !Array.isArray(layout.prefs.instances)) return false;
      var list = layout.prefs.instances;
      var idx = list.findIndex(function (w) { return w && (w.type === type || String(w.instanceId || "").indexOf(type) === 0); });
      if (idx < 0) return false;
      var item = list.splice(idx, 1)[0];
      if (position === "bottom") list.push(item);
      else list.unshift(item);
      localStorage.setItem("ethone:dashboard-v4-layouts", JSON.stringify(lib));
      localStorage.setItem("ethone:dashboard-v4-layout", JSON.stringify(layout.prefs));
      try { global.dispatchEvent(new CustomEvent("ethone:dashboard-widgets-changed", { detail: { type: type, position: position } })); } catch (e) {}
      return true;
    } catch (e) {
      console.warn("[Brain Agent] widget move failed", e);
      return false;
    }
  }

  function capabilities() {
    return [
      "note.create",
      "task.create",
      "workspace.create",
      "plugin.install",
      "theme.apply",
      "database.create",
      "widget.install",
      "widget.move"
    ].slice();
  }

  function history() {
    var st = ensureAgentState();
    return st ? st.history.slice() : [];
  }

  function run(input, options) {
    return execute(plan(input, options || {}), options || {});
  }

  function registerActions() {
    var A = actions();
    if (!A || typeof A.register !== "function") return false;
    if (A.has && A.has("brain.agent.run")) return true;
    A.register("brain.agent.run", { label: "Brain Agent", handler: function (ctx) { return run(ctx.input || ctx.text || ""); } });
    A.register("brain.agent.plan", { label: "Brain Agent plan", handler: function (ctx) { return plan(ctx.input || ctx.text || "", ctx); } });
    A.register("brain.agent.execute", { label: "Brain Agent execute", handler: function (ctx) { return execute(ctx.plan || ctx.input || ctx.text || "", ctx); } });
    A.register("brain.agent.history", { label: "Brain Agent history", handler: function () { openPage("ai"); return history(); } });
    A.register("workspace.create", { label: "Create workspace", handler: function (ctx) { return createWorkspace({ name: ctx.name || ctx.input || i18n("Nouveau Space", "New Space"), accent: ctx.accent }); } });
    A.register("plugin.install", { label: "Install plugin", handler: function (ctx) { return installPlugin({ plugin: ctx.plugin || ctx.id }); } });
    A.register("theme.apply", { label: "Apply theme", handler: function (ctx) { return applyTheme({ theme: ctx.theme, accent: ctx.accent }); } });
    A.register("database.create", { label: "Create database", handler: function (ctx) { return createDatabase({ name: ctx.name || ctx.input }); } });
    A.register("widget.install", { label: "Install widget", handler: function (ctx) { return installWidget({ widget: ctx.widget || ctx.type }); } });
    A.register("widget.move", { label: "Move widget", handler: function (ctx) { return moveWidget({ widget: ctx.widget || ctx.type, position: ctx.position }); } });
    return true;
  }

  function shouldIntercept(text) {
    var p = plan(text);
    return p && p.intent && p.confidence >= 0.8 && p.executable && !p.needsConfirmation;
  }

  function wrapChat() {
    if (wrappedChat || typeof global.sendAIMessage !== "function") return false;
    var previous = global.sendAIMessage;
    if (previous.__brainAgentWrapped) return true;
    global.sendAIMessage = async function brainAgentSendAIMessage() {
      var input = document.getElementById("ai-input");
      var text = input && input.value ? input.value.trim() : "";
      if (!text || !shouldIntercept(text)) return previous.apply(this, arguments);

      var send = document.getElementById("ai-send-btn");
      var typingShown = false;
      try {
        if (send) send.disabled = true;
        input.value = "";
        input.style.height = "auto";
        if (typeof global.addAIMessage === "function") global.addAIMessage("user", text);
        try { if (typeof _aiHistory !== "undefined") _aiHistory.push({ role: "user", content: text, ts: Date.now(), origin: "brain-agent" }); } catch (e) {}
        try { if (typeof _aiTyping !== "undefined") _aiTyping = true; } catch (e) {}
        if (typeof global.showAITyping === "function") { global.showAITyping(); typingShown = true; }
        await delay(140);
        var execution = execute(text, { source: "ai-chat" });
        if (typingShown && typeof global.removeAITyping === "function") { global.removeAITyping(); typingShown = false; }
        var reply = formatAgentReply(execution);
        if (typeof global.addAIMessage === "function") global.addAIMessage("assistant", reply);
        try {
          if (typeof _aiHistory !== "undefined") {
            _aiHistory.push({ role: "assistant", content: reply, ts: Date.now(), provider: "brain-agent", model: ACTION_VERSION });
            if (_aiHistory.length > 32) _aiHistory = _aiHistory.slice(-32);
          }
          if (typeof global.saveAIChats === "function") global.saveAIChats();
        } catch (e) {}
      } catch (error) {
        if (typingShown && typeof global.removeAITyping === "function") { global.removeAITyping(); typingShown = false; }
        console.error("[Brain Agent] chat action failed", error);
        if (typeof global.addAIMessage === "function") global.addAIMessage("assistant", i18n("Action stoppée sans casser ETHONE : ", "Action stopped safely: ") + (error.message || error));
      } finally {
        try { if (typeof _aiTyping !== "undefined") _aiTyping = false; } catch (e) {}
        if (send) send.disabled = false;
        try { input && input.focus(); } catch (e) {}
      }
    };
    global.sendAIMessage.__brainAgentWrapped = true;
    global.sendAIMessage.__aicWrapped = !!previous.__aicWrapped;
    wrappedChat = true;
    return true;
  }

  function formatAgentReply(execution) {
    if (!execution) return i18n("Action terminée.", "Action complete.");
    var planObj = execution.plan || {};
    var steps = Array.isArray(planObj.steps) && planObj.steps.length
      ? "\n\n" + planObj.steps.map(function (step) { return "- " + step; }).join("\n")
      : "";
    return (execution.ok ? "**Brain Agent**\n" : "**Brain Agent**\n") + escapeText(execution.message || "") + steps;
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  var api = {
    version: ACTION_VERSION,
    plan: plan,
    execute: execute,
    run: run,
    capabilities: capabilities,
    history: history,
    registerActions: registerActions,
    wrapChat: wrapChat
  };

  global.ETHONEBrainAgent = api;
  try {
    if (global.Ethone && global.Ethone.define) global.Ethone.define("brainAgent", Object.freeze(api));
  } catch (e) {}

  function boot() {
    registerActions();
    wrapChat();
    setTimeout(function () { registerActions(); wrapChat(); }, 250);
    setTimeout(function () { registerActions(); wrapChat(); }, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(window);
