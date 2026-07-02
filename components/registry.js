/*
 * Reusable behavior component registry.
 */
(function initEthoneComponents(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("components")) return;

  var components = new Map();

  app.define("components", Object.freeze({
    register: function register(name, component) {
      if (!name || components.has(name)) return false;
      components.set(name, component);
      return true;
    },
    get: function get(name) {
      return components.get(name) || null;
    },
    has: function has(name) {
      return components.has(name);
    }
  }));
})(window);
