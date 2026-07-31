import { focusableLayerNodes, getLayerManager } from "./layer-manager.mjs";

export { focusableLayerNodes as focusableWindowNodes } from "./layer-manager.mjs";

function focusTarget(target, layer) {
  const resolved = typeof target === "function" ? target()
    : typeof target === "string" ? layer?.querySelector?.(target)
      : target;
  resolved?.focus?.({ preventScroll: true });
}

export function createWindowController(options = {}) {
  const documentRef = options.document || globalThis.document;
  const runtime = options.runtime || globalThis;
  const layerManager = options.layerManager || getLayerManager({ document: documentRef, runtime });
  const duration = Math.max(0, Number(options.duration) || 220);
  let activeLayer = null;
  let exitingLayer = null;
  let activeConfig = null;
  let exitingConfig = null;
  let exitTimer = 0;
  let layerRegistration = null;

  function finishExit() {
    if (exitTimer) runtime.clearTimeout?.(exitTimer);
    exitTimer = 0;
    if (exitingConfig?.retain) exitingLayer.hidden = true;
    else exitingLayer?.remove?.();
    exitingConfig?.onAfterClose?.(exitingLayer);
    exitingLayer = null;
    exitingConfig = null;
  }

  function open(layer, config = {}) {
    if (!layer || activeLayer) return false;
    finishExit();
    activeLayer = layer;
    activeConfig = config;
    const surface = layer.querySelector?.("[rôle='dialog']") || layer;
    layer.inert = false;
    layer.removeAttribute?.("aria-hidden");
    layer.dataset.windowState = "opening";
    layer.dataset.windowModal = String(config.modal !== false);
    layer.classList?.add("v8-window-layer");
    surface.classList?.add("v8-window-surface");
    layerRegistration = layerManager.register({
      element: layer,
      boundary: surface,
      kind: config.modal === false ? "panel" : "dialog",
      modal: config.modal !== false,
      trapFocus: config.modal !== false,
      closeOnEscape: config.closeOnEscape !== false,
      closeOnOutside: config.closeOnOutside !== false,
      onDismiss: (reason) => (config.onDismiss || options.onDismiss || options.onEscape)?.(reason)
    });
    layer.getBoundingClientRect?.();
    layer.classList?.add("is-open");
    layer.dataset.windowState = "open";
    const initialFocus = config.initialFocus || (() => focusableLayerNodes(layer)[0]);
    (runtime.queueMicrotask || ((callback) => Promise.resolve().then(callback)))(() => focusTarget(initialFocus, layer));
    return true;
  }

  function close(config = {}) {
    if (!activeLayer) return false;
    const current = activeLayer;
    activeLayer = null;
    exitingConfig = activeConfig;
    activeConfig = null;
    current.inert = true;
    current.setAttribute?.("aria-hidden", "true");
    current.dataset.windowState = "closing";
    current.classList?.remove("is-open");
    exitingLayer = current;
    layerRegistration?.release?.({ restoreFocus: config.restoreFocus !== false });
    layerRegistration = null;
    exitTimer = runtime.setTimeout?.(finishExit, duration) || 0;
    return true;
  }

  function destroy() {
    if (activeLayer) {
      const current = activeLayer;
      activeLayer = null;
      activeConfig = null;
      layerRegistration?.release?.({ restoreFocus: false });
      layerRegistration = null;
      current.remove?.();
    }
    finishExit();
  }

  return Object.freeze({ open, close, destroy, isOpen: () => Boolean(activeLayer) });
}
