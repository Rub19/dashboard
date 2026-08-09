import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";
import { translateSource } from "../i18n/catalog.mjs";

const DEFAULT_DURATION = 220;

export function showBottomSheet({ title, children = [], host, onClose, className = "", position = "bottom", draggable = false } = {}) {
  const root = host || (typeof document !== "undefined" ? document.body : null);
  if (!root) return { close: () => {}, element: null };

  const isCentered = position === "center";
  let isClosing = false;
  let touchStartY = 0;
  let swipeDelta = 0;

  let isDragging = false;
  let dragStart = null;
  let dragPanelRect = null;
  let startOffset = { x: 0, y: 0 };
  let currentOffset = { x: 0, y: 0 };

  const closeButton = element("button", {
    className: "v8-icon-button v8-bottom-sheet__close",
    attributes: { type: "button", "aria-label": translateSource("Fermer") },
    events: { click: () => close() }
  }, [icon("x")]);

  const titleEl = element("h2", { id: "v8-bottom-sheet-title", className: "v8-bottom-sheet__title", text: title || "" });
  const handle = element("div", { className: "v8-bottom-sheet__handle", attributes: { "aria-hidden": "true" } }, [
    element("span", { className: "v8-bottom-sheet__handle-bar" })
  ]);
  const content = element("div", { className: "v8-bottom-sheet__content" }, children);
  const header = element("header", { className: "v8-bottom-sheet__header" }, [titleEl, closeButton]);

  if (draggable) {
    header.style.cursor = "grab";
    header.classList.add("v8-bottom-sheet__header--draggable");
  }

  const panel = element("div", {
    className: `v8-bottom-sheet${isCentered ? " v8-bottom-sheet--centered" : ""}${draggable ? " v8-bottom-sheet--draggable" : ""}${className ? ` ${className}` : ""}`,
    attributes: { role: "dialog", "aria-modal": "true", "aria-labelledby": "v8-bottom-sheet-title" }
  }, [
    handle,
    header,
    content
  ]);

  const layer = element("div", { className: `v8-bottom-sheet-layer${isCentered ? " v8-bottom-sheet-layer--centered" : ""}` }, [panel]);

  function onLayerClick(event) {
    if (event.target === layer) close();
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  function onTouchStart(event) {
    if (event.changedTouches.length !== 1) return;
    touchStartY = event.changedTouches[0].clientY;
    swipeDelta = 0;
  }

  function onTouchMove(event) {
    if (!touchStartY) return;
    const deltaY = event.changedTouches[0].clientY - touchStartY;
    if (deltaY > 0) {
      swipeDelta = deltaY;
      panel.style.transform = `translateY(${Math.min(deltaY, 120)}px)`;
    }
  }

  function onTouchEnd() {
    if (swipeDelta > 80) {
      close();
    } else {
      panel.style.transform = "";
    }
    touchStartY = 0;
  }

  function onHeaderPointerDown(event) {
    if (!draggable || isClosing || isDragging) return;
    if (closeButton.contains(event.target)) return;
    if (event.button > 0) return;
    event.preventDefault();
    isDragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    startOffset = { ...currentOffset };
    dragPanelRect = panel.getBoundingClientRect();
    header.style.cursor = "grabbing";
    panel.style.transition = "none";
    try { header.setPointerCapture(event.pointerId); } catch {}
  }

  function onHeaderPointerMove(event) {
    if (!isDragging) return;
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    currentOffset = { x: startOffset.x + dx, y: startOffset.y + dy };
    if (dragPanelRect) {
      const minX = -(dragPanelRect.width - 48);
      const minY = -(dragPanelRect.height - 48);
      currentOffset.x = Math.max(minX, Math.min(vw - 48, currentOffset.x));
      currentOffset.y = Math.max(minY, Math.min(vh - 48, currentOffset.y));
    }
    panel.style.transform = `translate3d(${currentOffset.x}px, ${currentOffset.y}px, 0)`;
  }

  function onHeaderPointerUp(event) {
    if (!isDragging) return;
    isDragging = false;
    header.style.cursor = "grab";
    panel.style.transition = "";
    try { header.releasePointerCapture(event.pointerId); } catch {}
  }

  function cleanup() {
    document.removeEventListener("keydown", onKeydown);
    layer.removeEventListener("click", onLayerClick);
    handle.removeEventListener("touchstart", onTouchStart);
    handle.removeEventListener("touchmove", onTouchMove);
    handle.removeEventListener("touchend", onTouchEnd);
    header.removeEventListener("pointerdown", onHeaderPointerDown);
    header.removeEventListener("pointermove", onHeaderPointerMove);
    header.removeEventListener("pointerup", onHeaderPointerUp);
    header.removeEventListener("pointerleave", onHeaderPointerUp);
  }

  function close() {
    if (isClosing) return;
    isClosing = true;
    currentOffset = { x: 0, y: 0 };
    dragPanelRect = null;
    panel.style.transform = "";
    panel.style.opacity = "";
    layer.classList.remove("is-open");
    setTimeout(() => {
      layer.remove();
      cleanup();
      if (typeof onClose === "function") onClose();
    }, DEFAULT_DURATION);
  }

  document.addEventListener("keydown", onKeydown);
  layer.addEventListener("click", onLayerClick);
  handle.addEventListener("touchstart", onTouchStart, { passive: true });
  handle.addEventListener("touchmove", onTouchMove, { passive: true });
  handle.addEventListener("touchend", onTouchEnd);

  if (draggable) {
    header.addEventListener("pointerdown", onHeaderPointerDown);
    header.addEventListener("pointermove", onHeaderPointerMove);
    header.addEventListener("pointerup", onHeaderPointerUp);
    header.addEventListener("pointerleave", onHeaderPointerUp);
  }

  root.append(layer);
  layer.getBoundingClientRect();
  requestAnimationFrame(() => layer.classList.add("is-open"));
  refreshIcons();

  return { close, element: layer };
}
