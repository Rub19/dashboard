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

  function update(name, definition) {
    if (!name || !definition) return false;
    widgets.set(name, definition);
    return true;
  }

  function mount(name, target, context) {
    var widget = widgets.get(name);
    if (!widget || typeof widget.mount !== "function" || !target) return false;
    try {
      target.closest && target.closest(".d4-widget,.sb-widget-card,.ethone-premium-widget") && target.closest(".d4-widget,.sb-widget-card,.ethone-premium-widget").classList.add("widget-is-loading");
      widget.mount(target, context || {});
      var shell = target.closest && target.closest(".d4-widget,.sb-widget-card,.ethone-premium-widget");
      if (shell) {
        shell.classList.remove("widget-is-loading", "widget-is-error");
        shell.dataset.widgetState = "ready";
      }
      return true;
    } catch (error) {
      console.warn("[ETHONE widgets] mount failed:", name, error);
      try {
        target.innerHTML = '<div class="premium-widget-error"><strong>Widget unavailable</strong><small>ETHONE isolated this widget after a render error.</small></div>';
        var errorShell = target.closest && target.closest(".d4-widget,.sb-widget-card,.ethone-premium-widget");
        if (errorShell) {
          errorShell.classList.remove("widget-is-loading");
          errorShell.classList.add("widget-is-error");
          errorShell.dataset.widgetState = "error";
        }
      } catch (renderError) {}
      return false;
    }
  }

  app.define("widgets", Object.freeze({
    register: register,
    update: update,
    mount: mount,
    get: function get(name) {
      return widgets.get(name) || null;
    },
    list: function list() {
      return Array.from(widgets.keys()).map(function (id) {
        return { id: id, definition: widgets.get(id) };
      });
    }
  }));
})(window);
