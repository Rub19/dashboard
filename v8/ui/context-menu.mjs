import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";

const ITEMS = Object.freeze([
  { actionId: "v8.notes.new", label: "Nouvelle note", icon: "file-plus-2" },
  { actionId: "v8.tasks.new", label: "Nouvelle tache", icon: "list-plus" },
  { separator: true },
  { actionId: "v8.command.open", label: "Command Center", icon: "search", shortcut: "Ctrl K" },
  { actionId: "v8.mission.open", label: "Mission Control", icon: "layout-dashboard", shortcut: "Ctrl Shift M" },
  { separator: true },
  { actionId: "v8.appearance.cycle", label: "Changer l'accent", icon: "palette" }
]);

export function createContextMenu(host) {
  let menu = null;

  function close() {
    if (!menu) return false;
    menu.remove();
    menu = null;
    return true;
  }

  function open(x, y) {
    close();
    const items = ITEMS.map((item) => item.separator
      ? element("hr", { className: "v8-context-menu__divider" })
      : element("button", {
        className: "v8-context-menu__item",
        attributes: { type: "button", role: "menuitem" },
        dataset: { action: item.actionId },
        events: { click: () => queueMicrotask(close) }
      }, [icon(item.icon), element("span", { text: item.label }), item.shortcut ? element("kbd", { text: item.shortcut }) : null]));
    menu = element("div", {
      className: "v8-context-menu",
      attributes: { role: "menu", "aria-label": "Actions rapides" }
    }, items);
    host.append(menu);
    const width = 244;
    const height = 270;
    menu.style.left = `${Math.max(8, Math.min(x, globalThis.innerWidth - width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(y, globalThis.innerHeight - height - 8))}px`;
    refreshIcons();
    menu.querySelector("button")?.focus({ preventScroll: true });
    return true;
  }

  return Object.freeze({ open, close, isOpen: () => Boolean(menu), destroy: close });
}
