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
  var activeListeners = 0;

  function listen(target, type, handler, options, key) {
    if (!target || typeof target.addEventListener !== "function" || typeof handler !== "function") {
      return function noop() {};
    }

    var registrations = null;
    var registrationKey = "";
    if (key) {
      registrations = targets.get(target);
      if (!registrations) {
        registrations = Object.create(null);
        targets.set(target, registrations);
      }
      registrationKey = type + ":" + key;
      if (registrations[registrationKey]) registrations[registrationKey]();
      if (targets.get(target) !== registrations) targets.set(target, registrations);
    }

    var dispose = null;
    var once = !!(options && typeof options === "object" && options.once);
    var eventHandler = once ? function handleOnceEvent() {
      try { return handler.apply(this, arguments); }
      finally { if (dispose) dispose(); }
    } : handler;
    target.addEventListener(type, eventHandler, options);
    activeListeners += 1;
    var disposed = false;
    dispose = function disposeListener() {
      if (disposed) return;
      disposed = true;
      target.removeEventListener(type, eventHandler, options);
      activeListeners = Math.max(0, activeListeners - 1);
      if (registrations && registrations[registrationKey] === dispose) {
        delete registrations[registrationKey];
        if (!Object.keys(registrations).length) targets.delete(target);
      }
    };

    if (key) registrations[registrationKey] = dispose;
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

  function stats() {
    return { listeners: activeListeners };
  }

  app.define("events", Object.freeze({
    listen: listen,
    delegate: delegate,
    on: on,
    emit: emit,
    stats: stats
  }));
})(window);
