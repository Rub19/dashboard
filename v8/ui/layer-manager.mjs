const MANAGERS = new WeakMap();
const FOCUSABLE_SELECTOR = "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";
const ROVING_KEYS = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function viewportSize(viewport = {}) {
  return {
    width: Math.max(1, number(viewport.width, 1)),
    height: Math.max(1, number(viewport.height, 1))
  };
}

export function fitLayerPoint(options = {}) {
  const viewport = viewportSize(options.viewport);
  const floating = options.floating || {};
  const width = Math.max(0, number(floating.width));
  const height = Math.max(0, number(floating.height));
  const margin = Math.max(0, number(options.margin, 8));
  const maxX = Math.max(margin, viewport.width - width - margin);
  const maxY = Math.max(margin, viewport.height - height - margin);
  return Object.freeze({
    x: Math.round(Math.min(Math.max(number(options.x, margin), margin), maxX)),
    y: Math.round(Math.min(Math.max(number(options.y, margin), margin), maxY)),
    maxHeight: Math.max(0, Math.floor(viewport.height - (margin * 2)))
  });
}

function anchoredPoint(placement, anchor, floating, gap) {
  const width = Math.max(0, number(floating.width));
  const height = Math.max(0, number(floating.height));
  const left = number(anchor.left);
  const right = number(anchor.right, left + number(anchor.width));
  const top = number(anchor.top);
  const bottom = number(anchor.bottom, top + number(anchor.height));
  if (placement === "top-start") return { x: left, y: top - height - gap };
  if (placement === "top-end") return { x: right - width, y: top - height - gap };
  if (placement === "bottom-start") return { x: left, y: bottom + gap };
  return { x: right - width, y: bottom + gap };
}

export function computeFloatingPosition(options = {}) {
  const viewport = viewportSize(options.viewport);
  const floating = options.floating || {};
  const margin = Math.max(0, number(options.margin, 8));
  if (options.point) {
    const fitted = fitLayerPoint({
      x: options.point.x,
      y: options.point.y,
      floating,
      viewport,
      margin
    });
    return Object.freeze({ ...fitted, placement: "point" });
  }

  const preferred = ["bottom-end", "bottom-start", "top-end", "top-start"].includes(options.preferred)
    ? options.preferred
    : "bottom-end";
  const opposite = preferred.startsWith("bottom") ? preferred.replace("bottom", "top") : preferred.replace("top", "bottom");
  const alternate = preferred.endsWith("end") ? preferred.replace("end", "start") : preferred.replace("start", "end");
  const alternateOpposite = alternate.startsWith("bottom") ? alternate.replace("bottom", "top") : alternate.replace("top", "bottom");
  const candidates = [preferred, opposite, alternate, alternateOpposite];
  const gap = Math.max(0, number(options.gap, 6));
  const width = Math.max(0, number(floating.width));
  const height = Math.max(0, number(floating.height));
  let placement = preferred;
  let point = anchoredPoint(preferred, options.anchor || {}, floating, gap);

  for (const candidate of candidates) {
    const next = anchoredPoint(candidate, options.anchor || {}, floating, gap);
    if (next.x >= margin && next.y >= margin && next.x + width <= viewport.width - margin && next.y + height <= viewport.height - margin) {
      placement = candidate;
      point = next;
      break;
    }
  }

  const fitted = fitLayerPoint({ ...point, floating, viewport, margin });
  return Object.freeze({ ...fitted, placement });
}

export function focusableLayerNodes(root) {
  if (!root?.querySelectorAll) return [];
  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter((node) => (
    !node.hidden && !node.disabled && !node.inert && node.getAttribute?.("aria-hidden") !== "true"
  ));
}

