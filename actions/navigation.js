/*
 * Navigation and routing facade.
 */
(function initEthoneNavigation(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("navigation")) return;

  function current() {
    var active = document.querySelector(".tab-content.active[id^='page-']");
    return active ? active.id.replace(/^page-/, "") : app.get("state").getState().page;
  }

  function go(page, source) {
    if (!page || typeof global.switchPage !== "function") return false;
    var previous = current();
    app.get("events").emit("navigation:before", { from: previous, to: page, source: source || null });
    global.switchPage(page, source || null);
    app.get("state").setState({ page: page });
    app.get("events").emit("navigation:after", { from: previous, to: page, source: source || null });
    return true;
  }

  function profile() {
    if (typeof global.goToProfileScreen !== "function") return false;
    global.goToProfileScreen();
    return true;
  }

  var api = Object.freeze({
    current: current,
    go: go,
    profile: profile
  });

  app.define("navigation", api);
  app.define("routing", api);
})(window);
