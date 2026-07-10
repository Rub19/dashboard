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
    if (page === "timeline") page = "activity";
    if (page === "tasks") page = "todos";
    if (page === "brain") page = "ai";
    if (!document.getElementById("page-" + page)) {
      try {
        if (
          global.ETHONELazyModules &&
          typeof global.ETHONELazyModules.canLoadPage === "function" &&
          global.ETHONELazyModules.canLoadPage(page) &&
          typeof global.ETHONELazyModules.loadForPage === "function"
        ) {
          return Promise.resolve(global.ETHONELazyModules.loadForPage(page)).then(function () {
            if (!document.getElementById("page-" + page)) {
              console.warn("[ETHONE navigation] Lazy page did not mount:", page);
              return false;
            }
            return go(page, source);
          }).catch(function (error) {
            console.warn("[ETHONE navigation] Lazy page load failed:", page, error);
            return false;
          });
        }
      } catch (e) {}
      console.warn("[ETHONE navigation] Refused unknown page:", page);
      try {
        var actions = app.get("actions");
        if (actions && typeof actions.toastUnavailable === "function") actions.toastUnavailable();
      } catch (e) {}
      return false;
    }
    var previous = current();
    app.get("events").emit("navigation:before", { from: previous, to: page, source: source || null });
    global.switchPage(page, source && source.classList ? source : null);
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
