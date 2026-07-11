/* ETHONE Lazy Modules
   Keeps boot minimal. Heavy/experimental modules are loaded only when opened. */
(function () {
  "use strict";
  if (window.ETHONELazyModules && document.documentElement.__ethoneLazyModules) return;
  document.documentElement.dataset.ethoneLazyModules = "initializing";
  try { window.__ethoneLazyModules = true; } catch (error) {}

  var loadedGroups = Object.create(null);
  var loadingGroups = Object.create(null);
  var pageLoadState = Object.create(null);
  var disabledNotified = Object.create(null);
  var pendingResources = typeof WeakMap === "function" ? new WeakMap() : null;
  var PAGE_GROUPS = {
    dashboard: ["dashboard"],
    ai: ["ai"],
    files: ["files"],
    notes: ["notes"],
    todos: ["tasks"],
    tasks: ["tasks"],
    goals: ["goals"],
    journal: ["journal"],
    countdown: ["countdown"],
    github: ["github"],
    stats: ["stats"],
    habits: ["habits"],
    kanban: ["kanban"],
    calendar: ["calendar"],
    settings: ["settings"],
    marketplace: ["marketplace"],
    store: ["marketplace"],
    "widget-marketplace": ["marketplace", "widgets"],
    studio: ["studio"],
    automation: ["automation"],
    "automation-builder": ["automation"],
    import: ["import"],
    health: ["health"],
    versions: ["versions"],
    activity: ["activity"],
    connections: ["connections"],
    gaming: ["gaming"],
    "valorant-accounts": ["gaming"],
    databases: ["databases"],
    spaces: ["spaces"]
  };
  var SETTINGS_GROUPS = {
    brain: ["ai"],
    marketplace: ["marketplace"],
    plugins: ["plugins"],
    automation: ["automation"],
    widgets: ["widgets"],
    integrations: ["connections"],
    developer: ["settings-advanced"],
    experimental: ["settings-advanced"],
    theme: ["settings-advanced"]
  };
  var EXPERIMENTAL_SETTINGS_TABS = {
    experimental: true
  };
  var EXPERIMENTAL_GROUPS = {
    "shell-experimental": true,
    desktop: true,
    "mission-control": true,
    flows: true,
    "smart-layouts": true,
    universe: true,
    "app-library": true,
    "morning-briefing": true,
    achievements: true,
    "time-machine": true,
    studio: true,
    automation: true
  };
  var STABLE_ON_DEMAND_GROUPS = {
    desktop: true,
    "mission-control": true,
    flows: true
  };
  var LAZY_FUNCTION_GROUPS = {
    editDailyFocus: "dashboard",
    toggleDailyFocusDone: "dashboard",
    togglePomoSound: "dashboard",
    pomoSelectMode: "dashboard",
    pomoReset: "dashboard",
    pomoToggle: "dashboard",
    pomoSkip: "dashboard",
    fetchWeather: "dashboard",
    fetchQuote: "dashboard",
    addPinnedLink: "dashboard"
  };

  function qsa(selector, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
    catch (error) { return []; }
  }

  function scriptsForGroup(group) {
    return qsa('script[type="application/ethone-lazy"][data-src][data-ethone-lazy-group~="' + group + '"]');
  }

  function stylesForGroup(group) {
    return qsa('link[data-href][data-ethone-lazy-style-group~="' + group + '"]');
  }

  function toast(message, type) {
    if (typeof window.toast === "function") {
      try { window.toast(message, type || "info"); return; } catch (error) {}
    }
    if (type === "error") console.warn("[ETHONE lazy]", message);
  }

  function experimentalEnabled() {
    try {
      if (new URLSearchParams(location.search || "").get("experimental") === "1") return true;
      return localStorage.getItem("ethone:experimental-enabled") === "1";
    } catch (error) {
      return false;
    }
  }

  function isGroupEnabled(group) {
    if (STABLE_ON_DEMAND_GROUPS[group]) return true;
    return !EXPERIMENTAL_GROUPS[group] || experimentalEnabled();
  }

  function notifyDisabled(group) {
    if (disabledNotified[group]) return;
    disabledNotified[group] = true;
    toast("Module experimental desactive en mode production.", "info");
  }

  function bootStatus(name,status,extra) {
    try {
      var boot = window.ETHONEBootManager;
      if (boot && typeof boot.setStatus === "function") boot.setStatus(name, status, extra || {});
    } catch (error) {}
  }

  function appendScript(template) {
    if (!template || template.dataset.ethoneLazyLoaded === "1") return Promise.resolve();
    if (pendingResources && pendingResources.has(template)) return pendingResources.get(template);
    var promise = new Promise(function (resolve) {
      if (!template || template.dataset.ethoneLazyLoaded === "1") return resolve();
      var src = template.dataset.src;
      if (!src) return resolve();
      var started = Date.now();
      var moduleName = template.id || src;
      bootStatus(moduleName, "waiting", { src: src });
      template.dataset.ethoneLazyActivating = "1";
      var script = document.createElement("script");
      // Dynamically inserted scripts with async=false are fetched together but
      // still execute in insertion order, preserving legacy dependencies.
      script.async = false;
      script.src = src;
      script.id = (template.id || "ethone-lazy-script") + "-loaded";
      script.dataset.ethoneLazyLoadedFrom = template.id || "";
      script.onload = function () {
        template.dataset.ethoneLazyLoaded = "1";
        delete template.dataset.ethoneLazyActivating;
        if (window.ETHONEBootPerf && typeof window.ETHONEBootPerf.recordModule === "function") {
          window.ETHONEBootPerf.recordModule(moduleName, Date.now() - started);
        }
        bootStatus(moduleName, "loaded", { src: src, duration: Date.now() - started });
        resolve();
      };
      script.onerror = function () {
        template.dataset.ethoneLazyError = "1";
        delete template.dataset.ethoneLazyActivating;
        bootStatus(moduleName, "failed", { src: src, duration: Date.now() - started, error: "Script load failed" });
        toast("Module indisponible: " + (template.id || src), "error");
        resolve();
      };
      document.head.appendChild(script);
    });
    if (pendingResources) pendingResources.set(template, promise);
    return promise;
  }

  function appendStyle(template) {
    if (!template || template.dataset.ethoneLazyLoaded === "1") return Promise.resolve();
    if (pendingResources && pendingResources.has(template)) return pendingResources.get(template);
    var promise = new Promise(function (resolve) {
      if (!template || template.dataset.ethoneLazyLoaded === "1") return resolve();
      var href = template.dataset.href;
      if (!href) return resolve();
      var started = Date.now();
      var moduleName = template.id || href;
      bootStatus(moduleName, "waiting", { src: href, kind: "style" });
      template.dataset.ethoneLazyActivating = "1";
      template.onload = function () {
        template.dataset.ethoneLazyLoaded = "1";
        delete template.dataset.ethoneLazyActivating;
        bootStatus(moduleName, "loaded", { src: href, kind: "style", duration: Date.now() - started });
        resolve();
      };
      template.onerror = function () {
        template.dataset.ethoneLazyError = "1";
        delete template.dataset.ethoneLazyActivating;
        bootStatus(moduleName, "failed", { src: href, kind: "style", duration: Date.now() - started, error: "Stylesheet load failed" });
        resolve();
      };
      // Activate the existing link in place so the original cascade order is
      // preserved. Appending lazy styles to <head> made page CSS override the
      // global release/design-system layers after navigation.
      template.href = href;
    });
    if (pendingResources) pendingResources.set(template, promise);
    return promise;
  }

  function loadGroup(group) {
    if (!group) return Promise.resolve(true);
    if (!isGroupEnabled(group)) {
      bootStatus("lazy:" + group, "disabled", { reason: "stable-production-mode" });
      notifyDisabled(group);
      return Promise.resolve(false);
    }
    if (loadedGroups[group]) return Promise.resolve(true);
    if (loadingGroups[group]) return loadingGroups[group];
    var styles = stylesForGroup(group).filter(function (style) { return style.dataset.ethoneLazyLoaded !== "1"; });
    var scripts = scriptsForGroup(group).filter(function (script) { return script.dataset.ethoneLazyLoaded !== "1"; });
    if (!styles.length && !scripts.length) {
      loadedGroups[group] = true;
      bootStatus("lazy:" + group, "loaded", { duration: 0 });
      return Promise.resolve(true);
    }
    bootStatus("lazy:" + group, "waiting", { count: scripts.length + styles.length, scripts: scripts.length, styles: styles.length });
    var styleBatch = Promise.all(styles.map(appendStyle));
    loadingGroups[group] = styleBatch.then(function () {
      return Promise.all(scripts.map(appendScript));
    }).then(function () {
      loadedGroups[group] = true;
      delete loadingGroups[group];
      bootStatus("lazy:" + group, "loaded", { count: scripts.length + styles.length, scripts: scripts.length, styles: styles.length });
      try { window.dispatchEvent(new CustomEvent("ethone:lazy-group-loaded", { detail: { group: group } })); } catch (error) {}
      return true;
    });
    return loadingGroups[group];
  }

  function loadGroups(groups) {
    groups = Array.isArray(groups) ? groups : [groups];
    return groups.reduce(function (promise, group) {
      return promise.then(function () { return loadGroup(group); });
    }, Promise.resolve());
  }

  function installFunctionProxies() {
    Object.keys(LAZY_FUNCTION_GROUPS).forEach(function (name) {
      if (typeof window[name] === "function") return;
      var group = LAZY_FUNCTION_GROUPS[name];
      var proxy = function () {
        var args = Array.prototype.slice.call(arguments);
        var thisArg = this;
        return loadGroup(group).then(function (loaded) {
          var real = window[name];
          if (loaded && typeof real === "function" && real !== proxy) return real.apply(thisArg, args);
          toast("Module en cours de chargement. Reessaie dans un instant.", "info");
          return false;
        });
      };
      proxy.__ethoneLazyProxy = true;
      window[name] = proxy;
    });
  }

  function renderPage(page) {
    try {
      if (page === "ai" && typeof window.initAIChat === "function") window.initAIChat();
      if (page === "files" && typeof window.renderItems === "function") window.renderItems();
      if (page === "notes" && typeof window.initNotes === "function") window.initNotes();
      if ((page === "todos" || page === "tasks") && typeof window.renderTodos === "function") window.renderTodos();
      if (page === "goals" && typeof window.renderGoals === "function") window.renderGoals();
      if (page === "journal" && typeof window.renderJournal === "function") window.renderJournal();
      if (page === "countdown" && typeof window.renderCountdowns === "function") window.renderCountdowns();
      if (page === "github" && typeof window.refreshGithub === "function") window.refreshGithub();
      if (page === "stats" && typeof window.renderStatsPage === "function") window.renderStatsPage();
      if (page === "habits" && typeof window.renderHabits === "function") window.renderHabits();
      if (page === "kanban" && typeof window.renderKanban === "function") window.renderKanban();
      if (page === "calendar" && typeof window.renderCalendar === "function") window.renderCalendar();
      if (page === "marketplace" && typeof window.renderMarketplacePage === "function") window.renderMarketplacePage();
      if (page === "studio" && typeof window.renderStudioPage === "function") window.renderStudioPage();
      if (page === "import" && typeof window.renderImportAssistant === "function") window.renderImportAssistant();
      if (page === "health" && typeof window.renderHealthPage === "function") window.renderHealthPage();
      if (page === "versions" && typeof window.renderVersionHistoryPage === "function") window.renderVersionHistoryPage();
      if (page === "activity" && typeof window.renderActivityPage === "function") window.renderActivityPage();
      if (page === "connections" && typeof window.loadConnectionsUI === "function") window.loadConnectionsUI();
      if (page === "gaming" && typeof window.loadGamingUI === "function") window.loadGamingUI();
      if (page === "databases" && typeof window.renderDatabasesHome === "function") window.renderDatabasesHome();
      if (page === "valorant-accounts" && typeof window.vaRender === "function") window.vaRender();
      if (page === "settings" && typeof window.switchSettingsTab === "function") {
        var active = document.querySelector(".settings-nav-item.active");
        var tab = active && active.dataset ? active.dataset.settingsTab : "general";
        // Re-rendering the already selected tab after a lazy group loads is a
        // technical refresh, not a user navigation. In particular, it must
        // not scroll the mobile Settings page past its category list.
        window.switchSettingsTab(tab || "general", active || null, { reveal: false, source: "lazy-render" });
      }
    } catch (error) {
      console.warn("[ETHONE lazy] render after lazy load failed:", page, error);
    }
  }

  function loadForPage(page) {
    page = String(page || "").trim();
    var groups = PAGE_GROUPS[page] || [];
    if (!groups.length) return Promise.resolve();
    if (groups.some(function (group) { return !isGroupEnabled(group); })) {
      groups.forEach(function (group) { if (!isGroupEnabled(group)) bootStatus("lazy:" + group, "disabled", { page: page, reason: "stable-production-mode" }); });
      notifyDisabled(groups.find(function (group) { return !isGroupEnabled(group); }) || page);
      return Promise.resolve(false);
    }
    var key = page + "|" + groups.join(",");
    var state = pageLoadState[key];
    var now = Date.now();
    if (state && state.promise && now - state.at < 750) return state.promise;
    var promise = loadGroups(groups).then(function () { renderPage(page); });
    pageLoadState[key] = { at: now, promise: promise };
    return promise;
  }

  function groupsForPage(page) {
    page = String(page || "").trim();
    return (PAGE_GROUPS[page] || []).slice();
  }

  function canLoadPage(page) {
    var groups = groupsForPage(page);
    return groups.length > 0 && groups.every(isGroupEnabled);
  }

  function wrapSettingsTabs() {
    if (wrapSettingsTabs.done || typeof window.switchSettingsTab !== "function") return;
    wrapSettingsTabs.done = true;
    var base = window.switchSettingsTab;
    window.switchSettingsTab = function (tab, el) {
      tab = String(tab || "");
      if (EXPERIMENTAL_SETTINGS_TABS[tab] && !experimentalEnabled()) {
        notifyDisabled("settings:" + tab);
        return false;
      }
      var result = base.apply(this, arguments);
      var groups = SETTINGS_GROUPS[tab] || [];
      if (groups.length) loadGroups(groups).then(function () {
        try { base.call(window, tab, el); } catch (error) {}
      });
      return result;
    };
  }

  function registerActions() {
    try {
      var A = window.ACTION_REGISTRY || window.ETHONEActions || (window.Ethone && window.Ethone.get && window.Ethone.get("actions"));
      if (!A || typeof A.register !== "function") return;
      if (registerActions.done) return;
      registerActions.done = true;
      A.register("brainos.command.open", {
        label: "Brain OS Command Center",
        handler: function () {
          loadGroups(["ai", "brain-os"]).then(function () {
            if (window.ETHONEBrainOSV5 && typeof window.ETHONEBrainOSV5.open === "function") window.ETHONEBrainOSV5.open();
            else if (typeof window.switchPage === "function") window.switchPage("ai");
          });
        }
      });
      var openMissionControl = function () {
        if (!isGroupEnabled("mission-control")) {
          notifyDisabled("mission-control");
          return false;
        }
        loadGroup("mission-control").then(function () {
          if (window.ETHONEMissionControl && typeof window.ETHONEMissionControl.open === "function") window.ETHONEMissionControl.open();
        });
        return true;
      };
      A.register("missionControl.open", { label: "Mission Control", handler: openMissionControl });
      A.register("mission.open", { label: "Mission Control", handler: openMissionControl });
      A.register("flow.open", {
        label: "ETHONE Flow",
        handler: function () {
          if (!isGroupEnabled("flows")) {
            notifyDisabled("flows");
            return false;
          }
          loadGroups(["flows"]).then(function () {
            if (window.ETHONEFlow && typeof window.ETHONEFlow.open === "function") window.ETHONEFlow.open();
          });
        }
      });
      A.register("spaces.open", {
        label: "Spaces",
        handler: function () {
          loadGroup("spaces").then(function () {
            if (window.ETHONESpacesUI && typeof window.ETHONESpacesUI.open === "function") {
              window.ETHONESpacesUI.open();
            } else if (typeof window.switchPage === "function") {
              window.switchPage("spaces");
            }
          }).catch(function () {
            notifyDisabled("spaces");
          });
          return true;
        }
      });
    } catch (error) {}
  }

  function bindNavigation() {
    window.addEventListener("ethone:page-ready", function (event) {
      var page = event && event.detail && event.detail.page;
      if (page) loadForPage(page);
    });
    if (typeof window.ethoneAddSwitchPageHook === "function") {
      window.ethoneAddSwitchPageHook("lazy-modules", function (page) { loadForPage(page); });
    }
    document.addEventListener("keydown", function (event) {
      var inspectorCombo = (event.ctrlKey || event.metaKey) && event.shiftKey && String(event.key || "").toLowerCase() === "i";
      if (inspectorCombo) {
        var inspectorTarget = event.target;
        if (inspectorTarget && /INPUT|TEXTAREA|SELECT/.test(inspectorTarget.tagName)) return;
        event.preventDefault();
        if (typeof window.runAction === "function") {
          window.runAction("inspector.open", { source: "keyboard" });
          return;
        }
        loadGroup("developer-inspector").then(function () {
          if (window.ETHONEInspector && typeof window.ETHONEInspector.open === "function") window.ETHONEInspector.open();
        });
        return;
      }
      var missionCombo = event.key === "F2" || ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === "Space" || event.key === " "));
      if (!missionCombo) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!(event.ctrlKey || event.metaKey) && !isGroupEnabled("mission-control")) {
        notifyDisabled("mission-control");
        return;
      }
      loadGroup("mission-control").then(function () {
        if (window.ETHONEMissionControl && typeof window.ETHONEMissionControl.open === "function") window.ETHONEMissionControl.open();
      });
    }, true);
  }

  function boot() {
    installFunctionProxies();
    wrapSettingsTabs();
    registerActions();
    bindNavigation();
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };
    idle(registerActions, { timeout: 700 });
    idle(wrapSettingsTabs, { timeout: 700 });
  }

  var api = {
    load: loadGroup,
    loadGroups: loadGroups,
    loadForPage: loadForPage,
    groupsForPage: groupsForPage,
    canLoadPage: canLoadPage,
    loaded: function (group) { return !!loadedGroups[group]; }
  };
  try { window.ETHONELazyModules = api; } catch (error) {}
  try {
    if (window.Ethone && typeof window.Ethone.define === "function") window.Ethone.define("lazyModules", api);
  } catch (error) {}
  try { document.documentElement.__ethoneLazyModules = api; } catch (error) {}
  try { document.documentElement.dataset.ethoneLazyModules = "ready"; } catch (error) {}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
