import { NAVIGATION_ITEMS } from "../data/navigation.mjs";
import { SOUND_PACKS } from "../services/sound-manager.mjs";
import { translateSource } from "../i18n/catalog.mjs";
import { element, icon } from "./dom.mjs";
import { refreshIcons, scheduleIconRefresh } from "./icons.mjs";
import { getLayerManager } from "./layer-manager.mjs";
import { spotifyDockIndicator } from "./spotify-live.mjs";
import { attachFocusPopover } from "./focus-popover.mjs";

export const DEFAULT_DOCK_IDS = Object.freeze(["home", "brain", "notes", "tasks", "calendar", "activity", "connections", "settings"]);
const AVAILABLE_IDS = new Set(NAVIGATION_ITEMS.map(({ id }) => id));

export function normalizeDockOrder(input) {
  if (!Array.isArray(input)) return [...DEFAULT_DOCK_IDS];
  return [...new Set(input.map((id) => String(id || "")).filter((id) => AVAILABLE_IDS.has(id)))];
}

export function moveDockItem(input, id, delta) {
  const order = normalizeDockOrder(input);
  const from = order.indexOf(id);
  const to = Math.min(order.length - 1, Math.max(0, from + delta));
  if (from < 0 || from === to) return order;
  order.splice(to, 0, order.splice(from, 1)[0]);
  return order;
}

export function moveDockItemBefore(input, id, targetId) {
  const order = normalizeDockOrder(input);
  if (id === targetId || !order.includes(id) || !order.includes(targetId)) return order;
  order.splice(order.indexOf(targetId), 0, order.splice(order.indexOf(id), 1)[0]);
  return order;
}

function appNode(item, active, touchMode = false) {
  const presenceIcon = ["brain", "calendar"].includes(item.id) ? item.id : null;
  return element("button", {
    className: `v8-dock-app${active ? " is-active" : ""}`,
    attributes: { type: "button", draggable: touchMode ? null : "true", "aria-label": `Ouvrir ${item.label}`, "aria-current": active ? "page" : null, "aria-description": touchMode ? "Appui long pour reorganiser" : null },
    dataset: { action: item.actionId, route: item.id, dockId: item.id, tooltip: item.label, soundHover: "important", soundDrop: "dock", presenceIcon }
  }, [element("span", { className: "v8-dock-app__plate" }, [icon(item.icon)])]);
}

function launcherAppNode(item, active) {
  return element("button", {
    className: `v8-dock-launcher__app${active ? " is-active" : ""}`,
    attributes: { type: "button", "aria-label": `Ouvrir ${item.label}`, "aria-current": active ? "page" : null },
    dataset: { action: item.actionId, route: item.id, dockLaunch: item.id }
  }, [element("span", {}, [icon(item.icon)]), element("strong", { text: item.label })]);
}

function editorControl(command, id, label, iconName, options = {}) {
  return element("button", {
    className: `v8-icon-button${options.className ? ` ${options.className}` : ""}`,
    attributes: { type: "button", disabled: options.disabled || null, "aria-label": label, "aria-pressed": options.pressed == null ? null : String(options.pressed) },
    dataset: { dockCommand: command, dockId: id, tooltip: options.tooltip || label }
  }, [icon(iconName)]);
}

function editorNode(item, order) {
  const index = order.indexOf(item.id);
  const pinned = index >= 0;
  return element("article", { className: "v8-dock-editor__row", dataset: { dockEditorItem: item.id } }, [
    element("span", { className: "v8-dock-editor__identity" }, [icon(item.icon), element("span", {}, [element("strong", { text: item.label }), element("small", { text: pinned ? "Epingle" : "Masque" })])]),
    element("span", { className: "v8-dock-editor__actions" }, [
      editorControl("left", item.id, `Deplacer ${item.label} a gauche`, "chevron-left", { disabled: !pinned || index === 0, tooltip: "Deplacer a gauche" }),
      editorControl("right", item.id, `Deplacer ${item.label} a droite`, "chevron-right", { disabled: !pinned || index === order.length - 1, tooltip: "Deplacer a droite" }),
      editorControl("toggle", item.id, `${pinned ? "Retirer" : "Ajouter"} ${item.label} ${pinned ? "du" : "au"} Dock`, pinned ? "pin-off" : "pin", { className: `v8-dock-editor__pin${pinned ? " is-pinned" : ""}`, pressed: pinned, tooltip: pinned ? "Retirer du Dock" : "Ajouter au Dock" })
    ])
  ]);
}

