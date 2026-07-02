/*
 * Central storage service with optional namespaces.
 */
(function initEthoneStorage(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("storage")) return;

  var coreStorage = global.EthoneCore.storage;

  function namespace(prefix) {
    function key(name) {
      return prefix + ":" + name;
    }

    return Object.freeze({
      get: function get(name, fallback) {
        return coreStorage.get(key(name), fallback);
      },
      set: function set(name, value) {
        return coreStorage.set(key(name), value);
      },
      getJSON: function getJSON(name, fallback) {
        return coreStorage.getJSON(key(name), fallback);
      },
      setJSON: function setJSON(name, value) {
        return coreStorage.setJSON(key(name), value);
      }
    });
  }

  app.define("storage", Object.freeze({
    get: coreStorage.get,
    set: coreStorage.set,
    getJSON: coreStorage.getJSON,
    setJSON: coreStorage.setJSON,
    namespace: namespace
  }));
})(window);
