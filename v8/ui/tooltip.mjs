const TOOLTIP_TARGET = "[data-tooltip]";
const PLACEMENTS = Object.freeze(["top", "right", "bottom", "left"]);

function pointFor(placement, anchor, tooltip, gap) {
  const centerX = anchor.left + (anchor.width / 2);
  const centerY = anchor.top + (anchor.height / 2);
  if (placement === "right") return { x: anchor.right + gap, y: centerY - (tooltip.height / 2) };
  if (placement === "bottom") return { x: centerX - (tooltip.width / 2), y: anchor.bottom + gap };
  if (placement === "left") return { x: anchor.left - tooltip.width - gap, y: centerY - (tooltip.height / 2) };
  return { x: centerX - (tooltip.width / 2), y: anchor.top - tooltip.height - gap };
}

export function computeTooltipPosition(options = {}) {
  const anchor = options.anchor || {};
  const tooltip = options.tooltip || {};
  const viewport = options.viewport || {};
  const gap = Math.max(0, Number(options.gap) || 10);
  const margin = Math.max(0, Number(options.margin) || 8);
  const width = Math.max(1, Number(viewport.width) || 1);
  const height = Math.max(1, Number(viewport.height) || 1);
  const tip = { width: Math.max(0, Number(tooltip.width) || 0), height: Math.max(0, Number(tooltip.height) || 0) };
  const preferred = PLACEMENTS.includes(options.preferred) ? options.preferred : "top";
  const opposite = { top: "bottom", right: "left", bottom: "top", left: "right" }[preferred];
  const order = [preferred, opposite, ...PLACEMENTS].filter((value, index, list) => list.indexOf(value) === index);
  let placement = preferred;
  let point = pointFor(preferred, anchor, tip, gap);
  for (const candidate of order) {
    const next = pointFor(candidate, anchor, tip, gap);
    if (next.x >= margin && next.y >= margin && next.x + tip.width <= width - margin && next.y + tip.height <= height - margin) {
      placement = candidate;
      point = next;
      break;
    }
  }
  return Object.freeze({
    placement,
    x: Math.round(Math.min(Math.max(point.x, margin), Math.max(margin, width - tip.width - margin))),
    y: Math.round(Math.min(Math.max(point.y, margin), Math.max(margin, height - tip.height - margin)))
  });
}

