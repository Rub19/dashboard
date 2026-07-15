import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";
import { computeFloatingPosition, getLayerManager } from "./layer-manager.mjs";

const DENSITY_OPTIONS = Object.freeze([
  Object.freeze({ id: "automatic", label: "Densite automatique", icon: "sparkles", actionId: "v8.density.automatic" }),
  Object.freeze({ id: "comfortable", label: "Densite confortable", icon: "rows-3", actionId: "v8.density.comfortable" }),
  Object.freeze({ id: "compact", label: "Densite compacte", icon: "align-justify", actionId: "v8.density.compact" })
]);

function stringId(value) {
  return String(value ?? "");
}

export function createSelectionState(initial = []) {
  const selected = new Set((Array.isArray(initial) ? initial : []).map(stringId).filter(Boolean));

  function toggle(id, force) {
    const key = stringId(id);
    if (!key) return false;
    const next = typeof force === "boolean" ? force : !selected.has(key);
    if (next) selected.add(key);
    else selected.delete(key);
    return next;
  }

  function replace(ids = []) {
    selected.clear();
    (Array.isArray(ids) ? ids : []).map(stringId).filter(Boolean).forEach((id) => selected.add(id));
    return values();
  }

  function prune(ids = []) {
    const available = new Set((Array.isArray(ids) ? ids : []).map(stringId));
    [...selected].forEach((id) => { if (!available.has(id)) selected.delete(id); });
    return values();
  }

  function values() {
    return Object.freeze([...selected]);
  }

  return Object.freeze({
    toggle,
    replace,
    prune,
    clear: () => replace([]),
    has: (id) => selected.has(stringId(id)),
    size: () => selected.size,
    values
  });
}

export function selectionControl(options = {}) {
  const checked = options.checked === true;
  return element("button", {
    className: `v8-selection-control${checked ? " is-selected" : ""}`,
    attributes: {
      type: "button",
      role: "checkbox",
      "aria-checked": checked ? "true" : "false",
      "aria-label": options.label || "Selectionner"
    },
    dataset: { collectionSelect: options.id }
  }, [icon(checked ? "check" : "square")]);
}

export function collectionDensityControl(mode = "automatic") {
  const control = element("div", {
    className: "v8-collection-density",
    attributes: { role: "group", "aria-label": "Densite d'affichage" }
  }, DENSITY_OPTIONS.map((entry) => element("button", {
    className: entry.id === mode ? "is-active" : "",
    attributes: {
      type: "button",
      "aria-label": entry.label,
      "aria-pressed": entry.id === mode ? "true" : "false"
    },
    dataset: { action: entry.actionId, collectionDensity: entry.id, tooltip: entry.label }
  }, [icon(entry.icon)])));
  return control;
}

