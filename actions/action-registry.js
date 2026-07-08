/*
 * ETHONE Central Action Registry.
 * All product-level UI commands should go through this facade instead of
 * redirecting ad-hoc from random buttons. Unknown actions never fall back to
 * Tasks; they show a clear unavailable message and stop.
 */
(function initEthoneActionRegistry(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("actions")) return;

  var registry = Object.create(null);
  var aliases = Object.create(null);
  var delegated = false;

  var PAGE_ALIASES = {
    timeline: "activity",
    tasks: "todos",
    todo: "todos",
    brain: "ai",
    ethoneai: "ai",
    marketplace: "marketplace",
    focus: "dashboard",
    pomodoro: "dashboard"
  };

  function normalizeId(id) {
    return String(id || "").trim();
  }

  function resolveId(id) {
    var key = normalizeId(id);
    return aliases[key] || key;
  }

  function language() {
    try {
      var lang = app.get("language");
      return lang && typeof lang.current === "function" ? lang.current() : (global._lang || "fr");
    } catch (e) {
      return "fr";
    }
  }

  function text(map, fallback) {
    var l = language();
    return map[l] || map.en || fallback;
  }

  function toast(message, type) {
    try {
      if (typeof global.toast === "function") {
        global.toast(message, type || "info");
        return;
      }
      var notifications = app.get("notifications");
      if (notifications && typeof notifications.toast === "function") {
        notifications.toast(message, type || "info");
        return;
      }
    } catch (e) {}
    console[type === "error" ? "error" : "warn"]("[ETHONE action]", message);
  }

  function unavailableMessage() {
    return text({
      fr: "Fonctionnalite bientot disponible",
      en: "Feature coming soon",
      es: "Funcion disponible pronto",
      de: "Funktion bald verfugbar"
    }, "Feature coming soon");
  }

  function failedMessage() {
    return text({
      fr: "Action indisponible pour le moment",
      en: "Action unavailable right now",
      es: "Accion no disponible ahora",
      de: "Aktion momentan nicht verfugbar"
    }, "Action unavailable right now");
  }

  function register(id, descriptor) {
    id = normalizeId(id);
    if (!id) return false;
    if (typeof descriptor === "function") descriptor = { handler: descriptor };
    if (!descriptor || typeof descriptor.handler !== "function") {
      console.warn("[ETHONE actions] Invalid action descriptor:", id);
      return false;
    }
    registry[id] = Object.assign({ id: id, enabled: true }, descriptor);
    return true;
  }

  function registerAlias(alias, target) {
    alias = normalizeId(alias);
    target = normalizeId(target);
    if (!alias || !target) return false;
    aliases[alias] = target;
    return true;
  }

  function get(id) {
    return registry[resolveId(id)] || null;
  }

  function has(id) {
    return !!get(id);
  }

  function isEnabled(id, context) {
    var d = get(id);
    if (!d) return false;
    if (typeof d.enabled === "function") {
      try { return !!d.enabled(context || {}); } catch (e) { return false; }
    }
    return d.enabled !== false;
  }

  function setEnabled(id, enabled, reason) {
    var d = get(id);
    if (!d) return false;
    d.enabled = enabled !== false;
    d.disabledReason = reason || "";
    return true;
  }

  function dispatch(id, context) {
    id = resolveId(id);
    var d = registry[id];
    var ctx = Object.assign({ actionId: id, source: "action-registry" }, context || {});
    if (!d) {
      console.warn("[ETHONE actions] Unknown action id:", id, ctx);
      toast(unavailableMessage(), "info");
      return false;
    }
    if (!isEnabled(id, ctx)) {
      toast(d.disabledReason || d.unavailableMessage || unavailableMessage(), "info");
      return false;
    }
    try {
      var result = d.handler(ctx);
      if (result && typeof result.then === "function") {
        result.catch(function (error) {
          console.error("[ETHONE actions] Async action failed:", id, error);
          toast(failedMessage(), "error");
        });
      }
      return true;
    } catch (error) {
      console.error("[ETHONE actions] Action failed:", id, error);
      toast(failedMessage(), "error");
      return false;
    }
  }

  function pageExists(page) {
    return !!document.getElementById("page-" + page);
  }

  function normalizePage(page) {
    page = String(page || "").trim();
    return PAGE_ALIASES[page] || page;
  }

  function openPage(page, source) {
    page = normalizePage(page);
    if (!page || !pageExists(page)) {
      console.warn("[ETHONE actions] Unknown page:", page);
      toast(unavailableMessage(), "info");
      return false;
    }
    try {
      var navigation = app.get("navigation");
      if (navigation && typeof navigation.go === "function") return navigation.go(page, source || null);
    } catch (e) {}
    if (typeof global.switchPage === "function") {
      global.switchPage(page, source || null);
      return true;
    }
    toast(failedMessage(), "error");
    return false;
  }

  function openSettingsTab(tab) {
    openPage("settings", null);
    if (!tab) return true;
    setTimeout(function () {
      var btn = document.querySelector(".settings-nav-item[onclick*=\"'" + tab + "'\"],.settings-nav-item[data-settings-tab=\"" + tab + "\"]");
      if (btn && typeof global.switchSettingsTab === "function") global.switchSettingsTab(tab, btn);
    }, 80);
    return true;
  }

  function focusPomodoro() {
    openPage("dashboard", null);
    setTimeout(function () {
      var target = document.getElementById("pomodoro-panel") || document.getElementById("pomo-play-btn");
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "center" });
      if (target && typeof target.focus === "function") target.focus({ preventScroll: true });
    }, 100);
    return true;
  }

  function profileSwitch() {
    if (typeof global.goToProfileScreen === "function") {
      global.goToProfileScreen();
      return true;
    }
    toast(failedMessage(), "error");
    return false;
  }

  function widgetsPanel(open) {
    if (typeof global.toggleLivePanel === "function") {
      global.toggleLivePanel(open);
      return true;
    }
    return openPage("connections", null);
  }

  function openSpaceSwitcher() {
    var btn = document.querySelector('[data-space-action="open"],.space-switcher-button,[data-v4-action-id="dashboard.workspace.toggle"],.d4-workspace,#os-sidebar-workspace');
    if (btn && typeof btn.click === "function") {
      btn.click();
      return true;
    }
    return openSettingsTab("workspaces");
  }

  function bind(root) {
    root = root || document;
    if (delegated && root === document) return;
    if (root === document) delegated = true;
    root.addEventListener("click", function (event) {
      var el = event.target && event.target.closest && event.target.closest("[data-action-id],[data-ethone-action],[data-action]");
      if (!el) return;
      var id = el.dataset.actionId || el.dataset.ethoneAction || "";
      if (!id && el.dataset.action && (el.dataset.action.indexOf(".") > -1 || has(el.dataset.action))) id = el.dataset.action;
      if (!id) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dispatch(id, {
        el: el,
        event: event,
        source: "dom",
        page: el.dataset.actionPage || el.dataset.page || "",
        tab: el.dataset.actionTab || el.dataset.settingsTab || ""
      });
    }, true);
  }

  function annotateKnownControls() {
    var pairs = [
      ["#notif-bell-btn", "notifications.open"],
      ["#global-search", "command.open"],
      [".search-bar", "command.open"],
      ["#live-panel-toggle-btn", "widgets.open"],
      ["#live-panel-retract-btn", "widgets.open"],
      ["#live-panel-add-btn", "widgets.add"],
      ["#live-panel-manage-btn", "widgets.manage"],
      ["#topbar-profile-btn", "profile.switch"],
      ["#mob-topbar-avatar", "profile.switch"],
      ["#mob-topbar-name", "profile.switch"]
    ];
    pairs.forEach(function (pair) {
      document.querySelectorAll(pair[0]).forEach(function (el) {
        if (!el.dataset.actionId) el.dataset.actionId = pair[1];
      });
    });
  }

  var api = {
    register: register,
    registerAlias: registerAlias,
    dispatch: dispatch,
    run: dispatch,
    execute: dispatch,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    enable: function (id) { return setEnabled(id, true); },
    disable: function (id, reason) { return setEnabled(id, false, reason); },
    has: has,
    get: get,
    bind: bind,
    openPage: openPage,
    toastUnavailable: function () { toast(unavailableMessage(), "info"); }
  };

  app.define("actions", Object.freeze(api));
  global.ACTION_REGISTRY = api;
  global.ETHONEActions = api;
  global.runAction = function (id, context) { return dispatch(id, context); };

  register("navigation.open", { label: "Open page", handler: function (ctx) {
    var navEl = ctx.el && ctx.el.classList && ctx.el.classList.contains("nav-item") ? ctx.el : null;
    return openPage(ctx.page, navEl);
  } });
  [
    "dashboard", "files", "notes", "todos", "tasks", "kanban", "calendar", "habits", "goals",
    "journal", "countdown", "stats", "activity", "health", "versions", "studio", "marketplace",
    "github", "gaming", "valorant-accounts", "databases", "import", "connections", "settings", "ai"
  ].forEach(function (page) {
    var canonical = normalizePage(page);
    register(page + ".open", { label: page, handler: function () { return openPage(canonical, null); } });
    registerAlias("page." + page + ".open", page + ".open");
  });

  registerAlias("brain.open", "ai.open");
  registerAlias("marketplace.open", "marketplace.open");
  registerAlias("settings.open", "settings.open");

  register("notes.new", { label: "New note", handler: function () {
    openPage("notes", null);
    setTimeout(function () {
      if (typeof global.newNote === "function") global.newNote();
      else toast(unavailableMessage(), "info");
    }, 80);
  } });
  register("tasks.new", { label: "New task", handler: function () {
    openPage("todos", null);
    setTimeout(function () {
      if (typeof global.openModal === "function") global.openModal("add-todo");
      else toast(unavailableMessage(), "info");
    }, 80);
  } });
  register("files.new", { label: "New file", handler: function () {
    openPage("files", null);
    setTimeout(function () {
      if (typeof global.openModal === "function") global.openModal("add-item");
      else toast(unavailableMessage(), "info");
    }, 80);
  } });
  register("calendar.new", { label: "New event", handler: function () {
    openPage("calendar", null);
    setTimeout(function () {
      if (typeof global.openModal === "function") global.openModal("add-event");
      else toast(unavailableMessage(), "info");
    }, 80);
  } });
  register("focus.continue", { label: "Continue focus", handler: focusPomodoro });
  register("profile.switch", { label: "Switch profile", handler: profileSwitch });
  register("widgets.open", { label: "Widgets", handler: function () { return widgetsPanel(); } });
  register("widgets.add", { label: "Add widget", handler: function () {
    if (typeof global.openLivePanelAddPicker === "function") return global.openLivePanelAddPicker();
    return widgetsPanel(true);
  } });
  register("widgets.manage", { label: "Manage widgets", handler: function () {
    if (typeof global.openLivePanelManager === "function") return global.openLivePanelManager();
    return widgetsPanel(true);
  } });
  register("widgets.builder.open", { label: "Widget Builder", handler: function () {
    if (global.ETHONEWidgetBuilder && typeof global.ETHONEWidgetBuilder.open === "function") return global.ETHONEWidgetBuilder.open();
    toast(unavailableMessage(), "info");
  } });
  register("command.open", { label: "Command palette", handler: function () {
    if (typeof global.openCmdPalette === "function") global.openCmdPalette();
    else toast(unavailableMessage(), "info");
  } });
  register("notifications.open", { label: "Notifications", handler: function () {
    if (typeof global.toggleNotifPanel === "function") return global.toggleNotifPanel();
    var n = app.get("notifications");
    if (n && typeof n.toggle === "function") return n.toggle();
    toast(unavailableMessage(), "info");
  } });
  register("settings.tab.open", { label: "Open settings tab", handler: function (ctx) { return openSettingsTab(ctx.tab || "profilee"); } });
  register("spaces.open", { label: "Workspaces", handler: openSpaceSwitcher });
  register("appLibrary.open", { label: "App Library", handler: function () {
    if (global.ETHONEAppLibrary && typeof global.ETHONEAppLibrary.open === "function") return global.ETHONEAppLibrary.open();
    toast(unavailableMessage(), "info");
  } });
  register("universe.open", { label: "Universe", handler: function () {
    if (global.ETHONEUniverse && typeof global.ETHONEUniverse.open === "function") return global.ETHONEUniverse.open();
    toast(unavailableMessage(), "info");
  } });
  register("briefing.open", { label: "Morning briefing", handler: function () {
    if (global.ETHONEMorningBriefing && typeof global.ETHONEMorningBriefing.open === "function") return global.ETHONEMorningBriefing.open();
    toast(unavailableMessage(), "info");
  } });
  register("achievements.open", { label: "Achievements", handler: function () {
    openSettingsTab("profilee");
    setTimeout(function () {
      if (global.ETHONEAchievements && typeof global.ETHONEAchievements.evaluate === "function") global.ETHONEAchievements.evaluate();
      var panel = document.getElementById("achievements-panel");
      if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 160);
  } });
  register("theme.open", { label: "Theme settings", handler: function () { return openSettingsTab("theme"); } });
  register("theme.toggle", { label: "Toggle theme", handler: function () {
    if (typeof global.toggleDarkLight === "function") return global.toggleDarkLight();
    return openSettingsTab("theme");
  } });

  document.addEventListener("DOMContentLoaded", function () {
    bind(document);
    annotateKnownControls();
  });
  if (document.readyState !== "loading") {
    bind(document);
    annotateKnownControls();
  }
})(window);
