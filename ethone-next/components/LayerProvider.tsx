"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

export type LayerKind = "popover" | "dialog" | "panel" | "menu" | "tooltip" | string;

export type LayerInitialFocus =
  | boolean
  | string
  | (() => HTMLElement | null)
  | HTMLElement
  | RefObject<HTMLElement | null>
  | null;

export type LayerOptions = {
  element?: HTMLElement | RefObject<HTMLElement | null> | null;
  boundary?: HTMLElement | RefObject<HTMLElement | null> | null;
  anchor?: HTMLElement | RefObject<HTMLElement | null> | null;
  returnFocus?: HTMLElement | RefObject<HTMLElement | null> | null;
  initialFocus?: LayerInitialFocus;
  kind?: LayerKind;
  modal?: boolean;
  trapFocus?: boolean;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  closeOnScroll?: boolean;
  closeOnResize?: boolean;
  closeOnTab?: boolean;
  rovingSelector?: string;
};

type LayerDismissReason =
  | "escape"
  | "outside"
  | "scroll"
  | "resize"
  | "tab"
  | "programmatic";

type LayerConfig = LayerOptions & {
  id: string;
  onDismiss?: (reason: LayerDismissReason) => void;
};

type LayerEntry = {
  id: string;
  element: HTMLElement;
  boundary: HTMLElement;
  anchor: HTMLElement | null;
  returnFocus: HTMLElement | null;
  initialFocus: LayerInitialFocus;
  kind: LayerKind;
  modal: boolean;
  trapFocus: boolean;
  closeOnEscape: boolean;
  closeOnOutside: boolean;
  closeOnScroll: boolean;
  closeOnResize: boolean;
  closeOnTab: boolean;
  rovingSelector: string;
  onDismiss: (reason: LayerDismissReason) => void;
  dismissing: boolean;
};

export type LayerRegistration = {
  id: string;
  release: (config?: { restoreFocus?: boolean }) => boolean;
  dismiss: (reason?: LayerDismissReason) => boolean;
};

type LayerContextValue = {
  layers: Layer[];
  registerLayer: (config: LayerConfig) => LayerRegistration | null;
  unregisterLayer: (id: string) => boolean;
  activateLayer: (id: string) => boolean;
  closeTop: () => boolean;
  isTop: (id: string) => boolean;
};

type Layer = { id: string; kind: LayerKind };

const FOCUSABLE_SELECTOR =
  "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";
const ROVING_KEYS = new Set(["ArrowDown", "ArrowUp", "Home", "End"]);

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function viewportSize(viewport: { width?: number; height?: number } = {}) {
  return {
    width: Math.max(1, number(viewport.width, 1)),
    height: Math.max(1, number(viewport.height, 1)),
  };
}

export function fitLayerPoint(options: {
  x?: number;
  y?: number;
  floating?: { width?: number; height?: number };
  viewport?: { width?: number; height?: number };
  margin?: number;
} = {}): Readonly<{ x: number; y: number; maxHeight: number }> {
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
    maxHeight: Math.max(0, Math.floor(viewport.height - margin * 2)),
  });
}

