/*
 * Central event registry and application event bus.
 * Keyed listeners replace a previous registration instead of accumulating.
 */
(function initEthoneEvents(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("events")) return;

  var targets = new WeakMap();
  var bus = document.createDocumentFragment();

  function listen(target, type, handler, options, key) {
    if (!target || typeof target.addEventListener !== "function" || typeof handler !== "function") {
      return function noop() {};
    }

    if (key) {
      var registrations = targets.get(target);
      if (!registrations) {
        registrations = Object.create(null);
        targets.set(target, registrations);
      }
      var registrationKey = type + ":" + key;
      if (registrations[registrationKey]) registrations[registrationKey]();
    }

    target.addEventListener(type, handler, options);
    var disposed = false;
    var dispose = function disposeListener() {
      if (disposed) return;
      disposed = true;
      target.removeEventListener(type, handler, options);
    };

    if (key) targets.get(target)[type + ":" + key] = dispose;
    return dispose;
  }

  function delegate(target, type, selector, handler, options, key) {
    return listen(target, type, function handleDelegatedEvent(event) {
      var matched = event.target && event.target.closest ? event.target.closest(selector) : null;
      if (matched && target.contains(matched)) handler(event, matched);
    }, options, key);
  }

  function on(name, handler, options) {
    return listen(bus, name, handler, options);
  }

  function emit(name, detail) {
    bus.dispatchEvent(new CustomEvent(name, { detail: detail }));
  }

  app.define("events", Object.freeze({
    listen: listen,
    delegate: delegate,
    on: on,
    emit: emit
  }));
})(window);
