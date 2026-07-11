/*
 * ETHONE Keyboard First.
 * Global keyboard ergonomics layer: semantics, delegated activation, roving
 * focus and a lightweight shortcut HUD. No page rendering and no business logic.
 */
(function initEthoneKeyboardFirst(global) {
  "use strict";

  if (global.__ethoneKeyboardFirstReady) return;
  global.__ethoneKeyboardFirstReady = true;

  var doc = global.document;
  if (!doc) return;

  var ROOT_CLASS = "ethone-keyboard-first";
  var MODALITY_CLASS = "ethone-keyboard-nav";
  var BODY_MODALITY_CLASS = "ethone-keyboard-nav";

  var PROMOTE_SELECTOR = [
    "[onclick]:not(button):not(a):not(input):not(textarea):not(select):not(summary)",
    "[data-action-id]:not(button):not(a)",
    "[data-ethone-action]:not(button):not(a)",
    ".nav-item",
    ".os-nav-item",
    ".settings-nav-item",
    ".cat-tab",
    ".cmd-item",
    ".dropdown-item",
    ".context-menu-item",
    ".panel-action",
    ".item-btn",
    ".d4-quick-action",
    ".d4-icon-button",
    ".d4-widget-btn",
    ".d4-sd-action",
    ".mp-store-card",
    ".mp-brain-card",
    ".wm-card",
    ".d4-widget",
    ".sb-widget-card",
    ".ethone-premium-widget",
    ".pdock-item",
    ".side-rail-item",
    ".live-panel-icon-btn",
    ".theme-swatch",
    ".region-pill",
    ".avatar-opt"
  ].join(",");

  var ROVING_CONTAINERS = [
    "#sidebar-nav-main",
    "#sidebar-nav-account",
    "#main-sidebar",
    ".settings-nav",
    ".cat-tabs",
    ".ui-tabs",
    "#cmd-results",
    ".cmd-results",
    ".dropdown-menu",
    ".context-menu",
    "[role='tablist']",
    "[role='radiogroup']",
    "[role='menu']",
    "[role='listbox']",
    ".mobile-bottom-nav",
    ".pdock-rail",
    ".mp-store-grid",
    ".mp41-tabs",
    ".wm-tabs",
    ".live-panel-body"
  ].join(",");

  var FOCUSABLE_SELECTOR = [
    "button:not(:disabled)",
    "a[href]",
    "input:not(:disabled)",
    "textarea:not(:disabled)",
    "select:not(:disabled)",
    "summary",
    "[tabindex]:not([tabindex='-1'])",
    "[role='button']",
    "[role='tab']",
    "[role='radio']",
    "[role='menuitem']",
    "[role='option']"
  ].join(",");

  var shortcutHints = [
    { selector: ".search-bar,#global-search,.d4-search,[data-v4-action-id='dashboard.action.search']", shortcut: "Ctrl+K" },
    { selector: "#notif-bell-btn,[data-action-id='notifications.open']", shortcut: "Ctrl+Shift+N" },
    { selector: "#live-panel-toggle-btn,#os-sidebar-widgets,[data-action-id='widgets.open']", shortcut: "Ctrl+Alt+B" },
    { selector: ".settings-nav-item[onclick*='keyboard'],[data-settings-tab='keyboard']", shortcut: "Ctrl+/" },
    { selector: "#pomo-play-btn", shortcut: "Space" }
  ];

  var pageShortcuts = [
    ["dashboard", "Alt+1"],
    ["notes", "Alt+2"],
    ["todos", "Alt+3"],
    ["files", "Alt+4"],
    ["calendar", "Alt+5"],
    ["stats", "Alt+6"],
    ["ai", "Alt+7"],
    ["marketplace", "Alt+8"],
    ["settings", "Alt+9"]
  ];

  var scheduled = false;
  var pendingRoot = null;
  var hud = null;
  var hudTimer = 0;

  function qsa(selector, root) {
    try { return Array.prototype.slice.call((root || doc).querySelectorAll(selector)); }
    catch (error) { return []; }
  }

  function qs(selector, root) {
    try { return (root || doc).querySelector(selector); }
    catch (error) { return null; }
  }

  function surfaceVisible(element) {
    if (!element || !element.isConnected || element.hidden || element.hasAttribute("inert")) return false;
    if (element.getAttribute("aria-hidden") === "true") return false;
    var style = element.style || {};
    return style.display !== "none" && style.visibility !== "hidden" && (style.opacity === "" || Number(style.opacity) !== 0);
  }

  function activeSurface(event) {
    var page = event && event.detail && event.detail.page;
    if (page) {
      var pageRoot = qs("#page-" + page);
      if (pageRoot) return pageRoot;
    }
    var active = qs(".tab-content.active");
    if (active) return active;
    var auth = qs("#auth-screen");
    if (surfaceVisible(auth)) return auth;
    var profile = qs("#profile-screen");
    if (surfaceVisible(profile)) return profile;
    return qs("#main-content") || doc;
  }

  function isNativeInteractive(element) {
    return !!(element && /^(A|BUTTON|INPUT|TEXTAREA|SELECT|SUMMARY)$/.test(element.tagName));
  }

  function isEditable(element) {
    return !!(
      element &&
      element.closest &&
      element.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']")
    );
  }

  function isDisabled(element) {
    return !!(
      element &&
      (element.disabled ||
        element.getAttribute("aria-disabled") === "true" ||
        element.classList.contains("is-disabled") ||
        element.classList.contains("disabled"))
    );
  }

  function isVisible(element) {
    if (!element || !element.ownerDocument || !element.isConnected) return false;
    if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
    if (element.closest && element.closest("[inert],[aria-hidden='true']")) return false;
    var style = element.style || {};
    return style.display !== "none" && style.visibility !== "hidden" && (style.opacity === "" || Number(style.opacity) !== 0);
  }

  function textLabel(element) {
    return String(
      element.getAttribute("aria-label") ||
      element.getAttribute("data-ethone-tooltip") ||
      element.getAttribute("title") ||
      element.getAttribute("data-label") ||
      element.textContent ||
      ""
    ).replace(/\s+/g, " ").trim();
  }

  function isOverlaySurface(element) {
    return !!(
      element &&
      element.matches &&
      element.matches(".modal-overlay,#cmd-palette-overlay,#notif-overlay,#live-panel-mobile-overlay,.sidebar-overlay,.eh-panel-overlay,.spaces-overlay,.db-detail-overlay,.va-detail-overlay")
    );
  }

  function isFocusableCandidate(element) {
    return !!(
      element &&
      !isDisabled(element) &&
      isVisible(element) &&
      (!element.matches || !element.matches("[aria-hidden='true'],[hidden]"))
    );
  }

  function promote(element) {
    if (!element || element.dataset.kfReady === "1" || isOverlaySurface(element)) return;
    if (isNativeInteractive(element)) return;
    if (!isVisible(element)) return;

    var hasNestedControl = !!element.querySelector("button,a[href],input,textarea,select,[role='button'],[role='tab']");
    var explicitCard = element.matches(".mp-store-card,.mp-brain-card,.wm-card,.d4-widget,.sb-widget-card,.ethone-premium-widget");
    if (hasNestedControl && element.hasAttribute("onclick") && !explicitCard) return;

    var role = element.getAttribute("role");
    if (!role) {
      var interactiveRole = explicitCard && hasNestedControl
        ? "group"
        : (element.classList.contains("cat-tab") || element.classList.contains("settings-nav-item") ? "tab" : "button");
      element.setAttribute("role", interactiveRole);
    }
    if (!element.hasAttribute("tabindex")) element.tabIndex = 0;
    if (!element.getAttribute("aria-label")) {
      var label = textLabel(element);
      if (label) element.setAttribute("aria-label", label.slice(0, 120));
    }
    element.classList.add("kf-focusable");
    element.dataset.kfReady = "1";
  }

  function applyShortcutHint(element, shortcut) {
    if (!element || !shortcut) return;
    if (!element.getAttribute("aria-keyshortcuts")) {
      element.setAttribute("aria-keyshortcuts", shortcut.replace(/\+/g, "+"));
    }
    if (!element.dataset.kbdShortcut) element.dataset.kbdShortcut = shortcut;
  }

  function annotateShortcuts(root) {
    shortcutHints.forEach(function (hint) {
      qsa(hint.selector, root).forEach(function (element) { applyShortcutHint(element, hint.shortcut); });
    });
    pageShortcuts.forEach(function (pair) {
      var page = pair[0];
      var shortcut = pair[1];
      qsa("[data-page='" + page + "'],[data-action-page='" + page + "'],[onclick*=\"'" + page + "'\"],[onclick*='\"" + page + "\"']", root).forEach(function (element) {
        if (element.matches && (element.matches(".nav-item,.os-nav-item,.mob-nav-btn") || element.closest("#main-sidebar,.mobile-bottom-nav"))) {
          applyShortcutHint(element, shortcut);
        }
      });
    });
  }

  function ensureSkipLink() {
    if (qs("#ethone-skip-main")) return;
    var link = doc.createElement("a");
    link.id = "ethone-skip-main";
    link.className = "kf-skip-link";
    link.href = "#main-content";
    link.textContent = "Aller au contenu";
    link.addEventListener("click", function () {
      setTimeout(focusMain, 0);
    });
    doc.body.insertBefore(link, doc.body.firstChild || null);
  }

  function ensureHud() {
    if (!hud || !doc.body.contains(hud)) {
      hud = doc.createElement("div");
      hud.id = "ethone-keyboard-hud";
      hud.className = "kf-shortcut-hud";
      hud.setAttribute("aria-hidden", "true");
      doc.body.appendChild(hud);
    }
    var french = String(doc.documentElement.lang || "").toLowerCase().indexOf("fr") === 0;
    var labels = french
      ? ["Commandes", "Raccourcis", "Fermer", "Pages"]
      : ["Command", "Shortcuts", "Close", "Pages"];
    var localeKey = french ? "fr" : "en";
    if (hud.dataset.locale !== localeKey) {
      hud.dataset.locale = localeKey;
      hud.innerHTML =
        '<span><kbd>Ctrl K</kbd> ' + labels[0] + '</span>' +
        '<span><kbd>Ctrl /</kbd> ' + labels[1] + '</span>' +
        '<span><kbd>Esc</kbd> ' + labels[2] + '</span>' +
        '<span><kbd>Alt 1-9</kbd> ' + labels[3] + '</span>';
    }
    return hud;
  }

  function setKeyboardMode(active) {
    doc.documentElement.classList.toggle(ROOT_CLASS, true);
    doc.documentElement.classList.toggle(MODALITY_CLASS, !!active);
    if (doc.body) doc.body.classList.toggle(BODY_MODALITY_CLASS, !!active);
    var node = ensureHud();
    global.clearTimeout(hudTimer);
    if (!node) return;
    node.setAttribute("aria-hidden", active ? "false" : "true");
    if (active) {
      hudTimer = global.setTimeout(function () {
        if (node) node.setAttribute("aria-hidden", "true");
      }, 1800);
    }
  }

  function scan(root) {
    qsa(PROMOTE_SELECTOR, root || doc).forEach(promote);
    annotateShortcuts(root || doc);
  }

  function schedule(root) {
    if (root && root.nodeType) pendingRoot = root;
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(function () {
      scheduled = false;
      var target = pendingRoot || activeSurface();
      pendingRoot = null;
      scan(target);
    });
  }

  function focusMain() {
    var main = qs("#main-content") || qs(".main-content") || qs("[role='main']");
    if (!main) return false;
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    try { main.focus({ preventScroll: false }); }
    catch (error) { main.focus(); }
    return true;
  }

  function focusSidebar() {
    var sidebar = qs("#main-sidebar") || qs(".sidebar");
    if (!sidebar) return false;
    var target = qs(".nav-item.active,.nav-item[aria-current='page'],.os-nav-item.active,button,a,[role='button']", sidebar) || sidebar;
    if (!target.hasAttribute("tabindex") && !isNativeInteractive(target)) target.setAttribute("tabindex", "0");
    try { target.focus({ preventScroll: false }); }
    catch (error) { target.focus(); }
    return true;
  }

  function openShortcuts() {
    var main = qs("#main-content");
    var auth = qs("#auth-screen");
    var appVisible = surfaceVisible(main) && !surfaceVisible(auth);
    if (appVisible && global.ETHONEKeyboardShortcuts && typeof global.ETHONEKeyboardShortcuts.open === "function") {
      global.ETHONEKeyboardShortcuts.open();
      return true;
    }
    if (typeof global.openModal === "function") {
      global.openModal("shortcuts");
      return true;
    }
    return false;
  }

  function openCommand() {
    if (typeof global.openCmdPalette === "function") {
      global.openCmdPalette();
      return true;
    }
    var search = qs(".search-bar,#global-search,.d4-search");
    if (search && typeof search.click === "function") {
      search.click();
      return true;
    }
    return false;
  }

  function dispatchAction(id, context) {
    var actions = global.Ethone && global.Ethone.get && global.Ethone.get("actions");
    if (actions && typeof actions.dispatch === "function") return actions.dispatch(id, context || {});
    if (typeof global.runAction === "function") return global.runAction(id, context || {});
    return false;
  }

  function go(page) {
    if (dispatchAction(page + ".open", { source: "keyboard-first" })) return true;
    if (typeof global.switchPage === "function") {
      global.switchPage(page, null);
      return true;
    }
    return false;
  }

  function handleGlobalShortcut(event) {
    if (event.defaultPrevented) return false;
    var key = event.key;
    var ctrl = event.ctrlKey || event.metaKey;

    if (key === "F2") {
      event.preventDefault();
      if (typeof global.openMissionControl === "function") {
        global.openMissionControl();
        return true;
      }
      if (!dispatchAction("mission.open", { source: "keyboard-first" }) &&
          !dispatchAction("desktop.missionControl", { source: "keyboard-first" })) {
        openCommand();
      }
      return true;
    }

    if (ctrl && key === "/") {
      event.preventDefault();
      openShortcuts();
      return true;
    }

    if (ctrl && String(key).toLowerCase() === "k") {
      event.preventDefault();
      openCommand();
      return true;
    }

    if (event.altKey && !event.ctrlKey && !event.metaKey && /^[0-9]$/.test(key) && !isEditable(event.target)) {
      var idx = key === "0" ? -1 : parseInt(key, 10) - 1;
      event.preventDefault();
      if (idx === -1) return focusSidebar();
      var page = pageShortcuts[idx] && pageShortcuts[idx][0];
      if (page) return go(page);
    }

    if (event.altKey && !event.ctrlKey && !event.metaKey && String(key).toLowerCase() === "m" && !isEditable(event.target)) {
      event.preventDefault();
      return focusMain();
    }

    return false;
  }

  function activateFocused(event) {
    if (event.defaultPrevented || isEditable(event.target)) return false;
    if (event.key !== "Enter" && event.key !== " ") return false;
    var target = event.target && event.target.closest ? event.target.closest("[role='button'],[role='tab'],[role='radio'],[role='menuitem'],[role='option'],.kf-focusable") : null;
    if (!target || isNativeInteractive(target) || isDisabled(target) || !isVisible(target)) return false;
    event.preventDefault();
    target.classList.add("kf-key-pressed");
    setTimeout(function () { target.classList.remove("kf-key-pressed"); }, 170);
    if (typeof target.click === "function") target.click();
    return true;
  }

  function rovingItems(container) {
    return qsa(FOCUSABLE_SELECTOR, container).filter(function (element) {
      return element !== container && isFocusableCandidate(element);
    });
  }

  function closestScrollSurface(target) {
    var selector = "#sidebar-nav-main,#page-ai,#main-content,.modal,.modal-content,.modal-body,.notif-panel-body,.live-panel-body,.ai-messages";
    var current = target;
    while (current && current !== doc.body) {
      if (current.matches && current.matches(selector) && current.scrollHeight > current.clientHeight + 2) return current;
      current = current.parentElement;
    }
    var main = qs("#main-content");
    return main && main.contains(target) && main.scrollHeight > main.clientHeight + 2 ? main : null;
  }

  function handlePagedScroll(event) {
    if (event.defaultPrevented || isEditable(event.target)) return false;
    var isPagedKey = event.key === "PageDown" || event.key === "PageUp";
    var isEndpointKey = event.key === "Home" || event.key === "End";
    if (!isPagedKey && !isEndpointKey) return false;
    var container = closestScrollSurface(event.target);
    if (!container) return false;
    if (isEndpointKey && container.id === "sidebar-nav-main") return false;
    event.preventDefault();
    var reduced = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isEndpointKey) {
      container.scrollTo({ top: event.key === "End" ? container.scrollHeight : 0, behavior: reduced ? "auto" : "smooth" });
    } else {
      var direction = event.key === "PageDown" ? 1 : -1;
      container.scrollBy({ top: direction * Math.max(120, container.clientHeight * 0.82), behavior: reduced ? "auto" : "smooth" });
    }
    return true;
  }

  function handleRoving(event) {
    if (event.defaultPrevented || isEditable(event.target)) return false;
    if (!/^(ArrowDown|ArrowUp|ArrowLeft|ArrowRight|Home|End)$/.test(event.key)) return false;
    var container = event.target && event.target.closest ? event.target.closest(ROVING_CONTAINERS) : null;
    if (!container) return false;
    var items = rovingItems(container);
    if (items.length < 2) return false;
    var current = doc.activeElement;
    var index = items.indexOf(current);
    if (index < 0) {
      index = items.findIndex(function (item) {
        return item.classList.contains("active") ||
          item.classList.contains("selected") ||
          item.getAttribute("aria-selected") === "true" ||
          item.getAttribute("aria-current") === "page";
      });
    }
    if (index < 0) index = 0;
    var next = index;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % items.length;
    else next = (index - 1 + items.length) % items.length;
    event.preventDefault();
    try { items[next].focus({ preventScroll: false }); }
    catch (error) { items[next].focus(); }
    if (items[next].scrollIntoView) {
      try { items[next].scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" }); }
      catch (error) { items[next].scrollIntoView(false); }
    }
    if (container.id === "sidebar-nav-main" && (event.key === "Home" || event.key === "End")) {
      container.scrollTo({ top: event.key === "End" ? container.scrollHeight : 0, behavior: "auto" });
    }
    return true;
  }

  function registerActions() {
    var actions = global.Ethone && global.Ethone.get && global.Ethone.get("actions");
    if (!actions || typeof actions.register !== "function") return;
    actions.register("keyboard.shortcuts.open", { label: "Keyboard shortcuts", handler: openShortcuts });
    actions.register("keyboard.focus.main", { label: "Focus main content", handler: focusMain });
    actions.register("keyboard.focus.sidebar", { label: "Focus sidebar", handler: focusSidebar });
  }

  function boot() {
    doc.documentElement.classList.add(ROOT_CLASS);
    ensureSkipLink();
    ensureHud();
    scan(activeSurface());
    registerActions();

    doc.addEventListener("keydown", function (event) {
      if (event.key === "Tab" || /^Arrow/.test(event.key) || event.key === "Home" || event.key === "End" || event.ctrlKey || event.metaKey || event.altKey) {
        setKeyboardMode(true);
      }
      if (handleGlobalShortcut(event)) return;
      if (activateFocused(event)) return;
      if (handlePagedScroll(event)) return;
      handleRoving(event);
    }, false);

    doc.addEventListener("focusin", function () { setKeyboardMode(true); }, true);
    doc.addEventListener("pointerdown", function () { setKeyboardMode(false); }, true);

    [
      "ethone:page-ready",
      "ethone:dashboard-ready",
      "ethone:lazy-group-loaded",
      "ethone:settings-change",
      "ethone:command-palette-rendered"
    ].forEach(function (name) {
      global.addEventListener(name, function (event) {
        schedule(name === "ethone:dashboard-ready" ? doc : activeSurface(event));
      }, { passive: true });
    });
    global.addEventListener("ethone:profile-ready", function () { schedule(qs("#profile-screen") || doc); }, { passive: true });
    global.setTimeout(function () { schedule(activeSurface()); }, 400);
  }

  global.ETHONEKeyboardFirst = {
    refresh: function () { schedule(doc); },
    scan: scan,
    focusMain: focusMain,
    focusSidebar: focusSidebar,
    openShortcuts: openShortcuts,
    openCommand: openCommand
  };

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(window);
