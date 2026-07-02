/*
 * Minimal observable state container.
 * Product data remains in the existing profile state until each domain is
 * migrated; this store owns only shared UI state.
 */
(function initEthoneState(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("state")) return;

  function createStore(initialState) {
    var value = Object.assign({}, initialState || {});
    var subscribers = new Set();

    function getState() {
      return value;
    }

    function setState(nextState) {
      var previous = value;
      value = typeof nextState === "function"
        ? Object.assign({}, value, nextState(value))
        : Object.assign({}, value, nextState || {});
      subscribers.forEach(function notify(subscriber) {
        subscriber(value, previous);
      });
      return value;
    }

    function subscribe(subscriber) {
      if (typeof subscriber !== "function") return function noop() {};
      subscribers.add(subscriber);
      return function unsubscribe() {
        subscribers.delete(subscriber);
      };
    }

    return Object.freeze({
      getState: getState,
      setState: setState,
      subscribe: subscribe
    });
  }

  app.define("state", createStore({
    page: "dashboard",
    language: "fr",
    theme: null,
    online: navigator.onLine !== false
  }));
  app.define("createStore", createStore);
})(window);
