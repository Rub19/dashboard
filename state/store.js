/*
 * ETHONE state consistency layer.
 * Keeps a small canonical UI state while preserving legacy storage keys used
 * by older modules. Product data still lives in profile state/Supabase.
 */
(function initEthoneState(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("state")) return;

  var STATE_KEY = "ethone:state:v1";
  var LANG_KEYS = ["nexus_lang", "ethone_lang", "ethone:language"];
  var SIDEBAR_WIDTH_KEYS = ["sb_width", "sidebar_width"];
  var SIDEBAR_MODE_KEY = "ethone:sidebar:mode";
  var WORKSPACE_KEYS = ["ethone:active-workspace-id", "ethone:active-space-id"];
  var THEME_KEY = "ethone:theme";
  var SUPPORTED_LANGS = ["fr", "en", "es", "de"];
  var SIDEBAR_MIN = 58;
  var SIDEBAR_MAX = 360;

  function createStore(initialState) {
    var value = Object.assign({}, initialState || {});
    var subscribers = new Set();

    function getState() {
      return value;
    }

    function setState(nextState) {
      var previous = value;
      value = typeof nextState === "function"
        ? Object.assign({}, value, nextState(value))
        : Object.assign({}, value, nextState || {});
      subscribers.forEach(function notify(subscriber) {
        subscriber(value, previous);
      });
      return value;
    }

    function subscribe(subscriber) {
      if (typeof subscriber !== "function") return function noop() {};
      subscribers.add(subscriber);
      return function unsubscribe() {
        subscribers.delete(subscriber);
      };
    }

    return Object.freeze({
      getState: getState,
      setState: setState,
      subscribe: subscribe
    });
  }

  function safeGet(key, fallback) {
    try {
      var value = global.localStorage && global.localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      if (global.localStorage) global.localStorage.setItem(key, String(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeRemove(key) {
    try {
      if (global.localStorage) global.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function readJSON(key, fallback) {
    try {
      var raw = safeGet(key, null);
      if (raw == null || raw === "") return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      return safeSet(key, JSON.stringify(value));
    } catch (error) {
      return false;
    }
  }

  function firstStored(keys) {
    for (var index = 0; index < keys.length; index += 1) {
      var value = safeGet(keys[index], null);
      if (value != null && value !== "") return value;
    }
    return null;
  }

  function normalizeLanguage(language) {
    var value = String(language || "").slice(0, 2).toLowerCase();
    return SUPPORTED_LANGS.indexOf(value) > -1 ? value : "fr";
  }

  function normalizePage(page) {
    var value = String(page || "dashboard").trim().toLowerCase();
    if (!/^[a-z0-9_-]{1,48}$/.test(value)) return "dashboard";
    return value;
  }

  function normalizeSidebarMode(mode) {
    mode = String(mode || "full").toLowerCase();
    return mode === "compact" || mode === "icon" ? mode : "full";
  }

  function clampNumber(value, min, max, fallback) {
    value = parseInt(value, 10);
    if (!Number.isFinite(value)) value = fallback;
    return Math.min(max, Math.max(min, value));
  }

  function normalizeSidebar(sidebar) {
    sidebar = sidebar && typeof sidebar === "object" ? sidebar : {};
    return {
      width: clampNumber(sidebar.width, SIDEBAR_MIN, SIDEBAR_MAX, 260),
      mode: normalizeSidebarMode(sidebar.mode)
    };
  }

  function normalizeWorkspace(workspace) {
    if (!workspace || typeof workspace !== "object") workspace = {};
    var id = workspace.id == null ? "" : String(workspace.id).trim();
    var name = workspace.name == null ? "" : String(workspace.name).trim();
    return {
      id: /^[a-z0-9:_-]{1,80}$/i.test(id) ? id : "",
      name: name.slice(0, 80)
    };
  }

  function normalizeTheme(theme) {
    if (!theme || typeof theme !== "object" || Array.isArray(theme)) return null;
    return Object.assign({}, theme);
  }

  function defaults() {
    return {
      page: "dashboard",
      language: "fr",
      theme: null,
      workspace: { id: "", name: "" },
      sidebar: { width: 260, mode: "full" },
      online: !global.navigator || global.navigator.onLine !== false,
      updatedAt: ""
    };
  }

  function normalizeState(state) {
    state = Object.assign(defaults(), state || {});
    return {
      page: normalizePage(state.page),
      language: normalizeLanguage(state.language),
      theme: normalizeTheme(state.theme),
      workspace: normalizeWorkspace(state.workspace),
      sidebar: normalizeSidebar(state.sidebar),
      online: state.online !== false,
      updatedAt: state.updatedAt || ""
    };
  }

  function readPersistedState() {
    var stored = readJSON(STATE_KEY, null);
    return stored && stored.data && typeof stored.data === "object" ? stored.data : {};
  }

  function legacySnapshot(base) {
    base = Object.assign({}, base || {});

    var language = firstStored(LANG_KEYS);
    if (language) base.language = language;

    var width = firstStored(SIDEBAR_WIDTH_KEYS);
    var mode = safeGet(SIDEBAR_MODE_KEY, null);
    if (width || mode) {
      base.sidebar = Object.assign({}, base.sidebar || {});
      if (width) base.sidebar.width = width;
      if (mode) base.sidebar.mode = mode;
    }

    var workspaceId = firstStored(WORKSPACE_KEYS);
    if (workspaceId) {
      base.workspace = Object.assign({}, base.workspace || {}, { id: workspaceId });
    }

    var theme = readJSON(THEME_KEY, null);
    if (theme && typeof theme === "object") base.theme = theme;

    return base;
  }

  function currentPageFromDom() {
    try {
      var active = global.document && global.document.querySelector(".tab-content.active[id^='page-']");
      return active ? active.id.replace(/^page-/, "") : "";
    } catch (error) {
      return "";
    }
  }

  function mergeState(previous, patch) {
    patch = patch || {};
    var next = Object.assign({}, previous, patch);
    if (patch.sidebar) next.sidebar = Object.assign({}, previous.sidebar || {}, patch.sidebar);
    if (patch.workspace) next.workspace = Object.assign({}, previous.workspace || {}, patch.workspace);
    if (patch.theme) next.theme = Object.assign({}, previous.theme || {}, patch.theme);
    return normalizeState(next);
  }

  function sameValue(left, right) {
    if (left === right) return true;
    try {
      return JSON.stringify(left) === JSON.stringify(right);
    } catch (error) {
      return false;
    }
  }

  function sameState(left, right) {
    return left.page === right.page &&
      left.language === right.language &&
      left.online === right.online &&
      sameValue(left.theme, right.theme) &&
      sameValue(left.workspace, right.workspace) &&
      sameValue(left.sidebar, right.sidebar);
  }

  var state = normalizeState(legacySnapshot(readPersistedState()));
  if (!state.page) state.page = currentPageFromDom() || "dashboard";
  var subscribers = new Set();
  var revision = 0;
  var suppressPersist = false;
  var historyReady = false;

  function notify(previous, next) {
    subscribers.forEach(function notifySubscriber(subscriber) {
      try {
        subscriber(next, previous);
      } catch (error) {
        try { console.warn("[ETHONE state] subscriber failed", error); } catch (ignore) {}
      }
    });
  }

  function writeAliases(next) {
    LANG_KEYS.forEach(function writeLang(key) { safeSet(key, next.language); });

    SIDEBAR_WIDTH_KEYS.forEach(function writeSidebarWidth(key) {
      safeSet(key, String(next.sidebar.width));
    });
    safeSet(SIDEBAR_MODE_KEY, next.sidebar.mode);

    WORKSPACE_KEYS.forEach(function writeWorkspace(key) {
      if (next.workspace && next.workspace.id) safeSet(key, next.workspace.id);
      else safeRemove(key);
    });

    if (next.theme) writeJSON(THEME_KEY, next.theme);
    else safeRemove(THEME_KEY);
  }

  function persist(next) {
    if (suppressPersist) return false;
    next = normalizeState(next || state);
    revision += 1;
    next.updatedAt = new Date().toISOString();
    state = next;
    writeAliases(next);
    return writeJSON(STATE_KEY, {
      version: 1,
      revision: revision,
      updatedAt: next.updatedAt,
      data: next
    });
  }

  function setState(patch, options) {
    options = options || {};
    var previous = state;
    var rawPatch = typeof patch === "function" ? patch(previous) : patch;
    var next = mergeState(previous, rawPatch);
    if (sameState(previous, next)) return state;
    state = next;
    if (options.persist !== false) persist(next);
    notify(previous, state);
    return state;
  }

  function getState() {
    return state;
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== "function") return function noop() {};
    subscribers.add(subscriber);
    return function unsubscribe() {
      subscribers.delete(subscriber);
    };
  }

  function hydrate(options) {
    options = options || {};
    var previous = state;
    var next = normalizeState(legacySnapshot(readPersistedState()));
    if (!next.page || next.page === "dashboard") next.page = normalizePage(currentPageFromDom() || next.page);
    if (sameState(previous, next)) return state;
    suppressPersist = options.persist === false;
    state = next;
    suppressPersist = false;
    if (options.persist !== false) persist(state);
    notify(previous, state);
    return state;
  }

  function syncFromProfile(profile) {
    profile = profile || (typeof global.curP === "function" ? global.curP() : null);
    if (!profile) return state;

    var patch = {};
    if (profile.theme && typeof profile.theme === "object") {
      patch.theme = Object.assign({}, profile.theme);
      if (profile.theme.sidebarWidth != null) {
        patch.sidebar = Object.assign({}, patch.sidebar || {}, { width: profile.theme.sidebarWidth });
      }
    }
    if (profile.sidebarCompact) {
      patch.sidebar = Object.assign({}, patch.sidebar || {}, { mode: "compact" });
    }
    if (profile.activeWorkspaceId) {
      patch.workspace = Object.assign({}, patch.workspace || {}, { id: profile.activeWorkspaceId });
    }
    if (profile.state) {
      if (profile.state.activeWorkspaceId || profile.state.activeSpace) {
        patch.workspace = Object.assign({}, patch.workspace || {}, { id: profile.state.activeWorkspaceId || profile.state.activeSpace });
      }
      if (profile.state.activeWorkspaceName) {
        patch.workspace = Object.assign({}, patch.workspace || {}, { name: profile.state.activeWorkspaceName });
      }
      if (profile.state.activePage) patch.page = profile.state.activePage;
    }
    return setState(patch);
  }

  function setLanguage(language) {
    return setState({ language: language }).language;
  }

  function setTheme(theme) {
    return setState({ theme: theme }).theme;
  }

  function setWorkspace(workspace) {
    return setState({ workspace: workspace }).workspace;
  }

  function setSidebar(sidebar) {
    return setState({ sidebar: sidebar }).sidebar;
  }

  function setPage(page) {
    return setState({ page: page }).page;
  }

  function canShowPage(page) {
    try {
      return !!(global.document && global.document.getElementById && global.document.getElementById("page-" + page));
    } catch (error) {
      return false;
    }
  }

  function recordNavigation(page) {
    page = setPage(page);
    try {
      if (!global.history || !global.history.pushState || !global.history.replaceState) return page;
      if (global.__ethoneStateRestoringHistory) return page;
      if (!historyReady) {
        global.history.replaceState(Object.assign({}, global.history.state || {}, { ethonePage: page }), "", global.location && global.location.href || "");
        historyReady = true;
        return page;
      }
      var current = global.history.state && global.history.state.ethonePage;
      if (current !== page) {
        global.history.pushState({ ethonePage: page }, "", global.location && global.location.href || "");
      }
    } catch (error) {}
    return page;
  }

  function restorePage(reason) {
    var page = normalizePage(state.page);
    var current = normalizePage(currentPageFromDom() || "dashboard");
    if (!page || page === current || !canShowPage(page) || typeof global.switchPage !== "function") return false;
    try {
      global.__ethoneStateRestoringHistory = true;
      global.switchPage(page, null);
      global.__ethoneStateRestoringHistory = false;
      setPage(page);
      return true;
    } catch (error) {
      global.__ethoneStateRestoringHistory = false;
      try { console.warn("[ETHONE state] page restore failed after " + (reason || "boot"), error); } catch (ignore) {}
      return false;
    }
  }

  function installGlobalSync() {
    if (global.__ethoneStateConsistencySyncReady) return;
    global.__ethoneStateConsistencySyncReady = true;

    global.addEventListener("storage", function handleStorage(event) {
      if (!event || !event.key) return;
      if (
        event.key === STATE_KEY ||
        event.key === THEME_KEY ||
        event.key === SIDEBAR_MODE_KEY ||
        LANG_KEYS.indexOf(event.key) > -1 ||
        SIDEBAR_WIDTH_KEYS.indexOf(event.key) > -1 ||
        WORKSPACE_KEYS.indexOf(event.key) > -1
      ) hydrate({ persist: false });
    });

    ["ethone:dashboard-ready", "ethone:page-ready", "ethone:boot-sequence-complete"].forEach(function (eventName) {
      global.addEventListener(eventName, function (event) {
        var detailPage = event && event.detail && event.detail.page;
        if (eventName !== "ethone:page-ready") syncFromProfile();
        if (detailPage) setPage(detailPage);
        else if (eventName === "ethone:dashboard-ready") {
          global.setTimeout(function () { restorePage("dashboard-ready"); }, 80);
        }
      });
    });

    global.addEventListener("popstate", function handlePopState(event) {
      var page = event && event.state && event.state.ethonePage;
      page = normalizePage(page || "");
      if (!page || page === "dashboard" && !(event && event.state && event.state.ethonePage)) return;
      if (!canShowPage(page) || typeof global.switchPage !== "function") return;
      try {
        global.__ethoneStateRestoringHistory = true;
        global.switchPage(page, null);
      } finally {
        global.__ethoneStateRestoringHistory = false;
      }
      setPage(page);
    });

    global.addEventListener("ethone:workspace-change", function (event) {
      var workspace = event && event.detail && (event.detail.workspace || event.detail.space);
      if (workspace) setWorkspace({ id: workspace.id, name: workspace.name || workspace.label || "" });
    });

    global.addEventListener("ethone:theme-changed", function (event) {
      var theme = event && event.detail && event.detail.theme;
      if (theme) setTheme(theme);
    });
  }

  var api = Object.freeze({
    getState: getState,
    setState: setState,
    subscribe: subscribe,
    hydrate: hydrate,
    persist: persist,
    syncFromProfile: syncFromProfile,
    setLanguage: setLanguage,
    setTheme: setTheme,
    setWorkspace: setWorkspace,
    setSidebar: setSidebar,
    setPage: setPage,
    recordNavigation: recordNavigation,
    restorePage: restorePage,
    defaults: defaults,
    keys: Object.freeze({
      state: STATE_KEY,
      language: LANG_KEYS.slice(),
      sidebarWidth: SIDEBAR_WIDTH_KEYS.slice(),
      sidebarMode: SIDEBAR_MODE_KEY,
      workspace: WORKSPACE_KEYS.slice(),
      theme: THEME_KEY
    })
  });

  app.define("state", api);
  app.define("createStore", createStore);
  global.ETHONEStateConsistency = api;
  installGlobalSync();
  persist(state);
})(window);
