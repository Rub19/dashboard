/*
 * Language facade. Existing translation functions remain the source of truth.
 */
(function initEthoneLanguage(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("language")) return;

  var storage = app.get("storage").namespace("ethone");
  var supported = ["fr", "en", "es", "de"];

  function normalize(language) {
    var value = String(language || "").toLowerCase().slice(0, 2);
    return supported.indexOf(value) > -1 ? value : "fr";
  }

  function current() {
    return normalize(global._lang || document.documentElement.lang || storage.get("language", "fr"));
  }

  function set(language) {
    var next = normalize(language);
    storage.set("language", next);
    if (typeof global.setLang === "function") global.setLang(next);
    document.documentElement.lang = next;
    app.get("state").setState({ language: next });
    app.get("events").emit("language:changed", { language: next });
    return next;
  }

  function translate(key, fallback) {
    if (typeof global.t === "function") {
      var value = global.t(key);
      if (value && value !== key) return value;
    }
    return fallback == null ? key : fallback;
  }

  app.define("language", Object.freeze({
    current: current,
    set: set,
    translate: translate,
    supported: supported.slice()
  }));
})(window);
