/* ETHONE OS Context Bridge.
   Lightweight, local-only shared context for Brain, AI, search and UI modules.
   It does not call providers, mount heavy pages or poll in the background. */
(function initEthoneOSContext(global) {
  "use strict";

  if (!global || global.__ethoneOSContextBridge) return;
  global.__ethoneOSContextBridge = true;

  var MODULE_ID = "os-context";
  var cached = null;
  var lastSignature = "";
  var scheduled = 0;
  var sequence = 0;
  var subscribers = [];

  function safe(label, fn, fallback) {
    try {
      return fn();
    } catch (error) {
      try {
        global.__ethoneOSContextErrors = (global.__ethoneOSContextErrors || []).slice(-20);
        global.__ethoneOSContextErrors.push({
          label: label,
          message: error && error.message ? error.message : String(error || ""),
          at: new Date().toISOString()
        });
      } catch (e) {}
      return fallback;
    }
  }

  function clone(value) {
    if (value == null) return value;
    return safe("clone", function () { return JSON.parse(JSON.stringify(value)); }, value);
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function text(value) {
    return String(value == null ? "" : value);
  }

  function compact(value, fallback) {
    var out = text(value).trim();
    return out || fallback || "";
  }

  function profile() {
    return safe("profile", function () {
      return typeof global.curP === "function" ? global.curP() : null;
    }, null);
  }

  function rawState() {
    var p = profile();
    return p && p.state ? p.state : {};
  }

  function appState() {
    return safe("appState", function () {
      var base = rawState();
      var api = global.ETHONEWorkspaces || (global.Ethone && global.Ethone.get && global.Ethone.get("workspaces"));
      return api && typeof api.scopedState === "function" ? api.scopedState(base) : base;
    }, {});
  }

  function activeWorkspace() {
    return safe("activeWorkspace", function () {
      var api = global.ETHONEWorkspaces || (global.Ethone && global.Ethone.get && global.Ethone.get("workspaces"));
      if (api && typeof api.active === "function") {
        var active = api.active();
        if (active) return active;
      }
      var p = profile();
      var id = p && (p.activeWorkspaceId || p.workspaceId);
      var listValue = p && Array.isArray(p.workspaces) ? p.workspaces : [];
      return listValue.find(function (item) { return item && item.id === id; }) || null;
    }, null);
  }

  function workspaceList() {
    return safe("workspaceList", function () {
      var api = global.ETHONEWorkspaces || (global.Ethone && global.Ethone.get && global.Ethone.get("workspaces"));
      if (api && typeof api.all === "function") return list(api.all());
      var p = profile();
      return list(p && p.workspaces);
    }, []);
  }

  function currentPage() {
    return safe("currentPage", function () {
      var nav = global.Ethone && global.Ethone.get && global.Ethone.get("navigation");
      if (nav && typeof nav.current === "function") return nav.current() || "dashboard";
      var active = document.querySelector(".tab-content.active[id^='page-']:not(.de-window-page)");
      if (active && active.id) return active.id.replace(/^page-/, "");
      var hash = text(global.location && global.location.hash).replace(/^#\/?/, "");
      return hash ? hash.split(/[/?]/)[0] || "dashboard" : "dashboard";
    }, "dashboard");
  }

  function pageLabel(page) {
    var map = {
      dashboard: "ETHONE Home",
      ai: "ETHONE Brain",
      notes: "Notes",
      todos: "Tasks",
      tasks: "Tasks",
      calendar: "Calendar",
      files: "Files",
      items: "Files",
      settings: "Settings",
      marketplace: "Marketplace",
      store: "Store",
      connections: "Connections",
      gaming: "Gaming",
      github: "GitHub",
      stats: "Statistics",
      activity: "Activity",
      timeline: "Activity",
      versions: "Version Center",
      databases: "Databases",
      habits: "Habits",
      goals: "Goals",
      journal: "Journal",
      workspaces: "Workspaces",
      "valorant-accounts": "Valorant Accounts"
    };
    return map[page] || text(page || "dashboard").replace(/[-_]+/g, " ").replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  function activeFlow() {
    return safe("activeFlow", function () {
      if (global.ETHONEFlow && typeof global.ETHONEFlow.state === "function") {
        var flowState = global.ETHONEFlow.state() || {};
        return flowState.activeId || flowState.active || "";
      }
      var stored = localStorage.getItem("ethone:active-flow") || "";
      return stored || "";
    }, "");
  }

  function flowCount() {
    return safe("flowCount", function () {
      if (global.ETHONEFlow && typeof global.ETHONEFlow.flows === "function") return list(global.ETHONEFlow.flows()).length;
      return 0;
    }, 0);
  }

  function connectedValue(value) {
    if (!value) return false;
    if (value === true) return true;
    if (typeof value !== "object") return false;
    return !!(value.connected || value.enabled || value.username || value.userId || value.token || value.accessToken || value.refreshToken || value.widgetUrl || value.data);
  }

  function integrationFacts(s) {
    var source = Object.assign({}, s.integrations || {}, s.connections || {});
    var ids = Object.keys(source).filter(function (key) { return connectedValue(source[key]); });
    var known = ["discord", "spotify", "github", "steam", "twitch", "valorant", "riot", "googlecalendar", "google-drive", "googledrive", "obs", "youtube", "battlenet", "lastfm"];
    known.forEach(function (id) {
      if (!source[id]) source[id] = {};
    });
    return {
      total: Object.keys(source).length,
      connected: ids.length,
      connectedIds: ids.slice(0, 24),
      map: ids.reduce(function (acc, id) { acc[id] = true; return acc; }, {})
    };
  }

  function dateKey(value) {
    if (!value) return "";
    return text(value).slice(0, 10);
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function todoText(todo) {
    return compact(todo && (todo.title || todo.text || todo.name), "Untitled task");
  }

  function noteTitle(note) {
    return compact(note && (note.title || note.name), "Untitled note");
  }

  function fileTitle(item) {
    return compact(item && (item.name || item.title || item.url), "Untitled file");
  }

  function eventTitle(event) {
    return compact(event && (event.title || event.name || event.text), "Event");
  }

  function facts(s) {
    var today = todayKey();
    var todos = list(s.todos);
    var notes = list(s.notes);
    var files = list(s.items || s.files);
    var events = list(s.events);
    var habits = list(s.habits);
    var goals = list(s.goals);
    var open = todos.filter(function (task) { return !(task.done || task.completed); });
    var done = todos.filter(function (task) { return !!(task.done || task.completed); });
    var overdue = open.filter(function (task) {
      var due = dateKey(task.due || task.date || task.deadline);
      return due && due < today;
    });
    var todayTasks = open.filter(function (task) {
      return dateKey(task.due || task.date || task.deadline) === today;
    });
    var todayEvents = events.filter(function (event) {
      return dateKey(event.date || event.start || event.startDate) === today;
    });
    var upcomingEvents = events.filter(function (event) {
      var key = dateKey(event.date || event.start || event.startDate);
      return key && key >= today;
    });
    var liveWidgets = s.liveWidgets || {};
    var widgetList = list(s.widgets || s.dashboardWidgets || liveWidgets.order || liveWidgets.enabled);
    var visibleWidgets = list(liveWidgets.enabled).length || widgetList.length || safe("visibleWidgets", function () {
      return document.querySelectorAll(".panel,.stat-card,.conn-card,.game-card,.ethone-os2-card,.v2-widget,.live-panel-widget").length;
    }, 0);
    var aiCore = safe("aiCore", function () { return global.ETHONEAICore && global.ETHONEAICore.config ? global.ETHONEAICore.config() : {}; }, {});
    var providerCount = Object.keys(aiCore.providers || {}).filter(function (id) {
      var provider = aiCore.providers[id] || {};
      return provider.enabled !== false && (provider.apiKey || /localhost|127\.0\.0\.1/.test(text(provider.endpoint || provider.baseUrl)));
    }).length;
    var integrations = integrationFacts(s);
    return {
      tasks: {
        total: todos.length,
        open: open.length,
        done: done.length,
        high: open.filter(function (task) { return text(task.priority).toLowerCase() === "high"; }).length,
        overdue: overdue.length,
        today: todayTasks.length
      },
      notes: { total: notes.length },
      files: { total: files.length },
      calendar: { total: events.length, today: todayEvents.length, upcoming: upcomingEvents.length },
      habits: { total: habits.length },
      goals: { total: goals.length, open: goals.filter(function (goal) { return !(goal.done || goal.completed); }).length },
      widgets: { total: widgetList.length || visibleWidgets, visible: visibleWidgets },
      flows: { active: activeFlow(), total: flowCount() },
      spaces: { active: activeWorkspace() && activeWorkspace().id || "", total: workspaceList().length },
      integrations: integrations,
      ai: {
        providers: providerCount,
        memory: list(aiCore.memory).length,
        coreReady: !!global.ETHONEAICore
      },
      recent: {
        tasks: open.slice(0, 5).map(function (item) { return { id: item.id || "", title: todoText(item), priority: item.priority || "", due: item.due || item.date || "" }; }),
        notes: notes.slice(-5).reverse().map(function (item) { return { id: item.id || "", title: noteTitle(item), updatedAt: item.updatedAt || item.ts || "" }; }),
        files: files.slice(-5).reverse().map(function (item) { return { id: item.id || "", title: fileTitle(item), type: item.type || "file" }; }),
        events: upcomingEvents.slice(0, 5).map(function (item) { return { id: item.id || "", title: eventTitle(item), date: item.date || item.start || "" }; })
      }
    };
  }

  function hourPart(hour) {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 23) return "evening";
    return "night";
  }

  function corpusForMode(s, page, ws) {
    return [
      page,
      ws && ws.name,
      activeFlow(),
      list(s.todos).slice(0, 12).map(todoText).join(" "),
      list(s.notes).slice(-8).map(noteTitle).join(" "),
      list(s.items || s.files).slice(-8).map(fileTitle).join(" ")
    ].join(" ").toLowerCase();
  }

  function detectMode(s, page, ws, factSet) {
    var hour = new Date().getHours();
    var part = hourPart(hour);
    var corpus = corpusForMode(s, page, ws);
    var integrations = factSet.integrations.map || {};
    var id = "personal";
    var label = "Personal OS";
    var tone = "Habits, notes, calendar and quiet planning are the default context.";

    if (page === "gaming" || integrations.steam || integrations.valorant || /valorant|steam|gaming|riot|discord|twitch/.test(corpus)) {
      id = "gaming";
      label = "Gaming Flow";
      tone = "Discord, Spotify, games, sessions and performance widgets should be close.";
    } else if (page === "github" || /github|repo|commit|pull request|branch|developer|code|bug/.test(corpus)) {
      id = "development";
      label = "Development Flow";
      tone = "GitHub, notes, tasks, AI and focus tools should be prioritized.";
    } else if (page === "notes" || page === "files" || /study|cours|course|pdf|revision|lesson|exam|flashcard/.test(corpus)) {
      id = "study";
      label = "Study Flow";
      tone = "Notes, files, calendar and focused summaries should be surfaced.";
    } else if (factSet.tasks.open || factSet.calendar.today) {
      id = part === "evening" || part === "night" ? "personal" : "work";
      label = id === "work" ? "Work Flow" : "Personal Flow";
      tone = id === "work" ? "Tasks, calendar, focus and Brain recommendations should lead." : "Reflection, habits and lighter follow-up should lead.";
    }

    return { id: id, label: label, part: part, tone: tone };
  }

  function attention(f) {
    var items = [];
    if (f.tasks.overdue) items.push({ type: "task", severity: "high", label: f.tasks.overdue + " overdue task" + (f.tasks.overdue > 1 ? "s" : "") });
    if (f.tasks.high) items.push({ type: "task", severity: "high", label: f.tasks.high + " high priority task" + (f.tasks.high > 1 ? "s" : "") });
    if (f.calendar.today) items.push({ type: "calendar", severity: "medium", label: f.calendar.today + " event" + (f.calendar.today > 1 ? "s" : "") + " today" });
    if (!f.ai.providers) items.push({ type: "ai", severity: "medium", label: "No AI provider configured" });
    if (!f.integrations.connected) items.push({ type: "integration", severity: "low", label: "No connected integrations" });
    return items.slice(0, 6);
  }

  function summaryFor(snapshot) {
    var f = snapshot.facts;
    var parts = [];
    if (f.tasks.open) parts.push(f.tasks.open + " open task" + (f.tasks.open > 1 ? "s" : ""));
    if (f.calendar.today) parts.push(f.calendar.today + " event" + (f.calendar.today > 1 ? "s" : "") + " today");
    if (f.notes.total) parts.push(f.notes.total + " note" + (f.notes.total > 1 ? "s" : ""));
    if (f.files.total) parts.push(f.files.total + " file" + (f.files.total > 1 ? "s" : ""));
    if (!parts.length) parts.push("a calm workspace");
    return "ETHONE sees " + parts.join(", ") + " in " + snapshot.mode.label + ". " + snapshot.mode.tone;
  }

  function buildSnapshot() {
    var p = profile();
    var s = appState();
    var page = currentPage();
    var ws = activeWorkspace();
    var f = facts(s);
    var mode = detectMode(s, page, ws, f);
    var snap = {
      schema: 1,
      sequence: ++sequence,
      ts: new Date().toISOString(),
      page: { id: page, label: pageLabel(page) },
      profile: {
        id: p && (p.id || p.uid || p.email) || "",
        name: p && (p.name || p.username || p.email) || "User",
        language: text(global._lang || localStorage.getItem("nexus_lang") || document.documentElement.lang || "fr").slice(0, 2)
      },
      workspace: ws ? {
        id: ws.id || "",
        name: ws.name || "Workspace",
        template: ws.template || "",
        accent: ws.accent || ws.color || "",
        icon: ws.icon || ""
      } : null,
      mode: mode,
      facts: f,
      attention: attention(f),
      modules: {
        brain: !!global.ETHONEBrain,
        aiCore: !!global.ETHONEAICore,
        brainOS: !!global.ETHONEBrainOSV5,
        commandPalette: typeof global.openCmdPalette === "function",
        sidePanels: !!global.ETHONESidePanels,
        flows: !!global.ETHONEFlow
      }
    };
    snap.summary = summaryFor(snap);
    return snap;
  }

  function signature(snapshot) {
    var f = snapshot.facts;
    return [
      snapshot.page.id,
      snapshot.workspace && snapshot.workspace.id,
      snapshot.mode.id,
      f.tasks.open,
      f.tasks.done,
      f.notes.total,
      f.files.total,
      f.calendar.today,
      f.integrations.connected,
      f.flows.active
    ].join("|");
  }

  function notify(snapshot, reason, force) {
    var sig = signature(snapshot);
    if (!force && sig === lastSignature) return snapshot;
    lastSignature = sig;
    var detail = { reason: reason || "refresh", snapshot: clone(snapshot) };
    subscribers.slice().forEach(function (fn) {
      safe("subscriber", function () { fn(detail.snapshot, detail.reason); }, null);
    });
    safe("event", function () {
      global.dispatchEvent(new CustomEvent("ethone:os-context-update", { detail: detail }));
    }, null);
    safe("ethone-event", function () {
      var events = global.Ethone && global.Ethone.get && global.Ethone.get("events");
      if (events && typeof events.emit === "function") events.emit("os-context:update", detail);
    }, null);
    return snapshot;
  }

  function refresh(reason, force) {
    cached = buildSnapshot();
    return notify(cached, reason, !!force);
  }

  function schedule(reason, delay) {
    clearTimeout(scheduled);
    scheduled = setTimeout(function () { refresh(reason || "scheduled", false); }, delay == null ? 90 : delay);
  }

  function snapshot(options) {
    if (!cached || options && options.fresh) return refresh(options && options.reason || "snapshot", !!(options && options.force));
    return clone(cached);
  }

  function aiContext() {
    var snap = snapshot();
    return {
      summary: snap.summary,
      counts: {
        pending: snap.facts.tasks.open,
        done: snap.facts.tasks.done,
        habits: snap.facts.habits.total,
        notes: snap.facts.notes.total,
        items: snap.facts.files.total,
        todayEvents: snap.facts.calendar.today,
        providers: snap.facts.ai.providers
      },
      profile: snap.profile.name,
      page: snap.page.id,
      workspace: snap.workspace && snap.workspace.name || "Workspace",
      mode: snap.mode,
      os: snap
    };
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return function () {};
    subscribers.push(fn);
    return function unsubscribe() {
      subscribers = subscribers.filter(function (item) { return item !== fn; });
    };
  }

  function installAIContextAdapter() {
    if (global.getAIContext && global.getAIContext.__osContextWrapped) return;
    if (typeof global.getAIContext !== "function") {
      global.getAIContext = aiContext;
      global.getAIContext.__osContextWrapped = true;
      return;
    }
    var legacy = global.getAIContext;
    global.getAIContext = function getAIContextWithOSBridge() {
      var os = aiContext();
      var oldValue = safe("legacyAIContext", function () { return legacy.apply(this, arguments); }, {});
      return Object.assign({}, oldValue || {}, os, {
        legacy: oldValue || {},
        summary: [os.summary, oldValue && oldValue.summary].filter(Boolean).join(" | ")
      });
    };
    global.getAIContext.__osContextWrapped = true;
  }

  function wrapSave() {
    if (typeof global.saveStateNow !== "function" || global.saveStateNow.__osContextWrapped) return;
    var original = global.saveStateNow;
    global.saveStateNow = function saveStateNowWithOSContext() {
      var result = original.apply(this, arguments);
      schedule("state-save", 120);
      return result;
    };
    global.saveStateNow.__osContextWrapped = true;
  }

  function bind() {
    [
      "ethone:page-ready",
      "ethone:dashboard-ready",
      "ethone:workspace-change",
      "ethone:workspace-update",
      "ethone:space-change",
      "ethone:space-update",
      "ethone:flow-change",
      "ethone:settings-change",
      "ethone:theme-changed",
      "ethone:notification",
      "ethone:timeline",
      "ethone:lazy-group-loaded",
      "ethone:boot-sequence-complete"
    ].forEach(function (eventName) {
      global.addEventListener(eventName, function () { schedule(eventName.replace(/^ethone:/, ""), 120); }, { passive: true });
    });
    global.addEventListener("storage", function (event) {
      if (!event || /ethone|nexus|pomo|sb_width/.test(text(event.key))) schedule("storage", 160);
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) schedule("visibility", 160);
    }, { passive: true });
    wrapSave();
    setTimeout(wrapSave, 600);
    setTimeout(wrapSave, 1600);
    installAIContextAdapter();
    setTimeout(installAIContextAdapter, 900);
    setTimeout(function () { refresh("boot", true); }, 60);
  }

  var api = Object.freeze({
    snapshot: snapshot,
    refresh: refresh,
    schedule: schedule,
    subscribe: subscribe,
    aiContext: aiContext,
    facts: function () { return snapshot().facts; },
    summary: function () { return snapshot().summary; },
    currentPage: function () { return snapshot().page.id; },
    mode: function () { return snapshot().mode; }
  });

  global.ETHONEOSContext = api;
  if (global.Ethone && typeof global.Ethone.define === "function") global.Ethone.define("osContext", api);
  safe("boot-manager", function () {
    if (global.ETHONEBootManager && typeof global.ETHONEBootManager.setStatus === "function") {
      global.ETHONEBootManager.setStatus(MODULE_ID, "loaded");
    }
  }, null);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})(window);
