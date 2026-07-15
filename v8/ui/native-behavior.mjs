const EDITABLE_SELECTOR = [
  "input:not([type='button']):not([type='submit']):not([type='reset'])",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[data-native-selection='allow']"
].join(",");

const BROWSER_CONTEXT_SELECTOR = [
  EDITABLE_SELECTOR,
  "a[href]",
  "img",
  "video",
  "audio",
  "[data-native-context='browser']"
].join(",");

const NATIVE_CHROME_SELECTOR = [
  ".v8-topbar",
  ".v8-rail",
  ".v8-status-bar",
  ".v8-floating-dock",
  ".v8-breadcrumbs",
  ".v8-panel__header",
  ".v8-window-controls",
  ".v8-context-menu",
  "[data-native-context='suppress']"
].join(",");

const EXPLICIT_DRAG_SELECTOR = "[draggable='true'],[data-native-drag='allow']";
const DEFAULT_DRAG_SELECTOR = "img,svg,a[href]";

function elementTarget(target) {
  if (target?.closest) return target;
  return target?.parentElement?.closest ? target.parentElement : null;
}

export function shouldPreserveBrowserContextMenu(target, options = {}) {
  const element = elementTarget(target);
  if (!element || options.shiftKey === true) return true;
  if (String(options.selection || "").trim()) return true;
  return Boolean(element.closest(BROWSER_CONTEXT_SELECTOR));
}

export function shouldPreventBrowserDrag(target) {
  const element = elementTarget(target);
  if (!element || element.closest(EXPLICIT_DRAG_SELECTOR)) return false;
  return Boolean(element.closest(DEFAULT_DRAG_SELECTOR));
}

export function createNativeBehavior(options = {}) {
  const documentRef = options.document || globalThis.document;
  const runtime = options.runtime || globalThis;
  let started = false;
  let blockedDrags = 0;
  let suppressedMenus = 0;

  function currentSelection() {
    try {
      return runtime.getSelection?.()?.toString?.() || "";
    } catch {
      return "";
    }
  }

  function handleDragStart(event) {
    if (!shouldPreventBrowserDrag(event.target)) return;
    event.preventDefault?.();
    blockedDrags += 1;
  }

  function handleContextMenu(event) {
    if (event.defaultPrevented) return;
    const target = elementTarget(event.target);
    if (!target?.closest?.(NATIVE_CHROME_SELECTOR)) return;
    if (shouldPreserveBrowserContextMenu(target, { selection: currentSelection(), shiftKey: event.shiftKey })) return;
    event.preventDefault?.();
    suppressedMenus += 1;
  }

  function start() {
    if (started || !documentRef?.addEventListener) return false;
    started = true;
    documentRef.addEventListener("dragstart", handleDragStart, true);
    documentRef.addEventListener("contextmenu", handleContextMenu, true);
    if (documentRef.documentElement?.dataset) documentRef.documentElement.dataset.v8NativeUi = "ready";
    return true;
  }

  function destroy() {
    if (!started) return false;
    started = false;
    documentRef.removeEventListener?.("dragstart", handleDragStart, true);
    documentRef.removeEventListener?.("contextmenu", handleContextMenu, true);
    if (documentRef.documentElement?.dataset) delete documentRef.documentElement.dataset.v8NativeUi;
    return true;
  }

  return Object.freeze({
    start,
    destroy,
    diagnostics: () => Object.freeze({ started, listeners: started ? 2 : 0, blockedDrags, suppressedMenus })
  });
}
