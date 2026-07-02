/*
 * ETHONE application namespace.
 * Modules register stable public contracts here while legacy globals remain
 * available during the incremental migration.
 */
(function initEthoneApplication(global) {
  "use strict";

  if (global.Ethone) return;

  var modules = Object.create(null);

  function define(name, api) {
    if (!name || modules[name]) return modules[name];
    modules[name] = api;
    return api;
  }

  function get(name) {
    return modules[name] || null;
  }

  global.Ethone = {
    version: "2026.07",
    define: define,
    get: get,
    modules: modules
  };
})(window);
