import test from "node:test";
import assert from "node:assert/strict";

import { computeFloatingPosition, fitLayerPoint, getLayerManager } from "../v8/ui/layer-manager.mjs";

function eventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, listener, options = {}) {
      listeners.set(type, listener);
      options.signal?.addEventListener?.("abort", () => listeners.delete(type), { once: true });
    }
  };
}

function styleStore() {
  const values = new Map();
  return {
    values,
    setProperty: (name, value) => values.set(name, value),
    removeProperty: (name) => values.delete(name)
  };
}

function focusNode(name, documentRef) {
  const node = {
    name,
    hidden: false,
    disabled: false,
    inert: false,
    isConnected: true,
    getAttribute: () => null,
    focus: () => { documentRef.activeElement = node; }
  };
  return node;
}

function layer(nodes = []) {
  const style = styleStore();
  const root = {
    dataset: {},
    style,
    hidden: false,
    inert: false,
    querySelectorAll: () => nodes,
    contains: (node) => node === root || nodes.includes(node)
  };
  return root;
}

test("floating positions flip, clamp and preserve a safe viewport margin", () => {
  assert.deepEqual(fitLayerPoint({ x: 390, y: 790, floating: { width: 180, height: 240 }, viewport: { width: 400, height: 800 } }), {
    x: 212,
    y: 552,
    maxHeight: 784
  });
  const positioned = computeFloatingPosition({
    anchor: { left: 340, right: 388, top: 742, bottom: 786, width: 48, height: 44 },
    floating: { width: 220, height: 260 },
    viewport: { width: 400, height: 800 },
    preferred: "bottom-end"
  });
  assert.equal(positioned.placement, "top-end");
  assert.ok(positioned.x >= 8 && positioned.x + 220 <= 392);
  assert.ok(positioned.y >= 8 && positioned.y + 260 <= 792);
});

test("one layer manager owns stack order, modal focus, Escape and outside dismissal", () => {
  const documentEvents = eventTarget();
  const runtimeEvents = eventTarget();
  const documentRef = {
    ...documentEvents,
    documentElement: { dataset: {} },
    activeElement: null
  };
  const runtime = {
    ...runtimeEvents,
    queueMicrotask: (callback) => callback()
  };
  const origin = focusNode("origin", documentRef);
  const first = focusNode("first", documentRef);
  const last = focusNode("last", documentRef);
  const dialog = layer([first, last]);
  documentRef.activeElement = origin;
  const manager = getLayerManager({ document: documentRef, runtime });
  let dialogDismissed = "";
  const dialogHandle = manager.register({
    element: dialog,
    kind: "dialog",
    modal: true,
    trapFocus: true,
    closeOnEscape: true,
    closeOnOutside: true,
    onDismiss: (reason) => { dialogDismissed = reason; }
  });

  assert.deepEqual(manager.diagnostics(), { active: 1, modal: 1, kinds: ["dialog"], listeners: 4 });
  assert.equal(documentRef.documentElement.dataset.modalOpen, "true");
  assert.equal(documentRef.documentElement.dataset.windowOpen, "true");
  assert.equal(dialog.style.values.get("--v8-layer-stack"), "calc(var(--v8-z-dialog) + 0)");

  documentRef.activeElement = last;
  let prevented = false;
  documentEvents.listeners.get("keydown")({ key: "Tab", shiftKey: false, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(documentRef.activeElement, first);

  const anchor = focusNode("anchor", documentRef);
  const menuButton = focusNode("menu", documentRef);
  const menu = layer([menuButton]);
  let menuDismissed = "";
  let menuHandle = null;
  menuHandle = manager.register({
    element: menu,
    boundary: menu,
    anchor,
    returnFocus: anchor,
    kind: "popover",
    closeOnEscape: true,
    closeOnOutside: true,
    rovingSelector: "button",
    onDismiss: (reason) => {
      menuDismissed = reason;
      menuHandle.release({ restoreFocus: false });
    }
  });
  assert.equal(menu.style.values.get("--v8-layer-stack"), "calc(var(--v8-z-dialog) + 1)");
  documentEvents.listeners.get("keydown")({ key: "Escape", preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} });
  assert.equal(menuDismissed, "escape");
  assert.equal(dialogDismissed, "");

  let outsideHandle = null;
  outsideHandle = manager.register({
    element: menu,
    boundary: menu,
    kind: "popover",
    closeOnOutside: true,
    onDismiss: (reason) => {
      menuDismissed = reason;
      outsideHandle.release({ restoreFocus: false });
    }
  });
  documentEvents.listeners.get("pointerdown")({ target: {} });
  assert.equal(menuDismissed, "outside");

  dialogHandle.release();
  assert.equal(documentRef.activeElement, origin);
  assert.deepEqual(manager.diagnostics(), { active: 0, modal: 0, kinds: [], listeners: 0 });
  assert.equal("uiLayerCount" in documentRef.documentElement.dataset, false);
  assert.equal(documentEvents.listeners.size, 0);
  assert.equal(runtimeEvents.listeners.size, 0);
});