export function updateCollectionDensityControl(control, state = {}) {
  const requested = String(state.density || document.documentElement.dataset.density || "automatic");
  control?.querySelectorAll?.("[data-collection-density]").forEach((button) => {
    const active = button.dataset.collectionDensity === requested;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

export function bulkActionBar(options = {}) {
  const count = Math.max(0, Number(options.count) || 0);
  const visibleIds = Array.isArray(options.visibleIds) ? options.visibleIds.map(stringId).filter(Boolean) : [];
  const allSelected = Boolean(visibleIds.length && options.selection?.size?.() >= visibleIds.length && visibleIds.every((id) => options.selection.has(id)));
  const actions = (Array.isArray(options.actions) ? options.actions : []).filter(Boolean);
  const bar = element("div", {
    className: "v8-bulk-bar",
    attributes: { role: "toolbar", "aria-label": "Actions groupees", hidden: count ? null : "" }
  }, [
    element("button", {
      className: `v8-selection-control${allSelected ? " is-selected" : ""}`,
      attributes: {
        type: "button",
        role: "checkbox",
        "aria-checked": allSelected ? "true" : "false",
        "aria-label": allSelected ? "Deselectionner les elements visibles" : "Selectionner les elements visibles"
      },
      events: { click: () => options.onToggleAll?.(!allSelected) }
    }, [icon(allSelected ? "check-check" : "square-dashed")]),
    element("strong", { text: `${count} élément${count > 1 ? "s" : ""}`, attributes: { "aria-live": "polite" } }),
    element("span", { className: "v8-bulk-bar__spacer" }),
    ...actions.map((action) => element("button", {
      className: `v8-button${action.tone ? ` v8-button--${action.tone}` : ""}`,
      attributes: { type: "button", disabled: action.disabled === true ? "" : null },
      events: { click: () => action.onSelect?.() }
    }, [icon(action.icon || "check"), element("span", { text: action.label || "Action" })])),
    element("button", {
      className: "v8-icon-button",
      attributes: { type: "button", "aria-label": "Effacer la selection" },
      events: { click: () => options.onClear?.() }
    }, [icon("x")])
  ]);
  return bar;
}

export function createRowMenuController(host = globalThis.document?.body) {
  const documentRef = host?.ownerDocument || globalThis.document;
  const runtime = documentRef?.defaultView || globalThis;
  const layerManager = getLayerManager({ document: documentRef, runtime });
  let menu = null;
  let anchor = null;
  let layerRegistration = null;

  function close(options = {}) {
    if (!menu) return false;
    const current = menu;
    menu = null;
    layerRegistration?.release?.({ restoreFocus: options.restoreFocus !== false });
    layerRegistration = null;
    current.remove();
    anchor?.setAttribute?.("aria-expanded", "false");
    anchor = null;
    return true;
  }

  function open(nextAnchor, items = [], options = {}) {
    close({ restoreFocus: false });
    const entries = (Array.isArray(items) ? items : []).filter((entry) => entry && !entry.hidden);
    if (!entries.length) return false;
    anchor = nextAnchor || null;
    anchor?.setAttribute?.("aria-expanded", "true");
    menu = element("div", {
      className: "v8-row-menu",
      attributes: { role: "menu", "aria-label": options.label || "Actions de l'element" }
    }, entries.map((entry) => entry.separator
      ? element("hr", { className: "v8-row-menu__separator" })
      : element("button", {
        className: entry.tone === "danger" ? "is-danger" : "",
        attributes: { type: "button", role: "menuitem", disabled: entry.disabled === true ? "" : null },
        events: { click: () => { close({ restoreFocus: false }); entry.onSelect?.(); } }
      }, [icon(entry.icon || "circle"), element("span", { text: entry.label || "Action" }), entry.shortcut ? element("kbd", { text: entry.shortcut }) : null])));
    host.append(menu);
    refreshIcons();
    const position = computeFloatingPosition({
      anchor: anchor?.getBoundingClientRect?.(),
      point: options.point,
      floating: menu.getBoundingClientRect(),
      viewport: { width: runtime.innerWidth, height: runtime.innerHeight },
      preferred: "bottom-end"
    });
    menu.dataset.placement = position.placement;
    menu.style.left = `${position.x}px`;
    menu.style.top = `${position.y}px`;
    menu.style.maxHeight = `${position.maxHeight}px`;
    layerRegistration = layerManager.register({
      element: menu,
      boundary: menu,
      anchor,
      returnFocus: anchor,
      kind: "popover",
      closeOnEscape: true,
      closeOnOutside: true,
      closeOnScroll: true,
      closeOnResize: true,
      closeOnTab: true,
      rovingSelector: "button:not([disabled])",
      onDismiss: (reason) => close({ restoreFocus: reason === "escape" || reason === "tab" })
    });
    menu.querySelector("button:not([disabled])")?.focus?.({ preventScroll: true });
    return true;
  }

  return Object.freeze({ open, close, destroy: () => close({ restoreFocus: false }), isOpen: () => Boolean(menu) });
}
