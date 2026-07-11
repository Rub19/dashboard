/*
 * ETHONE accessibility runtime.
 * Owns semantics and assistive-technology state; keyboard-first owns activation.
 */
(function initEthoneAccessibility(global) {
  "use strict";

  if (global.__ethoneAccessibilityReady) return;
  global.__ethoneAccessibilityReady = true;

  var generatedId = 0;
  var scheduled = false;
  var fullApplyScheduled = false;
  var pendingRoots = [];
  var announceFrame = 0;
  var lastAnnouncedPage = "";
  var lastStableFocus = null;

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
    "#mob-topbar-name[onclick]",
    ".search-bar[onclick]",
    ".lang-dropdown[onclick]"
  ].join(",");

  var overlaySelector = [
    ".modal-overlay.open",
    "#cmd-palette-overlay.open",
    "#notif-panel.open",
    "#notif-overlay.open",
    ".spaces-overlay.open",
    ".eh-panel-overlay",
    ".theme-creator-overlay",
    ".wm-creator-overlay",
    ".db-dpe-overlay",
    ".db-detail-overlay",
    ".va-detail-overlay",
    "#ethone-mission-control.open",
    "#ethone-mission-control.is-open",
    "#ethone-version-popup-root.is-open",
    "#ethone-whats-new-root.is-open",
    "#ai-sessions-drawer.open",
    "#side-panel-shell.open",
    ".be-panel.open",
    ".aie-copilot.open"
  ].join(",");

  var buttonLabels = {
    hamburger: "Ouvrir la navigation",
    "sidebar-compact-btn": "Reduire ou agrandir la navigation",
    "notif-bell-btn": "Ouvrir les notifications",
    "os-sidebar-notifications": "Ouvrir les notifications",
    "os-sidebar-widgets": "Ouvrir les widgets",
    "theme-mode-btn": "Changer le theme",
    "topbar-avatar": "Ouvrir le profil",
    "topbar-profile-btn": "Ouvrir le profil",
    "mob-topbar-avatar": "Ouvrir le profil",
    "cd-edit-btn": "Configurer le compte a rebours",
    "pomo-play-btn": "Demarrer ou mettre en pause le minuteur",
    "eh-density-toggle": "Basculer la densite de l'interface",
    "eh-motion-toggle": "Basculer les animations",
    "live-panel-toggle-btn": "Ouvrir les widgets"
  };

  function qsa(selector, root) {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
    catch (error) { return []; }
  }

  function qsaWithin(selector, root) {
    var matches = [];
    if (root && root.nodeType === 1 && root.matches && root.matches(selector)) matches.push(root);
    return matches.concat(qsa(selector, root));
  }

  function isNativeInteractive(element) {
    return !!element && /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/.test(element.tagName);
  }

  function isVisible(element) {
    if (!element || !element.isConnected || element.hidden) return false;
    if (element.getAttribute("aria-hidden") === "true" || element.hasAttribute("inert")) return false;
    var hiddenParent = element.parentElement && element.parentElement.closest && element.parentElement.closest("[inert],[aria-hidden='true']");
    if (hiddenParent) return false;
    var style = global.getComputedStyle ? global.getComputedStyle(element) : null;
    if (style && (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0)) return false;
    var rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;
    return !rect || rect.width > 0 || rect.height > 0;
  }

  function isSurfaceVisible(element) {
    if (!element || !element.isConnected || element.hidden) return false;
    var hiddenParent = element.parentElement && element.parentElement.closest && element.parentElement.closest("[hidden],[inert],[aria-hidden='true']");
    if (hiddenParent) return false;
    var style = element.style || {};
    if (style.display === "none" || style.visibility === "hidden" || (style.opacity !== "" && Number(style.opacity) === 0)) return false;
    if (element.matches && element.matches(".tab-content[id^='page-']")) {
      return element.classList.contains("active") || element.classList.contains("de-window-page");
    }
    if (element.id === "main-sidebar" && global.matchMedia && global.matchMedia("(max-width: 1024px)").matches) {
      return element.classList.contains("mobile-open");
    }
    return true;
  }

  function ensureId(element, prefix) {
    if (!element) return "";
    if (!element.id) {
      generatedId += 1;
      element.id = (prefix || "ethone-a11y") + "-" + generatedId;
    }
    return element.id;
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function textLabel(element) {
    if (!element) return "";
    var labelledBy = element.getAttribute("aria-labelledby");
    var labelledText = labelledBy ? labelledBy.split(/\s+/).map(function (id) {
      var node = document.getElementById(id);
      return node ? cleanText(node.textContent) : "";
    }).filter(Boolean).join(" ") : "";
    return cleanText(
      element.getAttribute("aria-label") ||
      labelledText ||
      element.getAttribute("title") ||
      element.getAttribute("data-label") ||
      element.textContent
    );
  }

  function groupTextLabel(element) {
    return Array.prototype.slice.call(element.childNodes || []).map(function (node) {
      if (node.nodeType === 3) return cleanText(node.textContent);
      if (node.nodeType !== 1 || node.matches("button,a[href],input,select,textarea")) return "";
      return cleanText(node.textContent);
    }).filter(Boolean).join(" ");
  }

  function setInert(element, inert) {
    if (!element) return;
    try { element.inert = !!inert; }
    catch (error) {
      if (inert) element.setAttribute("inert", "");
      else element.removeAttribute("inert");
    }
  }

  function makeKeyboardInteractive(element) {
    if (!element || isNativeInteractive(element)) return;
    if (element.matches && element.matches(".modal-overlay,.sidebar-overlay")) return;
    var hasNestedControl = !!element.querySelector("button,a[href],input,select,textarea");
    element.setAttribute("role", hasNestedControl && !element.matches(".search-bar") ? "group" : "button");
    if (!element.hasAttribute("tabindex")) element.tabIndex = 0;
    if (!element.getAttribute("aria-label")) {
      var label = hasNestedControl ? groupTextLabel(element) : textLabel(element);
      if (label) element.setAttribute("aria-label", label.slice(0, 120));
    }
    element.classList.add("kf-focusable");
    if (!element.hasAttribute("aria-keyshortcuts")) element.setAttribute("aria-keyshortcuts", "Enter Space");
    element.dataset.ethoneKeyboardReady = "1";
  }

  function ensureLiveRegion(id, role, live) {
    var node = document.getElementById(id);
    if (!node) {
      node = document.createElement("div");
      node.id = id;
      node.className = "ethone-sr-only";
      document.body.appendChild(node);
    }
    node.setAttribute("role", role);
    node.setAttribute("aria-live", live);
    node.setAttribute("aria-atomic", "true");
    return node;
  }

  function syncLandmarks() {
    if (!document.documentElement.lang) document.documentElement.lang = "fr";
    var main = document.getElementById("main-content");
    if (main) {
      main.setAttribute("role", "main");
      main.setAttribute("aria-label", "Contenu principal ETHONE");
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    }
    var sidebar = document.getElementById("main-sidebar");
    if (sidebar) {
      sidebar.setAttribute("role", "navigation");
      if (!sidebar.getAttribute("aria-label")) sidebar.setAttribute("aria-label", "Navigation principale");
    }
    var sidebarPages = document.getElementById("sidebar-nav-main");
    if (sidebarPages) {
      sidebarPages.setAttribute("role", "group");
      sidebarPages.setAttribute("aria-label", "Pages ETHONE");
    }
    ensureLiveRegion("ethone-a11y-status", "status", "polite");
    ensureLiveRegion("ethone-a11y-alert", "alert", "assertive");
  }

  function syncSurfaceVisibility() {
    ["auth-screen", "profile-screen", "password-screen", "main-sidebar", "main-content"].forEach(function (id) {
      var surface = document.getElementById(id);
      if (!surface) return;
      var visible = isSurfaceVisible(surface);
      surface.setAttribute("aria-hidden", visible ? "false" : "true");
      setInert(surface, !visible);
    });
  }

  function syncAuthTabs() {
    var list = document.getElementById("auth-tabs-wrap");
    var loginTab = document.getElementById("tab-login");
    var registerTab = document.getElementById("tab-register");
    var loginForm = document.getElementById("form-login");
    var registerForm = document.getElementById("form-register");
    if (!list || !loginTab || !registerTab || !loginForm || !registerForm) return;
    var loginActive = isSurfaceVisible(loginForm);
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", "Authentification");
    [[loginTab, loginForm, loginActive], [registerTab, registerForm, !loginActive]].forEach(function (entry) {
      var tab = entry[0], panel = entry[1], active = entry[2];
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panel.id);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.setAttribute("aria-hidden", active ? "false" : "true");
      setInert(panel, !active);
    });
  }

  function syncTabList(list) {
    list.setAttribute("role", "tablist");
    function available(tab) {
      return !tab.hidden && !tab.inert && tab.getAttribute("aria-hidden") !== "true";
    }
    var candidates = qsa(":scope > button,:scope > [role='tab'],:scope > .cat-tab,:scope > .settings-nav-item", list);
    var tabs = candidates.filter(available);
    if (!tabs.length) {
      candidates = qsa(".cat-tab,.settings-nav-item,[role='tab']", list);
      tabs = candidates.filter(available);
    }
    candidates.filter(function (tab) { return !available(tab); }).forEach(function (tab) {
      tab.setAttribute("aria-selected", "false");
      tab.tabIndex = -1;
    });
    if (!tabs.length) return;
    var selected = tabs.find(function (tab) {
      return tab.classList.contains("active") || tab.classList.contains("is-active") || tab.getAttribute("aria-selected") === "true";
    }) || tabs[0];
    tabs.forEach(function (tab) {
      var active = tab === selected;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", active ? "true" : "false");
      tab.tabIndex = active ? 0 : -1;
    });
  }

  function activePageName() {
    var page = document.querySelector(".tab-content.active[id^='page-']:not([aria-hidden='true'])");
    return page ? page.id.replace(/^page-/, "") : "";
  }

  function syncNavigation() {
    syncAuthTabs();
    qsa(".cat-tabs,.settings-nav,[role='tablist']").forEach(syncTabList);

    var pageName = activePageName();
    qsa("#main-sidebar .nav-item,#main-sidebar .os-nav-item,.mobile-bottom-nav .mob-nav-btn").forEach(function (item) {
      var itemPage = item.getAttribute("data-page") || item.getAttribute("data-action-page") || "";
      var active = item.classList.contains("active") || (itemPage && itemPage === pageName);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    qsa("[aria-current='false']").forEach(function (item) { item.removeAttribute("aria-current"); });

    qsa(".region-pill,.theme-swatch").forEach(function (option) {
      var active = option.classList.contains("active") || option.getAttribute("aria-checked") === "true";
      option.setAttribute("role", "radio");
      option.setAttribute("aria-checked", active ? "true" : "false");
      option.tabIndex = active ? 0 : -1;
      var group = option.parentElement;
      if (group && !group.getAttribute("role")) group.setAttribute("role", "radiogroup");
    });

    var languageBar = document.getElementById("auth-lang-bar");
    if (languageBar) {
      languageBar.setAttribute("role", "group");
      languageBar.setAttribute("aria-label", "Langue");
      qsa("button", languageBar).forEach(function (button) {
        button.setAttribute("aria-pressed", button.classList.contains("active") || button.getAttribute("aria-pressed") === "true" ? "true" : "false");
      });
    }
  }

  function syncPages() {
    var mainVisible = isSurfaceVisible(document.getElementById("main-content"));
    qsa(".tab-content[id^='page-']").forEach(function (page) {
      var detached = page.classList.contains("de-window-page") || page.hasAttribute("data-de-host");
      var active = (mainVisible && page.classList.contains("active")) || (detached && isSurfaceVisible(page));
      var heading = page.querySelector("h1,h2,h3,.page-title,.panel-title");
      page.setAttribute("role", "region");
      page.removeAttribute("aria-live");
      page.setAttribute("aria-hidden", active ? "false" : "true");
      setInert(page, !active);
      if (heading) {
        page.setAttribute("aria-labelledby", ensureId(heading, "ethone-page-title"));
        page.removeAttribute("aria-label");
      }
      if (active) {
        var label = heading ? cleanText(heading.textContent) : page.id.replace(/^page-/, "");
        if (label && label !== lastAnnouncedPage) {
          lastAnnouncedPage = label;
          announce(label);
        }
      }
    });
  }

  function surfaceOpen(surface) {
    if (!surface) return false;
    if (surface.classList.contains("open") || surface.classList.contains("active") || surface.classList.contains("visible") || surface.classList.contains("is-open") || surface.classList.contains("mobile-open")) return true;
    return surface.getAttribute("aria-hidden") === "false" && isSurfaceVisible(surface);
  }

  function relateDisclosure(trigger, target, kind) {
    if (!trigger || !target) return;
    trigger.setAttribute("aria-controls", ensureId(target, "ethone-disclosure"));
    trigger.setAttribute("aria-expanded", surfaceOpen(target) ? "true" : "false");
    if (kind) trigger.setAttribute("aria-haspopup", kind);
  }

  function syncDisclosures() {
    qsa("#hamburger,#mobile-topbar button[onclick*='toggleMobileSidebar']").forEach(function (trigger) {
      relateDisclosure(trigger, document.getElementById("main-sidebar"));
    });
    qsa("#notif-bell-btn,#os-sidebar-notifications").forEach(function (trigger) {
      relateDisclosure(trigger, document.getElementById("notif-panel"), "dialog");
    });
    qsa("#live-panel-toggle-btn,#os-sidebar-widgets").forEach(function (trigger) {
      relateDisclosure(trigger, document.getElementById("live-panel") || document.getElementById("live-panel-shell") || document.getElementById("live-panel-mobile-overlay"), "dialog");
    });

    qsa(".os-section-head").forEach(function (trigger) {
      var body = trigger.nextElementSibling;
      if (!body) return;
      var collapsed = !!(trigger.closest(".os-nav-section") && trigger.closest(".os-nav-section").classList.contains("collapsed"));
      trigger.setAttribute("aria-controls", ensureId(body, "sidebar-section"));
      trigger.setAttribute("aria-expanded", collapsed ? "false" : "true");
      body.hidden = collapsed;
      setInert(body, collapsed);
    });

    qsa(".lang-dropdown").forEach(function (trigger) {
      var menu = trigger.querySelector(".lang-menu");
      if (!menu) return;
      trigger.setAttribute("aria-label", "Choisir la langue");
      makeKeyboardInteractive(trigger);
      relateDisclosure(trigger, menu, "menu");
      menu.setAttribute("role", "menu");
      qsa(".lang-option", menu).forEach(function (option) {
        makeKeyboardInteractive(option);
        option.setAttribute("role", "menuitemradio");
        option.setAttribute("aria-checked", option.classList.contains("active") ? "true" : "false");
      });
    });

    qsa("[aria-haspopup][aria-controls]:not([role='combobox'])").forEach(function (trigger) {
      var target = document.getElementById(trigger.getAttribute("aria-controls"));
      if (target) trigger.setAttribute("aria-expanded", surfaceOpen(target) ? "true" : "false");
    });
  }

  function dialogNode(overlay) {
    if (!overlay) return null;
    return overlay.querySelector(".modal,.modal-box,.modal-card,.modal-content,[data-dialog]") || overlay;
  }

  function syncDialogs(root) {
    qsaWithin(".modal-overlay,.eh-panel-overlay,.spaces-overlay,.theme-creator-overlay,.wm-creator-overlay,.db-dpe-overlay,.db-detail-overlay,.va-detail-overlay,#cmd-palette-overlay,#notif-panel,#ethone-mission-control,#ethone-version-popup-root,#ethone-whats-new-root", root || document).forEach(function (overlay) {
      var open = surfaceOpen(overlay);
      overlay.setAttribute("aria-hidden", open ? "false" : "true");
      setInert(overlay, !open);
      var dialog = dialogNode(overlay);
      if (!dialog) return;
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", open ? "true" : "false");
      var title = dialog.querySelector("h1,h2,h3,.modal-title,.cmd-title,.panel-title");
      if (title) {
        dialog.setAttribute("aria-labelledby", ensureId(title, "ethone-dialog-title"));
        dialog.removeAttribute("aria-label");
      } else if (!textLabel(dialog)) {
        dialog.setAttribute("aria-label", "Fenetre ETHONE");
      }
    });
  }

  function actionLabel(action) {
    if (/close|dismiss|cancel/i.test(action)) return "Fermer la fenetre";
    if (/notification|Notif/i.test(action)) return "Ouvrir les notifications";
    if (/widget|LivePanel/i.test(action)) return "Ouvrir les widgets";
    if (/profile/i.test(action)) return "Ouvrir le profil";
    if (/search|CmdPalette/i.test(action)) return "Ouvrir la recherche";
    if (/theme|DarkLight/i.test(action)) return "Changer le theme";
    if (/refresh|reload/i.test(action)) return "Actualiser";
    if (/delete|remove/i.test(action)) return "Supprimer";
    if (/edit|configure/i.test(action)) return "Modifier";
    if (/send/i.test(action)) return "Envoyer";
    if (/new|create|add/i.test(action)) return "Ajouter";
    if (/flow.*switch|switch.*flow/i.test(action)) return "Changer de Flow";
    if (/calNav\s*\(\s*-1|calendar.*prev/i.test(action)) return "Mois precedent";
    if (/calNav\s*\(\s*1|calendar.*next/i.test(action)) return "Mois suivant";
    if (/incrementGoal[\s\S]*?-1/i.test(action)) return "Diminuer la progression";
    if (/incrementGoal/i.test(action)) return "Augmenter la progression";
    return "";
  }

  function symbolicButtonLabel(button, action, visibleText) {
    var mood = button.getAttribute("data-mood");
    if (mood) {
      var moodMatch = action.match(/selectMood\([^,]+,\s*['\"]([^'\"]+)/);
      return "Humeur : " + (moodMatch ? moodMatch[1] : mood);
    }
    var dataNames = Array.prototype.slice.call(button.attributes || []).map(function (attribute) { return attribute.name; }).join(" ");
    if (/data-aie-send/.test(dataNames)) return "Envoyer";
    if (/data-aie-close|data-aie-dismiss/.test(dataNames)) return "Fermer";
    if (/data-ab-new/.test(dataNames)) return "Creer une automatisation";
    if (/data-flow-open-switcher/.test(dataNames)) return "Changer de Flow";
    if (button.id === "db-cal-prev") return "Mois precedent";
    if (button.id === "db-cal-next") return "Mois suivant";

    var derived = actionLabel(action);
    if (derived) return derived;
    var compact = cleanText(visibleText).replace(/\uFE0F/g, "");
    if (compact === "\u2190" || compact === "\u2039") return "Precedent";
    if (compact === "\u2192" || compact === "\u203a") return "Suivant";
    if (compact === "\u2191") return "Envoyer";
    if (compact === "+") return "Ajouter";
    if (compact === "-" || compact === "\u2212") return "Diminuer";
    if (/^[xX\u00d7\u2715\u2716]+$/.test(compact)) return "Fermer";
    if (compact === "\u270e") return "Modifier";
    return "Action ETHONE";
  }

  function syncButtons(root) {
    qsaWithin("button", root || document).forEach(function (button) {
      if (!button.hasAttribute("type") && !button.closest("form")) button.type = "button";
      var action = button.getAttribute("onclick") || button.getAttribute("data-action-id") || "";
      var knownLabel = buttonLabels[button.id];
      var currentAria = cleanText(button.getAttribute("aria-label"));
      if (knownLabel && (!currentAria || !/[0-9A-Za-z\u00c0-\u024f]/.test(currentAria))) {
        button.setAttribute("aria-label", knownLabel);
        return;
      }
      var explicitName = button.getAttribute("aria-label") || button.getAttribute("aria-labelledby") || button.getAttribute("title");
      if (explicitName) return;
      var visibleText = cleanText(button.textContent);
      var hasWords = /[0-9A-Za-z\u00c0-\u024f]/.test(visibleText);
      if (hasWords) return;
      var label = buttonLabels[button.id] || symbolicButtonLabel(button, action, visibleText);
      if (!label && button.closest(".modal,.modal-overlay,[role='dialog']")) label = "Fermer la fenetre";
      if (label) button.setAttribute("aria-label", label);
    });

    qsaWithin(".search-bar[onclick]", root || document).forEach(function (search) {
      search.setAttribute("role", "button");
      search.setAttribute("tabindex", "0");
      search.setAttribute("aria-label", "Ouvrir la recherche globale");
      var input = search.querySelector("input");
      if (input) {
        input.tabIndex = -1;
        input.setAttribute("aria-hidden", "true");
      }
    });

    qsaWithin("img:not([alt])", root || document).forEach(function (image) { image.alt = ""; });
    qsaWithin("svg:not([aria-hidden]):not([role='img'])", root || document).forEach(function (icon) {
      if (icon.closest("button,a,[role='button'],[role='tab']")) {
        icon.setAttribute("aria-hidden", "true");
        icon.setAttribute("focusable", "false");
      }
    });
  }

  function syncForms(root) {
    qsaWithin("input,textarea,select", root || document).forEach(function (control) {
      if (control.getAttribute("aria-label") || control.getAttribute("aria-labelledby")) return;
      var wrappingLabel = control.closest("label");
      if (wrappingLabel && cleanText(wrappingLabel.textContent)) return;
      if (control.id && document.querySelector('label[for="' + control.id + '"]')) return;
      var nearby = control.closest(".auth-field,.field,.form-group,.setting-row,.settings-row,.modal-field,.ethone-bg-field,.toggle-row,.sidebar-customize-row,.theme-control-row");
      var labelNode = nearby && Array.prototype.find.call(nearby.querySelectorAll("label,.label,.field-label,.settings-label,.modal-label,.theme-row-label"), function (node) {
        return node !== wrappingLabel && cleanText(node.textContent);
      });
      if (labelNode && labelNode !== control) {
        control.setAttribute("aria-labelledby", ensureId(labelNode, "ethone-field-label"));
        return;
      }
      var label = control.getAttribute("placeholder") || control.getAttribute("title") || control.name || (nearby && cleanText(nearby.textContent));
      if (label) control.setAttribute("aria-label", label);
    });
  }

  function syncLiveRegions(root) {
    ensureLiveRegion("ethone-a11y-status", "status", "polite");
    ensureLiveRegion("ethone-a11y-alert", "alert", "assertive");
    qsaWithin(".toast,.notification,.nc2-toast,[data-toast]", root || document).forEach(function (item) {
      var urgent = item.classList.contains("error") || item.classList.contains("danger") || item.getAttribute("data-type") === "error";
      item.setAttribute("role", urgent ? "alert" : "status");
      item.setAttribute("aria-live", urgent ? "assertive" : "polite");
      item.setAttribute("aria-atomic", "true");
    });
    var authLoading = document.getElementById("auth-loading");
    if (authLoading) {
      authLoading.setAttribute("role", "status");
      authLoading.setAttribute("aria-live", "polite");
      authLoading.setAttribute("aria-label", "Chargement");
    }
  }

  function announce(message, urgent) {
    var region = ensureLiveRegion(urgent ? "ethone-a11y-alert" : "ethone-a11y-status", urgent ? "alert" : "status", urgent ? "assertive" : "polite");
    global.cancelAnimationFrame(announceFrame);
    region.textContent = "";
    announceFrame = global.requestAnimationFrame(function () { region.textContent = cleanText(message); });
  }

  function openSurfaces() {
    return qsa(overlaySelector).filter(function (surface) { return surfaceOpen(surface) && isSurfaceVisible(surface); });
  }

  function topSurface() {
    return openSurfaces().map(function (surface, index) {
      var z = parseInt(global.getComputedStyle(surface).zIndex, 10);
      return { surface: surface, z: Number.isFinite(z) ? z : 0, index: index };
    }).sort(function (a, b) { return b.z - a.z || b.index - a.index; })[0];
  }

  function layerFocusables(surface) {
    return qsa("button:not([disabled]),a[href],input:not([disabled]):not([type='hidden']),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])", surface).filter(function (element) {
      return isVisible(element) && element.getAttribute("aria-disabled") !== "true";
    });
  }

  function trapTopLayerFocus(event) {
    if (!event || event.defaultPrevented || event.key !== "Tab") return false;
    var entry = topSurface();
    if (!entry) return false;
    var surface = entry.surface;
    var focusables = layerFocusables(surface);
    if (!focusables.length) {
      event.preventDefault();
      if (!surface.hasAttribute("tabindex")) surface.setAttribute("tabindex", "-1");
      surface.focus();
      return true;
    }
    var first = focusables[0], last = focusables[focusables.length - 1];
    var active = document.activeElement;
    if (!surface.contains(active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return true;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }

  function closeTopLayer() {
    var entry = topSurface();
    if (!entry) return false;
    var surface = entry.surface;
    var id = surface.id || "";
    var returnFocus = lastStableFocus;
    try {
      if (surface.classList.contains("modal-overlay") && /^modal-/.test(id) && typeof global.closeModal === "function") {
        global.closeModal(id.replace(/^modal-/, ""));
      } else if (id === "cmd-palette-overlay" && typeof global.closeCmdPalette === "function") {
        global.closeCmdPalette();
      } else if ((id === "notif-panel" || id === "notif-overlay") && typeof global.closeNotifPanel === "function") {
        global.closeNotifPanel();
      } else if (surface.classList.contains("spaces-overlay") && global.ETHONESpacesUI && typeof global.ETHONESpacesUI.close === "function") {
        global.ETHONESpacesUI.close();
      } else if (id === "ethone-mission-control" && typeof global.closeMissionControl === "function") {
        global.closeMissionControl();
      } else if (id === "side-panel-shell" && global.ETHONESidePanels && typeof global.ETHONESidePanels.close === "function") {
        global.ETHONESidePanels.close();
      } else {
        var close = surface.querySelector("[data-close],[data-action='close'],[data-modal-close],[data-theme-creator-close],[data-wm-creator-close],[data-emc-create-cancel],.modal-close,.close-btn,[aria-label^='Fermer'],[aria-label^='Close']");
        if (close && typeof close.click === "function") close.click();
        else {
          surface.classList.remove("open", "active", "visible", "is-open", "mobile-open", "show");
          surface.setAttribute("aria-hidden", "true");
          setInert(surface, true);
        }
      }
    } catch (error) {
      surface.classList.remove("open", "active", "visible", "is-open", "mobile-open", "show");
      surface.setAttribute("aria-hidden", "true");
      setInert(surface, true);
    }
    global.setTimeout(function () {
      var active = document.activeElement;
      var focusEscaped = !active || active === document.body || !active.isConnected || (surface.contains && surface.contains(active));
      if (focusEscaped && returnFocus && returnFocus.isConnected && !returnFocus.closest("[inert],[aria-hidden='true']")) {
        try { returnFocus.focus({ preventScroll: true }); }
        catch (error) { returnFocus.focus(); }
      }
    }, 0);
    schedule();
    return true;
  }

  function hasAccessibleName(element) {
    if (textLabel(element)) return true;
    if (element.id && document.querySelector('label[for="' + element.id + '"]')) return true;
    var wrappingLabel = element.closest("label");
    return !!(wrappingLabel && cleanText(wrappingLabel.textContent));
  }

  function audit() {
    var candidates = qsa("button,a[href],input,select,textarea,[role='button'],[role='tab'],[role='menuitem'],[role='option'],[tabindex]:not([tabindex='-1'])");
    var exposed = candidates.filter(function (element) {
      return isVisible(element) && !element.closest("[inert],[aria-hidden='true']") && !element.disabled;
    });
    var unnamed = exposed.filter(function (element) { return !hasAccessibleName(element); });
    var positiveTabindex = qsa("[tabindex]").filter(function (element) { return Number(element.getAttribute("tabindex")) > 0; });
    var current = qsa("[aria-current='page']");
    return {
      exposedControls: exposed.length,
      unnamedControls: unnamed.map(function (element) { return element.id || element.className || element.tagName; }),
      positiveTabindex: positiveTabindex.length,
      activePages: qsa(".tab-content[aria-hidden='false']").map(function (page) { return page.id; }),
      currentNavigation: current.map(function (item) { return item.getAttribute("data-page") || textLabel(item); }),
      openDialogs: openSurfaces().map(function (surface) { return surface.id || surface.className; })
    };
  }

  function apply() {
    qsa(interactiveSelector).forEach(makeKeyboardInteractive);
    syncLandmarks();
    syncSurfaceVisibility();
    syncNavigation();
    syncPages();
    syncDisclosures();
    syncDialogs();
    syncButtons();
    syncForms();
    syncLiveRegions();
  }

  function applyIncremental(root) {
    if (!root || root.nodeType !== 1 || !root.isConnected) return;
    qsaWithin(interactiveSelector, root).forEach(makeKeyboardInteractive);
    qsaWithin(".cat-tabs,.settings-nav,[role='tablist']", root).forEach(syncTabList);
    syncDialogs(root);
    syncButtons(root);
    syncForms(root);
    syncLiveRegions(root);
  }

  function schedule(root) {
    if (root && root.nodeType === 1) pendingRoots.push(root);
    else fullApplyScheduled = true;
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(function () {
      scheduled = false;
      if (fullApplyScheduled) {
        fullApplyScheduled = false;
        pendingRoots.length = 0;
        apply();
        return;
      }
      var roots = pendingRoots.splice(0, pendingRoots.length).filter(function (root, index, list) {
        return list.indexOf(root) === index && !list.some(function (other) { return other !== root && other.contains && other.contains(root); });
      });
      roots.slice(0, 24).forEach(applyIncremental);
    });
  }

  function boot() {
    apply();
    lastStableFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.addEventListener("click", schedule, true);
    document.addEventListener("keydown", trapTopLayerFocus, true);
    document.addEventListener("focusin", function (event) {
      if (event.target && event.target instanceof HTMLElement && !event.target.closest(overlaySelector)) lastStableFocus = event.target;
    }, true);
    [
      "ethone:page-ready",
      "ethone:dashboard-ready",
      "ethone:profile-ready",
      "ethone:auth-tab-change",
      "ethone:command-palette-rendered",
      "ethone:settings-change",
      "ethone:lazy-group-loaded"
    ].forEach(function (name) { global.addEventListener(name, schedule, { passive: true }); });
    try {
      if (global.ETHONEDOMRuntime && typeof global.ETHONEDOMRuntime.subscribe === "function") {
        global.ETHONEDOMRuntime.subscribe("accessibility", function (batch) {
          var roots = batch && Array.isArray(batch.roots) ? batch.roots : [];
          if (batch && batch.overflow) {
            schedule(document.querySelector(".tab-content.active") || document.querySelector("#auth-screen:not([aria-hidden='true'])"));
            return;
          }
          roots.slice(0, 24).forEach(schedule);
        });
      }
    } catch (error) {}
  }

  global.ETHONEAccessibility = {
    refresh: schedule,
    apply: apply,
    audit: audit,
    announce: announce,
    closeTopLayer: closeTopLayer
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(window);
