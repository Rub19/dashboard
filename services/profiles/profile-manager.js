/* ETHONE Profile Manager
   Adds a real profile layer on top of the existing profile state without
   replacing legacy auth, dashboard, or settings flows. */
(function initEthoneProfileManager(global) {
  "use strict";

  if (global.ETHONEProfileManager) return;

  var STORAGE_KEY = "myspace_profiles_backup";
  var PROFILE_VERSION = 1;

  var PROFILE_TEMPLATES = {
    personal: {
      type: "personal",
      label: "Personnel",
      icon: "P",
      accent: "#8b5cf6",
      preset: "ethone-purple",
      description: "Votre espace quotidien pour notes, objectifs et habitudes.",
      wallpaper: "radial-gradient(circle at 22% 8%, rgba(139,92,246,.20), transparent 34%), #09090b"
    },
    work: {
      type: "work",
      label: "Travail",
      icon: "W",
      accent: "#a78bfa",
      preset: "ethone-purple",
      description: "Un profil concentre sur le planning, les taches et le suivi.",
      wallpaper: "radial-gradient(circle at 18% 12%, rgba(167,139,250,.18), transparent 32%), #09090b"
    },
    development: {
      type: "development",
      label: "Developpement",
      icon: "D",
      accent: "#c084fc",
      preset: "tokyo-night",
      description: "GitHub, notes techniques, fichiers et Brain pour coder plus vite.",
      wallpaper: "radial-gradient(circle at 25% 8%, rgba(192,132,252,.17), transparent 34%), #09090b"
    },
    gaming: {
      type: "gaming",
      label: "Gaming",
      icon: "G",
      accent: "#7c3aed",
      preset: "oled",
      description: "Sessions, Discord, Spotify, Valorant et statistiques de jeu.",
      wallpaper: "radial-gradient(circle at 24% 10%, rgba(124,58,237,.22), transparent 35%), #050507"
    },
    streaming: {
      type: "streaming",
      label: "Streaming",
      icon: "S",
      accent: "#9333ea",
      preset: "glass",
      description: "OBS, Twitch, planning live, assets et controles rapides.",
      wallpaper: "radial-gradient(circle at 20% 10%, rgba(147,51,234,.20), transparent 34%), #08070d"
    }
  };

  function nowId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") return global.crypto.randomUUID();
    return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  }

  function safeCall(label, fn) {
    try {
      if (typeof fn === "function") return fn();
    } catch (error) {
      console.warn("[ETHONE profiles] " + label + " failed", error);
    }
    return null;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function readProfiles() {
    try {
      if (typeof profiles !== "undefined" && Array.isArray(profiles)) return profiles;
    } catch (error) {}
    return [];
  }

  function setProfiles(next) {
    try {
      profiles = next;
      return true;
    } catch (error) {
      return false;
    }
  }

  function getCurrentId() {
    try {
      return currentId;
    } catch (error) {
      return null;
    }
  }

  function setCurrentId(id) {
    try {
      currentId = id;
      return true;
    } catch (error) {
      return false;
    }
  }

  function save() {
    if (typeof global.saveStateNow === "function") {
      global.saveStateNow();
      return;
    }
    safeCall("local profile save", function () {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(readProfiles()));
    });
  }

  function templateFor(type) {
    return PROFILE_TEMPLATES[type] || PROFILE_TEMPLATES.personal;
  }

  function inferType(profile) {
    var raw = String((profile && (profile.profileType || profile.type || profile.name)) || "").toLowerCase();
    if (raw.indexOf("gaming") > -1 || raw.indexOf("game") > -1) return "gaming";
    if (raw.indexOf("dev") > -1 || raw.indexOf("code") > -1) return "development";
    if (raw.indexOf("stream") > -1 || raw.indexOf("twitch") > -1) return "streaming";
    if (raw.indexOf("work") > -1 || raw.indexOf("travail") > -1 || raw.indexOf("pro") > -1) return "work";
    return "personal";
  }

  function ensureState(profile) {
    if (!profile.state) {
      if (typeof global.defState === "function") profile.state = global.defState(profile.name || "User");
      else profile.state = {};
    }
    profile.state.notes = asArray(profile.state.notes);
    profile.state.todos = asArray(profile.state.todos);
    profile.state.events = asArray(profile.state.events);
    profile.state.items = asArray(profile.state.items);
    profile.state.activity = asArray(profile.state.activity);
    profile.state.habits = asArray(profile.state.habits);
    profile.state.goals = asArray(profile.state.goals);
    profile.state.socials = profile.state.socials || {};
    profile.state.connections = profile.state.connections || {};
    if (!profile.state.username) profile.state.username = profile.name || "User";
    return profile.state;
  }

  function ensureProfile(profile) {
    if (!profile || typeof profile !== "object") return null;
    if (!profile.id) profile.id = nowId();
    if (!profile.name) profile.name = "User";
    ensureState(profile);

    var type = profile.profileType || profile.type || inferType(profile);
    var tpl = templateFor(type);
    profile.profileType = type;
    profile.type = type;
    profile.description = profile.description || profile.state.bio || tpl.description;
    if (!profile.avatarEmoji && !profile.avatarImg && !profile.avatarBg) profile.avatarBg = "linear-gradient(135deg," + tpl.accent + ",#1f102f)";

    profile.theme = Object.assign({
      preset: tpl.preset,
      customAccent: tpl.accent,
      density: "comfortable",
      radius: 1,
      blur: 1,
      glow: 1,
      motion: 1,
      fontFamily: "inter",
      sidebarWidth: 260
    }, profile.theme || {});
    if (!profile.theme.customAccent) profile.theme.customAccent = tpl.accent;
    profile.themePreset = profile.theme.preset || profile.themePreset || tpl.preset;
    profile.customAccent = profile.theme.customAccent || profile.customAccent || tpl.accent;

    profile.workspaceProfile = Object.assign({
      active: profile.activeWorkspaceId || null,
      wallpaper: profile.wallpaper || tpl.wallpaper,
      accent: profile.theme.customAccent || tpl.accent,
      favorites: []
    }, profile.workspaceProfile || {});
    profile.workspaces = asArray(profile.workspaces);

    profile.dashboardProfile = Object.assign({
      layoutId: profile.dashboardLayoutId || "default",
      widgets: asArray(profile.dashboardWidgets),
      favorites: asArray(profile.favoriteWidgets),
      hidden: asArray(profile.hiddenWidgets),
      preferences: {}
    }, profile.dashboardProfile || {});

    profile.preferences = Object.assign({
      animations: true,
      notifications: !!profile.state.notifEnabled,
      sidebarMode: "auto",
      density: profile.theme.density || "comfortable",
      lastOpenedAt: null
    }, profile.preferences || {});

    profile.profileSystemVersion = PROFILE_VERSION;
    return profile;
  }

  function normalizeAll() {
    safeCall("legacy normalize", function () {
      if (typeof global.normalizeAllProfiles === "function") global.normalizeAllProfiles();
    });
    readProfiles().forEach(ensureProfile);
    return readProfiles();
  }

  function getById(id) {
    if (typeof global.getP === "function") return global.getP(id);
    return readProfiles().find(function (profile) { return String(profile.id) === String(id); }) || null;
  }

  function current() {
    if (typeof global.curP === "function") return global.curP();
    return getById(getCurrentId());
  }

  function hexToRgb(hex) {
    var value = String(hex || "#8b5cf6").trim();
    if (value.charAt(0) !== "#") value = "#8b5cf6";
    if (value.length === 4) value = "#" + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
    return [
      parseInt(value.slice(1, 3), 16) || 139,
      parseInt(value.slice(3, 5), 16) || 92,
      parseInt(value.slice(5, 7), 16) || 246
    ].join(",");
  }

  function applyProfileEnvironment(profile) {
    profile = ensureProfile(profile || current());
    if (!profile) return null;
    var root = document.documentElement;
    var body = document.body;
    var accent = profile.theme && profile.theme.customAccent ? profile.theme.customAccent : templateFor(profile.type).accent;
    var rgb = hexToRgb(accent);

    root.dataset.profileType = profile.type || "personal";
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-rgb", rgb);
    root.style.setProperty("--accent-light", accent);
    root.style.setProperty("--accent-hover", accent);
    root.style.setProperty("--accent-glow", "rgba(" + rgb + ",.24)");
    root.style.setProperty("--accent-subtle", "rgba(" + rgb + ",.10)");
    root.style.setProperty("--accent-soft", "rgba(" + rgb + ",.13)");
    root.style.setProperty("--border3", "rgba(" + rgb + ",.22)");
    if (body) {
      body.dataset.profileType = profile.type || "personal";
      body.style.setProperty("--profile-wallpaper", profile.workspaceProfile.wallpaper || templateFor(profile.type).wallpaper);
    }

    safeCall("theme engine", function () {
      if (global.ETHONEThemeEngine && typeof global.ETHONEThemeEngine.apply === "function") {
        global.ETHONEThemeEngine.apply(profile.theme);
      } else if (typeof global.bootThemeEngine === "function") {
        global.bootThemeEngine();
      }
    });
    return profile;
  }

  function refreshProfileBoundUI(profile) {
    profile = profile || current();
    safeCall("sidebar nav", function () { if (typeof global.renderSidebarNav === "function") global.renderSidebarNav(); });
    safeCall("sidebar avatar", function () { if (typeof global.updateSidebarAvatar === "function") global.updateSidebarAvatar(); });
    safeCall("topbar profile", function () { if (typeof global.updateTopbarProfile === "function") global.updateTopbarProfile(); });
    safeCall("banner", function () { if (typeof global.updateBannerDisplay === "function") global.updateBannerDisplay(); });
    safeCall("settings preview", function () { if (typeof global.updateSettingsPreview === "function") global.updateSettingsPreview(); });
    safeCall("profile screen", function () { if (typeof global.renderProfileScreen === "function") global.renderProfileScreen(); });

    var active = document.querySelector(".tab-content.active");
    var page = active && active.id ? active.id.replace(/^page-/, "") : "dashboard";
    if (page === "dashboard") {
      safeCall("dashboard refresh", function () {
        global.__ethoneInitDashboardAt = 0;
        if (typeof global.initDashboard === "function") global.initDashboard();
      });
    } else if (page && typeof global.switchPage === "function") {
      safeCall("page refresh", function () { global.switchPage(page, null); });
    }

    safeCall("status bar", function () {
      if (global.ETHONEStatusBar && typeof global.ETHONEStatusBar.refresh === "function") global.ETHONEStatusBar.refresh();
    });
    safeCall("smart layouts", function () {
      if (global.ETHONESmartLayouts && typeof global.ETHONESmartLayouts.refresh === "function") global.ETHONESmartLayouts.refresh();
    });
  }

  function isDashboardVisible() {
    var main = document.getElementById("main-content");
    var screen = document.getElementById("profile-screen");
    if (!main) return false;
    if (screen && getComputedStyle(screen).display !== "none") return false;
    return getComputedStyle(main).display !== "none";
  }

  function resetProfileCaches() {
    safeCall("profile caches", function () { if (typeof _valoMatchCache !== "undefined") _valoMatchCache = {}; });
    safeCall("profile match cache", function () { if (typeof _valoAllMatches !== "undefined") _valoAllMatches = []; });
  }

  function switchTo(id, options) {
    options = options || {};
    normalizeAll();
    var profile = ensureProfile(getById(id));
    if (!profile) {
      if (typeof global.toast === "function") global.toast("Profil introuvable", "error");
      return false;
    }
    var previous = current();
    if (profile.password && String(profile.id) !== String(getCurrentId()) && !options.verified) {
      safeCall("locked profile", function () {
        if (typeof global.showPasswordScreen === "function") global.showPasswordScreen(profile.id);
        else if (typeof global.goToProfileScreen === "function") global.goToProfileScreen();
      });
      return false;
    }

    safeCall("profile changing event", function () {
      global.dispatchEvent(new CustomEvent("ethone:profile-changing", { detail: { from: previous, to: profile } }));
    });

    resetProfileCaches();
    profile.preferences.lastOpenedAt = new Date().toISOString();
    setCurrentId(profile.id);
    save();
    applyProfileEnvironment(profile);

    if (!isDashboardVisible() && typeof global.enterDashboard === "function") {
      global.enterDashboard(profile.id);
    } else {
      refreshProfileBoundUI(profile);
    }

    safeCall("profile changed event", function () {
      global.dispatchEvent(new CustomEvent("ethone:profile-changed", { detail: { profile: profile, previous: previous } }));
    });
    if (typeof global.toast === "function" && !options.silent) global.toast("Profil " + profile.name + " active", "success");
    return true;
  }

  function createFromTemplate(type, overrides) {
    var tpl = templateFor(type);
    var state = typeof global.defState === "function" ? global.defState(tpl.label) : {};
    state.bio = tpl.description;
    var profile = ensureProfile(Object.assign({
      id: nowId(),
      name: tpl.label,
      profileType: tpl.type,
      type: tpl.type,
      description: tpl.description,
      avatarEmoji: null,
      avatarBg: "linear-gradient(135deg," + tpl.accent + ",#181022)",
      state: state,
      workspaces: [{
        id: nowId(),
        name: tpl.label,
        type: tpl.type,
        accent: tpl.accent,
        createdAt: new Date().toISOString()
      }]
    }, overrides || {}));
    readProfiles().push(profile);
    save();
    safeCall("profile created event", function () {
      global.dispatchEvent(new CustomEvent("ethone:profile-created", { detail: { profile: profile } }));
    });
    if (typeof global.renderProfileScreen === "function") global.renderProfileScreen();
    return profile;
  }

  function duplicate(id) {
    var source = ensureProfile(getById(id));
    if (!source) return null;
    var copy = clone(source);
    copy.id = nowId();
    copy.name = (source.name || "Profile") + " Copy";
    copy.password = null;
    copy._dbId = null;
    copy.createdAt = new Date().toISOString();
    ensureProfile(copy);
    readProfiles().push(copy);
    save();
    if (typeof global.renderProfileScreen === "function") global.renderProfileScreen();
    if (typeof global.toast === "function") global.toast("Profil duplique", "success");
    return copy;
  }

  function update(id, patch) {
    var profile = ensureProfile(getById(id));
    if (!profile || !patch) return null;
    Object.assign(profile, patch);
    ensureProfile(profile);
    save();
    if (String(id) === String(getCurrentId())) {
      applyProfileEnvironment(profile);
      refreshProfileBoundUI(profile);
    }
    return profile;
  }

  function registerActions() {
    var actions = global.ETHONEActions || global.ACTION_REGISTRY || (global.Ethone && global.Ethone.get && global.Ethone.get("actions"));
    if (!actions || typeof actions.register !== "function") return false;
    actions.register("profiles.open", {
      label: "Open profiles",
      handler: function () {
        if (global.ETHONEProfileSwitcher && typeof global.ETHONEProfileSwitcher.open === "function") return global.ETHONEProfileSwitcher.open();
        if (typeof global.goToProfileScreen === "function") return global.goToProfileScreen();
        return false;
      }
    });
    actions.register("profile.switch", {
      label: "Switch profile",
      handler: function (ctx) {
        if (ctx && ctx.profileId) return switchTo(ctx.profileId);
        if (global.ETHONEProfileSwitcher && typeof global.ETHONEProfileSwitcher.open === "function") return global.ETHONEProfileSwitcher.open();
        if (typeof global.goToProfileScreen === "function") return global.goToProfileScreen();
        return false;
      }
    });
    actions.register("profiles.createTemplate", {
      label: "Create profile from template",
      handler: function (ctx) {
        var profile = createFromTemplate((ctx && ctx.type) || "personal");
        if (profile) return switchTo(profile.id);
        return false;
      }
    });
    return true;
  }

  var api = {
    templates: PROFILE_TEMPLATES,
    list: function () { return normalizeAll().slice(); },
    current: function () { return ensureProfile(current()); },
    get: function (id) { return ensureProfile(getById(id)); },
    normalize: normalizeAll,
    apply: applyProfileEnvironment,
    refresh: refreshProfileBoundUI,
    switchTo: switchTo,
    createFromTemplate: createFromTemplate,
    duplicate: duplicate,
    update: update
  };

  global.ETHONEProfileManager = api;

  function boot() {
    normalizeAll();
    applyProfileEnvironment(current());
    if (!registerActions()) setTimeout(registerActions, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
  global.addEventListener("ethone:dashboard-ready", function () {
    normalizeAll();
    applyProfileEnvironment(current());
  });
})(window);
