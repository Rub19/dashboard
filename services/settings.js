/*
 * Settings facade for profile-backed preferences.
 */
(function initEthoneSettings(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("settings")) return;

  function profile() {
    try {
      return typeof global.curP === "function" ? global.curP() : null;
    } catch (error) {
      return null;
    }
  }

  function get(name, fallback) {
    var currentProfile = profile();
    if (!currentProfile || !currentProfile.state) return fallback;
    return currentProfile.state[name] == null ? fallback : currentProfile.state[name];
  }

  function set(name, value) {
    var currentProfile = profile();
    if (!currentProfile) return false;
    if (!currentProfile.state) currentProfile.state = {};
    currentProfile.state[name] = value;
    if (typeof global.saveStateNow === "function") global.saveStateNow();
    app.get("events").emit("settings:changed", { name: name, value: value });
    return true;
  }

  app.define("settings", Object.freeze({
    profile: profile,
    get: get,
    set: set
  }));
})(window);
