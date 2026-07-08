/* ETHONE V5 Brain OS Context Engine.
   Local-only context analysis, Smart Flow recommendations and Command Center. */
(function () {
  "use strict";
  if (window.__ethoneBrainOSV5) return;
  window.__ethoneBrainOSV5 = true;

  var DATA_URL = "./data/brain-os.json";
  var STORE_KEY = "ethone:brain-os:v5";
  var DEFAULTS = { enabled: true, automationLevel: "suggest", autoApplyThreshold: 8.5, suggestThreshold: 5.25, privacy: "local", learning: true };
  var config = { schema: 1, defaults: DEFAULTS, contexts: [], predictions: [], automations: [] };
  var state = {
    settings: Object.assign({}, DEFAULTS),
    memory: { habits: {}, flowHistory: [], dismissed: {}, predictions: [] },
    lastContext: null,
    lastDecision: null,
    lastSignature: "",
    open: false,
    query: "",
    timer: 0,
    saveTimer: 0
  };
  var root = null;

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function saveSoon() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(function () { writeJSON(STORE_KEY, { settings: state.settings, memory: state.memory }); }, 220);
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function icon(name) {
    return '<i data-lucide="' + esc(name || "circle") + '" aria-hidden="true"></i>';
  }
  function renderIcons(scope) {
    try { if (window.lucide && !window.__lucideFailed) window.lucide.createIcons({}, scope || document); } catch (e) {}
  }
  function clone(value) {
    return JSON.parse(JSON.stringify(value || null));
  }
  function profile() {
    try { return typeof window.curP === "function" ? window.curP() : null; } catch (e) { return null; }
  }
  function appState() {
    try {
      var p = profile();
      var base = p && p.state ? p.state : {};
      var api = window.ETHONEWorkspaces || (window.Ethone && window.Ethone.get && window.Ethone.get("workspaces"));
      return api && typeof api.scopedState === "function" ? api.scopedState(base) : base;
    } catch (e) {
      return {};
    }
  }
  function activeWorkspace() {
    try {
      var api = window.ETHONEWorkspaces || (window.Ethone && window.Ethone.get && window.Ethone.get("workspaces"));
      return api && typeof api.active === "function" ? api.active() : null;
    } catch (e) {
      return null;
    }
  }
  function currentPage() {
    var active = document.querySelector(".tab-content.active[id^='page-']");
    return active ? active.id.replace(/^page-/, "") : "dashboard";
  }
  function isAppVisible() {
    var main = document.querySelector("#main-content");
    var auth = document.querySelector("#auth-screen");
    var profileScreen = document.querySelector("#profile-screen");
    var password = document.querySelector("#password-screen");
    function hidden(el) {
      if (!el) return true;
      var cs = getComputedStyle(el);
      return el.hidden || cs.display === "none" || cs.visibility === "hidden";
    }
    return !!main && !hidden(main) && hidden(auth) && hidden(profileScreen) && hidden(password);
  }
  function list(value) {
    return Array.isArray(value) ? value : [];
  }
  function connection(s, id) {
    var c = s.connections || {};
    return c[id] || c[id && id.toLowerCase()] || (s.integrations && s.integrations[id]) || {};
  }
  function hasConnection(s, id) {
    var c = connection(s, id);
    return !!(c && (c.connected || c.username || c.userId || c.token || c.accessToken || c.widgetUrl || c.enabled || c.data));
  }
  function focusRunning() {
    try {
      var end = Number(localStorage.getItem("pomo_end") || 0);
      var idx = Number(localStorage.getItem("pomo_idx") || 0);
      return !!end && end > Date.now() && idx === 0;
    } catch (e) {
      return false;
    }
  }
  function hourPart(h) {
    if (h >= 5 && h < 12) return "morning";
    if (h >= 12 && h < 18) return "afternoon";
    if (h >= 18 && h < 23) return "evening";
    return "night";
  }
  function usage() {
    try {
      return {
        scores: window.ETHONEUsageLearning && window.ETHONEUsageLearning.scores ? window.ETHONEUsageLearning.scores() : {},
        contextScores: window.ETHONEUsageLearning && window.ETHONEUsageLearning.contextScores ? window.ETHONEUsageLearning.contextScores() : {},
        preferredMode: window.ETHONEUsageLearning && window.ETHONEUsageLearning.preferredMode ? window.ETHONEUsageLearning.preferredMode() : null,
        recommendations: window.ETHONEUsageLearning && window.ETHONEUsageLearning.recommendations ? window.ETHONEUsageLearning.recommendations(null, 5) : []
      };
    } catch (e) {
      return { scores: {}, contextScores: {}, preferredMode: null, recommendations: [] };
    }
  }
  function flowState() {
    try {
      return window.ETHONEFlow && window.ETHONEFlow.state ? window.ETHONEFlow.state() : {};
    } catch (e) {
      return {};
    }
  }
  function allFlows() {
    try {
      return window.ETHONEFlow && window.ETHONEFlow.flows ? window.ETHONEFlow.flows() : [];
    } catch (e) {
      return [];
    }
  }
  function textCorpus(s, ws, page) {
    return [
      page,
      ws && ws.name,
      ws && ws.id,
      ws && ws.template,
      list(s.todos).slice(0, 24).map(function (t) { return t.title || t.text || t.name || ""; }).join(" "),
      list(s.notes).slice(0, 12).map(function (n) { return n.title || n.content || ""; }).join(" "),
      list(s.items).slice(0, 16).map(function (i) { return i.name || i.title || i.url || i.type || ""; }).join(" "),
      list(s.events).slice(0, 12).map(function (ev) { return ev.title || ev.text || ev.name || ""; }).join(" ")
    ].join(" ").toLowerCase();
  }
  function collectContext() {
    var s = appState();
    var ws = activeWorkspace();
    var now = new Date();
    var page = currentPage();
    var u = usage();
    var connections = {
      github: hasConnection(s, "github"),
      discord: hasConnection(s, "discord"),
      spotify: hasConnection(s, "spotify") || hasConnection(s, "lastfm"),
      steam: hasConnection(s, "steam"),
      twitch: hasConnection(s, "twitch"),
      obs: hasConnection(s, "obs"),
      googleCalendar: hasConnection(s, "googlecalendar") || hasConnection(s, "google-calendar"),
      googleDrive: hasConnection(s, "googledrive") || hasConnection(s, "google-drive")
    };
    var todos = list(s.todos);
    var notes = list(s.notes);
    var files = list(s.items);
    var events = list(s.events);
    var openTasks = todos.filter(function (t) { return !(t.done || t.completed); }).length;
    var corpus = textCorpus(s, ws, page);
    var activePanel = "";
    try { activePanel = window.ETHONESidePanels && window.ETHONESidePanels.state ? (window.ETHONESidePanels.state().active || "") : ""; } catch (e) {}
    return {
      ts: now.toISOString(),
      hour: now.getHours(),
      day: now.getDay(),
      part: hourPart(now.getHours()),
      page: page,
      workspace: ws ? { id: ws.id, name: ws.name, template: ws.template, accent: ws.accent } : null,
      activeFlow: flowState().activeId || "personal",
      activePanel: activePanel,
      focus: focusRunning(),
      stats: { openTasks: openTasks, doneTasks: todos.length - openTasks, notes: notes.length, files: files.length, events: events.length },
      connections: connections,
      usage: u,
      corpus: corpus,
      music: connections.spotify || /spotify|music|lastfm|now playing/.test(corpus),
      github: connections.github || /github|repo|commit|pull request|branch/.test(corpus),
      gaming: connections.steam || /valorant|steam|gaming|discord|riot|twitch|minecraft/.test(corpus),
      streaming: connections.twitch || connections.obs || /obs|stream|twitch|clips|chat/.test(corpus),
      creative: /creative|design|figma|moodboard|asset|draft|visual/.test(corpus),
      study: /study|cours|course|pdf|revision|flashcard|exam|lesson/.test(corpus)
    };
  }
  function round(n) {
    return Math.round(Math.max(0, Number(n) || 0) * 100) / 100;
  }
  function addScore(scores, id, amount, reason) {
    if (!scores[id]) scores[id] = { id: id, score: 0, reasons: [] };
    scores[id].score += amount;
    if (reason) scores[id].reasons.push(reason);
  }
  function scoreContext(ctx) {
    var scores = {};
    var usageScores = ctx.usage.contextScores || {};
    addScore(scores, "personal", 1.4, "default safe environment");
    if (ctx.part === "morning") addScore(scores, "morning", 4.2, "morning context");
    if (ctx.part === "night") addScore(scores, "night", 4.2, "night context");
    if (ctx.part === "evening") {
      addScore(scores, "night", 1.7, "evening wind-down");
      addScore(scores, "gaming", 1.8, "evening gaming window");
    }
    if (ctx.focus) addScore(scores, "study", 3.6, "focus session active");
    if (ctx.github) addScore(scores, "development", 4.3, "github or code context");
    if (ctx.gaming) addScore(scores, "gaming", 4.1, "gaming context");
    if (ctx.streaming) addScore(scores, "streaming", 4.4, "streaming context");
    if (ctx.creative) addScore(scores, "creative", 3.8, "creative assets context");
    if (ctx.study) addScore(scores, "study", 3.8, "study context");
    if (ctx.music) addScore(scores, ctx.part === "night" ? "night" : "gaming", 1.3, "music in session");
    if (/github|studio|databases|ai/.test(ctx.page)) addScore(scores, "development", 2.4, "current page");
    if (/gaming|valorant-accounts/.test(ctx.page)) addScore(scores, "gaming", 2.6, "current page");
    if (/notes|files|calendar/.test(ctx.page)) addScore(scores, "study", 1.5, "knowledge page");
    if (/journal/.test(ctx.page)) addScore(scores, "night", 2.2, "journal page");
    if (/connections/.test(ctx.page) && (ctx.connections.twitch || ctx.connections.obs)) addScore(scores, "streaming", 2, "streaming integration page");
    if (ctx.connections.googleCalendar || ctx.stats.events) addScore(scores, ctx.part === "morning" ? "morning" : "personal", 1.2, "calendar signal");
    if (ctx.stats.openTasks > 3) addScore(scores, ctx.part === "morning" ? "morning" : "study", Math.min(2.2, ctx.stats.openTasks * 0.25), "open tasks");
    if (ctx.usage.preferredMode === "development") addScore(scores, "development", 2.5, "learned habit");
    if (ctx.usage.preferredMode === "gaming") addScore(scores, "gaming", 2.5, "learned habit");
    if (ctx.usage.preferredMode === "music") addScore(scores, ctx.part === "night" ? "night" : "gaming", 1.8, "learned music habit");
    if (ctx.usage.preferredMode === "work") addScore(scores, "study", 1.7, "learned work habit");
    addScore(scores, "development", Number(usageScores.development || 0) * 0.22, "usage score");
    addScore(scores, "gaming", Number(usageScores.gaming || 0) * 0.22, "usage score");
    addScore(scores, "study", (Number(usageScores.work || 0) + Number(usageScores.focus || 0)) * 0.18, "usage score");
    addScore(scores, "night", Number(usageScores.music || 0) * 0.16, "usage score");
    var available = {};
    allFlows().forEach(function (flow) { available[flow.id] = true; });
    return Object.keys(scores).filter(function (id) { return available[id]; }).map(function (id) {
      var item = scores[id];
      item.score = round(item.score);
      item.confidence = Math.min(100, Math.round(item.score * 10));
      return item;
    }).sort(function (a, b) { return b.score - a.score; });
  }
  function flowById(id) {
    return allFlows().find(function (flow) { return flow.id === id; }) || null;
  }
  function predictionsFor(ctx, ranked) {
    var out = [];
    var top = ranked[0];
    if (top) out.push({ id: "flow-" + top.id, flow: top.id, label: "ETHONE pense que " + (flowById(top.id) ? flowById(top.id).name : top.id) + " est le meilleur contexte.", score: top.score });
    (config.predictions || []).forEach(function (pred) {
      var score = 0;
      pred.signals.forEach(function (signal) {
        if (signal === ctx.part || ctx[signal] || ctx.corpus.indexOf(signal) > -1) score += 1.4;
      });
      if (score >= 1.4) out.push({ id: pred.id, flow: pred.flow, label: pred.label, score: round(score) });
    });
    state.memory.predictions = out.slice(0, 6).map(function (item) { return Object.assign({ ts: Date.now() }, item); });
    return out.slice(0, 6);
  }
  function reasonFor(decision) {
    var flow = flowById(decision.id);
    var name = flow ? flow.name : decision.id;
    var reasons = decision.reasons.slice(0, 3).join(", ");
    return name + " recommande: " + reasons + ".";
  }
  function shouldSkipSuggestion(flowId) {
    var key = flowId + ":" + new Date().toISOString().slice(0, 10);
    var dismissed = state.memory.dismissed || {};
    return !!dismissed[key];
  }
  function rememberFlow(flowId, kind, ctx, score) {
    state.memory.flowHistory.unshift({ flow: flowId, kind: kind, page: ctx.page, part: ctx.part, day: ctx.day, score: score, ts: Date.now() });
    state.memory.flowHistory = state.memory.flowHistory.slice(0, 80);
    var key = [ctx.day, ctx.part, flowId].join(":");
    var habit = state.memory.habits[key] || { count: 0, flow: flowId, day: ctx.day, part: ctx.part, last: 0 };
    habit.count += 1;
    habit.last = Date.now();
    state.memory.habits[key] = habit;
    saveSoon();
  }
  function decide(options) {
    if (!state.settings.enabled || !isAppVisible()) return null;
    var ctx = collectContext();
    var ranked = scoreContext(ctx);
    var top = ranked[0] || null;
    var predictions = predictionsFor(ctx, ranked);
    var signature = [ctx.page, ctx.part, ctx.activeFlow, top && top.id, top && Math.floor(top.score)].join("|");
    state.lastContext = ctx;
    state.lastDecision = { context: ctx, ranked: ranked, recommended: top, predictions: predictions };
    if (signature !== state.lastSignature) {
      state.lastSignature = signature;
      try { window.dispatchEvent(new CustomEvent("ethone:brain-os-context", { detail: clone(state.lastDecision) })); } catch (e) {}
    }
    if (!top || top.id === ctx.activeFlow) {
      renderIfOpen();
      return state.lastDecision;
    }
    if (top.score >= state.settings.autoApplyThreshold && state.settings.automationLevel === "auto") {
      if (window.ETHONEFlow && typeof window.ETHONEFlow.apply === "function") {
        window.ETHONEFlow.apply(top.id, { silent: false, source: "brain-os" });
        rememberFlow(top.id, "auto", ctx, top.score);
      }
    } else if (top.score >= state.settings.suggestThreshold && state.settings.automationLevel !== "off" && !shouldSkipSuggestion(top.id) && (!options || options.silent !== true)) {
      if (window.ETHONEFlow && typeof window.ETHONEFlow.suggest === "function") {
        window.ETHONEFlow.suggest(top.id, reasonFor(top));
        rememberFlow(top.id, "suggested", ctx, top.score);
      }
    }
    renderIfOpen();
    return state.lastDecision;
  }
  function schedule(delay, options) {
    clearTimeout(state.timer);
    state.timer = setTimeout(function () { decide(options || {}); }, delay || 220);
  }
  function runAction(id, context) {
    try {
      if (window.ACTION_REGISTRY && window.ACTION_REGISTRY.run) return window.ACTION_REGISTRY.run(id, context || { source: "brain-os-v5" });
      if (typeof window.runAction === "function") return window.runAction(id, context || { source: "brain-os-v5" });
    } catch (e) {
      console.warn("[Brain OS V5] action failed", id, e);
    }
    return false;
  }
  function openPanel(panel) {
    try {
      if (window.ETHONESidePanels && window.ETHONESidePanels.open) window.ETHONESidePanels.open(panel, { toast: false });
    } catch (e) {}
  }
  function openCommandCenter() {
    if (!isAppVisible()) return false;
    ensureRoot();
    state.open = true;
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
    render();
    setTimeout(function () {
      var input = root && root.querySelector("#bos-search");
      if (input) input.focus({ preventScroll: true });
    }, 40);
    return true;
  }
  function closeCommandCenter() {
    if (!root) return;
    state.open = false;
    root.classList.remove("open");
    root.setAttribute("aria-hidden", "true");
  }
  function toggleCommandCenter() {
    return state.open ? closeCommandCenter() : openCommandCenter();
  }
  function ensureRoot() {
    if (root && root.isConnected) return root;
    root = document.createElement("section");
    root.id = "brain-os-v5-root";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML =
      '<div class="bos-backdrop" data-bos-close></div>' +
      '<div class="bos-shell" role="dialog" aria-modal="true" aria-label="ETHONE Brain OS Command Center">' +
        '<header class="bos-head"><div class="bos-title"><span class="bos-orb">' + icon("brain-circuit") + '</span><div><strong>Brain OS Command Center</strong><span id="bos-subtitle">Context Engine active</span></div></div><button class="bos-close" type="button" data-bos-close aria-label="Close">' + icon("x") + '</button></header>' +
        '<div class="bos-search-row"><input class="bos-search" id="bos-search" autocomplete="off" placeholder="Search pages, widgets, actions, flows..."><button class="bos-button primary" type="button" data-bos-run="brain.open">' + icon("brain") + '<span>Ask Brain</span></button></div>' +
        '<div class="bos-body" id="bos-body"></div>' +
      '</div>';
    document.body.appendChild(root);
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    renderIcons(root);
    return root;
  }
  function contextName(ctx) {
    return [ctx.workspace && ctx.workspace.name || "ETHONE", ctx.page, ctx.part].join(" / ");
  }
  function kpi(label, value) {
    return '<div class="bos-kpi"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong></div>';
  }
  function chip(label, iconName) {
    return '<span class="bos-chip">' + icon(iconName || "sparkles") + esc(label) + '</span>';
  }
  function recommendedHTML(decision) {
    var rec = decision && decision.recommended;
    var ctx = decision && decision.context || collectContext();
    if (!rec) return '<section class="bos-card"><h3>Recommended Flow</h3><div class="bos-empty">No strong context yet.</div></section>';
    var flow = flowById(rec.id) || { name: rec.id, icon: "sparkles", description: "" };
    return '<section class="bos-card bos-flow-card">' +
      '<span class="bos-orb">' + icon(flow.icon || "sparkles") + '</span>' +
      '<div><h3>Recommended Flow</h3><strong>' + esc(flow.name) + '</strong><p>' + esc(reasonFor(rec)) + '</p><div class="bos-score" style="--score:' + Math.min(100, rec.confidence) + '%"><i></i></div><div class="bos-actions"><button class="bos-button primary" type="button" data-bos-flow="' + esc(rec.id) + '">' + icon("play") + '<span>Apply</span></button><button class="bos-button" type="button" data-bos-suggest="' + esc(rec.id) + '">' + icon("sparkles") + '<span>Suggest</span></button></div></div>' +
    '</section>';
  }
  function predictionsHTML(decision) {
    var predictions = decision && decision.predictions || [];
    return '<section class="bos-card"><h3>ETHONE pense que...</h3><div class="bos-list">' + (predictions.length ? predictions.map(function (p) {
      return '<div class="bos-row"><span class="bos-row-icon">' + icon("sparkles") + '</span><div><strong>' + esc(p.label) + '</strong><small>Score ' + esc(p.score) + '</small></div><button class="bos-button" type="button" data-bos-flow="' + esc(p.flow) + '">Open</button></div>';
    }).join("") : '<div class="bos-empty">Predictions will appear after more activity.</div>') + '</div></section>';
  }
  function rankedHTML(decision) {
    var ranked = decision && decision.ranked || [];
    return '<section class="bos-card"><h3>Context Engine</h3><div class="bos-list">' + ranked.slice(0, 6).map(function (item) {
      var flow = flowById(item.id) || { name: item.id, icon: "circle" };
      return '<div class="bos-row"><span class="bos-row-icon">' + icon(flow.icon || "circle") + '</span><div><strong>' + esc(flow.name) + '</strong><small>' + esc(item.reasons.slice(0, 2).join(", ")) + '</small></div><span class="bos-chip">' + item.confidence + '%</span></div>';
    }).join("") + '</div></section>';
  }
  function automationsHTML() {
    return '<section class="bos-card"><h3>Smart Automations</h3><p>Automation stays under your control. Auto mode only applies high-confidence Flow changes.</p><div class="bos-list">' + (config.automations || []).map(function (a) {
      return '<div class="bos-row"><span class="bos-row-icon">' + icon("zap") + '</span><div><strong>' + esc(a.label) + '</strong><small>' + esc(a.description) + '</small></div><button class="bos-button" type="button" data-bos-run="' + esc(a.action) + '">Run</button></div>';
    }).join("") + '</div></section>';
  }
  function settingsHTML() {
    return '<section class="bos-card"><h3>Brain OS Settings</h3>' +
      '<div class="bos-setting"><div><strong>Brain OS</strong><p>Enable context analysis and Smart Flow recommendations.</p></div><button class="bos-button ' + (state.settings.enabled ? "primary" : "") + '" type="button" data-bos-toggle-enabled>' + (state.settings.enabled ? "On" : "Off") + '</button></div>' +
      '<div class="bos-setting"><div><strong>Automation level</strong><p>Suggest keeps the user in control. Auto applies only high-confidence Flows.</p></div><select data-bos-setting="automationLevel"><option value="off"' + (state.settings.automationLevel === "off" ? " selected" : "") + '>Off</option><option value="suggest"' + (state.settings.automationLevel === "suggest" ? " selected" : "") + '>Suggest</option><option value="auto"' + (state.settings.automationLevel === "auto" ? " selected" : "") + '>Auto</option></select></div>' +
      '<div class="bos-setting"><div><strong>Learning</strong><p>Store lightweight local habits for better predictions.</p></div><button class="bos-button ' + (state.settings.learning ? "primary" : "") + '" type="button" data-bos-toggle-learning>' + (state.settings.learning ? "On" : "Off") + '</button></div>' +
      '<div class="bos-actions"><button class="bos-button" type="button" data-bos-reset>Reset Brain OS memory</button></div>' +
    '</section>';
  }
  function searchResults(query) {
    query = String(query || "").trim().toLowerCase();
    if (!query) return [];
    var rows = [
      ["flow.open", "ETHONE Flow", "Change or build a Flow", "shuffle"],
      ["brainos.command.open", "Brain OS Command Center", "Open intelligence center", "brain-circuit"],
      ["missionControl.open", "Mission Control", "View global OS overview", "panels-top-left"],
      ["brain.open", "ETHONE AI", "Ask Brain", "brain"],
      ["settings.open", "Settings", "Open system settings", "settings"],
      ["activity.open", "Activity", "Open Activity & Insights", "activity"],
      ["widgets.open", "Widgets", "Manage widgets", "panel-right-open"],
      ["marketplace.open", "Marketplace", "Open marketplace", "store"]
    ];
    allFlows().forEach(function (flow) { rows.push(["flow." + flow.id, flow.name, flow.description || "Apply Flow", flow.icon || "sparkles"]); });
    return rows.map(function (r) {
      var hay = (r[0] + " " + r[1] + " " + r[2]).toLowerCase();
      var score = hay.indexOf(query) > -1 ? 100 : 0;
      query.split(/\s+/).forEach(function (part) { if (part && hay.indexOf(part) > -1) score += 20; });
      return { action: r[0], label: r[1], body: r[2], icon: r[3], score: score };
    }).filter(function (r) { return r.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 10);
  }
  function searchHTML() {
    var results = searchResults(state.query);
    if (!state.query) return "";
    return '<section class="bos-card"><h3>Search</h3><div class="bos-list">' + (results.length ? results.map(function (r) {
      return '<button class="bos-result" type="button" data-bos-run="' + esc(r.action) + '"><span class="bos-row-icon">' + icon(r.icon) + '</span><span><strong>' + esc(r.label) + '</strong><small>' + esc(r.body) + '</small></span><em>' + esc(r.action) + '</em></button>';
    }).join("") : '<div class="bos-empty">No result.</div>') + '</div></section>';
  }
  function render() {
    if (!root) return;
    var decision = state.lastDecision || decide({ silent: true }) || {};
    var ctx = decision.context || collectContext();
    var subtitle = root.querySelector("#bos-subtitle");
    if (subtitle) subtitle.textContent = contextName(ctx);
    var body = root.querySelector("#bos-body");
    if (!body) return;
    body.innerHTML =
      searchHTML() +
      '<div class="bos-grid"><div class="bos-column">' +
        recommendedHTML(decision) +
        '<section class="bos-card"><h3>Today Context</h3><div class="bos-kpis">' + kpi("Tasks", ctx.stats.openTasks) + kpi("Notes", ctx.stats.notes) + kpi("Files", ctx.stats.files) + kpi("Events", ctx.stats.events) + '</div><div class="bos-chip-row">' + chip(ctx.part, "clock") + chip(ctx.page, "app-window") + chip(ctx.workspace && ctx.workspace.name || "Workspace", "layout-grid") + chip(ctx.activeFlow, "shuffle") + '</div></section>' +
        rankedHTML(decision) +
      '</div><div class="bos-column">' +
        predictionsHTML(decision) +
        automationsHTML() +
        settingsHTML() +
      '</div></div>';
    renderIcons(root);
  }
  function renderIfOpen() {
    if (state.open) render();
  }
  function onClick(event) {
    var close = event.target.closest("[data-bos-close]");
    if (close) { closeCommandCenter(); return; }
    var flow = event.target.closest("[data-bos-flow]");
    if (flow) {
      var id = flow.dataset.bosFlow;
      if (window.ETHONEFlow && window.ETHONEFlow.apply) window.ETHONEFlow.apply(id, { source: "brain-os-command" });
      var ctx = state.lastContext || collectContext();
      rememberFlow(id, "manual", ctx, 10);
      render();
      return;
    }
    var suggest = event.target.closest("[data-bos-suggest]");
    if (suggest) {
      if (window.ETHONEFlow && window.ETHONEFlow.suggest) window.ETHONEFlow.suggest(suggest.dataset.bosSuggest, "Brain OS recommends this context.");
      return;
    }
    var run = event.target.closest("[data-bos-run]");
    if (run) {
      var action = run.dataset.bosRun;
      if (action === "brainos.applyRecommended") {
        var rec = state.lastDecision && state.lastDecision.recommended;
        if (rec && window.ETHONEFlow) window.ETHONEFlow.apply(rec.id, { source: "brain-os-automation" });
      } else if (action === "brain.open") {
        openPanel("ai");
        runAction("brain.open", { source: "brain-os-v5" });
      } else {
        runAction(action, { source: "brain-os-v5" });
      }
      return;
    }
    if (event.target.closest("[data-bos-toggle-enabled]")) {
      state.settings.enabled = !state.settings.enabled;
      saveSoon();
      schedule(20, { silent: true });
      render();
      return;
    }
    if (event.target.closest("[data-bos-toggle-learning]")) {
      state.settings.learning = !state.settings.learning;
      saveSoon();
      render();
      return;
    }
    if (event.target.closest("[data-bos-reset]")) {
      state.memory = { habits: {}, flowHistory: [], dismissed: {}, predictions: [] };
      saveSoon();
      render();
    }
  }
  function onInput(event) {
    if (!event.target || event.target.id !== "bos-search") return;
    state.query = event.target.value || "";
    clearTimeout(state.timer);
    state.timer = setTimeout(render, 80);
  }
  function onSettingChange(event) {
    var el = event.target && event.target.closest && event.target.closest("[data-bos-setting]");
    if (!el) return;
    state.settings[el.dataset.bosSetting] = el.value;
    saveSoon();
    schedule(20, { silent: true });
  }
  function isTyping(target) {
    if (!target) return false;
    var tag = String(target.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
  }
  function registerActions() {
    var A = window.ACTION_REGISTRY || window.ETHONEActions || (window.Ethone && window.Ethone.get && window.Ethone.get("actions"));
    if (!A || !A.register || registerActions.done) return;
    registerActions.done = true;
    A.register("brainos.command.open", { label: "Brain OS Command Center", handler: openCommandCenter });
    A.register("brainos.open", { label: "Brain OS Command Center", handler: openCommandCenter });
    A.register("brainos.evaluate", { label: "Evaluate context", handler: function () { decide({ silent: false }); openCommandCenter(); } });
    A.register("brainos.applyRecommended", { label: "Apply recommended Flow", handler: function () {
      var d = decide({ silent: true });
      var rec = d && d.recommended;
      if (rec && window.ETHONEFlow) window.ETHONEFlow.apply(rec.id, { source: "brain-os-action" });
    } });
  }
  function loadState() {
    var saved = readJSON(STORE_KEY, null);
    if (saved && saved.settings) state.settings = Object.assign({}, DEFAULTS, saved.settings);
    if (saved && saved.memory) state.memory = Object.assign(state.memory, saved.memory);
  }
  function loadConfig() {
    return fetch(DATA_URL, { cache: "no-store" })
      .then(function (res) { return res && res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && Array.isArray(data.contexts)) {
          config = data;
          state.settings = Object.assign({}, data.defaults || DEFAULTS, state.settings || {});
        }
      })
      .catch(function () {})
      .then(function () { schedule(500); });
  }
  function boot() {
    loadState();
    loadConfig();
    registerActions();
    setTimeout(registerActions, 500);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { ensureRoot(); schedule(900); }, { once: true });
    } else {
      ensureRoot();
      schedule(900);
    }
    document.addEventListener("change", onSettingChange, true);
    document.addEventListener("keydown", function (event) {
      if (state.open && event.key === "Escape") { event.preventDefault(); closeCommandCenter(); return; }
      var commandCombo = (event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === "Space" || event.key === " ");
      if (commandCombo && !isTyping(event.target)) {
        event.preventDefault();
        toggleCommandCenter();
      }
    }, true);
    ["ethone:page-ready", "ethone:workspace-change", "ethone:workspace-update", "ethone:flow-change", "ethone:side-panel-open", "ethone:usage-learning", "ethone:memory-event", "ethone:timeline"].forEach(function (name) {
      window.addEventListener(name, function () { schedule(260); });
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) schedule(160); });
  }
  window.ETHONEBrainOSV5 = {
    context: collectContext,
    decide: decide,
    open: openCommandCenter,
    close: closeCommandCenter,
    toggle: toggleCommandCenter,
    settings: function () { return clone(state.settings); },
    memory: function () { return clone(state.memory); },
    predictions: function () { return clone(state.memory.predictions || []); },
    state: function () { return clone(state); }
  };
  boot();
})();