function anchoredPoint(
  placement: string,
  anchor: { left?: number; right?: number; top?: number; bottom?: number; width?: number; height?: number },
  floating: { width?: number; height?: number },
  gap: number
) {
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

export function computeFloatingPosition(options: {
  viewport?: { width?: number; height?: number };
  floating?: { width?: number; height?: number };
  margin?: number;
  gap?: number;
  preferred?: string;
  anchor?: { left?: number; right?: number; top?: number; bottom?: number; width?: number; height?: number };
  point?: { x?: number; y?: number };
} = {}): Readonly<{ x: number; y: number; maxHeight: number; placement: string }> {
  const viewport = viewportSize(options.viewport);
  const floating = options.floating || {};
  const margin = Math.max(0, number(options.margin, 8));
  if (options.point) {
    const fitted = fitLayerPoint({
      x: options.point.x,
      y: options.point.y,
      floating,
      viewport,
      margin,
    });
    return Object.freeze({ ...fitted, placement: "point" });
  }

  const preferred = (options.preferred && ["bottom-end", "bottom-start", "top-end", "top-start"].includes(options.preferred))
    ? options.preferred
    : "bottom-end";
  const opposite = preferred.startsWith("bottom")
    ? preferred.replace("bottom", "top")
    : preferred.replace("top", "bottom");
  const alternate = preferred.endsWith("end")
    ? preferred.replace("end", "start")
    : preferred.replace("start", "end");
  const alternateOpposite = alternate.startsWith("bottom")
    ? alternate.replace("bottom", "top")
    : alternate.replace("top", "bottom");
  const candidates = [preferred, opposite, alternate, alternateOpposite];
  const gap = Math.max(0, number(options.gap, 6));
  const width = Math.max(0, number(floating.width));
  const height = Math.max(0, number(floating.height));
  let placement = preferred;
  let point = anchoredPoint(preferred, options.anchor || {}, floating, gap);

  for (const candidate of candidates) {
    const next = anchoredPoint(candidate, options.anchor || {}, floating, gap);
    if (
      next.x >= margin &&
      next.y >= margin &&
      next.x + width <= viewport.width - margin &&
      next.y + height <= viewport.height - margin
    ) {
      placement = candidate;
      point = next;
      break;
    }
  }

  const fitted = fitLayerPoint({ ...point, floating, viewport, margin });
  return Object.freeze({ ...fitted, placement });
}

export function focusableLayerNodes(root: HTMLElement | null | undefined): HTMLElement[] {
  if (!root?.querySelectorAll) return [];
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((node) => {
    const el = node as unknown as Record<string, unknown>;
    return (
      !("hidden" in el && el.hidden === true) &&
      !("disabled" in el && el.disabled === true) &&
      !node.hasAttribute("inert") &&
      node.getAttribute?.("aria-hidden") !== "true"
    );
  });
}

function resolveElement(
  value: HTMLElement | RefObject<HTMLElement | null> | (() => HTMLElement | null) | string | null | undefined
): HTMLElement | null {
  if (!value) return null;
  if (typeof value === "string") {
    if (typeof document === "undefined") return null;
    return document.querySelector<HTMLElement>(value);
  }
  if (typeof value === "function") return value();
  if ("current" in value) return (value as RefObject<HTMLElement | null>).current;
  if (value instanceof Element) return value as HTMLElement;
  return null;
}

function resolveInitialFocus(
  entry: LayerEntry,
  initialFocus: LayerInitialFocus
): HTMLElement | null {
  if (initialFocus === false || initialFocus == null) return null;
  if (initialFocus === true) {
    const nodes = focusableLayerNodes(entry.element);
    return nodes[0] || null;
  }
  if (typeof initialFocus === "string") {
    return entry.element.querySelector<HTMLElement>(initialFocus);
  }
  if (typeof initialFocus === "function") return initialFocus();
  if ("current" in initialFocus) {
    return (initialFocus as RefObject<HTMLElement | null>).current;
  }
  if (initialFocus instanceof Element) return initialFocus as HTMLElement;
  return null;
}

function createLayerManager(onChange?: () => void) {
  const documentRef = typeof document !== "undefined" ? document : undefined;
  const runtime = typeof window !== "undefined" ? window : undefined;
  const entries: LayerEntry[] = [];
  const byId = new Map<string, LayerEntry>();
  const subscribers = new Set<(entries: Layer[]) => void>();
  let listeners: AbortController | null = null;
  let sequence = 0;

  function notify() {
    const list = getEntries();
    subscribers.forEach((fn) => fn(list));
    notify();
  }

  function top(predicate: (entry: LayerEntry) => boolean = () => true): LayerEntry | null {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (predicate(entries[index])) return entries[index];
    }
    return null;
  }

  function updateState() {
    entries.forEach((entry, index) => {
      entry.element?.style?.setProperty?.("--v8-layer-order", String(index));
      entry.element?.style?.setProperty?.(
        "--v8-layer-stack",
        `calc(var(--v8-z-dialog, 1000) + ${index})`
      );
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
    if (entries.some((entry) => entry.kind === "dialog" || entry.kind === "panel"))
      dataset.windowOpen = "true";
    else delete dataset.windowOpen;
  }

  function syncListeners() {
    if (entries.length && !listeners && documentRef?.addEventListener) {
      listeners = new AbortController();
      const signal = listeners.signal;
      documentRef.addEventListener("keydown", handleKeydown, { capture: true, signal });
      documentRef.addEventListener("pointerdown", handlePointerdown, { capture: true, signal });
      documentRef.addEventListener("scroll", handleScroll, { capture: true, passive: true, signal });
      runtime?.addEventListener?.("resize", handleResize, { signal });
    } else if (!entries.length && listeners) {
      listeners.abort();
      listeners = null;
    }
  }

  function dismiss(entry: LayerEntry, reason: LayerDismissReason): boolean {
    if (!entry || entry.dismissing) return false;
    entry.dismissing = true;
    entry.onDismiss?.(reason);
    entry.dismissing = false;
    return true;
  }

  function handleKeydown(event: KeyboardEvent) {
    const active = top();
    if (!active) return;

    if (event.key === "Escape") {
      const dismissible = top((entry) => entry.closeOnEscape);
      if (!dismissible) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      dismiss(dismissible, "escape");
      return;
    }

    if (event.key === "Tab" && active.closeOnTab) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      dismiss(active, "tab");
      return;
    }

    if (active.modal && active.trapFocus && event.key === "Tab") {
      const nodes = focusableLayerNodes(active.element);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes.at(-1) as HTMLElement;
      const activeElement = documentRef?.activeElement as HTMLElement | null;
      if (!activeElement || !active.element.contains(activeElement)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        first.focus({ preventScroll: true });
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        first.focus({ preventScroll: true });
      }
      return;
    }

    if (!active.rovingSelector || !ROVING_KEYS.has(event.key)) return;
    const controls = [...active.element.querySelectorAll<HTMLElement>(active.rovingSelector)].filter(
      (node) => !(node as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLOptionElement).disabled && !node.hidden
    );
    if (!controls.length) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const current = controls.indexOf(documentRef?.activeElement as HTMLElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
        ? controls.length - 1
        : current < 0
        ? event.key === "ArrowUp"
          ? controls.length - 1
          : 0
        : (current + (event.key === "ArrowDown" ? 1 : -1) + controls.length) % controls.length;

    controls[next]?.focus({ preventScroll: true });
  }

  function handlePointerdown(event: PointerEvent) {
    const active = top((entry) => entry.closeOnOutside);
    if (!active) return;
    const target = event.target as Node | null;
    if (active.boundary?.contains?.(target) || active.anchor?.contains?.(target)) return;
    dismiss(active, "outside");
  }

  function handleScroll(event: Event) {
    const active = top((entry) => entry.closeOnScroll);
    if (!active || active.boundary?.contains?.(event.target as Node)) return;
    dismiss(active, "scroll");
  }

  function handleResize() {
    const active = top((entry) => entry.closeOnResize);
    if (active) dismiss(active, "resize");
  }

  function release(entry: LayerEntry, config: { restoreFocus?: boolean } = {}): boolean {
    const index = entries.indexOf(entry);
    if (index < 0) return false;
    entries.splice(index, 1);
    byId.delete(entry.id);
    entry.element?.style?.removeProperty?.("--v8-layer-order");
    entry.element?.style?.removeProperty?.("--v8-layer-stack");
    delete (entry.element as HTMLElement).dataset?.v8Layer;
    delete (entry.element as HTMLElement).dataset?.v8LayerId;
    updateState();
    syncListeners();
    if (config.restoreFocus !== false && entry.returnFocus?.isConnected !== false) {
      queueMicrotask(() => entry.returnFocus?.focus?.({ preventScroll: true }));
    }
    notify();
    return true;
  }

  function releaseById(id: string, config: { restoreFocus?: boolean } = {}): boolean {
    const entry = byId.get(id);
    return entry ? release(entry, config) : false;
  }

  function focusInitial(entry: LayerEntry) {
    const target = resolveInitialFocus(entry, entry.initialFocus);
    if (target) {
      queueMicrotask(() => target.focus({ preventScroll: true }));
    }
  }

  function register(config: LayerConfig): LayerRegistration | null {
    const element = resolveElement(config.element) ?? resolveElement(config.boundary);
    if (!element) return null;

    const boundary = resolveElement(config.boundary) ?? element;
    const anchor = resolveElement(config.anchor);
    const returnFocus =
      resolveElement(config.returnFocus) ??
      (documentRef?.activeElement as HTMLElement | null);

    const entry: LayerEntry = {
      id: config.id || `layer-${++sequence}`,
      element,
      boundary,
      anchor,
      returnFocus,
      initialFocus: config.initialFocus ?? true,
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
      dismissing: false,
    };

    (element as HTMLElement).dataset.v8Layer = entry.kind;
    (element as HTMLElement).dataset.v8LayerId = entry.id;

    entries.push(entry);
    byId.set(entry.id, entry);
    updateState();
    syncListeners();
    focusInitial(entry);
    notify();

    return Object.freeze({
      id: entry.id,
      release: (releaseConfig = {}) => release(entry, releaseConfig),
      dismiss: (reason: LayerDismissReason = "programmatic") => dismiss(entry, reason),
    });
  }

  function destroy() {
    entries.splice(0).forEach((entry) => {
      entry.element?.style?.removeProperty?.("--v8-layer-order");
      entry.element?.style?.removeProperty?.("--v8-layer-stack");
      delete (entry.element as HTMLElement).dataset?.v8Layer;
      delete (entry.element as HTMLElement).dataset?.v8LayerId;
    });
    byId.clear();
    updateState();
    syncListeners();
    notify();
  }

  function activate(id: string): boolean {
    const entry = byId.get(id);
    if (!entry) return false;
    const index = entries.indexOf(entry);
    if (index < 0) return false;
    if (index === entries.length - 1) return true;
    entries.splice(index, 1);
    entries.push(entry);
    updateState();
    notify();
    return true;
  }

  function dismissTop(): boolean {
    const dismissible = top((entry) => entry.closeOnEscape);
    if (!dismissible) return false;
    return dismiss(dismissible, "escape");
  }

  function getEntries(): Layer[] {
    return entries.map((entry) => ({ id: entry.id, kind: entry.kind }));
  }

  function isTop(id: string): boolean {
    return entries.length > 0 && entries[entries.length - 1].id === id;
  }

  function subscribe(fn: (entries: Layer[]) => void) {
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }

  return {
    register,
    release,
    releaseById,
    destroy,
    top,
    activate,
    dismissTop,
    getEntries,
    isTop,
    subscribe,
  };
}

const LayerCtx = createContext<LayerContextValue | null>(null);

export function LayerProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [manager] = useState(() =>
    createLayerManager(() => {
      // state updater will be called from manager callback
    })
  );

  useEffect(() => {
    setLayers(manager.getEntries());
    return manager.subscribe((entries) => {
      setLayers(entries);
    });
  }, [manager]);

  const value = useMemo<LayerContextValue>(
    () => ({
      layers,
      registerLayer: (config) => manager.register(config) ?? null,
      unregisterLayer: (id) => manager.releaseById(id) ?? false,
      activateLayer: (id) => manager.activate(id) ?? false,
      closeTop: () => manager.dismissTop() ?? false,
      isTop: (id) => manager.isTop(id) ?? false,
    }),
    [layers, manager]
  );

  return <LayerCtx.Provider value={value}>{children}</LayerCtx.Provider>;
}

export function useLayer(
  open: boolean,
  onClose: () => void,
  options: LayerOptions = {}
): { isTop: boolean; closeTop: () => void; activate: () => void } {
  const ctx = useContext(LayerCtx);
  const id = useId();
  const onCloseRef = useRef(onClose);
  const optionsRef = useRef(options);
  const registrationRef = useRef<LayerRegistration | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const handleDismiss = useCallback(() => {
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!ctx) return;
    if (!open) {
      if (registrationRef.current) {
        registrationRef.current.release();
        registrationRef.current = null;
      }
      return;
    }

    const config: LayerConfig = {
      ...optionsRef.current,
      id,
      onDismiss: handleDismiss,
    };

    const registration = ctx.registerLayer(config);
    if (registration) {
      registrationRef.current = registration;
    }

    return () => {
      registration?.release();
      registrationRef.current = null;
    };
  }, [open, ctx, id, handleDismiss]);

  const activate = useCallback(() => {
    if (registrationRef.current) {
      ctx?.activateLayer(registrationRef.current.id);
    }
  }, [ctx]);

  if (!ctx) {
    return { isTop: true, closeTop: () => {}, activate: () => {} };
  }

  return {
    isTop: ctx.isTop(id),
    closeTop: ctx.closeTop,
    activate,
  };
}

export function useLayerContext() {
  return useContext(LayerCtx);
}
