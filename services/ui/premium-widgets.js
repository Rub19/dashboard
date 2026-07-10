/*
 * ETHONE Premium Widgets
 * Lightweight behavior layer for widget actions, state styling and contextual tools.
 * It does not mount heavy modules and it never replaces widget business logic.
 */
(function initPremiumWidgets(global) {
  "use strict";

  if (global.__ethonePremiumWidgetsReady) return;
  global.__ethonePremiumWidgetsReady = true;

  var MENU_ID = "premium-widget-menu";
  var PIN_KEY = "ethone:premium-widget-pins";
  var DETACHED_ID = "premium-widget-detached-layer";
  var enhanceTimer = 0;
  var activeWidget = null;
  var draggingWindow = null;

  function qs(selector, root) {
    try { return (root || document).querySelector(selector); } catch (error) { return null; }
  }

  function qsa(selector, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); } catch (error) { return []; }
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function icon(name) {
    return '<i data-lucide="' + name + '" aria-hidden="true"></i>';
  }

  function notify(message, type) {
    if (typeof global.toast === "function") {
      try { global.toast(message, type || "info"); return; } catch (error) {}
    }
    try {
      global.dispatchEvent(new CustomEvent("ethone:toast", { detail: { message: message, type: type || "info" } }));
    } catch (error) {}
  }

  function actions() {
    return global.ETHONEActions || global.ACTION_REGISTRY || (global.Ethone && global.Ethone.get && global.Ethone.get("actions"));
  }

  function widgetsApi() {
    return global.Ethone && global.Ethone.get ? global.Ethone.get("widgets") : null;
  }

  function storageRead(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function storageWrite(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function widgetKey(widget) {
    if (!widget) return "";
    return widget.dataset.widgetId || widget.dataset.widgetType || widget.dataset.widget || widget.id || "";
  }

  function widgetTitle(widget) {
    if (!widget) return "Widget";
    var title = qs("h1,h2,h3,h4,strong,.widget-title,.d4-panel-title,.sb-widget-title", widget);
    var text = title && title.textContent ? title.textContent.trim() : "";
    if (text) return text;
    var type = widget.dataset.widgetType || widget.dataset.widget || "Widget";
    return type.replace(/[-_]/g, " ").replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  function closestWidget(target) {
    return target && target.closest ? target.closest(".d4-widget,.sb-widget-card,.ethone-premium-widget") : null;
  }

  function createButton(action, label, iconName, shortcut, disabled) {
    return '<button type="button" data-pw-action="' + action + '"' + (disabled ? " disabled" : "") + ">" +
      icon(iconName) + '<span>' + escapeHTML(label) + "</span>" + (shortcut ? "<kbd>" + escapeHTML(shortcut) + "</kbd>" : "<kbd></kbd>") +
      "</button>";
  }

  function ensureMenu() {
    var menu = document.getElementById(MENU_ID);
    if (menu) return menu;
    menu = document.createElement("div");
    menu.id = MENU_ID;
    menu.className = "pw-widget-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Widget actions");
    document.body.appendChild(menu);
    return menu;
  }

  function hideMenu() {
    var menu = document.getElementById(MENU_ID);
    if (menu) menu.classList.remove("is-open");
    activeWidget = null;
  }

  function openMenu(widget, x, y) {
    if (!widget) return false;
    activeWidget = widget;
    var menu = ensureMenu();
    var isDashboard = widget.classList.contains("d4-widget");
    var editing = document.body && document.body.classList.contains("d4-editing");
    var pinned = widget.dataset.pinned === "true" || (qs(".d4-favorite", widget) && qs(".d4-favorite", widget).classList.contains("is-favorite"));
    menu.innerHTML =
      createButton("refresh", "Actualiser", "refresh-cw", "R") +
      createButton("pin", pinned ? "Retirer des favoris" : "Epingler", pinned ? "star-off" : "star", "P") +
      createButton("detach", "Detacher", "panel-top-open", "D") +
      createButton("snap-left", "Snap gauche", "panel-left", "[") +
      createButton("snap-right", "Snap droite", "panel-right", "]") +
      (isDashboard ? "<hr>" +
        createButton("lock", "Verrouiller", "lock", "", !editing) +
        createButton("duplicate", "Dupliquer", "copy", "", !editing) +
        createButton("hide", "Masquer", "eye-off", "", !editing) : "");
    positionMenu(menu, x, y);
    requestAnimationFrame(function () {
      menu.classList.add("is-open");
      try { if (global.lucide && !global.__lucideFailed) global.lucide.createIcons(); } catch (error) {}
    });
    return true;
  }

  function positionMenu(menu, x, y) {
    var pad = 12;
    menu.style.left = Math.max(pad, Math.min(x || pad, global.innerWidth - 260 - pad)) + "px";
    menu.style.top = Math.max(pad, Math.min(y || pad, global.innerHeight - 320 - pad)) + "px";
  }

  function setWidgetState(widget, state) {
    if (!widget) return;
    ["loading", "ready", "empty", "error"].forEach(function (name) {
      widget.classList.toggle("widget-is-" + name, state === name);
    });
    widget.dataset.widgetState = state || "ready";
    widget.setAttribute("aria-busy", state === "loading" ? "true" : "false");
  }

  function detectWidgetState(widget) {
    if (!widget) return "ready";
    if (widget.classList.contains("widget-is-error") || qs(".error,.premium-widget-error,[data-error]", widget)) return "error";
    if (widget.classList.contains("widget-is-loading") || qs(".loading,.skeleton,.pw-skeleton", widget)) return "loading";
    var body = qs(".d4-widget-body,.sb-widget-body,.widget-body", widget) || widget;
    var text = (body.textContent || "").replace(/\s+/g, " ").trim();
    var hasUsefulNode = !!qs("button,a,input,canvas,svg,img,[data-lucide],.d4-mini-row,.vh-list-row,.d4-timeline-row,.d4-quick-grid", body);
    if (!text && !hasUsefulNode) return "empty";
    return "ready";
  }

  function applyPinnedState(widget) {
    var pins = storageRead(PIN_KEY, []);
    var key = widgetKey(widget);
    if (!key) return;
    if (pins.indexOf(key) > -1) widget.dataset.pinned = "true";
  }

  function ensureWidgetAccessibility(widget) {
    if (!widget || widget.dataset.pwReady === "1") return;
    widget.dataset.pwReady = "1";
    widget.classList.add("ethone-premium-widget");
    if (!widget.hasAttribute("tabindex")) widget.tabIndex = 0;
    if (!widget.hasAttribute("role")) widget.setAttribute("role", "region");
    if (!widget.hasAttribute("aria-label")) widget.setAttribute("aria-label", widgetTitle(widget));
  }

  function ensureMiniToolbar(widget) {
    if (!widget || widget.classList.contains("d4-widget") || qs(".pw-widget-mini-toolbar", widget)) return;
    var toolbar = document.createElement("div");
    toolbar.className = "pw-widget-mini-toolbar";
    toolbar.innerHTML =
      '<button class="pw-widget-action" type="button" data-pw-action="refresh" aria-label="Actualiser">' + icon("refresh-cw") + "</button>" +
      '<button class="pw-widget-action" type="button" data-pw-action="pin" aria-label="Epingler">' + icon("star") + "</button>" +
      '<button class="pw-widget-action" type="button" data-pw-action="menu" aria-label="Actions">' + icon("more-horizontal") + "</button>";
    widget.appendChild(toolbar);
  }

  function enhance(root) {
    var scope = root || document;
    qsa(".d4-widget,.sb-widget-card,.ethone-premium-widget", scope).forEach(function (widget) {
      ensureWidgetAccessibility(widget);
      ensureMiniToolbar(widget);
      applyPinnedState(widget);
      setWidgetState(widget, detectWidgetState(widget));
    });
    try { if (global.lucide && !global.__lucideFailed) global.lucide.createIcons(); } catch (error) {}
  }

  function scheduleEnhance(root, delay) {
    clearTimeout(enhanceTimer);
    enhanceTimer = setTimeout(function () { enhance(root || document); }, typeof delay === "number" ? delay : 80);
  }

  function getWidgetConfig(id) {
    var data = storageRead("ethone:dashboard-v4-layout", null);
    var instances = data && Array.isArray(data.instances) ? data.instances : [];
    var match = instances.find(function (item) { return item && item.instanceId === id; });
    return match && match.config ? match.config : {};
  }

  function refreshWidget(widget) {
    if (!widget) return false;
    var id = widget.dataset.widgetId || "";
    var type = widget.dataset.widgetType || widget.dataset.widget || "";
    var body = qs("[data-widget-mount],.d4-widget-body,.sb-widget-body,.widget-body", widget);
    widget.classList.add("widget-is-refreshing");
    setWidgetState(widget, "loading");
    var done = function (ok) {
      setTimeout(function () {
        widget.classList.remove("widget-is-refreshing");
        widget.classList.remove("widget-is-loading");
        setWidgetState(widget, ok === false ? "error" : detectWidgetState(widget));
        scheduleEnhance(widget, 20);
      }, 260);
    };
    try {
      if (type && body) {
        var api = widgetsApi();
        var definition = api && api.get ? api.get(type) : null;
        if (definition && typeof definition.unmount === "function") {
          try { definition.unmount(body); } catch (error) {}
        }
        if (definition && typeof definition.mount === "function") {
          definition.mount(body, { instanceId: id, config: getWidgetConfig(id), home: qs("#ethone-2026-home") });
          done(true);
          notify("Widget actualise", "success");
          return true;
        }
      }
      if (typeof global.ethoneDashboardV4Render === "function") {
        global.ethoneDashboardV4Render();
        done(true);
        notify("Widget actualise", "success");
        return true;
      }
      done(true);
      notify("Widget actualise", "info");
      return true;
    } catch (error) {
      console.warn("[ETHONE Premium Widgets] refresh failed", error);
      if (body) {
        body.innerHTML = '<div class="premium-widget-error"><strong>Widget indisponible</strong><small>ETHONE a bloque une erreur pendant l actualisation.</small></div>';
      }
      done(false);
      notify("Actualisation impossible", "error");
      return false;
    }
  }

  function pinWidget(widget) {
    if (!widget) return false;
    var favorite = qs(".d4-favorite", widget);
    if (favorite) {
      favorite.click();
      widget.dataset.pinned = favorite.classList.contains("is-favorite") ? "true" : "false";
      return true;
    }
    var key = widgetKey(widget);
    if (!key) return false;
    var pins = storageRead(PIN_KEY, []);
    var idx = pins.indexOf(key);
    if (idx > -1) {
      pins.splice(idx, 1);
      widget.dataset.pinned = "false";
      notify("Widget retire des favoris", "info");
    } else {
      pins.push(key);
      widget.dataset.pinned = "true";
      notify("Widget epingle", "success");
    }
    storageWrite(PIN_KEY, pins);
    return true;
  }

  function createDetachedLayer() {
    var layer = document.getElementById(DETACHED_ID);
    if (layer) return layer;
    layer = document.createElement("div");
    layer.id = DETACHED_ID;
    document.body.appendChild(layer);
    return layer;
  }

  function stripIds(root) {
    qsa("[id]", root).forEach(function (el) { el.removeAttribute("id"); });
  }

  function detachWidget(widget, snap) {
    if (!widget) return null;
    var layer = createDetachedLayer();
    var win = document.createElement("section");
    var title = widgetTitle(widget);
    var rect = widget.getBoundingClientRect();
    win.className = "pw-detached-widget";
    win.dataset.sourceWidget = widgetKey(widget);
    win.style.left = Math.max(14, Math.min(rect.left + 18, global.innerWidth - 540)) + "px";
    win.style.top = Math.max(14, Math.min(rect.top + 18, global.innerHeight - 330)) + "px";
    win.innerHTML =
      '<header class="pw-detached-head">' +
        '<div class="pw-detached-title">' + icon("panel-top-open") + "<span>" + escapeHTML(title) + "</span></div>" +
        '<div class="pw-detached-actions">' +
          '<button class="pw-widget-action" type="button" data-pw-detached-snap="left" aria-label="Snap gauche">' + icon("panel-left") + "</button>" +
          '<button class="pw-widget-action" type="button" data-pw-detached-snap="right" aria-label="Snap droite">' + icon("panel-right") + "</button>" +
          '<button class="pw-widget-action" type="button" data-pw-detached-snap="full" aria-label="Plein ecran">' + icon("maximize-2") + "</button>" +
          '<button class="pw-widget-action" type="button" data-pw-detached-close aria-label="Fermer">' + icon("x") + "</button>" +
        "</div>" +
      "</header>" +
      '<div class="pw-detached-body"></div>';
    var clone = widget.cloneNode(true);
    clone.removeAttribute("id");
    stripIds(clone);
    clone.removeAttribute("draggable");
    clone.classList.remove("d4-dragging", "d4-drag-over", "d4-resizing");
    qsa(".d4-widget-toolbar,.pw-widget-mini-toolbar,.d4-drag,.d4-resize-handle", clone).forEach(function (el) { el.remove(); });
    qs(".pw-detached-body", win).appendChild(clone);
    layer.appendChild(win);
    if (snap) win.dataset.snap = snap;
    try { if (global.lucide && !global.__lucideFailed) global.lucide.createIcons(); } catch (error) {}
    notify("Widget detache", "success");
    return win;
  }

  function snapWidget(widget, side) {
    var win = widget && widget.classList && widget.classList.contains("pw-detached-widget") ? widget : detachWidget(widget, side);
    if (!win) return false;
    win.dataset.snap = side || "";
    return true;
  }

  function dispatchDashboardAction(widget, id) {
    var btn = qs('[data-v4-action-id="' + id + '"]', widget);
    var A = actions();
    if (!btn || !A || typeof A.dispatch !== "function") return false;
    return A.dispatch(id, { el: btn, source: "premium-widgets" });
  }

  function runWidgetAction(action, widget, anchor) {
    widget = widget || activeWidget || closestWidget(anchor);
    if (!widget) return false;
    switch (action) {
      case "refresh": return refreshWidget(widget);
      case "pin": return pinWidget(widget);
      case "detach": return !!detachWidget(widget);
      case "snap-left": return snapWidget(widget, "left");
      case "snap-right": return snapWidget(widget, "right");
      case "menu": {
        var rect = widget.getBoundingClientRect();
        return openMenu(widget, rect.right - 230, rect.top + 36);
      }
      case "lock": return dispatchDashboardAction(widget, "dashboard.widget.lock");
      case "duplicate": return dispatchDashboardAction(widget, "dashboard.widget.duplicate");
      case "hide": return dispatchDashboardAction(widget, "dashboard.widget.hide");
      default: return false;
    }
  }

  function registerActions() {
    var A = actions();
    if (!A || typeof A.register !== "function") return false;
    function reg(id, label, handler) {
      try {
        if (A.has && A.has(id)) return;
        A.register(id, { label: label, handler: handler });
      } catch (error) {}
    }
    reg("widget.refresh", "Refresh widget", function (ctx) { return runWidgetAction("refresh", closestWidget(ctx && ctx.el), ctx && ctx.el); });
    reg("widget.pin", "Pin widget", function (ctx) { return runWidgetAction("pin", closestWidget(ctx && ctx.el), ctx && ctx.el); });
    reg("widget.detach", "Detach widget", function (ctx) { return runWidgetAction("detach", closestWidget(ctx && ctx.el), ctx && ctx.el); });
    reg("widget.snap.left", "Snap widget left", function (ctx) { return runWidgetAction("snap-left", closestWidget(ctx && ctx.el), ctx && ctx.el); });
    reg("widget.snap.right", "Snap widget right", function (ctx) { return runWidgetAction("snap-right", closestWidget(ctx && ctx.el), ctx && ctx.el); });
    reg("widget.menu", "Widget menu", function (ctx) { return runWidgetAction("menu", closestWidget(ctx && ctx.el), ctx && ctx.el); });
    reg("dashboard.widget.refresh", "Refresh dashboard widget", function (ctx) { return runWidgetAction("refresh", closestWidget(ctx && ctx.el), ctx && ctx.el); });
    reg("dashboard.widget.detach", "Detach dashboard widget", function (ctx) { return runWidgetAction("detach", closestWidget(ctx && ctx.el), ctx && ctx.el); });
    reg("dashboard.widget.snapLeft", "Snap dashboard widget left", function (ctx) { return runWidgetAction("snap-left", closestWidget(ctx && ctx.el), ctx && ctx.el); });
    reg("dashboard.widget.snapRight", "Snap dashboard widget right", function (ctx) { return runWidgetAction("snap-right", closestWidget(ctx && ctx.el), ctx && ctx.el); });
    reg("dashboard.widget.menu", "Dashboard widget menu", function (ctx) { return runWidgetAction("menu", closestWidget(ctx && ctx.el), ctx && ctx.el); });
    return true;
  }

  function bindGlobalEvents() {
    document.addEventListener("contextmenu", function (event) {
      var widget = closestWidget(event.target);
      if (!widget) return;
      event.preventDefault();
      openMenu(widget, event.clientX, event.clientY);
    });

    document.addEventListener("click", function (event) {
      var menu = document.getElementById(MENU_ID);
      var menuAction = event.target && event.target.closest ? event.target.closest("[data-pw-action]") : null;
      if (menuAction) {
        event.preventDefault();
        runWidgetAction(menuAction.dataset.pwAction, closestWidget(menuAction) || activeWidget, menuAction);
        hideMenu();
        return;
      }
      if (menu && menu.classList.contains("is-open") && !menu.contains(event.target)) hideMenu();

      var close = event.target && event.target.closest ? event.target.closest("[data-pw-detached-close]") : null;
      if (close) {
        var win = close.closest(".pw-detached-widget");
        if (win) win.remove();
        return;
      }
      var snap = event.target && event.target.closest ? event.target.closest("[data-pw-detached-snap]") : null;
      if (snap) {
        var detached = snap.closest(".pw-detached-widget");
        if (detached) detached.dataset.snap = snap.dataset.pwDetachedSnap || "";
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        hideMenu();
        return;
      }
      var widget = closestWidget(document.activeElement);
      if (!widget || /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName || "")) return;
      var key = event.key.toLowerCase();
      if (key === "r") { event.preventDefault(); refreshWidget(widget); }
      else if (key === "p") { event.preventDefault(); pinWidget(widget); }
      else if (key === "d") { event.preventDefault(); detachWidget(widget); }
      else if (event.key === "[") { event.preventDefault(); snapWidget(widget, "left"); }
      else if (event.key === "]") { event.preventDefault(); snapWidget(widget, "right"); }
    });

    document.addEventListener("mousedown", function (event) {
      var head = event.target && event.target.closest ? event.target.closest(".pw-detached-head") : null;
      if (!head) return;
      var win = head.closest(".pw-detached-widget");
      if (!win) return;
      draggingWindow = {
        win: win,
        startX: event.clientX,
        startY: event.clientY,
        left: win.offsetLeft,
        top: win.offsetTop
      };
      win.dataset.snap = "";
      event.preventDefault();
    });

    document.addEventListener("mousemove", function (event) {
      if (!draggingWindow) return;
      var left = Math.max(8, Math.min(global.innerWidth - 120, draggingWindow.left + event.clientX - draggingWindow.startX));
      var top = Math.max(8, Math.min(global.innerHeight - 80, draggingWindow.top + event.clientY - draggingWindow.startY));
      draggingWindow.win.style.left = left + "px";
      draggingWindow.win.style.top = top + "px";
    });

    document.addEventListener("mouseup", function () {
      draggingWindow = null;
    });

    ["ethone:dashboard-ready", "ethone:page-ready", "ethone:boot-sequence-complete", "ethone:widgets-updated", "ethone:dashboard-widgets-changed"].forEach(function (name) {
      global.addEventListener(name, function () {
        registerActions();
        scheduleEnhance(document, 90);
      });
    });
  }

  function boot() {
    registerActions();
    bindGlobalEvents();
    scheduleEnhance(document, 80);
  }

  global.ETHONEPremiumWidgets = {
    enhance: enhance,
    refresh: refreshWidget,
    pin: pinWidget,
    detach: detachWidget,
    snap: snapWidget,
    menu: openMenu,
    registerActions: registerActions
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(window);
