/*
 * Widget registry with lazy mount support.
 */
(function initEthoneWidgets(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("widgets")) return;

  var widgets = new Map();

  function register(name, definition) {
    if (!name || widgets.has(name)) return false;
    widgets.set(name, definition);
    return true;
  }

  function mount(name, target, context) {
    var widget = widgets.get(name);
    if (!widget || typeof widget.mount !== "function" || !target) return false;
    widget.mount(target, context || {});
    return true;
  }

  app.define("widgets", Object.freeze({
    register: register,
    mount: mount,
    get: function get(name) {
      return widgets.get(name) || null;
    }
  }));
})(window);
