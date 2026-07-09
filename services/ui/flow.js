/* ETHONE Flow: one-click workspace context orchestration. */
(function () {
  "use strict";
  if (window.__ethoneFlow) return;
  window.__ethoneFlow = true;

  var DATA_URL = "./data/flows.json";
  var STORE_KEY = "ethone:flow:v1";
  var LAYOUTS_KEY = "ethone:dashboard-v4-layouts";
  var ACTIVE_LAYOUT_KEY = "ethone:dashboard-v4-layout";
  var SMART_KEY = "ethone:smart-layouts:v1";
  var DEFAULT_FLOW = "personal";
  var PACK = {
    schema: 1,
    currentVersion: "4.0.0",
    defaultFlow: DEFAULT_FLOW,
    flows: [
      { id: "personal", name: "Personal Flow", icon: "home", color: "#8b5cf6", description: "Journal, habits, calendar and daily context.", startPage: "dashboard", widgets: ["hero", "brain", "today", "calendar", "weather", "habits", "goals", "notes", "quickActions"], panels: ["calendar", "notes", "ai"], pages: ["dashboard", "calendar", "notes", "habits", "todos"], integrations: ["weather"], shortcuts: ["Ctrl+K"] },
      { id: "development", name: "Development Flow", icon: "square-terminal", color: "#7c3aed", description: "GitHub, Brain, notes and system performance.", startPage: "dashboard", widgets: ["hero", "brain", "github", "terminal", "notes", "calendar", "productivity", "cpu", "ram", "network", "aiSuggestions", "quickActions"], panels: ["github", "notes", "ai"], pages: ["dashboard", "github", "ai", "notes", "calendar"], integrations: ["github"], shortcuts: ["Ctrl+K"] },
      { id: "gaming", name: "Gaming Flow", icon: "gamepad-2", color: "#a855f7", description: "Discord, Spotify, Valorant, Steam and performance.", startPage: "dashboard", widgets: ["hero", "brain", "discord", "spotify", "steam", "valorant", "nowPlaying", "cpu", "ram", "network", "quickActions"], panels: ["discord", "spotify", "ai"], pages: ["dashboard", "gaming", "valorant-accounts", "connections"], integrations: ["discord", "spotify", "steam"], shortcuts: ["Ctrl+K"] },
      { id: "study", name: "Study Flow", icon: "book-open-check", color: "#c084fc", description: "Notes, files, focus and Brain summaries.", startPage: "dashboard", widgets: ["hero", "brain", "notes", "calendar", "productivity", "goals", "habits", "weather", "quickActions"], panels: ["notes", "files", "ai"], pages: ["dashboard", "notes", "files", "ai", "calendar"], integrations: ["google-calendar"], shortcuts: ["Ctrl+K"] },
      { id: "streaming", name: "Streaming Flow", icon: "radio", color: "#d946ef", description: "OBS, Twitch, Discord, Spotify and clips.", startPage: "dashboard", widgets: ["hero", "brain", "discord", "spotify", "twitch", "nowPlaying", "calendar", "cpu", "ram", "network", "quickActions"], panels: ["discord", "spotify", "calendar", "ai"], pages: ["dashboard", "connections", "gaming", "calendar"], integrations: ["obs", "twitch", "discord", "spotify"], shortcuts: ["Ctrl+K"] }
    ],
    marketplace: []
  };
  var FEATURE_OPTIONS = {
    pages: [
      ["dashboard", "Dashboard", "layout-dashboard"],
      ["ai", "ETHONE AI", "brain"],
      ["notes", "Notes", "notebook-pen"],
      ["files", "Files", "folder"],
      ["calendar", "Calendar", "calendar-days"],
      ["journal", "Journal", "book-open"],
      ["todos", "Tasks", "circle-check"],
      ["github", "GitHub", "git-branch"],
      ["gaming", "Gaming", "gamepad-2"],
      ["connections", "Connections", "plug-zap"],
      ["databases", "Databases", "database"],
      ["studio", "Studio", "wand-sparkles"]
    ],
    widgets: [
      ["hero", "Hero", "sparkles"],
      ["brain", "Brain", "brain-circuit"],
      ["today", "Today", "sun"],
      ["calendar", "Calendar", "calendar"],
      ["notes", "Notes", "notebook-pen"],
      ["weather", "Weather", "cloud-sun"],
      ["github", "GitHub", "git-branch"],
      ["discord", "Discord", "message-circle"],
      ["spotify", "Spotify", "music"],
      ["steam", "Steam", "gamepad-2"],
      ["twitch", "Twitch", "radio"],
      ["lastfm", "LastFM", "disc-3"],
      ["valorant", "Valorant", "crosshair"],
      ["nowPlaying", "Now Playing", "radio"],
      ["timelineFeed", "Timeline", "history"],
      ["productivity", "Productivity", "activity"],
      ["cpu", "CPU", "cpu"],
      ["ram", "RAM", "memory-stick"],
      ["network", "Network", "wifi"],
      ["habits", "Habits", "repeat"],
      ["goals", "Goals", "target"],
      ["quickActions", "Quick Actions", "zap"]
    ],
    panels: [
      ["ai", "Brain Panel", "brain"],
      ["notes", "Notes Panel", "notebook-pen"],
      ["files", "Files Panel", "folder"],
      ["calendar", "Calendar Panel", "calendar-days"],
      ["github", "GitHub Panel", "git-branch"],
      ["discord", "Discord Panel", "message-circle"],
      ["spotify", "Spotify Panel", "music"]
    ],
    actions: [
      ["dashboard.open", "Open Dashboard", "layout-dashboard"],
      ["ai.open", "Open Brain", "brain"],
      ["notes.new", "New Note", "file-plus"],
      ["tasks.new", "New Task", "circle-plus"],
      ["calendar.new", "New Event", "calendar-plus"],
      ["marketplace.open", "Open Marketplace", "store"],
      ["widgets.open", "Open Widgets", "panel-right-open"],
      ["command.open", "Command Palette", "search"]
    ],
    integrations: [
      ["github", "GitHub", "git-branch"],
      ["discord", "Discord", "message-circle"],
      ["spotify", "Spotify", "music"],
      ["steam", "Steam", "gamepad-2"],
      ["riot", "Riot", "crosshair"],
      ["twitch", "Twitch", "radio"],
      ["obs", "OBS", "video"],
      ["google-calendar", "Google Calendar", "calendar-days"],
      ["google-drive", "Google Drive", "hard-drive"]
    ]
  };
  var WIDGET_SIZES = {
    hero: { col: 4, row: 1 },
    brain: { col: 4, row: 1 },
    today: { col: 2, row: 2 },
    quickActions: { col: 6, row: 1 },
    calendar: { col: 2, row: 1 },
    notes: { col: 2, row: 1 },
    github: { col: 2, row: 1 },
    discord: { col: 2, row: 1 },
    spotify: { col: 2, row: 1 },
    steam: { col: 2, row: 1 },
    valorant: { col: 2, row: 1 },
    nowPlaying: { col: 2, row: 1 },
    cpu: { col: 2, row: 1 },
    ram: { col: 2, row: 1 },
    network: { col: 2, row: 1 },
    productivity: { col: 2, row: 1 }
  };
  var PAGE_TO_FLOW = {
    github: "development",
    studio: "development",
    databases: "development",
    gaming: "gaming",
    "valorant-accounts": "gaming",
    notes: "study",
    files: "study",
    calendar: "personal",
    habits: "personal",
    goals: "personal"
  };
  var PANEL_ALLOWED = { ai: true, notes: true, files: true, calendar: true, github: true, discord: true, spotify: true };
  var state = {
    version: 1,
    activeId: DEFAULT_FLOW,
    customFlows: [],
    installed: [],
    favorites: [DEFAULT_FLOW],
    recent: [],
    dismissedSuggestions: {},
    history: [],
    previousSmartLayouts: null
  };
  var ui = { root: null, switcher: null, builder: null, marketplace: null, suggestion: null, transition: null };
  var builderDraft = null;
  var dragIndex = -1;
  var registeredActionIds = Object.create(null);

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function clone(value) {
    return JSON.parse(JSON.stringify(value || null));
  }
  function esc(value) {
    try {
      return window.EthoneCore && window.EthoneCore.dom ? window.EthoneCore.dom.escapeHTML(value) : String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
      });
    } catch (e) {
      return String(value == null ? "" : value);
    }
  }
  function icon(name) {
    return '<i data-lucide="' + esc(name || "circle") + '" aria-hidden="true"></i>';
  }
  function notify(message, type) {
    try {
      var n = window.Ethone && window.Ethone.get && window.Ethone.get("notifications");
      if (n && n.toast) return n.toast(message, type || "info");
    } catch (e) {}
    try {
      if (typeof window.showToast === "function") return window.showToast(message, type || "info");
    } catch (e2) {}
  }
  function actions() {
    try { return window.ACTION_REGISTRY || window.ETHONEActions || (window.Ethone && window.Ethone.get && window.Ethone.get("actions")) || null; } catch (e) { return null; }
  }
  function runAction(id, ctx) {
    var A = actions();
    if (!id) return false;
    try {
      if (A && A.has && A.has(id)) {
        A.dispatch ? A.dispatch(id, ctx || {}) : A.run(id, ctx || {});
        return true;
      }
      if (A && (A.run || A.execute)) {
        (A.run || A.execute)(id, ctx || {});
        return true;
      }
    } catch (e) {
      console.warn("[ETHONE Flow] action failed", id, e);
      notify("Fonctionnalite bientot disponible: " + id, "info");
      return false;
    }
    return false;
  }
  function renderIcons(root) {
    try {
      if (window.lucide && !window.__lucideFailed) window.lucide.createIcons({}, root || document);
    } catch (e) {}
  }
  function normalizeRgb(hex) {
    var clean = String(hex || "#8b5cf6").replace("#", "").trim();
    if (clean.length === 3) clean = clean.split("").map(function (c) { return c + c; }).join("");
    var num = parseInt(clean.slice(0, 6), 16);
    if (!isFinite(num)) return "139, 92, 246";
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255].join(", ");
  }
  function mergeUnique(list) {
    var seen = {};
    return (list || []).filter(function (item) {
      item = String(item || "").trim();
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
  function loadState() {
    var saved = readJSON(STORE_KEY, null);
    if (saved && typeof saved === "object") {
      Object.keys(state).forEach(function (key) {
        if (saved[key] !== undefined) state[key] = saved[key];
      });
    }
    state.customFlows = Array.isArray(state.customFlows) ? state.customFlows : [];
    state.installed = Array.isArray(state.installed) ? state.installed : [];
    state.favorites = Array.isArray(state.favorites) && state.favorites.length ? state.favorites : [DEFAULT_FLOW];
    state.recent = Array.isArray(state.recent) ? state.recent : [];
    state.history = Array.isArray(state.history) ? state.history : [];
    state.dismissedSuggestions = state.dismissedSuggestions && typeof state.dismissedSuggestions === "object" ? state.dismissedSuggestions : {};
  }
  function saveState() {
    writeJSON(STORE_KEY, state);
  }
  function allFlows() {
    var installed = (PACK.marketplace || []).filter(function (flow) {
      return state.installed.indexOf(flow.id) !== -1;
    }).map(function (flow) {
      var copy = clone(flow);
      copy.marketplaceInstalled = true;
      return copy;
    });
    var base = (PACK.flows || []).map(clone).concat(installed, (state.customFlows || []).map(clone));
    var byId = {};
    base.forEach(function (flow) {
      if (!flow || !flow.id) return;
      byId[flow.id] = Object.assign({}, byId[flow.id] || {}, flow);
    });
    return Object.keys(byId).map(function (id) { return byId[id]; });
  }
  function getFlow(id) {
    var list = allFlows();
    return list.find(function (flow) { return flow.id === id; }) || list.find(function (flow) { return flow.id === DEFAULT_FLOW; }) || list[0] || PACK.flows[0];
  }
  function flowSequence(flow) {
    return []
      .concat((flow.pages || []).map(function (id) { return { type: "page", id: id }; }))
      .concat((flow.widgets || []).map(function (id) { return { type: "widget", id: id }; }))
      .concat((flow.panels || []).map(function (id) { return { type: "panel", id: id }; }))
      .concat((flow.actions || []).map(function (id) { return { type: "action", id: id }; }))
      .concat((flow.integrations || []).map(function (id) { return { type: "integration", id: id }; }));
  }
  function labelFor(type, id) {
    var source = FEATURE_OPTIONS[type + "s"] || FEATURE_OPTIONS[type] || [];
    var item = source.find(function (entry) { return entry[0] === id; });
    if (item) return { label: item[1], icon: item[2] };
    return { label: String(id || "").replace(/[-.]/g, " "), icon: type === "action" ? "zap" : "circle" };
  }
  function isAppVisible() {
    var body = document.body;
    if (!body) return false;
    if (body.classList.contains("auth-mode") || body.classList.contains("profile-mode") || body.classList.contains("password-mode")) return false;
    return true;
  }
  function ensureRoot() {
    if (ui.root && ui.root.isConnected) return ui.root;
    var root = document.createElement("div");
    root.id = "ethone-flow-root";
    root.innerHTML =
      '<section class="ef-bar" aria-label="ETHONE Flow">' +
        '<button class="ef-current" type="button" data-flow-open-switcher></button>' +
        '<div class="ef-actions">' +
          '<button class="ef-btn" type="button" data-flow-open-switcher title="Changer de Flow" aria-label="Changer de Flow">' + icon("shuffle") + '<span class="ef-label">Changer</span></button>' +
          '<button class="ef-btn" type="button" data-flow-open-builder title="Créer un Flow" aria-label="Créer un Flow">' + icon("plus") + '</button>' +
          '<button class="ef-btn" type="button" data-flow-edit title="Modifier le Flow" aria-label="Modifier le Flow">' + icon("sliders-horizontal") + '</button>' +
          '<button class="ef-btn" type="button" data-flow-duplicate title="Dupliquer le Flow" aria-label="Dupliquer le Flow">' + icon("copy") + '</button>' +
          '<button class="ef-btn ef-brain-os-btn" type="button" data-flow-open-brain-os title="Brain OS Command Center" aria-label="Brain OS Command Center">' + icon("brain-circuit") + '</button>' +
          '<button class="ef-btn" type="button" data-flow-open-market title="Flow Marketplace" aria-label="Flow Marketplace">' + icon("store") + '</button>' +
          '<button class="ef-btn" type="button" data-flow-favorite title="Favori" aria-label="Favori">' + icon("star") + '</button>' +
        '</div>' +
      '</section>' +
      '<section class="ef-suggestion" role="status" aria-live="polite"></section>' +
      '<div class="ef-transition" aria-hidden="true"></div>';
    document.body.appendChild(root);
    ui.root = root;
    ui.suggestion = root.querySelector(".ef-suggestion");
    ui.transition = root.querySelector(".ef-transition");
    bindRoot(root);
    updateRoot();
    return root;
  }
  function updateRoot() {
    if (!ui.root || !ui.root.isConnected) return;
    if (!isAppVisible()) {
      ui.root.style.display = "none";
      return;
    }
    ui.root.style.display = "";
    var flow = getFlow(state.activeId);
    applyVars(flow);
    var current = ui.root.querySelector(".ef-current");
    if (current) {
      current.innerHTML =
        '<span class="ef-icon">' + icon(flow.icon || "sparkles") + '</span>' +
        '<span><strong>' + esc(flow.name || "ETHONE Flow") + '</strong><span>' + esc(flow.description || "Contexte intelligent actif") + '</span></span>';
    }
    var fav = ui.root.querySelector("[data-flow-favorite]");
    if (fav) fav.classList.toggle("is-active", state.favorites.indexOf(flow.id) !== -1);
    renderIcons(ui.root);
  }
  function bindRoot(root) {
    root.addEventListener("click", function (event) {
      var target = event.target;
      if (target.closest("[data-flow-open-switcher]")) { openSwitcher(); return; }
      if (target.closest("[data-flow-open-builder]")) { openBuilder(null); return; }
      if (target.closest("[data-flow-open-brain-os]")) {
        if (window.ETHONEBrainOSV5 && typeof window.ETHONEBrainOSV5.open === "function") {
          window.ETHONEBrainOSV5.open();
        } else {
          runAction("brainos.command.open", { source: "flow-bar" });
        }
        return;
      }
      if (target.closest("[data-flow-open-market]")) { openMarketplace(); return; }
      if (target.closest("[data-flow-edit]")) { openBuilder(getFlow(state.activeId)); return; }
      if (target.closest("[data-flow-duplicate]")) { duplicateCurrent(); return; }
      if (target.closest("[data-flow-favorite]")) { toggleFavorite(state.activeId); return; }
      var apply = target.closest("[data-flow-apply]");
      if (apply) { applyFlow(apply.dataset.flowApply); return; }
      var edit = target.closest("[data-flow-builder-edit]");
      if (edit) { openBuilder(getFlow(edit.dataset.flowBuilderEdit)); return; }
      var install = target.closest("[data-flow-install]");
      if (install) { installMarketplace(install.dataset.flowInstall); return; }
      var close = target.closest("[data-flow-close]");
      if (close) { closeOverlays(); return; }
      var suggestApply = target.closest("[data-flow-suggest-apply]");
      if (suggestApply) { applyFlow(suggestApply.dataset.flowSuggestApply); hideSuggestion(); return; }
      if (target.closest("[data-flow-suggest-dismiss]")) { dismissSuggestion(); return; }
      var chip = target.closest("[data-flow-chip]");
      if (chip) { toggleDraftItem(chip.dataset.flowType, chip.dataset.flowChip); return; }
      var remove = target.closest("[data-flow-remove-item]");
      if (remove) { removeDraftItem(Number(remove.dataset.flowRemoveItem || -1)); return; }
      if (target.closest("[data-flow-save-builder]")) { saveBuilder(); return; }
      if (target.closest("[data-flow-delete-builder]")) { deleteBuilderFlow(); return; }
    });
    root.addEventListener("dragstart", function (event) {
      var item = event.target.closest("[data-flow-sequence-index]");
      if (!item) return;
      dragIndex = Number(item.dataset.flowSequenceIndex);
      event.dataTransfer.effectAllowed = "move";
    });
    root.addEventListener("dragover", function (event) {
      if (event.target.closest("[data-flow-sequence-index]")) event.preventDefault();
    });
    root.addEventListener("drop", function (event) {
      var item = event.target.closest("[data-flow-sequence-index]");
      if (!item || dragIndex < 0) return;
      event.preventDefault();
      reorderDraft(dragIndex, Number(item.dataset.flowSequenceIndex));
      dragIndex = -1;
    });
  }
  function ensureOverlay(name, title, subtitle, bodyHTML, iconName) {
    closeOverlays(name);
    var overlay = document.createElement("section");
    overlay.className = "ef-overlay open";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML =
      '<div class="ef-modal">' +
        '<header class="ef-head">' +
          '<div class="ef-title"><span class="ef-icon">' + icon(iconName || "sparkles") + '</span><span><strong>' + esc(title) + '</strong><span>' + esc(subtitle || "") + '</span></span></div>' +
          '<button class="ef-btn" type="button" data-flow-close aria-label="Fermer">' + icon("x") + '</button>' +
        '</header>' +
        '<div class="ef-body">' + bodyHTML + '</div>' +
      '</div>';
    ensureRoot().appendChild(overlay);
    ui[name] = overlay;
    renderIcons(overlay);
    var focus = overlay.querySelector("input, button, textarea, select");
    if (focus) setTimeout(function () { try { focus.focus({ preventScroll: true }); } catch (e) {} }, 20);
    return overlay;
  }
  function closeOverlays(except) {
    ["switcher", "builder", "marketplace"].forEach(function (key) {
      if (key === except) return;
      if (ui[key] && ui[key].isConnected) ui[key].remove();
      ui[key] = null;
    });
  }
  function flowCard(flow, extra) {
    var sequence = flowSequence(flow);
    return '<article class="ef-card" tabindex="0" style="--flow-accent:' + esc(flow.color || "#8b5cf6") + ';--flow-accent-rgb:' + esc(normalizeRgb(flow.color)) + '">' +
      '<div class="ef-card-top"><span class="ef-icon">' + icon(flow.icon || "sparkles") + '</span><span class="ef-tag">' + esc(flow.category || flow.author || "Flow") + '</span></div>' +
      '<div><h3>' + esc(flow.name) + '</h3><p>' + esc(flow.description || "Contexte ETHONE intelligent.") + '</p></div>' +
      '<div class="ef-chip-row">' + sequence.slice(0, 5).map(function (item) {
        var meta = labelFor(item.type, item.id);
        return '<span class="ef-chip">' + icon(meta.icon) + esc(meta.label) + '</span>';
      }).join("") + (sequence.length > 5 ? '<span class="ef-tag">+' + (sequence.length - 5) + '</span>' : "") + '</div>' +
      '<div class="ef-card-foot">' + (extra || '<button class="ef-btn primary" type="button" data-flow-apply="' + esc(flow.id) + '">' + icon("play") + '<span>Activer</span></button><button class="ef-btn" type="button" data-flow-builder-edit="' + esc(flow.id) + '">' + icon("sliders-horizontal") + '</button>') + '</div>' +
    '</article>';
  }
  function openSwitcher() {
    var flows = allFlows();
    var recent = state.recent.map(getFlow).filter(Boolean);
    var favorite = state.favorites.map(getFlow).filter(Boolean);
    var html =
      (favorite.length ? '<div class="ef-panel"><h3>Favoris</h3><div class="ef-grid">' + favorite.map(flowCard).join("") + '</div></div><br>' : "") +
      (recent.length ? '<div class="ef-panel"><h3>Récents</h3><div class="ef-grid">' + recent.map(flowCard).join("") + '</div></div><br>' : "") +
      '<div class="ef-panel"><h3>Tous les Flows</h3><div class="ef-grid">' + flows.map(flowCard).join("") + '</div></div>';
    ensureOverlay("switcher", "ETHONE Flow", "Change instantanément ton environnement de travail.", html, "shuffle");
  }
  function openMarketplace() {
    var items = PACK.marketplace || [];
    var html = '<div class="ef-grid">' + items.map(function (flow) {
      var installed = state.installed.indexOf(flow.id) !== -1;
      var extra = installed ?
        '<button class="ef-btn primary" type="button" data-flow-apply="' + esc(flow.id) + '">' + icon("play") + '<span>Activer</span></button><span class="ef-tag">Installé</span>' :
        '<button class="ef-btn primary" type="button" data-flow-install="' + esc(flow.id) + '">' + icon("download") + '<span>Installer</span></button>';
      return flowCard(flow, extra);
    }).join("") + '</div>';
    ensureOverlay("marketplace", "Flow Marketplace", "Installe des contextes prêts à l’emploi.", html || '<div class="ef-panel">Aucun Flow disponible.</div>', "store");
  }
  function draftFromFlow(flow) {
    flow = flow ? clone(flow) : {};
    return {
      id: flow.id || "",
      originalId: flow.id || "",
      name: flow.name || "New Flow",
      icon: flow.icon || "sparkles",
      color: flow.color || "#8b5cf6",
      theme: flow.theme || "",
      wallpaper: flow.wallpaper || "",
      description: flow.description || "",
      pages: mergeUnique(flow.pages || ["dashboard"]),
      widgets: mergeUnique(flow.widgets || ["hero", "brain", "today", "quickActions"]),
      panels: mergeUnique(flow.panels || ["ai"]),
      actions: mergeUnique(flow.actions || []),
      integrations: mergeUnique(flow.integrations || []),
      shortcuts: mergeUnique(flow.shortcuts || ["Ctrl+K"])
    };
  }
  function openBuilder(flow) {
    builderDraft = draftFromFlow(flow);
    renderBuilder();
  }
  function renderBuilder() {
    if (!builderDraft) builderDraft = draftFromFlow(null);
    var chips = ["pages", "widgets", "panels", "actions", "integrations"].map(function (type) {
      return '<div class="ef-panel"><h3>' + esc(type.charAt(0).toUpperCase() + type.slice(1)) + '</h3><div class="ef-chip-row">' +
        (FEATURE_OPTIONS[type] || []).map(function (item) {
          var active = (builderDraft[type] || []).indexOf(item[0]) !== -1;
          return '<button class="ef-chip' + (active ? " active" : "") + '" type="button" data-flow-type="' + esc(type) + '" data-flow-chip="' + esc(item[0]) + '">' + icon(item[2]) + esc(item[1]) + '</button>';
        }).join("") + '</div></div>';
    }).join("");
    var sequence = flowSequence(builderDraft);
    var sequenceHTML = sequence.length ? sequence.map(function (item, index) {
      var meta = labelFor(item.type, item.id);
      return '<div class="ef-sequence-item" draggable="true" data-flow-sequence-index="' + index + '">' +
        icon(meta.icon) + '<span><strong>' + esc(meta.label) + '</strong><small>' + esc(item.type) + '</small></span>' +
        '<button class="ef-btn" type="button" data-flow-remove-item="' + index + '" aria-label="Retirer">' + icon("x") + '</button>' +
      '</div>';
    }).join("") : '<div class="ef-tag">Ajoute des pages, widgets ou panneaux pour construire ton Flow.</div>';
    var html =
      '<div class="ef-form">' +
        '<section class="ef-panel">' +
          '<div class="ef-field"><label for="ef-name">Nom</label><input id="ef-name" value="' + esc(builderDraft.name) + '" placeholder="Development Flow"></div>' +
          '<div class="ef-form-row">' +
            '<div class="ef-field" style="flex:1"><label for="ef-icon">Icône Lucide</label><input id="ef-icon" value="' + esc(builderDraft.icon) + '" placeholder="sparkles"></div>' +
            '<div class="ef-field" style="width:128px"><label for="ef-color">Couleur</label><input id="ef-color" type="color" value="' + esc(builderDraft.color || "#8b5cf6") + '"></div>' +
          '</div>' +
          '<div class="ef-field"><label for="ef-description">Description</label><textarea id="ef-description" placeholder="Ce Flow prépare mon environnement...">' + esc(builderDraft.description) + '</textarea></div>' +
          '<div class="ef-panel"><h3>Séquence</h3><div class="ef-sequence">' + sequenceHTML + '</div></div>' +
          '<div class="ef-builder-actions"><button class="ef-btn primary" type="button" data-flow-save-builder>' + icon("save") + '<span>Enregistrer</span></button>' +
          (builderDraft.originalId && isCustom(builderDraft.originalId) ? '<button class="ef-btn ef-danger" type="button" data-flow-delete-builder>' + icon("trash-2") + '<span>Supprimer</span></button>' : "") +
          '<button class="ef-btn" type="button" data-flow-close>' + icon("x") + '<span>Fermer</span></button></div>' +
        '</section>' +
        '<section style="display:grid;gap:14px">' + chips + '</section>' +
      '</div>';
    var visualFields =
      '<div class="ef-form-row">' +
        '<div class="ef-field" style="flex:1"><label for="ef-theme">Theme</label><input id="ef-theme" value="' + esc(builderDraft.theme || "") + '" placeholder="development, gaming, morning..."></div>' +
        '<div class="ef-field" style="flex:1"><label for="ef-wallpaper">Wallpaper CSS</label><input id="ef-wallpaper" value="' + esc(builderDraft.wallpaper || "") + '" placeholder="radial-gradient(...), #09090b"></div>' +
      '</div>';
    html = html.replace('<div class="ef-field"><label for="ef-description">', visualFields + '<div class="ef-field"><label for="ef-description">');
    ensureOverlay("builder", builderDraft.originalId ? "Modifier le Flow" : "Flow Builder", "Crée un environnement de travail sans coder.", html, builderDraft.icon || "sparkles");
  }
  function syncDraftFields() {
    if (!builderDraft || !ui.builder) return;
    var name = ui.builder.querySelector("#ef-name");
    var flowIcon = ui.builder.querySelector("#ef-icon");
    var color = ui.builder.querySelector("#ef-color");
    var theme = ui.builder.querySelector("#ef-theme");
    var wallpaper = ui.builder.querySelector("#ef-wallpaper");
    var desc = ui.builder.querySelector("#ef-description");
    builderDraft.name = name ? name.value.trim() || "Untitled Flow" : builderDraft.name;
    builderDraft.icon = flowIcon ? flowIcon.value.trim() || "sparkles" : builderDraft.icon;
    builderDraft.color = color ? color.value || "#8b5cf6" : builderDraft.color;
    builderDraft.theme = theme ? theme.value.trim() : builderDraft.theme;
    builderDraft.wallpaper = wallpaper ? wallpaper.value.trim() : builderDraft.wallpaper;
    builderDraft.description = desc ? desc.value.trim() : builderDraft.description;
  }
  function toggleDraftItem(type, id) {
    syncDraftFields();
    if (!builderDraft[type]) builderDraft[type] = [];
    var list = builderDraft[type];
    var index = list.indexOf(id);
    if (index === -1) list.push(id);
    else list.splice(index, 1);
    if (type === "widgets") {
      if (builderDraft.widgets.indexOf("hero") === -1) builderDraft.widgets.unshift("hero");
      if (builderDraft.widgets.indexOf("brain") === -1) builderDraft.widgets.splice(1, 0, "brain");
      if (builderDraft.widgets.indexOf("quickActions") === -1) builderDraft.widgets.push("quickActions");
    }
    renderBuilder();
  }
  function removeDraftItem(index) {
    syncDraftFields();
    var sequence = flowSequence(builderDraft);
    var item = sequence[index];
    if (!item) return;
    var key = item.type + "s";
    var list = builderDraft[key] || [];
    var at = list.indexOf(item.id);
    if (at !== -1) list.splice(at, 1);
    renderBuilder();
  }
  function reorderDraft(from, to) {
    syncDraftFields();
    if (from === to || from < 0 || to < 0) return;
    var sequence = flowSequence(builderDraft);
    var moved = sequence.splice(from, 1)[0];
    sequence.splice(to, 0, moved);
    ["pages", "widgets", "panels", "actions", "integrations"].forEach(function (key) { builderDraft[key] = []; });
    sequence.forEach(function (item) {
      var key = item.type + "s";
      if (builderDraft[key]) builderDraft[key].push(item.id);
    });
    renderBuilder();
  }
  function isCustom(id) {
    return state.customFlows.some(function (flow) { return flow.id === id; });
  }
  function slug(value) {
    return String(value || "flow").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "flow";
  }
  function saveBuilder() {
    syncDraftFields();
    var id = builderDraft.originalId && isCustom(builderDraft.originalId) ? builderDraft.originalId : "custom-" + slug(builderDraft.name) + "-" + Date.now().toString(36);
    var flow = Object.assign({}, builderDraft, { id: id, category: "custom", startPage: "dashboard" });
    delete flow.originalId;
    var idx = state.customFlows.findIndex(function (item) { return item.id === id; });
    if (idx === -1) state.customFlows.push(flow);
    else state.customFlows[idx] = flow;
    state.activeId = id;
    saveState();
    closeOverlays();
    applyFlow(id, { silent: true });
    notify("Flow enregistré et activé.", "success");
  }
  function deleteBuilderFlow() {
    if (!builderDraft || !isCustom(builderDraft.originalId)) return;
    state.customFlows = state.customFlows.filter(function (flow) { return flow.id !== builderDraft.originalId; });
    if (state.activeId === builderDraft.originalId) state.activeId = DEFAULT_FLOW;
    saveState();
    closeOverlays();
    applyFlow(state.activeId, { silent: true });
    notify("Flow supprimé.", "info");
  }
  function duplicateCurrent() {
    var flow = clone(getFlow(state.activeId));
    if (!flow) return;
    flow.id = "";
    flow.name = (flow.name || "Flow") + " Copy";
    openBuilder(flow);
  }
  function toggleFavorite(id) {
    var index = state.favorites.indexOf(id);
    if (index === -1) state.favorites.unshift(id);
    else state.favorites.splice(index, 1);
    state.favorites = state.favorites.slice(0, 8);
    saveState();
    updateRoot();
  }
  function installMarketplace(id) {
    if (state.installed.indexOf(id) === -1) state.installed.push(id);
    saveState();
    notify("Flow installé.", "success");
    openMarketplace();
  }
  function makeWidgetInstance(type, index) {
    var stable = { hero: "command", brain: "brain", today: "today", quickActions: "quickActions" };
    var id = stable[type] || ("flow-" + type + "-" + index);
    return {
      instanceId: id,
      type: type,
      size: clone(WIDGET_SIZES[type] || { col: 2, row: 1 }),
      locked: false,
      config: {}
    };
  }
  function prefsForFlow(flow) {
    var widgets = mergeUnique(["hero", "brain"].concat(flow.widgets || [], ["quickActions"]));
    return {
      version: 2,
      instances: widgets.map(makeWidgetInstance),
      hidden: [],
      favorites: widgets.slice(0, 6)
    };
  }
  function applyDashboardLayout(flow) {
    var prefs = prefsForFlow(flow);
    var id = "flow-" + flow.id;
    var name = flow.name || "ETHONE Flow";
    var lib = readJSON(LAYOUTS_KEY, null);
    if (!lib || lib.version !== 1 || !Array.isArray(lib.layouts)) lib = { version: 1, activeId: id, layouts: [] };
    var existing = lib.layouts.find(function (layout) { return layout.id === id; });
    if (existing) {
      existing.name = name;
      existing.prefs = prefs;
    } else {
      lib.layouts.push({ id: id, name: name, prefs: prefs });
    }
    lib.activeId = id;
    writeJSON(LAYOUTS_KEY, lib);
    writeJSON(ACTIVE_LAYOUT_KEY, prefs);
    try {
      var svc = window.ETHONEWorkspaces || (window.Ethone && window.Ethone.get && window.Ethone.get("workspaces"));
      var ws = svc && svc.active && svc.active();
      if (svc && svc.update && ws) svc.update(ws.id, { layoutId: id });
    } catch (e) {}
    try {
      if (typeof window.ethoneDashboardV4Render === "function") setTimeout(window.ethoneDashboardV4Render, 60);
    } catch (e2) {}
  }
  function applyVars(flow) {
    if (!flow) return;
    var color = flow.color || "#8b5cf6";
    var rgb = normalizeRgb(color);
    document.documentElement.style.setProperty("--flow-accent", color);
    document.documentElement.style.setProperty("--flow-accent-rgb", rgb);
    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--accent-rgb", rgb);
    if (flow.wallpaper) document.documentElement.style.setProperty("--flow-wallpaper", flow.wallpaper);
    document.documentElement.setAttribute("data-ethone-flow-theme", flow.theme || flow.id || "");
    document.body.classList.add("ethone-flow-active");
    document.body.dataset.ethoneFlow = flow.id || "";
  }
  function pauseSmartLayouts() {
    try {
      var current = readJSON(SMART_KEY, null);
      if (!state.previousSmartLayouts && current) state.previousSmartLayouts = current;
      document.body.classList.add("ethone-flow-controls-layout");
      document.body.dataset.ethoneLayoutOwner = "flow";
    } catch (e) {}
  }
  function showTransition(flow) {
    ensureRoot();
    if (!ui.transition) return;
    ui.transition.innerHTML = '<div class="ef-transition-card"><span class="ef-icon">' + icon(flow.icon || "sparkles") + '</span><strong>' + esc(flow.name || "ETHONE Flow") + '</strong><span>Transformation de l’environnement...</span></div>';
    ui.transition.classList.remove("open");
    void ui.transition.offsetWidth;
    ui.transition.classList.add("open");
    renderIcons(ui.transition);
    setTimeout(function () { if (ui.transition) ui.transition.classList.remove("open"); }, 560);
  }
  function openPrimaryPanel(flow) {
    var panel = (flow.panels || []).find(function (id) { return PANEL_ALLOWED[id]; });
    if (!panel) return;
    try {
      if (window.ETHONESidePanels && typeof window.ETHONESidePanels.open === "function") {
        window.ETHONESidePanels.open(panel, { toast: false });
      }
    } catch (e) {}
  }
  function openStartPage(flow) {
    var page = flow.startPage || "dashboard";
    var id = page + ".open";
    if (!runAction(id, { source: "flow", flow: flow.id })) {
      try {
        if (typeof window.switchPage === "function") window.switchPage(page, null);
      } catch (e) {}
    }
  }
  function applyFlow(id, options) {
    var flow = getFlow(id);
    if (!flow) return false;
    pauseSmartLayouts();
    state.activeId = flow.id;
    state.recent = [flow.id].concat(state.recent.filter(function (x) { return x !== flow.id; })).slice(0, 8);
    state.history.unshift({ id: flow.id, at: Date.now() });
    state.history = state.history.slice(0, 40);
    saveState();
    applyVars(flow);
    showTransition(flow);
    applyDashboardLayout(flow);
    openStartPage(flow);
    setTimeout(function () { openPrimaryPanel(flow); }, 170);
    updateRoot();
    try { window.dispatchEvent(new CustomEvent("ethone:flow-change", { detail: { flow: clone(flow) } })); } catch (e) {}
    if (!options || !options.silent) notify(flow.name + " activé.", "success");
    return true;
  }
  function suggestionKey(flowId) {
    return flowId + ":" + new Date().toISOString().slice(0, 10);
  }
  function suggestFlow(flowId, reason) {
    var flow = getFlow(flowId);
    if (!flow || flow.id === state.activeId || !isAppVisible()) return;
    var key = suggestionKey(flow.id);
    if (state.dismissedSuggestions[key]) return;
    ensureRoot();
    ui.suggestion.innerHTML =
      '<div class="ef-suggestion-row"><div class="ef-title"><span class="ef-icon">' + icon(flow.icon || "sparkles") + '</span><span><strong>Passer à ' + esc(flow.name) + ' ?</strong><span>' + esc(reason || flow.description || "") + '</span></span></div><button class="ef-btn" type="button" data-flow-suggest-dismiss>' + icon("x") + '</button></div>' +
      '<p>ETHONE peut réorganiser les widgets, ouvrir le bon panneau et préparer les raccourcis utiles.</p>' +
      '<div class="ef-suggestion-row"><button class="ef-btn primary" type="button" data-flow-suggest-apply="' + esc(flow.id) + '">' + icon("play") + '<span>Activer</span></button><button class="ef-btn" type="button" data-flow-suggest-dismiss><span>Plus tard</span></button></div>';
    ui.suggestion.dataset.suggestionFlow = flow.id;
    ui.suggestion.classList.add("open");
    renderIcons(ui.suggestion);
  }
  function hideSuggestion() {
    if (ui.suggestion) ui.suggestion.classList.remove("open");
  }
  function dismissSuggestion() {
    if (ui.suggestion && ui.suggestion.dataset.suggestionFlow) {
      state.dismissedSuggestions[suggestionKey(ui.suggestion.dataset.suggestionFlow)] = Date.now();
      saveState();
    }
    hideSuggestion();
  }
  function pageReadyHandler(event) {
    var page = event && event.detail && (event.detail.page || event.detail.id) || document.body.dataset.page || "";
    if (PAGE_TO_FLOW[page]) {
      suggestFlow(PAGE_TO_FLOW[page], "Ce contexte correspond à la page ouverte.");
    }
    updateRoot();
  }
  function registerActions() {
    var A = actions();
    if (!A || !A.register) return;
    function safe(id, descriptor) {
      if (registeredActionIds[id]) return;
      A.register(id, descriptor);
      registeredActionIds[id] = true;
    }
    safe("flow.open", { label: "ETHONE Flow", handler: openSwitcher });
    safe("flow.builder.open", { label: "Flow Builder", handler: function () { openBuilder(null); } });
    safe("flow.marketplace.open", { label: "Flow Marketplace", handler: openMarketplace });
    safe("flow.apply", { label: "Apply Flow", handler: function (ctx) { return applyFlow(ctx && (ctx.flow || ctx.id) || DEFAULT_FLOW); } });
    allFlows().forEach(function (flow) {
      safe("flow." + flow.id, { label: flow.name || flow.id, handler: function () { return applyFlow(flow.id); } });
    });
  }
  function loadPack() {
    return fetch(DATA_URL, { cache: "no-store" })
      .then(function (res) { return res && res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && Array.isArray(data.flows)) PACK = data;
      })
      .catch(function () {})
      .then(function () {
        if (!getFlow(state.activeId)) state.activeId = PACK.defaultFlow || DEFAULT_FLOW;
        saveState();
        registerActions();
        updateRoot();
      });
  }
  function boot() {
    loadState();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        ensureRoot();
        updateRoot();
      }, { once: true });
    } else {
      ensureRoot();
      updateRoot();
    }
    loadPack();
    registerActions();
    setTimeout(registerActions, 500);
    window.addEventListener("ethone:page-ready", pageReadyHandler);
    window.addEventListener("ethone:dashboard-ready", updateRoot);
    document.addEventListener("keydown", function (event) {
      if (event.defaultPrevented) return;
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        openSwitcher();
      }
    });
  }
  window.ETHONEFlow = {
    apply: applyFlow,
    open: openSwitcher,
    openSwitcher: openSwitcher,
    openBuilder: function () { openBuilder(null); },
    openMarketplace: openMarketplace,
    suggest: suggestFlow,
    flows: function () { return clone(allFlows()); },
    state: function () { return clone(state); },
    refresh: updateRoot
  };
  boot();
})();
