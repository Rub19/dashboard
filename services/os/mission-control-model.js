/* ETHONE Mission Control model.
   Read-only adapters over existing OS services plus local view preferences. */
(function initMissionControlModel(global) {
  "use strict";

  if (global.ETHONEMissionControlModel) return;

  var ORDER_KEY = "ethone:mission-control-order:v2";
  var FLOW_STATE_KEY = "ethone:flow:v1";
  var FLOW_DATA_URL = "./data/flows.json";
  var LAYOUT_LIBRARY_KEY = "ethone:dashboard-v4-layouts";
  var ACTIVE_LAYOUT_KEY = "ethone:dashboard-v4-layout";
  var STUDIO_KEY = "ethone:studio:v1";
  var flowPack = null;
  var hydratePromise = null;

  var SPACE_ICONS = {
    personal: "home",
    work: "briefcase-business",
    focus: "code-2",
    development: "code-2",
    study: "book-open-check",
    gaming: "gamepad-2",
    streaming: "radio",
    creative: "wand-sparkles",
    control: "layout-dashboard"
  };

  var WIDGET_ICONS = {
    hero: "sparkles",
    brain: "brain-circuit",
    today: "calendar-check-2",
    notes: "notebook-pen",
    calendar: "calendar-days",
    todos: "circle-check-big",
    tasks: "circle-check-big",
    spotify: "music-2",
    discord: "message-circle",
    github: "git-branch",
    focus: "timer",
    clock: "clock-3",
    weather: "cloud-sun",
    cpu: "cpu",
    ram: "memory-stick",
    network: "wifi",
    quickActions: "zap"
  };

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function clone(value, fallback) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return fallback === undefined ? value : fallback; }
  }

  function readJSON(key, fallback) {
    try {
      var raw = global.localStorage && global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function profile() {
    try { return typeof global.curP === "function" ? global.curP() : null; }
    catch (error) { return null; }
  }

  function profileState() {
    var current = profile();
    return current && current.state && typeof current.state === "object" ? current.state : {};
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalize(value) {
    var input = text(value).toLowerCase();
    try { input = input.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
    catch (error) {}
    return input.replace(/[^a-z0-9]+/g, " ").trim();
  }

  function titleOf(item, fallback) {
    return text(item && (item.title || item.name || item.label || item.text || item.input)) || fallback || "ETHONE";
  }

  function timestampOf(item) {
    var raw = item && (item.updatedAt || item.updated || item.lastOpened || item.createdAt || item.created || item.ts || item.date);
    var value = typeof raw === "number" ? raw : Date.parse(raw || "");
    return Number.isFinite(value) ? value : 0;
  }

  function safeAccent(value) {
    value = text(value);
    return /^#[0-9a-f]{6}$/i.test(value) ? value : "var(--accent)";
  }

  function unique(items) {
    var seen = Object.create(null);
    return list(items).filter(function (item) {
      var id = text(item && item.id);
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function appService(name) {
    try { return global.Ethone && typeof global.Ethone.get === "function" ? global.Ethone.get(name) : null; }
    catch (error) { return null; }
  }

  function workspaceService() {
    return global.ETHONEWorkspaces || global.ETHONESpaces || appService("workspaces") || null;
  }

  function activeSpaceId() {
    var service = workspaceService();
    try {
      var active = service && typeof service.active === "function" ? service.active() : null;
      return text(active && active.id);
    } catch (error) {
      return "";
    }
  }

  function getSpaces() {
    var service = workspaceService();
    var spaces = [];
    try { spaces = service && typeof service.all === "function" ? service.all() : []; }
    catch (error) { spaces = []; }
    if (!spaces.length) spaces = list(profile() && profile().workspaces);
    var activeId = activeSpaceId();
    return unique(spaces.map(function (space, index) {
      var template = normalize(space.template || space.type || "control").replace(/\s/g, "-");
      return {
        id: text(space.id) || "space-" + index,
        title: titleOf(space, "Space " + (index + 1)),
        subtitle: text(space.description) || (space.id === activeId ? "Active environment" : "ETHONE Space"),
        icon: text(space.icon) || SPACE_ICONS[template] || "layers-3",
        accent: safeAccent(space.accent),
        active: text(space.id) === activeId,
        template: template,
        kind: "space",
        keywords: [template, "workspace", "environment", "space"].join(" "),
        raw: space
      };
    }));
  }

  function flowRuntimeState() {
    try { return global.ETHONEFlow && typeof global.ETHONEFlow.state === "function" ? global.ETHONEFlow.state() || {} : readJSON(FLOW_STATE_KEY, {}); }
    catch (error) { return readJSON(FLOW_STATE_KEY, {}); }
  }

  function flowSource() {
    try {
      if (global.ETHONEFlow && typeof global.ETHONEFlow.flows === "function") return global.ETHONEFlow.flows() || [];
    } catch (error) {}
    var saved = flowRuntimeState();
    return list(flowPack && flowPack.flows).concat(list(saved.customFlows));
  }

  function getFlows() {
    var state = flowRuntimeState();
    return unique(flowSource().map(function (flow, index) {
      return {
        id: text(flow.id) || "flow-" + index,
        title: titleOf(flow, "Flow " + (index + 1)),
        subtitle: text(flow.description) || "Context automation",
        icon: text(flow.icon) || "workflow",
        accent: safeAccent(flow.color || flow.accent),
        active: text(flow.id) === text(state.activeId),
        favorite: list(state.favorites).indexOf(flow.id) !== -1,
        kind: "flow",
        keywords: list(flow.pages).concat(list(flow.widgets), list(flow.integrations), ["flow", "context"]).join(" "),
        raw: flow
      };
    }));
  }

  function desktopState() {
    try {
      if (global.ETHONEDesktop && typeof global.ETHONEDesktop.state === "function") return global.ETHONEDesktop.state() || {};
      if (global.ETHONEWindowManager && typeof global.ETHONEWindowManager.state === "function") return global.ETHONEWindowManager.state() || {};
    } catch (error) {}
    return {};
  }

  function currentPage() {
    var active = global.document && global.document.querySelector(".tab-content.active[id^='page-']");
    return active ? active.id.replace(/^page-/, "") : "dashboard";
  }

  function pageMeta(page) {
    var defaults = {
      dashboard: ["Dashboard", "layout-dashboard"],
      ai: ["ETHONE AI", "brain-circuit"],
      notes: ["Notes", "notebook-pen"],
      todos: ["Tasks", "circle-check-big"],
      calendar: ["Calendar", "calendar-days"],
      files: ["Files", "folder-open"],
      settings: ["Settings", "settings"],
      marketplace: ["Marketplace", "store"],
      activity: ["Activity", "activity"]
    };
    var fallback = defaults[page] || [text(page).replace(/-/g, " ") || "Window", "app-window"];
    try {
      var nav = typeof global.getDefaultNav === "function" ? global.getDefaultNav() || [] : [];
      var match = nav.find(function (entry) { return entry && entry.id === page; });
      if (match) return { title: text(match.label) || fallback[0], icon: text(match.icon) || fallback[1] };
    } catch (error) {}
    return { title: fallback[0], icon: fallback[1] };
  }

  function getWindows() {
    var state = desktopState();
    return unique(list(state.windows).filter(function (win) { return win && win.page; }).map(function (win, index) {
      var meta = pageMeta(win.page);
      return {
        id: text(win.id) || "window-" + index,
        title: meta.title,
        subtitle: win.minimized ? "Minimized window" : "Open window",
        icon: meta.icon,
        page: win.page,
        active: text(win.id) === text(state.activeWindow),
        minimized: !!win.minimized,
        pinned: !!win.pinned,
        workspace: Number.isFinite(Number(win.workspace)) ? Number(win.workspace) : 0,
        screen: text(win.screen) || "main",
        frame: clone(win.frame, {}),
        kind: "window",
        keywords: [win.page, win.screen, "window", "desktop"].join(" "),
        raw: win
      };
    }));
  }

  function aiConversationSources() {
    var state = profileState();
    var all = list(state.aiSessions).concat(list(state.aiCore && state.aiCore.conversations));
    try {
      var config = global.ETHONEAICore && typeof global.ETHONEAICore.config === "function" ? global.ETHONEAICore.config() : null;
      if (config) all = all.concat(list(config.conversations));
    } catch (error) {}
    return all;
  }

  function getAISessions() {
    return unique(aiConversationSources().map(function (session, index) {
      var messages = list(session.messages);
      var firstMessage = messages.find(function (message) { return message && (message.content || message.text); });
      var title = titleOf(session, text(firstMessage && (firstMessage.content || firstMessage.text)).slice(0, 70) || "Brain session");
      return {
        id: text(session.id) || "ai-session-" + index + "-" + timestampOf(session),
        title: title,
        subtitle: text(session.provider || session.model || session.origin) || (messages.length ? messages.length + " messages" : "ETHONE AI"),
        icon: "messages-square",
        provider: text(session.provider),
        updatedAt: timestampOf(session),
        active: index === 0,
        kind: "ai",
        keywords: [session.input, session.context, session.provider, session.model, "brain", "ai", "conversation"].join(" "),
        raw: session
      };
    }).sort(function (a, b) { return b.updatedAt - a.updatedAt; })).slice(0, 12);
  }

  function widgetDefinitions() {
    var definitions = Object.create(null);
    try {
      var registry = appService("widgets");
      if (registry && typeof registry.list === "function") {
        registry.list().forEach(function (entry) { definitions[entry.id] = entry.definition || {}; });
      }
    } catch (error) {}
    return definitions;
  }

  function activeWidgetPreferences() {
    var prefs = readJSON(ACTIVE_LAYOUT_KEY, null);
    if (prefs && Array.isArray(prefs.instances)) return prefs;
    var space = getSpaces().find(function (item) { return item.active; });
    var raw = space && space.raw && space.raw.widgets;
    return { instances: list(raw && raw.active).map(function (type) { return { instanceId: type, type: type, config: {} }; }), hidden: list(raw && raw.hidden) };
  }

  function getWidgets() {
    var definitions = widgetDefinitions();
    var prefs = activeWidgetPreferences();
    var hidden = list(prefs.hidden);
    return unique(list(prefs.instances).filter(function (instance) {
      return instance && hidden.indexOf(instance.instanceId) === -1 && hidden.indexOf(instance.type) === -1;
    }).map(function (instance, index) {
      var type = text(instance.type || instance.id) || "widget";
      var definition = definitions[type] || {};
      return {
        id: text(instance.instanceId) || type + "-" + index,
        title: text(definition.label || definition.name || instance.title) || type.replace(/[-_]/g, " "),
        subtitle: text(definition.category || instance.category) || "Active widget",
        icon: text(definition.icon || instance.icon) || WIDGET_ICONS[type] || "panel-top",
        type: type,
        active: true,
        locked: !!instance.locked,
        kind: "widget",
        keywords: [type, definition.category, "widget", "dashboard"].join(" "),
        raw: instance
      };
    }));
  }

  function getDashboards() {
    var library = readJSON(LAYOUT_LIBRARY_KEY, null) || {};
    var layouts = list(library.layouts);
    if (!layouts.length) {
      layouts = getSpaces().map(function (space) {
        var dashboard = space.raw && space.raw.dashboard || {};
        return { id: dashboard.layoutId || space.raw.layoutId || "space-" + space.id, name: space.title + " Dashboard", prefs: dashboard };
      });
    }
    return unique(layouts.map(function (layout, index) {
      var prefs = layout.prefs || {};
      var count = list(prefs.instances).length || list(prefs.widgets).length;
      return {
        id: text(layout.id) || "dashboard-" + index,
        title: titleOf(layout, "Dashboard " + (index + 1)),
        subtitle: count ? count + " widgets" : "Saved dashboard",
        icon: "layout-template",
        active: text(layout.id) === text(library.activeId),
        kind: "dashboard",
        keywords: [layout.id, layout.name, "layout", "dashboard"].join(" "),
        raw: layout
      };
    }));
  }

  function activateDashboard(id) {
    var library = readJSON(LAYOUT_LIBRARY_KEY, null);
    if (!library || !Array.isArray(library.layouts)) return false;
    var layout = library.layouts.find(function (item) { return item && text(item.id) === text(id); });
    if (!layout) return false;
    library.activeId = layout.id;
    if (!writeJSON(LAYOUT_LIBRARY_KEY, library)) return false;
    if (layout.prefs) writeJSON(ACTIVE_LAYOUT_KEY, layout.prefs);
    try {
      global.dispatchEvent(new CustomEvent("ethone:dashboard-layout-change", { detail: { source: "mission-control", layoutId: layout.id, prefs: clone(layout.prefs, {}) } }));
    } catch (error) {}
    try { if (typeof global.ethoneDashboardV4Render === "function") global.ethoneDashboardV4Render(); }
    catch (error) {}
    return true;
  }

  function projectSources() {
    var state = profileState();
    var studio = state.studio && typeof state.studio === "object" ? state.studio : readJSON(STUDIO_KEY, {});
    var explicit = list(state.projects).map(function (item) { return Object.assign({ __emcPage: item.page || "notes" }, item); });
    var studioProjects = list(studio && studio.projects).map(function (item) { return Object.assign({ __emcPage: "studio" }, item); });
    var files = list(state.items).filter(function (item) {
      return item && (item.projectId || item.project || normalize(item.type) === "project" || normalize(item.tag).indexOf("project") !== -1);
    }).map(function (item) { return Object.assign({ __emcPage: "files" }, item); });
    var notes = list(state.notes).filter(function (item) {
      return item && (item.projectId || item.project || normalize(item.tag).indexOf("project") !== -1);
    }).map(function (item) { return Object.assign({ __emcPage: "notes" }, item); });
    return explicit.concat(studioProjects, files, notes);
  }

  function getProjects() {
    return unique(projectSources().map(function (project, index) {
      return {
        id: text(project.id || project.projectId) || "project-" + index,
        title: titleOf(project, "Project " + (index + 1)),
        subtitle: text(project.description || project.copy || project.type) || "Recent project",
        icon: text(project.icon) || "folder-kanban",
        page: text(project.__emcPage || project.page) || "notes",
        updatedAt: timestampOf(project),
        active: !!project.active,
        kind: "project",
        keywords: [project.tag, project.type, project.description, "project", "recent"].join(" "),
        raw: project
      };
    }).sort(function (a, b) { return b.updatedAt - a.updatedAt; })).slice(0, 12);
  }

  function subsequenceScore(query, candidate) {
    var q = normalize(query).replace(/\s/g, "");
    var value = normalize(candidate).replace(/\s/g, "");
    if (!q || !value) return 0;
    var qi = 0;
    var gap = 0;
    var streak = 0;
    var bestStreak = 0;
    for (var i = 0; i < value.length && qi < q.length; i += 1) {
      if (value.charAt(i) === q.charAt(qi)) {
        qi += 1;
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
      } else if (qi > 0) {
        gap += 1;
        streak = 0;
      }
    }
    if (qi !== q.length) return 0;
    return Math.max(1, 46 + bestStreak * 4 - gap);
  }

  function scoreItem(item, query) {
    var q = normalize(query);
    if (!q) return 1;
    var title = normalize(item.title);
    var haystack = normalize([item.title, item.subtitle, item.keywords, item.kind].join(" "));
    if (title === q) return 140;
    if (title.indexOf(q) === 0) return 118 - Math.min(18, title.length - q.length);
    if (haystack.indexOf(q) !== -1) return 90 - Math.min(25, haystack.indexOf(q));
    var words = haystack.split(" ").filter(Boolean);
    var tokens = q.split(" ").filter(Boolean);
    var tokenScore = 0;
    for (var index = 0; index < tokens.length; index += 1) {
      var token = tokens[index];
      var best = words.reduce(function (score, word) {
        if (word === token) return Math.max(score, 36);
        if (word.indexOf(token) === 0) return Math.max(score, 32);
        return Math.max(score, subsequenceScore(token, word));
      }, 0);
      if (best < 24) return 0;
      tokenScore += best;
    }
    return tokenScore;
  }

  function orderState() {
    var saved = readJSON(ORDER_KEY, {});
    return saved && typeof saved === "object" ? saved : {};
  }

  function orderItems(section, items) {
    var saved = list(orderState()[section]);
    if (!saved.length) return list(items).slice();
    var rank = Object.create(null);
    saved.forEach(function (id, index) { rank[id] = index; });
    return list(items).slice().sort(function (a, b) {
      var aRank = rank[a.id];
      var bRank = rank[b.id];
      if (aRank === undefined && bRank === undefined) return 0;
      if (aRank === undefined) return 1;
      if (bRank === undefined) return -1;
      return aRank - bRank;
    });
  }

  function reorder(section, sourceId, targetId, ids) {
    if (!section || !sourceId || !targetId || sourceId === targetId) return false;
    var state = orderState();
    var ordered = list(ids).map(text).filter(Boolean);
    if (!ordered.length) ordered = list(state[section]);
    var from = ordered.indexOf(sourceId);
    var to = ordered.indexOf(targetId);
    if (from < 0 || to < 0) return false;
    ordered.splice(from, 1);
    ordered.splice(to, 0, sourceId);
    state[section] = ordered;
    return writeJSON(ORDER_KEY, state);
  }

  function rawSnapshot() {
    return {
      spaces: orderItems("spaces", getSpaces()),
      flows: orderItems("flows", getFlows()),
      windows: orderItems("windows", getWindows()),
      ai: orderItems("ai", getAISessions()),
      widgets: orderItems("widgets", getWidgets()),
      dashboards: orderItems("dashboards", getDashboards()),
      projects: orderItems("projects", getProjects())
    };
  }

  function search(query, source) {
    var snapshot = source || rawSnapshot();
    var result = {};
    var total = 0;
    Object.keys(snapshot).forEach(function (section) {
      if (!Array.isArray(snapshot[section])) return;
      result[section] = snapshot[section].map(function (item) {
        return Object.assign({}, item, { score: scoreItem(item, query) });
      }).filter(function (item) { return !query || item.score > 0; }).sort(function (a, b) {
        return b.score - a.score;
      });
      total += result[section].length;
    });
    result.total = total;
    return result;
  }

  function snapshot(query) {
    var source = rawSnapshot();
    var filtered = search(text(query), source);
    filtered.counts = {
      spaces: source.spaces.length,
      flows: source.flows.length,
      windows: source.windows.length,
      ai: source.ai.length,
      widgets: source.widgets.length,
      dashboards: source.dashboards.length,
      projects: source.projects.length
    };
    filtered.currentPage = currentPage();
    return filtered;
  }

  function createSpace(input) {
    var service = workspaceService();
    if (!service || typeof service.create !== "function") return null;
    input = input || {};
    var name = text(input.name).slice(0, 48);
    if (!name) return null;
    var template = normalize(input.template || "control").replace(/\s/g, "-");
    var space = service.create({
      name: name,
      label: name,
      description: text(input.description).slice(0, 120),
      template: template || "control",
      icon: SPACE_ICONS[template] || "layers-3",
      accent: /^#[0-9a-f]{6}$/i.test(text(input.accent)) ? text(input.accent) : "#8b5cf6"
    });
    if (space && typeof service.setActive === "function") service.setActive(space.id, { silent: true });
    return space;
  }

  function activateSpace(id) {
    var service = workspaceService();
    return service && typeof service.setActive === "function" ? service.setActive(id) : null;
  }

  function activateFlow(id) {
    try { return global.ETHONEFlow && typeof global.ETHONEFlow.apply === "function" ? global.ETHONEFlow.apply(id, { source: "mission-control" }) : false; }
    catch (error) { return false; }
  }

  function openFlowBuilder() {
    return hydrate().then(function () {
      if (global.ETHONEFlow && typeof global.ETHONEFlow.openBuilder === "function") {
        global.ETHONEFlow.openBuilder();
        return true;
      }
      return false;
    });
  }

  function hydrate() {
    if (global.ETHONEFlow && typeof global.ETHONEFlow.flows === "function") return Promise.resolve(true);
    if (hydratePromise) return hydratePromise;
    hydratePromise = Promise.resolve().then(function () {
      var lazy = global.ETHONELazyModules;
      if (lazy && typeof lazy.load === "function") {
        return lazy.load("flows").then(function () { return true; });
      }
      return false;
    }).catch(function () { return false; }).then(function (loaded) {
      if (loaded || flowPack || typeof global.fetch !== "function") return loaded;
      return global.fetch(FLOW_DATA_URL, { cache: "force-cache" }).then(function (response) {
        return response && response.ok ? response.json() : null;
      }).then(function (data) {
        if (data && Array.isArray(data.flows)) flowPack = data;
        return !!flowPack;
      }).catch(function () { return false; });
    }).then(function (ready) {
      if (!ready) hydratePromise = null;
      return ready;
    });
    return hydratePromise;
  }

  global.ETHONEMissionControlModel = Object.freeze({
    snapshot: snapshot,
    getSpaces: getSpaces,
    getFlows: getFlows,
    getWindows: getWindows,
    getAISessions: getAISessions,
    getWidgets: getWidgets,
    getDashboards: getDashboards,
    getProjects: getProjects,
    search: search,
    normalize: normalize,
    subsequenceScore: subsequenceScore,
    reorder: reorder,
    createSpace: createSpace,
    activateSpace: activateSpace,
    activateFlow: activateFlow,
    activateDashboard: activateDashboard,
    openFlowBuilder: openFlowBuilder,
    hydrate: hydrate,
    currentPage: currentPage,
    pageMeta: pageMeta
  });

  try {
    if (global.Ethone && typeof global.Ethone.define === "function") global.Ethone.define("missionControlModel", global.ETHONEMissionControlModel);
  } catch (error) {}
})(window);
