const FOCUSABLE_SELECTOR = "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";

export function focusableWindowNodes(root) {
  if (!root?.querySelectorAll) return [];
  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter((node) => (
    !node.hidden && !node.disabled && !node.inert && node.getAttribute?.("aria-hidden") !== "true"
  ));
}

function focusTarget(target, layer) {
  const resolved = typeof target === "function" ? target()
    : typeof target === "string" ? layer?.querySelector?.(target)
      : target;
  resolved?.focus?.({ preventScroll: true });
}

export function createWindowController(options = {}) {
  const documentRef = options.document || globalThis.document;
  const runtime = options.runtime || globalThis;
  const duration = Math.max(0, Number(options.duration) || 220);
  let activeLayer = null;
  let exitingLayer = null;
  let activeConfig = null;
  let exitingConfig = null;
  let exitTimer = 0;
  let returnFocus = null;
  let keydownListener = null;

  function updateDocumentState() {
    const dataset = documentRef?.documentElement?.dataset;
    if (!dataset) return;
    if (activeLayer || exitingLayer) dataset.windowOpen = "true";
    else delete dataset.windowOpen;
  }

  function finishExit() {
    if (exitTimer) runtime.clearTimeout?.(exitTimer);
    exitTimer = 0;
    if (exitingConfig?.retain) exitingLayer.hidden = true;
    else exitingLayer?.remove?.();
    exitingConfig?.onAfterClose?.(exitingLayer);
    exitingLayer = null;
    exitingConfig = null;
    updateDocumentState();
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && typeof options.onEscape === "function") {
      event.preventDefault?.();
      event.stopPropagation?.();
      options.onEscape();
      return;
    }
    if (event.key !== "Tab" || activeLayer?.dataset.windowModal !== "true") return;
    const nodes = focusableWindowNodes(activeLayer);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes.at(-1);
    if (event.shiftKey && documentRef.activeElement === first) {
      event.preventDefault?.();
      last.focus?.({ preventScroll: true });
    } else if (!event.shiftKey && documentRef.activeElement === last) {
      event.preventDefault?.();
      first.focus?.({ preventScroll: true });
    }
  }

  function open(layer, config = {}) {
    if (!layer || activeLayer) return false;
    finishExit();
    activeLayer = layer;
    activeConfig = config;
    returnFocus = documentRef?.activeElement?.focus ? documentRef.activeElement : null;
    const surface = layer.querySelector?.("[role='dialog']") || layer;
    layer.inert = false;
    layer.removeAttribute?.("aria-hidden");
    layer.dataset.windowState = "opening";
    layer.dataset.windowModal = String(config.modal !== false);
    layer.classList?.add("v8-window-layer");
    surface.classList?.add("v8-window-surface");
    keydownListener = handleKeydown;
    layer.addEventListener?.("keydown", keydownListener);
    updateDocumentState();
    layer.getBoundingClientRect?.();
    layer.classList?.add("is-open");
    layer.dataset.windowState = "open";
    const initialFocus = config.initialFocus || (() => focusableWindowNodes(layer)[0]);
    (runtime.queueMicrotask || ((callback) => Promise.resolve().then(callback)))(() => focusTarget(initialFocus, layer));
    return true;
  }

  function close(config = {}) {
    if (!activeLayer) return false;
    const current = activeLayer;
    activeLayer = null;
    exitingConfig = activeConfig;
    activeConfig = null;
    if (keydownListener) current.removeEventListener?.("keydown", keydownListener);
    keydownListener = null;
    current.inert = true;
    current.setAttribute?.("aria-hidden", "true");
    current.dataset.windowState = "closing";
    current.classList?.remove("is-open");
    exitingLayer = current;
    if (config.restoreFocus !== false) {
      const target = returnFocus;
      (runtime.queueMicrotask || ((callback) => Promise.resolve().then(callback)))(() => {
        if (target?.isConnected !== false) target?.focus?.({ preventScroll: true });
      });
    }
    returnFocus = null;
    exitTimer = runtime.setTimeout?.(finishExit, duration) || 0;
    updateDocumentState();
    return true;
  }

  function destroy() {
    if (activeLayer) {
      const current = activeLayer;
      activeLayer = null;
      activeConfig = null;
      if (keydownListener) current.removeEventListener?.("keydown", keydownListener);
      current.remove?.();
    }
    keydownListener = null;
    returnFocus = null;
    finishExit();
  }

  return Object.freeze({ open, close, destroy, isOpen: () => Boolean(activeLayer) });
}
