import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";
import { computeFloatingPosition, getLayerManager } from "./layer-manager.mjs";

const ITEMS = Object.freeze([
  { actionId: "v8.notes.new", label: "Nouvelle note", icon: "file-plus-2" },
  { actionId: "v8.tasks.new", label: "Nouvelle tache", icon: "list-plus" },
  { separator: true },
  { actionId: "v8.command.open", label: "Command Center", icon: "search", shortcut: "Ctrl K" },
  { actionId: "v8.mission.open", label: "Mission Control", icon: "layout-dashboard", shortcut: "Ctrl Shift M" },
  { separator: true },
  { actionId: "v8.appearance.cycle", label: "Changer l'accent", icon: "palette" }
]);

export function createContextMenu(host, options = {}) {
  const documentRef = host?.ownerDocument || globalThis.document;
  const runtime = documentRef?.defaultView || globalThis;
  const layerManager = getLayerManager({ document: documentRef, runtime });
  let menu = null;
  let layerRegistration = null;

  function close(opts = {}) {
    if (!menu) return false;
    const current = menu;
    menu = null;
    layerRegistration?.release?.({ restoreFocus: opts.restoreFocus === true });
    layerRegistration = null;
    current.remove();
    return true;
  }

  function open(x, y, openOpts = {}) {
    close({ restoreFocus: false });
    const items = ITEMS.map((item) => item.separator
      ? element("hr", { className: "v8-context-menu__divider" })
      : element("button", {
        className: "v8-context-menu__item",
        attributes: { type: "button", role: "menuitem" },
        dataset: { action: item.actionId },
        events: {
          click: (event) => {
            event.preventDefault();
            event.stopPropagation();
            close({ restoreFocus: false });
            if (options.onAction) {
              options.onAction(item.actionId, { source: "context-menu", event });
            }
          }
        }
      }, [icon(item.icon), element("span", { text: item.label }), item.shortcut ? element("kbd", { text: item.shortcut }) : null]));
    menu = element("div", {
      className: "v8-context-menu",
      attributes: { role: "menu", "aria-label": "Actions rapides" }
    }, items);
    host.append(menu);
    refreshIcons();
    const position = computeFloatingPosition({
      point: { x, y },
      floating: menu.getBoundingClientRect(),
      viewport: { width: runtime.innerWidth, height: runtime.innerHeight }
    });
    menu.dataset.placement = position.placement;
    menu.style.left = `${position.x}px`;
    menu.style.top = `${position.y}px`;
    menu.style.maxHeight = `${position.maxHeight}px`;
    layerRegistration = layerManager.register({
      element: menu,
      boundary: menu,
      anchor: options.anchor || null,
      returnFocus: options.anchor || null,
      kind: "popover",
      closeOnEscape: true,
      closeOnOutside: true,
      closeOnScroll: true,
      closeOnResize: true,
      closeOnTab: true,
      rovingSelector: "button:not([disabled])",
      onDismiss: (reason) => close({ restoreFocus: reason === "escape" || reason === "tab" })
    });
    menu.querySelector("button")?.focus({ preventScroll: true });
    return true;
  }

  return Object.freeze({ open, close, isOpen: () => Boolean(menu), destroy: close });
}
