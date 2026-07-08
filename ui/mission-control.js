/* ETHONE Mission Control
   Global OS overview for workspaces, widgets, windows, tasks, notes, calendar,
   Brain, integrations, notifications and stats. */
(function initEthoneMissionControl(global) {
  "use strict";

  if (global.ETHONEMissionControl) return;

  var root = null;
  var openState = false;
  var searchQuery = "";
  var selectedMode = "all";
  var renderTimer = null;

  var CORE_APPS = [
    ["dashboard", "Dashboard", "layout-dashboard", "Home OS"],
    ["ai", "ETHONE AI", "brain-circuit", "Brain"],
    ["notes", "Notes", "notebook-pen", "Knowledge"],
    ["todos", "Tasks", "check-circle-2", "Planning"],
    ["calendar", "Calendar", "calendar-days", "Schedule"],
    ["files", "Files", "folder-open", "Library"],
    ["connections", "Integrations", "plug", "Services"],
    ["marketplace", "Marketplace", "store", "Store"],
    ["activity", "Activity", "activity", "Insights"],
    ["settings", "Settings", "settings", "System"]
  ];
  var INTEGRATIONS = [
    ["discord", "Discord", "message-circle"],
    ["spotify", "Spotify", "music"],
    ["github", "GitHub", "git-branch"],
    ["steam", "Steam", "gamepad-2"],
    ["twitch", "Twitch", "radio"],
    ["valorant", "Valorant", "crosshair"],
    ["googleCalendar", "Google Calendar", "calendar-days"],
    ["googleDrive", "Google Drive", "folder-open"],
    ["obs", "OBS", "video"],
    ["youtube", "YouTube", "play"],
    ["battlenet", "Battle.net", "swords"]
  ];

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function cssEscape(value) {
    if (global.CSS && typeof global.CSS.escape === "function") return global.CSS.escape(String(value));
    return String(value || "").replace(/["\\#.;,[\]>+~*^$|=]/g, "\\$&");
  }

  function profile() {
    try { return typeof global.curP === "function" ? global.curP() : null; } catch (error) { return null; }
  }

  function icon(name) {
    return '<i data-lucide="' + esc(name || "circle") + '"></i>';
  }

  function renderIcons() {
    try { if (global.lucide && !global.__lucideFailed) global.lucide.createIcons(); } catch (error) {}
  }

  function isDashboardVisible() {
    var main = qs("#main-content");
    var auth = qs("#auth-screen");
    var profileScreen = qs("#profile-screen");
    var passwordScreen = qs("#password-screen");
    function hidden(el) {
      if (!el) return true;
      var style = getComputedStyle(el);
      return style.display === "none" || style.visibility === "hidden" || style.opacity === "0";
    }
    return !!main && !hidden(main) && hidden(auth) && hidden(profileScreen) && hidden(passwordScreen);
  }

  function currentPage() {
    var active = qs(".tab-content.active[id^='page-']");
    return active ? active.id.replace(/^page-/, "") : "dashboard";
  }

  function pageInfo(page) {
    var nav = [];
    try { if (typeof global.getDefaultNav === "function") nav = global.getDefaultNav() || []; } catch (error) {}
    var found = nav.find(function (item) { return item.id === page; });
    if (found) return { id: found.id, label: found.label || found.id, icon: found.icon || "app-window" };
    var pageEl = qs("#page-" + page);
    var title = pageEl && qs(".page-title,.section-title,h1,h2", pageEl);
    return { id: page, label: title ? title.textContent.trim() : String(page || "Page").replace(/-/g, " "), icon: "app-window" };
  }

  function runAction(id, context) {
    if (!id) return false;
    try {
      if (typeof global.runAction === "function") {
        global.runAction(id, context || { source: "mission-control" });
        return true;
      }
      if (global.ETHONEActions && typeof global.ETHONEActions.run === "function") {
        global.ETHONEActions.run(id, context || { source: "mission-control" });
        return true;
      }
      if (id.indexOf(".open") > -1 && typeof global.switchPage === "function") {
        global.switchPage(id.replace(".open", ""), null);
        return true;
      }
    } catch (error) {
      console.warn("[ETHONE Mission Control] action failed", id, error);
    }
    return false;
  }

  function openPage(page, inWindow) {
    close();
    if (inWindow && global.ETHONEDesktop && typeof global.ETHONEDesktop.open === "function") {
      if (typeof global.ETHONEDesktop.enable === "function" && !document.body.classList.contains("ethone-desktop-mode")) {
        try { global.ETHONEDesktop.enable(); } catch (error) {}
      }
      try { global.ETHONEDesktop.open(page); return; } catch (error) {}
    }
    if (!runAction(page + ".open", { page: page, source: "mission-control" }) && typeof global.switchPage === "function") {
      global.switchPage(page, null);
    }
  }

  function getWorkspaces() {
    try {
      if (global.ETHONEWorkspaces && typeof global.ETHONEWorkspaces.all === "function") {
        return global.ETHONEWorkspaces.all() || [];
      }
    } catch (error) {}
    var p = profile();
    return Array.isArray(p && p.workspaces) ? p.workspaces : [];
  }

  function activeWorkspace() {
    try {
      if (global.ETHONEWorkspaces && typeof global.ETHONEWorkspaces.active === "function") return global.ETHONEWorkspaces.active();
    } catch (error) {}
    var p = profile();
    var list = getWorkspaces();
    return list.find(function (w) { return p && w.id === p.activeWorkspaceId; }) || list[0] || null;
  }

  function getWindows() {
    try {
      if (global.ETHONEDesktop && typeof global.ETHONEDesktop.state === "function") {
        return (global.ETHONEDesktop.state().windows || []).filter(function (w) { return w && w.page; });
      }
    } catch (error) {}
    return [];
  }

  function getScreens() {
    try {
      if (global.ETHONEDesktop && typeof global.ETHONEDesktop.displays === "function") {
        var desktopState = global.ETHONEDesktop.state ? global.ETHONEDesktop.state() : {};
        var windows = getWindows();
        return global.ETHONEDesktop.displays().map(function (screen) {
          return {
            id: screen.id,
            label: screen.label,
            hint: screen.hint,
            active: screen.id === (desktopState.screen || "main"),
            windows: windows.filter(function (win) { return win.pinned || (win.screen || "main") === screen.id; }).length
          };
        });
      }
    } catch (error) {}
    return [];
  }

  function getWidgets() {
    var out = [];
    try {
      var registry = global.Ethone && global.Ethone.get && global.Ethone.get("widgets");
      if (registry && typeof registry.list === "function") {
        out = registry.list().map(function (item) {
          var def = item.definition || {};
          return { id: item.id, label: def.label || item.id, category: def.category || "Widget", icon: def.icon || "panel-top" };
        });
      }
    } catch (error) {}
    if (!out.length && Array.isArray(global.__ethoneWidgetCatalogTypes)) {
      out = global.__ethoneWidgetCatalogTypes.map(function (id) { return { id: id, label: id, category: "Widget", icon: "panel-top" }; });
    }
    var seen = Object.create(null);
    return out.filter(function (w) {
      if (!w || !w.id || seen[w.id]) return false;
      seen[w.id] = true;
      return true;
    }).slice(0, 18);
  }

  function state() {
    var p = profile() || { state: {} };
    p.state = p.state || {};
    return p.state;
  }

  function getTasks() {
    var todos = Array.isArray(state().todos) ? state().todos : [];
    return todos.filter(function (task) { return !(task.done || task.completed); }).slice(0, 8);
  }

  function getNotes() {
    var notes = Array.isArray(state().notes) ? state().notes : [];
    return notes.slice().sort(function (a, b) {
      return new Date(b.updated || b.updatedAt || b.created || b.createdAt || 0) - new Date(a.updated || a.updatedAt || a.created || a.createdAt || 0);
    }).slice(0, 8);
  }

  function getEvents() {
    var events = Array.isArray(state().events) ? state().events : [];
    var now = new Date();
    return events.slice().filter(function (event) {
      var d = new Date(event.date || event.start || event.startDate || event.when || 0);
      return !isNaN(d.getTime()) && d >= new Date(now.getTime() - 86400000);
    }).sort(function (a, b) {
      return new Date(a.date || a.start || a.startDate || a.when || 0) - new Date(b.date || b.start || b.startDate || b.when || 0);
    }).slice(0, 8);
  }

  function getNotifications() {
    try {
      if (global.ETHONENotifications && typeof global.ETHONENotifications.history === "function") {
        return global.ETHONENotifications.history().slice(0, 7);
      }
    } catch (error) {}
    return Array.isArray(state().notifications) ? state().notifications.slice(0, 7) : [];
  }

  function getIntegrations() {
    var connections = state().connections || {};
    return INTEGRATIONS.map(function (item) {
      var key = item[0];
      var data = connections[key] || connections[key.toLowerCase()] || null;
      var connected = !!(data && (data.connected || data.username || data.userId || data.token || data.accessToken || data.widgetUrl || data.enabled));
      return { id: key, label: item[1], icon: item[2], connected: connected, data: data };
    });
  }

  function statData() {
    var st = state();
    var tasks = Array.isArray(st.todos) ? st.todos : [];
    var notes = Array.isArray(st.notes) ? st.notes : [];
    var events = Array.isArray(st.events) ? st.events : [];
    var done = tasks.filter(function (task) { return task.done || task.completed; }).length;
    var integrations = getIntegrations().filter(function (i) { return i.connected; }).length;
    return [
      ["Tasks", done + " / " + tasks.length, "check-circle-2"],
      ["Notes", notes.length, "notebook-pen"],
      ["Events", events.length, "calendar-days"],
      ["Widgets", getWidgets().length, "panel-top"],
      ["Windows", getWindows().length, "app-window"],
      ["Integrations", integrations, "plug"]
    ];
  }

  function matches(text) {
    if (!searchQuery) return true;
    return String(text || "").toLowerCase().indexOf(searchQuery.toLowerCase()) > -1;
  }

  function isMode(mode) {
    return selectedMode === "all" || selectedMode === mode;
  }

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "ethone-mission-control";
    root.className = "ethone-mission-control";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = '<div class="emc-backdrop" data-emc-action="close"></div><section class="emc-shell" role="dialog" aria-modal="true" aria-labelledby="emc-title"></section>';
    document.body.appendChild(root);
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    return root;
  }

  function section(title, sub, content, extraClass) {
    return '<section class="emc-section ' + esc(extraClass || "") + '">' +
      '<div class="emc-section-head"><div><span>' + esc(sub || "") + '</span><h2>' + esc(title) + '</h2></div></div>' +
      content +
    '</section>';
  }

  function appCard(app) {
    return '<button type="button" class="emc-app-card" data-emc-page="' + esc(app[0]) + '">' +
      '<span>' + icon(app[2]) + '</span><strong>' + esc(app[1]) + '</strong><small>' + esc(app[3]) + '</small>' +
    '</button>';
  }

  function workspaceCard(workspace) {
    var active = activeWorkspace();
    var isActive = active && workspace.id === active.id;
    var accent = workspace.accent || "#8b5cf6";
    return '<button type="button" class="emc-workspace ' + (isActive ? "active" : "") + '" data-emc-workspace="' + esc(workspace.id) + '" style="--emc-accent:' + esc(accent) + '">' +
      '<span>' + esc(workspace.emoji || String(workspace.name || "S").slice(0, 2).toUpperCase()) + '</span>' +
      '<strong>' + esc(workspace.name || workspace.label || "Workspace") + '</strong>' +
      '<small>' + esc(workspace.description || (isActive ? "Workspace actif" : "ETHONE Space")) + '</small>' +
    '</button>';
  }

  function windowCard(win) {
    var info = pageInfo(win.page);
    return '<article class="emc-window-card ' + (win.minimized ? "minimized " : "") + (win.id && win.id === (global.ETHONEDesktop && global.ETHONEDesktop.state ? (global.ETHONEDesktop.state().activeWindow || "") : "") ? "active" : "") + '" data-window-id="' + esc(win.id) + '">' +
      '<div class="emc-window-preview"><span>' + icon(info.icon) + '</span><strong>' + esc(info.label) + '</strong></div>' +
      '<div class="emc-window-meta"><span>Workspace ' + esc((win.workspace || 0) + 1) + (win.minimized ? " - reduite" : "") + '</span><div>' +
        '<button type="button" data-emc-window-action="focus" data-window-id="' + esc(win.id) + '">Ouvrir</button>' +
        '<button type="button" data-emc-window-action="snap-left" data-window-id="' + esc(win.id) + '">Left</button>' +
        '<button type="button" data-emc-window-action="close" data-window-id="' + esc(win.id) + '">Fermer</button>' +
      '</div></div>' +
    '</article>';
  }

  function screenCard(screen) {
    return '<button type="button" class="emc-screen ' + (screen.active ? "active" : "") + '" data-emc-screen="' + esc(screen.id) + '">' +
      '<span>' + icon(screen.active ? "monitor-dot" : "monitor") + '</span>' +
      '<strong>' + esc(screen.label || screen.id) + '</strong>' +
      '<small>' + esc((screen.windows || 0) + " window" + (screen.windows === 1 ? "" : "s") + " / " + (screen.hint || "Virtual display")) + '</small>' +
    '</button>';
  }

  function widgetCard(widget) {
    return '<button type="button" class="emc-mini-card" data-emc-widget="' + esc(widget.id) + '">' +
      icon(widget.icon || "panel-top") + '<span><strong>' + esc(widget.label || widget.id) + '</strong><small>' + esc(widget.category || "Widget") + '</small></span>' +
    '</button>';
  }

  function taskRow(task) {
    return '<button type="button" class="emc-row" data-emc-page="todos">' + icon("circle") + '<span><strong>' + esc(task.text || task.title || "Task") + '</strong><small>' + esc(task.dueDate || task.date || "Aucune echeance") + '</small></span></button>';
  }

  function noteRow(note) {
    return '<button type="button" class="emc-row" data-emc-page="notes">' + icon("notebook-pen") + '<span><strong>' + esc(note.title || "Note") + '</strong><small>' + esc((note.body || note.content || note.text || "").slice(0, 90) || "Note ETHONE") + '</small></span></button>';
  }

  function eventRow(event) {
    var d = event.date || event.start || event.startDate || event.when || "";
    return '<button type="button" class="emc-row" data-emc-page="calendar">' + icon("calendar-days") + '<span><strong>' + esc(event.title || event.name || "Evenement") + '</strong><small>' + esc(d) + '</small></span></button>';
  }

  function integrationCard(item) {
    return '<button type="button" class="emc-integration ' + (item.connected ? "connected" : "") + '" data-emc-integration="' + esc(item.id) + '">' +
      icon(item.icon) + '<span><strong>' + esc(item.label) + '</strong><small>' + (item.connected ? "Connecte" : "A configurer") + '</small></span>' +
    '</button>';
  }

  function notificationRow(item) {
    return '<button type="button" class="emc-row" data-emc-action-id="notifications.open">' + icon(item.icon || "bell") + '<span><strong>' + esc(item.title || "Notification") + '</strong><small>' + esc(item.body || item.category || "ETHONE") + '</small></span></button>';
  }

  function statCard(stat) {
    return '<article class="emc-stat">' + icon(stat[2]) + '<span>' + esc(stat[0]) + '</span><strong>' + esc(stat[1]) + '</strong></article>';
  }

  function empty(label) {
    return '<div class="emc-empty">' + icon("sparkles") + '<strong>' + esc(label) + '</strong></div>';
  }

  function render() {
    var shell = qs(".emc-shell", ensureRoot());
    var workspaces = getWorkspaces().filter(function (w) { return matches((w.name || "") + " " + (w.description || "")); });
    var screens = getScreens().filter(function (screen) { return matches(screen.id + " " + screen.label + " " + screen.hint); });
    var windows = getWindows().filter(function (w) { var info = pageInfo(w.page); return matches(info.label + " " + w.page); });
    var widgets = getWidgets().filter(function (w) { return matches(w.id + " " + w.label + " " + w.category); });
    var tasks = getTasks().filter(function (task) { return matches((task.text || "") + " " + (task.title || "")); });
    var notes = getNotes().filter(function (note) { return matches((note.title || "") + " " + (note.body || note.content || "")); });
    var events = getEvents().filter(function (event) { return matches((event.title || "") + " " + (event.date || "")); });
    var integrations = getIntegrations().filter(function (item) { return matches(item.id + " " + item.label); });
    var notifications = getNotifications().filter(function (item) { return matches((item.title || "") + " " + (item.body || "")); });
    var apps = CORE_APPS.filter(function (app) { return matches(app.join(" ")); });
    var st = statData();

    shell.innerHTML =
      '<header class="emc-header">' +
        '<div><span class="emc-kicker">ETHONE Mission Control</span><h1 id="emc-title">Tout ETHONE, en une vue.</h1><p>Pilotez vos workspaces, fenetres, widgets, notes, taches, calendrier, Brain et integrations depuis un seul centre.</p></div>' +
        '<div class="emc-search"><i data-lucide="search"></i><input id="emc-search" type="search" autocomplete="off" placeholder="Filtrer Mission Control..." value="' + esc(searchQuery) + '"></div>' +
        '<button type="button" class="emc-close" data-emc-action="close" aria-label="Fermer">x</button>' +
      '</header>' +
      '<nav class="emc-modes" aria-label="Mission Control filters">' +
        ["all", "workspaces", "screens", "windows", "widgets", "tasks", "brain", "integrations"].map(function (mode) {
          return '<button type="button" class="' + (selectedMode === mode ? "active" : "") + '" data-emc-mode="' + mode + '">' + esc(mode === "all" ? "Tout" : mode) + '</button>';
        }).join("") +
      '</nav>' +
      '<div class="emc-grid">' +
        (isMode("workspaces") ? section("Workspaces", "Environnements", workspaces.length ? '<div class="emc-workspaces">' + workspaces.map(workspaceCard).join("") + '</div>' : empty("Aucun workspace"), "wide") : "") +
        (isMode("screens") ? section("Virtual Screens", "Multi-ecrans", screens.length ? '<div class="emc-screens">' + screens.map(screenCard).join("") + '</div>' : empty("Aucun ecran virtuel"), "") : "") +
        (isMode("windows") ? section("Fenetres", "Desktop OS", windows.length ? '<div class="emc-windows">' + windows.map(windowCard).join("") + '</div>' : '<div class="emc-window-empty"><strong>Aucune fenetre ouverte</strong><button type="button" data-emc-action="desktop">Activer Desktop Mode</button></div>', "wide") : "") +
        (isMode("all") ? section("Applications", "Lancer", apps.length ? '<div class="emc-apps">' + apps.map(appCard).join("") + '</div>' : empty("Aucune application"), "apps") : "") +
        (isMode("widgets") ? section("Widgets", "Bibliotheque", widgets.length ? '<div class="emc-mini-grid">' + widgets.map(widgetCard).join("") + '</div>' : empty("Aucun widget"), "") : "") +
        (isMode("tasks") ? section("Taches", "Priorites", tasks.length ? '<div class="emc-list">' + tasks.map(taskRow).join("") + '</div>' : empty("Aucune tache ouverte"), "") : "") +
        (isMode("tasks") ? section("Notes", "Recentes", notes.length ? '<div class="emc-list">' + notes.map(noteRow).join("") + '</div>' : empty("Aucune note recente"), "") : "") +
        (isMode("tasks") ? section("Calendrier", "Prochains evenements", events.length ? '<div class="emc-list">' + events.map(eventRow).join("") + '</div>' : empty("Aucun evenement"), "") : "") +
        (isMode("brain") ? section("ETHONE AI", "Brain OS", brainHTML(), "brain") : "") +
        (isMode("integrations") ? section("Integrations", "Services", integrations.length ? '<div class="emc-integrations">' + integrations.map(integrationCard).join("") + '</div>' : empty("Aucune integration"), "") : "") +
        (isMode("all") ? section("Notifications", "Centre", notifications.length ? '<div class="emc-list">' + notifications.map(notificationRow).join("") + '</div>' : empty("Tout est calme"), "") : "") +
        (isMode("all") ? section("Statistiques", "Etat global", '<div class="emc-stats">' + st.map(statCard).join("") + '</div>', "stats") : "") +
      '</div>';
    renderIcons();
    var input = qs("#emc-search", root);
    if (input && document.activeElement && document.activeElement.id === "emc-search") {
      try { input.focus({ preventScroll: true }); input.setSelectionRange(input.value.length, input.value.length); } catch (error) {}
    }
  }

  function brainHTML() {
    var p = profile();
    var tasks = getTasks().length;
    var notes = getNotes().length;
    var active = activeWorkspace();
    return '<div class="emc-brain-card">' +
      '<div class="emc-brain-orb">' + icon("brain-circuit") + '</div>' +
      '<div><strong>Brain observe votre contexte.</strong><p>' + esc((p && p.name ? p.name + ", " : "") + "workspace " + (active && active.name ? active.name : "ETHONE") + ": " + tasks + " taches ouvertes, " + notes + " notes recentes.") + '</p></div>' +
      '<div class="emc-brain-actions"><button type="button" data-emc-action-id="brain.open">Ouvrir Brain</button><button type="button" data-emc-action-id="command.open">Rechercher</button><button type="button" data-emc-page="activity">Voir Insights</button></div>' +
    '</div>';
  }

  function open() {
    if (!isDashboardVisible()) return false;
    ensureRoot();
    openState = true;
    render();
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("ethone-mission-control-open");
    setTimeout(function () {
      var input = qs("#emc-search", root);
      if (input) input.focus({ preventScroll: true });
    }, 60);
    return true;
  }

  function close() {
    if (!root) return;
    openState = false;
    root.classList.remove("open");
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ethone-mission-control-open");
  }

  function toggle() {
    return openState ? close() : open();
  }

  function focusWindow(id) {
    var el = qs('[data-de-window="' + cssEscape(id) + '"]');
    if (el) {
      el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      var title = qs("[data-de-drag-handle]", el);
      if (title) title.click();
    }
    var button = qs('[data-de-focus="' + cssEscape(id) + '"]');
    if (button) button.click();
  }

  function windowAction(id, action) {
    close();
    var el = qs('[data-de-window="' + cssEscape(id) + '"]');
    if (!el) return;
    focusWindow(id);
    if (action === "focus") return;
    if (action === "snap-left" && global.ETHONEDesktop && typeof global.ETHONEDesktop.snapActive === "function") return global.ETHONEDesktop.snapActive("left");
    var map = { close: "close-window", minimize: "minimize-window", maximize: "maximize-window" };
    var btn = qs('[data-de-action="' + map[action] + '"]', el);
    if (btn) btn.click();
  }

  function onClick(event) {
    var target = event.target;
    var closeBtn = target.closest("[data-emc-action='close']");
    if (closeBtn) { event.preventDefault(); close(); return; }
    var mode = target.closest("[data-emc-mode]");
    if (mode) { selectedMode = mode.dataset.emcMode || "all"; render(); return; }
    var desktop = target.closest("[data-emc-action='desktop']");
    if (desktop) { close(); if (global.ETHONEDesktop && typeof global.ETHONEDesktop.enable === "function") global.ETHONEDesktop.enable(); return; }
    var page = target.closest("[data-emc-page]");
    if (page) { openPage(page.dataset.emcPage, event.shiftKey || document.body.classList.contains("ethone-desktop-mode")); return; }
    var widget = target.closest("[data-emc-widget]");
    if (widget) { close(); runAction("widgets.open", { source: "mission-control", widgetType: widget.dataset.emcWidget }); return; }
    var integration = target.closest("[data-emc-integration]");
    if (integration) { close(); runAction("connections.open", { source: "mission-control", integration: integration.dataset.emcIntegration }); return; }
    var workspace = target.closest("[data-emc-workspace]");
    if (workspace) {
      if (global.ETHONEWorkspaces && typeof global.ETHONEWorkspaces.setActive === "function") global.ETHONEWorkspaces.setActive(workspace.dataset.emcWorkspace);
      render();
      return;
    }
    var screen = target.closest("[data-emc-screen]");
    if (screen) {
      if (global.ETHONEDesktop && typeof global.ETHONEDesktop.switchScreen === "function") global.ETHONEDesktop.switchScreen(screen.dataset.emcScreen);
      render();
      return;
    }
    var action = target.closest("[data-emc-action-id]");
    if (action) { close(); runAction(action.dataset.emcActionId, { source: "mission-control" }); return; }
    var windowBtn = target.closest("[data-emc-window-action]");
    if (windowBtn) { windowAction(windowBtn.dataset.windowId, windowBtn.dataset.emcWindowAction); }
  }

  function onInput(event) {
    if (!event.target || event.target.id !== "emc-search") return;
    searchQuery = event.target.value || "";
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 90);
  }

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = String(target.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
  }

  function onKeydown(event) {
    if (openState && event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    var commandCenterCombo = (event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === "Space" || event.key === " ");
    if (commandCenterCombo && !isTypingTarget(event.target) && global.ETHONEBrainOSV5 && typeof global.ETHONEBrainOSV5.open === "function") {
      event.preventDefault();
      global.ETHONEBrainOSV5.open();
      return;
    }
    var missionCombo = event.key === "F2";
    if (!missionCombo) return;
    if (event.key === "F2" && isTypingTarget(event.target)) return;
    event.preventDefault();
    toggle();
  }

  function registerAction() {
    var actions = global.ETHONEActions || global.ACTION_REGISTRY || (global.Ethone && global.Ethone.get && global.Ethone.get("actions"));
    if (!actions || typeof actions.register !== "function") return false;
    actions.register("missionControl.open", { label: "Mission Control", handler: open });
    actions.register("mission.open", { label: "Mission Control", handler: open });
    return true;
  }

  function scheduleRefresh() {
    if (!openState) return;
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 120);
  }

  var api = {
    open: open,
    close: close,
    toggle: toggle,
    refresh: scheduleRefresh,
    isOpen: function () { return openState; }
  };

  global.ETHONEMissionControl = api;
  global.openMissionControl = open;
  global.closeMissionControl = close;

  function boot() {
    ensureRoot();
    document.addEventListener("keydown", onKeydown, true);
    if (!registerAction()) setTimeout(registerAction, 250);
    ["ethone:workspace-change", "ethone:notification", "ethone:timeline", "ethone:page-ready", "ethone:profile-changed"].forEach(function (name) {
      global.addEventListener(name, scheduleRefresh);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(window);
