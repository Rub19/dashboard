/* ETHONE Lazy Modules
   Keeps boot minimal. Heavy/experimental modules are loaded only when opened. */
(function () {
  "use strict";
  if (document.documentElement.dataset.ethoneLazyModules === "ready") return;
  document.documentElement.dataset.ethoneLazyModules = "ready";
  try { window.__ethoneLazyModules = true; } catch (error) {}

  var loadedGroups = Object.create(null);
  var loadingGroups = Object.create(null);
  var PAGE_GROUPS = {
    ai: ["ai"],
    marketplace: ["marketplace"],
    store: ["marketplace"],
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

  function qsa(selector, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
    catch (error) { return []; }
  }

  function scriptsForGroup(group) {
    return qsa('script[type="application/ethone-lazy"][data-src][data-ethone-lazy-group~="' + group + '"]');
  }

  function toast(message, type) {
    if (typeof window.toast === "function") {
      try { window.toast(message, type || "info"); return; } catch (error) {}
    }
    if (type === "error") console.warn("[ETHONE lazy]", message);
  }

  function appendScript(template) {
    return new Promise(function (resolve) {
      if (!template || template.dataset.ethoneLazyLoaded === "1") return resolve();
      var src = template.dataset.src;
      if (!src) return resolve();
      var started = Date.now();
      var script = document.createElement("script");
      script.async = false;
      script.src = src;
      script.id = (template.id || "ethone-lazy-script") + "-loaded";
      script.dataset.ethoneLazyLoadedFrom = template.id || "";
      script.onload = function () {
        template.dataset.ethoneLazyLoaded = "1";
        if (window.ETHONEBootPerf && typeof window.ETHONEBootPerf.recordModule === "function") {
          window.ETHONEBootPerf.recordModule(template.id || src, Date.now() - started);
        }
        resolve();
      };
      script.onerror = function () {
        template.dataset.ethoneLazyError = "1";
        toast("Module indisponible: " + (template.id || src), "error");
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  function loadGroup(group) {
    if (!group) return Promise.resolve();
    if (loadedGroups[group]) return Promise.resolve();
    if (loadingGroups[group]) return loadingGroups[group];
    var scripts = scriptsForGroup(group).filter(function (script) { return script.dataset.ethoneLazyLoaded !== "1"; });
    if (!scripts.length) {
      loadedGroups[group] = true;
      return Promise.resolve();
    }
    loadingGroups[group] = scripts.reduce(function (promise, script) {
      return promise.then(function () { return appendScript(script); });
    }, Promise.resolve()).then(function () {
      loadedGroups[group] = true;
      delete loadingGroups[group];
      try { window.dispatchEvent(new CustomEvent("ethone:lazy-group-loaded", { detail: { group: group } })); } catch (error) {}
    });
    return loadingGroups[group];
  }

  function loadGroups(groups) {
    groups = Array.isArray(groups) ? groups : [groups];
    return groups.reduce(function (promise, group) {
      return promise.then(function () { return loadGroup(group); });
    }, Promise.resolve());
  }

  function renderPage(page) {
    try {
      if (page === "ai" && typeof window.initAIChat === "function") window.initAIChat();
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
    } catch (error) {
      console.warn("[ETHONE lazy] render after lazy load failed:", page, error);
    }
  }

  function loadForPage(page) {
    var groups = PAGE_GROUPS[page] || [];
    if (!groups.length) return Promise.resolve();
    return loadGroups(groups).then(function () { renderPage(page); });
  }

  function wrapSettingsTabs() {
    if (wrapSettingsTabs.done || typeof window.switchSettingsTab !== "function") return;
    wrapSettingsTabs.done = true;
    var base = window.switchSettingsTab;
    window.switchSettingsTab = function (tab, el) {
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
      A.register("missionControl.open", {
        label: "Mission Control",
        handler: function () {
          loadGroup("mission-control").then(function () {
            if (window.ETHONEMissionControl && typeof window.ETHONEMissionControl.open === "function") window.ETHONEMissionControl.open();
          });
        }
      });
      A.register("flow.open", {
        label: "ETHONE Flow",
        handler: function () {
          loadGroups(["flows"]).then(function () {
            if (window.ETHONEFlow && typeof window.ETHONEFlow.open === "function") window.ETHONEFlow.open();
          });
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
      var missionCombo = event.key === "F2" || ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === "Space" || event.key === " "));
      if (!missionCombo) return;
      var target = event.target;
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
      event.preventDefault();
      if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
        loadGroups(["ai", "brain-os"]).then(function () {
          if (window.ETHONEBrainOSV5 && typeof window.ETHONEBrainOSV5.open === "function") window.ETHONEBrainOSV5.open();
        });
      } else {
        loadGroup("mission-control").then(function () {
          if (window.ETHONEMissionControl && typeof window.ETHONEMissionControl.open === "function") window.ETHONEMissionControl.open();
        });
      }
    }, true);
  }

  function boot() {
    wrapSettingsTabs();
    registerActions();
    bindNavigation();
    setTimeout(registerActions, 250);
    setTimeout(wrapSettingsTabs, 250);
  }

  var api = {
    load: loadGroup,
    loadGroups: loadGroups,
    loadForPage: loadForPage,
    loaded: function (group) { return !!loadedGroups[group]; }
  };
  try { window.ETHONELazyModules = api; } catch (error) {}
  try {
    if (window.Ethone && typeof window.Ethone.define === "function") window.Ethone.define("lazyModules", api);
  } catch (error) {}
  try { document.documentElement.__ethoneLazyModules = api; } catch (error) {}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
