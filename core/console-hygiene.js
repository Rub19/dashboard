/* ETHONE Console Hygiene
   Keeps the production console quiet while preserving diagnostics in memory.
   Enable passthrough with ?debugConsole=1 or localStorage["ethone:debug-console"]="1". */
(function initEthoneConsoleHygiene(global) {
  "use strict";
  if (global.__ethoneConsoleHygieneReady) return;
  global.__ethoneConsoleHygieneReady = true;

  var nativeConsole = global.console || {};
  var original = {
    error: nativeConsole.error ? nativeConsole.error.bind(nativeConsole) : function () {},
    warn: nativeConsole.warn ? nativeConsole.warn.bind(nativeConsole) : function () {},
    debug: nativeConsole.debug ? nativeConsole.debug.bind(nativeConsole) : function () {},
    info: nativeConsole.info ? nativeConsole.info.bind(nativeConsole) : function () {},
    log: nativeConsole.log ? nativeConsole.log.bind(nativeConsole) : function () {}
  };
  var records = [];
  var MAX_RECORDS = 160;

  function hasDebugFlag() {
    try {
      return /(?:^|[?&])debugConsole=1(?:&|$)/.test(global.location && global.location.search || "") ||
        global.localStorage.getItem("ethone:debug-console") === "1" ||
        global.localStorage.getItem("ethone:debug-qa") === "1" ||
        global.localStorage.getItem("ethone:verboseLogging") === "1";
    } catch (error) {
      return false;
    }
  }

  function serialize(value) {
    if (value == null) return String(value);
    if (value instanceof Error) return value.stack || value.message || String(value);
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try { return JSON.stringify(value); } catch (error) { return Object.prototype.toString.call(value); }
  }

  function normalizeArgs(args) {
    return Array.prototype.slice.call(args || []).map(serialize).join(" ");
  }

  function record(level, args) {
    var entry = {
      level: level,
      message: normalizeArgs(args),
      at: new Date().toISOString()
    };
    records.push(entry);
    if (records.length > MAX_RECORDS) records.splice(0, records.length - MAX_RECORDS);
    try {
      global.dispatchEvent(new CustomEvent("ethone:console-record", { detail: entry }));
    } catch (error) {}
    return entry;
  }

  function shouldPass(level) {
    if (hasDebugFlag()) return true;
    if (level === "log" || level === "info") return true;
    return false;
  }

  function wrap(level) {
    return function ethoneConsoleWrapper() {
      record(level, arguments);
      if (shouldPass(level)) return original[level].apply(nativeConsole, arguments);
    };
  }

  if (nativeConsole) {
    nativeConsole.warn = wrap("warn");
    nativeConsole.error = wrap("error");
    nativeConsole.debug = wrap("debug");
  }

  function exposeRuntimeEntry(entry) {
    try {
      if (global.document && global.document.documentElement) {
        global.document.documentElement.dataset.ethoneLastRuntimeError = JSON.stringify(entry);
      }
    } catch (error) {}
  }

  global.addEventListener("error", function (event) {
    if (!event || (!event.message && !event.error)) return;
    var value = event && event.error;
    var message = value && (value.stack || value.message) || event && event.message || "Runtime error";
    var entry = record("error", [message]);
    entry.source = event && event.filename || "";
    entry.line = Number(event && event.lineno) || 0;
    entry.column = Number(event && event.colno) || 0;
    exposeRuntimeEntry(entry);
  }, true);

  global.addEventListener("unhandledrejection", function (event) {
    var reason = event && event.reason;
    var message = reason && (reason.stack || reason.message) || String(reason || "Unhandled rejection");
    var entry = record("error", [message]);
    entry.source = "promise";
    exposeRuntimeEntry(entry);
  });

  global.ETHONEConsole = {
    records: function () { return records.slice(); },
    clear: function () { records.length = 0; },
    debugEnabled: hasDebugFlag,
    passthrough: function (enabled) {
      try { global.localStorage.setItem("ethone:debug-console", enabled ? "1" : "0"); } catch (error) {}
      return hasDebugFlag();
    },
    native: original
  };
})(window);
