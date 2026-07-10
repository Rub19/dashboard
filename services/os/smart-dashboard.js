/* ETHONE Smart Dashboard.
   Lightweight context layer that adapts the existing dashboard without
   replacing user layouts, calling providers or mounting heavy modules. */
(function initEthoneSmartDashboard(global) {
  "use strict";

  if (!global || global.__ethoneSmartDashboard) return;
  global.__ethoneSmartDashboard = true;

  var MODULE_ID = "smart-dashboard";
  var ROOT_ID = "ethone-smart-dashboard";
  var STATE_KEY = "ethone:smart-dashboard:v1";
  var USAGE_KEY = "ethone:smart-dashboard:usage";
  var LEARNING_KEY = "ethone:usage-learning:v1";
  var scheduled = 0;
  var hourTimer = 0;
  var saveTimer = 0;
  var lastSignature = "";
  var lastPlan = null;
  var usageCache = null;

  function safe(label, fn, fallback) {
    try {
      return fn();
    } catch (error) {
      try {
        global.__ethoneSmartDashboardErrors = (global.__ethoneSmartDashboardErrors || []).slice(-20);
        global.__ethoneSmartDashboardErrors.push({
          label: label,
          message: error && error.message ? error.message : String(error || ""),
          at: new Date().toISOString()
        });
      } catch (e) {}
      return fallback;
    }
  }

  function text(value) {
    return String(value == null ? "" : value);
  }

  function esc(value) {
    return text(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char;
    });
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function readJSON(key, fallback) {
    return safe("readJSON:" + key, function () {
      var raw = global.localStorage && global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }, fallback);
  }

  function writeJSON(key, value) {
    safe("writeJSON:" + key, function () {
      if (global.localStorage) global.localStorage.setItem(key, JSON.stringify(value));
    }, null);
  }

  function lang() {
    return text(global._lang || localStorage.getItem("nexus_lang") || document.documentElement.lang || "fr").slice(0, 2).toLowerCase();
  }

  function copy(fr, en) {
    return lang() === "fr" ? fr : en;
  }

  function state() {
    var raw = readJSON(STATE_KEY, null) || {};
    return {
      enabled: raw.enabled !== false,
      dismissedAt: Number(raw.dismissedAt || 0)
    };
  }

  function saveState(next) {
    writeJSON(STATE_KEY, next || state());
  }

  function actionRegistry() {
    return safe("actions", function () {
      return global.ACTION_REGISTRY || global.ETHONEActions || (global.Ethone && global.Ethone.get && global.Ethone.get("actions")) || null;
    }, null);
  }

  function runAction(id, context) {
    var actions = actionRegistry();
    if (actions && typeof actions.dispatch === "function") return actions.dispatch(id, context || { source: MODULE_ID });
    if (typeof global.runAction === "function") return global.runAction(id, context || { source: MODULE_ID });
    if (typeof global.toast === "function") global.toast(copy("Cette commande ne peut pas etre executee dans ce contexte", "This command cannot run in the current context"), "info");
    return false;
  }

  function osSnapshot() {
    return safe("osSnapshot", function () {
      if (global.ETHONEOSContext && typeof global.ETHONEOSContext.snapshot === "function") {
        return global.ETHONEOSContext.snapshot();
      }
      var active = document.querySelector(".tab-content.active[id^='page-']");
      return {
        page: { id: active && active.id ? active.id.replace(/^page-/, "") : "dashboard", label: "Dashboard" },
        workspace: null,
        mode: { id: "personal", label: "Personal OS", part: hourPart(new Date().getHours()), tone: "" },
        facts: emptyFacts(),
        modules: {}
      };
    }, { page: { id: "dashboard", label: "Dashboard" }, mode: { id: "personal", part: hourPart(new Date().getHours()) }, facts: emptyFacts(), modules: {} });
  }

  function emptyFacts() {
    return {
      tasks: { open: 0, done: 0, overdue: 0, high: 0, today: 0 },
      notes: { total: 0 },
      files: { total: 0 },
      calendar: { today: 0, upcoming: 0 },
      habits: { total: 0 },
      goals: { open: 0, total: 0 },
      widgets: { visible: 0, total: 0 },
      flows: { active: "", total: 0 },
      integrations: { connected: 0, connectedIds: [], map: {} },
      ai: { providers: 0 }
    };
  }

  function dashboardPage() {
    var page = document.getElementById("page-dashboard");
    if (!page || !page.classList.contains("active")) return null;
    var auth = document.getElementById("auth-screen");
    if (auth) {
      var authStyle = getComputedStyle(auth);
      if (authStyle.display !== "none" && authStyle.visibility !== "hidden") return null;
    }
    return page;
  }

  function dashboardHome() {
    var page = dashboardPage();
    if (!page) return null;
    return page.querySelector("#ethone-2026-home") || page;
  }

  function hourPart(hour) {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 23) return "evening";
    return "night";
  }

  function dayLabel(date) {
    return date.toLocaleDateString(lang() === "fr" ? "fr-FR" : "en-US", { weekday: "long" });
  }

  function readUsage() {
    if (usageCache) return usageCache;
    var learned = readJSON(LEARNING_KEY, {}) || {};
    var local = readJSON(USAGE_KEY, {}) || {};
    var out = {};
    function merge(map, weight) {
      Object.keys(map || {}).forEach(function (key) {
        var entry = map[key];
        var count = typeof entry === "number" ? entry : Number(entry && entry.count || 0);
        if (!count) return;
        out[key] = (out[key] || 0) + count * (weight || 1);
      });
    }
    if (global.ETHONEUsageLearning && typeof global.ETHONEUsageLearning.scores === "function") {
      merge(global.ETHONEUsageLearning.scores() || {}, 1.2);
    }
    merge(learned.widgets, 1);
    merge(learned.pages, 0.45);
    merge(local.widgets, 1.1);
    usageCache = out;
    return out;
  }

  function topUsage() {
    var scores = readUsage();
    return Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; }).slice(0, 5).map(function (id) {
      return { id: id, score: Math.round(scores[id] * 10) / 10 };
    });
  }

  function bumpUsage(widgetType) {
    if (!widgetType) return;
    var data = readJSON(USAGE_KEY, {}) || {};
    data.widgets = data.widgets || {};
    var item = data.widgets[widgetType] || { count: 0, last: 0 };
    item.count = Number(item.count || 0) + 1;
    item.last = Date.now();
    data.widgets[widgetType] = item;
    usageCache = null;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { writeJSON(USAGE_KEY, data); }, 220);
  }

  function classifyFlow(flow) {
    var value = text(flow).toLowerCase();
    if (/gaming|valorant|steam|stream|twitch|discord/.test(value)) return "gaming";
    if (/dev|code|github|terminal|database|studio/.test(value)) return "development";
    if (/study|etude|school|learn|pdf|reading/.test(value)) return "study";
    if (/focus|deep/.test(value)) return "focus";
    if (/personal|home|journal|habit/.test(value)) return "personal";
    return "";
  }

  function connected(map, ids) {
    map = map || {};
    return ids.some(function (id) { return !!map[id]; });
  }

  function inferMode(snapshot, usageTop) {
    var now = new Date();
    var part = hourPart(now.getHours());
    var f = snapshot.facts || emptyFacts();
    var flowMode = classifyFlow(f.flows && f.flows.active);
    var mode = flowMode || (snapshot.mode && snapshot.mode.id) || "personal";
    var integrations = (f.integrations && f.integrations.map) || {};
    var usageIds = usageTop.map(function (item) { return item.id; }).join(" ");
    var corpus = [mode, snapshot.page && snapshot.page.id, snapshot.workspace && snapshot.workspace.name, usageIds].join(" ").toLowerCase();

    if (flowMode) return flowMode;
    if (/gaming|valorant|steam|discord|twitch/.test(corpus) || connected(integrations, ["steam", "valorant", "riot", "twitch"])) return "gaming";
    if (/development|dev|github|terminal|code|database|studio/.test(corpus) || connected(integrations, ["github"])) return "development";
    if (/study|notes|files|pdf|school|cours/.test(corpus)) return "study";
    if (f.tasks && (f.tasks.overdue || f.tasks.high || f.tasks.today > 2)) return "focus";
    if (f.calendar && f.calendar.today && part !== "evening" && part !== "night") return "work";
    if (part === "morning") return "morning";
    if (part === "evening" || part === "night") return "evening";
    return mode === "work" ? "work" : "personal";
  }

  function priorityFor(mode, usageTop) {
    var map = {
      morning: ["hero", "today", "calendar", "weather", "goals", "habits", "brain", "timeline", "quickActions", "workspace", "activity"],
      work: ["hero", "today", "calendar", "tasks", "notes", "brain", "productivity", "goals", "timeline", "quickActions", "workspace"],
      focus: ["hero", "brain", "today", "tasks", "goals", "habits", "notes", "calendar", "timeline", "quickActions"],
      development: ["hero", "github", "terminal", "brain", "aiSuggestions", "notes", "tasks", "calendar", "productivity", "timeline", "quickActions"],
      gaming: ["hero", "discord", "spotify", "nowPlaying", "valorant", "steam", "gaming", "brain", "timeline", "quickActions"],
      study: ["hero", "notes", "files", "calendar", "brain", "tasks", "focus", "timeline", "quickActions"],
      evening: ["hero", "nowPlaying", "spotify", "discord", "habits", "journal", "calendar", "brain", "timeline", "quickActions"],
      personal: ["hero", "today", "brain", "calendar", "notes", "files", "habits", "goals", "timeline", "quickActions", "workspace"]
    };
    var base = (map[mode] || map.personal).slice();
    usageTop.forEach(function (entry) {
      if (base.indexOf(entry.id) === -1) base.splice(Math.min(4, base.length), 0, entry.id);
    });
    return base.filter(function (item, index) { return base.indexOf(item) === index; });
  }

  function actionPlan(mode) {
    var items = {
      morning: [
        ["calendar.open", "calendar-days", copy("Voir le planning", "Open schedule")],
        ["todos.open", "circle-check", copy("Prioriser les taches", "Prioritize tasks")],
        ["brain.open", "brain", copy("Briefing Brain", "Brain briefing")]
      ],
      work: [
        ["todos.open", "circle-check", copy("Taches ouvertes", "Open tasks")],
        ["calendar.open", "calendar-days", copy("Calendrier", "Calendar")],
        ["brain.open", "brain", copy("Demander a Brain", "Ask Brain")]
      ],
      focus: [
        ["focus.continue", "timer", "Focus"],
        ["todos.open", "circle-check", copy("Priorites", "Priorities")],
        ["brain.open", "brain", copy("Clarifier", "Clarify")]
      ],
      development: [
        ["github.open", "github", "GitHub"],
        ["notes.open", "notebook-pen", copy("Notes techniques", "Technical notes")],
        ["brain.open", "brain-circuit", copy("Aide Brain", "Brain assist")]
      ],
      gaming: [
        ["gaming.open", "gamepad-2", "Gaming"],
        ["connections.open", "plug", copy("Integrations", "Connections")],
        ["brain.open", "brain", copy("Resume session", "Session brief")]
      ],
      study: [
        ["notes.open", "notebook-pen", "Notes"],
        ["files.open", "folder", copy("Fichiers", "Files")],
        ["brain.open", "brain", copy("Resumer", "Summarize")]
      ],
      evening: [
        ["connections.open", "plug", copy("Connexions", "Connections")],
        ["journal.open", "book-open", "Journal"],
        ["brain.open", "brain", copy("Bilan", "Wrap up")]
      ],
      personal: [
        ["notes.open", "notebook-pen", "Notes"],
        ["calendar.open", "calendar-days", "Calendar"],
        ["brain.open", "brain", "Brain"]
      ]
    }[mode] || [];
    return items.map(function (item) {
      return { action: item[0], icon: item[1], label: item[2] };
    });
  }

  function titleFor(mode, snapshot) {
    var f = snapshot.facts || emptyFacts();
    var workspace = snapshot.workspace && snapshot.workspace.name || "ETHONE";
    var map = {
      morning: copy("ETHONE prepare votre journee.", "ETHONE is preparing your day."),
      work: copy("Mode travail actif.", "Work mode is active."),
      focus: copy("ETHONE protege votre attention.", "ETHONE is protecting your attention."),
      development: copy("Environnement developpement detecte.", "Development environment detected."),
      gaming: copy("Environnement gaming pret.", "Gaming environment ready."),
      study: copy("Session d'etude organisee.", "Study session organized."),
      evening: copy("ETHONE ralentit le rythme.", "ETHONE is shifting into a calmer rhythm."),
      personal: copy("Votre espace s'adapte.", "Your space is adapting.")
    };
    var suffix = [];
    if (f.tasks && f.tasks.open) suffix.push(f.tasks.open + " " + copy("taches", "tasks"));
    if (f.calendar && f.calendar.today) suffix.push(f.calendar.today + " " + copy("evenements", "events"));
    if (!suffix.length && f.integrations && f.integrations.connected) suffix.push(f.integrations.connected + " " + copy("connexions", "connections"));
    return {
      title: map[mode] || map.personal,
      sentence: suffix.length ? copy("Contexte ", "Context ") + workspace + ": " + suffix.join(" / ") + "." : copy("Contexte ", "Context ") + workspace + copy(" calme et synchronise.", " is calm and synchronized.")
    };
  }

  function signalsFor(mode, snapshot, usageTop) {
    var f = snapshot.facts || emptyFacts();
    var now = new Date();
    var signals = [
      { icon: "clock-3", label: copy("Heure", "Time"), value: dayLabel(now) + " " + now.toLocaleTimeString(lang() === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" }) },
      { icon: "workflow", label: "Flow", value: f.flows && f.flows.active ? f.flows.active : copy("Auto", "Auto") },
      { icon: "calendar-days", label: "Calendar", value: (f.calendar && f.calendar.today ? f.calendar.today : 0) + " " + copy("aujourd'hui", "today") },
      { icon: "list-checks", label: copy("Taches", "Tasks"), value: (f.tasks && f.tasks.open ? f.tasks.open : 0) + " " + copy("ouvertes", "open") }
    ];
    if (usageTop[0]) signals.push({ icon: "activity", label: copy("Habitude", "Habit"), value: usageTop[0].id });
    if (snapshot.page && snapshot.page.id && snapshot.page.id !== "dashboard") signals.push({ icon: "app-window", label: copy("App", "App"), value: snapshot.page.label || snapshot.page.id });
    if (f.integrations && f.integrations.connected) signals.push({ icon: "plug", label: copy("Connecte", "Connected"), value: String(f.integrations.connected) });
    return signals.slice(0, 6);
  }

  function derivePlan(snapshot) {
    var usageTop = topUsage();
    var mode = inferMode(snapshot, usageTop);
    var headline = titleFor(mode, snapshot);
    var priority = priorityFor(mode, usageTop);
    return {
      mode: mode,
      label: modeLabel(mode),
      icon: modeIcon(mode),
      title: headline.title,
      sentence: headline.sentence,
      priority: priority,
      actions: actionPlan(mode),
      signals: signalsFor(mode, snapshot, usageTop),
      usage: usageTop
    };
  }

  function modeLabel(mode) {
    return {
      morning: copy("Matin", "Morning"),
      work: copy("Travail", "Work"),
      focus: "Focus",
      development: "Development",
      gaming: "Gaming",
      study: copy("Etude", "Study"),
      evening: copy("Soir", "Evening"),
      personal: "Personal OS"
    }[mode] || "Personal OS";
  }

  function modeIcon(mode) {
    return {
      morning: "sunrise",
      work: "briefcase-business",
      focus: "timer",
      development: "square-terminal",
      gaming: "gamepad-2",
      study: "book-open",
      evening: "moon-star",
      personal: "sparkles"
    }[mode] || "sparkles";
  }

  function findInsertAfter(home) {
    return home.querySelector("#d4-workspace-switcher") || home.querySelector(".d4-topbar") || null;
  }

  function ensureRoot(home) {
    var root = document.getElementById(ROOT_ID);
    if (root && !home.contains(root)) root.remove();
    root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("section");
      root.id = ROOT_ID;
      root.className = "d4-smart-dashboard";
      var anchor = findInsertAfter(home);
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(root, anchor.nextSibling);
      else home.insertBefore(root, home.firstChild);
    }
    return root;
  }

  function renderSignals(signals) {
    return signals.map(function (signal) {
      return '<span class="d4-sd-signal"><i data-lucide="' + esc(signal.icon) + '" aria-hidden="true"></i><span><small>' + esc(signal.label) + '</small><strong>' + esc(signal.value) + '</strong></span></span>';
    }).join("");
  }

  function renderActions(actions) {
    return actions.slice(0, 3).map(function (action, index) {
      return '<button class="d4-sd-action' + (index === 0 ? " primary" : "") + '" type="button" data-smart-dashboard-action="' + esc(action.action) + '">' +
        '<i data-lucide="' + esc(action.icon) + '" aria-hidden="true"></i><span>' + esc(action.label) + '</span>' +
      '</button>';
    }).join("");
  }

  function renderPlan(home, plan, settings) {
    var root = ensureRoot(home);
    root.dataset.mode = plan.mode;
    root.innerHTML =
      '<div class="d4-sd-orb" aria-hidden="true"></div>' +
      '<div class="d4-sd-main">' +
        '<span class="d4-sd-kicker"><i data-lucide="' + esc(plan.icon) + '" aria-hidden="true"></i> Smart Dashboard / ' + esc(plan.label) + '</span>' +
        '<strong>' + esc(plan.title) + '</strong>' +
        '<p>' + esc(plan.sentence) + '</p>' +
      '</div>' +
      '<div class="d4-sd-signals" aria-label="' + esc(copy("Signaux utilises", "Signals used")) + '">' + renderSignals(plan.signals) + '</div>' +
      '<div class="d4-sd-actions">' + renderActions(plan.actions) +
        '<button class="d4-sd-action ghost" type="button" data-smart-dashboard-toggle aria-pressed="' + (settings.enabled ? "true" : "false") + '">' + esc(settings.enabled ? "Auto" : "Off") + '</button>' +
      '</div>';
    safe("icons", function () {
      if (global.lucide && !global.__lucideFailed && typeof global.lucide.createIcons === "function") global.lucide.createIcons({ attrs: { "stroke-width": 2 } });
    }, null);
  }

  function clearPriority(home) {
    Array.prototype.forEach.call(home.querySelectorAll(".d4-widget[data-widget-type]"), function (widget) {
      widget.style.order = "";
      widget.classList.remove("d4-smart-priority", "d4-smart-secondary", "d4-smart-deemphasized");
      delete widget.dataset.smartRank;
    });
  }

  function cleanupInactiveDashboard() {
    var root = document.getElementById(ROOT_ID);
    if (root) root.remove();
    if (document.body && document.body.dataset) delete document.body.dataset.ethoneSmartDashboard;
    var staleHome = document.getElementById("ethone-2026-home");
    if (staleHome && staleHome.dataset) delete staleHome.dataset.smartDashboardMode;
  }

  function applyPriority(home, plan, settings) {
    if (!settings.enabled || document.body.classList.contains("d4-editing")) {
      clearPriority(home);
      return;
    }
    var priority = plan.priority || [];
    Array.prototype.forEach.call(home.querySelectorAll(".d4-widget[data-widget-type]"), function (widget) {
      var type = widget.dataset.widgetType || "";
      var idx = priority.indexOf(type);
      widget.style.order = idx > -1 ? String(10 + idx) : "";
      widget.dataset.smartRank = idx > -1 ? String(idx + 1) : "";
      widget.classList.toggle("d4-smart-priority", idx > -1 && idx < 3);
      widget.classList.toggle("d4-smart-secondary", idx > 2 && idx < 7);
      widget.classList.toggle("d4-smart-deemphasized", idx === -1 || idx > 8);
    });
  }

  function signature(snapshot, plan, settings, home) {
    var f = snapshot.facts || emptyFacts();
    return [
      settings.enabled,
      snapshot.page && snapshot.page.id,
      snapshot.workspace && snapshot.workspace.id,
      plan.mode,
      plan.priority.slice(0, 8).join(","),
      f.tasks && f.tasks.open,
      f.calendar && f.calendar.today,
      f.flows && f.flows.active,
      !!home.querySelector("#" + ROOT_ID)
    ].join("|");
  }

  function render(force) {
    var home = dashboardHome();
    if (!home) {
      cleanupInactiveDashboard();
      return false;
    }
    if (document.hidden) return false;
    var settings = state();
    var snapshot = osSnapshot();
    var plan = derivePlan(snapshot);
    var sig = signature(snapshot, plan, settings, home);
    if (!force && sig === lastSignature) {
      applyPriority(home, plan, settings);
      return true;
    }
    lastSignature = sig;
    lastPlan = plan;
    document.body.dataset.ethoneSmartDashboard = settings.enabled ? plan.mode : "off";
    home.dataset.smartDashboardMode = settings.enabled ? plan.mode : "off";
    renderPlan(home, plan, settings);
    applyPriority(home, plan, settings);
    safe("event", function () {
      global.dispatchEvent(new CustomEvent("ethone:smart-dashboard-update", { detail: { plan: plan, snapshot: snapshot, enabled: settings.enabled } }));
    }, null);
    return true;
  }

  function schedule(reason, delay) {
    clearTimeout(scheduled);
    scheduled = setTimeout(function () { render(false); }, delay == null ? 120 : delay);
  }

  function scheduleHourRefresh() {
    clearTimeout(hourTimer);
    if (document.hidden) return;
    var now = new Date();
    var ms = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds() + 500;
    hourTimer = setTimeout(function () {
      schedule("hour", 40);
      scheduleHourRefresh();
    }, Math.max(30000, ms));
  }

  function registerActions() {
    var actions = actionRegistry();
    if (!actions || !actions.register || actions.has && actions.has("dashboard.smart.refresh")) return;
    actions.register("dashboard.smart.refresh", { label: "Refresh Smart Dashboard", handler: function () {
      usageCache = null;
      render(true);
      return true;
    } });
    actions.register("dashboard.smart.toggle", { label: "Toggle Smart Dashboard", handler: function () {
      var next = state();
      next.enabled = !next.enabled;
      saveState(next);
      render(true);
      return true;
    } });
  }

  function bind() {
    document.addEventListener("click", function (event) {
      var home = dashboardHome();
      if (!home || !home.contains(event.target)) return;

      var toggle = event.target.closest && event.target.closest("[data-smart-dashboard-toggle]");
      if (toggle) {
        event.preventDefault();
        var next = state();
        next.enabled = !next.enabled;
        saveState(next);
        render(true);
        return;
      }

      var action = event.target.closest && event.target.closest("[data-smart-dashboard-action]");
      if (action) {
        event.preventDefault();
        runAction(action.dataset.smartDashboardAction, { source: MODULE_ID, el: action, plan: lastPlan });
        return;
      }

      var widget = event.target.closest && event.target.closest(".d4-widget[data-widget-type]");
      if (widget) {
        bumpUsage(widget.dataset.widgetType);
        schedule("widget-usage", 180);
      }
    }, false);

    [
      "ethone:dashboard-ready",
      "ethone:page-ready",
      "ethone:boot-sequence-complete",
      "ethone:os-context-update",
      "ethone:workspace-change",
      "ethone:workspace-update",
      "ethone:flow-change",
      "ethone:smart-layout-change",
      "ethone:settings-change",
      "ethone:theme-change",
      "ethone:lazy-group-loaded",
      "ethone:timeline",
      "ethone:memory-update",
      "settings:changed"
    ].forEach(function (name) {
      global.addEventListener(name, function () {
        usageCache = null;
        registerActions();
        schedule(name, name === "ethone:dashboard-ready" ? 260 : 120);
      }, { passive: true });
    });

    global.addEventListener("storage", function (event) {
      if (!event || !event.key || /ethone|nexus|pomo/.test(event.key)) {
        usageCache = null;
        schedule("storage", 180);
      }
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        schedule("visible", 80);
        scheduleHourRefresh();
      } else {
        clearTimeout(hourTimer);
      }
    }, { passive: true });
  }

  function bootStatus(status, extra) {
    safe("bootStatus", function () {
      if (global.ETHONEBootManager && typeof global.ETHONEBootManager.setStatus === "function") {
        global.ETHONEBootManager.setStatus(MODULE_ID, status, extra || {});
      }
    }, null);
  }

  function boot() {
    registerActions();
    bind();
    schedule("boot", 220);
    scheduleHourRefresh();
    bootStatus("loaded");
  }

  var api = {
    refresh: function () { return render(true); },
    plan: function () { return lastPlan || derivePlan(osSnapshot()); },
    derive: derivePlan,
    setEnabled: function (enabled) {
      var next = state();
      next.enabled = enabled !== false;
      saveState(next);
      render(true);
    },
    trackWidget: function (type) {
      bumpUsage(type);
      schedule("manual-track", 100);
    },
    usage: function () {
      usageCache = null;
      return readUsage();
    }
  };

  global.ETHONESmartDashboard = api;
  if (global.Ethone && typeof global.Ethone.define === "function") global.Ethone.define("smartDashboard", api);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(window);