export function createDock(host, options = {}) {
  if (!host) throw new TypeError("Dock requires a host element");
  const storage = options.storage || globalThis.localStorage || null;
  const ownerId = String(options.ownerId || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 64);
  const owner = String(options.owner || "local").replace(/[^a-z0-9_-]/gi, "").slice(0, 64) || "local";
  const storageKey = ownerId ? `ethone:v8-dock:${ownerId}:${owner}` : `ethone:v8-dock:${owner}`;
  let order = [...DEFAULT_DOCK_IDS];
  let activeRoute = options.route || "home";
  let mediaState = options.media || {};
  let editing = false;
  let controlCenterOpen = false;
  let launcherOpen = false;
  let dragged = "";
  let touchHold = null;
  let touchHoldTimer = 0;
  let suppressTouchClick = false;
  let layerRegistration = null;
  let focusPopover = null;
  const documentRef = host.ownerDocument || globalThis.document;
  const runtime = documentRef?.defaultView || globalThis;
  const layerManager = getLayerManager({ document: documentRef, runtime });
  const touchMedia = globalThis.matchMedia?.("(max-width: 820px), (pointer: coarse)") || { matches: false, addEventListener() {}, removeEventListener() {} };
  const compactMedia = globalThis.matchMedia?.("(max-width: 430px)") || { matches: false, addEventListener() {}, removeEventListener() {} };

  try {
    const stored = storage?.getItem(storageKey);
    if (stored != null) order = normalizeDockOrder(JSON.parse(stored));
  } catch {
    order = [...DEFAULT_DOCK_IDS];
  }
  if (Array.isArray(options.initialOrder)) order = normalizeDockOrder(options.initialOrder);

  function persist() {
    try { storage?.setItem(storageKey, JSON.stringify(order)); } catch {}
  }

  function dockCustomizerPanel() {
    const el = typeof document !== "undefined" ? document.documentElement : null;
    const currentScale = el?.dataset?.v8DockScale || "normal";
    const currentAlign = el?.dataset?.v8DockAlign || "center";
    const currentGlass = el?.dataset?.v8DockGlass || "default";
    const currentAutoHide = el?.dataset?.v8DockAutohide === "true";
    const currentMagnify = el?.dataset?.v8DockMagnify !== "false";
    const currentAnimations = el?.dataset?.v8Animations || "smooth";
    const currentGlow = el?.dataset?.v8UiGlow !== "false";
    const currentSoundFeedback = el?.dataset?.v8UiSoundFeedback !== "false";
    const currentSoundPack = el?.dataset?.v8SoundPack || "ethone";

    function row(label, iconName, choices) {
      return element("div", { className: "v8-dock-editor__setting-row" }, [
        element("span", { className: "v8-dock-editor__setting-label" }, [
          icon(iconName),
          element("span", { text: label })
        ]),
        element("div", { className: "v8-dock-editor__setting-choices", attributes: { role: "group", "aria-label": label } }, choices)
      ]);
    }

    function btn(label, actionId, active) {
      return element("button", {
        className: `v8-dock-editor__choice${active ? " is-active" : ""}`,
        attributes: { type: "button", "aria-pressed": String(active) },
        dataset: { dockConfigAction: actionId }
      }, [element("span", { text: label })]);
    }

    return element("div", { className: "v8-dock-editor__config" }, [
      row(translateSource("Taille"), "monitor", [
        btn(translateSource("Compacte"), "v8.dock.scale.compact", currentScale === "compact"),
        btn(translateSource("Normale"), "v8.dock.scale.normal", !currentScale || currentScale === "normal"),
        btn(translateSource("Grande"), "v8.dock.scale.large", currentScale === "large")
      ]),
      row(translateSource("Alignement"), "align-center", [
        btn(translateSource("Centré"), "v8.dock.align.center", !currentAlign || currentAlign === "center"),
        btn(translateSource("Plein Écran"), "v8.dock.align.stretch", currentAlign === "stretch")
      ]),
      row(translateSource("Verre & Flou"), "sparkles", [
        btn(translateSource("Vitrifié"), "v8.dock.glass.default", !currentGlass || currentGlass === "default"),
        btn(translateSource("Ultra Flou"), "v8.dock.glass.ultra", currentGlass === "ultra"),
        btn(translateSource("Sobre"), "v8.dock.glass.opaque", currentGlass === "opaque")
      ]),
      row(translateSource("Masquage Auto"), "eye-off", [
        btn(translateSource("Toujours visible"), "v8.dock.autohide.off", !currentAutoHide),
        btn(translateSource("Masquer auto"), "v8.dock.autohide.on", currentAutoHide)
      ]),
      row(translateSource("Zoom survol"), "maximize", [
        btn(translateSource("Actif"), "v8.dock.magnify.on", currentMagnify),
        btn(translateSource("Désactivé"), "v8.dock.magnify.off", !currentMagnify)
      ]),

    ]);
  }

  
  function controlCenterPanel() {
    const el = typeof document !== "undefined" ? document.documentElement : null;
    const currentAnimations = el?.dataset?.v8Animations || "smooth";
    const currentGlow = el?.dataset?.v8UiGlow !== "false";
    const currentSoundFeedback = el?.dataset?.v8UiSoundFeedback !== "false";
    const currentSoundPack = el?.dataset?.v8SoundPack || "ethone";

    function group(title, iconName, body, options = {}) {
      return element("section", { className: "v8-control-center__group" }, [
        element("header", { className: "v8-control-center__group-header" }, [icon(iconName), element("strong", { text: title })]),
        element("div", { className: `v8-control-center__group-body${options.grid ? " is-grid" : ""}` }, body)
      ]);
    }

    function pill(label, actionId, active) {
      return element("button", {
        className: `v8-control-center__choice${active ? " is-active" : ""}`,
        attributes: { type: "button", "aria-pressed": String(active) },
        dataset: { dockConfigAction: actionId }
      }, [element("span", { text: label })]);
    }

    function toggle(label, iconName, active, actionOn, actionOff) {
      return element("button", {
        className: `v8-control-center__toggle${active ? " is-active" : ""}`,
        attributes: { type: "button", role: "switch", "aria-checked": String(active), "aria-label": label },
        dataset: { dockConfigAction: active ? actionOff : actionOn }
      }, [
        element("span", { className: "v8-control-center__toggle-icon" }, [icon(iconName)]),
        element("span", { className: "v8-control-center__toggle-track", attributes: { "aria-hidden": "true" } }, [element("span", { className: "v8-control-center__toggle-thumb" })])
      ]);
    }

    function tile(label, actionId, active, iconName) {
      return element("button", {
        className: `v8-control-center__tile${active ? " is-active" : ""}`,
        attributes: { type: "button", "aria-pressed": String(active) },
        dataset: { dockConfigAction: actionId }
      }, [icon(iconName), element("span", { text: label })]);
    }

    return element("div", { className: "v8-control-center-panel" }, [
      group(translateSource("Animations UI"), "activity", [
        pill(translateSource("Fluides"), "v8.ui.animations.smooth", currentAnimations === "smooth"),
        pill(translateSource("Rapides"), "v8.ui.animations.snappy", currentAnimations === "snappy"),
        pill(translateSource("Réduites"), "v8.ui.animations.reduced", currentAnimations === "reduced")
      ]),
      group(translateSource("Ambiance"), "sparkles", [
        toggle(translateSource("Aura néon"), "zap", currentGlow, "v8.ui.glow.on", "v8.ui.glow.off"),
        toggle(translateSource("Sons d'interface"), "volume-2", currentSoundFeedback, "v8.ui.sound.feedback.on", "v8.ui.sound.feedback.off")
      ]),
      group(translateSource("Pack sonore"), "music", SOUND_PACKS.map((pack) => tile(translateSource(pack.label), "v8.sound.pack." + pack.id, currentSoundPack === pack.id, pack.icon)), { grid: true }),
      group(translateSource("Audio"), "download", [
        pill(translateSource("Écouter l'aperçu"), "v8.sound.preview", false),
        pill(translateSource("Télécharger .WAV"), "v8.sound.export", false)
      ]),
      group(translateSource("Ambiance sonore"), "cloud-rain", [
        tile(translateSource("Pluie"), "v8.ambience.rain", false, "cloud-rain"),
        tile(translateSource("Bruit rose"), "v8.ambience.pink", false, "flower-2"),
        tile(translateSource("Drone"), "v8.ambience.drone", false, "disc"),
        tile(translateSource("Arrêter"), "v8.ambience.stop", false, "volume-x")
      ], { grid: true }),
      group(translateSource("Focus Timer"), "timer", [
        tile(translateSource("Pomodoro"), "v8.focus.start.pomodoro", false, "timer"),
        tile(translateSource("Deep Work"), "v8.focus.start.deep", false, "brain"),
        tile(translateSource("Sprint"), "v8.focus.start.quick", false, "zap"),
        tile(translateSource("Pause"), "v8.focus.pause", false, "pause"),
        tile(translateSource("Arrêter"), "v8.focus.stop", false, "square")
      ], { grid: true })
    ]);
  }

  function compactPinnedItems(pinned) {
    if (!compactMedia.matches || pinned.length <= 4) return pinned;
    const visible = pinned.slice(0, 4);
    const active = pinned.find((item) => item.id === activeRoute);
    if (active && !visible.some((item) => item.id === active.id)) visible[visible.length - 1] = active;
    return visible;
  }

  function launcherNode(pinned) {
    return element("section", { className: "v8-dock-launcher", attributes: { role: "dialog", "aria-modal": "false", "aria-label": "Toutes les applications" } }, [
      element("header", {}, [element("span", {}, [element("small", { text: "ETHONE OS", attributes: { translate: "no" } }), element("strong", { text: translateSource("Toutes les apps") })]), editorControl("more-close", "", translateSource("Fermer"), "x")]),
      element("div", { className: "v8-dock-launcher__grid" }, pinned.map((item) => launcherAppNode(item, item.id === activeRoute))),
      element("footer", {}, [icon("hand"), element("span", { text: translateSource("Appui long sur une app du Dock pour la réorganiser.") })])
    ]);
  }

  function render(focusSelector = "") {
    layerRegistration?.release?.({ restoreFocus: false });
    layerRegistration = null;
    const pinned = order.map((id) => NAVIGATION_ITEMS.find((item) => item.id === id)).filter(Boolean);
    const visiblePinned = compactPinnedItems(pinned);
    const touchMode = touchMedia.matches === true;
    const mediaSlot = element("span", { className: "v8-dock-media-slot", attributes: { hidden: true } });
    const mediaIndicator = spotifyDockIndicator(mediaState);
    if (mediaIndicator) {
      mediaSlot.hidden = false;
      mediaSlot.append(mediaIndicator);
    }
    const nav = element("nav", { className: "v8-floating-dock", attributes: { "aria-label": "Dock ETHONE" } }, [
      element("div", { className: "v8-dock-apps" }, visiblePinned.map((item) => appNode(item, item.id === activeRoute, touchMode))),
      mediaSlot,
      compactMedia.matches && pinned.length > visiblePinned.length ? element("button", { className: `v8-dock-more${launcherOpen ? " is-active" : ""}`, attributes: { type: "button", "aria-label": translateSource("Ouvrir toutes les applications"), "aria-expanded": String(launcherOpen) }, dataset: { dockCommand: "more", tooltip: translateSource("Toutes les apps") } }, [icon("grid-2x2")]) : null,
      element("span", { className: "v8-dock-separator", attributes: { "aria-hidden": "true" } }),
      element("button", { className: "v8-dock-control", attributes: { type: "button", "aria-label": translateSource("Recherche Spotlight & Commandes (Ctrl+K)") }, dataset: { dockCommand: "spotlight", tooltip: translateSource("Recherche Spotlight & Commandes (Ctrl+K)") } }, [icon("search")]),
      element("button", { className: "v8-dock-control", attributes: { type: "button", "aria-label": translateSource("Minuteur Pomodoro (Focus Express 25 min)") }, dataset: { dockCommand: "pomodoro", tooltip: translateSource("Minuteur Pomodoro (Focus Express 25 min)") } }, [icon("timer")]),
      element("button", { className: "v8-dock-control", attributes: { type: "button", "aria-label": translateSource("Vue d'ensemble Mission Control (F3)") }, dataset: { dockCommand: "mission", tooltip: translateSource("Mission Control") } }, [icon("layout-grid")]),
      element("button", { className: `v8-dock-control v8-dock-control--notifications`, attributes: { type: "button", "aria-label": translateSource("Ouvrir les notifications"), "aria-live": "polite" }, dataset: { dockCommand: "notifications", tooltip: "Notifications" } }, [icon("bell"), element("span", { className: "v8-dock-notification-badge", attributes: { "aria-hidden": "true", hidden: "true" }, text: "0" })]),
      element("button", { className: `v8-dock-control${controlCenterOpen ? " is-active" : ""}`, attributes: { type: "button", "aria-label": translateSource("Control Center"), "aria-expanded": String(controlCenterOpen) }, dataset: { dockCommand: "control-center", tooltip: translateSource("Control Center") } }, [icon("sliders")]),
      element("button", { className: `v8-dock-control${editing ? " is-active" : ""}`, attributes: { type: "button", "aria-label": translateSource("Personnaliser le Dock"), "aria-expanded": String(editing) }, dataset: { dockCommand: "edit", tooltip: translateSource("Personnaliser le Dock") } }, [icon("sliders-horizontal")])
    ]);
    const children = [nav];
    if (launcherOpen && compactMedia.matches) children.push(launcherNode(pinned));
    
    if (controlCenterOpen) children.push(element("section", { className: "v8-dock-editor v8-control-center-window", attributes: { role: "dialog", "aria-modal": "false", "aria-label": translateSource("Control Center") } }, [
      element("header", {}, [element("span", {}, [element("small", { text: "ETHONE OS", attributes: { translate: "no" } }), element("strong", { text: translateSource("Control Center") })]), editorControl("close-cc", "", translateSource("Fermer"), "x")]),
      controlCenterPanel()
    ]));
    if (editing) children.push(element("section", { className: "v8-dock-editor", attributes: { role: "dialog", "aria-modal": "false", "aria-label": translateSource("Personnaliser le Dock") } }, [
      element("header", {}, [element("span", {}, [element("small", { text: "ETHONE OS", attributes: { translate: "no" } }), element("strong", { text: translateSource("Personnaliser le Dock") })]), editorControl("close", "", translateSource("Fermer"), "x")]),
      dockCustomizerPanel(),
      element("div", { className: "v8-dock-editor__list" }, NAVIGATION_ITEMS.map((item) => editorNode(item, order))),
      element("footer", {}, [element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { dockCommand: "reset" } }, [icon("rotate-ccw"), element("span", { text: translateSource("Reinitialiser") })])])
    ]));
    host.replaceChildren(...children);
    refreshIcons();
    focusPopover?.destroy?.();
    const pomodoroButton = host.querySelector('[data-dock-command="pomodoro"]');
    if (pomodoroButton && options.focusTimer) {
      focusPopover = attachFocusPopover(pomodoroButton, { focusTimer: options.focusTimer, onAction: options.onAction });
    }
    const floating = host.querySelector(".v8-dock-editor, .v8-dock-launcher, .v8-control-center-window");
    if (floating) {
      const triggerSelector = controlCenterOpen ? "[data-dock-command=control-center]" : (editing ? "[data-dock-command=edit]" : "[data-dock-command=more]");
      const trigger = host.querySelector(triggerSelector);
      layerRegistration = layerManager.register({
        element: floating,
        boundary: floating,
        anchor: trigger,
        returnFocus: trigger,
        kind: "popover",
        closeOnEscape: true,
        closeOnOutside: true,
        closeOnResize: true,
        rovingSelector: "button:not([disabled])",
        onDismiss: (reason) => {
          editing = false;
          controlCenterOpen = false;
          launcherOpen = false;
          render(reason === "escape" ? triggerSelector : "");
        }
      });
    }
    if (focusSelector) host.querySelector(focusSelector)?.focus({ preventScroll: true });
  }

  function commit(next, focusSelector = "") {
    order = normalizeDockOrder(next);
    persist();
    options.onChange?.(Object.freeze([...order]));
    render(focusSelector);
  }

  function handleClick(event) {
    if (suppressTouchClick && event.target.closest?.(".v8-dock-app")) {
      suppressTouchClick = false;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return;
    }
    const launcherApp = event.target.closest?.("[data-dock-launch]");
    if (launcherApp && host.contains(launcherApp)) {
      launcherOpen = false;
      return;
    }
    const configBtn = event.target.closest?.("[data-dock-config-action]");
    if (configBtn && host.contains(configBtn)) {
      event.preventDefault();
      event.stopPropagation();
      const actionId = configBtn.dataset.dockConfigAction;
      options.onAction?.(actionId, { source: "dock-editor" });
      const el = typeof document !== "undefined" ? document.documentElement : null;
      if (el) {
        if (actionId.startsWith("v8.dock.scale.")) {
          const val = actionId.split(".").pop();
          if (val !== "normal") el.dataset.v8DockScale = val;
          else delete el.dataset.v8DockScale;
        } else if (actionId.startsWith("v8.dock.align.")) {
          const val = actionId.split(".").pop();
          if (val !== "center") el.dataset.v8DockAlign = val;
          else delete el.dataset.v8DockAlign;
        } else if (actionId.startsWith("v8.dock.glass.")) {
          const val = actionId.split(".").pop();
          if (val !== "default") el.dataset.v8DockGlass = val;
          else delete el.dataset.v8DockGlass;
        } else if (actionId.startsWith("v8.dock.autohide.")) {
          const val = actionId.split(".").pop();
          if (val === "on") el.dataset.v8DockAutohide = "true";
          else delete el.dataset.v8DockAutohide;
        } else if (actionId.startsWith("v8.dock.magnify.")) {
          const val = actionId.split(".").pop();
          el.dataset.v8DockMagnify = val === "on" ? "true" : "false";
        } else if (actionId.startsWith("v8.ui.animations.")) {
          const val = actionId.split(".").pop();
          el.dataset.v8Animations = val;
        } else if (actionId.startsWith("v8.ui.glow.")) {
          const val = actionId.split(".").pop();
          el.dataset.v8UiGlow = val === "on" ? "true" : "false";
        } else if (actionId.startsWith("v8.ui.sound.feedback.")) {
          const val = actionId.split(".").pop();
          el.dataset.v8UiSoundFeedback = val === "on" ? "true" : "false";
        } else if (actionId.startsWith("v8.sound.pack.")) {
          const val = actionId.split("v8.sound.pack.").pop();
          el.dataset.v8SoundPack = val;
        }
      }
      render(`[data-dock-config-action="${actionId}"]`);
      return;
    }
    const control = event.target.closest?.("[data-dock-command]");
    if (!control || !host.contains(control)) return;
    event.preventDefault();
    event.stopPropagation();
    const command = control.dataset.dockCommand;
    const id = control.dataset.dockId || "";
    if (command === "control-center") {
      controlCenterOpen = !controlCenterOpen;
      editing = false;
      launcherOpen = false;
      render(controlCenterOpen ? "[data-dock-command=close-cc]" : "[data-dock-command=control-center]");
    } else if (command === "close-cc") {
      controlCenterOpen = false;
      render("[data-dock-command=control-center]");
    } else if (command === "spotlight") {
      options.onAction?.("v8.command.open", { source: "dock" });
      return;
    } else if (command === "notifications") {
      options.onAction?.("v8.notifications.open", { source: "dock" });
      return;
    } else if (command === "mission") {
      options.onAction?.("v8.mission.open", { source: "dock" });
      return;
    } else if (command === "edit") {
      editing = !editing;
      controlCenterOpen = false;
      launcherOpen = false;
      render(editing ? "[data-dock-command=close]" : "[data-dock-command=edit]");
    } else if (command === "more") {
      launcherOpen = !launcherOpen;
      editing = false;
      controlCenterOpen = false;
      render(launcherOpen ? "[data-dock-command=more-close]" : "[data-dock-command=more]");
    } else if (command === "more-close") {
      launcherOpen = false;
      render("[data-dock-command=more]");
    } else if (command === "close") {
      editing = false;
      render("[data-dock-command=edit]");
    } else if (command === "reset") {
      commit(DEFAULT_DOCK_IDS, "[data-dock-command=reset]");
    } else if (command === "toggle") {
      commit(order.includes(id) ? order.filter((item) => item !== id) : [...order, id], `[data-dock-command="toggle"][data-dock-id="${id}"]`);
    } else if (command === "left" || command === "right") {
      commit(moveDockItem(order, id, command === "left" ? -1 : 1), `[data-dock-command="toggle"][data-dock-id="${id}"]`);
    }
  }

  function handleKeydown(event) {
    const current = event.target.closest?.(".v8-dock-app");
    if (current && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      current.click();
      return;
    }
    if (!current || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const apps = [...host.querySelectorAll(".v8-dock-app")];
    const index = apps.indexOf(current);
    const target = event.key === "Home" ? 0 : event.key === "End" ? apps.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + apps.length) % apps.length;
    event.preventDefault();
    apps[target]?.focus({ preventScroll: true });
  }

  function handleDragStart(event) {
    if (touchMedia.matches) {
      event.preventDefault();
      return;
    }
    const item = event.target.closest?.(".v8-dock-app");
    if (!item) return;
    dragged = item.dataset.dockId || "";
    item.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragged);
    }
  }

  function handleDragOver(event) {
    const target = event.target.closest?.(".v8-dock-app");
    if (!dragged || !target || target.dataset.dockId === dragged) return;
    event.preventDefault();
    host.querySelector(".is-drop-target")?.classList.remove("is-drop-target");
    target.classList.add("is-drop-target");
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  }

  function handleDrop(event) {
    const target = event.target.closest?.(".v8-dock-app");
    if (!dragged || !target) return;
    event.preventDefault();
    commit(moveDockItemBefore(order, dragged, target.dataset.dockId));
    dragged = "";
  }

  function handleDragEnd() {
    dragged = "";
    host.querySelectorAll(".is-dragging,.is-drop-target").forEach((item) => item.classList.remove("is-dragging", "is-drop-target"));
  }

  function clearTouchHold() {
    if (touchHoldTimer) globalThis.clearTimeout?.(touchHoldTimer);
    touchHoldTimer = 0;
    touchHold?.item?.removeAttribute?.("data-touch-hold");
    touchHold = null;
  }

  function handlePointerDown(event) {
    if (!touchMedia.matches || event.pointerType === "mouse" || event.button > 0 || event.isPrimary === false) return;
    const item = event.target.closest?.(".v8-dock-app");
    if (!item) return;
    clearTouchHold();
    touchHold = { item, id: item.dataset.dockId, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    item.dataset.touchHold = "pending";
    touchHoldTimer = globalThis.setTimeout?.(() => {
      if (!touchHold || touchHold.item !== item) return;
      const id = touchHold.id;
      suppressTouchClick = true;
      editing = true;
      launcherOpen = false;
      touchHoldTimer = 0;
      touchHold = null;
      render(`[data-dock-command="toggle"][data-dock-id="${id}"]`);
    }, 520) || 0;
  }

  function handlePointerMove(event) {
    if (!touchHold || event.pointerId !== touchHold.pointerId) return;
    if (Math.hypot(event.clientX - touchHold.x, event.clientY - touchHold.y) > 10) clearTouchHold();
  }

  function handlePointerEnd(event) {
    if (touchHold && (event.pointerId == null || event.pointerId === touchHold.pointerId)) clearTouchHold();
  }

  function handleMediaChange() {
    launcherOpen = false;
    clearTouchHold();
    render();
  }

  host.addEventListener("click", handleClick);
  host.addEventListener("keydown", handleKeydown);
  host.addEventListener("dragstart", handleDragStart);
  host.addEventListener("dragover", handleDragOver);
  host.addEventListener("drop", handleDrop);
  host.addEventListener("dragend", handleDragEnd);
  host.addEventListener("pointerdown", handlePointerDown);
  host.addEventListener("pointermove", handlePointerMove, { passive: true });
  host.addEventListener("pointerup", handlePointerEnd);
  host.addEventListener("pointercancel", handlePointerEnd);
  touchMedia.addEventListener?.("change", handleMediaChange);
  compactMedia.addEventListener?.("change", handleMediaChange);
  render();

  return Object.freeze({
    update(route) {
      if (!route || route === activeRoute) return;
      activeRoute = route;
      if (compactMedia.matches) {
        launcherOpen = false;
        render();
        return;
      }
      host.querySelectorAll(".v8-dock-app").forEach((item) => {
        const active = item.dataset.dockId === activeRoute;
        item.classList.toggle("is-active", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      });
    },
    updateMedia(next = {}) {
      mediaState = next;
      const slot = host.querySelector(".v8-dock-media-slot");
      if (!slot) return false;
      const indicator = spotifyDockIndicator(mediaState);
      slot.replaceChildren(...(indicator ? [indicator] : []));
      slot.hidden = !indicator;
      scheduleIconRefresh();
      return Boolean(indicator);
    },
    updateNotificationCount(count) {
      const badge = host.querySelector(".v8-dock-notification-badge");
      if (!badge) return;
      const n = Math.max(0, Number(count) || 0);
      badge.textContent = n > 99 ? "99+" : String(n);
      badge.hidden = n === 0;
    },
    order: () => Object.freeze([...order]),
    setOrder(next) {
      const normalized = normalizeDockOrder(next);
      if (JSON.stringify(normalized) === JSON.stringify(order)) return false;
      commit(normalized);
      return true;
    },
    destroy() {
      layerRegistration?.release?.({ restoreFocus: false });
      layerRegistration = null;
      host.removeEventListener("click", handleClick);
      host.removeEventListener("keydown", handleKeydown);
      host.removeEventListener("dragstart", handleDragStart);
      host.removeEventListener("dragover", handleDragOver);
      host.removeEventListener("drop", handleDrop);
      host.removeEventListener("dragend", handleDragEnd);
      host.removeEventListener("pointerdown", handlePointerDown);
      host.removeEventListener("pointermove", handlePointerMove);
      host.removeEventListener("pointerup", handlePointerEnd);
      host.removeEventListener("pointercancel", handlePointerEnd);
      touchMedia.removeEventListener?.("change", handleMediaChange);
      compactMedia.removeEventListener?.("change", handleMediaChange);
      clearTouchHold();
      host.replaceChildren();
    }
  });
}
