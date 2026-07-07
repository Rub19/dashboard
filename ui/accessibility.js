/*
 * ETHONE accessibility normalization.
 * Adds semantics to legacy interactive surfaces without changing their logic.
 */
(function initEthoneAccessibility(global) {
  "use strict";

  if (global.__ethoneAccessibilityReady) return;
  global.__ethoneAccessibilityReady = true;

  var interactiveSelector = [
    ".stat-card[onclick]",
    ".user-card[onclick]",
    ".todo-item[onclick]",
    ".item-row[onclick]",
    ".note-list-item[onclick]",
    ".pinned-card[onclick]",
    ".journal-entry[onclick]",
    ".habit-day[onclick]",
    ".cal-day[onclick]",
    ".region-pill[onclick]",
    ".theme-swatch[onclick]",
    ".avatar-opt[onclick]",
    ".ai-session-item[onclick]",
    ".valo-match-row[onclick]",
    "#daily-focus-check[onclick]",
    "#custom-color-preview[onclick]",
    "#mob-topbar-avatar[onclick]",
    "#mob-topbar-name[onclick]"
  ].join(",");

  var buttonLabels = {
    hamburger: "Ouvrir la navigation",
    "sidebar-compact-btn": "Reduire ou agrandir la navigation",
    "notif-bell-btn": "Ouvrir les notifications",
    "theme-mode-btn": "Changer le theme",
    "topbar-avatar": "Ouvrir le profil",
    "mob-topbar-avatar": "Ouvrir le profil",
    "cd-edit-btn": "Configurer le compte a rebours",
    "pomo-play-btn": "Demarrer ou mettre en pause le minuteur",
    "eh-density-toggle": "Basculer la densite de l'interface",
    "eh-motion-toggle": "Basculer les animations"
  };

  function isNativeInteractive(element) {
    return /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(element.tagName);
  }

  function textLabel(element) {
    return (
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      (element.textContent || "").trim().replace(/\s+/g, " ")
    );
  }

  function makeKeyboardInteractive(element) {
    if (!element || isNativeInteractive(element)) return;
    if (element.closest(".modal-overlay") === element) return;
    if (element.querySelector("button,a,input,select,textarea")) return;
    element.setAttribute("role", "button");
    if (!element.hasAttribute("tabindex")) element.tabIndex = 0;
    if (!element.getAttribute("aria-label")) {
      var label = textLabel(element);
      if (label) element.setAttribute("aria-label", label.slice(0, 120));
    }
    if (element.dataset.ethoneKeyboardReady) return;
    element.dataset.ethoneKeyboardReady = "1";
    element.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      element.click();
    });
  }

  function syncTabs() {
    document.querySelectorAll(".cat-tabs").forEach(function (list) {
      list.setAttribute("role", "tablist");
      list.querySelectorAll(".cat-tab").forEach(function (tab) {
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(tab.classList.contains("active")));
      });
    });
    document.querySelectorAll(".region-pill,.theme-swatch").forEach(function (option) {
      option.setAttribute("role", "radio");
      option.setAttribute("aria-checked", String(option.classList.contains("active")));
    });
    document.querySelectorAll(".settings-nav").forEach(function (list) {
      list.setAttribute("role", "tablist");
      list.querySelectorAll(".settings-nav-item").forEach(function (tab) {
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(tab.classList.contains("active")));
      });
    });
    document.querySelectorAll(".mob-nav-btn").forEach(function (button) {
      button.setAttribute("aria-current", button.classList.contains("active") ? "page" : "false");
    });
  }

  function syncPages() {
    document.querySelectorAll(".tab-content[id^='page-']").forEach(function (page) {
      var active = page.classList.contains("active");
      var heading = page.querySelector("h1,h2,h3,.page-title,.panel-title");
      page.setAttribute("role", "tabpanel");
      page.removeAttribute("aria-live");
      page.setAttribute("aria-hidden", String(!active));
      if (!page.getAttribute("aria-label") && heading) {
        page.setAttribute("aria-label", (heading.textContent || "").trim());
      }
    });
  }

  function syncDialogs() {
    document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
      overlay.setAttribute("aria-hidden", String(!overlay.classList.contains("open")));
      var dialog = overlay.querySelector(".modal,.modal-box,.modal-card,.modal-content");
      if (!dialog) return;
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      var title = dialog.querySelector("h1,h2,h3,.modal-title");
      if (title) {
        if (!title.id) title.id = "ethone-dialog-title-" + Math.random().toString(36).slice(2, 9);
        dialog.setAttribute("aria-labelledby", title.id);
      }
    });
  }

  function syncButtons() {
    document.querySelectorAll("button").forEach(function (button) {
      var action = button.getAttribute("onclick") || "";
      var visibleText = (button.textContent || "").trim();
      if (/^[✕×xX]$/.test(visibleText)) {
        if (action.indexOf("closeNotifPanel") !== -1) button.setAttribute("aria-label", "Fermer les notifications");
        else if (action.indexOf("toggleAISessions") !== -1) button.setAttribute("aria-label", "Afficher ou masquer les conversations");
        else button.setAttribute("aria-label", "Fermer la fenetre");
        return;
      }
      if (textLabel(button)) return;
      var label = buttonLabels[button.id];
      if (!label && action.indexOf("toggleMobileSidebar") !== -1) label = "Ouvrir la navigation";
      if (!label && action.indexOf("pomoToggle") !== -1) label = "Demarrer ou mettre en pause le minuteur";
      if (label) button.setAttribute("aria-label", label);
    });
    document.querySelectorAll("img:not([alt])").forEach(function (image) {
      image.alt = "";
    });
  }

  function syncForms() {
    document.querySelectorAll("input,textarea,select").forEach(function (control) {
      if (control.getAttribute("aria-label") || control.getAttribute("aria-labelledby")) return;
      if (control.closest("label")) return;
      if (control.id && document.querySelector('label[for="' + control.id + '"]')) return;
      var label = control.getAttribute("placeholder") || control.getAttribute("title") || control.name;
      if (label) control.setAttribute("aria-label", label);
    });
  }

  function apply() {
    document.querySelectorAll(interactiveSelector).forEach(makeKeyboardInteractive);
    syncTabs();
    syncPages();
    syncDialogs();
    syncButtons();
    syncForms();
  }

  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      apply();
    });
  }

  function boot() {
    apply();
    document.addEventListener("click", schedule, true);
    global.addEventListener("ethone:page-ready", schedule);
    try {
      new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      console.warn("[ETHONE accessibility] Dynamic observer unavailable.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})(window);
