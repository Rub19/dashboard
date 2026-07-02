/*
 * Shared defensive helpers.
 */
(function initEthoneGuards(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("guards")) return;

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function object(value) {
    return value && typeof value === "object" ? value : {};
  }

  function callable(value) {
    return typeof value === "function";
  }

  app.define("guards", Object.freeze({
    array: array,
    object: object,
    callable: callable
  }));
})(window);
