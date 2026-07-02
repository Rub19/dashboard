/*
 * ETHONE front-end core.
 * Small, dependency-free utilities shared by page controllers. This module
 * owns no product state and does not change application behavior.
 */
(function initEthoneCore(global) {
  "use strict";

  if (global.EthoneCore) return;

  function query(selector, root) {
    return (root || document).querySelector(selector);
  }

  function queryAll(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function replaceCharacter(character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character];
    });
  }

  function debounce(callback, delay) {
    var timer = 0;
    return function debounced() {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function invokeCallback() {
        callback.apply(context, args);
      }, delay);
    };
  }

  function readStorage(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function readJSON(key, fallback) {
    try {
      var raw = readStorage(key, null);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      return writeStorage(key, JSON.stringify(value));
    } catch (error) {
      return false;
    }
  }

  global.EthoneCore = Object.freeze({
    dom: Object.freeze({
      query: query,
      queryAll: queryAll,
      escapeHTML: escapeHTML
    }),
    storage: Object.freeze({
      get: readStorage,
      set: writeStorage,
      getJSON: readJSON,
      setJSON: writeJSON
    }),
    timing: Object.freeze({
      debounce: debounce
    })
  });
})(window);
