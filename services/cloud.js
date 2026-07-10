/* ETHONE Cloud.
 * Local-first synchronization layer for Workspaces, Dashboard, Themes, Widgets,
 * Plugins, Notes, Tasks, Calendar and Files. It uses the existing profile state
 * and Supabase saveCloudState bridge when available, without requiring a new
 * backend table.
 */
(function initEthoneCloud(global) {
  "use strict";

  if (global.__ethoneCloudService) return;
  global.__ethoneCloudService = true;

  var STORE_KEY = "ethone:cloud:v1";
  var MAX_HISTORY = 24;
  var MAX_CONFLICTS = 12;
  var AUTO_SYNC_DELAY = 2400;
  var BACKGROUND_INTERVAL = 180000;
  var autoTimer = 0;
  var intervalId = 0;
  var syncing = false;
  var lastRenderTick = 0;
  var suppressAuto = 0;

  var DOMAINS = [
    { id: "workspaces", label: "Workspaces", icon: "panels-top-left", description: "Spaces, active workspace and workspace metadata." },
    { id: "dashboard", label: "Dashboard", icon: "layout-dashboard", description: "Layout, dock, smart layouts and dashboard preferences." },
    { id: "themes", label: "Themes", icon: "palette", description: "Accent, typography, background, density and theme engine values." },
    { id: "widgets", label: "Widgets", icon: "blocks", description: "Widget visibility, widget builder data and marketplace widgets." },
    { id: "plugins", label: "Plugins", icon: "plug", description: "Installed plugin state and integration hub configuration." },
    { id: "notes", label: "Notes", icon: "notebook-pen", description: "Notes, quick notes, items and local note metadata." },
    { id: "tasks", label: "Tasks", icon: "circle-check-big", description: "Tasks, Kanban, goals, habits and focus state." },
    { id: "calendar", label: "Calendar", icon: "calendar-days", description: "Events, countdowns and planning context." },
    { id: "files", label: "Files", icon: "folder-open", description: "Files state, databases and import metadata." }
  ];

  var STATE_GROUPS = {
    dashboard: ["dashboard", "overviewOrder", "dailyFocus", "permanentDock", "smartLayouts", "usageLearning", "statusBar"],
    themes: ["theme", "themeIdx", "bgTheme", "customAccent", "background", "backgroundEngine", "density", "font", "radius", "blur", "glow", "surfaceOpacity", "animations"],
    widgets: ["liveWidgets", "widgetBuilder", "widgetMarketplace", "overviewOrder", "weatherCity", "weatherCache"],
    plugins: ["plugins", "pluginHub", "pluginSDK", "connections", "gaming", "aiProviders"],
    notes: ["note", "notes", "items", "journal", "pinned"],
    tasks: ["todos", "kanban", "goals", "habits", "pomoHistory", "dailyFocus"],
    calendar: ["events", "countdowns"],
    files: ["filesState", "databases", "databasesView", "valorantAccounts", "valorantAccountsView"]
  };

  var LOCAL_PREFIXES = {
    dashboard: ["ethone:dashboard", "ethone:layout-mode", "ethone:desktop", "ethone:permanent-dock", "ethone:smart-layouts", "ethone:native-shell", "ethone:status-bar"],
    themes: ["ethone:theme", "ethone:bg", "ethone:accent", "ethone:settings", "ethone:compact", "ethone:reducedMotion", "ethone:micro"],
    widgets: ["ethone:widget", "ethone:widgets", "ethone:widget-builder", "ethone:widget-marketplace"],
    plugins: ["ethone:plugins", "ethone:plugin", "ethone:connections"],
    notes: ["ethone:notes", "ethone:items"],
    tasks: ["ethone:tasks", "ethone:todos", "pomo_"],
    calendar: ["ethone:calendar", "ethone:events"],
    files: ["ethone:files:", "ethone:databases"]
  };

  function now() {
    return new Date().toISOString();
  }

  function profile() {
    try { return typeof global.curP === "function" ? global.curP() : null; } catch (error) { return null; }
  }

  function state() {
    var p = profile();
    if (!p) return null;
    if (!p.state) p.state = {};
    return p.state;
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function toast(message, type) {
    try {
      if (typeof global.toast === "function") {
        global.toast(message, type || "info");
        return;
      }
    } catch (error) {}
    if (type === "error" && global.console && typeof global.console.error === "function") {
      global.console.error("[ETHONE Cloud]", message);
    }
  }

  function logActivity(title, body, category) {
    try {
      if (global.ETHONETimeline && typeof global.ETHONETimeline.record === "function") {
        global.ETHONETimeline.record({
          title: title,
          body: body || "",
          category: category || "sync",
          source: "ETHONE Cloud",
          dedupe: "cloud-" + Date.now()
        });
      }
    } catch (error) {}
  }

  function readStore() {
    var store;
    try { store = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (error) { store = {}; }
    if (!store || typeof store !== "object") store = {};
    if (!store.deviceId) store.deviceId = "device-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    if (!Array.isArray(store.history)) store.history = [];
    if (!Array.isArray(store.conflicts)) store.conflicts = [];
    if (store.enabled !== false) store.enabled = true;
    if (store.background !== false) store.background = true;
    store.history = store.history.slice(0, MAX_HISTORY);
    store.conflicts = store.conflicts.slice(0, MAX_CONFLICTS);
    return store;
  }

  function writeStore(store) {
    store.history = (store.history || []).slice(0, MAX_HISTORY);
    store.conflicts = (store.conflicts || []).slice(0, MAX_CONFLICTS);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (error) {
      store.history = store.history.slice(0, 8);
      store.conflicts = store.conflicts.slice(0, 4);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (innerError) {}
    }
  }

  function formatSize(size) {
    size = Number(size) || 0;
    if (size > 1024 * 1024) return (size / 1024 / 1024).toFixed(2) + " MB";
    if (size > 1024) return Math.round(size / 1024) + " KB";
    return size + " B";
  }

  function timeAgo(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return "Never";
    var diff = Date.now() - date.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
    return Math.floor(diff / 86400000) + "d ago";
  }

  function safeJSONSize(value) {
    try { return new Blob([JSON.stringify(value)]).size; } catch (error) {
      try { return JSON.stringify(value).length; } catch (innerError) { return 0; }
    }
  }

  function signature(value) {
    var text = "";
    try { text = JSON.stringify(value); } catch (error) { text = String(value); }
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16) + "-" + text.length;
  }

  function activeWorkspace() {
    try {
      if (global.ETHONEWorkspaces && typeof global.ETHONEWorkspaces.active === "function") {
        return global.ETHONEWorkspaces.active();
      }
    } catch (error) {}
    var p = profile();
    if (p && Array.isArray(p.workspaces)) {
      return p.workspaces.find(function (w) { return w.id === p.activeWorkspaceId; }) || p.workspaces[0] || null;
    }
    return null;
  }

  function isSensitiveKey(key) {
    key = String(key || "").toLowerCase();
    return !key || key.indexOf("supabase") === 0 || key.indexOf("sb-") === 0 ||
      /password|secret|token|api[_-]?key|apikey|auth|session|credential/.test(key);
  }

  function shouldCaptureLocalKey(key, domain) {
    if (isSensitiveKey(key)) return false;
    var prefixes = LOCAL_PREFIXES[domain] || [];
    return prefixes.some(function (prefix) { return String(key).indexOf(prefix) === 0; });
  }

  function captureLocal(domain) {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (shouldCaptureLocalKey(key, domain)) out[key] = localStorage.getItem(key);
      }
    } catch (error) {}
    return out;
  }

  function captureStateGroup(domain, sourceState) {
    var keys = STATE_GROUPS[domain] || [];
    var out = {};
    keys.forEach(function (key) {
      if (sourceState && sourceState[key] !== undefined) out[key] = clone(sourceState[key]);
    });
    return out;
  }

  function capturePayload(reason) {
    var p = profile();
    var s = state() || {};
    var store = readStore();
    var domains = {};

    DOMAINS.forEach(function (domain) {
      var value = { state: {}, localStorage: {} };
      if (domain.id === "workspaces") {
        value.workspaces = clone(Array.isArray(p && p.workspaces) ? p.workspaces : []);
        value.activeWorkspaceId = p && p.activeWorkspaceId || "";
      } else {
        value.state = captureStateGroup(domain.id, s);
        value.localStorage = captureLocal(domain.id);
      }
      domains[domain.id] = value;
    });

    var payload = {
      type: "ethone-cloud-snapshot",
      version: 1,
      reason: reason || "manual",
      createdAt: now(),
      deviceId: store.deviceId,
      profile: p ? { id: p.id || "", name: p.name || p.username || "ETHONE" } : null,
      workspace: activeWorkspace() ? { id: activeWorkspace().id, name: activeWorkspace().name } : null,
      domains: domains
    };

    payload.summary = summarizePayload(payload);
    payload.signature = signature({ domains: payload.domains, profile: payload.profile && payload.profile.id });
    payload.size = safeJSONSize(payload);
    return payload;
  }

  function summarizePayload(payload) {
    var domains = payload.domains || {};
    var notes = domains.notes && domains.notes.state && domains.notes.state.notes;
    var tasks = domains.tasks && domains.tasks.state && domains.tasks.state.todos;
    var events = domains.calendar && domains.calendar.state && domains.calendar.state.events;
    var files = domains.files && domains.files.state && domains.files.state.filesState;
    var plugins = domains.plugins && domains.plugins.state && domains.plugins.state.plugins;
    return {
      domains: Object.keys(domains).length,
      workspaces: domains.workspaces && Array.isArray(domains.workspaces.workspaces) ? domains.workspaces.workspaces.length : 0,
      notes: Array.isArray(notes) ? notes.length : 0,
      tasks: Array.isArray(tasks) ? tasks.length : 0,
      calendar: Array.isArray(events) ? events.length : 0,
      files: files && typeof files === "object" ? Object.keys(files).length : 0,
      plugins: Array.isArray(plugins) ? plugins.length : 0,
      size: payload.size || 0
    };
  }

  function readRemote() {
    var p = profile();
    var cloud = p && p.state && p.state.ethoneCloud;
    if (cloud && cloud.latest) return cloud.latest;
    try {
      var mirror = JSON.parse(localStorage.getItem("ethone:cloud:remote-mirror") || "null");
      return mirror && mirror.latest || null;
    } catch (error) {
      return null;
    }
  }

  function readCloudState() {
    var p = profile();
    var cloud = p && p.state && p.state.ethoneCloud;
    if (cloud && typeof cloud === "object") return cloud;
    try {
      return JSON.parse(localStorage.getItem("ethone:cloud:remote-mirror") || "{}") || {};
    } catch (error) {
      return {};
    }
  }

  function writeRemote(payload, opts) {
    opts = opts || {};
    var store = readStore();
    var p = profile();
    var previous = readRemote();
    var savedHistory = readCloudState().history;
    var history = Array.isArray(savedHistory) ? savedHistory : (Array.isArray(store.history) ? store.history : []);
    if (previous && previous.signature !== payload.signature) {
      history.unshift(historyEntry(previous, "remote-history"));
    }
    history.unshift(historyEntry(payload, opts.reason || payload.reason || "sync"));
    history = dedupeHistory(history).slice(0, MAX_HISTORY);

    var cloudState = {
      version: 1,
      enabled: store.enabled !== false,
      background: store.background !== false,
      latest: payload,
      history: history,
      conflicts: store.conflicts || [],
      lastSyncAt: now(),
      lastDeviceId: store.deviceId
    };

    if (p) {
      if (!p.state) p.state = {};
      p.state.ethoneCloud = cloudState;
      p.state.ethoneCloudMeta = {
        lastSyncAt: cloudState.lastSyncAt,
        lastSignature: payload.signature,
        lastDeviceId: store.deviceId
      };
    }

    try { localStorage.setItem("ethone:cloud:remote-mirror", JSON.stringify(cloudState)); } catch (error) {}
    store.history = history;
    store.lastSyncedSignature = payload.signature;
    store.lastRemoteSignature = payload.signature;
    store.lastSyncAt = cloudState.lastSyncAt;
    store.lastStatus = "synced";
    store.lastError = "";
    writeStore(store);
    saveProfile();
    return saveSupabase(opts);
  }

  function saveProfile() {
    try {
      if (typeof global.saveStateNow === "function") {
        suppressAuto += 1;
        global.saveStateNow();
      }
    } catch (error) {
    } finally {
      suppressAuto = Math.max(0, suppressAuto - 1);
    }
  }

  function saveSupabase(opts) {
    opts = opts || {};
    if (typeof global.saveCloudState !== "function") return Promise.resolve({ mode: "local" });
    return Promise.race([
      Promise.resolve().then(function () { return global.saveCloudState(); }),
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error("Cloud save timed out")); }, opts.timeout || 6500);
      })
    ]);
  }

  function historyEntry(payload, reason) {
    return {
      id: "cloud-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      createdAt: payload.createdAt || now(),
      reason: reason || payload.reason || "sync",
      signature: payload.signature,
      deviceId: payload.deviceId || "",
      profile: payload.profile || null,
      workspace: payload.workspace || null,
      summary: payload.summary || summarizePayload(payload),
      size: payload.size || safeJSONSize(payload),
      payload: clone(payload)
    };
  }

  function dedupeHistory(history) {
    var seen = Object.create(null);
    return (history || []).filter(function (entry) {
      if (!entry || !entry.signature) return false;
      var key = entry.signature + "-" + (entry.reason || "");
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function detectConflict(localPayload, remotePayload, store) {
    if (!remotePayload || !remotePayload.signature) return null;
    if (remotePayload.signature === localPayload.signature) return null;
    if (!store.lastSyncedSignature && remotePayload.deviceId && remotePayload.deviceId !== store.deviceId) {
      return {
        id: "conflict-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
        createdAt: now(),
        localSignature: localPayload.signature,
        remoteSignature: remotePayload.signature,
        local: clone(localPayload),
        remote: clone(remotePayload),
        status: "open",
        reason: "first-device-sync"
      };
    }
    if (!store.lastSyncedSignature) return null;
    var remoteChanged = remotePayload.signature !== store.lastSyncedSignature;
    var localChanged = localPayload.signature !== store.lastSyncedSignature;
    if (!remoteChanged || !localChanged) return null;
    return {
      id: "conflict-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
      createdAt: now(),
      localSignature: localPayload.signature,
      remoteSignature: remotePayload.signature,
      local: clone(localPayload),
      remote: clone(remotePayload),
      status: "open"
    };
  }

  function addConflict(conflict) {
    var store = readStore();
    store.conflicts = (store.conflicts || []).filter(function (item) {
      return item.localSignature !== conflict.localSignature || item.remoteSignature !== conflict.remoteSignature;
    });
    store.conflicts.unshift(conflict);
    store.conflicts = store.conflicts.slice(0, MAX_CONFLICTS);
    store.lastStatus = "conflict";
    store.lastError = "Cloud conflict detected";
    writeStore(store);
    var p = profile();
    if (p && p.state) {
      var cloud = readCloudState();
      cloud.conflicts = store.conflicts;
      cloud.lastStatus = "conflict";
      p.state.ethoneCloud = cloud;
      saveProfile();
    }
    logActivity("ETHONE Cloud conflict", "Local and remote data changed before sync.", "sync");
    render();
  }

  async function syncNow(opts) {
    opts = opts || {};
    var store = readStore();
    if (store.enabled === false && !opts.force) {
      toast("ETHONE Cloud is disabled.", "info");
      render();
      return false;
    }
    if (syncing) return false;
    syncing = true;
    store.lastStatus = "syncing";
    store.lastError = "";
    writeStore(store);
    updateIndicator("saving");
    render();

    try {
      var payload = capturePayload(opts.reason || "manual");
      var remote = readRemote();
      var conflict = opts.skipConflict ? null : detectConflict(payload, remote, store);
      if (conflict) {
        addConflict(conflict);
        updateIndicator("error");
        if (!opts.quiet) toast("Cloud conflict detected. Choose local or remote version.", "error");
        return false;
      }
      await writeRemote(payload, opts);
      updateIndicator("saved");
      logActivity("ETHONE Cloud synced", payload.summary.domains + " domains synchronized.", "sync");
      if (!opts.quiet) toast("ETHONE Cloud synchronized.", "success");
      return true;
    } catch (error) {
      store = readStore();
      store.lastStatus = navigator.onLine === false ? "offline" : "error";
      store.lastError = error && error.message || "Cloud sync failed";
      writeStore(store);
      updateIndicator(store.lastStatus === "offline" ? "offline" : "error");
      logActivity("ETHONE Cloud sync failed", store.lastError, "error");
      if (!opts.quiet) toast(store.lastError, "error");
      return false;
    } finally {
      syncing = false;
      render();
    }
  }

  function updateIndicator(state) {
    try { if (typeof global.updateSyncIndicator === "function") global.updateSyncIndicator(state); } catch (error) {}
  }

  function applyPayload(payload, opts) {
    opts = opts || {};
    if (!payload || !payload.domains) {
      toast("Cloud snapshot unavailable.", "error");
      return false;
    }
    if (!opts.confirmed) {
      var ok = confirm("Restore this ETHONE Cloud snapshot? Workspaces, dashboard, themes, widgets, plugins, notes, tasks, calendar and files will be replaced.");
      if (!ok) return false;
    }

    try {
      if (global.ETHONETimeMachine && typeof global.ETHONETimeMachine.snapshot === "function") {
        global.ETHONETimeMachine.snapshot("Before ETHONE Cloud restore");
      }
    } catch (error) {}

    var p = profile();
    if (!p) {
      toast("Cloud restore requires an active profile.", "error");
      return false;
    }
    if (!p.state) p.state = {};

    var domains = payload.domains;
    if (domains.workspaces) {
      p.workspaces = clone(domains.workspaces.workspaces || []);
      p.activeWorkspaceId = domains.workspaces.activeWorkspaceId || p.activeWorkspaceId;
    }

    Object.keys(STATE_GROUPS).forEach(function (domain) {
      var block = domains[domain];
      if (!block) return;
      var stateBlock = block.state || {};
      Object.keys(stateBlock).forEach(function (key) { p.state[key] = clone(stateBlock[key]); });
      restoreLocalStorage(block.localStorage || {}, domain);
    });

    var store = readStore();
    store.lastSyncedSignature = payload.signature;
    store.lastRemoteSignature = payload.signature;
    store.lastSyncAt = now();
    store.lastStatus = "restored";
    store.lastError = "";
    writeStore(store);
    saveProfile();
    try { if (global.ETHONEWorkspaces && typeof global.ETHONEWorkspaces.applyVisual === "function") global.ETHONEWorkspaces.applyVisual(global.ETHONEWorkspaces.active()); } catch (error) {}
    logActivity("ETHONE Cloud restored", "Restored snapshot from " + new Date(payload.createdAt || Date.now()).toLocaleString(), "sync");
    toast("ETHONE Cloud restored. Reloading ETHONE...", "success");
    setTimeout(function () { location.reload(); }, 520);
    return true;
  }

  function restoreLocalStorage(snapshot, domain) {
    try {
      var current = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (shouldCaptureLocalKey(key, domain)) current.push(key);
      }
      current.forEach(function (key) {
        if (snapshot[key] === undefined) localStorage.removeItem(key);
      });
      Object.keys(snapshot).forEach(function (key) {
        if (shouldCaptureLocalKey(key, domain)) localStorage.setItem(key, String(snapshot[key]));
      });
    } catch (error) {}
  }

  function latest() {
    return readRemote();
  }

  function history() {
    return dedupeHistory(readCloudState().history || readStore().history || []).slice(0, MAX_HISTORY);
  }

  function conflicts() {
    return (readStore().conflicts || []).filter(function (item) { return item && item.status !== "resolved"; });
  }

  function rollback(id) {
    var entry = history().find(function (item) { return item.id === id; }) || history()[0];
    if (!entry || !entry.payload) {
      toast("No Cloud history entry available.", "error");
      return false;
    }
    return applyPayload(entry.payload);
  }

  function resolveConflict(id, strategy) {
    var store = readStore();
    var conflict = (store.conflicts || []).find(function (item) { return item.id === id; });
    if (!conflict) {
      toast("Conflict unavailable.", "error");
      return false;
    }
    if (strategy === "remote") {
      return applyPayload(conflict.remote);
    }
    if (strategy === "local") {
      store.conflicts = store.conflicts.filter(function (item) { return item.id !== id; });
      store.lastSyncedSignature = conflict.remoteSignature;
      writeStore(store);
      return syncNow({ reason: "resolve local", force: true, skipConflict: true });
    }
    return false;
  }

  function setEnabled(enabled) {
    var store = readStore();
    store.enabled = enabled !== false;
    writeStore(store);
    persistSettingsToProfile(store);
    if (store.enabled) scheduleSync("enabled", true);
    else updateIndicator("offline");
    render();
    toast(store.enabled ? "ETHONE Cloud enabled." : "ETHONE Cloud paused.", "info");
  }

  function setBackground(enabled) {
    var store = readStore();
    store.background = enabled !== false;
    writeStore(store);
    persistSettingsToProfile(store);
    startBackground();
    render();
  }

  function persistSettingsToProfile(store) {
    var p = profile();
    if (!p || !p.state) return;
    var cloud = readCloudState();
    cloud.enabled = store.enabled !== false;
    cloud.background = store.background !== false;
    p.state.ethoneCloud = cloud;
    saveProfile();
  }

  function scheduleSync(reason, force) {
    var store = readStore();
    if (store.enabled === false && !force) return;
    if (store.background === false && !force) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      syncNow({ reason: reason || "background", quiet: true });
    }, AUTO_SYNC_DELAY);
  }

  function startBackground() {
    clearInterval(intervalId);
    var store = readStore();
    if (store.background === false || store.enabled === false) return;
    intervalId = setInterval(function () {
      if (!document.hidden) syncNow({ reason: "background interval", quiet: true });
    }, BACKGROUND_INTERVAL);
  }

  function wrapSaveState() {
    if (typeof global.saveStateNow !== "function" || global.__ethoneCloudSaveWrapped) return;
    var old = global.saveStateNow;
    global.saveStateNow = function ethoneCloudWrappedSaveState() {
      var out = old.apply(this, arguments);
      if (!suppressAuto) scheduleSync("profile save");
      return out;
    };
    global.saveStateNow.__ethoneCloudWrapped = true;
    global.__ethoneCloudSaveWrapped = true;
  }

  function statusText() {
    var store = readStore();
    if (syncing || store.lastStatus === "syncing") return "Synchronizing";
    if (store.enabled === false) return "Paused";
    if (conflicts().length) return "Conflict";
    if (navigator.onLine === false) return "Offline";
    if (store.lastStatus === "error") return "Needs attention";
    if (store.lastSyncAt) return "Synced";
    return "Ready";
  }

  function statusClass() {
    var text = statusText().toLowerCase();
    if (text.indexOf("conflict") > -1 || text.indexOf("attention") > -1) return "warning";
    if (text.indexOf("offline") > -1 || text.indexOf("paused") > -1) return "muted";
    if (text.indexOf("sync") > -1) return syncing ? "syncing" : "ok";
    return "ok";
  }

  function render() {
    ensureSettingsEntry();
    var root = document.getElementById("settings-cloud");
    if (!root) return;
    var tick = Date.now();
    if (tick - lastRenderTick < 60) return;
    lastRenderTick = tick;

    var store = readStore();
    var remote = latest();
    var local = capturePayload("preview");
    var list = history();
    var openConflicts = conflicts();
    var status = statusText();
    var summary = remote && remote.summary || local.summary;

    root.innerHTML =
      '<div class="ethone-cloud">' +
        '<section class="ec-hero settings-card">' +
          '<div class="ec-hero-main">' +
            '<div class="ec-kicker"><i data-lucide="cloud"></i> ETHONE Cloud</div>' +
            '<h3>Your personal OS, synchronized.</h3>' +
            '<p>Synchronize Workspaces, Dashboard, Themes, Widgets, Plugins, Notes, Tasks, Calendar and Files with history, rollback, conflict protection and background backups.</p>' +
            '<div class="ec-status ' + statusClass() + '"><span></span><strong>' + escapeHTML(status) + '</strong><small>' + escapeHTML(store.lastSyncAt ? timeAgo(store.lastSyncAt) : "No sync yet") + '</small></div>' +
          '</div>' +
          '<div class="ec-hero-actions">' +
            '<button class="btn btn-primary" type="button" data-cloud-sync><i data-lucide="refresh-cw"></i> Sync now</button>' +
            '<button class="btn btn-ghost" type="button" data-cloud-backup><i data-lucide="archive"></i> Cloud backup</button>' +
            '<button class="btn btn-ghost" type="button" data-cloud-restore-latest ' + (!remote ? "disabled" : "") + '><i data-lucide="rotate-ccw"></i> Restore latest</button>' +
          '</div>' +
        '</section>' +
        '<section class="ec-stats">' +
          statCard("Domains", summary.domains || DOMAINS.length, "layers-3") +
          statCard("Workspaces", summary.workspaces || 0, "panels-top-left") +
          statCard("Notes", summary.notes || 0, "notebook-pen") +
          statCard("Tasks", summary.tasks || 0, "circle-check-big") +
          statCard("Snapshot", formatSize(remote && remote.size || local.size), "database") +
        '</section>' +
        '<section class="ec-grid">' +
          '<article class="settings-card ec-panel">' +
            '<div class="ec-panel-head"><div><span>Sync domains</span><strong>Everything ETHONE Cloud protects</strong></div><button class="ec-toggle" type="button" data-cloud-enabled aria-pressed="' + (store.enabled !== false) + '">' + (store.enabled !== false ? "Enabled" : "Paused") + '</button></div>' +
            '<div class="ec-domain-grid">' + DOMAINS.map(domainCard).join("") + '</div>' +
            '<label class="ec-switch-row"><span><strong>Background sync</strong><small>Automatically sync after important local changes and periodically while ETHONE is open.</small></span><input type="checkbox" data-cloud-background ' + (store.background !== false ? "checked" : "") + '></label>' +
          '</article>' +
          '<article class="settings-card ec-panel">' +
            '<div class="ec-panel-head"><div><span>Conflict safety</span><strong>' + openConflicts.length + ' open conflict' + (openConflicts.length === 1 ? "" : "s") + '</strong></div></div>' +
            '<div class="ec-conflicts">' + (openConflicts.length ? openConflicts.map(conflictRow).join("") : '<div class="ec-empty"><i data-lucide="shield-check"></i><strong>No conflict</strong><span>Local and remote states are aligned.</span></div>') + '</div>' +
          '</article>' +
        '</section>' +
        '<section class="settings-card ec-panel">' +
          '<div class="ec-panel-head"><div><span>Cloud history</span><strong>Rollback-ready restore points</strong></div><button class="btn btn-ghost" type="button" data-cloud-export><i data-lucide="download"></i> Export snapshot</button></div>' +
          '<div class="ec-history">' + (list.length ? list.map(historyRow).join("") : '<div class="ec-empty"><i data-lucide="history"></i><strong>No cloud history yet</strong><span>Run your first sync to create a restore point.</span></div>') + '</div>' +
        '</section>' +
      '</div>';

    refreshIcons(root);
  }

  function statCard(label, value, icon) {
    return '<article class="ec-stat"><i data-lucide="' + icon + '"></i><span>' + escapeHTML(label) + '</span><strong>' + escapeHTML(value) + '</strong></article>';
  }

  function domainCard(domain) {
    return '<div class="ec-domain"><i data-lucide="' + escapeHTML(domain.icon) + '"></i><div><strong>' + escapeHTML(domain.label) + '</strong><span>' + escapeHTML(domain.description) + '</span></div></div>';
  }

  function conflictRow(conflict) {
    return '<article class="ec-conflict">' +
      '<div><strong>Remote and local changed</strong><span>' + escapeHTML(timeAgo(conflict.createdAt)) + ' / local ' + escapeHTML((conflict.localSignature || "").slice(0, 8)) + ' / remote ' + escapeHTML((conflict.remoteSignature || "").slice(0, 8)) + '</span></div>' +
      '<div><button class="btn btn-ghost" type="button" data-cloud-keep-remote="' + escapeHTML(conflict.id) + '">Use remote</button><button class="btn btn-primary" type="button" data-cloud-keep-local="' + escapeHTML(conflict.id) + '">Keep local</button></div>' +
    '</article>';
  }

  function historyRow(entry) {
    var summary = entry.summary || {};
    return '<article class="ec-history-row">' +
      '<div class="ec-history-mark"><i data-lucide="cloud-check"></i></div>' +
      '<div class="ec-history-main"><strong>' + escapeHTML(entry.reason || "Cloud sync") + '</strong><span>' + escapeHTML(new Date(entry.createdAt || Date.now()).toLocaleString()) + ' / ' + escapeHTML(entry.workspace && entry.workspace.name || "Workspace") + '</span></div>' +
      '<div class="ec-history-meta"><span>' + escapeHTML(summary.workspaces || 0) + ' spaces</span><span>' + escapeHTML(formatSize(entry.size)) + '</span></div>' +
      '<button class="btn btn-ghost" type="button" data-cloud-rollback="' + escapeHTML(entry.id) + '">Rollback</button>' +
    '</article>';
  }

  function refreshIcons(root) {
    try { if (global.lucide && !global.__lucideFailed) global.lucide.createIcons({}, root || document); } catch (error) {}
  }

  function exportLatest() {
    var payload = latest() || capturePayload("export");
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "ethone-cloud-" + now().slice(0, 19).replace(/:/g, "-") + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function handleClick(event) {
    var target = event.target;
    if (target.closest("[data-cloud-sync]")) { syncNow({ reason: "manual", force: true }); return; }
    if (target.closest("[data-cloud-backup]")) {
      if (global.ETHONEBackupManager && typeof global.ETHONEBackupManager.create === "function") {
        global.ETHONEBackupManager.create("ETHONE Cloud backup", { cloud: true });
      } else {
        syncNow({ reason: "cloud backup", force: true });
      }
      return;
    }
    if (target.closest("[data-cloud-restore-latest]")) { applyPayload(latest()); return; }
    if (target.closest("[data-cloud-enabled]")) { setEnabled(readStore().enabled === false); return; }
    if (target.closest("[data-cloud-export]")) { exportLatest(); return; }
    var rollbackButton = target.closest("[data-cloud-rollback]");
    if (rollbackButton) { rollback(rollbackButton.dataset.cloudRollback); return; }
    var keepLocal = target.closest("[data-cloud-keep-local]");
    if (keepLocal) { resolveConflict(keepLocal.dataset.cloudKeepLocal, "local"); return; }
    var keepRemote = target.closest("[data-cloud-keep-remote]");
    if (keepRemote) { resolveConflict(keepRemote.dataset.cloudKeepRemote, "remote"); return; }
  }

  function handleChange(event) {
    if (event.target && event.target.matches("[data-cloud-background]")) {
      setBackground(event.target.checked);
    }
  }

  function wrapSettings() {
    if (typeof global.switchSettingsTab !== "function" || global.switchSettingsTab.__ethoneCloudWrapped) return;
    var old = global.switchSettingsTab;
    global.switchSettingsTab = function ethoneCloudSettingsSwitch(tab, element) {
      var out = old.apply(this, arguments);
      if (tab === "cloud") setTimeout(render, 40);
      return out;
    };
    global.switchSettingsTab.__ethoneCloudWrapped = true;
  }

  function ensureSettingsEntry() {
    var page = document.getElementById("page-settings");
    if (!page) return;
    var nav = page.querySelector(".settings-nav");
    var content = page.querySelector(".settings-content");
    if (nav && !nav.querySelector('[data-settings-tab="cloud"], .settings-nav-item[onclick*="cloud"]')) {
      var button = document.createElement("button");
      button.className = "settings-nav-item";
      button.type = "button";
      button.setAttribute("data-settings-tab", "cloud");
      button.setAttribute("onclick", "switchSettingsTab('cloud',this)");
      button.innerHTML = '<span class="settings-nav-icon"><i data-lucide="cloud-cog"></i></span><span>ETHONE Cloud</span>';
      var backup = nav.querySelector('[data-settings-tab="backup"], .settings-nav-item[onclick*="backup"]');
      if (backup && backup.parentNode) backup.parentNode.insertBefore(button, backup.nextSibling);
      else nav.appendChild(button);
      refreshIcons(button);
    }
    if (content && !document.getElementById("settings-cloud")) {
      var section = document.createElement("div");
      section.className = "settings-section";
      section.id = "settings-cloud";
      section.innerHTML = '<div class="settings-card"><div class="settings-card-title">ETHONE Cloud</div><div style="font-size:12px;color:var(--muted2)">Synchronization is initializing...</div></div>';
      var backupSection = document.getElementById("settings-backup");
      if (backupSection && backupSection.parentNode === content) content.insertBefore(section, backupSection.nextSibling);
      else content.appendChild(section);
    }
  }

  function registerActions() {
    var Actions = global.ACTION_REGISTRY || global.ETHONEActions || (global.Ethone && global.Ethone.get && global.Ethone.get("actions"));
    if (!Actions || !Actions.register || global.__ethoneCloudActions) return;
    global.__ethoneCloudActions = true;
    Actions.register("cloud.open", { label: "Open ETHONE Cloud", handler: function () {
      if (typeof global.switchPage === "function") global.switchPage("settings");
      setTimeout(function () {
        var button = document.querySelector('[data-settings-tab="cloud"], .settings-nav-item[onclick*="cloud"]');
        if (typeof global.switchSettingsTab === "function") global.switchSettingsTab("cloud", button || null);
        render();
      }, 90);
      return true;
    } });
    Actions.register("cloud.syncNow", { label: "Sync ETHONE Cloud", handler: function () { syncNow({ reason: "action", force: true }); return true; } });
    Actions.register("cloud.restoreLatest", { label: "Restore latest ETHONE Cloud snapshot", handler: function () { return applyPayload(latest()); } });
    Actions.register("cloud.rollback", { label: "Rollback ETHONE Cloud", handler: function () { return rollback(); } });
  }

  function bind() {
    ensureSettingsEntry();
    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
    wrapSaveState();
    wrapSettings();
    registerActions();
    startBackground();
    [
      "ethone:dashboard-ready", "ethone:workspace-change", "ethone:workspace-update",
      "ethone:space-change", "ethone:space-update", "ethone:settings-change",
      "ethone:theme-change", "ethone:page-ready", "ethone:timeline"
    ].forEach(function (name) {
      global.addEventListener(name, function () {
        if (name === "ethone:page-ready") render();
        scheduleSync(name.replace("ethone:", ""));
      });
    });
    global.addEventListener("online", function () { syncNow({ reason: "online", quiet: true }); });
    global.addEventListener("storage", function (event) {
      if (!event || !event.key) return;
      Object.keys(LOCAL_PREFIXES).some(function (domain) {
        if (shouldCaptureLocalKey(event.key, domain)) {
          scheduleSync("local storage");
          return true;
        }
        return false;
      });
    });
    setTimeout(function () {
      wrapSaveState();
      wrapSettings();
      registerActions();
      render();
      scheduleSync("startup");
    }, 1200);
  }

  global.ETHONECloud = {
    sync: syncNow,
    schedule: scheduleSync,
    latest: latest,
    history: history,
    conflicts: conflicts,
    restore: applyPayload,
    rollback: rollback,
    resolveConflict: resolveConflict,
    capture: capturePayload,
    setEnabled: setEnabled,
    setBackground: setBackground,
    render: render,
    status: function () {
      var store = readStore();
      return {
        enabled: store.enabled !== false,
        background: store.background !== false,
        status: statusText(),
        lastSyncAt: store.lastSyncAt || "",
        conflicts: conflicts().length,
        history: history().length
      };
    },
    domains: DOMAINS.slice()
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})(window);
