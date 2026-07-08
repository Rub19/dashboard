/* ETHONE Emergency Performance Guard
   Stable boot is the default. Experimental OS layers are opt-in/lazy-loaded. */
(function () {
  "use strict";
  if (window.__ethoneEmergencyPerformanceGuard) return;
  window.__ethoneEmergencyPerformanceGuard = true;

  var BOOT_BUDGET_MS = 2000;
  var startedAt = Date.now();
  var params;
  try { params = new URLSearchParams(location.search || ""); }
  catch (error) { params = { get: function () { return null; }, has: function () { return false; } }; }

  function read(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  var explicitFullBoot = params.get("full") === "1" || params.get("experimental") === "1" || read("ethone:experimental-enabled", "0") === "1";
  var stableBoot = !explicitFullBoot || params.get("safe") === "1";

  window.ETHONE_STABLE_BOOT = stableBoot;
  window.ETHONE_EXPERIMENTAL_ENABLED = !stableBoot;
  window.ETHONE_LIGHT_BOOT_MODE = stableBoot || !!window.ETHONE_LIGHT_BOOT_MODE;
  window.ETHONE_DISABLE_NON_CRITICAL = stableBoot || !!window.ETHONE_DISABLE_NON_CRITICAL;
  window.__ethoneDisableExperimentalBoot = stableBoot;
  window.__ethoneSkipAIPreload = stableBoot;
  window.__ethoneSkipBrain = stableBoot;
  window.__ethoneSkipMarketplace = stableBoot;
  window.__ethoneSkipExternalWidgets = stableBoot;
  window.__ethoneSkipAnimatedBackgrounds = stableBoot;
  window.__ethoneSkipActivityTracking = stableBoot;
  window.__ethoneSkipHealthRealtime = stableBoot;

  var perf = {
    stableBoot: stableBoot,
    startedAt: startedAt,
    marks: {},
    slowModules: [],
    mark: function (name) {
      this.marks[name] = Date.now() - startedAt;
      return this.marks[name];
    },
    recordModule: function (name, duration) {
      if (duration >= 250) this.slowModules.push({ name: name, duration: duration, at: Date.now() - startedAt });
    }
  };
  window.ETHONEBootPerf = perf;

  function addClasses() {
    document.documentElement.classList.toggle("ethone-stable-boot", stableBoot);
    document.documentElement.classList.toggle("ethone-experimental-enabled", !stableBoot);
    document.documentElement.dataset.ethoneStableBoot = stableBoot ? "1" : "0";
    document.documentElement.dataset.ethoneExperimentalEnabled = stableBoot ? "0" : "1";
    if (document.body) {
      document.body.classList.toggle("ethone-stable-boot", stableBoot);
      document.body.classList.toggle("ethone-experimental-enabled", !stableBoot);
    }
  }

  function installStyle() {
    if (document.getElementById("ethone-emergency-performance-style")) return;
    var style = document.createElement("style");
    style.id = "ethone-emergency-performance-style";
    style.textContent = [
      "html.ethone-stable-boot body{--theme-animation-scale:0;}",
      "html.ethone-stable-boot :where(#ethone-desktop,#ethone-permanent-dock,#ethone-flow-root,#ethone-side-panels,#ethone-native-shell,#ethone-status-bar,#ethone-universe-root,#ethone-mission-control,#ethone-app-library,#eh-dock){display:none!important;pointer-events:none!important}",
      "html.ethone-stable-boot :where(.animated-bg,.aurora-bg,.particles-bg,.nebula-bg,.background-canvas){animation:none!important;display:none!important}",
      "html.ethone-stable-boot body.ethone-emergency-minimal :where(.live-panel,.live-panel-mobile-overlay,.widgets-panel,.desktop-window,.side-panel-shell){display:none!important;pointer-events:none!important}",
      "html.ethone-stable-boot *{scroll-behavior:auto!important}",
      "html.ethone-stable-boot [data-experimental='true']{display:none!important}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function isVisible(id) {
    try {
      var el = document.getElementById(id);
      if (!el) return false;
      var cs = getComputedStyle(el);
      var rect = el.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && rect.width > 24 && rect.height > 24;
    } catch (error) {
      return false;
    }
  }

  function enforceMinimalIfSlow() {
    if (!stableBoot) return;
    var hasSurface = isVisible("auth-screen") || isVisible("main-content") || isVisible("profile-screen") || isVisible("password-screen");
    if (hasSurface) return;
    if (document.body) document.body.classList.add("ethone-emergency-minimal");
    window.__ethoneDisableExperimentalBoot = true;
    window.__ethoneSkipAIPreload = true;
    window.__ethoneSkipBrain = true;
    window.__ethoneSkipMarketplace = true;
    window.__ethoneSkipExternalWidgets = true;
    try {
      window.dispatchEvent(new CustomEvent("ethone:boot-performance-over-budget", { detail: { budget: BOOT_BUDGET_MS, elapsed: Date.now() - startedAt } }));
    } catch (error) {}
  }

  installStyle();
  addClasses();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addClasses, { once: true });
  else addClasses();
  setTimeout(enforceMinimalIfSlow, BOOT_BUDGET_MS);
})();
