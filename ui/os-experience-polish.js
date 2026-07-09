/* ETHONE OS Experience Polish
   Passive interaction layer: visual feedback, disabled-action guard, late-mounted refresh. */
(function () {
  "use strict";
  if (window.__ethoneOSExperiencePolish) return;
  window.__ethoneOSExperiencePolish = true;

  var ACTION_SELECTOR = [
    "[data-action-id]",
    "[data-v4-action-id]",
    "[data-eh-action]",
    "[data-flow-apply]",
    "[data-flow-open-brain-os]",
    "[data-bos-run]",
    "[data-emc-action-id]",
    ".ef-btn",
    ".bos-action",
    ".mob-nav-btn"
  ].join(",");
  var CONTROL_SELECTOR = "button,[role='button'],a,.btn,.panel-action,.item-btn,.ef-btn,.bos-action,.mob-nav-btn";
  var scheduled = false;
  var toastTimer = 0;

  function qsa(selector, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
    catch (error) { return []; }
  }

  function closest(target, selector) {
    return target && target.closest ? target.closest(selector) : null;
  }

  function isDisabled(el) {
    if (!el) return false;
    return !!(
      el.disabled ||
      el.getAttribute("aria-disabled") === "true" ||
      el.classList.contains("is-disabled") ||
      el.classList.contains("disabled") ||
      el.classList.contains("ethone-os-disabled")
    );
  }

  function labelFor(el) {
    if (!el) return "Action";
    return (
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      el.getAttribute("data-action-id") ||
      el.getAttribute("data-v4-action-id") ||
      el.getAttribute("data-eh-action") ||
      (el.textContent || "")
    ).replace(/\s+/g, " ").trim() || "Action";
  }

  function toast(message) {
    if (typeof window.toast === "function") {
      try { window.toast(message, "info"); return; } catch (error) {}
    }
    var existing = document.querySelector(".ethone-os-feedback-toast");
    if (existing) existing.remove();
    var node = document.createElement("div");
    node.className = "ethone-os-feedback-toast";
    node.setAttribute("role", "status");
    node.setAttribute("aria-live", "polite");
    node.textContent = message;
    document.body.appendChild(node);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.add("is-leaving");
      setTimeout(function () { if (node.parentNode) node.remove(); }, 220);
    }, 1900);
  }

  function acknowledge(el) {
    if (!el || el.dataset.osAckLock === "1") return;
    el.dataset.osAckLock = "1";
    el.classList.add("ethone-action-feedback", "ethone-action-ack");
    setTimeout(function () {
      el.classList.remove("ethone-action-ack");
      delete el.dataset.osAckLock;
    }, 280);
  }

  function normalizeControl(el) {
    if (!el || el.dataset.osExperiencePolished === "1") return;
    el.dataset.osExperiencePolished = "1";
    if (el.tagName === "BUTTON" && !el.hasAttribute("type")) el.type = "button";
    if (!el.getAttribute("aria-label")) {
      var label = labelFor(el);
      if (label && label.length <= 80 && !/^[._-]+$/.test(label)) el.setAttribute("aria-label", label);
    }
    if (isDisabled(el)) {
      el.classList.add("ethone-os-disabled");
      if (!el.getAttribute("title")) el.setAttribute("title", "Fonctionnalite bientot disponible");
    }
  }

  function refresh(root) {
    qsa(CONTROL_SELECTOR, root).forEach(normalizeControl);
    qsa(ACTION_SELECTOR, root).forEach(function (el) {
      if (!el.dataset.osActionReady) el.dataset.osActionReady = "1";
    });
  }

  function schedule(root) {
    if (scheduled) return;
    scheduled = true;
    var run = function () {
      scheduled = false;
      refresh(root || document);
    };
    if ("requestIdleCallback" in window) {
      try { window.requestIdleCallback(run, { timeout: 500 }); return; } catch (error) {}
    }
    setTimeout(run, 80);
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      var control = closest(event.target, CONTROL_SELECTOR);
      if (!control) return;
      if (isDisabled(control)) {
        event.preventDefault();
        event.stopPropagation();
        acknowledge(control);
        toast(labelFor(control) + " est indisponible pour le moment.");
        return;
      }
      if (closest(event.target, ACTION_SELECTOR)) acknowledge(control);
    }, true);

    document.addEventListener("keydown", function (event) {
      if ((event.key === "Enter" || event.key === " ") && closest(event.target, ACTION_SELECTOR)) {
        acknowledge(closest(event.target, CONTROL_SELECTOR));
      }
    }, true);

    ["ethone:dashboard-ready", "ethone:page-ready", "ethone:boot-sequence-complete", "ethone:theme-change", "ethone:settings-change"].forEach(function (name) {
      window.addEventListener(name, function () { schedule(document); }, { passive: true });
    });

    try {
      new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i += 1) {
          if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
            schedule(document);
            return;
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    } catch (error) {}
  }

  function boot() {
    refresh(document);
    bindEvents();
  }

  window.ETHONEOSExperiencePolish = {
    refresh: function () { schedule(document); },
    toast: toast
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
