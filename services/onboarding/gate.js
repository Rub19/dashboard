/* ETHONE onboarding gate.
   Keeps the full first-run experience off the dashboard path unless it is needed. */
(function initEthoneOnboardingGate(global) {
  "use strict";

  if (global.ETHONEOnboardingGate) return;

  var BASE_KEY = "ethone:first-run:v1";
  var WHATS_NEW_KEY = "ethone:whats-new:seen";
  var RELEASE_VERSION = "5.4.0";
  var DISMISS_WINDOW = 6 * 60 * 60 * 1000;
  var timer = 0;
  var requested = false;

  global.ETHONE_ONBOARDING_RELEASE_VERSION = RELEASE_VERSION;

  function profile() {
    try { return typeof global.curP === "function" ? global.curP() : null; }
    catch (error) { return null; }
  }

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch (error) { return null; }
  }

  function currentState() {
    var activeProfile = profile();
    var profileId = activeProfile && activeProfile.id != null ? String(activeProfile.id) : "global";
    var localState = readJSON(BASE_KEY + ":" + profileId) || {};
    var profileState = activeProfile && activeProfile.state && activeProfile.state.firstRun || {};
    var seenVersion = null;
    try { seenVersion = localStorage.getItem(WHATS_NEW_KEY); } catch (error) {}
    return {
      completed: !!(localState.completed || profileState.completed),
      dismissedAt: localState.dismissedAt || null,
      whatsNewSeen: seenVersion === RELEASE_VERSION,
      now: Date.now()
    };
  }

  function shouldLoad(state) {
    state = state || {};
    if (state.completed) return !state.whatsNewSeen;
    if (state.dismissedAt) {
      var dismissedAt = new Date(state.dismissedAt).getTime();
      if (isFinite(dismissedAt) && Number(state.now || Date.now()) - dismissedAt < DISMISS_WINDOW) return false;
    }
    return true;
  }

  function surfaceVisible(element) {
    if (!element || !element.isConnected || element.hidden || element.hasAttribute("inert")) return false;
    if (element.getAttribute("aria-hidden") === "true") return false;
    var style = element.style || {};
    return style.display !== "none" && style.visibility !== "hidden" && (style.opacity === "" || Number(style.opacity) !== 0);
  }

  function dashboardVisible() {
    var main = document.getElementById("main-content");
    if (!main) return false;
    var active = document.querySelector && document.querySelector(".tab-content.active[id='page-dashboard']");
    if (!active) return false;
    var auth = document.getElementById("auth-screen");
    var profileScreen = document.getElementById("profile-screen");
    var passwordScreen = document.getElementById("password-screen");
    if (surfaceVisible(auth)) return false;
    if (surfaceVisible(profileScreen)) return false;
    if (surfaceVisible(passwordScreen)) return false;
    return surfaceVisible(main);
  }

  function load(reason) {
    if (requested || !dashboardVisible() || !shouldLoad(currentState())) return false;
    var lazy = global.ETHONELazyModules;
    if (!lazy || typeof lazy.load !== "function") return false;
    requested = true;
    Promise.resolve(lazy.load("onboarding")).then(function (loaded) {
      if (!loaded) requested = false;
      try {
        global.dispatchEvent(new CustomEvent("ethone:onboarding-gate", {
          detail: { loaded: !!loaded, reason: reason || "dashboard" }
        }));
      } catch (error) {}
    }).catch(function () { requested = false; });
    return true;
  }

  function schedule(reason, delay) {
    clearTimeout(timer);
    timer = setTimeout(function () { load(reason); }, delay == null ? 80 : delay);
  }

  function boot() {
    schedule("boot", 60);
    global.addEventListener("ethone:dashboard-ready", function () { schedule("dashboard-ready", 80); }, { passive: true });
    global.addEventListener("ethone:profile-ready", function () { schedule("profile-ready", 120); }, { passive: true });
    global.addEventListener("ethone:page-ready", function (event) {
      if (event && event.detail && event.detail.page === "dashboard") schedule("page-ready", 80);
    }, { passive: true });
    global.addEventListener("storage", function (event) {
      if (!event || event.key === WHATS_NEW_KEY || String(event.key || "").indexOf(BASE_KEY) === 0) {
        requested = false;
        schedule("storage", 80);
      }
    });
  }

  global.ETHONEOnboardingGate = Object.freeze({
    shouldLoad: shouldLoad,
    load: load,
    state: currentState,
    version: RELEASE_VERSION
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(window);
