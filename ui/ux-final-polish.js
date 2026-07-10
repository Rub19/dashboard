/* ETHONE UX Final Polish runtime: lightweight interaction hygiene. */
(function () {
  "use strict";
  if (window.__ethoneUXFinalPolish) return;
  window.__ethoneUXFinalPolish = true;

  var scheduled = false;
  var pendingRoot = null;
  var observerStarted = false;
  var authSurfaceObserverStarted = false;

  var AUTH_CHROME_SELECTOR = "#mobile-topbar,#mobile-bottom-nav,#hamburger";

  var BUTTON_SELECTOR = [
    "button",
    ".btn",
    ".ui-button",
    ".ethone-button",
    ".panel-action",
    ".item-btn",
    ".cat-tab",
    ".settings-nav-item",
    ".dropdown-item",
    ".context-menu-item",
    ".cmd-pin",
    ".d4-button",
    ".d4-open-action",
    ".d4-quick-action",
    ".aic-button",
    ".mp41-btn",
    ".version-filter",
    ".tm-button",
    ".mob-nav-btn",
    "[role='button']"
  ].join(",");

  var CARD_SELECTOR = [
    ".panel",
    ".stat-card",
    ".settings-card",
    ".conn-card",
    ".game-card",
    ".note-item",
    ".todo-item",
    ".kanban-card",
    ".countdown-card",
    ".journal-entry",
    ".goal-card",
    ".pinned-card",
    ".link-card",
    ".widget",
    ".d4-card",
    ".d4-widget",
    ".aic-panel",
    ".version-panel",
    ".health-panel",
    ".mp41-card",
    ".tm-panel",
    ".ec-panel",
    ".ih-card",
    ".ph-card"
  ].join(",");

  function qsa(selector, root) {
    try {
      var base = root || document;
      var out = [];
      if (base.nodeType === 1 && base.matches && base.matches(selector)) out.push(base);
      return out.concat(Array.prototype.slice.call(base.querySelectorAll(selector)));
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

  function readableLabel(el) {
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    return (el.getAttribute("aria-label") || el.getAttribute("title") || text || el.id || "Action")
      .replace(/[-_.]+/g, " ")
      .trim()
      .slice(0, 120);
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function isUnavailable(el) {
    return !!(el.disabled || el.getAttribute("aria-disabled") === "true" || el.classList.contains("is-disabled") || el.classList.contains("ethone-is-disabled"));
  }

  function disabledReason(button) {
    var label = readableLabel(button).toLowerCase();
    if (button.id === "import-run-btn") return "Importez et validez un fichier avant de créer le contenu.";
    if (/disconnect|déconnecter/.test(label)) return "Connectez d'abord ce service.";
    if (/remove|uninstall|supprimer|désinstaller/.test(label)) return "Installez d'abord cet élément.";
    if (/update|mettre à jour/.test(label)) return "Aucune mise à jour n'est disponible.";
    return "Disponible lorsque les conditions requises sont remplies.";
  }

  function polishButtons(root) {
    qsa(BUTTON_SELECTOR, root).forEach(function (button) {
      if (button.dataset.uxFinalButton === "1") return;
      button.dataset.uxFinalButton = "1";
      button.classList.add("ethone-ux-button");
      if (button.tagName === "BUTTON" && !button.hasAttribute("type")) button.type = "button";

      var hasText = (button.textContent || "").replace(/\s+/g, "").trim().length > 0;
      var hasMedia = !!button.querySelector("svg,img,[data-lucide],.ethone-icon-shell,.ethone-inline-icon");
      if (hasMedia && !hasText) {
        button.classList.add("ethone-ux-icon-only");
        if (!button.getAttribute("aria-label")) button.setAttribute("aria-label", readableLabel(button));
      }
      if (isUnavailable(button) && !button.getAttribute("title")) {
        button.setAttribute("title", disabledReason(button));
      }
    });
  }

  function polishCards(root) {
    qsa(CARD_SELECTOR, root).forEach(function (card) {
      if (card.dataset.uxFinalCard === "1") return;
      card.dataset.uxFinalCard = "1";
      card.classList.add("ethone-ux-card");
    });
  }

  function polishControls(root) {
    qsa("input,textarea,select", root).forEach(function (control) {
      if (control.dataset.uxFinalControl === "1") return;
      control.dataset.uxFinalControl = "1";
      control.classList.add("ethone-ux-control");
      if (!control.getAttribute("aria-label")) {
        var label = "";
        if (control.id) {
          var labelEl = document.querySelector("label[for='" + cssEscape(control.id) + "']");
          if (labelEl) label = (labelEl.textContent || "").replace(/\s+/g, " ").trim();
        }
        if (!label) label = control.getAttribute("placeholder") || control.getAttribute("name") || "";
        if (label) control.setAttribute("aria-label", label.slice(0, 120));
      }
    });
  }

  function polishEmptyStates(root) {
    qsa(".empty-state,.timeline-empty,.version-empty,.health-empty,.tm-empty,.ec-empty", root).forEach(function (empty) {
      if (empty.dataset.uxFinalEmpty === "1") return;
      empty.dataset.uxFinalEmpty = "1";
      empty.classList.add("ethone-ux-empty");
    });
  }

  function syncAuthSurface() {
    var authMode = document.documentElement.classList.contains("ethone-auth-mode");
    qsa(AUTH_CHROME_SELECTOR).forEach(function (element) {
      if (authMode) {
        if (element.dataset.uxAuthSurface !== "1") {
          element.dataset.uxAuthSurface = "1";
          element.dataset.uxAuthAriaHidden = element.getAttribute("aria-hidden") || "";
        }
        try { element.inert = true; } catch (error) {}
        element.setAttribute("aria-hidden", "true");
        return;
      }
      if (element.dataset.uxAuthSurface !== "1") return;
      try { element.inert = false; } catch (error) {}
      if (element.dataset.uxAuthAriaHidden) element.setAttribute("aria-hidden", element.dataset.uxAuthAriaHidden);
      else element.removeAttribute("aria-hidden");
      delete element.dataset.uxAuthSurface;
      delete element.dataset.uxAuthAriaHidden;
    });
  }

  function apply(root) {
    root = root || document;
    polishButtons(root);
    polishCards(root);
    polishControls(root);
    polishEmptyStates(root);
    syncAuthSurface();
    try {
      if (window.ETHONEIconSystem && typeof window.ETHONEIconSystem.apply === "function") window.ETHONEIconSystem.apply(root);
    } catch (error) {}
  }

  function schedule(root) {
    if (root && root.nodeType) pendingRoot = root;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      var rootToApply = pendingRoot || document;
      pendingRoot = null;
      apply(rootToApply);
    });
  }

  function handlePressStart(event) {
    var target = event.target && event.target.closest ? event.target.closest(BUTTON_SELECTOR) : null;
    if (!target || isUnavailable(target)) return;
    target.classList.add("ethone-ux-pressed");
  }

  function handlePressEnd(event) {
    var target = event.target && event.target.closest ? event.target.closest(BUTTON_SELECTOR) : null;
    if (!target) return;
    target.classList.remove("ethone-ux-pressed");
  }

  function startObserver() {
    if (observerStarted || !document.body || typeof MutationObserver !== "function") return;
    observerStarted = true;
    if (window.ETHONEDOMRuntime && typeof window.ETHONEDOMRuntime.subscribe === "function") {
      window.ETHONEDOMRuntime.subscribe("ux-final-polish", function (batch) {
        var batchRoots = batch && Array.isArray(batch.roots) ? batch.roots : [];
        if (batch && batch.overflow) schedule(activeSurface());
        else batchRoots.slice(0, 20).forEach(schedule);
      });
      window.__ethoneUXFinalObserver = window.ETHONEDOMRuntime;
      return;
    }
    var observer = new MutationObserver(function (mutations) {
      var count = 0;
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (node && node.nodeType === 1 && count < 20) {
            count += 1;
            schedule(node);
          }
        });
      });
      if (count >= 20) schedule(activeSurface());
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.__ethoneUXFinalObserver = observer;
  }

  function startAuthSurfaceObserver() {
    if (authSurfaceObserverStarted || typeof MutationObserver !== "function") return;
    authSurfaceObserverStarted = true;
    var observer = new MutationObserver(syncAuthSurface);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.__ethoneUXFinalAuthSurfaceObserver = observer;
  }

  function boot() {
    document.documentElement.classList.add("ethone-ux-final");
    apply(activeSurface());
    startObserver();
    startAuthSurfaceObserver();
    document.addEventListener("pointerdown", handlePressStart, { passive: true });
    document.addEventListener("pointerup", handlePressEnd, { passive: true });
    document.addEventListener("pointercancel", handlePressEnd, { passive: true });
    document.addEventListener("pointerleave", handlePressEnd, { passive: true });
    [
      "ethone:dashboard-ready",
      "ethone:page-ready",
      "ethone:boot-sequence-complete",
      "ethone:lazy-group-loaded",
      "ethone:navigation-complete",
      "ethone:command-palette-rendered",
      "ethone:settings-change",
      "ethone:theme-change"
    ].forEach(function (name) {
      window.addEventListener(name, function (event) {
        var page = event && event.detail && event.detail.page;
        var root = page ? document.getElementById("page-" + page) : document.querySelector(".tab-content.active");
        schedule(name === "ethone:dashboard-ready" ? document : (root || activeSurface(event)));
      }, { passive: true });
    });
    window.addEventListener("ethone:profile-ready", function () {
      schedule(document.getElementById("profile-screen") || document);
    }, { passive: true });
  }

  window.ETHONEUXFinalPolish = {
    apply: apply,
    refresh: function () { schedule(document); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
