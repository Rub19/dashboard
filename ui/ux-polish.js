/*
 * ETHONE UX Polish runtime
 * Lightweight interaction layer for keyboard modality, press feedback and
 * premium tooltips. No business logic, no page rendering, no observers.
 */
(function () {
  "use strict";

  if (window.__ethoneUXPolish) return;
  window.__ethoneUXPolish = true;

  var scheduled = false;
  var pendingRoot = null;
  var tooltip = null;
  var tooltipTarget = null;
  var tooltipFrame = 0;
  var hideTimer = 0;
  var statusHost = null;
  var statusTimer = 0;
  var saveCompleteTimer = 0;
  var elementTimers = new WeakMap();

  var INTERACTIVE_SELECTOR = [
    "button",
    "a[href]",
    "input",
    "textarea",
    "select",
    "summary",
    "[role='button']",
    "[role='tab']",
    "[role='menuitem']",
    ".btn",
    ".ui-button",
    ".nav-item",
    ".os-nav-item",
    ".settings-nav-item",
    ".dropdown-item",
    ".context-menu-item",
    ".cmd-item",
    ".panel-action",
    ".item-btn",
    ".d4-button",
    ".d4-icon-button",
    ".d4-widget-btn",
    ".d4-quick-action",
    "[data-ethone-tooltip]"
  ].join(",");

  function qsa(selector, root) {
    try {
      return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    } catch (error) {
      return [];
    }
  }

  function activeSurface(event) {
    var page = event && event.detail && event.detail.page;
    if (page) {
      var pageRoot = document.getElementById("page-" + page);
      if (pageRoot) return pageRoot;
    }
    var active = document.querySelector(".tab-content.active");
    if (active) return active;
    var auth = document.getElementById("auth-screen");
    if (auth && getComputedStyle(auth).display !== "none") return auth;
    var profile = document.getElementById("profile-screen");
    if (profile && getComputedStyle(profile).display !== "none") return profile;
    return document.getElementById("main-content") || document;
  }

  function isDisabled(element) {
    return Boolean(
      element &&
      (element.disabled ||
        element.getAttribute("aria-disabled") === "true" ||
        element.classList.contains("is-disabled"))
    );
  }

  function isEditable(element) {
    return Boolean(element && element.closest("input,textarea,select,[contenteditable='true']"));
  }

  function textOf(element) {
    return String(element && element.textContent ? element.textContent : "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function lang() {
    try {
      return String(window._lang || localStorage.getItem("nexus_lang") || "fr").slice(0, 2).toLowerCase();
    } catch (error) {
      return "fr";
    }
  }

  function t(fr, en) {
    return lang() === "fr" ? fr : en;
  }

  function labelOf(element) {
    if (!element || !element.getAttribute) return "";
    return String(
      element.getAttribute("data-ethone-tooltip") ||
      element.getAttribute("data-tooltip") ||
      element.getAttribute("aria-label") ||
      element.getAttribute("data-ethone-title") ||
      element.getAttribute("title") ||
      ""
    ).trim();
  }

  function hasIcon(element) {
    return Boolean(
      element &&
      element.querySelector &&
      element.querySelector("svg,[data-lucide],.ethone-icon-shell,.ethone-emoji-badge,.icon")
    );
  }

  function isIconOnly(element) {
    var text = textOf(element);
    return hasIcon(element) && text.length <= 2;
  }

  function shouldShowTooltip(element) {
    var label = labelOf(element);
    if (!element || isDisabled(element) || !label) return false;
    return (
      element.hasAttribute("data-ethone-tooltip") ||
      element.hasAttribute("title") ||
      isIconOnly(element)
    );
  }

  function ensureTooltip() {
    if (tooltip && document.body.contains(tooltip)) return tooltip;
    tooltip = document.createElement("div");
    tooltip.id = "ethone-ux-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("aria-hidden", "true");
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function ensureStatusHost() {
    if (statusHost && document.body.contains(statusHost)) return statusHost;
    statusHost = document.createElement("div");
    statusHost.id = "ethone-ux-status";
    statusHost.setAttribute("role", "status");
    statusHost.setAttribute("aria-live", "polite");
    statusHost.setAttribute("aria-hidden", "true");
    statusHost.innerHTML = '<span class="ethone-ux-status-dot"></span><span class="ethone-ux-status-text"></span>';
    document.body.appendChild(statusHost);
    return statusHost;
  }

  function setStatus(kind, message, duration) {
    var host = ensureStatusHost();
    var text = host.querySelector(".ethone-ux-status-text");
    clearTimeout(statusTimer);
    host.className = "is-visible ethone-ux-status-" + (kind || "info");
    host.setAttribute("aria-hidden", "false");
    if (text) text.textContent = message || "";
    if (duration !== 0) {
      statusTimer = setTimeout(function () {
        host.classList.remove("is-visible");
        host.setAttribute("aria-hidden", "true");
      }, duration || 1600);
    }
  }

  function clearStatus(delay) {
    var host = ensureStatusHost();
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () {
      host.classList.remove("is-visible");
      host.setAttribute("aria-hidden", "true");
    }, delay == null ? 260 : delay);
  }

  function setElementState(element, state, duration) {
    if (!element || !element.classList || isDisabled(element)) return;
    var timer = elementTimers.get(element);
    if (timer) clearTimeout(timer);
    element.classList.remove("ethone-ux-pending", "ethone-ux-confirmed", "ethone-ux-error", "ethone-ux-dirty");
    if (state) element.classList.add("ethone-ux-" + state);
    if (state === "pending") {
      element.setAttribute("aria-busy", "true");
    } else {
      element.removeAttribute("aria-busy");
    }
    if (duration) {
      elementTimers.set(element, setTimeout(function () {
        element.classList.remove("ethone-ux-" + state);
        if (state === "pending") element.removeAttribute("aria-busy");
      }, duration));
    }
  }

  function actionNeedsStatus(id) {
    return /(?:open|load|sync|save|create|delete|connect|disconnect|refresh|import|export|install|restore|reset|switch)/i.test(String(id || ""));
  }

  function normalizeLoading(root) {
    qsa("[aria-busy='true'],[data-loading='true'],.loading,.skeleton", root).forEach(function (element) {
      if (element.matches && element.matches(INTERACTIVE_SELECTOR)) return;
      element.classList.add("ethone-ux-skeleton");
      if (!element.getAttribute("aria-live")) element.setAttribute("aria-live", "polite");
    });
  }

  function preserveNativeTitle(element) {
    if (!element || element.dataset.ethoneUxTitle === "1") return;
    var title = element.getAttribute("title");
    if (title) {
      element.dataset.ethoneTitle = title;
      element.removeAttribute("title");
    }
    element.dataset.ethoneUxTitle = "1";
  }

  function positionTooltip(element) {
    var tip = ensureTooltip();
    var rect = element.getBoundingClientRect();
    var tipRect = tip.getBoundingClientRect();
    var margin = 10;
    var x = rect.left + rect.width / 2 - tipRect.width / 2;
    var y = rect.top - tipRect.height - margin;

    if (y < margin) y = rect.bottom + margin;

    x = Math.max(margin, Math.min(window.innerWidth - tipRect.width - margin, x));
    y = Math.max(margin, Math.min(window.innerHeight - tipRect.height - margin, y));

    tip.style.transform = "translate3d(" + Math.round(x) + "px," + Math.round(y) + "px,0) scale(1)";
  }

  function showTooltip(element) {
    if (!shouldShowTooltip(element)) return;
    clearTimeout(hideTimer);
    preserveNativeTitle(element);
    tooltipTarget = element;

    var tip = ensureTooltip();
    tip.textContent = labelOf(element);
    tip.setAttribute("aria-hidden", "false");
    tip.classList.add("is-visible");
    positionTooltip(element);
  }

  function hideTooltip() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (!tooltip) return;
      tooltip.classList.remove("is-visible");
      tooltip.setAttribute("aria-hidden", "true");
      tooltip.style.transform = "translate3d(-9999px,-9999px,0) scale(.985)";
      tooltipTarget = null;
    }, 40);
  }

  function normalize(root) {
    qsa(INTERACTIVE_SELECTOR, root).forEach(function (element) {
      if (element.dataset.ethoneUxReady === "1") return;
      element.dataset.ethoneUxReady = "1";

      if (element.tagName === "BUTTON" && !element.hasAttribute("type") && !element.closest("form")) {
        element.type = "button";
      }

      if (labelOf(element) && (element.hasAttribute("title") || isIconOnly(element))) {
        preserveNativeTitle(element);
      }

      if (isDisabled(element)) {
        element.setAttribute("aria-disabled", "true");
      }
    });
    normalizeLoading(root);
  }

  function schedule(root) {
    if (root && root.nodeType) pendingRoot = root;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      var target = pendingRoot || activeSurface();
      pendingRoot = null;
      normalize(target);
    });
  }

  function closestInteractive(target) {
    return target && target.closest ? target.closest(INTERACTIVE_SELECTOR) : null;
  }

  function bindInvisibleFeedback() {
    window.addEventListener("ethone:action-start", function (event) {
      var detail = event.detail || {};
      if (detail.el) setElementState(detail.el, "pending");
      if (actionNeedsStatus(detail.id)) setStatus("loading", t("Traitement en cours...", "Working..."), 0);
    }, { passive: true });

    window.addEventListener("ethone:action-complete", function (event) {
      var detail = event.detail || {};
      if (detail.el) setElementState(detail.el, "confirmed", 520);
      if (actionNeedsStatus(detail.id)) clearStatus(360);
    }, { passive: true });

    window.addEventListener("ethone:action-unavailable", function (event) {
      var detail = event.detail || {};
      if (detail.el) setElementState(detail.el, "error", 520);
      setStatus("info", t("Cette action arrive bientot.", "This action is coming soon."), 1800);
    }, { passive: true });

    window.addEventListener("ethone:action-error", function (event) {
      var detail = event.detail || {};
      if (detail.el) setElementState(detail.el, "error", 700);
      setStatus("error", t("Impossible de terminer l'action.", "Could not complete the action."), 2600);
    }, { passive: true });

    window.addEventListener("ethone:save-start", function () {
      clearTimeout(saveCompleteTimer);
      setStatus("saving", t("Sauvegarde...", "Saving..."), 0);
    }, { passive: true });

    window.addEventListener("ethone:save-complete", function () {
      clearTimeout(saveCompleteTimer);
      saveCompleteTimer = setTimeout(function () {
        qsa(".ethone-ux-dirty").forEach(function (element) {
          element.classList.remove("ethone-ux-dirty");
        });
        setStatus("saved", t("Sauvegarde effectuee", "Saved"), 1400);
      }, 140);
    }, { passive: true });

    window.addEventListener("ethone:save-error", function () {
      setStatus("error", t("Sauvegarde locale impossible", "Local save failed"), 3200);
    }, { passive: true });

    window.addEventListener("ethone:cloud-save-error", function () {
      setStatus("warning", t("Sync cloud retardee", "Cloud sync delayed"), 2600);
    }, { passive: true });

    window.addEventListener("offline", function () {
      setStatus("warning", t("Mode hors ligne - changements gardes localement", "Offline - changes stay local"), 3600);
    }, { passive: true });

    window.addEventListener("online", function () {
      setStatus("saved", t("Connexion retrouvee", "Connection restored"), 1800);
    }, { passive: true });

    document.addEventListener("input", function (event) {
      var element = event.target && event.target.closest ? event.target.closest("input,textarea,[contenteditable='true']") : null;
      if (!element || isDisabled(element)) return;
      element.classList.add("ethone-ux-dirty");
    }, true);

    document.addEventListener("change", function (event) {
      var element = event.target && event.target.closest ? event.target.closest("input,textarea,select,[role='switch']") : null;
      if (!element || isDisabled(element)) return;
      setElementState(element, "confirmed", 420);
    }, true);
  }

  function boot() {
    normalize(activeSurface());
    bindInvisibleFeedback();

    window.addEventListener("keydown", function (event) {
      if (
        event.key === "Tab" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "Home" ||
        event.key === "End"
      ) {
        document.body.classList.add("ethone-keyboard-nav");
      }

      if (event.key === "Escape") hideTooltip();
    }, true);

    window.addEventListener("pointerdown", function (event) {
      if (!isEditable(event.target)) {
        document.body.classList.remove("ethone-keyboard-nav");
      }
    }, true);

    document.addEventListener("mouseover", function (event) {
      var element = closestInteractive(event.target);
      if (element) showTooltip(element);
    }, true);

    document.addEventListener("focusin", function (event) {
      var element = closestInteractive(event.target);
      if (element) showTooltip(element);
    }, true);

    document.addEventListener("mousemove", function () {
      if (!tooltipTarget || !tooltip || !tooltip.classList.contains("is-visible") || tooltipFrame) return;
      tooltipFrame = requestAnimationFrame(function () {
        tooltipFrame = 0;
        if (tooltipTarget && tooltip && tooltip.classList.contains("is-visible")) positionTooltip(tooltipTarget);
      });
    }, { passive: true });

    document.addEventListener("mouseout", function (event) {
      var element = closestInteractive(event.target);
      if (element && (!event.relatedTarget || !element.contains(event.relatedTarget))) {
        hideTooltip();
      }
    }, true);

    document.addEventListener("focusout", function (event) {
      if (closestInteractive(event.target)) hideTooltip();
    }, true);

    window.addEventListener("scroll", hideTooltip, true);
    window.addEventListener("resize", hideTooltip, { passive: true });

    [
      "ethone:page-ready",
      "ethone:dashboard-ready",
      "ethone:boot-sequence-complete",
      "ethone:lazy-group-loaded",
      "ethone:theme-change",
      "ethone:settings-change"
    ].forEach(function (name) {
      window.addEventListener(name, function (event) {
        schedule(name === "ethone:dashboard-ready" ? document : activeSurface(event));
      }, { passive: true });
    });

    window.addEventListener("ethone:profile-ready", function () {
      schedule(document.getElementById("profile-screen") || document);
    }, { passive: true });
  }

  window.ETHONEUXPolish = {
    refresh: function () {
      schedule(document);
    },
    status: setStatus
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
