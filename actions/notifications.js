/*
 * Notification facade for panel and toast behavior.
 */
(function initEthoneNotifications(global) {
  "use strict";

  var app = global.Ethone;
  if (!app || app.get("notifications")) return;

  function call(name, args) {
    return typeof global[name] === "function" ? global[name].apply(global, args || []) : false;
  }

  function toggle() {
    return call("toggleNotifPanel");
  }

  function open() {
    return call("openNotifPanel");
  }

  function close() {
    return call("closeNotifPanel");
  }

  function toast(message, type) {
    if (typeof global.toast === "function") return global.toast(message, type);
    return call("showToast", [message, type]);
  }

  app.define("notifications", Object.freeze({
    toggle: toggle,
    open: open,
    close: close,
    toast: toast
  }));
})(window);
