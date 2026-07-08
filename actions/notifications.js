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

  function center() {
    return global.ETHONENotifications || null;
  }

  function push(notification) {
    var api = center();
    if (api && typeof api.notify === "function") return api.notify(notification);
    notification = notification || {};
    return call("addNotif", [
      notification.icon || "bell",
      notification.title || notification.message || "Notification",
      notification.body || notification.sub || "",
      notification.action || null
    ]);
  }

  function history() {
    var api = center();
    return api && typeof api.history === "function" ? api.history() : [];
  }

  function markAllRead() {
    var api = center();
    if (api && typeof api.markRead === "function") return api.markRead();
    return false;
  }

  function clear() {
    var api = center();
    if (api && typeof api.clear === "function") return api.clear();
    return call("clearAllNotifs");
  }

  app.define("notifications", Object.freeze({
    toggle: toggle,
    open: open,
    close: close,
    toast: toast,
    push: push,
    history: history,
    markAllRead: markAllRead,
    clear: clear
  }));
})(window);