function createLayerManager(options = {}) {
  const documentRef = options.document || globalThis.document;
  const runtime = options.runtime || globalThis;
  const entries = [];
  let listeners = null;
  let sequence = 0;

  function top(predicate = () => true) {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (predicate(entries[index])) return entries[index];
    }
    return null;
  }

  function updateState() {
    entries.forEach((entry, index) => {
      entry.element?.style?.setProperty?.("--v8-layer-order", String(index));
      entry.element?.style?.setProperty?.("--v8-layer-stack", `calc(var(--v8-z-dialog) + ${index})`);
    });
    const dataset = documentRef?.documentElement?.dataset;
    if (!dataset) return;
    if (!entries.length) {
      delete dataset.uiLayerCount;
      delete dataset.uiLayerTop;
      delete dataset.modalOpen;
      delete dataset.windowOpen;
      return;
    }
    dataset.uiLayerCount = String(entries.length);
    dataset.uiLayerTop = entries.at(-1)?.kind || "popover";
    if (entries.some((entry) => entry.modal)) dataset.modalOpen = "true";
    else delete dataset.modalOpen;
    if (entries.some((entry) => entry.kind === "dialog" || entry.kind === "panel")) dataset.windowOpen = "true";
    else delete dataset.windowOpen;
  }

  function dismiss(entry, reason) {
    if (!entry || entry.dismissing) return false;
    entry.dismissing = true;
    entry.onDismiss?.(reason);
    entry.dismissing = false;
    return true;
  }

  function handleKeydown(event) {
    const active = top();
    if (!active) return;
    if (event.key === "Escape") {
      const dismissible = top((entry) => entry.closeOnEscape);
      if (!dismissible) return;
      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();
      dismiss(dismissible, "escape");
      return;
    }
    if (event.key === "Tab" && active.closeOnTab) {
      event.preventDefault?.();
      dismiss(active, "tab");
      return;
    }
    if (active.modal && active.trapFocus && event.key === "Tab") {
      const nodes = focusableLayerNodes(active.element);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes.at(-1);
      if (!active.element?.contains?.(documentRef.activeElement)) {
        event.preventDefault?.();
        first.focus?.({ preventScroll: true });
      } else if (event.shiftKey && documentRef.activeElement === first) {
        event.preventDefault?.();
        last.focus?.({ preventScroll: true });
      } else if (!event.shiftKey && documentRef.activeElement === last) {
        event.preventDefault?.();
        first.focus?.({ preventScroll: true });
      }
      return;
    }
    if (!active.rovingSelector || !ROVING_KEYS.has(event.key)) return;
    const controls = [...active.element.querySelectorAll(active.rovingSelector)].filter((node) => !node.disabled && !node.hidden);
    if (!controls.length) return;
    event.preventDefault?.();
    const current = controls.indexOf(documentRef.activeElement);
    const next = event.key === "Home" ? 0
      : event.key === "End" ? controls.length - 1
        : current < 0 ? (event.key === "ArrowUp" ? controls.length - 1 : 0)
          : (current + (event.key === "ArrowDown" ? 1 : -1) + controls.length) % controls.length;
    controls[next]?.focus?.({ preventScroll: true });
  }

  function handlePointerdown(event) {
    const active = top((entry) => entry.closeOnOutside);
    if (!active) return;
    const target = event.target;
    if (active.boundary?.contains?.(target) || active.anchor?.contains?.(target)) return;
    dismiss(active, "outside");
  }

  function handleScroll(event) {
    const active = top((entry) => entry.closeOnScroll);
    if (!active || active.boundary?.contains?.(event.target)) return;
    dismiss(active, "scroll");
  }

  function handleResize() {
    const active = top((entry) => entry.closeOnResize);
    if (active) dismiss(active, "resize");
  }

  function syncListeners() {
    if (entries.length && !listeners && documentRef?.addEventListener) {
      listeners = new AbortController();
      const signal = listeners.signal;
      documentRef.addEventListener("keydown", handleKeydown, { capture: true, signal });
      documentRef.addEventListener("pointerdown", handlePointerdown, { capture: true, signal });
      documentRef.addEventListener("scroll", handleScroll, { capture: true, signal });
      runtime.addEventListener?.("resize", handleResize, { signal });
    } else if (!entries.length && listeners) {
      listeners.abort();
      listeners = null;
    }
  }

  function release(entry, config = {}) {
    const index = entries.indexOf(entry);
    if (index < 0) return false;
    entries.splice(index, 1);
    entry.element?.style?.removeProperty?.("--v8-layer-order");
    entry.element?.style?.removeProperty?.("--v8-layer-stack");
    delete entry.element?.dataset?.v8Layer;
    delete entry.element?.dataset?.v8LayerId;
    updateState();
    syncListeners();
    if (config.restoreFocus !== false && entry.returnFocus?.isConnected !== false) {
      (runtime.queueMicrotask || ((callback) => Promise.resolve().then(callback)))(() => entry.returnFocus?.focus?.({ preventScroll: true }));
    }
    return true;
  }

  function register(config = {}) {
    if (!config.element) return null;
    const entry = {
      id: `layer-${++sequence}`,
      element: config.element,
      boundary: config.boundary || config.element,
      anchor: config.anchor || null,
      returnFocus: config.returnFocus || documentRef?.activeElement || null,
      kind: config.kind || "popover",
      modal: config.modal === true,
      trapFocus: config.trapFocus !== false,
      closeOnEscape: config.closeOnEscape !== false,
      closeOnOutside: config.closeOnOutside === true,
      closeOnScroll: config.closeOnScroll === true,
      closeOnResize: config.closeOnResize === true,
      closeOnTab: config.closeOnTab === true,
      rovingSelector: config.rovingSelector || "",
      onDismiss: typeof config.onDismiss === "function" ? config.onDismiss : () => {},
      dismissing: false
    };
    config.element.dataset.v8Layer = entry.kind;
    config.element.dataset.v8LayerId = entry.id;
    entries.push(entry);
    updateState();
    syncListeners();
    return Object.freeze({
      id: entry.id,
      release: (releaseConfig = {}) => release(entry, releaseConfig),
      dismiss: (reason = "programmatic") => dismiss(entry, reason)
    });
  }

  function destroy() {
    entries.splice(0).forEach((entry) => {
      entry.element?.style?.removeProperty?.("--v8-layer-order");
      entry.element?.style?.removeProperty?.("--v8-layer-stack");
      delete entry.element?.dataset?.v8Layer;
      delete entry.element?.dataset?.v8LayerId;
    });
    updateState();
    syncListeners();
  }

  return Object.freeze({
    register,
    destroy,
    top: () => top()?.kind || null,
    diagnostics: () => Object.freeze({ active: entries.length, modal: entries.filter((entry) => entry.modal).length, kinds: entries.map((entry) => entry.kind), listeners: listeners ? 4 : 0 })
  });
}

export function getLayerManager(options = {}) {
  const documentRef = options.document || globalThis.document;
  if (!documentRef || (typeof documentRef !== "object" && typeof documentRef !== "function")) return createLayerManager(options);
  if (!MANAGERS.has(documentRef)) MANAGERS.set(documentRef, createLayerManager({ ...options, document: documentRef }));
  return MANAGERS.get(documentRef);
}
