/*
 * Theme facade. It delegates rendering to the existing theme implementation.
 */
(function initEthoneTheme(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("theme")) return;

  function current() {
    try {
      var profile = typeof global.curP === "function" ? global.curP() : null;
      return profile ? profile.themeIdx : null;
    } catch (error) {
      return null;
    }
  }

  function apply(theme) {
    if (typeof global.applyTheme === "function") global.applyTheme(theme);
    app.get("state").setState({ theme: theme });
    app.get("events").emit("theme:changed", { theme: theme });
    return theme;
  }

  app.define("theme", Object.freeze({
    current: current,
    apply: apply
  }));
})(window);
