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
  var EXPERIMENTAL_PAGES = {
    studio: true,
    automation: true,
    "automation-builder": true,
    spaces: true
  };
  var EXPERIMENTAL_ACTIONS = {
    "appLibrary.open": true,
    "universe.open": true,
    "briefing.open": true,
    "achievements.open": true,
    "widgets.builder.open": true
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

  function emit(name, detail) {
    try {
      global.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    } catch (e) {}
  }

  function unavailableMessage() {
    return text({
      fr: "Cette commande ne peut pas etre executee dans le contexte actuel",
      en: "This command cannot run in the current context",
      es: "Este comando no se puede ejecutar en el contexto actual",
      de: "Dieser Befehl kann im aktuellen Kontext nicht ausgefuhrt werden"
    }, "This command cannot run in the current context");
  }

  function productionDisabledMessage() {
    return text({
      fr: "Fonctionnalite desactivee en mode production",
      en: "Feature disabled in production mode",
      es: "Funcion desactivada en modo produccion",
      de: "Funktion im Produktionsmodus deaktiviert"
    }, "Feature disabled in production mode");
  }

  function failedMessage() {
    return text({
      fr: "Operation impossible pour le moment",
      en: "Operation could not be completed",
      es: "Operacion no completada",
      de: "Vorgang konnte nicht abgeschlossen werden"
    }, "Operation could not be completed");
  }

  function experimentalEnabled() {
    try {
      if (new URLSearchParams(global.location && global.location.search || "").get("experimental") === "1") return true;
      return global.localStorage && global.localStorage.getItem("ethone:experimental-enabled") === "1";
    } catch (e) {
      return false;
    }
  }

  function isExperimentalPage(page) {
    return !!EXPERIMENTAL_PAGES[normalizePage(page)];
  }

  function isExperimentalAction(id) {
    return !!EXPERIMENTAL_ACTIONS[resolveId(id)];
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
    if (isExperimentalAction(id) && !experimentalEnabled()) {
      emit("ethone:action-unavailable", { id: id, context: ctx, el: ctx.el || null, reason: "production-disabled" });
      toast(productionDisabledMessage(), "info");
      return false;
    }
    if (!d) {
      console.warn("[ETHONE actions] Unknown action id:", id, ctx);
      emit("ethone:action-unavailable", { id: id, context: ctx, el: ctx.el || null, reason: "unknown" });
      toast(unavailableMessage(), "info");
      return false;
    }
    if (!isEnabled(id, ctx)) {
      emit("ethone:action-unavailable", { id: id, context: ctx, el: ctx.el || null, reason: d.disabledReason || "disabled" });
      toast(d.disabledReason || d.unavailableMessage || unavailableMessage(), "info");
      return false;
    }
    emit("ethone:action-start", { id: id, context: ctx, el: ctx.el || null });
    try {
      var result = d.handler(ctx);
      if (result && typeof result.then === "function") {
        return result.then(function (value) {
          emit("ethone:action-complete", { id: id, context: ctx, el: ctx.el || null, result: value });
          return value === false ? false : true;
        }).catch(function (error) {
          console.error("[ETHONE actions] Async action failed:", id, error);
          emit("ethone:action-error", { id: id, context: ctx, el: ctx.el || null, error: error });
          toast(failedMessage(), "error");
          return false;
        });
      }
      emit("ethone:action-complete", { id: id, context: ctx, el: ctx.el || null, result: result });
      return result === false ? false : true;
    } catch (error) {
      console.error("[ETHONE actions] Action failed:", id, error);
      emit("ethone:action-error", { id: id, context: ctx, el: ctx.el || null, error: error });
      toast(failedMessage(), "error");
      return false;
    }
  }

  function pageExists(page) {
    return !!document.getElementById("page-" + page);
  }

  function canLazyLoadPage(page) {
    try {
      return !!(
        global.ETHONELazyModules &&
        typeof global.ETHONELazyModules.canLoadPage === "function" &&
        global.ETHONELazyModules.canLoadPage(page)
      );
    } catch (e) {
      return false;
    }
  }

  function normalizePage(page) {
    page = String(page || "").trim();
    return PAGE_ALIASES[page] || page;
  }

  function openPage(page, source) {
    page = normalizePage(page);
    if (isExperimentalPage(page) && !experimentalEnabled()) {
      toast(productionDisabledMessage(), "info");
      return false;
    }
    if (!page) {
      console.warn("[ETHONE actions] Unknown page:", page);
      toast(unavailableMessage(), "info");
      return false;
    }
    if (!pageExists(page) && canLazyLoadPage(page)) {
      return Promise.resolve(global.ETHONELazyModules.loadForPage(page)).then(function () {
        if (!pageExists(page)) {
          console.warn("[ETHONE actions] Lazy page did not mount:", page);
          toast(unavailableMessage(), "info");
          return false;
        }
        return openPage(page, source);
      }).catch(function (error) {
        console.error("[ETHONE actions] Lazy page load failed:", page, error);
        toast(failedMessage(), "error");
        return false;
      });
    }
    if (!pageExists(page)) {
      console.warn("[ETHONE actions] Unknown page:", page);
      toast(unavailableMessage(), "info");
      return false;
    }
    try {
      var navigation = app.get("navigation");
      if (navigation && typeof navigation.go === "function") return navigation.go(page, source || null);
    } catch (e) {}
    if (typeof global.switchPage === "function") {
      global.switchPage(page, source && source.classList ? source : null);
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
    if (global.ETHONELazyModules && typeof global.ETHONELazyModules.load === "function") {
      try {
        if (typeof open === "boolean") global.localStorage && global.localStorage.setItem("ethone:widgets-panel-open", open ? "1" : "0");
        else global.localStorage && global.localStorage.setItem("ethone:widgets-panel-open", "1");
      } catch (e) {}
      Promise.resolve(global.ETHONELazyModules.load("widgets")).then(function () {
        if (global.document && global.document.body) global.document.body.classList.remove("ethone-emergency-minimal");
        if (typeof global.toggleLivePanel === "function") global.toggleLivePanel(typeof open === "boolean" ? open : true);
        else toast(unavailableMessage(), "info");
      }).catch(function () {
        toast("Impossible de charger le panneau Widgets pour le moment.", "warning");
      });
      return true;
    }
    toast(unavailableMessage(), "info");
    return false;
  }

  function notificationsPanel() {
    if (typeof global.toggleNotifPanel === "function") {
      global.toggleNotifPanel();
      return true;
    }
    var notifications = app.get("notifications");
    if (notifications && typeof notifications.toggle === "function") {
      var toggled = notifications.toggle();
      if (toggled !== false) return true;
    }
    if (global.ETHONELazyModules && typeof global.ETHONELazyModules.load === "function") {
      return Promise.resolve(global.ETHONELazyModules.load("notifications")).then(function () {
        if (typeof global.toggleNotifPanel === "function") {
          global.toggleNotifPanel();
          return true;
        }
        var lateNotifications = app.get("notifications");
        if (lateNotifications && typeof lateNotifications.toggle === "function") {
          lateNotifications.toggle();
          return true;
        }
        toast(unavailableMessage(), "info");
        return false;
      }).catch(function () {
        toast("Impossible de charger les notifications pour le moment.", "warning");
        return false;
      });
    }
    toast(unavailableMessage(), "info");
    return false;
  }

  function openInspector(runDiagnostic) {
    function openLoaded() {
      if (global.ETHONEInspector && typeof global.ETHONEInspector.open === "function") {
        global.ETHONEInspector.open();
        if (runDiagnostic && typeof global.ETHONEInspector.runFullDiagnostic === "function") {
          setTimeout(function () { global.ETHONEInspector.runFullDiagnostic(); }, 40);
        }
        return true;
      }
      toast(unavailableMessage(), "info");
      return false;
    }
    if (global.ETHONEInspector) return openLoaded();
    if (global.ETHONELazyModules && typeof global.ETHONELazyModules.load === "function") {
      return Promise.resolve(global.ETHONELazyModules.load("developer-inspector")).then(function (loaded) {
        if (loaded === false) {
          toast(unavailableMessage(), "info");
          return false;
        }
        return openLoaded();
      }).catch(function (error) {
        console.error("[ETHONE actions] Inspector load failed:", error);
        toast(failedMessage(), "error");
        return false;
      });
    }
    toast(unavailableMessage(), "info");
    return false;
  }

  function openFirstRun(view) {
    function openLoaded() {
      var firstRun = global.ETHONEFirstRun;
      if (!firstRun) {
        toast(unavailableMessage(), "info");
        return false;
      }
      if (view === "whats-new" && typeof firstRun.openWhatsNew === "function") {
        firstRun.openWhatsNew({ manual: true });
        return true;
      }
      if (typeof firstRun.replay === "function") {
        firstRun.replay();
        return true;
      }
      if (typeof firstRun.open === "function") {
        firstRun.open({ manual: true, force: true, restart: true, resume: true });
        return true;
      }
      toast(unavailableMessage(), "info");
      return false;
    }

    if (global.ETHONEFirstRun) return openLoaded();
    if (global.ETHONELazyModules && typeof global.ETHONELazyModules.load === "function") {
      return Promise.resolve(global.ETHONELazyModules.load("onboarding")).then(function (loaded) {
        if (loaded === false) return false;
        return openLoaded();
      }).catch(function (error) {
        console.error("[ETHONE actions] Onboarding load failed:", error);
        toast(failedMessage(), "error");
        return false;
      });
    }
    toast(unavailableMessage(), "info");
    return false;
  }

  function openSpaceSwitcher() {
    var btn = document.querySelector('[data-space-action="open"],.space-switcher-button,[data-v4-action-id="dashboard.workspace.toggle"],.d4-workspace');
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
      if (el.closest && el.closest("#main-sidebar [data-sidebar-local='1']")) return;
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
      ["#live-panel-retract-btn", "widgets.collapse"],
      ["#live-panel-close-btn", "widgets.close"],
      ["#live-panel-add-btn", "widgets.add"],
      ["#live-panel-manage-btn", "widgets.manage"],
      ["#os-sidebar-widgets", "widgets.open"],
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
    var page = ctx.page || (ctx.el && ctx.el.dataset && (ctx.el.dataset.actionPage || ctx.el.dataset.page)) || "";
    return openPage(page, navEl);
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
  register("auth.signout", { label: "Sign out", handler: function () {
    if (typeof global.signOut === "function") return global.signOut();
    try {
      if (global.sb && global.sb.auth && typeof global.sb.auth.signOut === "function") {
        return Promise.resolve(global.sb.auth.signOut()).then(function () {
          if (typeof global.showAuth === "function") global.showAuth();
        });
      }
    } catch (e) {}
    toast(unavailableMessage(), "info");
    return false;
  } });
  register("widgets.open", { label: "Widgets", handler: function () { return widgetsPanel(); } });
  register("widgets.close", { label: "Close widgets", handler: function () {
    if (typeof global.closeLivePanel === "function") return global.closeLivePanel();
    if (typeof global.toggleLivePanel === "function") return global.toggleLivePanel(false);
    return widgetsPanel(false);
  } });
  register("widgets.collapse", { label: "Collapse widgets", handler: function () {
    if (typeof global.collapseLivePanel === "function") return global.collapseLivePanel();
    return widgetsPanel(true);
  } });
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
  register("inspector.open", { label: "Open Inspector", handler: function () { return openInspector(false); } });
  register("inspector.diagnostic.run", { label: "Run Full Diagnostic", handler: function () { return openInspector(true); } });
  register("notifications.open", { label: "Notifications", handler: notificationsPanel });
  register("onboarding.open", { label: "Open onboarding", handler: function () { return openFirstRun("onboarding"); } });
  register("whatsnew.open", { label: "Open What's New", handler: function () { return openFirstRun("whats-new"); } });
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
