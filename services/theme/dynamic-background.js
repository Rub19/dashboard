/* ETHONE Dynamic Background Engine
   Lightweight context-aware ambience. No canvas, no requestAnimationFrame. */
(function () {
  "use strict";
  if (window.__ethoneDynamicBackgroundReady) return;
  window.__ethoneDynamicBackgroundReady = true;

  var UPDATE_MS = 60000;
  var timer = 0;
  var pending = 0;
  var lastSignature = "";
  var lastContext = null;

  var MODE_ACCENTS = {
    personal: "#8b5cf6",
    focus: "#8b5cf6",
    dev: "#22d3ee",
    development: "#22d3ee",
    study: "#c084fc",
    gaming: "#a855f7",
    streaming: "#d946ef",
    music: "#1db954",
    night: "#818cf8"
  };

  function profile() {
    try { return typeof window.curP === "function" ? window.curP() : null; } catch (e) { return null; }
  }

  function storage(key) {
    try { return window.localStorage ? localStorage.getItem(key) : ""; } catch (e) { return ""; }
  }

  function reducedMotion() {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
      if (document.documentElement.classList.contains("ethone-motion-off")) return true;
      var p = profile();
      return !!(p && p.theme && Number(p.theme.motion) <= 0.06);
    } catch (e) { return false; }
  }

  function disabled() {
    try {
      var p = profile();
      var t = p && p.theme || {};
      if (t.dynamicBackground === false || t.animatedBackground === false || t.background === "static") return true;
    } catch (e) {}
    return false;
  }

  function motionGuarded() {
    try { return !!(window.ETHONE_SAFE_MODE || window.__ethoneSkipAnimatedBackgrounds); } catch (e) { return false; }
  }

  function hexToRgb(hex) {
    hex = String(hex || "#8b5cf6").trim();
    if (hex.charAt(0) !== "#") return "";
    if (hex.length === 4) hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "";
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ].join(",");
  }

  function cssRgbVar(name) {
    try {
      var value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return /^\d+,\s*\d+,\s*\d+$/.test(value) ? value : "";
    } catch (e) { return ""; }
  }

  function setVar(name, value) {
    try { document.documentElement.style.setProperty(name, String(value)); } catch (e) {}
  }

  function ensureLayer() {
    if (!document.body) return;
    var layer = document.getElementById("ethone-dynamic-background");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "ethone-dynamic-background";
      document.body.insertBefore(layer, document.body.firstChild);
    }
    layer.className = "ethone-dynamic-background";
    layer.setAttribute("aria-hidden", "true");
    var vignette = document.getElementById("ethone-dynamic-vignette");
    if (!vignette) {
      vignette = document.createElement("div");
      vignette.id = "ethone-dynamic-vignette";
      document.body.insertBefore(vignette, document.body.firstChild);
    }
    vignette.className = "ethone-dynamic-vignette";
    vignette.setAttribute("aria-hidden", "true");
    document.documentElement.classList.add("ethone-dynamic-bg-ready");
  }

  function timeContext(now) {
    var h = (now || new Date()).getHours();
    if (h >= 5 && h < 11) return "morning";
    if (h >= 11 && h < 17) return "day";
    if (h >= 17 && h < 22) return "evening";
    return "night";
  }

  function currentPage() {
    try {
      var active = document.querySelector(".tab-content.active,[data-qa-page].active,.page.active");
      if (active && active.id) return active.id.replace(/^page-/, "");
      if (document.body.dataset.page) return document.body.dataset.page;
      var nav = document.querySelector("#main-sidebar .nav-item.active[data-page],.nav-item.active[data-page]");
      if (nav) return nav.getAttribute("data-page") || "";
    } catch (e) {}
    return "";
  }

  function activeSpace() {
    try {
      if (window.ETHONEWorkspaces && typeof window.ETHONEWorkspaces.active === "function") return window.ETHONEWorkspaces.active();
    } catch (e) {}
    return null;
  }

  function activeFlow() {
    try {
      if (window.ETHONEFlow && typeof window.ETHONEFlow.state === "function") {
        var state = window.ETHONEFlow.state();
        return state && (state.activeId || state.flow || state.current) || "";
      }
    } catch (e) {}
    try {
      var raw = JSON.parse(storage("ethone:flow:v1") || "{}");
      return raw.activeId || raw.current || "";
    } catch (e) {}
    return "";
  }

  function focusActive() {
    var end = Number(storage("pomo_end") || 0);
    if (end && end > Date.now()) return true;
    try {
      var p = profile(), s = p && p.state || {};
      return !!(s.focusActive || s.currentFocus || (s.pomodoro && s.pomodoro.running));
    } catch (e) { return false; }
  }

  function weatherSignal() {
    try {
      var p = profile(), s = p && p.state || {};
      var w = s.weatherCache || s.weather || {};
      var text = [
        w.main, w.condition, w.description, w.desc, w.weather, w.icon
      ].join(" ").toLowerCase();
      if (/rain|storm|drizzle|thunder|shower|pluie|orage/.test(text)) return "weather-rain";
      if (/snow|sleet|neige/.test(text)) return "weather-rain";
      if (/clear|sun|soleil|ensoleille/.test(text)) return "weather-clear";
    } catch (e) {}
    return "";
  }

  function musicActive() {
    try {
      var p = profile(), s = p && p.state || {}, c = s.connections || {};
      if (c.spotify && (c.spotify.widgetUrl || c.spotify.connected || c.spotify.status === "connected")) return true;
      if (c.lastfm && (c.lastfm.username || c.lastfm.connected)) return true;
      var eq = document.getElementById("np-fallback-eq");
      // Spotify owns this inline display flag. Reading it avoids a synchronous
      // style/layout flush while a page is mounting.
      if (eq && eq.style.display !== "none") return true;
    } catch (e) {}
    return false;
  }

  function mapMode(value) {
    value = String(value || "").toLowerCase();
    if (/gaming|game|valorant|steam|twitch/.test(value)) return "gaming";
    if (/stream/.test(value)) return "streaming";
    if (/dev|github|code|developer|development|database|studio/.test(value)) return "dev";
    if (/study|school|notes|files|learn|etude|étude|student/.test(value)) return "study";
    if (/focus|work|task|todo|goal|habit|calendar/.test(value)) return "focus";
    if (/music|spotify|lastfm/.test(value)) return "music";
    return "";
  }

  function modeFromContext(time) {
    if (focusActive()) return "focus";
    var space = activeSpace();
    var flow = activeFlow();
    var page = currentPage();
    var fromFlow = mapMode(flow);
    if (fromFlow) return fromFlow;
    if (space) {
      var fromSpace = mapMode([space.id, space.name, space.template, space.data && space.data.template, space.dashboard && space.dashboard.template].join(" "));
      if (fromSpace) return fromSpace;
    }
    var fromPage = mapMode(page);
    if (fromPage) return fromPage;
    if (time === "night") return "night";
    return "personal";
  }

  function context() {
    var t = timeContext();
    var mode = modeFromContext(t);
    var space = activeSpace();
    var flow = activeFlow();
    var signals = [];
    var weather = weatherSignal();
    if (weather) signals.push(weather);
    if (musicActive()) signals.push("music");
    if (flow) signals.push("flow-" + flow);
    var accent = "";
    if (space && space.accent) accent = hexToRgb(space.accent);
    if (!accent && MODE_ACCENTS[mode]) accent = hexToRgb(MODE_ACCENTS[mode]);
    if (!accent) accent = cssRgbVar("--space-accent-rgb") || cssRgbVar("--accent-rgb") || cssRgbVar("--primary-rgb") || "139,92,246";
    return {
      time: t,
      mode: mode,
      page: currentPage(),
      space: space && space.id || "",
      flow: flow || "",
      signals: signals.sort(),
      accent: accent,
      motion: !motionGuarded() && !reducedMotion() && !disabled()
    };
  }

  function apply(next, options) {
    options = options || {};
    ensureLayer();
    var root = document.documentElement;
    if (disabled()) {
      root.dataset.ethoneBgEngine = "disabled";
      root.dataset.ethoneBgMotion = "off";
      root.classList.remove("ethone-dynamic-bg-ready");
      return;
    }
    var signature = [
      next.time, next.mode, next.page, next.space, next.flow, next.signals.join(","), next.accent, next.motion ? "1" : "0"
    ].join("|");
    if (!options.force && signature === lastSignature) return;
    lastSignature = signature;
    lastContext = next;
    root.dataset.ethoneBgEngine = "dynamic";
    root.dataset.ethoneBgContext = next.time;
    root.dataset.ethoneBgMode = next.mode;
    root.dataset.ethoneBgSignal = next.signals.join(" ");
    root.dataset.ethoneBgSpace = next.space || "";
    root.dataset.ethoneBgFlow = next.flow || "";
    root.dataset.ethoneBgMotion = next.motion ? "on" : "off";
    setVar("--ethone-dynamic-bg-accent", next.accent);
    try { window.dispatchEvent(new CustomEvent("ethone:dynamic-background-change", { detail: next })); } catch (e) {}
  }

  function refresh(options) {
    if (pending) clearTimeout(pending);
    pending = setTimeout(function () {
      pending = 0;
      apply(context(), options || {});
    }, options && options.immediate ? 0 : 80);
  }

  function bind() {
    [
      "ethone:page-ready",
      "ethone:dashboard-ready",
      "ethone:workspace-change",
      "ethone:space-transition-end",
      "ethone:flow-change",
      "ethone:theme-changed",
      "ethone:profile-switched"
    ].forEach(function (eventName) {
      window.addEventListener(eventName, function () { refresh(); });
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refresh({ force: true });
    });
    window.addEventListener("storage", function (event) {
      if (!event || /pomo|flow|workspace|profile|theme|weather|spotify|lastfm/i.test(event.key || "")) refresh();
    });
    timer = setInterval(function () { refresh(); }, UPDATE_MS);
  }

  function boot() {
    ensureLayer();
    bind();
    refresh({ immediate: true, force: true });
    setTimeout(function () { refresh({ force: true }); }, 900);
  }

  window.ETHONEDynamicBackground = {
    refresh: function () { refresh({ force: true }); },
    context: function () { return Object.assign({}, lastContext || context()); },
    stop: function () { if (timer) clearInterval(timer); timer = 0; },
    start: function () { if (!timer) timer = setInterval(function () { refresh(); }, UPDATE_MS); refresh({ force: true }); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