export function createTooltipController(options = {}) {
  const documentRef = options.document || globalThis.document;
  const runtime = options.runtime || globalThis;
  const delay = Math.max(0, Number(options.delay) || 140);
  let started = false;
  let node = null;
  let target = null;
  let pendingTarget = null;
  let previousDescription = null;
  let showTimer = null;
  let hideTimer = null;
  let shown = 0;

  function clearTimer(name) {
    const timer = name === "show" ? showTimer : hideTimer;
    if (timer === null) return;
    runtime.clearTimeout?.(timer);
    if (name === "show") showTimer = null;
    else hideTimer = null;
  }

  function ensureNode() {
    if (node) return node;
    node = documentRef.createElement("div");
    node.id = "v8-global-tooltip";
    node.className = "v8-tooltip";
    node.setAttribute("role", "tooltip");
    node.hidden = true;
    (documentRef.body || documentRef.documentElement).append(node);
    return node;
  }

  function preferredPlacement(element) {
    if (element.closest?.(".v8-rail")) return "right";
    if (element.closest?.(".v8-floating-dock")) return "top";
    if (element.closest?.(".v8-context-strip")) return "bottom";
    return element.dataset?.tooltipPlacement || "top";
  }

  function restoreDescription() {
    if (!target) return;
    if (previousDescription === null) target.removeAttribute?.("aria-describedby");
    else target.setAttribute?.("aria-describedby", previousDescription);
    previousDescription = null;
  }

  function hide(immediate = false) {
    clearTimer("show");
    pendingTarget = null;
    if (!target && !node) return false;
    restoreDescription();
    target = null;
    node?.classList?.remove("is-visible");
    clearTimer("hide");
    const finish = () => {
      hideTimer = null;
      if (node && !target) node.hidden = true;
    };
    if (immediate) finish();
    else hideTimer = runtime.setTimeout?.(finish, 160) ?? null;
    return true;
  }

  function show(element) {
    const label = String(element?.getAttribute?.("data-tooltip") || "").trim();
    if (!label || !element?.getBoundingClientRect) return false;
    if (target && target !== element) hide(true);
    clearTimer("hide");
    target = element;
    pendingTarget = null;
    const tooltip = ensureNode();
    tooltip.textContent = label;
    tooltip.hidden = false;
    tooltip.classList.remove("is-visible");
    previousDescription = element.getAttribute?.("aria-describedby");
    const descriptions = new Set(String(previousDescription || "").split(/\s+/).filter(Boolean));
    descriptions.add(tooltip.id);
    element.setAttribute?.("aria-describedby", [...descriptions].join(" "));
    const anchorRect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const position = computeTooltipPosition({
      anchor: anchorRect,
      tooltip: tooltipRect,
      viewport: {
        width: runtime.innerWidth || documentRef.documentElement?.clientWidth,
        height: runtime.innerHeight || documentRef.documentElement?.clientHeight
      },
      preferred: preferredPlacement(element)
    });
    tooltip.dataset.placement = position.placement;
    tooltip.style.left = `${position.x}px`;
    tooltip.style.top = `${position.y}px`;
    tooltip.getBoundingClientRect();
    tooltip.classList.add("is-visible");
    shown += 1;
    return true;
  }

  function requestShow(element, immediate = false) {
    if (!element || element === target || (element === pendingTarget && !immediate)) return;
    clearTimer("show");
    pendingTarget = element;
    if (immediate) show(element);
    else showTimer = runtime.setTimeout?.(() => { showTimer = null; show(element); }, delay) ?? null;
  }

  function tooltipTarget(event) {
    return event?.target?.closest?.(TOOLTIP_TARGET) || null;
  }

  function handlePointerOver(event) {
    if (event.pointerType === "touch") return;
    requestShow(tooltipTarget(event));
  }

  function handlePointerOut(event) {
    const element = tooltipTarget(event);
    if (!element || element.contains?.(event.relatedTarget)) return;
    hide();
  }

  function handleFocusIn(event) { requestShow(tooltipTarget(event), true); }
  function handleFocusOut(event) {
    const element = tooltipTarget(event);
    if (element && !element.contains?.(event.relatedTarget)) hide();
  }
  function handleKeydown(event) { if (event.key === "Escape") hide(true); }
  function handleViewportChange() { hide(true); }

  function start() {
    if (started || !documentRef?.addEventListener) return false;
    started = true;
    documentRef.addEventListener("pointerover", handlePointerOver);
    documentRef.addEventListener("pointerout", handlePointerOut);
    documentRef.addEventListener("focusin", handleFocusIn);
    documentRef.addEventListener("focusout", handleFocusOut);
    documentRef.addEventListener("keydown", handleKeydown);
    documentRef.addEventListener("scroll", handleViewportChange, true);
    runtime.addEventListener?.("resize", handleViewportChange);
    if (documentRef.documentElement?.dataset) documentRef.documentElement.dataset.v8Tooltips = "ready";
    return true;
  }

  function destroy() {
    if (!started) return false;
    started = false;
    documentRef.removeEventListener?.("pointerover", handlePointerOver);
    documentRef.removeEventListener?.("pointerout", handlePointerOut);
    documentRef.removeEventListener?.("focusin", handleFocusIn);
    documentRef.removeEventListener?.("focusout", handleFocusOut);
    documentRef.removeEventListener?.("keydown", handleKeydown);
    documentRef.removeEventListener?.("scroll", handleViewportChange, true);
    runtime.removeEventListener?.("resize", handleViewportChange);
    hide(true);
    node?.remove?.();
    node = null;
    if (documentRef.documentElement?.dataset) delete documentRef.documentElement.dataset.v8Tooltips;
    return true;
  }

  return Object.freeze({
    start,
    hide,
    destroy,
    diagnostics: () => Object.freeze({ started, visible: Boolean(target), shown, listeners: started ? 7 : 0, timers: Number(showTimer !== null) + Number(hideTimer !== null) })
  });
}
