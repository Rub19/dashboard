/*
 * Centralized action dispatch facade.
 * Every clickable action anywhere in the app should register a descriptor
 * here and be invoked exclusively through dispatch() — no ad-hoc onclick
 * branching. Descriptors carry enabled/disabled state so "not implemented
 * yet" is a registry-level fact (uniform toast), not a per-caller check.
 */
(function initEthoneActionRegistry(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("actions")) return;

  var registry = Object.create(null);

  function register(id, descriptor) {
    if (!id || !descriptor || typeof descriptor.handler !== "function") return false;
    registry[id] = descriptor;
    return true;
  }

  function isEnabled(id) {
    var d = registry[id];
    if (!d) return false;
    if (typeof d.enabled === "function") return !!d.enabled();
    return d.enabled !== false;
  }

  function has(id) {
    return !!registry[id];
  }

  function notifyComingSoon(d) {
    var notifications = app.get("notifications");
    var label = (d && d.label) || "";
    var msg = (label ? label + " — " : "") + comingSoonLabel();
    if (notifications && typeof notifications.toast === "function") notifications.toast(msg, "info");
  }

  function notifyFallback() {
    var notifications = app.get("notifications");
    if (notifications && typeof notifications.toast === "function") notifications.toast(fallbackLabel(), "error");
  }

  function comingSoonLabel() {
    try {
      var language = app.get("language");
      var l = language ? language.current() : "en";
      var map = { fr: "bientot disponible", en: "coming soon", es: "proximamente", de: "bald verfugbar" };
      return map[l] || map.en;
    } catch (e) { return "coming soon"; }
  }

  function fallbackLabel() {
    try {
      var language = app.get("language");
      var l = language ? language.current() : "en";
      var map = { fr: "Action indisponible", en: "Action unavailable", es: "Accion no disponible", de: "Aktion nicht verfugbar" };
      return map[l] || map.en;
    } catch (e) { return "Action unavailable"; }
  }

  function dispatch(id, context) {
    var d = registry[id];
    if (!d) {
      console.warn("[ETHONE actions] Unknown action id:", id);
      notifyFallback();
      return false;
    }
    if (!isEnabled(id)) {
      notifyComingSoon(d);
      return false;
    }
    try {
      d.handler(context || {});
      return true;
    } catch (e) {
      console.error("[ETHONE actions] Action failed:", id, e);
      notifyFallback();
      return false;
    }
  }

  app.define("actions", Object.freeze({
    register: register,
    dispatch: dispatch,
    isEnabled: isEnabled,
    has: has
  }));
})(window);
