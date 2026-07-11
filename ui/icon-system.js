/* ETHONE Icon System runtime: one Lucide-based icon layer for the UI. */
(function () {
  "use strict";
  if (window.__ethoneIconSystem) return;
  window.__ethoneIconSystem = true;

  var scheduled = false;
  var pendingRoots = [];
  var lastLucideAt = 0;
  var lucideTimer = 0;
  var observerStarted = false;

  var ICON_SHELL_SELECTOR = [
    ".nav-icon",
    ".sidebar-icon",
    ".os-nav-icon",
    ".settings-nav-icon",
    ".dock-icon",
    ".app-icon",
    ".mob-icon",
    ".cmd-item-icon",
    ".item-icon",
    ".panel-title-icon",
    ".stat-card-icon",
    ".conn-icon",
    ".game-card-logo",
    ".ih-logo",
    ".ih-mini-logo",
    ".ph-logo",
    ".ec-kicker",
    ".ec-stat > i",
    ".health-metric > i",
    ".health-row > span:first-child > i",
    ".timeline-event-icon",
    ".ethone-toast-icon",
    ".notif-empty-icon",
    ".activity-empty-icon",
    ".va-empty-icon",
    ".ps-empty-icon",
    ".empty-icon",
    ".d4-ws-active-icon",
    ".d4-ws-card-icon",
    ".d4-quick-action > i",
    ".d4-mini-row > i",
    ".space-card-icon",
    ".spaces-preview-mark",
    ".eps-template-icon",
    ".live-panel-icon-btn"
    ,"#mob-topbar-avatar"
    ,"#link-preview-banner"
    ,"[id$='-fallback']"
    ,".dc-card-avatar-fallback"
    ,".conn-preview-avatar span"
    ,".sb-wc-art"
    ,".sb-wc-art span"
    ,".lfm-now-art-placeholder"
    ,".lfm-track-art-ph"
    ,".lfm-artist-art-ph"
    ,".dc-badge-v2"
  ].join(",");

  var LEADING_ICON_TEXT_SELECTOR = [
    ".panel-title",
    ".modal-title",
    ".cat-tab",
    ".toggle-label",
    ".upload-zone-text",
    ".empty-state",
    ".conn-title",
    ".game-card-title",
    ".settings-card-title",
    ".btn",
    "button",
    ".ai-suggestion",
    ".aie-chip",
    ".aie-copilot-title",
    ".lfm-now-art-placeholder",
    ".lfm-track-art-ph",
    ".lfm-artist-art-ph",
    ".dc-badge-v2"
  ].join(",");

  var TEXT_PLACEHOLDER_MAP = {
    "ai": "brain",
    "br": "brain",
    "os": "panel-top",
    "dev": "code-2",
    "gg": "gamepad-2",
    "st": "graduation-cap",
    "on": "radio",
    "cal": "calendar-days",
    "task": "square-check-big",
    "tasks": "square-check-big",
    "note": "notebook-pen",
    "theme": "palette",
    "save": "save",
    "tl": "activity",
    "n": "notebook-pen",
    "f": "file",
    "t": "timer",
    "h": "clock",
    "b": "bell"
  };

  var SYMBOL_ICON_MAP = {
    "+": "plus",
    "-": "minus",
    "x": "x",
    "X": "x",
    "\u00d7": "x",
    "\u2191": "arrow-up",
    "\u2193": "arrow-down",
    "\u2192": "arrow-right",
    "\u2197": "arrow-up-right",
    "\u21ba": "rotate-ccw",
    "\u21bb": "refresh-cw",
    "\u21c4": "repeat-2",
    "\u2318": "command",
    "\u2328": "keyboard",
    "\u2328\ufe0f": "keyboard",
    "\u2302": "house",
    "\u2713": "check",
    "\u2714": "check",
    "\u2715": "x",
    "\u25cf": "circle",
    "\u266a": "music",
    "\u266b": "music",
    "\u25b6": "play",
    "\u2022": "circle"
  };

  var EMOJI_ICON_MAP = {
    "\u2600": "sun",
    "\u2601": "cloud",
    "\u2602": "cloud-rain",
    "\u2604": "sparkles",
    "\u2615": "coffee",
    "\u26a0": "triangle-alert",
    "\u26a0\ufe0f": "triangle-alert",
    "\u26a1": "zap",
    "\u26a1\ufe0f": "zap",
    "\u2694": "swords",
    "\u2694\ufe0f": "swords",
    "\u2699": "settings",
    "\u2699\ufe0f": "settings",
    "\u26c5": "cloud-sun",
    "\u2728": "sparkles",
    "\u2726": "sparkles",
    "\u2705": "circle-check",
    "\u274c": "circle-x",
    "\u2b06": "upload",
    "\u2b06\ufe0f": "upload",
    "\u2b07": "download",
    "\u2b07\ufe0f": "download",
    "\u{1f30d}": "globe-2",
    "\u{1f310}": "globe",
    "\u{1f319}": "moon",
    "\u{1f331}": "sprout",
    "\u{1f33f}": "leaf",
    "\u{1f389}": "party-popper",
    "\u{1f3ac}": "clapperboard",
    "\u{1f3a4}": "mic",
    "\u{1f3a5}": "video",
    "\u{1f3a8}": "palette",
    "\u{1f3ae}": "gamepad-2",
    "\u{1f3af}": "target",
    "\u{1f3b5}": "music",
    "\u{1f3b6}": "music",
    "\u{1f3c6}": "trophy",
    "\u{1f3e0}": "house",
    "\u{1f3f7}\ufe0f": "tag",
    "\u{1f4a1}": "lightbulb",
    "\u{1f4ac}": "message-circle",
    "\u{1f4bb}": "laptop",
    "\u{1f4be}": "save",
    "\u{1f4c1}": "folder",
    "\u{1f4c2}": "folder-open",
    "\u{1f4c4}": "file-text",
    "\u{1f4c5}": "calendar-days",
    "\u{1f4c8}": "trending-up",
    "\u{1f4ca}": "chart-no-axes-combined",
    "\u{1f4cb}": "clipboard-list",
    "\u{1f4cc}": "pin",
    "\u{1f4cd}": "map-pin",
    "\u{1f4d6}": "book-open",
    "\u{1f4dd}": "notebook-pen",
    "\u{1f4e6}": "package",
    "\u{1f4e7}": "mail",
    "\u{1f4f8}": "camera",
    "\u{1f464}": "user-round",
    "\u{1f50d}": "search",
    "\u{1f511}": "key-round",
    "\u{1f512}": "lock",
    "\u{1f514}": "bell",
    "\u{1f517}": "link",
    "\u{1f50c}": "plug",
    "\u{1f525}": "flame",
    "\u{1f527}": "wrench",
    "\u{1f529}": "cog",
    "\u{1f56f}\ufe0f": "flame-kindling",
    "\u{1f5bc}\ufe0f": "image",
    "\u{1f5c2}": "panels-top-left",
    "\u{1f5c2}\ufe0f": "panels-top-left",
    "\u{1f5d1}\ufe0f": "trash-2",
    "\u{1f5e3}\ufe0f": "message-square",
    "\u{1f6cd}\ufe0f": "shopping-bag",
    "\u{1f6e0}\ufe0f": "wrench",
    "\u{1f680}": "rocket",
    "\u{1f534}": "circle",
    "\u{1f465}": "users-round",
    "\u{1f9e0}": "brain",
    "\u{1f9e9}": "blocks",
    "\u{1f9ea}": "flask-conical",
    "\u{1f9f9}": "sparkles",
    "\u{1fa84}": "wand-sparkles"
  };

  function qsa(selector, root) {
    try {
      var base = root || document;
      var out = [];
      if (base.nodeType === 1 && base.matches && base.matches(selector)) out.push(base);
      return out.concat(Array.prototype.slice.call(base.querySelectorAll(selector)));
    }
    catch (error) { return []; }
  }

  function cleanKey(text) {
    return String(text || "")
      .replace(/[\u200d]/g, "")
      .replace(/\s+/g, "")
      .trim();
  }

  function normalizedTextKey(text) {
    return String(text || "").replace(/\s+/g, "").trim().toLowerCase();
  }

  function escapeAttr(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function iconForText(text) {
    var raw = String(text || "").trim();
    if (!raw) return "";
    var compact = cleanKey(raw);
    var noVariant = compact.replace(/[\ufe0e\ufe0f]/g, "");
    var textKey = normalizedTextKey(raw);
    return EMOJI_ICON_MAP[compact] ||
      EMOJI_ICON_MAP[noVariant] ||
      SYMBOL_ICON_MAP[compact] ||
      SYMBOL_ICON_MAP[noVariant] ||
      TEXT_PLACEHOLDER_MAP[textKey] ||
      "";
  }

  function createIconNode(name, inline) {
    var wrapper = document.createElement(inline ? "span" : "i");
    if (inline) wrapper.className = "ethone-inline-icon";
    wrapper.setAttribute("data-lucide", name || "sparkles");
    wrapper.setAttribute("aria-hidden", "true");
    return wrapper;
  }

  function readableLabel(el) {
    var title = el.getAttribute("title") || el.getAttribute("aria-label") || "";
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    return (title || text || "Icon").slice(0, 120);
  }

  function replaceIconShell(shell) {
    if (!shell || shell.dataset.ethoneLucideReplaced === "1") return false;
    if (shell.querySelector("svg.lucide,[data-lucide],img")) return false;

    var text = (shell.textContent || "").replace(/\s+/g, " ").trim();
    var icon = iconForText(text);
    if (!icon) return false;
    var accessibleLabel = readableLabel(shell);

    shell.dataset.ethoneLucideReplaced = "1";
    shell.dataset.ethoneOriginalIcon = text;
    shell.classList.add("ethone-icon-shell", "ethone-lucide-replaced");
    shell.textContent = "";
    shell.appendChild(createIconNode(icon, false));
    var surroundingText = shell.parentElement ? (shell.parentElement.textContent || "").replace(/\s+/g, " ").trim() : "";
    if (surroundingText) {
      shell.removeAttribute("aria-label");
      shell.setAttribute("aria-hidden", "true");
    } else if (!shell.getAttribute("aria-label")) {
      shell.setAttribute("aria-label", accessibleLabel);
    }
    return true;
  }

  function replaceLeadingTextIcon(el) {
    if (!el || el.dataset.ethoneInlineIcon === "1") return false;
    if (el.closest && el.closest("[contenteditable='true'], textarea, input, select")) return false;
    if (el.matches && el.matches(".settings-nav-icon,.nav-icon,.cmd-item-icon,.empty-icon,.conn-icon,.panel-title-icon")) return false;

    var firstText = null;
    for (var i = 0; i < el.childNodes.length; i += 1) {
      var node = el.childNodes[i];
      if (node.nodeType === 3 && node.nodeValue && node.nodeValue.trim()) {
        firstText = node;
        break;
      }
      if (node.nodeType === 1 && !node.matches(".ethone-inline-icon,svg,[data-lucide]")) break;
    }
    if (!firstText) return false;

    var value = firstText.nodeValue || "";
    var leading = value.match(/^(\s*)(\S+)([\s\u00a0]*)/);
    if (!leading) return false;
    var icon = iconForText(leading[2]);
    if (!icon) return false;

    var remainder = value.slice(leading[0].length);
    var isWholeWordPlaceholder = !remainder.trim() && !!TEXT_PLACEHOLDER_MAP[normalizedTextKey(leading[2])];
    firstText.nodeValue = isWholeWordPlaceholder ? leading[2] : remainder;
    if (firstText.nodeValue.charAt(0) !== " " && firstText.nodeValue.length) {
      firstText.nodeValue = " " + firstText.nodeValue;
    }
    el.insertBefore(createIconNode(icon, true), firstText);
    el.dataset.ethoneInlineIcon = "1";
    el.classList.add("ethone-icon-text-row");
    return true;
  }

  function normalizeSvg(root) {
    qsa("svg,[data-lucide]", root).forEach(function (icon) {
      if (icon.dataset.ethoneIconSystem === "1") return;
      icon.dataset.ethoneIconSystem = "1";
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("focusable", "false");
      icon.setAttribute("stroke-width", String(icon.getAttribute("stroke-width") || "2"));
      icon.classList.add("ethone-icon");
    });
  }

  function normalizeShells(root) {
    qsa(ICON_SHELL_SELECTOR, root).forEach(function (shell) {
      shell.classList.add("ethone-icon-shell");
      if (replaceIconShell(shell)) return;
      shell.dataset.ethoneIconShell = "1";
    });
  }

  function normalizeLeadingIcons(root) {
    qsa(LEADING_ICON_TEXT_SELECTOR, root).forEach(replaceLeadingTextIcon);
  }

  function normalizeIconButtons(root) {
    qsa("button,.btn,.nav-item,.os-nav-item,.settings-nav-item,.dropdown-item,.context-menu-item,.cmd-item,.d4-quick-action,.ui-sidebar-item", root).forEach(function (item) {
      if (!item.querySelector("svg,[data-lucide],.ethone-icon-shell,.ethone-inline-icon")) return;
      item.dataset.ethoneIconSpacing = "1";
      item.classList.add("ethone-icon-row");
      if (item.matches("button") && !item.type) item.type = "button";
      if (!item.getAttribute("aria-label")) {
        var visible = (item.textContent || "").replace(/\s+/g, " ").trim();
        if (!visible) item.setAttribute("aria-label", readableLabel(item));
      }
    });
  }

  function renderLucide(root) {
    try {
      if (!window.lucide || window.__lucideFailed || typeof window.lucide.createIcons !== "function") return;
      if (root && root !== document && root.querySelector && !root.querySelector(":not(svg)[data-lucide]")) return;
      clearTimeout(lucideTimer);
      var elapsed = Date.now() - lastLucideAt;
      lucideTimer = setTimeout(function () {
        if (!document.querySelector(":not(svg)[data-lucide]")) return;
        lastLucideAt = Date.now();
        window.lucide.createIcons({
          attrs: {
            "stroke-width": "2",
            "aria-hidden": "true",
            "focusable": "false"
          }
        });
      }, Math.max(24, 120 - elapsed));
    } catch (error) {}
  }

  function apply(root) {
    root = root || document;
    normalizeShells(root);
    normalizeLeadingIcons(root);
    normalizeSvg(root);
    normalizeIconButtons(root);
    renderLucide(root);
    normalizeSvg(root);
  }

  function schedule(root) {
    if (root && root.nodeType) pendingRoots.push(root);
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      var roots = pendingRoots.length ? pendingRoots.splice(0, 24) : [document];
      if (pendingRoots.length) pendingRoots.length = 0;
      roots = roots.filter(function (root, index, list) {
        return list.indexOf(root) === index && !list.some(function (other) { return other !== root && other.contains && other.contains(root); });
      });
      roots.forEach(function (root) { apply(root || document); });
    });
  }

  function startObserver() {
    if (observerStarted || !document.body || typeof MutationObserver !== "function") return;
    observerStarted = true;
    if (window.ETHONEDOMRuntime && typeof window.ETHONEDOMRuntime.subscribe === "function") {
      window.ETHONEDOMRuntime.subscribe("icon-system", function (batch) {
        var batchRoots = batch && Array.isArray(batch.roots) ? batch.roots : [];
        if (batch && batch.overflow) schedule(document.querySelector(".tab-content.active") || document.querySelector("#auth-screen") || document);
        else batchRoots.slice(0, 18).forEach(schedule);
      });
      window.__ethoneIconObserver = window.ETHONEDOMRuntime;
      return;
    }
    var observer = new MutationObserver(function (mutations) {
      var count = 0;
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (!node || node.nodeType !== 1) return;
          count += 1;
          if (count <= 18) schedule(node);
        });
      });
      if (count > 18) schedule(document);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.__ethoneIconObserver = observer;
  }

  function boot() {
    apply(document);
    startObserver();
    [
      "ethone:dashboard-ready",
      "ethone:page-ready",
      "ethone:boot-sequence-complete",
      "ethone:lazy-group-loaded",
      "ethone:theme-change",
      "ethone:settings-change",
      "ethone:navigation-complete",
      "ethone:command-palette-rendered"
    ].forEach(function (name) {
      window.addEventListener(name, function (event) {
        var page = event && event.detail && event.detail.page;
        var root = page ? document.getElementById("page-" + page) : document.querySelector(".tab-content.active");
        schedule(root || document);
      }, { passive: true });
    });
  }

  window.ETHONEIconSystem = {
    apply: apply,
    refresh: function () { schedule(document); },
    iconForText: iconForText,
    map: Object.assign({}, SYMBOL_ICON_MAP, EMOJI_ICON_MAP, TEXT_PLACEHOLDER_MAP)
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
